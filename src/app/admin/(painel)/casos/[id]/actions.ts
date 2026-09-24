"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { logAccess } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/admin";
import { demoScope } from "@/lib/cases/admin-queries";
import { prisma } from "@/lib/db";
import { config } from "@/lib/env";
import { processDocument, recomputeCaseIdentified } from "@/lib/extraction/process";
import { centsToDecimal } from "@/lib/format";
import { REQUEST_REASON_VALUES } from "@/lib/options";
import { clientIp, userAgent } from "@/lib/security";
import { getStorage } from "@/lib/storage";
import { ADMIN_SETTABLE_STATUSES, isDocumentStatus, type CaseStatusValue } from "@/lib/status";

// Todas as ações exigem sessão administrativa e respeitam a separação demo × produção.

const MAX_CENTS = 9_999_999_999;

async function scopedCase(caseId: string) {
  const c = await prisma.case.findFirst({
    where: { id: caseId, ...demoScope() },
    select: { id: true, status: true, identifiedLoss: true, identifiedSource: true },
  });
  if (!c) throw new Error("Caso não encontrado.");
  return c;
}

function back(caseId: string, query: string, anchor: string): never {
  revalidatePath(`/admin/casos/${caseId}`);
  revalidatePath("/admin/casos");
  revalidatePath("/admin");
  redirect(`/admin/casos/${caseId}?${query}#${anchor}`);
}

function text(formData: FormData, key: string, max: number): string {
  return String(formData.get(key) ?? "")
    .trim()
    .slice(0, max);
}

function cents(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n >= 0 && n <= MAX_CENTS ? n : Number.NaN;
}

export async function updateStatus(caseId: string, formData: FormData) {
  const admin = await requireAdmin();
  const c = await scopedCase(caseId);
  const status = String(formData.get("status") ?? "") as CaseStatusValue;
  if (!ADMIN_SETTABLE_STATUSES.includes(status)) back(caseId, "erro=status", "status");
  const message = text(formData, "publicMessage", 1000) || null;
  if (status === c.status && !message) back(caseId, "ok=status", "status");

  await prisma.$transaction([
    prisma.case.update({ where: { id: caseId }, data: { status } }),
    prisma.statusHistory.create({ data: { caseId, fromStatus: c.status, toStatus: status, changedById: admin.id, publicMessage: message } }),
    // Ao sair de "documentação adicional", pedidos em aberto são encerrados.
    prisma.documentRequest.updateMany({ where: { caseId, status: "open" }, data: { status: "cancelled" } }),
    prisma.caseReview.create({ data: { caseId, adminId: admin.id, action: `status:${status}`, comment: message } }),
  ]);
  back(caseId, "ok=status", "status");
}

export async function assignCase(caseId: string, formData: FormData) {
  const admin = await requireAdmin();
  await scopedCase(caseId);
  const target = String(formData.get("adminId") ?? "");
  let assignedAdminId: string | null = null;
  if (target) {
    const found = await prisma.adminUser.findFirst({
      where: { id: target, isActive: true, ...(config.demoMode ? {} : { isDemo: false }) },
      select: { id: true },
    });
    if (!found) back(caseId, "erro=assign", "topo");
    assignedAdminId = found.id;
  }
  await prisma.$transaction([
    prisma.case.update({ where: { id: caseId }, data: { assignedAdminId } }),
    prisma.caseReview.create({ data: { caseId, adminId: admin.id, action: "assign", comment: assignedAdminId ?? "sem responsável" } }),
  ]);
  back(caseId, "ok=assign", "topo");
}

export async function addNote(caseId: string, formData: FormData) {
  const admin = await requireAdmin();
  await scopedCase(caseId);
  const content = text(formData, "content", 4000);
  if (!content) back(caseId, "erro=note", "notas");
  await prisma.caseNote.create({ data: { caseId, adminId: admin.id, content } });
  back(caseId, "ok=note", "notas");
}

export async function setDocumentStatus(caseId: string, formData: FormData) {
  const admin = await requireAdmin();
  await scopedCase(caseId);
  const documentId = String(formData.get("documentId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!isDocumentStatus(status)) back(caseId, "erro=doc", "documentos");
  const doc = await prisma.document.findFirst({ where: { id: documentId, caseId }, select: { id: true } });
  if (!doc) back(caseId, "erro=doc", "documentos");
  const note = text(formData, "reviewNote", 500);
  await prisma.$transaction([
    prisma.document.update({
      where: { id: doc.id },
      data: { status, reviewedAt: new Date(), reviewedById: admin.id, ...(note ? { reviewNote: note } : {}) },
    }),
    prisma.caseReview.create({ data: { caseId, adminId: admin.id, action: `document:${status}`, comment: doc.id } }),
  ]);
  await recomputeCaseIdentified(caseId);
  back(caseId, "ok=doc", `doc-${doc.id}`);
}

export async function reprocessDocument(caseId: string, formData: FormData) {
  await requireAdmin();
  await scopedCase(caseId);
  const documentId = String(formData.get("documentId") ?? "");
  const doc = await prisma.document.findFirst({ where: { id: documentId, caseId }, select: { id: true } });
  if (!doc) back(caseId, "erro=doc", "documentos");
  await processDocument(doc.id);
  await recomputeCaseIdentified(caseId);
  back(caseId, "ok=reprocess", `doc-${doc.id}`);
}

export async function requestDocuments(caseId: string, formData: FormData) {
  const admin = await requireAdmin();
  const c = await scopedCase(caseId);
  const reasons = formData
    .getAll("reasons")
    .map(String)
    .filter((r) => (REQUEST_REASON_VALUES as readonly string[]).includes(r));
  const message = text(formData, "message", 1000) || null;
  if (!reasons.length) back(caseId, "erro=reasons", "solicitar");
  if (reasons.includes("other") && !message) back(caseId, "erro=reason_message", "solicitar");

  await prisma.$transaction([
    prisma.documentRequest.updateMany({ where: { caseId, status: "open" }, data: { status: "cancelled" } }),
    prisma.documentRequest.create({ data: { caseId, reasons: [...new Set(reasons)], message, requestedById: admin.id } }),
    prisma.case.update({ where: { id: caseId }, data: { status: "additional_documents" } }),
    prisma.statusHistory.create({ data: { caseId, fromStatus: c.status, toStatus: "additional_documents", changedById: admin.id } }),
    prisma.caseReview.create({ data: { caseId, adminId: admin.id, action: "request_documents", comment: reasons.join(", ") } }),
  ]);
  back(caseId, "ok=request", "solicitar");
}

export async function saveIdentified(caseId: string, formData: FormData) {
  const admin = await requireAdmin();
  await scopedCase(caseId);
  const deposits = cents(formData, "deposits");
  const withdrawals = cents(formData, "withdrawals") ?? 0;
  const balance = cents(formData, "balance") ?? 0;
  if (deposits === null || [deposits, withdrawals, balance].some(Number.isNaN)) back(caseId, "erro=value", "valores");
  const loss = Math.max(0, deposits - withdrawals - balance);
  const comment = text(formData, "comment", 500) || null;
  await prisma.$transaction([
    prisma.case.update({
      where: { id: caseId },
      data: {
        identifiedDeposits: centsToDecimal(deposits),
        identifiedWithdrawals: centsToDecimal(withdrawals),
        identifiedBalance: centsToDecimal(balance),
        identifiedLoss: centsToDecimal(loss),
        identifiedSource: "manual",
      },
    }),
    prisma.caseReview.create({
      data: {
        caseId,
        adminId: admin.id,
        action: "identified_manual",
        identifiedDeposits: centsToDecimal(deposits),
        identifiedWithdrawals: centsToDecimal(withdrawals),
        identifiedBalance: centsToDecimal(balance),
        identifiedLoss: centsToDecimal(loss),
        comment,
      },
    }),
  ]);
  back(caseId, "ok=identified", "valores");
}

export async function confirmIdentified(caseId: string) {
  const admin = await requireAdmin();
  const c = await scopedCase(caseId);
  if (c.identifiedLoss === null) back(caseId, "erro=value", "valores");
  await prisma.$transaction([
    prisma.case.update({ where: { id: caseId }, data: { identifiedSource: "manual" } }),
    prisma.caseReview.create({ data: { caseId, adminId: admin.id, action: "identified_confirmed", identifiedLoss: c.identifiedLoss } }),
  ]);
  back(caseId, "ok=confirmed", "valores");
}

export async function recalcIdentified(caseId: string) {
  const admin = await requireAdmin();
  await scopedCase(caseId);
  await recomputeCaseIdentified(caseId, { force: true });
  await prisma.caseReview.create({ data: { caseId, adminId: admin.id, action: "identified_recalculated" } });
  back(caseId, "ok=recalc", "valores");
}

export async function saveValidated(caseId: string, formData: FormData) {
  const admin = await requireAdmin();
  await scopedCase(caseId);
  const value = cents(formData, "validated");
  if (value === null || Number.isNaN(value)) back(caseId, "erro=value", "valores");
  const comment = text(formData, "comment", 500) || null;
  await prisma.$transaction([
    prisma.case.update({ where: { id: caseId }, data: { validatedLoss: centsToDecimal(value) } }),
    prisma.caseReview.create({ data: { caseId, adminId: admin.id, action: "validated", validatedLoss: centsToDecimal(value), comment } }),
  ]);
  back(caseId, "ok=validated", "valores");
}

export async function clearValidated(caseId: string) {
  const admin = await requireAdmin();
  await scopedCase(caseId);
  await prisma.$transaction([
    prisma.case.update({ where: { id: caseId }, data: { validatedLoss: null } }),
    prisma.caseReview.create({ data: { caseId, adminId: admin.id, action: "validated_cleared" } }),
  ]);
  back(caseId, "ok=validated_clear", "valores");
}

export async function saveNextSteps(caseId: string, formData: FormData) {
  const admin = await requireAdmin();
  await scopedCase(caseId);
  const nextSteps = text(formData, "nextSteps", 2000) || null;
  await prisma.$transaction([
    prisma.case.update({ where: { id: caseId }, data: { nextSteps } }),
    prisma.caseReview.create({ data: { caseId, adminId: admin.id, action: "next_steps" } }),
  ]);
  back(caseId, "ok=next", "proximos");
}

/**
 * Exclusão definitiva (pedido de eliminação do titular, art. 18 da LGPD).
 * Remove o caso, as respostas, os valores, as notas, os documentos e os arquivos do armazenamento.
 * Restrita a administradores e confirmada digitando o protocolo.
 * Os registros de acesso são mantidos pelo prazo legal (Marco Civil da Internet).
 */
export async function deleteCase(caseId: string, formData: FormData) {
  const admin = await requireAdmin();
  if (admin.role !== "admin") back(caseId, "erro=role", "lgpd");
  const c = await prisma.case.findFirst({
    where: { id: caseId, ...demoScope() },
    select: { id: true, protocol: true, userId: true, documents: { select: { storageKey: true } } },
  });
  if (!c) throw new Error("Caso não encontrado.");
  const typed = text(formData, "confirmProtocol", 30).toUpperCase().replace(/\s+/g, "");
  if (typed !== c.protocol) back(caseId, "erro=confirm", "lgpd");

  const draftFiles = await prisma.document.findMany({ where: { draft: { caseId } }, select: { storageKey: true } });
  await prisma.$transaction(async (tx) => {
    await tx.document.deleteMany({ where: { draft: { caseId } } });
    await tx.caseDraft.deleteMany({ where: { caseId } });
    await tx.case.delete({ where: { id: caseId } });
    const otherCases = await tx.case.count({ where: { userId: c.userId } });
    if (otherCases === 0) await tx.user.delete({ where: { id: c.userId } });
  });

  const storage = await getStorage();
  for (const file of [...c.documents, ...draftFiles]) {
    await storage.remove(file.storageKey).catch((error) => console.error("[lgpd] falha ao remover arquivo", file.storageKey, error));
  }
  const h = await headers();
  await logAccess({
    action: "case.delete",
    adminId: admin.id,
    subject: c.protocol,
    targetType: "case",
    targetId: c.id,
    ip: clientIp(h),
    userAgent: userAgent(h),
  });
  revalidatePath("/admin/casos");
  revalidatePath("/admin");
  redirect(`/admin/casos?excluido=${encodeURIComponent(c.protocol)}`);
}

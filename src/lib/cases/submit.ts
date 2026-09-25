import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { config } from "@/lib/env";
import { centsToDecimal, normalizePhoneBR } from "@/lib/format";
import { COMMITMENT_VERSION, commitmentText } from "@/lib/options";
import { generateProtocol } from "@/lib/protocol";
import { getStorage } from "@/lib/storage";
import { resolvePlatforms } from "./platforms";
import type { SubmissionData } from "./submission";

export class SubmissionError extends Error {
  field?: string;
  constructor(message: string, field?: string) {
    super(message);
    this.field = field;
  }
}

/** Perda declarada = depósitos − saques − saldo. Resultado negativo vira zero e é sinalizado. */
export function computeDeclaredLoss(depositsCents: number, withdrawalsCents: number, balanceCents: number) {
  const raw = depositsCents - withdrawalsCents - balanceCents;
  return { raw, loss: Math.max(0, raw), needsReview: raw < 0 };
}

export async function submitCase(params: {
  draftId: string;
  isDemo: boolean;
  data: SubmissionData;
  ip: string | null;
  userAgent: string | null;
}): Promise<{ caseId: string; protocol: string }> {
  const { data, draftId, isDemo } = params;
  const { platforms, aliases } = resolvePlatforms(data);
  if (!platforms.length) throw new SubmissionError("Selecione ao menos uma plataforma.", "platforms");

  // O CPF vem do rascunho (registrado antes do envio do ComprovaBet e usado na conferência do documento).
  const draft = await prisma.caseDraft.findUnique({ where: { id: draftId }, select: { cpf: true } });
  const cpf = draft?.cpf ?? null;
  if (!cpf) throw new SubmissionError("Informe seu CPF para continuar.", "cpf");

  const draftDocs = await prisma.document.findMany({
    where: { draftId },
    select: { id: true, platformName: true, storageKey: true, category: true, cpfCheck: true },
  });
  const comprovabet = draftDocs.filter((d) => d.category === "comprovabet" && d.cpfCheck !== "mismatch");
  if (!comprovabet.length) throw new SubmissionError("Envie o seu ComprovaBet para continuar.", "documents");
  // Históricos por plataforma enviados antes da mudança para o ComprovaBet continuam aceitos como complemento.
  const attach = draftDocs.filter(
    (d) => comprovabet.includes(d) || (d.category !== "comprovabet" && d.platformName && aliases.has(d.platformName.toLowerCase())),
  );
  const orphans = draftDocs.filter((d) => !attach.includes(d));

  const phone = normalizePhoneBR(data.whatsapp);
  if (!phone) throw new SubmissionError("Informe um WhatsApp válido com DDD.", "whatsapp");
  const balance = data.hasBalance ? (data.balanceCents ?? 0) : 0;
  const declared = computeDeclaredLoss(data.depositsCents, data.withdrawalsCents, balance);
  const now = new Date();
  const reviewDeadline = new Date(now.getTime() + config.reviewDays * 86_400_000);

  for (let attempt = 0; attempt < 5; attempt++) {
    const protocol = generateProtocol(isDemo);
    try {
      const created = await prisma.$transaction(
        async (tx) => {
          // Trava o rascunho: impede dois envios simultâneos da mesma solicitação.
          const claimed = await tx.caseDraft.updateMany({ where: { id: draftId, submittedAt: null }, data: { submittedAt: now } });
          if (claimed.count !== 1) throw new SubmissionError("Esta solicitação já foi enviada.", "draft");

          const existingUser = await tx.user.findFirst({
            where: { email: data.email, whatsapp: phone, fullName: data.fullName, cpf, isDemo },
            select: { id: true },
          });
          const user =
            existingUser ??
            (await tx.user.create({
              data: { fullName: data.fullName, cpf, email: data.email, whatsapp: phone, isAdult: true, isDemo },
              select: { id: true },
            }));

          const slugToId = new Map<string, string>();
          for (const p of platforms) {
            const row = await tx.bettingPlatform.upsert({
              where: { slug: p.slug },
              update: {},
              create: { slug: p.slug, name: p.name, isCustom: p.isCustom },
              select: { id: true },
            });
            slugToId.set(p.slug, row.id);
          }

          const caseRow = await tx.case.create({
            data: {
              protocol,
              userId: user.id,
              betType: data.betType,
              sportsBetKind: data.betType === "sports" ? data.sportsKind : null,
              casinoGames: data.betType === "casino" ? data.casinoGames : [],
              mainLossArea: data.betType === "both" ? data.mainLossArea : null,
              period: data.period,
              controlLoss: data.controlLoss,
              situations: data.situations,
              situationOther: data.situations.includes("other") ? data.situationOther : null,
              declaredDeposits: centsToDecimal(data.depositsCents),
              declaredWithdrawals: centsToDecimal(data.withdrawalsCents),
              declaredBalance: centsToDecimal(balance),
              declaredLoss: centsToDecimal(declared.loss),
              declaredNeedsReview: declared.needsReview,
              status: "documents_received",
              privacyConsentAt: now,
              privacyConsentIp: params.ip,
              isDemo,
              reviewDeadline,
              platforms: { create: [...slugToId.values()].map((platformId) => ({ platformId })) },
              declarations: {
                create: {
                  deposits: centsToDecimal(data.depositsCents),
                  withdrawals: centsToDecimal(data.withdrawalsCents),
                  hasBalance: data.hasBalance,
                  balance: centsToDecimal(balance),
                  rawResult: centsToDecimal(declared.raw),
                  calculatedLoss: centsToDecimal(declared.loss),
                  needsReview: declared.needsReview,
                },
              },
              commitment: {
                create: {
                  accepted: true,
                  acceptedAt: now,
                  ip: params.ip,
                  userAgent: params.userAgent,
                  textVersion: COMMITMENT_VERSION,
                  text: commitmentText(config.reviewDays),
                },
              },
              statusHistory: {
                create: [
                  { toStatus: "submitted", createdAt: now },
                  { fromStatus: "submitted", toStatus: "documents_received", createdAt: new Date(now.getTime() + 1000) },
                ],
              },
            },
            select: { id: true },
          });

          for (const doc of attach) {
            const slug = aliases.get((doc.platformName ?? "").toLowerCase());
            await tx.document.update({
              where: { id: doc.id },
              data: { caseId: caseRow.id, draftId: null, platformId: slug ? (slugToId.get(slug) ?? null) : null },
            });
          }
          // O CPF passa a existir só no cadastro do solicitante; o rascunho não guarda cópia.
          await tx.caseDraft.update({ where: { id: draftId }, data: { caseId: caseRow.id, cpf: null } });
          return caseRow;
        },
        { timeout: 20_000 },
      );

      // Arquivos de plataformas desmarcadas não seguem com o caso: são excluídos.
      if (orphans.length) {
        await prisma.document.deleteMany({ where: { id: { in: orphans.map((o) => o.id) } } });
        const storage = await getStorage();
        for (const o of orphans) await storage.remove(o.storageKey).catch(() => undefined);
      }
      return { caseId: created.id, protocol };
    } catch (error) {
      const target = error instanceof Prisma.PrismaClientKnownRequestError ? String(error.meta?.target ?? "") : "";
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && target.includes("protocol")) continue;
      throw error;
    }
  }
  throw new Error("Não foi possível gerar um protocolo único. Tente novamente.");
}

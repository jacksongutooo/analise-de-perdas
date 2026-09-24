import { randomUUID } from "node:crypto";
import type { DocumentCategory } from "@prisma/client";
import { prisma } from "@/lib/db";
import { config, maxUploadBytes } from "@/lib/env";
import { sha256Hex } from "@/lib/security";
import { getStorage } from "@/lib/storage";
import { detectFileType, extensionOf } from "./detect";
import { sanitizeFileName } from "./names";

export type UploadedFileDTO = {
  id: string;
  name: string;
  size: number;
  platform: string | null;
  category: string;
  createdAt: string;
};

export function toUploadedFileDTO(d: {
  id: string;
  originalName: string;
  sizeBytes: number;
  platformName: string | null;
  category: string;
  createdAt: Date;
}): UploadedFileDTO {
  return {
    id: d.id,
    name: d.originalName,
    size: d.sizeBytes,
    platform: d.platformName,
    category: d.category,
    createdAt: d.createdAt.toISOString(),
  };
}

type Failure = { ok: false; status: number; error: string };

/** Lê o multipart da requisição, recusando corpos grandes antes de carregá-los na memória. */
export async function readUploadForm(req: Request): Promise<{ ok: true; form: FormData } | Failure> {
  const length = Number(req.headers.get("content-length") ?? "0");
  if (length > maxUploadBytes() + 256 * 1024) {
    return { ok: false, status: 413, error: `Arquivo maior que ${config.maxUploadMb} MB.` };
  }
  try {
    return { ok: true, form: await req.formData() };
  } catch {
    return { ok: false, status: 400, error: "Não foi possível ler o envio. Tente novamente." };
  }
}

type Owner = { draftId: string } | { caseId: string };

/**
 * Valida e armazena um arquivo enviado: tamanho, extensão, conteúdo real, duplicidade e limite.
 * O arquivo recebe um nome aleatório no armazenamento privado; o nome original fica só no banco.
 */
export async function acceptUpload(input: {
  file: File;
  owner: Owner;
  platformName: string | null;
  category: DocumentCategory;
  uploadedVia: "form" | "additional";
  requestId?: string | null;
  isDemo: boolean;
}): Promise<{ ok: true; documentId: string; file: UploadedFileDTO } | Failure> {
  const { file } = input;
  if (file.size === 0) return { ok: false, status: 400, error: "O arquivo está vazio." };
  if (file.size > maxUploadBytes()) return { ok: false, status: 413, error: `Arquivo maior que ${config.maxUploadMb} MB.` };

  const originalName = sanitizeFileName(file.name || "arquivo");
  const extension = extensionOf(originalName);
  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = detectFileType(buffer, extension);
  if (!detected.ok) return { ok: false, status: 415, error: detected.error };

  const ownerWhere = "draftId" in input.owner ? { draftId: input.owner.draftId } : { caseId: input.owner.caseId };
  const count = await prisma.document.count({ where: ownerWhere });
  if (count >= config.maxFilesPerCase) {
    return { ok: false, status: 409, error: `Limite de ${config.maxFilesPerCase} arquivos atingido.` };
  }

  const sha256 = sha256Hex(buffer);
  const sameFile = await prisma.document.findFirst({ where: { ...ownerWhere, sha256 }, select: { id: true } });
  if (sameFile) return { ok: false, status: 409, error: "Este arquivo já foi enviado." };

  // Mesmo arquivo em OUTRO caso: aceito, mas sinalizado para conferência da equipe.
  const elsewhere = await prisma.document.findFirst({
    where: {
      sha256,
      isDemo: input.isDemo,
      AND: [{ caseId: { not: null } }, ...("caseId" in input.owner ? [{ caseId: { not: input.owner.caseId } }] : [])],
    },
    select: { id: true },
  });

  const now = new Date();
  const month = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const storageKey = `documents/${month}/${randomUUID()}.${detected.kind === "jpeg" ? "jpg" : detected.kind}`;
  const storage = await getStorage();
  await storage.put(storageKey, buffer, detected.mime);

  try {
    const doc = await prisma.document.create({
      data: {
        ...ownerWhere,
        platformName: input.platformName,
        category: input.category,
        originalName,
        storageKey,
        mimeType: detected.mime,
        sizeBytes: buffer.length,
        sha256,
        uploadedVia: input.uploadedVia,
        requestId: input.requestId ?? null,
        isDemo: input.isDemo,
        status: elsewhere ? "duplicate" : "pending",
        duplicateOfId: elsewhere?.id ?? null,
        reviewNote: elsewhere ? "Arquivo idêntico já enviado em outro caso." : null,
      },
    });
    return { ok: true, documentId: doc.id, file: toUploadedFileDTO(doc) };
  } catch (error) {
    await storage.remove(storageKey).catch(() => undefined);
    throw error;
  }
}

export async function deleteDocumentAndFile(doc: { id: string; storageKey: string }): Promise<void> {
  await prisma.document.delete({ where: { id: doc.id } });
  const storage = await getStorage();
  await storage.remove(doc.storageKey).catch((error) => console.error("[storage] falha ao remover arquivo", error));
}

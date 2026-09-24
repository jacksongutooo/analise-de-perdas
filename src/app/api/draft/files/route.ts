import type { DocumentCategory } from "@prisma/client";
import { NextResponse } from "next/server";
import { authenticateDraft } from "@/lib/auth/draft";
import { prisma } from "@/lib/db";
import { acceptUpload, readUploadForm, toUploadedFileDTO } from "@/lib/files/accept";
import { INITIAL_DOC_CATEGORY_VALUES } from "@/lib/options";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXPIRED = "Sua sessão de envio expirou. Envie os arquivos novamente.";

export async function GET(req: Request) {
  const draft = await authenticateDraft(req);
  if (!draft || draft.expired || draft.submittedAt) return NextResponse.json({ error: EXPIRED }, { status: 401 });
  const docs = await prisma.document.findMany({ where: { draftId: draft.id }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ files: docs.map(toUploadedFileDTO) });
}

export async function POST(req: Request) {
  const draft = await authenticateDraft(req);
  if (!draft || draft.expired || draft.submittedAt) return NextResponse.json({ error: EXPIRED }, { status: 401 });

  const parsed = await readUploadForm(req);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const file = parsed.form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Selecione um arquivo." }, { status: 400 });
  const platform = String(parsed.form.get("platform") ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  if (!platform) return NextResponse.json({ error: "Plataforma não informada." }, { status: 400 });
  const category = String(parsed.form.get("category") ?? "");
  if (!(INITIAL_DOC_CATEGORY_VALUES as readonly string[]).includes(category)) {
    return NextResponse.json({ error: "Tipo de documento inválido." }, { status: 400 });
  }

  try {
    const result = await acceptUpload({
      file,
      owner: { draftId: draft.id },
      platformName: platform,
      category: category as DocumentCategory,
      uploadedVia: "form",
      isDemo: draft.isDemo,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ file: result.file }, { status: 201 });
  } catch (error) {
    console.error("[upload] falha ao salvar arquivo", error);
    return NextResponse.json({ error: "Não foi possível salvar o arquivo. Tente novamente." }, { status: 500 });
  }
}

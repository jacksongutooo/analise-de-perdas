import type { DocumentCategory } from "@prisma/client";
import { NextResponse, after } from "next/server";
import { getTrackingCaseId } from "@/lib/auth/tracking";
import { prisma } from "@/lib/db";
import { config } from "@/lib/env";
import { processDocument, recomputeCaseIdentified } from "@/lib/extraction/process";
import { acceptUpload, readUploadForm } from "@/lib/files/accept";
import { DOC_CATEGORY_VALUES } from "@/lib/options";
import { isSameOrigin } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Envio de documentação adicional pelo solicitante (somente quando a equipe solicitou). */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  const caseId = await getTrackingCaseId();
  if (!caseId) return NextResponse.json({ error: "Sua sessão expirou. Acesse o acompanhamento novamente." }, { status: 401 });

  const c = await prisma.case.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      isDemo: true,
      platforms: { select: { platform: { select: { id: true, name: true } } } },
      requests: { where: { status: "open" }, orderBy: { createdAt: "desc" }, take: 1, select: { id: true } },
    },
  });
  const request = c?.requests[0];
  if (!c || c.isDemo !== config.demoMode || !request) {
    return NextResponse.json({ error: "Não há documentos pendentes para este caso." }, { status: 409 });
  }

  const parsed = await readUploadForm(req);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const file = parsed.form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Selecione um arquivo." }, { status: 400 });
  const category = String(parsed.form.get("category") ?? "");
  if (!(DOC_CATEGORY_VALUES as readonly string[]).includes(category)) {
    return NextResponse.json({ error: "Tipo de documento inválido." }, { status: 400 });
  }
  const platformId = String(parsed.form.get("platformId") ?? "");
  const platform = c.platforms.find((p) => p.platform.id === platformId)?.platform ?? null;

  try {
    const result = await acceptUpload({
      file,
      owner: { caseId: c.id },
      platformName: platform?.name ?? null,
      category: category as DocumentCategory,
      uploadedVia: "additional",
      requestId: request.id,
      isDemo: c.isDemo,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    if (platform) await prisma.document.update({ where: { id: result.documentId }, data: { platformId: platform.id } });
    after(async () => {
      await processDocument(result.documentId);
      await recomputeCaseIdentified(c.id);
    });
    return NextResponse.json({ file: result.file }, { status: 201 });
  } catch (error) {
    console.error("[tracking-upload] falha", error);
    return NextResponse.json({ error: "Não foi possível salvar o arquivo. Tente novamente." }, { status: 500 });
  }
}

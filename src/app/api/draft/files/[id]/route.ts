import { NextResponse } from "next/server";
import { authenticateDraft } from "@/lib/auth/draft";
import { prisma } from "@/lib/db";
import { deleteDocumentAndFile } from "@/lib/files/accept";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const draft = await authenticateDraft(req);
  if (!draft || draft.expired || draft.submittedAt) {
    return NextResponse.json({ error: "Sua sessão de envio expirou." }, { status: 401 });
  }
  const doc = await prisma.document.findFirst({ where: { id, draftId: draft.id }, select: { id: true, storageKey: true } });
  if (!doc) return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  await deleteDocumentAndFile(doc);
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { isRateLimited, logAccess } from "@/lib/audit";
import { authenticateDraft } from "@/lib/auth/draft";
import { deleteDraftCompletely } from "@/lib/cases/drafts";
import { prisma } from "@/lib/db";
import { config } from "@/lib/env";
import { clientIp, randomToken, sha256Hex, userAgent } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cria o rascunho que recebe os arquivos antes do envio final. */
export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  if (await isRateLimited({ action: "draft.create", ip, limit: 20, windowMinutes: 60 })) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." }, { status: 429 });
  }
  const token = randomToken(32);
  const draft = await prisma.caseDraft.create({
    data: {
      tokenHash: sha256Hex(token),
      isDemo: config.demoMode,
      expiresAt: new Date(Date.now() + config.draftTtlDays * 86_400_000),
    },
  });
  await logAccess({ action: "draft.create", ip, userAgent: userAgent(req.headers), targetType: "draft", targetId: draft.id });
  return NextResponse.json({ id: draft.id, token }, { status: 201 });
}

/** "Recomeçar": apaga o rascunho e os arquivos enviados até agora. */
export async function DELETE(req: Request) {
  const draft = await authenticateDraft(req);
  if (draft && !draft.submittedAt) await deleteDraftCompletely(draft.id);
  return NextResponse.json({ ok: true });
}

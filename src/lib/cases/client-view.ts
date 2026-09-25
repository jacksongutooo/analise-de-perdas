import { prisma } from "@/lib/db";
import { config } from "@/lib/env";
import { decimalToCents } from "@/lib/format";
import type { CaseStatusValue } from "@/lib/status";

/** Dados mínimos exibidos ao solicitante. Valores automáticos não conferidos NÃO aparecem aqui. */
export async function loadClientCase(caseId: string) {
  const c = await prisma.case.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      protocol: true,
      status: true,
      isDemo: true,
      createdAt: true,
      reviewDeadline: true,
      declaredLoss: true,
      identifiedLoss: true,
      identifiedSource: true,
      validatedLoss: true,
      preliminaryIndex: true,
      fullReviewStartedAt: true,
      estimatedMinDate: true,
      estimatedMaxDate: true,
      payment: { select: { status: true, finalAmount: true, paymentMethod: true, paidAt: true } },
      nextSteps: true,
      platforms: { select: { platform: { select: { name: true } } } },
      _count: { select: { documents: true } },
      statusHistory: { orderBy: { createdAt: "asc" }, select: { toStatus: true, createdAt: true, publicMessage: true } },
      requests: {
        where: { status: "open" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, reasons: true, message: true, createdAt: true },
      },
    },
  });
  if (!c || c.isDemo !== config.demoMode) return null;
  const latestMessage = [...c.statusHistory].reverse().find((h) => h.publicMessage)?.publicMessage ?? null;
  return {
    id: c.id,
    protocol: c.protocol,
    status: c.status as CaseStatusValue,
    createdAt: c.createdAt,
    reviewDeadline: c.reviewDeadline,
    declaredLossCents: decimalToCents(c.declaredLoss) ?? 0,
    identifiedLossCents: c.identifiedSource === "manual" ? decimalToCents(c.identifiedLoss) : null,
    validatedLossCents: decimalToCents(c.validatedLoss),
    preliminaryIndex: c.preliminaryIndex,
    fullReviewStartedAt: c.fullReviewStartedAt,
    estimatedMinDate: c.estimatedMinDate,
    estimatedMaxDate: c.estimatedMaxDate,
    payment: c.payment
      ? { status: c.payment.status, finalAmountCents: decimalToCents(c.payment.finalAmount) ?? 0, paymentMethod: c.payment.paymentMethod, paidAt: c.payment.paidAt }
      : null,
    nextSteps: c.nextSteps,
    platforms: c.platforms.map((p) => p.platform.name),
    documentsCount: c._count.documents,
    history: c.statusHistory.map((h) => ({ toStatus: h.toStatus as string, createdAt: h.createdAt })),
    latestMessage,
    openRequest: c.requests[0] ?? null,
  };
}

export type ClientCase = NonNullable<Awaited<ReturnType<typeof loadClientCase>>>;

import { prisma } from "@/lib/db";
import { addBusinessDays } from "@/lib/business-days";
import type { PaymentMethod, PaymentStatus } from "@prisma/client";

export const FULL_REVIEW_ORIGINAL_CENTS = 21_990;
export const PIX_DISCOUNT_PERCENTAGE = 5;
export const FULL_REVIEW_PIX_CENTS = 20_891;

export function paymentAmount(method: PaymentMethod): number {
  return method === "pix" ? FULL_REVIEW_PIX_CENTS : FULL_REVIEW_ORIGINAL_CENTS;
}

export async function createPendingPayment(input: {
  caseId: string;
  method: PaymentMethod;
  termsAccepted: boolean;
  termsAcceptedAt?: Date;
}) {
  if (!input.termsAccepted) throw new Error("O aceite dos termos é obrigatório.");
  const caseData = await prisma.case.findUnique({ where: { id: input.caseId }, select: { status: true, _count: { select: { documents: true } } } });
  if (!caseData || caseData._count.documents === 0 || !["eligible", "preliminary_review", "waiting_payment"].includes(caseData.status)) {
    throw new Error("O caso ainda não está apto para pagamento.");
  }
  const finalAmount = paymentAmount(input.method);
  const existing = await prisma.payment.findUnique({ where: { caseId: input.caseId } });
  if (existing && ["pending", "processing", "paid"].includes(existing.status)) return existing;

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.upsert({
      where: { caseId: input.caseId },
      create: {
        caseId: input.caseId,
        termsAccepted: true,
        termsAcceptedAt: input.termsAcceptedAt ?? new Date(),
        originalAmount: "219.90",
        discountPercentage: input.method === "pix" ? "5" : "0",
        finalAmount: (finalAmount / 100).toFixed(2),
        paymentMethod: input.method,
        status: "pending",
      },
      update: {
        termsAccepted: true,
        termsAcceptedAt: input.termsAcceptedAt ?? new Date(),
        originalAmount: "219.90",
        discountPercentage: input.method === "pix" ? "5" : "0",
        finalAmount: (finalAmount / 100).toFixed(2),
        paymentMethod: input.method,
        status: "pending",
        paidAt: null,
      },
    });
    await tx.case.updateMany({ where: { id: input.caseId, status: { in: ["eligible", "preliminary_review"] } }, data: { status: "waiting_payment" } });
    return payment;
  });
}

export async function confirmPayment(input: { paymentId: string; transactionId: string; status?: PaymentStatus }) {
  if (input.status && input.status !== "paid") return prisma.payment.update({ where: { id: input.paymentId }, data: { status: input.status } });
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: input.paymentId }, include: { case: { include: { _count: { select: { documents: true } } } } } });
    if (!payment) throw new Error("Pagamento não encontrado.");
    if (payment.status === "paid") return payment;
    if (payment.case._count.documents === 0 || !["eligible", "preliminary_review", "waiting_payment"].includes(payment.case.status)) {
      throw new Error("O caso não cumpriu as etapas anteriores.");
    }

    const minDate = addBusinessDays(now, 5);
    const maxDate = addBusinessDays(now, 7);
    const updated = await tx.payment.update({
      where: { id: payment.id },
      data: { status: "paid", transactionId: input.transactionId, paidAt: now },
    });
    await tx.case.update({
      where: { id: payment.caseId },
      data: { status: "full_review", fullReviewStartedAt: now, estimatedMinDate: minDate, estimatedMaxDate: maxDate },
    });
    await tx.statusHistory.createMany({
      data: [
        { caseId: payment.caseId, fromStatus: payment.case.status, toStatus: "payment_confirmed", publicMessage: "Pagamento confirmado." },
        { caseId: payment.caseId, fromStatus: "payment_confirmed", toStatus: "full_review", publicMessage: "Análise completa iniciada." },
      ],
    });
    return updated;
  });
}

export function paymentConfirmationEmail(input: { fullName: string; protocol: string; estimatedMinDate: Date; estimatedMaxDate: Date }) {
  return {
    subject: `Sua análise foi iniciada — Protocolo ${input.protocol}`,
    text: `Olá, ${input.fullName}.\n\nSeu pagamento foi confirmado e seu caso foi encaminhado para análise completa.\n\nProtocolo: ${input.protocol}\n\nPrazo estimado: 5 a 7 dias úteis.\n\nAssim que a análise for concluída, você receberá o resultado neste e-mail.\n\nNão é necessário responder esta mensagem.`,
    estimatedMinDate: input.estimatedMinDate,
    estimatedMaxDate: input.estimatedMaxDate,
  };
}

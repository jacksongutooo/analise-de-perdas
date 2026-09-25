"use server";

import { redirect } from "next/navigation";
import { getTrackingCaseId } from "@/lib/auth/tracking";
import { createPendingPayment } from "@/lib/payments";
import type { PaymentMethod } from "@prisma/client";

export async function startPayment(formData: FormData): Promise<void> {
  const caseId = await getTrackingCaseId();
  const method = String(formData.get("paymentMethod") ?? "");
  const termsAccepted = formData.get("termsAccepted") === "on";
  if (!caseId || (method !== "pix" && method !== "standard") || !termsAccepted) redirect("/analise/pagamento?erro=aceite");

  await createPendingPayment({ caseId, method: method as PaymentMethod, termsAccepted });
  redirect("/analise/pagamento?status=pending");
}

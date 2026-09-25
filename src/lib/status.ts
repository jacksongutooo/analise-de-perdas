// Status do caso e dos documentos, com rótulos e regras de exibição.

export type Tone = "neutral" | "info" | "progress" | "warn" | "ok" | "danger";

export const CASE_STATUS_VALUES = [
  "submitted",
  "documents_received",
  "under_review",
  "additional_documents",
  "preliminary_review",
  "waiting_payment",
  "payment_confirmed",
  "full_review",
  "eligible",
  "not_eligible",
  "completed",
] as const;
export type CaseStatusValue = (typeof CASE_STATUS_VALUES)[number];

export const CASE_STATUS_LABEL: Record<CaseStatusValue, string> = {
  submitted: "Solicitação recebida",
  documents_received: "Documentos recebidos",
  under_review: "Em análise",
  additional_documents: "Documentação adicional necessária",
  preliminary_review: "Análise preliminar",
  waiting_payment: "Aguardando pagamento",
  payment_confirmed: "Pagamento confirmado",
  full_review: "Análise completa em andamento",
  eligible: "Caso com possibilidade de prosseguimento",
  not_eligible: "Elementos insuficientes para prosseguir",
  completed: "Análise concluída",
};

export const CASE_STATUS_TONE: Record<CaseStatusValue, Tone> = {
  submitted: "info",
  documents_received: "info",
  under_review: "progress",
  additional_documents: "warn",
  preliminary_review: "progress",
  waiting_payment: "warn",
  payment_confirmed: "ok",
  full_review: "progress",
  eligible: "ok",
  not_eligible: "neutral",
  completed: "neutral",
};

/** "documentação adicional" é definido somente pela ação "Solicitar documentos". */
export const ADMIN_SETTABLE_STATUSES: CaseStatusValue[] = [
  "submitted",
  "documents_received",
  "under_review",
  "preliminary_review",
  "waiting_payment",
  "full_review",
  "eligible",
  "not_eligible",
  "completed",
];

export const STATUS_GROUPS = {
  new: ["submitted", "documents_received"],
  review: ["under_review", "preliminary_review", "payment_confirmed", "full_review"],
  waiting: ["additional_documents", "waiting_payment"],
  done: ["not_eligible", "completed"],
} as const satisfies Record<string, readonly CaseStatusValue[]>;
export type StatusGroup = keyof typeof STATUS_GROUPS;

export const FINISHED_STATUSES: readonly CaseStatusValue[] = STATUS_GROUPS.done;

export function isCaseStatus(value: string): value is CaseStatusValue {
  return (CASE_STATUS_VALUES as readonly string[]).includes(value);
}

export const DOCUMENT_STATUS_VALUES = ["pending", "valid", "divergent", "illegible", "duplicate", "manual_review"] as const;
export type DocumentStatusValue = (typeof DOCUMENT_STATUS_VALUES)[number];

export const DOCUMENT_STATUS_LABEL: Record<DocumentStatusValue, string> = {
  pending: "Pendente",
  valid: "Validado",
  divergent: "Divergente",
  illegible: "Ilegível",
  duplicate: "Possível duplicidade",
  manual_review: "Necessita conferência manual",
};

export const DOCUMENT_STATUS_TONE: Record<DocumentStatusValue, Tone> = {
  pending: "info",
  valid: "ok",
  divergent: "danger",
  illegible: "danger",
  duplicate: "warn",
  manual_review: "warn",
};

export function isDocumentStatus(value: string): value is DocumentStatusValue {
  return (DOCUMENT_STATUS_VALUES as readonly string[]).includes(value);
}

export type TimelineState = "done" | "current" | "attention" | "pending";
export type TimelineStep = { key: string; label: string; state: TimelineState; date: Date | null };

/** Linha do tempo simplificada exibida ao solicitante. */
export function clientTimeline(status: CaseStatusValue, history: { toStatus: string; createdAt: Date }[]): TimelineStep[] {
  const at = (statuses: readonly string[], last = false): Date | null => {
    const dates = history
      .filter((h) => statuses.includes(h.toStatus))
      .map((h) => h.createdAt)
      .sort((a, b) => a.getTime() - b.getTime());
    return (last ? dates[dates.length - 1] : dates[0]) ?? null;
  };
  const finished = FINISHED_STATUSES.includes(status);
  const paymentDone = ["payment_confirmed", "full_review", "completed"].includes(status);
  return [
    { key: "received", label: "Solicitação recebida", state: "done", date: at(["submitted"]) },
    {
      key: "documents",
      label: "Documentos recebidos",
      state: status === "submitted" ? "current" : "done",
      date: at(["documents_received"]),
    },
    {
      key: "analysis",
      label: "Análise documental",
      state: finished || paymentDone ? "done" : status === "additional_documents" ? "attention" : status === "submitted" ? "pending" : "current",
      date: at(["under_review"]),
    },
    { key: "payment", label: "Pagamento", state: paymentDone ? "done" : status === "waiting_payment" ? "current" : "pending", date: at(["payment_confirmed"]) },
    { key: "result", label: "Resultado", state: finished ? "done" : status === "full_review" ? "current" : "pending", date: finished ? at(FINISHED_STATUSES, true) : null },
  ];
}

/** Divergência relevante entre valor declarado e identificado (≥ R$ 100 e ≥ 2% do declarado). */
export function divergenceOf(declaredCents: number, identifiedCents: number | null): { diffCents: number } | null {
  if (identifiedCents === null) return null;
  const diff = declaredCents - identifiedCents;
  const threshold = Math.max(10_000, Math.round(Math.abs(declaredCents) * 0.02));
  return Math.abs(diff) >= threshold ? { diffCents: diff } : null;
}

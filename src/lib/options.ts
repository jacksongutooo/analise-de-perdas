// Opções do formulário e rótulos. Compartilhado entre navegador e servidor.

export type Option<V extends string> = { value: V; label: string; description?: string };

export function labelFor<V extends string>(options: readonly Option<V>[], value: string | null | undefined): string {
  if (!value) return "—";
  return options.find((o) => o.value === value)?.label ?? value;
}

export const BET_TYPE_VALUES = ["sports", "casino", "both"] as const;
export type BetTypeValue = (typeof BET_TYPE_VALUES)[number];
export const BET_TYPES: Option<BetTypeValue>[] = [
  { value: "sports", label: "Apostas esportivas", description: "Futebol, basquete, tênis, apostas ao vivo e outros esportes." },
  { value: "casino", label: "Cassino online", description: "Slots, roleta, blackjack, crash, mines e outros jogos." },
  { value: "both", label: "Utilizei os dois", description: "Apostas esportivas e cassino online." },
];
export const BET_TYPE_SUMMARY: Record<BetTypeValue, string> = {
  sports: "Apostas esportivas",
  casino: "Cassino online",
  both: "Ambos (esportivas e cassino)",
};
export const BET_TYPE_SHORT: Record<BetTypeValue, string> = { sports: "Esportivas", casino: "Cassino", both: "Misto" };

export const SPORTS_KIND_VALUES = ["pre_game", "live", "multiple", "various"] as const;
export const SPORTS_KINDS: Option<(typeof SPORTS_KIND_VALUES)[number]>[] = [
  { value: "pre_game", label: "Pré-jogo" },
  { value: "live", label: "Ao vivo" },
  { value: "multiple", label: "Múltiplas" },
  { value: "various", label: "Utilizava vários tipos" },
];

export const CASINO_GAME_VALUES = ["slots", "roulette", "blackjack", "crash", "mines", "other"] as const;
export const CASINO_GAMES: Option<(typeof CASINO_GAME_VALUES)[number]>[] = [
  { value: "slots", label: "Slots" },
  { value: "roulette", label: "Roleta" },
  { value: "blackjack", label: "Blackjack" },
  { value: "crash", label: "Crash" },
  { value: "mines", label: "Mines" },
  { value: "other", label: "Outros" },
];

export const MAIN_LOSS_VALUES = ["sports", "casino", "similar"] as const;
export const MAIN_LOSS_AREAS: Option<(typeof MAIN_LOSS_VALUES)[number]>[] = [
  { value: "sports", label: "Apostas esportivas" },
  { value: "casino", label: "Cassino online" },
  { value: "similar", label: "Valores semelhantes nos dois" },
];

export const PLATFORM_SLUGS = ["betano", "bet365", "kto", "superbet", "betnacional", "sportingbet"] as const;
export type PlatformSlug = (typeof PLATFORM_SLUGS)[number];
export const PLATFORMS: { slug: PlatformSlug; name: string }[] = [
  { slug: "betano", name: "Betano" },
  { slug: "bet365", name: "Bet365" },
  { slug: "kto", name: "KTO" },
  { slug: "superbet", name: "Superbet" },
  { slug: "betnacional", name: "Betnacional" },
  { slug: "sportingbet", name: "Sportingbet" },
];

export const PERIOD_VALUES = ["up_to_3m", "from_3_to_6m", "from_6_to_12m", "over_12m"] as const;
export type PeriodValue = (typeof PERIOD_VALUES)[number];
export const PERIODS: Option<PeriodValue>[] = [
  { value: "up_to_3m", label: "Até 3 meses" },
  { value: "from_3_to_6m", label: "3 a 6 meses" },
  { value: "from_6_to_12m", label: "6 a 12 meses" },
  { value: "over_12m", label: "Mais de 12 meses" },
];

export const SITUATION_VALUES = [
  "losses",
  "balance_not_received",
  "withdrawal_not_done",
  "account_blocked",
  "limit_or_closure",
  "unrecognized_transaction",
  "bonus_issue",
  "other",
] as const;
export type SituationValue = (typeof SITUATION_VALUES)[number];
export const SITUATIONS: Option<SituationValue>[] = [
  { value: "losses", label: "Perdas durante apostas" },
  { value: "balance_not_received", label: "Saldo não recebido" },
  { value: "withdrawal_not_done", label: "Saque não realizado" },
  { value: "account_blocked", label: "Conta bloqueada" },
  { value: "limit_or_closure", label: "Problema após solicitar limite ou encerramento" },
  { value: "unrecognized_transaction", label: "Transação que não reconheço" },
  { value: "bonus_issue", label: "Problema envolvendo bônus ou promoção" },
  { value: "other", label: "Outro" },
];

export const DOC_CATEGORY_VALUES = [
  "financial_history",
  "deposit_history",
  "withdrawal_history",
  "bet_history",
  "bank_statement",
  "pix_receipt",
  "other",
] as const;
export type DocCategoryValue = (typeof DOC_CATEGORY_VALUES)[number];
export const DOC_CATEGORIES: (Option<DocCategoryValue> & { short: string })[] = [
  { value: "financial_history", label: "Histórico financeiro completo", short: "Histórico completo" },
  { value: "deposit_history", label: "Histórico de depósitos", short: "Depósitos" },
  { value: "withdrawal_history", label: "Histórico de saques", short: "Saques" },
  { value: "bet_history", label: "Histórico de apostas ou jogos", short: "Apostas ou jogos" },
  { value: "bank_statement", label: "Extrato bancário", short: "Extrato bancário" },
  { value: "pix_receipt", label: "Comprovante PIX", short: "Comprovante PIX" },
  { value: "other", label: "Outro documento", short: "Outro" },
];
/** Na solicitação inicial pedimos apenas documentos das próprias plataformas. */
export const INITIAL_DOC_CATEGORY_VALUES = ["financial_history", "deposit_history", "withdrawal_history", "bet_history"] as const;
export type InitialDocCategory = (typeof INITIAL_DOC_CATEGORY_VALUES)[number];

export const REQUEST_REASON_VALUES = [
  "incomplete_history",
  "divergent_values",
  "illegible_file",
  "missing_withdrawals",
  "missing_deposits",
  "other",
] as const;
export type RequestReasonValue = (typeof REQUEST_REASON_VALUES)[number];
export const REQUEST_REASONS: Option<RequestReasonValue>[] = [
  { value: "incomplete_history", label: "Histórico incompleto" },
  { value: "divergent_values", label: "Valores divergentes" },
  { value: "illegible_file", label: "Arquivo ilegível" },
  { value: "missing_withdrawals", label: "Falta histórico de saques" },
  { value: "missing_deposits", label: "Falta histórico de depósitos" },
  { value: "other", label: "Outro" },
];

export const COMMITMENT_VERSION = "2026-09-v1";
export function commitmentText(reviewDays: number): string {
  return `Declaro que, por decisão voluntária, permanecerei sem realizar novas apostas durante o período de análise do meu caso, que poderá durar até ${reviewDays} dias.`;
}

export const PRIVACY_CONSENT_TEXT =
  "Concordo com o tratamento dos meus dados e documentos para análise desta solicitação.";

export const NO_PASSWORD_NOTICE =
  "Nunca solicitaremos sua senha da plataforma, senha bancária, código SMS ou código de autenticação.";

export const DEFAULT_NEXT_STEPS =
  "Nossa equipe entrará em contato pelo WhatsApp ou e-mail informados para explicar as próximas etapas do seu caso. Nunca solicitamos senhas ou códigos de acesso.";

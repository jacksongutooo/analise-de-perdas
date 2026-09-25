import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  EMPTY_DATA,
  SCREENS,
  attachedFiles,
  buildPayload,
  comprovabetFiles,
  contactErrors,
  declaredLoss,
  loadProgress,
  resumeScreen,
  saveProgress,
  screenError,
  selectedPlatformNames,
  type WizardData,
} from "@/components/analysis/state";
import { resolvePlatforms } from "@/lib/cases/platforms";
import { submissionSchema } from "@/lib/cases/submission";
import { generateProtocol, normalizeProtocol } from "@/lib/protocol";
import { hashPassword, verifyPassword } from "@/lib/security";
import { clientCpfLabel, clientDocumentLabel, clientTimeline, divergenceOf } from "@/lib/status";

const filled: WizardData = {
  ...EMPTY_DATA,
  betType: "sports",
  sportsKind: "live",
  platforms: ["betano"],
  otherPlatformEnabled: true,
  customPlatforms: [" Minha  Bet ", "betano"],
  period: "over_12m",
  depositsCents: 3000000,
  withdrawalsCents: 1000000,
  hasBalance: true,
  balanceCents: 50000,
  situations: ["losses"],
  privacyConsent: true,
  commitment: true,
  fullName: " Ana  Souza ",
  cpf: "52998224725",
  email: "ana@exemplo.com.br",
  whatsapp: "(49) 99999-9999",
  isAdult: true,
};

describe("formulário", () => {
  test("perda declarada = depósitos − saques − saldo; negativo vira zero e é sinalizado", () => {
    assert.deepEqual(declaredLoss(filled), { raw: 1950000, loss: 1950000, needsReview: false });
    assert.deepEqual(declaredLoss({ ...filled, withdrawalsCents: 4000000 }), { raw: -1050000, loss: 0, needsReview: true });
  });

  test("plataformas selecionadas e arquivos vinculados", () => {
    assert.deepEqual(selectedPlatformNames(filled), ["Betano", "Minha Bet"]);
    const files = [
      { id: "1", name: "a.csv", size: 1, platform: "Betano", category: "financial_history", createdAt: "" },
      { id: "2", name: "b.csv", size: 1, platform: "KTO", category: "financial_history", createdAt: "" },
      { id: "3", name: "c.csv", size: 1, platform: "minha bet", category: "financial_history", createdAt: "" },
      { id: "4", name: "comprovabet.pdf", size: 1, platform: null, category: "comprovabet", createdAt: "" },
    ];
    assert.deepEqual(attachedFiles(files, selectedPlatformNames(filled)).map((f) => f.id), ["1", "3"]);
    assert.deepEqual(comprovabetFiles(files).map((f) => f.id), ["4"]);
  });

  test("os dados do solicitante (com CPF) vêm antes do envio do ComprovaBet", () => {
    const order = SCREENS.map((s) => s.id);
    assert.ok(order.indexOf("contact") < order.indexOf("documents"));
    assert.equal(order.at(-1), "review");
  });

  test("CPF obrigatório e válido nos dados do solicitante", () => {
    assert.equal(contactErrors({ ...filled, cpf: "" }).cpf, "Informe seu CPF.");
    assert.equal(contactErrors({ ...filled, cpf: "52998224724" }).cpf, "CPF inválido. Confira os números.");
    assert.equal(contactErrors({ ...filled, cpf: "11111111111" }).cpf, "CPF inválido. Confira os números.");
    assert.equal(contactErrors(filled).cpf, undefined);
    // CPF já registrado no servidor (só a versão mascarada fica no navegador).
    assert.equal(contactErrors({ ...filled, cpf: "", cpfMasked: "***.***.***-25" }).cpf, undefined);
  });

  test("o CPF completo não é salvo no navegador", () => {
    const store = new Map<string, string>();
    const localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
    const g = globalThis as unknown as { window?: unknown };
    g.window = { localStorage };
    try {
      assert.ok(saveProgress({ v: 1, screen: "documents", data: { ...filled, cpfMasked: "***.***.***-25" }, draft: null, savedAt: 1 }));
      const raw = [...store.values()].join("");
      assert.ok(!raw.includes("52998224725"));
      assert.ok(raw.includes("***.***.***-25"));
      const loaded = loadProgress();
      assert.equal(loaded?.data.cpf, "");
      assert.equal(loaded?.data.cpfMasked, "***.***.***-25");
    } finally {
      delete g.window;
    }
  });

  test("validação de cada tela", () => {
    const ctx = { fileCount: 1, busy: false };
    for (const s of ["type", "typeDetail", "platforms", "period", "amounts", "balance", "situation", "contact", "documents", "commitment", "review"] as const) {
      assert.equal(screenError(s, filled, ctx), null, s);
    }
    assert.equal(screenError("documents", filled, { fileCount: 0, busy: false }), "Envie o seu ComprovaBet para continuar.");
    assert.equal(screenError("documents", filled, { fileCount: 1, busy: true }), "Aguarde o envio dos arquivos terminar.");
    assert.equal(screenError("documents", { ...filled, privacyConsent: false }, ctx), "Para enviar documentos, marque a autorização de tratamento dos dados.");
    assert.equal(screenError("typeDetail", { ...filled, betType: "casino", casinoGames: [] }, ctx), "Escolha ao menos um jogo.");
    assert.equal(screenError("balance", { ...filled, balanceCents: null }, ctx), "Informe o saldo aproximado.");
    assert.equal(screenError("contact", { ...filled, fullName: "Ana" }, ctx), "Informe seu nome completo.");
    assert.equal(screenError("contact", { ...filled, cpf: "123.456.789-00" }, ctx), "CPF inválido. Confira os números.");
  });

  test("retomada volta para a primeira etapa incompleta", () => {
    assert.equal(resumeScreen("review", { ...filled, period: null }), "period");
    assert.equal(resumeScreen("contact", filled), "contact");
    // Sem o CPF registrado no servidor, a retomada volta para os dados do solicitante.
    assert.equal(resumeScreen("review", { ...filled, cpf: "", cpfMasked: null }), "contact");
    assert.equal(resumeScreen("review", { ...filled, cpf: "", cpfMasked: "***.***.***-25" }), "review");
  });

  test("dados enviados ao servidor passam na validação", () => {
    const payload = buildPayload(filled);
    assert.equal(payload.fullName, "Ana Souza");
    // O CPF não vai no envio final: ele já foi registrado no rascunho do servidor, antes do ComprovaBet.
    assert.ok(!("cpf" in payload));
    const result = submissionSchema.safeParse(payload);
    assert.ok(result.success);
  });

  test("servidor recusa dados inconsistentes", () => {
    const payload = buildPayload(filled);
    const firstIssuePath = (patch: Record<string, unknown>) => {
      const result = submissionSchema.safeParse({ ...payload, ...patch });
      assert.ok(!result.success);
      return result.error.issues[0]?.path.join(".");
    };
    assert.equal(firstIssuePath({ sportsKind: null }), "sportsKind");
    assert.equal(firstIssuePath({ balanceCents: null }), "balanceCents");
    assert.equal(firstIssuePath({ whatsapp: "123" }), "whatsapp");
    assert.equal(firstIssuePath({ commitment: false }), "commitment");
    assert.equal(firstIssuePath({ privacyConsent: false }), "privacyConsent");
    assert.equal(firstIssuePath({ isAdult: false }), "isAdult");
    assert.equal(firstIssuePath({ depositsCents: 0 }), "depositsCents");
    assert.equal(firstIssuePath({ withdrawalsCents: -5 }), "withdrawalsCents");
    assert.equal(firstIssuePath({ platforms: [], otherPlatformEnabled: false, customPlatforms: [] }), "platforms");
  });
});

describe("regras do caso", () => {
  test("divergência relevante entre declarado e identificado", () => {
    assert.deepEqual(divergenceOf(3000000, 1850000), { diffCents: 1150000 });
    assert.equal(divergenceOf(100000, 99000), null);
    assert.equal(divergenceOf(100000, null), null);
  });

  test("linha do tempo do cliente: 6 etapas com o ComprovaBet", () => {
    const d = (day: number) => new Date(`2026-09-${String(day).padStart(2, "0")}T12:00:00Z`);
    const base = {
      createdAt: d(1),
      documentSentAt: d(1),
      hasComprovaBet: true,
      documentApprovedAt: null,
      paymentConfirmedAt: null,
    };
    const received = [
      { toStatus: "submitted", fromStatus: null, createdAt: d(1) },
      { toStatus: "documents_received", fromStatus: "submitted", createdAt: d(1) },
    ];
    const states = (input: Parameters<typeof clientTimeline>[0]) => clientTimeline(input).map((s) => s.state);
    const timeline = clientTimeline({ ...base, status: "documents_received", paymentStatus: "pending", history: received });
    assert.deepEqual(
      timeline.map((s) => s.label),
      ["Cadastro realizado", "ComprovaBet enviado", "Validação documental", "Pagamento confirmado", "Análise em andamento", "Análise concluída"],
    );
    assert.deepEqual(timeline.map((s) => s.state), ["done", "done", "current", "pending", "pending", "pending"]);

    // Complemento pedido na validação documental.
    const complement = [...received, { toStatus: "additional_documents", fromStatus: "documents_received", createdAt: d(2) }];
    const flagged = clientTimeline({ ...base, status: "additional_documents", paymentStatus: "pending", history: complement });
    assert.deepEqual(flagged.map((s) => s.state), ["done", "done", "attention", "pending", "pending", "pending"]);
    assert.equal(flagged[2]?.note, "Documentação complementar necessária");

    // Documento aprovado: aguardando pagamento → pagamento em confirmação.
    const approved = [...received, { toStatus: "awaiting_payment", fromStatus: "documents_received", createdAt: d(3) }];
    const waiting = { ...base, documentApprovedAt: d(3), status: "awaiting_payment" as const, history: approved };
    assert.deepEqual(states({ ...waiting, paymentStatus: "pending" }), ["done", "done", "done", "current", "pending", "pending"]);
    assert.equal(clientTimeline({ ...waiting, paymentStatus: "pending" })[3]?.note, "Aguardando pagamento");
    assert.equal(clientTimeline({ ...waiting, paymentStatus: "awaiting_confirmation" })[3]?.note, "Pagamento em confirmação");

    // Pagamento confirmado → análise em andamento → concluída.
    const paid = { ...waiting, paymentStatus: "confirmed" as const, paymentConfirmedAt: d(4) };
    const paidHistory = [...approved, { toStatus: "payment_confirmed", fromStatus: "awaiting_payment", createdAt: d(4) }];
    assert.deepEqual(states({ ...paid, status: "payment_confirmed", history: paidHistory }), ["done", "done", "done", "done", "pending", "pending"]);
    const reviewing = [...paidHistory, { toStatus: "under_review", fromStatus: "payment_confirmed", createdAt: d(5) }];
    assert.deepEqual(states({ ...paid, status: "under_review", history: reviewing }), ["done", "done", "done", "done", "current", "pending"]);

    // Complemento pedido durante a análise: a validação continua concluída e a análise fica em atenção.
    const duringAnalysis = [...reviewing, { toStatus: "additional_documents", fromStatus: "under_review", createdAt: d(6) }];
    assert.deepEqual(states({ ...paid, status: "additional_documents", history: duringAnalysis }), ["done", "done", "done", "done", "attention", "pending"]);

    const done = [...reviewing, { toStatus: "completed", fromStatus: "under_review", createdAt: d(7) }];
    assert.deepEqual(states({ ...paid, status: "completed", history: done }), ["done", "done", "done", "done", "done", "done"]);
  });

  test("casos anteriores ao ComprovaBet não exibem a etapa de pagamento", () => {
    const history = [
      { toStatus: "submitted", createdAt: new Date("2026-09-01") },
      { toStatus: "documents_received", createdAt: new Date("2026-09-01") },
    ];
    const legacy = { paymentStatus: "not_applicable" as const, history, createdAt: new Date("2026-09-01"), documentSentAt: null, hasComprovaBet: false, documentApprovedAt: null, paymentConfirmedAt: null };
    const timeline = clientTimeline({ ...legacy, status: "documents_received" });
    assert.ok(!timeline.some((s) => s.key === "payment"));
    assert.equal(timeline[1]?.label, "Documentos enviados");
    assert.deepEqual(timeline.map((s) => s.state), ["done", "done", "current", "pending", "pending"]);
    assert.deepEqual(clientTimeline({ ...legacy, status: "completed" }).map((s) => s.state), ["done", "done", "done", "done", "done"]);
  });

  test("situação do documento e do CPF para o cliente (sem “validação automática” falsa)", () => {
    assert.deepEqual(clientDocumentLabel("pending"), { label: "Aguardando análise", tone: "info" });
    assert.equal(clientDocumentLabel("valid").label, "Documento aprovado");
    assert.equal(clientDocumentLabel("cpf_mismatch").label, "CPF divergente");
    assert.equal(clientDocumentLabel("illegible").label, "Documentação complementar necessária");
    assert.equal(clientCpfLabel("pending", "match")?.label, "CPF compatível");
    assert.equal(clientCpfLabel("pending", "manual_match")?.label, "CPF compatível");
    // Sem leitura automática (imagem, PDF digitalizado, CPF mascarado): conferência da equipe.
    assert.equal(clientCpfLabel("pending", "pending")?.label, "Aguardando conferência documental");
    assert.equal(clientCpfLabel("cpf_mismatch", "mismatch"), null);
  });

  test("protocolo", () => {
    assert.equal(normalizeProtocol("anl847291"), "ANL-847291");
    assert.equal(normalizeProtocol("847291"), "ANL-847291");
    assert.equal(normalizeProtocol("ANL-12345"), null);
    assert.match(generateProtocol(false), /^ANL-\d{6}$/);
  });

  test("plataformas digitadas em “Outra” são reconhecidas", () => {
    const r = resolvePlatforms({ platforms: ["kto"], otherPlatformEnabled: true, customPlatforms: ["betano", "Minha  Bet"] });
    assert.deepEqual(r.platforms.map((p) => [p.slug, p.isCustom]), [["kto", false], ["betano", false], ["minha-bet", true]]);
    assert.equal(r.aliases.get("minha bet"), "minha-bet");
  });

  test("senhas da equipe", async () => {
    const hash = await hashPassword("uma-senha-bem-longa");
    assert.ok(await verifyPassword("uma-senha-bem-longa", hash));
    assert.ok(!(await verifyPassword("outra-senha-qualquer", hash)));
    assert.ok(!(await verifyPassword("qualquer", "formato-invalido")));
  });
});

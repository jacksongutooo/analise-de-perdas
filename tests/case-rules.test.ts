import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  EMPTY_DATA,
  attachedFiles,
  buildPayload,
  declaredLoss,
  resumeScreen,
  screenError,
  selectedPlatformNames,
  type WizardData,
} from "@/components/analysis/state";
import { resolvePlatforms } from "@/lib/cases/platforms";
import { submissionSchema } from "@/lib/cases/submission";
import { generateProtocol, normalizeProtocol } from "@/lib/protocol";
import { hashPassword, verifyPassword } from "@/lib/security";
import { clientTimeline, divergenceOf } from "@/lib/status";

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
    ];
    assert.deepEqual(attachedFiles(files, selectedPlatformNames(filled)).map((f) => f.id), ["1", "3"]);
  });

  test("validação de cada tela", () => {
    const ctx = { fileCount: 1, busy: false };
    for (const s of ["type", "typeDetail", "platforms", "period", "amounts", "balance", "situation", "documents", "commitment", "contact", "review"] as const) {
      assert.equal(screenError(s, filled, ctx), null, s);
    }
    assert.equal(screenError("documents", filled, { fileCount: 0, busy: false }), "Envie ao menos um documento de uma das plataformas.");
    assert.equal(screenError("documents", { ...filled, privacyConsent: false }, ctx), "Para enviar documentos, marque a autorização de tratamento dos dados.");
    assert.equal(screenError("typeDetail", { ...filled, betType: "casino", casinoGames: [] }, ctx), "Escolha ao menos um jogo.");
    assert.equal(screenError("balance", { ...filled, balanceCents: null }, ctx), "Informe o saldo aproximado.");
    assert.equal(screenError("contact", { ...filled, fullName: "Ana" }, ctx), "Informe seu nome completo.");
  });

  test("retomada volta para a primeira etapa incompleta", () => {
    assert.equal(resumeScreen("review", { ...filled, period: null }), "period");
    assert.equal(resumeScreen("contact", filled), "contact");
  });

  test("dados enviados ao servidor passam na validação", () => {
    const payload = buildPayload(filled);
    assert.equal(payload.fullName, "Ana Souza");
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

  test("linha do tempo exibida ao cliente", () => {
    const history = [
      { toStatus: "submitted", createdAt: new Date("2026-09-01") },
      { toStatus: "documents_received", createdAt: new Date("2026-09-01") },
    ];
    assert.deepEqual(clientTimeline("documents_received", history).map((s) => s.state), ["done", "done", "current", "pending"]);
    assert.deepEqual(clientTimeline("additional_documents", history).map((s) => s.state), ["done", "done", "attention", "pending"]);
    assert.deepEqual(clientTimeline("completed", history).map((s) => s.state), ["done", "done", "done", "done"]);
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

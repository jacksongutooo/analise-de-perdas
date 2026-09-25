// Dados FICTÍCIOS de demonstração. Só roda com DEMO_MODE=true e fora de produção.
// Todos os registros criados aqui são marcados com is_demo = true e nunca se misturam com dados reais.
// Os casos cobrem todas as etapas do fluxo com o ComprovaBet: validação documental, CPF divergente,
// complemento, pagamento (pendente, em confirmação e confirmado), análise e conclusão — além de um
// caso anterior ao ComprovaBet (sem CPF e sem pagamento), para conferir a compatibilidade.
import "../scripts/load-env";
import { randomUUID } from "node:crypto";
import type { CaseStatus, DocumentStatus } from "@prisma/client";
import { CPF_MISMATCH_MESSAGE, PAYMENT_NOTICE, SERVICE_TERMS_CHECKBOX, SERVICE_TERMS_VERSION } from "../src/lib/comprovabet";
import { formatCpf } from "../src/lib/cpf";
import { prisma } from "../src/lib/db";
import { simplePdf } from "../src/lib/demo/simple-pdf";
import { checkToDocumentData, inspectComprovaBet } from "../src/lib/documents/comprovabet-check";
import { config } from "../src/lib/env";
import { processCaseDocuments } from "../src/lib/extraction/process";
import { centsToDecimal, formatAmount } from "../src/lib/format";
import { COMMITMENT_VERSION, PLATFORMS, commitmentText } from "../src/lib/options";
import { hashPassword, sha256Hex } from "../src/lib/security";
import { getStorage } from "../src/lib/storage";

const DAY = 86_400_000;
const HOUR = 3_600_000;
const DEMO_PASSWORD = process.env.DEMO_ADMIN_PASSWORD || "demonstracao-2026";
const YEAR = config.comprovabetYear;

type Movement = { day: number; type: "Depósito PIX" | "Saque PIX" | "Aposta" | "Bônus" | "Saque"; cents: number; status?: string };

function csvFor(movements: Movement[], baseDate: Date, finalBalanceCents: number): Buffer {
  const lines = ["Data;Tipo;Valor;Status;Saldo"];
  let balance = 0;
  for (const m of movements) {
    const d = new Date(baseDate.getTime() - m.day * DAY);
    const date = `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()} 14:${String(
      10 + (m.day % 50),
    ).padStart(2, "0")}`;
    const status = m.status ?? "Concluído";
    if (status === "Concluído") balance += m.type.startsWith("Depósito") || m.type === "Bônus" ? m.cents : -m.cents;
    lines.push(`${date};${m.type};${m.type.startsWith("Saque") || m.type === "Aposta" ? "-" : ""}${formatAmount(m.cents)};${status};${formatAmount(Math.max(0, balance))}`);
  }
  const last = new Date(baseDate.getTime() - 2 * DAY);
  lines.push(
    `${String(last.getUTCDate()).padStart(2, "0")}/${String(last.getUTCMonth() + 1).padStart(2, "0")}/${last.getUTCFullYear()} 09:00;Ajuste de saldo;0,00;Concluído;${formatAmount(finalBalanceCents)}`,
  );
  return Buffer.from(`﻿${lines.join("\n")}\n`, "utf8");
}

/** Gera movimentações que somam exatamente o total pedido, espalhadas em ~12 meses. */
function spread(totalCents: number, parts: number, label: Movement["type"], startDay: number): Movement[] {
  if (totalCents <= 0) return [];
  const weights = Array.from({ length: parts }, (_, i) => 1 + ((i * 7) % 5) / 4);
  const sum = weights.reduce((a, b) => a + b, 0);
  let allocated = 0;
  return weights
    .map((w, i) => {
      const cents = i === parts - 1 ? totalCents - allocated : Math.floor((totalCents * w) / sum / 100) * 100;
      allocated += cents;
      return { day: startDay - Math.round((i * (startDay - 5)) / Math.max(1, parts - 1)), type: label, cents };
    })
    .filter((m) => m.cents > 0);
}

/** CPF fictício com dígitos verificadores válidos (base de 9 dígitos começando com zeros). */
function demoCpf(base: string): string {
  const d = base.split("").map(Number);
  const digit = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += (d[i] ?? 0) * (length + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  d.push(digit(9));
  d.push(digit(10));
  return d.join("");
}

/** ComprovaBet FICTÍCIO em PDF com texto selecionável — só para demonstrar a leitura do CPF. */
function comprovabetPdf(o: { holder: string; cpfText: string; year: number; platform: string; deposits: number; withdrawals: number; balance: number }) {
  return simplePdf([
    { text: "DOCUMENTO FICTÍCIO — GERADO APENAS PARA DEMONSTRAÇÃO DO SISTEMA", bold: true, size: 9 },
    { text: `ComprovaBet — Demonstrativo anual ${o.year}`, bold: true, size: 18, gap: 36 },
    { text: `Período de referência: 01/01/${o.year} a 31/12/${o.year}`, gap: 28 },
    { text: `Titular: ${o.holder}` },
    { text: `CPF: ${o.cpfText}` },
    { text: `Plataforma: ${o.platform}` },
    { text: "Resumo do período", bold: true, size: 13, gap: 36 },
    { text: `Total de depósitos no ano: R$ ${formatAmount(o.deposits)}` },
    { text: `Total de saques no ano: R$ ${formatAmount(o.withdrawals)}` },
    { text: `Saldo final: R$ ${formatAmount(o.balance)}` },
    { text: "Este arquivo não tem validade e não representa um documento real.", size: 9, gap: 44 },
  ]);
}

type CsvDoc = { platform: string; deposits: number; withdrawals: number; balance: number; name: string };

/** Como o documento aparece: CPF completo, mascarado (só alguns dígitos) ou de outra pessoa (mascarado). */
type ComprovaBetSpec = { file: string; cpf: "full" | "masked" | "other_person"; year?: number };

type DemoEvent =
  | { kind: "approve" }
  | { kind: "flag"; docStatus: Extract<DocumentStatus, "cpf_mismatch" | "complement_required" | "invalid">; reasons: string[]; message: string }
  | { kind: "terms" }
  | { kind: "inform_paid" }
  | { kind: "confirm_payment" }
  | { kind: "start" }
  | { kind: "complement"; reasons: string[]; message: string; files: CsvDoc[] }
  | { kind: "finish"; to: Extract<CaseStatus, "eligible" | "not_eligible" | "completed">; message?: string };

type DemoCase = {
  protocol: string;
  name: string;
  cpfBase: string | null;
  email: string;
  whatsapp: string;
  daysAgo: number;
  betType: "sports" | "casino" | "both";
  sportsKind?: string;
  casinoGames?: string[];
  mainLossArea?: string;
  period: "up_to_3m" | "from_3_to_6m" | "from_6_to_12m" | "over_12m";
  situations: string[];
  platforms: { slug: string; name: string; custom?: boolean }[];
  declared: { deposits: number; withdrawals: number; balance: number };
  comprovabet: ComprovaBetSpec | null;
  /** Arquivos do fluxo anterior (antes do ComprovaBet): só no caso de compatibilidade. */
  legacyDocs?: CsvDoc[];
  events: DemoEvent[];
  legacyFlow?: CaseStatus[];
  confirmIdentified?: boolean;
  validated?: number;
  nextSteps?: string;
  note?: string;
};

const R = (reais: number) => reais * 100;
const TO_PAYMENT: DemoEvent[] = [{ kind: "approve" }, { kind: "terms" }, { kind: "inform_paid" }, { kind: "confirm_payment" }];

const CASES: DemoCase[] = [
  {
    protocol: "DEMO-100007",
    name: "Gabi Exemplar Costa",
    cpfBase: "000000007",
    email: "gabi.exemplar@example.com",
    whatsapp: "71900000007",
    daysAgo: 0,
    betType: "sports",
    sportsKind: "pre_game",
    period: "from_3_to_6m",
    situations: ["unrecognized_transaction"],
    platforms: [{ slug: "kto", name: "KTO" }],
    declared: { deposits: R(4000), withdrawals: R(500), balance: 0 },
    comprovabet: { file: `comprovabet-${YEAR}-gabi.pdf`, cpf: "masked" },
    events: [],
  },
  {
    protocol: "DEMO-100001",
    name: "Ana Exemplo Souza",
    cpfBase: "000000001",
    email: "ana.exemplo@example.com",
    whatsapp: "11900000001",
    daysAgo: 1,
    betType: "sports",
    sportsKind: "live",
    period: "from_6_to_12m",
    situations: ["losses"],
    platforms: [{ slug: "betano", name: "Betano" }],
    declared: { deposits: R(12000), withdrawals: R(2500), balance: 0 },
    comprovabet: { file: `ComprovaBet_${YEAR}_Ana.pdf`, cpf: "full" },
    events: [],
  },
  {
    protocol: "DEMO-100008",
    name: "Hugo Fictício Ramos",
    cpfBase: "000000008",
    email: "hugo.ficticio@example.com",
    whatsapp: "81900000008",
    daysAgo: 2,
    betType: "casino",
    casinoGames: ["slots"],
    period: "from_6_to_12m",
    situations: ["losses"],
    platforms: [{ slug: "betano", name: "Betano" }],
    declared: { deposits: R(7000), withdrawals: R(900), balance: 0 },
    comprovabet: { file: "comprovabet-anual.pdf", cpf: "other_person" },
    events: [{ kind: "flag", docStatus: "cpf_mismatch", reasons: ["cpf_mismatch"], message: CPF_MISMATCH_MESSAGE }],
    note: "O documento enviado está em nome de outra pessoa (nome e dígitos do CPF diferentes). Pedido o ComprovaBet do próprio titular.",
  },
  {
    protocol: "DEMO-100002",
    name: "Bruno Fictício Lima",
    cpfBase: "000000002",
    email: "bruno.ficticio@example.com",
    whatsapp: "21900000002",
    daysAgo: 3,
    betType: "casino",
    casinoGames: ["slots", "crash"],
    period: "over_12m",
    situations: ["losses", "withdrawal_not_done"],
    platforms: [
      { slug: "bet365", name: "Bet365" },
      { slug: "kto", name: "KTO" },
    ],
    declared: { deposits: R(42000), withdrawals: R(12000), balance: 0 },
    comprovabet: { file: `comprovabet_${YEAR}.pdf`, cpf: "full" },
    events: [{ kind: "approve" }],
  },
  {
    protocol: "DEMO-100009",
    name: "Íris Teste Moura",
    cpfBase: "000000009",
    email: "iris.teste@example.com",
    whatsapp: "91900000009",
    daysAgo: 4,
    betType: "sports",
    sportsKind: "multiple",
    period: "over_12m",
    situations: ["losses"],
    platforms: [{ slug: "superbet", name: "Superbet" }],
    declared: { deposits: R(16000), withdrawals: R(4000), balance: 0 },
    comprovabet: { file: `comprovabet-${YEAR}-iris.pdf`, cpf: "full" },
    events: [{ kind: "approve" }, { kind: "terms" }, { kind: "inform_paid" }],
  },
  {
    protocol: "DEMO-100003",
    name: "Carla Modelo Dias",
    cpfBase: "000000003",
    email: "carla.modelo@example.com",
    whatsapp: "31900000003",
    daysAgo: 5,
    betType: "both",
    mainLossArea: "casino",
    period: "from_3_to_6m",
    situations: ["losses", "account_blocked"],
    platforms: [{ slug: "superbet", name: "Superbet" }],
    declared: { deposits: R(9000), withdrawals: R(1000), balance: R(300) },
    comprovabet: { file: "comprovabet-carla.pdf", cpf: "full", year: YEAR - 1 },
    events: [
      {
        kind: "flag",
        docStatus: "complement_required",
        reasons: ["wrong_period"],
        message: `O documento enviado é referente a ${YEAR - 1}. Envie o ComprovaBet anual de ${YEAR}, emitido no seu CPF.`,
      },
    ],
  },
  {
    protocol: "DEMO-100010",
    name: "João Amostra Pires",
    cpfBase: "000000010",
    email: "joao.amostra@example.com",
    whatsapp: "48900000010",
    daysAgo: 6,
    betType: "sports",
    sportsKind: "live",
    period: "from_6_to_12m",
    situations: ["losses", "limit_or_closure"],
    platforms: [{ slug: "sportingbet", name: "Sportingbet" }],
    declared: { deposits: R(8800), withdrawals: R(1200), balance: 0 },
    comprovabet: { file: `comprovabet-${YEAR}.pdf`, cpf: "masked" },
    events: TO_PAYMENT,
  },
  {
    protocol: "DEMO-100004",
    name: "Diego Teste Rocha",
    cpfBase: "000000004",
    email: "diego.teste@example.com",
    whatsapp: "41900000004",
    daysAgo: 9,
    betType: "sports",
    sportsKind: "multiple",
    period: "over_12m",
    situations: ["losses", "limit_or_closure"],
    platforms: [
      { slug: "betnacional", name: "Betnacional" },
      { slug: "sportingbet", name: "Sportingbet" },
    ],
    declared: { deposits: R(26000), withdrawals: R(4000), balance: 0 },
    comprovabet: { file: `comprovabet-${YEAR}-diego.pdf`, cpf: "full" },
    events: [
      ...TO_PAYMENT,
      { kind: "start" },
      {
        kind: "complement",
        reasons: ["missing_withdrawals"],
        message: `Envie o histórico de saques de ${YEAR} da Betnacional e da Sportingbet.`,
        files: [
          { platform: "Betnacional", deposits: R(15500), withdrawals: R(2500), balance: 0, name: "betnacional-financeiro.csv" },
          { platform: "Sportingbet", deposits: R(9800), withdrawals: R(1500), balance: 0, name: "sportingbet-financeiro.csv" },
        ],
      },
    ],
    note: "Declarado acima do identificado. Conferir se há outra conta ou período fora do arquivo.",
  },
  {
    protocol: "DEMO-100005",
    name: "Eva Amostra Nunes",
    cpfBase: "000000005",
    email: "eva.amostra@example.com",
    whatsapp: "51900000005",
    daysAgo: 11,
    betType: "casino",
    casinoGames: ["roulette"],
    period: "up_to_3m",
    situations: ["bonus_issue"],
    platforms: [{ slug: "plataforma-exemplo", name: "Plataforma Exemplo", custom: true }],
    declared: { deposits: R(1800), withdrawals: R(1500), balance: 0 },
    comprovabet: { file: `comprovabet-${YEAR}-eva.pdf`, cpf: "full" },
    events: [...TO_PAYMENT, { kind: "start" }, { kind: "finish", to: "not_eligible", message: "Análise documental concluída." }],
    confirmIdentified: true,
  },
  {
    protocol: "DEMO-100006",
    name: "Fábio Demonstração Alves",
    cpfBase: "000000006",
    email: "fabio.demo@example.com",
    whatsapp: "61900000006",
    daysAgo: 14,
    betType: "both",
    mainLossArea: "similar",
    period: "from_6_to_12m",
    situations: ["losses"],
    platforms: [{ slug: "betano", name: "Betano" }],
    declared: { deposits: R(15000), withdrawals: R(3000), balance: 0 },
    comprovabet: { file: `comprovabet-${YEAR}-fabio.pdf`, cpf: "full" },
    events: [
      ...TO_PAYMENT,
      { kind: "start" },
      { kind: "finish", to: "eligible" },
      { kind: "finish", to: "completed", message: "Análise documental concluída." },
    ],
    confirmIdentified: true,
    validated: R(11500),
    nextSteps: "Análise concluída. Os próximos passos foram enviados ao seu e-mail.",
  },
  {
    // Caso anterior ao ComprovaBet: sem CPF, sem pagamento da análise e com os arquivos das plataformas.
    protocol: "DEMO-100011",
    name: "Lia Anterior Prado",
    cpfBase: null,
    email: "lia.anterior@example.com",
    whatsapp: "27900000011",
    daysAgo: 10,
    betType: "sports",
    sportsKind: "live",
    period: "over_12m",
    situations: ["losses"],
    platforms: [{ slug: "betano", name: "Betano" }],
    declared: { deposits: R(9500), withdrawals: R(2000), balance: 0 },
    comprovabet: null,
    legacyDocs: [{ platform: "Betano", deposits: R(9300), withdrawals: R(2000), balance: 0, name: "betano-historico-financeiro.csv" }],
    events: [],
    legacyFlow: ["under_review"],
  },
];

async function wipeDemoData() {
  const storage = await getStorage();
  const docs = await prisma.document.findMany({ where: { isDemo: true }, select: { storageKey: true } });
  for (const d of docs) await storage.remove(d.storageKey).catch(() => undefined);
  await prisma.case.deleteMany({ where: { isDemo: true } });
  await prisma.caseDraft.deleteMany({ where: { isDemo: true } });
  await prisma.document.deleteMany({ where: { isDemo: true } });
  await prisma.user.deleteMany({ where: { isDemo: true } });
  await prisma.adminSession.deleteMany({ where: { admin: { isDemo: true } } });
}

async function main() {
  if (!config.demoMode || config.isProduction) {
    console.error("O seed de demonstração só roda com DEMO_MODE=true e fora de produção.");
    process.exit(1);
  }
  console.log("Limpando dados de demonstração anteriores…");
  await wipeDemoData();

  for (const p of PLATFORMS) {
    await prisma.bettingPlatform.upsert({ where: { slug: p.slug }, update: { name: p.name }, create: { slug: p.slug, name: p.name } });
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const lead = await prisma.adminUser.upsert({
    where: { email: "demo@example.com" },
    update: { passwordHash, isActive: true, isDemo: true, name: "Equipe Demonstração", role: "admin" },
    create: { email: "demo@example.com", name: "Equipe Demonstração", passwordHash, role: "admin", isDemo: true },
  });
  const analyst = await prisma.adminUser.upsert({
    where: { email: "analista.demo@example.com" },
    update: { passwordHash, isActive: true, isDemo: true, name: "Analista Demonstração", role: "analyst" },
    create: { email: "analista.demo@example.com", name: "Analista Demonstração", passwordHash, role: "analyst", isDemo: true },
  });

  const storage = await getStorage();
  const now = Date.now();

  const saveCsv = async (caseId: string, platformId: string | null, doc: CsvDoc, createdAt: Date, requestId: string | null = null) => {
    // Apostas, bônus e saques recusados entram no arquivo, mas não devem ser somados pela leitura.
    const noise: Movement[] = [
      { day: 200, type: "Aposta", cents: R(150) },
      { day: 180, type: "Bônus", cents: R(50) },
      { day: 90, type: "Saque", cents: R(700), status: "Recusado" },
    ];
    const movements = [...spread(doc.deposits, 6, "Depósito PIX", 355), ...spread(doc.withdrawals, 3, "Saque PIX", 340), ...noise];
    const body = csvFor(movements, createdAt, doc.balance);
    const storageKey = `documents/demo/${randomUUID()}.csv`;
    await storage.put(storageKey, body, "text/csv");
    await prisma.document.create({
      data: {
        caseId,
        requestId,
        platformId,
        platformName: doc.platform,
        category: "financial_history",
        originalName: doc.name,
        storageKey,
        mimeType: "text/csv",
        sizeBytes: body.length,
        sha256: sha256Hex(body),
        isDemo: true,
        createdAt,
      },
    });
  };

  for (const [index, demo] of CASES.entries()) {
    const createdAt = new Date(now - demo.daysAgo * DAY - (index + 1) * HOUR);
    const cpf = demo.cpfBase ? demoCpf(demo.cpfBase) : null;
    const legacy = demo.comprovabet === null;
    const user = await prisma.user.create({
      data: { fullName: demo.name, cpf, email: demo.email, whatsapp: demo.whatsapp, isAdult: true, isDemo: true, createdAt },
    });
    const platformIds = new Map<string, string>();
    for (const p of demo.platforms) {
      const row = await prisma.bettingPlatform.upsert({
        where: { slug: p.slug },
        update: {},
        create: { slug: p.slug, name: p.name, isCustom: Boolean(p.custom) },
      });
      platformIds.set(p.name, row.id);
    }
    const { deposits, withdrawals, balance } = demo.declared;
    const raw = deposits - withdrawals - balance;
    const hasFlow = demo.events.length > 0 || Boolean(demo.legacyFlow?.length);
    const reviewerId = index % 2 ? analyst.id : lead.id;
    const c = await prisma.case.create({
      data: {
        protocol: demo.protocol,
        userId: user.id,
        betType: demo.betType,
        sportsBetKind: demo.sportsKind ?? null,
        casinoGames: demo.casinoGames ?? [],
        mainLossArea: demo.mainLossArea ?? null,
        period: demo.period,
        situations: demo.situations,
        declaredDeposits: centsToDecimal(deposits),
        declaredWithdrawals: centsToDecimal(withdrawals),
        declaredBalance: centsToDecimal(balance),
        declaredLoss: centsToDecimal(Math.max(0, raw)),
        declaredNeedsReview: raw < 0,
        status: "documents_received",
        paymentStatus: legacy ? "not_applicable" : "pending",
        assignedAdminId: hasFlow ? reviewerId : null,
        nextSteps: demo.nextSteps ?? null,
        privacyConsentAt: createdAt,
        privacyConsentIp: "203.0.113.10",
        isDemo: true,
        createdAt,
        reviewDeadline: new Date(createdAt.getTime() + config.reviewDays * DAY),
        platforms: { create: [...platformIds.values()].map((platformId) => ({ platformId })) },
        declarations: {
          create: {
            deposits: centsToDecimal(deposits),
            withdrawals: centsToDecimal(withdrawals),
            hasBalance: balance > 0,
            balance: centsToDecimal(balance),
            rawResult: centsToDecimal(raw),
            calculatedLoss: centsToDecimal(Math.max(0, raw)),
            needsReview: raw < 0,
            createdAt,
          },
        },
        commitment: {
          create: {
            accepted: true,
            acceptedAt: createdAt,
            ip: "203.0.113.10",
            userAgent: "Mozilla/5.0 (demonstração)",
            textVersion: COMMITMENT_VERSION,
            text: commitmentText(config.reviewDays),
          },
        },
        statusHistory: {
          create: [
            { toStatus: "submitted", createdAt },
            { fromStatus: "submitted", toStatus: "documents_received", createdAt: new Date(createdAt.getTime() + 1000) },
          ],
        },
      },
    });

    // ComprovaBet (PDF fictício): a conferência do CPF passa pela mesma leitura usada nos envios reais.
    let comprovabetId: string | null = null;
    if (demo.comprovabet && cpf) {
      const spec = demo.comprovabet;
      const year = spec.year ?? YEAR;
      const cpfText =
        spec.cpf === "full"
          ? formatCpf(cpf)
          : spec.cpf === "masked"
            ? `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**`
            : "***.482.917-**";
      const body = comprovabetPdf({
        holder: spec.cpf === "other_person" ? "Marcos Exemplo Terceiro" : demo.name,
        cpfText,
        year,
        platform: demo.platforms.map((p) => p.name).join(", "),
        deposits: Math.round(deposits * 0.97),
        withdrawals,
        balance,
      });
      const check = await inspectComprovaBet({ buffer: body, kind: "pdf", cpf, referenceYear: YEAR });
      if (check.cpfCheck === "mismatch") throw new Error(`${demo.protocol}: o PDF de demonstração não deveria divergir na leitura.`);
      const storageKey = `documents/demo/${randomUUID()}.pdf`;
      await storage.put(storageKey, body, "application/pdf");
      const doc = await prisma.document.create({
        data: {
          caseId: c.id,
          category: "comprovabet",
          originalName: spec.file,
          storageKey,
          mimeType: "application/pdf",
          sizeBytes: body.length,
          sha256: sha256Hex(body),
          referenceYear: YEAR,
          ...checkToDocumentData(check),
          cpfCheckedAt: createdAt,
          isDemo: true,
          createdAt,
        },
      });
      comprovabetId = doc.id;
    }
    for (const doc of demo.legacyDocs ?? []) await saveCsv(c.id, platformIds.get(doc.platform) ?? null, doc, createdAt);

    // Etapas seguintes, espaçadas entre o envio e agora (mesmas regras das ações do painel e do cliente).
    let status: CaseStatus = "documents_received";
    const steps = demo.events.length + (demo.legacyFlow?.length ?? 0);
    const times = Array.from({ length: steps }, (_, i) => {
      const start = createdAt.getTime() + 2 * HOUR;
      const end = now - 10 * 60_000;
      return new Date(start + ((end - start) * (i + 1)) / (steps + 1));
    });
    const move = async (to: CaseStatus, at: Date, publicMessage: string | null = null, changedById: string | null = reviewerId) => {
      await prisma.statusHistory.create({ data: { caseId: c.id, fromStatus: status, toStatus: to, changedById, publicMessage, createdAt: at } });
      status = to;
    };
    let paymentN = 0;
    for (const [i, event] of demo.events.entries()) {
      const at = times[i] ?? new Date(now - 60_000);
      switch (event.kind) {
        case "approve": {
          if (!comprovabetId) break;
          const current = await prisma.document.findUniqueOrThrow({ where: { id: comprovabetId }, select: { cpfCheck: true } });
          const manual = current.cpfCheck !== "match";
          await prisma.document.update({
            where: { id: comprovabetId },
            data: {
              status: "valid",
              reviewedAt: at,
              reviewedById: reviewerId,
              ...(manual ? { cpfCheck: "manual_match" as const, cpfCheckNote: "CPF conferido manualmente pela equipe (demonstração).", cpfCheckedAt: at } : {}),
            },
          });
          await prisma.caseReview.create({ data: { caseId: c.id, adminId: reviewerId, action: "document:valid", comment: comprovabetId, createdAt: at } });
          await move("awaiting_payment", at);
          break;
        }
        case "flag": {
          await prisma.documentRequest.create({
            data: { caseId: c.id, reasons: event.reasons, message: event.message, requestedById: reviewerId, createdAt: at },
          });
          if (comprovabetId) {
            await prisma.document.update({
              where: { id: comprovabetId },
              data: {
                status: event.docStatus,
                reviewedAt: at,
                reviewedById: reviewerId,
                ...(event.docStatus === "cpf_mismatch"
                  ? { cpfCheck: "mismatch" as const, cpfCheckNote: "CPF divergente marcado pela equipe (demonstração).", cpfCheckedAt: at }
                  : {}),
              },
            });
          }
          await prisma.caseReview.create({ data: { caseId: c.id, adminId: reviewerId, action: `document:${event.docStatus}`, comment: event.reasons.join(", "), createdAt: at } });
          await move("additional_documents", at);
          break;
        }
        case "terms":
          await prisma.serviceAgreement.create({
            data: {
              caseId: c.id,
              accepted: true,
              acceptedAt: at,
              termsVersion: SERVICE_TERMS_VERSION,
              text: `Importante: ${PAYMENT_NOTICE}\n\n${SERVICE_TERMS_CHECKBOX}`,
              ip: "203.0.113.10",
              userAgent: "Mozilla/5.0 (demonstração)",
              createdAt: at,
            },
          });
          break;
        case "inform_paid":
          await prisma.case.update({ where: { id: c.id }, data: { paymentStatus: "awaiting_confirmation" } });
          break;
        case "confirm_payment":
          paymentN = index + 1;
          await prisma.case.update({
            where: { id: c.id },
            data: {
              paymentStatus: "confirmed",
              paymentConfirmedAt: at,
              paymentConfirmedById: lead.id,
              paymentReference: `PIX-DEMO-${String(paymentN).padStart(4, "0")}`,
              reviewDeadline: new Date(at.getTime() + config.reviewDays * DAY),
            },
          });
          await prisma.caseReview.create({ data: { caseId: c.id, adminId: lead.id, action: "payment:confirmed", createdAt: at } });
          await move("payment_confirmed", at, null, lead.id);
          break;
        case "start":
          await move("under_review", at);
          break;
        case "complement": {
          // Pedido durante a análise → o cliente envia os arquivos → a análise continua.
          const request = await prisma.documentRequest.create({
            data: { caseId: c.id, reasons: event.reasons, message: event.message, requestedById: reviewerId, createdAt: at },
          });
          await move("additional_documents", at);
          const sentAt = new Date(at.getTime() + Math.min(6 * HOUR, (now - at.getTime()) / 2));
          for (const file of event.files) await saveCsv(c.id, platformIds.get(file.platform) ?? null, file, sentAt, request.id);
          await prisma.documentRequest.update({ where: { id: request.id }, data: { status: "fulfilled", fulfilledAt: sentAt } });
          await move("under_review", sentAt, "Documentos complementares recebidos.", null);
          break;
        }
        case "finish":
          await move(event.to, at, event.message ?? null);
          break;
      }
    }
    for (const [i, to] of (demo.legacyFlow ?? []).entries()) await move(to, times[demo.events.length + i] ?? new Date(now - 60_000));

    await prisma.case.update({
      where: { id: c.id },
      data: {
        status,
        ...(demo.validated !== undefined ? { validatedLoss: centsToDecimal(demo.validated) } : {}),
      },
    });
    await processCaseDocuments(c.id);
    if (demo.confirmIdentified) {
      // Valores conferidos pela equipe a partir do ComprovaBet (mesmos números do PDF fictício).
      const idDeposits = Math.round(deposits * 0.97);
      await prisma.case.update({
        where: { id: c.id },
        data: {
          identifiedDeposits: centsToDecimal(idDeposits),
          identifiedWithdrawals: centsToDecimal(withdrawals),
          identifiedBalance: centsToDecimal(balance),
          identifiedLoss: centsToDecimal(Math.max(0, idDeposits - withdrawals - balance)),
          identifiedSource: "manual",
        },
      });
    }
    if (demo.note) await prisma.caseNote.create({ data: { caseId: c.id, adminId: lead.id, content: demo.note } });
    const final = await prisma.case.findUniqueOrThrow({ where: { id: c.id }, select: { status: true, paymentStatus: true } });
    console.log(`  ${demo.protocol}  ${final.status.padEnd(20)} ${final.paymentStatus.padEnd(22)} ${demo.email}`);
  }

  console.log("\nDados de demonstração criados (fictícios).");
  console.log(`Painel: /admin/login  ·  demo@example.com  ·  senha: ${DEMO_PASSWORD}`);
  console.log("Acompanhamento: /acompanhar  ·  use um protocolo acima com o e-mail correspondente.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

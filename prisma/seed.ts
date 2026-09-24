// Dados FICTÍCIOS de demonstração. Só roda com DEMO_MODE=true e fora de produção.
// Todos os registros criados aqui são marcados com is_demo = true e nunca se misturam com dados reais.
import "../scripts/load-env";
import { randomUUID } from "node:crypto";
import type { CaseStatus } from "@prisma/client";
import { prisma } from "../src/lib/db";
import { config } from "../src/lib/env";
import { processCaseDocuments } from "../src/lib/extraction/process";
import { centsToDecimal, formatAmount } from "../src/lib/format";
import { COMMITMENT_VERSION, PLATFORMS, commitmentText } from "../src/lib/options";
import { hashPassword, sha256Hex } from "../src/lib/security";
import { getStorage } from "../src/lib/storage";

const DAY = 86_400_000;
const DEMO_PASSWORD = process.env.DEMO_ADMIN_PASSWORD || "demonstracao-2026";

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
  return Buffer.from(`\uFEFF${lines.join("\n")}\n`, "utf8");
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

type DemoCase = {
  protocol: string;
  name: string;
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
  docs: { platform: string; deposits: number; withdrawals: number; balance: number; name: string }[];
  flow: ("under_review" | "additional_documents" | "eligible" | "not_eligible" | "completed")[];
  confirmIdentified?: boolean;
  validated?: number;
  nextSteps?: string;
  request?: { reasons: string[]; message: string };
  note?: string;
};

const R = (reais: number) => reais * 100;

const CASES: DemoCase[] = [
  {
    protocol: "DEMO-100001",
    name: "Ana Exemplo Souza",
    email: "ana.exemplo@example.com",
    whatsapp: "11900000001",
    daysAgo: 1,
    betType: "sports",
    sportsKind: "live",
    period: "from_6_to_12m",
    situations: ["losses"],
    platforms: [{ slug: "betano", name: "Betano" }],
    declared: { deposits: R(12000), withdrawals: R(2500), balance: 0 },
    docs: [{ platform: "Betano", deposits: R(11800), withdrawals: R(2500), balance: 0, name: "betano-historico-financeiro.csv" }],
    flow: [],
  },
  {
    protocol: "DEMO-100002",
    name: "Bruno Fictício Lima",
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
    docs: [
      { platform: "Bet365", deposits: R(18000), withdrawals: R(5000), balance: 0, name: "bet365-depositos-saques.csv" },
      { platform: "KTO", deposits: R(8500), withdrawals: R(3000), balance: 0, name: "kto-extrato.csv" },
    ],
    flow: ["under_review"],
    note: "Declarado acima do identificado. Conferir se há outra conta ou período fora do arquivo.",
  },
  {
    protocol: "DEMO-100003",
    name: "Carla Modelo Dias",
    email: "carla.modelo@example.com",
    whatsapp: "31900000003",
    daysAgo: 5,
    betType: "both",
    mainLossArea: "casino",
    period: "from_3_to_6m",
    situations: ["losses", "account_blocked"],
    platforms: [{ slug: "superbet", name: "Superbet" }],
    declared: { deposits: R(9000), withdrawals: R(1000), balance: R(300) },
    docs: [{ platform: "Superbet", deposits: R(5200), withdrawals: 0, balance: R(300), name: "superbet-depositos.csv" }],
    flow: ["under_review", "additional_documents"],
    request: { reasons: ["missing_withdrawals", "incomplete_history"], message: "Envie também o histórico de saques dos últimos 12 meses." },
  },
  {
    protocol: "DEMO-100004",
    name: "Diego Teste Rocha",
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
    docs: [
      { platform: "Betnacional", deposits: R(15500), withdrawals: R(2500), balance: 0, name: "betnacional-financeiro.csv" },
      { platform: "Sportingbet", deposits: R(9800), withdrawals: R(1500), balance: 0, name: "sportingbet-financeiro.csv" },
    ],
    flow: ["under_review", "eligible"],
    confirmIdentified: true,
    validated: R(21300),
    nextSteps: "Nossa equipe entrará em contato pelo WhatsApp em até 2 dias úteis para explicar as próximas etapas.",
  },
  {
    protocol: "DEMO-100005",
    name: "Eva Amostra Nunes",
    email: "eva.amostra@example.com",
    whatsapp: "51900000005",
    daysAgo: 11,
    betType: "casino",
    casinoGames: ["roulette"],
    period: "up_to_3m",
    situations: ["bonus_issue"],
    platforms: [{ slug: "plataforma-exemplo", name: "Plataforma Exemplo", custom: true }],
    declared: { deposits: R(1800), withdrawals: R(1500), balance: 0 },
    docs: [{ platform: "Plataforma Exemplo", deposits: R(1800), withdrawals: R(1500), balance: 0, name: "historico.csv" }],
    flow: ["under_review", "not_eligible"],
    confirmIdentified: true,
  },
  {
    protocol: "DEMO-100006",
    name: "Fábio Demonstração Alves",
    email: "fabio.demo@example.com",
    whatsapp: "61900000006",
    daysAgo: 14,
    betType: "both",
    mainLossArea: "similar",
    period: "from_6_to_12m",
    situations: ["losses"],
    platforms: [{ slug: "betano", name: "Betano" }],
    declared: { deposits: R(15000), withdrawals: R(3000), balance: 0 },
    docs: [{ platform: "Betano", deposits: R(14700), withdrawals: R(3000), balance: 0, name: "betano-relatorio.csv" }],
    flow: ["under_review", "eligible", "completed"],
    confirmIdentified: true,
    validated: R(11700),
    nextSteps: "Análise concluída. Os próximos passos foram enviados ao seu e-mail.",
  },
  {
    protocol: "DEMO-100007",
    name: "Gabi Exemplar Costa",
    email: "gabi.exemplar@example.com",
    whatsapp: "71900000007",
    daysAgo: 0,
    betType: "sports",
    sportsKind: "pre_game",
    period: "from_3_to_6m",
    situations: ["unrecognized_transaction"],
    platforms: [{ slug: "kto", name: "KTO" }],
    declared: { deposits: R(4000), withdrawals: R(500), balance: 0 },
    docs: [{ platform: "KTO", deposits: R(4000), withdrawals: R(500), balance: 0, name: "kto-depositos.csv" }],
    flow: [],
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

  for (const [index, demo] of CASES.entries()) {
    const createdAt = new Date(now - demo.daysAgo * DAY - (index + 1) * 3_600_000);
    const user = await prisma.user.create({
      data: { fullName: demo.name, email: demo.email, whatsapp: demo.whatsapp, isAdult: true, isDemo: true, createdAt },
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
        assignedAdminId: demo.flow.length ? (index % 2 ? analyst.id : lead.id) : null,
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

    for (const doc of demo.docs) {
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
          caseId: c.id,
          platformId: platformIds.get(doc.platform) ?? null,
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
    }
    await processCaseDocuments(c.id);

    let current: CaseStatus = "documents_received";
    let at = createdAt.getTime() + 2 * 3_600_000;
    for (const step of demo.flow) {
      at += Math.max(3_600_000, (demo.daysAgo * DAY) / (demo.flow.length + 1));
      const when = new Date(Math.min(at, now - 60_000));
      const changedById = index % 2 ? analyst.id : lead.id;
      if (step === "additional_documents" && demo.request) {
        await prisma.documentRequest.create({
          data: { caseId: c.id, reasons: demo.request.reasons, message: demo.request.message, requestedById: changedById, createdAt: when },
        });
      }
      await prisma.statusHistory.create({
        data: {
          caseId: c.id,
          fromStatus: current,
          toStatus: step,
          changedById,
          publicMessage: step === "completed" ? "Análise documental concluída." : null,
          createdAt: when,
        },
      });
      current = step;
    }
    await prisma.case.update({
      where: { id: c.id },
      data: {
        status: current,
        ...(demo.confirmIdentified ? { identifiedSource: "manual" } : {}),
        ...(demo.validated !== undefined ? { validatedLoss: centsToDecimal(demo.validated) } : {}),
      },
    });
    if (demo.confirmIdentified) {
      await prisma.document.updateMany({ where: { caseId: c.id }, data: { status: "valid", reviewedAt: new Date(), reviewedById: lead.id } });
    }
    if (demo.note) await prisma.caseNote.create({ data: { caseId: c.id, adminId: lead.id, content: demo.note } });
    console.log(`  ${demo.protocol}  ${current.padEnd(22)} ${demo.email}`);
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

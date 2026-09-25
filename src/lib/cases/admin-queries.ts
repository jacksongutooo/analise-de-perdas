import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { config } from "@/lib/env";
import { centsToDecimal, decimalToCents, parseMoneyToCents } from "@/lib/format";
import { BET_TYPE_VALUES, type BetTypeValue } from "@/lib/options";
import { STATUS_GROUPS, isCaseStatus, type CaseStatusValue, type StatusGroup } from "@/lib/status";

export const PAGE_SIZE = 20;

export type CaseFilters = {
  q: string;
  status: string;
  paymentStatus: string;
  type: string;
  platform: string;
  admin: string;
  from: string;
  to: string;
  min: string;
  max: string;
  page: number;
};

export function parseCaseFilters(sp: Record<string, string | string[] | undefined>): CaseFilters {
  const get = (key: string) => {
    const v = sp[key];
    return ((Array.isArray(v) ? v[0] : v) ?? "").trim().slice(0, 100);
  };
  return {
    q: get("q"),
    status: get("status"),
    paymentStatus: get("paymentStatus"),
    type: get("type"),
    platform: get("platform"),
    admin: get("admin"),
    from: get("from"),
    to: get("to"),
    min: get("min"),
    max: get("max"),
    page: Math.max(1, Number.parseInt(get("page") || "1", 10) || 1),
  };
}

function dateInput(value: string, endOfDay: boolean): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}-03:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Filtro base: dados de demonstração e reais nunca aparecem juntos. */
export const demoScope = () => ({ isDemo: config.demoMode });

export function buildCaseWhere(f: CaseFilters): Prisma.CaseWhereInput {
  const and: Prisma.CaseWhereInput[] = [demoScope()];
  if (isCaseStatus(f.status)) and.push({ status: f.status });
  else if (f.status.startsWith("group:")) {
    const group = f.status.slice(6) as StatusGroup;
    if (group in STATUS_GROUPS) and.push({ status: { in: [...STATUS_GROUPS[group]] as CaseStatusValue[] } });
  }
  if (["pending", "paid", "failed", "refunded"].includes(f.paymentStatus)) {
    and.push({ payment: { is: { status: f.paymentStatus as "pending" | "paid" | "failed" | "refunded" } } });
  }
  if ((BET_TYPE_VALUES as readonly string[]).includes(f.type)) and.push({ betType: f.type as BetTypeValue });
  if (f.platform) and.push({ platforms: { some: { platformId: f.platform } } });
  if (f.admin === "none") and.push({ assignedAdminId: null });
  else if (f.admin) and.push({ assignedAdminId: f.admin });
  const from = dateInput(f.from, false);
  const to = dateInput(f.to, true);
  if (from || to) and.push({ createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } });
  const min = parseMoneyToCents(f.min);
  const max = parseMoneyToCents(f.max);
  if (min !== null || max !== null) {
    and.push({
      declaredLoss: {
        ...(min !== null ? { gte: centsToDecimal(min) } : {}),
        ...(max !== null ? { lte: centsToDecimal(max) } : {}),
      },
    });
  }
  if (f.q) {
    and.push({
      OR: [
        { protocol: { contains: f.q, mode: "insensitive" } },
        { user: { fullName: { contains: f.q, mode: "insensitive" } } },
        { user: { email: { contains: f.q, mode: "insensitive" } } },
      ],
    });
  }
  return { AND: and };
}

export async function listCases(f: CaseFilters) {
  const where = buildCaseWhere(f);
  const [total, rows] = await Promise.all([
    prisma.case.count({ where }),
    prisma.case.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (f.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        protocol: true,
        createdAt: true,
        betType: true,
        status: true,
        declaredLoss: true,
        identifiedLoss: true,
        identifiedSource: true,
        payment: { select: { status: true } },
        user: { select: { fullName: true } },
        assignedAdmin: { select: { name: true } },
        platforms: { select: { platform: { select: { name: true } } } },
      },
    }),
  ]);
  return {
    total,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    rows: rows.map((r) => ({
      id: r.id,
      protocol: r.protocol,
      createdAt: r.createdAt,
      betType: r.betType as BetTypeValue,
      status: r.status as CaseStatusValue,
      name: r.user.fullName,
      platforms: r.platforms.map((p) => p.platform.name),
      declaredLossCents: decimalToCents(r.declaredLoss) ?? 0,
      identifiedLossCents: decimalToCents(r.identifiedLoss),
      identifiedSource: r.identifiedSource,
      paymentStatus: r.payment?.status ?? null,
      assignee: r.assignedAdmin?.name ?? null,
    })),
  };
}

export async function getFilterOptions() {
  const [platforms, admins] = await Promise.all([
    prisma.bettingPlatform.findMany({
      where: { OR: [{ isCustom: false }, { cases: { some: { case: demoScope() } } }] },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.adminUser.findMany({
      where: { isActive: true, ...(config.demoMode ? {} : { isDemo: false }) },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  return { platforms, admins };
}

export async function getDashboard() {
  const where = demoScope();
  const [byStatus, totals, byType, platformCounts, recent] = await Promise.all([
    prisma.case.groupBy({ by: ["status"], where, _count: { _all: true } }),
    prisma.case.aggregate({ where, _sum: { declaredLoss: true, identifiedLoss: true }, _avg: { declaredLoss: true }, _count: { _all: true } }),
    prisma.case.groupBy({ by: ["betType"], where, _count: { _all: true } }),
    prisma.casePlatform.groupBy({
      by: ["platformId"],
      where: { case: where },
      _count: { platformId: true },
      orderBy: { _count: { platformId: "desc" } },
      take: 8,
    }),
    prisma.case.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, protocol: true, createdAt: true, status: true, declaredLoss: true, user: { select: { fullName: true } } },
    }),
  ]);

  const statusCount = (statuses: readonly string[]) =>
    byStatus.filter((s) => statuses.includes(s.status)).reduce((acc, s) => acc + s._count._all, 0);
  const platformNames = await prisma.bettingPlatform.findMany({
    where: { id: { in: platformCounts.map((p) => p.platformId) } },
    select: { id: true, name: true },
  });
  const total = totals._count._all;
  const typeCount = (t: BetTypeValue) => byType.find((b) => b.betType === t)?._count._all ?? 0;

  return {
    total,
    groups: {
      new: statusCount(STATUS_GROUPS.new),
      review: statusCount(STATUS_GROUPS.review),
      waiting: statusCount(STATUS_GROUPS.waiting),
      done: statusCount(STATUS_GROUPS.done),
    },
    declaredTotalCents: decimalToCents(totals._sum.declaredLoss) ?? 0,
    identifiedTotalCents: decimalToCents(totals._sum.identifiedLoss) ?? 0,
    declaredAverageCents: decimalToCents(totals._avg.declaredLoss) ?? 0,
    types: BET_TYPE_VALUES.map((t) => ({ type: t, count: typeCount(t), share: total ? typeCount(t) / total : 0 })),
    platforms: platformCounts.map((p) => ({
      id: p.platformId,
      name: platformNames.find((n) => n.id === p.platformId)?.name ?? "—",
      count: p._count.platformId,
    })),
    recent: recent.map((r) => ({
      id: r.id,
      protocol: r.protocol,
      createdAt: r.createdAt,
      status: r.status as CaseStatusValue,
      name: r.user.fullName,
      declaredLossCents: decimalToCents(r.declaredLoss) ?? 0,
    })),
  };
}

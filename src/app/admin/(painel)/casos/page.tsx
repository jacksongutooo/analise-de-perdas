import Link from "next/link";
import { IconSearch } from "@/components/icons";
import { Badge, LinkButton, Notice, Select, TextInput, buttonClasses } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/admin";
import { getFilterOptions, listCases, parseCaseFilters, type CaseFilters } from "@/lib/cases/admin-queries";
import { formatBRL, formatDate } from "@/lib/format";
import { BET_TYPES, BET_TYPE_SHORT } from "@/lib/options";
import { CASE_STATUS_LABEL, CASE_STATUS_TONE, CASE_STATUS_VALUES } from "@/lib/status";

const GROUP_OPTIONS = [
  { value: "group:new", label: "Novas solicitações" },
  { value: "group:review", label: "Em análise" },
  { value: "group:waiting", label: "Aguardando documentos" },
  { value: "group:done", label: "Concluídas" },
];

function pageHref(f: CaseFilters, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(f)) if (key !== "page" && value) params.set(key, String(value));
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return `/admin/casos${qs ? `?${qs}` : ""}`;
}

function IdentifiedValue({ cents, source }: { cents: number | null; source: string | null }) {
  if (cents === null) return <span className="text-muted">—</span>;
  return (
    <span>
      {formatBRL(cents)}
      {source === "auto" && <span className="block text-[0.7rem] font-normal text-warn-700">automático</span>}
    </span>
  );
}

export default async function CasosPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const filters = parseCaseFilters(sp);
  const deletedRaw = Array.isArray(sp.excluido) ? sp.excluido[0] : sp.excluido;
  const deleted = deletedRaw && /^(ANL|DEMO)-\d{6}$/.test(deletedRaw) ? deletedRaw : null;
  const [{ rows, total, pages }, options] = await Promise.all([listCases(filters), getFilterOptions()]);
  const advancedActive = [filters.type, filters.platform, filters.admin, filters.from, filters.to, filters.min, filters.max].filter(Boolean).length;

  return (
    <div className="space-y-5">
      {deleted && <Notice tone="ok">Caso {deleted} excluído definitivamente, com todos os documentos.</Notice>}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Casos</h1>
          <p className="text-sm text-muted">{total === 1 ? "1 caso encontrado" : `${total} casos encontrados`}</p>
        </div>
      </div>

      <form method="get" className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <IconSearch size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <TextInput name="q" defaultValue={filters.q} placeholder="Protocolo, nome ou e-mail" className="pl-10" aria-label="Buscar" />
          </div>
          <Select name="status" defaultValue={filters.status} aria-label="Status" className="sm:w-64">
            <option value="">Todos os status</option>
            <optgroup label="Grupos">
              {GROUP_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Status">
              {CASE_STATUS_VALUES.map((s) => (
                <option key={s} value={s}>
                  {CASE_STATUS_LABEL[s]}
                </option>
              ))}
            </optgroup>
          </Select>
          <button type="submit" className={buttonClasses("primary", "md", "sm:w-auto")}>
            Filtrar
          </button>
        </div>

        <details className="group mt-3" open={advancedActive > 0}>
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-lg px-1 py-1 text-sm font-medium text-navy-700 [&::-webkit-details-marker]:hidden">
            Mais filtros{advancedActive > 0 ? ` (${advancedActive})` : ""}
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm">
              <span className="text-muted">Tipo de aposta</span>
              <Select name="type" defaultValue={filters.type} className="mt-1">
                <option value="">Todos</option>
                {BET_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {BET_TYPE_SHORT[t.value]}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-sm">
              <span className="text-muted">Plataforma</span>
              <Select name="platform" defaultValue={filters.platform} className="mt-1">
                <option value="">Todas</option>
                {options.platforms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-sm">
              <span className="text-muted">Responsável</span>
              <Select name="admin" defaultValue={filters.admin} className="mt-1">
                <option value="">Todos</option>
                <option value="none">Sem responsável</option>
                {options.admins.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </label>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <label>
                <span className="text-muted">De</span>
                <TextInput type="date" name="from" defaultValue={filters.from} className="mt-1 px-2" />
              </label>
              <label>
                <span className="text-muted">Até</span>
                <TextInput type="date" name="to" defaultValue={filters.to} className="mt-1 px-2" />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm sm:col-span-2 lg:col-span-1">
              <label>
                <span className="text-muted">Valor declarado mín.</span>
                <TextInput name="min" inputMode="decimal" placeholder="0,00" defaultValue={filters.min} className="mt-1" />
              </label>
              <label>
                <span className="text-muted">máx.</span>
                <TextInput name="max" inputMode="decimal" placeholder="0,00" defaultValue={filters.max} className="mt-1" />
              </label>
            </div>
            <div className="flex items-end">
              <Link href="/admin/casos" className="px-1 py-2 text-sm font-medium text-muted hover:text-ink">
                Limpar filtros
              </Link>
            </div>
          </div>
        </details>
      </form>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-12 text-center text-sm text-muted">
          Nenhum caso encontrado com esses filtros.
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-line bg-surface shadow-soft lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-paper/60 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Protocolo</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Plataforma</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 text-right font-medium">Declarado</th>
                  <th className="px-4 py-3 text-right font-medium">Identificado</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Responsável</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-paper/60">
                    <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums">{r.protocol}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{formatDate(r.createdAt)}</td>
                    <td className="max-w-44 truncate px-4 py-3">{r.name}</td>
                    <td className="max-w-40 truncate px-4 py-3 text-ink-soft">{r.platforms.join(", ")}</td>
                    <td className="px-4 py-3 text-ink-soft">{BET_TYPE_SHORT[r.betType]}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatBRL(r.declaredLossCents)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                      <IdentifiedValue cents={r.identifiedLossCents} source={r.identifiedSource} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={CASE_STATUS_TONE[r.status]}>{CASE_STATUS_LABEL[r.status]}</Badge>
                    </td>
                    <td className="max-w-32 truncate px-4 py-3 text-ink-soft">{r.assignee ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <LinkButton href={`/admin/casos/${r.id}`} size="sm" variant="secondary">
                        Abrir caso
                      </LinkButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 lg:hidden">
            {rows.map((r) => (
              <li key={r.id} className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold tabular-nums">{r.protocol}</p>
                    <p className="truncate text-sm text-ink-soft">{r.name}</p>
                  </div>
                  <Badge tone={CASE_STATUS_TONE[r.status]}>{CASE_STATUS_LABEL[r.status]}</Badge>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted">Declarado</dt>
                    <dd className="tabular-nums">{formatBRL(r.declaredLossCents)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Identificado</dt>
                    <dd className="tabular-nums">
                      <IdentifiedValue cents={r.identifiedLossCents} source={r.identifiedSource} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Plataforma</dt>
                    <dd className="truncate">{r.platforms.join(", ")}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Tipo · Data</dt>
                    <dd>
                      {BET_TYPE_SHORT[r.betType]} · {formatDate(r.createdAt)}
                    </dd>
                  </div>
                </dl>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="truncate text-xs text-muted">Responsável: {r.assignee ?? "—"}</span>
                  <LinkButton href={`/admin/casos/${r.id}`} size="sm">
                    Abrir caso
                  </LinkButton>
                </div>
              </li>
            ))}
          </ul>

          {pages > 1 && (
            <nav className="flex items-center justify-between gap-3 text-sm" aria-label="Paginação">
              {filters.page > 1 ? (
                <Link href={pageHref(filters, filters.page - 1)} className={buttonClasses("secondary", "sm")}>
                  Anterior
                </Link>
              ) : (
                <span />
              )}
              <span className="text-muted">
                Página {filters.page} de {pages}
              </span>
              {filters.page < pages ? (
                <Link href={pageHref(filters, filters.page + 1)} className={buttonClasses("secondary", "sm")}>
                  Próxima
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}

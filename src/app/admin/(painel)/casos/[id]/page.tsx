import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { IconAlert, IconChevronLeft, IconEye, IconRefresh } from "@/components/icons";
import { MoneyField } from "@/components/MoneyInput";
import { SubmitButton } from "@/components/SubmitButton";
import { Badge, Notice, Select, Textarea, buttonClasses } from "@/components/ui";
import { logAccess } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/admin";
import { demoScope } from "@/lib/cases/admin-queries";
import { cx } from "@/lib/cx";
import { prisma } from "@/lib/db";
import { config } from "@/lib/env";
import type { ExtractionSummary } from "@/lib/extraction/process";
import { decimalToCents, formatBRL, formatBytes, formatDate, formatDateTime, formatPhoneBR } from "@/lib/format";
import {
  BET_TYPE_SUMMARY,
  CASINO_GAMES,
  DOC_CATEGORIES,
  MAIN_LOSS_AREAS,
  PERIODS,
  REQUEST_REASONS,
  SITUATIONS,
  SPORTS_KINDS,
  labelFor,
} from "@/lib/options";
import { clientIp, userAgent } from "@/lib/security";
import {
  ADMIN_SETTABLE_STATUSES,
  CASE_STATUS_LABEL,
  CASE_STATUS_TONE,
  DOCUMENT_STATUS_LABEL,
  DOCUMENT_STATUS_TONE,
  DOCUMENT_STATUS_VALUES,
  divergenceOf,
  type CaseStatusValue,
  type DocumentStatusValue,
} from "@/lib/status";
import {
  addNote,
  assignCase,
  clearValidated,
  confirmIdentified,
  deleteCase,
  recalcIdentified,
  reprocessDocument,
  requestDocuments,
  saveIdentified,
  saveNextSteps,
  saveValidated,
  setDocumentStatus,
  updateStatus,
} from "./actions";

export const dynamic = "force-dynamic";

const OK_MESSAGES: Record<string, string> = {
  status: "Status atualizado.",
  assign: "Responsável atualizado.",
  note: "Nota adicionada.",
  doc: "Documento atualizado.",
  reprocess: "Leitura automática refeita.",
  request: "Solicitação de documentos registrada. O cliente verá o pedido no acompanhamento.",
  identified: "Valor identificado salvo.",
  confirmed: "Valor identificado confirmado.",
  recalc: "Valor recalculado a partir dos documentos.",
  validated: "Valor validado salvo.",
  validated_clear: "Valor validado removido.",
  next: "Próximos passos salvos.",
};
const ERROR_MESSAGES: Record<string, string> = {
  status: "Status inválido.",
  assign: "Responsável inválido.",
  note: "Escreva o conteúdo da nota.",
  doc: "Documento não encontrado.",
  reasons: "Selecione ao menos um motivo.",
  reason_message: "Descreva o motivo “Outro” na mensagem.",
  value: "Informe um valor válido.",
  role: "Somente administradores podem excluir casos.",
  confirm: "O protocolo digitado não confere. Nada foi excluído.",
};

function Section({ id, title, children, aside }: { id: string; title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-line bg-surface p-5 shadow-soft">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-soft">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{children}</dd>
    </div>
  );
}

function ValueCard({ label, value, note, highlight }: { label: string; value: ReactNode; note?: ReactNode; highlight?: boolean }) {
  return (
    <div className={cx("rounded-xl border p-4", highlight ? "border-navy-900 bg-navy-50" : "border-line bg-paper/50")}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums text-ink">{value}</p>
      {note && <div className="mt-1.5 text-xs text-muted">{note}</div>}
    </div>
  );
}

const categoryLabel = (value: string) => DOC_CATEGORIES.find((c) => c.value === value)?.label ?? value;

export default async function CasePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erro?: string; solicitar?: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;

  const c = await prisma.case.findFirst({
    where: { id, ...demoScope() },
    include: {
      user: true,
      assignedAdmin: { select: { id: true, name: true } },
      platforms: { include: { platform: true } },
      declarations: { orderBy: { createdAt: "desc" }, take: 1 },
      commitment: true,
      documents: {
        orderBy: { createdAt: "asc" },
        include: {
          reviewedBy: { select: { name: true } },
          _count: { select: { transactions: { where: { isDuplicate: true } } } },
        },
      },
      notes: { orderBy: { createdAt: "desc" }, include: { admin: { select: { name: true } } } },
      statusHistory: { orderBy: { createdAt: "desc" }, include: { changedBy: { select: { name: true } } } },
      requests: { orderBy: { createdAt: "desc" }, include: { requestedBy: { select: { name: true } }, _count: { select: { documents: true } } } },
      reviews: { orderBy: { createdAt: "desc" }, take: 15, include: { admin: { select: { name: true } } } },
      payment: true,
    },
  });
  if (!c) notFound();

  const h = await headers();
  await logAccess({ action: "case.view", adminId: admin.id, targetType: "case", targetId: c.id, ip: clientIp(h), userAgent: userAgent(h) });

  const admins = await prisma.adminUser.findMany({
    where: { isActive: true, ...(config.demoMode ? {} : { isDemo: false }) },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const status = c.status as CaseStatusValue;
  const declared = decimalToCents(c.declaredLoss) ?? 0;
  const identified = decimalToCents(c.identifiedLoss);
  const validated = decimalToCents(c.validatedLoss);
  const divergence = divergenceOf(declared, identified);
  const declaration = c.declarations[0];
  const openRequest = c.requests.find((r) => r.status === "open");
  const requestDoc = sp.solicitar ? c.documents.find((d) => d.id === sp.solicitar) : undefined;
  const bind = <A extends unknown[]>(fn: (caseId: string, ...args: A) => Promise<void>) => fn.bind(null, c.id);

  const detail =
    c.betType === "sports"
      ? labelFor(SPORTS_KINDS, c.sportsBetKind)
      : c.betType === "casino"
        ? c.casinoGames.map((g) => labelFor(CASINO_GAMES, g)).join(", ")
        : labelFor(MAIN_LOSS_AREAS, c.mainLossArea);

  return (
    <div id="topo" className="space-y-5">
      <Link href="/admin/casos" className="-ml-2 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-navy-700 hover:bg-navy-50">
        <IconChevronLeft size={16} /> Casos
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight tabular-nums text-ink sm:text-3xl">{c.protocol}</h1>
            <Badge tone={CASE_STATUS_TONE[status]}>{CASE_STATUS_LABEL[status]}</Badge>
            {c.isDemo && <Badge tone="warn">DEMO</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted">
            Recebido em {formatDateTime(c.createdAt)} · prazo até {formatDate(c.reviewDeadline)}
          </p>
        </div>
        <form action={bind(assignCase)} className="flex items-end gap-2">
          <label className="text-sm">
            <span className="text-xs text-muted">Responsável</span>
            <Select name="adminId" defaultValue={c.assignedAdminId ?? ""} className="mt-1 min-w-48 py-2">
              <option value="">Sem responsável</option>
              {admins.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </label>
          <SubmitButton size="sm" variant="secondary" className="mb-0.5 min-h-10">
            Salvar
          </SubmitButton>
        </form>
      </div>

      {sp.ok && OK_MESSAGES[sp.ok] && <Notice tone="ok">{OK_MESSAGES[sp.ok]}</Notice>}
      {sp.erro && ERROR_MESSAGES[sp.erro] && <Notice tone="danger">{ERROR_MESSAGES[sp.erro]}</Notice>}

      {/* ── Valores ─────────────────────────────────────────────── */}
      <Section id="valores" title="Valores">
        <div className="grid gap-3 md:grid-cols-3">
          <ValueCard
            label="Valor declarado"
            value={formatBRL(declared)}
            note={c.declaredNeedsReview ? <span className="font-medium text-warn-700">Cálculo negativo, necessita revisão</span> : "Informado pelo cliente"}
          />
          <ValueCard
            label="Valor identificado"
            value={identified === null ? <span className="text-muted">—</span> : formatBRL(identified)}
            note={
              c.identifiedSource === "auto" ? (
                <span className="font-medium text-warn-700">Extraído automaticamente — necessita validação</span>
              ) : c.identifiedSource === "manual" ? (
                <span className="font-medium text-ok-700">Conferido pela equipe</span>
              ) : (
                "Aguardando leitura dos documentos"
              )
            }
          />
          <ValueCard
            label="Valor validado"
            highlight={validated !== null}
            value={validated === null ? <span className="text-muted">—</span> : formatBRL(validated)}
            note="Definido somente pela equipe. Não representa valor a ser recuperado."
          />
        </div>

        {divergence && (
          <div className="mt-4 rounded-xl border border-warn-700/25 bg-warn-50 p-4">
            <p className="flex items-center gap-2 font-semibold text-warn-700">
              <IconAlert size={18} /> Divergência encontrada
            </p>
            <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-warn-700/80">Declarado</dt>
                <dd className="font-medium tabular-nums text-ink">{formatBRL(declared)}</dd>
              </div>
              <div>
                <dt className="text-warn-700/80">Identificado</dt>
                <dd className="font-medium tabular-nums text-ink">{formatBRL(identified)}</dd>
              </div>
              <div>
                <dt className="text-warn-700/80">Diferença</dt>
                <dd className="font-medium tabular-nums text-ink">{formatBRL(Math.abs(divergence.diffCents))}</dd>
              </div>
              <div>
                <dt className="text-warn-700/80">Status</dt>
                <dd className="font-medium text-ink">Necessita conferência</dd>
              </div>
            </dl>
          </div>
        )}

        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <div className="rounded-xl border border-line p-4">
            <p className="text-sm font-semibold text-ink">Declarado pelo cliente</p>
            <dl className="mt-2 divide-y divide-dashed divide-line-strong text-sm">
              <div className="flex justify-between py-1.5">
                <dt className="text-muted">Depósitos</dt>
                <dd className="tabular-nums">{formatBRL(decimalToCents(c.declaredDeposits))}</dd>
              </div>
              <div className="flex justify-between py-1.5">
                <dt className="text-muted">Saques</dt>
                <dd className="tabular-nums">{formatBRL(decimalToCents(c.declaredWithdrawals))}</dd>
              </div>
              <div className="flex justify-between py-1.5">
                <dt className="text-muted">Saldo {declaration && !declaration.hasBalance && "(sem saldo)"}</dt>
                <dd className="tabular-nums">{formatBRL(decimalToCents(c.declaredBalance))}</dd>
              </div>
              {declaration && (
                <div className="flex justify-between py-1.5">
                  <dt className="text-muted">Resultado bruto</dt>
                  <dd className="tabular-nums">{formatBRL(decimalToCents(declaration.rawResult))}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="space-y-3 rounded-xl border border-line p-4">
            <form action={bind(saveIdentified)} className="space-y-3">
            <p className="text-sm font-semibold text-ink">Conferência do valor identificado</p>
            <MoneyField name="deposits" id="identified-deposits" label="Depósitos identificados" defaultCents={decimalToCents(c.identifiedDeposits)} />
            <MoneyField
              name="withdrawals"
              id="identified-withdrawals"
              label="Saques identificados"
              defaultCents={decimalToCents(c.identifiedWithdrawals)}
            />
            <MoneyField name="balance" id="identified-balance" label="Saldo identificado" defaultCents={decimalToCents(c.identifiedBalance)} />
            <Textarea name="comment" placeholder="Comentário (opcional)" className="min-h-16 text-sm" maxLength={500} />
            <SubmitButton size="sm" className="w-full">
              Salvar valor conferido
            </SubmitButton>
            </form>
            <div className="flex flex-wrap gap-2 border-t border-line pt-3">
              {c.identifiedSource === "auto" && (
                <form action={bind(confirmIdentified)}>
                  <SubmitButton size="sm" variant="ok">
                    Confirmar automático
                  </SubmitButton>
                </form>
              )}
              <form action={bind(recalcIdentified)}>
                <SubmitButton
                  size="sm"
                  variant="ghost"
                  confirmMessage="Recalcular a partir dos documentos? O valor conferido manualmente será substituído pela leitura automática."
                >
                  <IconRefresh size={15} /> Recalcular pelos documentos
                </SubmitButton>
              </form>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-line p-4">
            <form action={bind(saveValidated)} className="space-y-3">
              <p className="text-sm font-semibold text-ink">Valor validado para análise</p>
              <MoneyField name="validated" id="validated" label="Valor validado" defaultCents={validated} />
              <Textarea name="comment" placeholder="Justificativa (opcional)" className="min-h-16 text-sm" maxLength={500} />
              <SubmitButton size="sm" className="w-full">
                Salvar valor validado
              </SubmitButton>
            </form>
            {validated !== null && (
              <form action={bind(clearValidated)} className="border-t border-line pt-3">
                <SubmitButton size="sm" variant="ghost" confirmMessage="Remover o valor validado?">
                  Remover valor validado
                </SubmitButton>
              </form>
            )}
          </div>
        </div>
      </Section>

      <Section id="pagamento" title="Pagamento">
        {c.payment ? (
          <dl className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
            <Info label="Valor original">{formatBRL(decimalToCents(c.payment.originalAmount))}</Info>
            <Info label="Desconto">{formatBRL((decimalToCents(c.payment.originalAmount) ?? 0) - (decimalToCents(c.payment.finalAmount) ?? 0))}</Info>
            <Info label="Valor pago">{formatBRL(decimalToCents(c.payment.finalAmount))}</Info>
            <Info label="Método">{c.payment.paymentMethod === "pix" ? "PIX" : "Pagamento padrão"}</Info>
            <Info label="Status">{c.payment.status === "paid" ? "Pago" : c.payment.status}</Info>
            <Info label="Data">{c.payment.paidAt ? formatDateTime(c.payment.paidAt) : formatDateTime(c.payment.createdAt)}</Info>
            <Info label="ID da transação">{c.payment.transactionId ?? "—"}</Info>
          </dl>
        ) : (
          <p className="text-sm text-muted">Pagamento ainda não criado.</p>
        )}
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section id="solicitante" title="Solicitante">
          <dl className="grid gap-x-6 sm:grid-cols-2">
            <Info label="Nome">{c.user.fullName}</Info>
            <Info label="E-mail">
              <a href={`mailto:${c.user.email}`} className="text-navy-700 hover:underline">
                {c.user.email}
              </a>
            </Info>
            <Info label="WhatsApp">
              <a href={`https://wa.me/55${c.user.whatsapp}`} target="_blank" rel="noopener noreferrer" className="text-navy-700 hover:underline">
                {formatPhoneBR(c.user.whatsapp)}
              </a>
            </Info>
            <Info label="Maioridade">{c.user.isAdult ? "Confirmou ter 18 anos ou mais" : "Não confirmada"}</Info>
            <Info label="Consentimento LGPD">
              {formatDateTime(c.privacyConsentAt)}
              {c.privacyConsentIp && <span className="text-muted"> · IP {c.privacyConsentIp}</span>}
            </Info>
          </dl>
        </Section>

        <Section id="classificacao" title="Classificação">
          <dl className="grid gap-x-6 sm:grid-cols-2">
            <Info label="Tipo">{BET_TYPE_SUMMARY[c.betType]}</Info>
            <Info label="Detalhe">{detail || "—"}</Info>
            <Info label="Tempo de uso">{labelFor(PERIODS, c.period)}</Info>
            <Info label="Plataformas">{c.platforms.map((p) => p.platform.name + (p.platform.isCustom ? " (informada)" : "")).join(", ")}</Info>
            <Info label="Situação">
              {c.situations.map((s) => labelFor(SITUATIONS, s)).join("; ")}
              {c.situationOther && <span className="block text-ink-soft">“{c.situationOther}”</span>}
            </Info>
            <Info label="Compromisso voluntário">
              {c.commitment?.accepted ? (
                <>
                  Aceito em {formatDateTime(c.commitment.acceptedAt)}
                  <span className="block text-xs text-muted">
                    IP {c.commitment.ip ?? "—"} · versão {c.commitment.textVersion}
                  </span>
                  {c.commitment.userAgent && <span className="block truncate text-xs text-muted">{c.commitment.userAgent}</span>}
                </>
              ) : (
                "Não registrado"
              )}
            </Info>
          </dl>
        </Section>
      </div>

      {/* ── Documentos ─────────────────────────────────────────── */}
      <Section
        id="documentos"
        title={`Documentos (${c.documents.length})`}
        aside={<span className="text-xs text-muted">Links de visualização expiram em 5 minutos e ficam registrados.</span>}
      >
        {c.documents.length === 0 ? (
          <p className="text-sm text-muted">Nenhum documento.</p>
        ) : (
          <ul className="space-y-3">
            {c.documents.map((doc) => {
              const summary = doc.extractedSummary as unknown as ExtractionSummary | null;
              const docStatus = doc.status as DocumentStatusValue;
              const setStatus = bind(setDocumentStatus);
              return (
                <li key={doc.id} id={`doc-${doc.id}`} className="scroll-mt-24 rounded-xl border border-line p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-all font-medium text-ink">{doc.originalName}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {doc.platformName ?? "Sem plataforma"} · {categoryLabel(doc.category)} · {formatBytes(doc.sizeBytes)} ·{" "}
                        {doc.uploadedVia === "additional" ? "Documentação adicional" : "Envio inicial"} · {formatDateTime(doc.createdAt)}
                      </p>
                    </div>
                    <Badge tone={DOCUMENT_STATUS_TONE[docStatus]}>{DOCUMENT_STATUS_LABEL[docStatus]}</Badge>
                  </div>

                  {doc.reviewNote && <p className="mt-2 text-sm text-ink-soft">Observação: {doc.reviewNote}</p>}
                  {doc.reviewedBy && doc.reviewedAt && (
                    <p className="mt-1 text-xs text-muted">
                      Conferido por {doc.reviewedBy.name} em {formatDateTime(doc.reviewedAt)}
                    </p>
                  )}

                  <div className="mt-3 rounded-lg bg-paper px-3 py-2.5 text-sm">
                    {doc.extractionStatus === "done" && summary ? (
                      <>
                        <p className="text-xs font-semibold text-warn-700">Extraído automaticamente — necessita validação</p>
                        <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-ink">
                          <span>
                            Depósitos: <strong className="tabular-nums">{formatBRL(summary.deposits.totalCents)}</strong> ({summary.deposits.count})
                          </span>
                          <span>
                            Saques: <strong className="tabular-nums">{formatBRL(summary.withdrawals.totalCents)}</strong> ({summary.withdrawals.count})
                          </span>
                          {summary.balanceCents !== null && (
                            <span>
                              Saldo: <strong className="tabular-nums">{formatBRL(summary.balanceCents)}</strong>
                            </span>
                          )}
                          {summary.periodStart && summary.periodEnd && (
                            <span>
                              Período: {formatDate(summary.periodStart)} a {formatDate(summary.periodEnd)}
                            </span>
                          )}
                        </div>
                        {summary.statedTotals && (summary.statedTotals.depositsCents || summary.statedTotals.withdrawalsCents) ? (
                          <p className="mt-1 text-xs text-muted">
                            Totais declarados no próprio arquivo:{" "}
                            {summary.statedTotals.depositsCents ? `depósitos ${formatBRL(summary.statedTotals.depositsCents)}` : ""}
                            {summary.statedTotals.depositsCents && summary.statedTotals.withdrawalsCents ? " · " : ""}
                            {summary.statedTotals.withdrawalsCents ? `saques ${formatBRL(summary.statedTotals.withdrawalsCents)}` : ""}
                          </p>
                        ) : null}
                        {doc._count.transactions > 0 && (
                          <p className="mt-1 text-xs text-muted">
                            {doc._count.transactions} movimentação(ões) repetida(s) em outro arquivo — não somada(s) novamente.
                          </p>
                        )}
                        {summary.warnings.length > 0 && (
                          <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-xs text-warn-700">
                            {summary.warnings.map((w) => (
                              <li key={w}>{w}</li>
                            ))}
                          </ul>
                        )}
                      </>
                    ) : doc.extractionStatus === "unsupported" ? (
                      <p className="text-ink-soft">Imagem: leitura automática indisponível. Conferência manual necessária.</p>
                    ) : doc.extractionStatus === "failed" ? (
                      <p className="text-danger-700">Falha na leitura automática: {doc.extractionError ?? "erro desconhecido"}</p>
                    ) : (
                      <p className="text-ink-soft">Leitura automática em andamento…</p>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <a href={`/api/admin/documents/${doc.id}/view`} target="_blank" rel="noopener noreferrer" className={buttonClasses("secondary", "sm")}>
                      <IconEye size={15} /> Visualizar
                    </a>
                    <form action={setStatus}>
                      <input type="hidden" name="documentId" value={doc.id} />
                      <input type="hidden" name="status" value="valid" />
                      <SubmitButton size="sm" variant="ok">
                        Validar
                      </SubmitButton>
                    </form>
                    <form action={setStatus}>
                      <input type="hidden" name="documentId" value={doc.id} />
                      <input type="hidden" name="status" value="divergent" />
                      <SubmitButton size="sm" variant="danger">
                        Marcar como divergente
                      </SubmitButton>
                    </form>
                    <Link href={`/admin/casos/${c.id}?solicitar=${doc.id}#solicitar`} className={buttonClasses("secondary", "sm")}>
                      Solicitar novo documento
                    </Link>
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-medium text-muted hover:text-ink">Outras ações</summary>
                    <div className="mt-2 flex flex-wrap items-end gap-2">
                      <form action={setStatus} className="flex flex-wrap items-end gap-2">
                        <input type="hidden" name="documentId" value={doc.id} />
                        <Select name="status" defaultValue={docStatus} className="w-auto py-2 text-sm" aria-label="Status do documento">
                          {DOCUMENT_STATUS_VALUES.map((s) => (
                            <option key={s} value={s}>
                              {DOCUMENT_STATUS_LABEL[s]}
                            </option>
                          ))}
                        </Select>
                        <input
                          name="reviewNote"
                          placeholder="Observação (opcional)"
                          maxLength={500}
                          className="min-h-10 rounded-xl border border-line-strong px-3 text-sm"
                        />
                        <SubmitButton size="sm" variant="secondary">
                          Aplicar
                        </SubmitButton>
                      </form>
                      <form action={bind(reprocessDocument)}>
                        <input type="hidden" name="documentId" value={doc.id} />
                        <SubmitButton size="sm" variant="ghost">
                          <IconRefresh size={15} /> Refazer leitura
                        </SubmitButton>
                      </form>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section id="status" title="Status do caso">
          <form action={bind(updateStatus)} className="space-y-3">
            <Select name="status" defaultValue={ADMIN_SETTABLE_STATUSES.includes(status) ? status : "under_review"} aria-label="Novo status">
              {ADMIN_SETTABLE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {CASE_STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
            <Textarea name="publicMessage" placeholder="Mensagem para o cliente (opcional, aparece no acompanhamento)" maxLength={1000} className="text-sm" />
            <SubmitButton size="sm" className="w-full sm:w-auto">
              Atualizar status
            </SubmitButton>
            <p className="text-xs text-muted">Para pedir documentos, use “Solicitar documentos”: o status muda automaticamente.</p>
          </form>
        </Section>

        <Section id="solicitar" title="Solicitar documentos">
          {openRequest && (
            <Notice tone="warn" className="mb-4">
              Pedido em aberto desde {formatDateTime(openRequest.createdAt)}: {openRequest.reasons.map((r) => labelFor(REQUEST_REASONS, r)).join(", ")}.{" "}
              {openRequest._count.documents} arquivo(s) recebido(s). Um novo pedido substitui o atual.
            </Notice>
          )}
          <form action={bind(requestDocuments)} className="space-y-3">
            <fieldset>
              <legend className="text-sm font-medium text-ink">Motivo</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {REQUEST_REASONS.map((r) => (
                  <label key={r.value} className="flex items-center gap-2 text-sm text-ink">
                    <input type="checkbox" name="reasons" value={r.value} className="size-4 accent-navy-900" />
                    {r.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <Textarea
              name="message"
              maxLength={1000}
              className="text-sm"
              placeholder="Mensagem ao cliente (opcional)"
              defaultValue={requestDoc ? `Sobre o arquivo “${requestDoc.originalName}”: ` : ""}
            />
            <SubmitButton size="sm" className="w-full sm:w-auto">
              Solicitar documentos
            </SubmitButton>
          </form>
        </Section>
      </div>

      <Section id="proximos" title="Próximos passos (visíveis ao cliente)">
        <form action={bind(saveNextSteps)} className="space-y-3">
          <Textarea
            name="nextSteps"
            defaultValue={c.nextSteps ?? ""}
            maxLength={2000}
            className="text-sm"
            placeholder="Exibido quando o caso tiver possibilidade de prosseguimento ou for concluído. Se vazio, usamos um texto padrão."
          />
          <SubmitButton size="sm" variant="secondary">
            Salvar próximos passos
          </SubmitButton>
        </form>
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section id="notas" title="Notas internas">
          <form action={bind(addNote)} className="space-y-3">
            <Textarea name="content" required maxLength={4000} className="text-sm" placeholder="Nota visível apenas para a equipe" />
            <SubmitButton size="sm" variant="secondary">
              Adicionar nota
            </SubmitButton>
          </form>
          {c.notes.length > 0 && (
            <ul className="mt-4 divide-y divide-line">
              {c.notes.map((n) => (
                <li key={n.id} className="py-3">
                  <p className="whitespace-pre-line text-sm text-ink">{n.content}</p>
                  <p className="mt-1 text-xs text-muted">
                    {n.admin.name} · {formatDateTime(n.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section id="historico" title="Histórico">
          <ul className="space-y-2.5 text-sm">
            {c.statusHistory.map((hItem) => (
              <li key={hItem.id} className="flex gap-3">
                <span className="w-32 shrink-0 text-xs text-muted">{formatDateTime(hItem.createdAt)}</span>
                <span>
                  {CASE_STATUS_LABEL[hItem.toStatus as CaseStatusValue]}
                  <span className="text-muted"> · {hItem.changedBy?.name ?? "sistema"}</span>
                  {hItem.publicMessage && <span className="block text-xs text-ink-soft">“{hItem.publicMessage}”</span>}
                </span>
              </li>
            ))}
          </ul>
          {c.reviews.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-xs font-medium text-muted hover:text-ink">Registro de conferências</summary>
              <ul className="mt-2 space-y-1.5 text-xs text-ink-soft">
                {c.reviews.map((r) => (
                  <li key={r.id}>
                    {formatDateTime(r.createdAt)} · {r.admin.name} · {r.action}
                    {r.identifiedLoss !== null && ` · identificado ${formatBRL(decimalToCents(r.identifiedLoss))}`}
                    {r.validatedLoss !== null && ` · validado ${formatBRL(decimalToCents(r.validatedLoss))}`}
                    {r.comment && ` · ${r.comment}`}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Section>
      </div>

      <Section id="lgpd" title="Dados pessoais (LGPD)">
        <p className="text-sm leading-relaxed text-ink-soft">
          Para atender pedidos do titular (acesso, portabilidade e eliminação, art. 18 da LGPD). Cada uso fica registrado.
        </p>
        <a href={`/api/admin/cases/${c.id}/export`} className={cx(buttonClasses("secondary", "sm"), "mt-4")}>
          Exportar dados (JSON)
        </a>
        {admin.role === "admin" ? (
          <form action={bind(deleteCase)} className="mt-5 space-y-3 rounded-xl border border-danger-700/20 bg-danger-50 p-4">
            <p className="text-sm font-semibold text-danger-700">Excluir caso definitivamente</p>
            <p className="text-sm leading-relaxed text-danger-700">
              Apaga o caso, as respostas, os valores, as notas e todos os documentos do armazenamento. Não pode ser desfeito. Os registros de
              acesso são mantidos pelo prazo legal.
            </p>
            <label className="block text-sm text-danger-700">
              Digite <strong className="tabular-nums">{c.protocol}</strong> para confirmar
              <input
                name="confirmProtocol"
                required
                autoComplete="off"
                className="mt-1.5 block w-full max-w-xs rounded-xl border border-danger-700/30 bg-surface px-3.5 py-2.5 text-base text-ink uppercase tracking-wide focus:border-danger-700 focus:outline-none"
              />
            </label>
            <SubmitButton size="sm" variant="danger" confirmMessage={`Excluir definitivamente o caso ${c.protocol} e todos os documentos?`}>
              Excluir definitivamente
            </SubmitButton>
          </form>
        ) : (
          <p className="mt-4 text-xs text-muted">A exclusão definitiva é restrita a administradores.</p>
        )}
      </Section>
    </div>
  );
}

import { trackingLogout } from "@/app/acompanhar/actions";
import type { ClientCase } from "@/lib/cases/client-view";
import { cx } from "@/lib/cx";
import { formatBRL, formatDate } from "@/lib/format";
import { DEFAULT_NEXT_STEPS, REQUEST_REASONS, labelFor } from "@/lib/options";
import { CASE_STATUS_LABEL, CASE_STATUS_TONE, clientTimeline, type TimelineState } from "@/lib/status";
import { IconAlert, IconCheck, IconChevronRight, IconClock, IconLogout } from "../icons";
import { Badge, LedgerRow, LinkButton } from "../ui";

const DOT: Record<TimelineState, string> = {
  done: "bg-navy-900 text-white border-navy-900",
  current: "bg-surface text-navy-900 border-navy-900",
  attention: "bg-warn-50 text-warn-700 border-warn-700",
  pending: "bg-surface text-line-strong border-line-strong",
};

function ResultBlock({ data }: { data: ClientCase }) {
  if (data.status === "eligible") {
    return (
      <section className="rounded-2xl border border-ok-600/25 bg-ok-50 p-5">
        <p className="text-lg font-semibold leading-snug text-ok-700">Identificamos elementos que permitem prosseguir com seu caso.</p>
        <details className="group mt-4">
          <summary className="inline-flex min-h-12 cursor-pointer list-none items-center justify-center gap-2 rounded-xl bg-ok-600 px-5 text-[0.84rem] font-semibold uppercase tracking-[0.06em] text-white hover:bg-ok-700 [&::-webkit-details-marker]:hidden">
            Ver próximos passos
            <IconChevronRight size={16} className="transition-transform group-open:rotate-90" />
          </summary>
          <p className="mt-4 whitespace-pre-line text-[0.95rem] leading-relaxed text-ink">{data.nextSteps || DEFAULT_NEXT_STEPS}</p>
        </details>
      </section>
    );
  }
  if (data.status === "not_eligible") {
    return (
      <section className="rounded-2xl border border-line bg-surface p-5">
        <p className="text-[0.98rem] leading-relaxed text-ink">
          Neste momento, não identificamos elementos suficientes para prosseguir com o caso.
        </p>
      </section>
    );
  }
  if (data.status === "additional_documents") {
    return (
      <section className="rounded-2xl border border-warn-700/25 bg-warn-50 p-5">
        <div className="flex items-start gap-3">
          <IconAlert size={22} className="mt-0.5 shrink-0 text-warn-700" />
          <div>
            <p className="text-lg font-semibold text-warn-700">Precisamos de mais informações</p>
            {data.openRequest && (
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-warn-700">
                {data.openRequest.reasons.map((r) => (
                  <li key={r}>{labelFor(REQUEST_REASONS, r)}</li>
                ))}
              </ul>
            )}
            {data.openRequest?.message && <p className="mt-3 whitespace-pre-line text-sm text-ink">{data.openRequest.message}</p>}
          </div>
        </div>
        <LinkButton href="/acompanhar/documentos" className="mt-5 w-full">
          Enviar documentos
        </LinkButton>
      </section>
    );
  }
  if (data.status === "completed") {
    return (
      <section className="rounded-2xl border border-line bg-surface p-5">
        <p className="text-[0.98rem] leading-relaxed text-ink">A análise documental do seu caso foi concluída.</p>
        {data.nextSteps && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{data.nextSteps}</p>}
      </section>
    );
  }
  return null;
}

export function CaseTracking({ data }: { data: ClientCase }) {
  const timeline = clientTimeline(data.status, data.history);
  return (
    <div className="step-in space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Caso</p>
          <h1 className="text-[1.9rem] font-semibold leading-tight tracking-wide text-ink tabular-nums">{data.protocol}</h1>
        </div>
        <form action={trackingLogout}>
          <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-surface hover:text-ink">
            <IconLogout size={16} /> Sair
          </button>
        </form>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-ink-soft">Status atual:</span>
        <Badge tone={CASE_STATUS_TONE[data.status]}>{CASE_STATUS_LABEL[data.status]}</Badge>
      </div>

      <ResultBlock data={data} />

      <section className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
        <h2 className="text-sm font-semibold text-ink">Andamento</h2>
        <ol className="mt-4">
          {timeline.map((step, i) => (
            <li key={step.key} className="relative flex gap-4 pb-5 last:pb-0">
              {i < timeline.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cx("absolute left-[0.8rem] top-7 h-[calc(100%-1.5rem)] w-px", step.state === "done" ? "bg-navy-900" : "bg-line-strong")}
                />
              )}
              <span className={cx("relative z-10 grid size-[1.65rem] shrink-0 place-items-center rounded-full border-2", DOT[step.state])}>
                {step.state === "done" && <IconCheck size={14} strokeWidth={3} />}
                {step.state === "current" && <span className="size-2 rounded-full bg-navy-900" />}
                {step.state === "attention" && <span className="size-2 rounded-full bg-warn-700" />}
              </span>
              <div className="pt-0.5">
                <p className={cx("font-medium", step.state === "pending" ? "text-muted" : "text-ink")}>{step.label}</p>
                {step.state === "attention" && <p className="text-sm text-warn-700">Aguardando documentos adicionais</p>}
                {step.state === "current" && step.key === "analysis" && <p className="text-sm text-ink-soft">Em andamento</p>}
                {step.date && step.state !== "pending" && <p className="text-sm text-muted">{formatDate(step.date)}</p>}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl border border-line bg-surface px-5 pb-2 pt-5 shadow-soft">
        <h2 className="text-sm font-semibold text-ink">Valores</h2>
        <dl className="mt-1 divide-y divide-dashed divide-line-strong">
          <LedgerRow label="Perda declarada" hint="Informada por você" value={formatBRL(data.declaredLossCents)} />
          <LedgerRow
            label="Valor documentalmente identificado"
            hint="Conferido a partir dos documentos"
            value={data.identifiedLossCents === null ? <span className="text-muted">Em análise</span> : formatBRL(data.identifiedLossCents)}
          />
          <LedgerRow
            label="Valor validado para análise"
            hint="Não representa valor a ser recuperado"
            value={data.validatedLossCents === null ? <span className="text-muted">—</span> : formatBRL(data.validatedLossCents)}
          />
          <LedgerRow
            label="Prazo"
            value={
              <span className="inline-flex items-center gap-1.5">
                <IconClock size={16} className="text-muted" />
                Até {formatDate(data.reviewDeadline)}
              </span>
            }
          />
        </dl>
      </section>

      {data.latestMessage && data.status !== "additional_documents" && (
        <section className="rounded-2xl border border-navy-100 bg-navy-50 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-navy-700">Mensagem da equipe</p>
          <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink">{data.latestMessage}</p>
        </section>
      )}

      <p className="text-sm leading-relaxed text-muted">
        Plataformas: {data.platforms.join(", ")} · {data.documentsCount} {data.documentsCount === 1 ? "documento" : "documentos"} recebidos. Cada caso
        é analisado individualmente e o envio das informações não garante recuperação de valores.
      </p>
    </div>
  );
}

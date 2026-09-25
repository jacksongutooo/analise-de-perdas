"use client";

import Link from "next/link";
import type { ReactNode, RefObject } from "react";
import { PAYMENT_NOTICE, SERVICE_TERMS_CHECKBOX } from "@/lib/comprovabet";
import { cpfDigits, maskCpfInput } from "@/lib/cpf";
import { cx } from "@/lib/cx";
import { formatBRL, formatDateTime, maskPhoneInput, plural } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/payments/types";
import {
  BET_TYPES,
  BET_TYPE_SUMMARY,
  CASINO_GAMES,
  CONTROL_LOSS,
  CONTROL_LOSS_SUMMARY,
  GAMBLING_SUPPORT_NOTE,
  MAIN_LOSS_AREAS,
  PERIODS,
  PLATFORMS,
  SITUATIONS,
  SPORTS_KINDS,
  commitmentText,
  labelFor,
  lostControl,
  situationValuesFor,
  type BetTypeValue,
  type ControlLossValue,
} from "@/lib/options";
import { MoneyInput } from "../MoneyInput";
import { IconAlert, IconCheck, IconDice, IconLayers, IconLock, IconPlus, IconTrophy, IconX } from "../icons";
import { Button, Field, LedgerRow, Notice, TextInput } from "../ui";
import { ChoiceCard } from "./ChoiceCard";
import { contactErrors, currentSituations, declaredLoss, type PaymentState, type Screen, type WizardData } from "./state";

type HeadingRef = RefObject<HTMLHeadingElement | null>;
type Update = (patch: Partial<WizardData>) => void;

export function StepHeading({ headingRef, id, title, subtitle }: { headingRef: HeadingRef; id: string; title: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="mb-7">
      <h1
        ref={headingRef}
        id={id}
        tabIndex={-1}
        className="text-[1.65rem] font-semibold leading-[1.15] tracking-[-0.015em] text-ink outline-none sm:text-[2rem]"
      >
        {title}
      </h1>
      {subtitle && <p className="mt-2.5 text-[0.98rem] leading-relaxed text-ink-soft">{subtitle}</p>}
    </div>
  );
}

// ─── Etapa 1 ──────────────────────────────────────────────────────────────
const TYPE_ICONS: Record<BetTypeValue, ReactNode> = {
  sports: <IconTrophy size={22} />,
  casino: <IconDice size={22} />,
  both: <IconLayers size={22} />,
};

export function TypeStep({ data, headingRef, onChoose }: { data: WizardData; headingRef: HeadingRef; onChoose: (v: BetTypeValue) => void }) {
  return (
    <>
      <StepHeading headingRef={headingRef} id="q-type" title="Onde aconteceram suas perdas?" />
      <div role="radiogroup" aria-labelledby="q-type" className="space-y-3">
        {BET_TYPES.map((t) => (
          <ChoiceCard
            key={t.value}
            selected={data.betType === t.value}
            onSelect={() => onChoose(t.value)}
            title={t.label}
            description={t.description}
            icon={TYPE_ICONS[t.value]}
          />
        ))}
      </div>
    </>
  );
}

export function TypeDetailStep({
  data,
  update,
  headingRef,
  onSingleChoice,
}: {
  data: WizardData;
  update: Update;
  headingRef: HeadingRef;
  onSingleChoice: () => void;
}) {
  if (data.betType === "casino") {
    const toggle = (value: string) =>
      update({ casinoGames: data.casinoGames.includes(value) ? data.casinoGames.filter((g) => g !== value) : [...data.casinoGames, value] });
    return (
      <>
        <StepHeading headingRef={headingRef} id="q-detail" title="Quais jogos utilizava com maior frequência?" subtitle="Você pode marcar mais de um." />
        <div role="group" aria-labelledby="q-detail" className="grid grid-cols-2 gap-3">
          {CASINO_GAMES.map((g) => (
            <ChoiceCard key={g.value} compact multiple selected={data.casinoGames.includes(g.value)} onSelect={() => toggle(g.value)} title={g.label} />
          ))}
        </div>
      </>
    );
  }
  const isSports = data.betType === "sports";
  const options = isSports ? SPORTS_KINDS : MAIN_LOSS_AREAS;
  const current = isSports ? data.sportsKind : data.mainLossArea;
  return (
    <>
      <StepHeading
        headingRef={headingRef}
        id="q-detail"
        title={isSports ? "Qual tipo de aposta você utilizava mais?" : "Onde ocorreu a maior parte das suas perdas?"}
      />
      <div role="radiogroup" aria-labelledby="q-detail" className="space-y-3">
        {options.map((o) => (
          <ChoiceCard
            key={o.value}
            compact
            selected={current === o.value}
            onSelect={() => {
              update(isSports ? { sportsKind: o.value } : { mainLossArea: o.value });
              onSingleChoice();
            }}
            title={o.label}
          />
        ))}
      </div>
    </>
  );
}

// ─── Etapa 2 ──────────────────────────────────────────────────────────────
export function PlatformsStep({ data, update, headingRef }: { data: WizardData; update: Update; headingRef: HeadingRef }) {
  const toggle = (slug: string) =>
    update({ platforms: data.platforms.includes(slug) ? data.platforms.filter((s) => s !== slug) : [...data.platforms, slug] });
  const setCustom = (index: number, value: string) =>
    update({ customPlatforms: data.customPlatforms.map((c, i) => (i === index ? value.slice(0, 60) : c)) });
  const removeCustom = (index: number) => {
    const rest = data.customPlatforms.filter((_, i) => i !== index);
    update(rest.length ? { customPlatforms: rest } : { customPlatforms: [""], otherPlatformEnabled: false });
  };
  return (
    <>
      <StepHeading headingRef={headingRef} id="q-platforms" title="Em quais plataformas você apostou?" subtitle="Marque todas que utilizou." />
      <div role="group" aria-labelledby="q-platforms" className="grid grid-cols-2 gap-3">
        {PLATFORMS.map((p) => (
          <ChoiceCard key={p.slug} compact multiple selected={data.platforms.includes(p.slug)} onSelect={() => toggle(p.slug)} title={p.name} />
        ))}
        <ChoiceCard
          compact
          multiple
          selected={data.otherPlatformEnabled}
          onSelect={() =>
            update({ otherPlatformEnabled: !data.otherPlatformEnabled, customPlatforms: data.customPlatforms.length ? data.customPlatforms : [""] })
          }
          title="Outra"
        />
      </div>
      {data.otherPlatformEnabled && (
        <div className="step-in mt-5 space-y-3 rounded-2xl border border-line bg-surface p-4">
          {data.customPlatforms.map((name, i) => (
            <div key={i} className="flex items-end gap-2">
              <Field label={i === 0 ? "Nome da plataforma" : `Nome da plataforma ${i + 1}`} htmlFor={`custom-${i}`} className="flex-1">
                <TextInput
                  id={`custom-${i}`}
                  value={name}
                  maxLength={60}
                  autoComplete="off"
                  placeholder="Ex.: nome do site ou aplicativo"
                  onChange={(e) => setCustom(i, e.target.value)}
                />
              </Field>
              {(data.customPlatforms.length > 1 || name) && (
                <button
                  type="button"
                  onClick={() => removeCustom(i)}
                  className="mb-1.5 rounded-lg p-2.5 text-muted hover:bg-paper hover:text-ink"
                  aria-label="Remover plataforma"
                >
                  <IconX size={18} />
                </button>
              )}
            </div>
          ))}
          {data.customPlatforms.length < 5 && (
            <button
              type="button"
              onClick={() => update({ customPlatforms: [...data.customPlatforms, ""] })}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-navy-700 hover:bg-navy-50"
            >
              <IconPlus size={16} /> Adicionar outra plataforma
            </button>
          )}
        </div>
      )}
    </>
  );
}

// ─── Etapa 3 ──────────────────────────────────────────────────────────────
export function PeriodStep({ data, update, headingRef, year }: { data: WizardData; update: Update; headingRef: HeadingRef; year: number }) {
  return (
    <>
      <StepHeading headingRef={headingRef} id="q-period" title="Há quanto tempo você utiliza essas plataformas?" />
      <div role="radiogroup" aria-labelledby="q-period" className="grid grid-cols-2 gap-3">
        {PERIODS.map((p) => (
          <ChoiceCard key={p.value} compact selected={data.period === p.value} onSelect={() => update({ period: p.value })} title={p.label} />
        ))}
      </div>
      {data.period && (
        <div className="step-in mt-6 rounded-2xl border border-navy-100 bg-navy-50 px-5 py-4">
          <p className="text-lg font-semibold leading-snug text-navy-900">Vamos analisar o ano de {year}, com base no seu ComprovaBet.</p>
        </div>
      )}
    </>
  );
}

// ─── Etapa 4 ──────────────────────────────────────────────────────────────
export function AmountsStep({ data, update, headingRef, year }: { data: WizardData; update: Update; headingRef: HeadingRef; year: number }) {
  return (
    <>
      <StepHeading headingRef={headingRef} id="q-deposits" title={`Aproximadamente quanto você depositou em ${year}?`} />
      <MoneyInput id="deposits" ariaLabel="Total depositado" value={data.depositsCents} onChange={(v) => update({ depositsCents: v })} />
      <div className="mt-10">
        <label htmlFor="withdrawals" className="block text-[1.3rem] font-semibold leading-snug tracking-[-0.01em] text-ink">
          E quanto conseguiu sacar em {year}?
        </label>
        <div className="mt-4">
          <MoneyInput id="withdrawals" ariaDescribedBy="withdrawals-hint" value={data.withdrawalsCents} onChange={(v) => update({ withdrawalsCents: v })} />
        </div>
        <p id="withdrawals-hint" className="mt-2 text-sm text-muted">
          Se não sacou nada, deixe em branco.
        </p>
      </div>
    </>
  );
}

export function LossStatement({ data }: { data: WizardData }) {
  const { loss, needsReview } = declaredLoss(data);
  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
        <dl className="divide-y divide-dashed divide-line-strong px-5">
          <LedgerRow label="Depósitos informados" value={formatBRL(data.depositsCents ?? 0)} />
          <LedgerRow label="Saques informados" value={`− ${formatBRL(data.withdrawalsCents ?? 0)}`} />
          <LedgerRow label="Saldo nas plataformas" value={`− ${formatBRL(data.hasBalance ? (data.balanceCents ?? 0) : 0)}`} />
        </dl>
        <div className="bg-navy-900 px-5 py-4 text-white">
          <p className="text-sm text-white/70">Perda líquida declarada</p>
          <p className="mt-0.5 text-[2rem] font-semibold leading-tight tracking-tight tabular-nums">{formatBRL(loss)}</p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Estimativa baseada nos valores informados. Esse valor ainda será conferido através dos documentos enviados.
      </p>
      {needsReview && (
        <Notice tone="warn" className="mt-3">
          Os valores informados resultam em um número negativo, por isso a estimativa aparece como zero. Sua solicitação será sinalizada para revisão.
        </Notice>
      )}
    </div>
  );
}

export function BalanceStep({ data, update, headingRef }: { data: WizardData; update: Update; headingRef: HeadingRef }) {
  return (
    <>
      <StepHeading headingRef={headingRef} id="q-balance" title="Ainda existe saldo disponível nas plataformas?" />
      <div role="radiogroup" aria-labelledby="q-balance" className="grid grid-cols-2 gap-3">
        <ChoiceCard compact selected={data.hasBalance === true} onSelect={() => update({ hasBalance: true })} title="Sim" />
        <ChoiceCard compact selected={data.hasBalance === false} onSelect={() => update({ hasBalance: false, balanceCents: null })} title="Não" />
      </div>
      {data.hasBalance && (
        <div className="step-in mt-6">
          <label htmlFor="balance" className="block text-base font-semibold text-ink">
            Saldo aproximado
          </label>
          <div className="mt-2">
            <MoneyInput id="balance" value={data.balanceCents} onChange={(v) => update({ balanceCents: v })} />
          </div>
        </div>
      )}
      {data.hasBalance !== null && (
        <div className="step-in mt-8">
          <LossStatement data={data} />
        </div>
      )}
    </>
  );
}

// ─── Etapa 5 ──────────────────────────────────────────────────────────────
export function ControlStep({ data, update, headingRef }: { data: WizardData; update: Update; headingRef: HeadingRef }) {
  const choose = (value: ControlLossValue) => {
    // Ao mudar a resposta, ficam só as situações que continuam valendo.
    const allowed = situationValuesFor(value);
    update({ controlLoss: value, situations: data.situations.filter((s) => allowed.includes(s)) });
  };
  return (
    <>
      <StepHeading
        headingRef={headingRef}
        id="q-control"
        title="As apostas saíram do seu controle?"
        subtitle="Sua resposta ajuda a entender o seu caso e fica restrita à equipe de análise."
      />
      <div role="radiogroup" aria-labelledby="q-control" className="space-y-3">
        {CONTROL_LOSS.map((o) => (
          <ChoiceCard key={o.value} selected={data.controlLoss === o.value} onSelect={() => choose(o.value)} title={o.label} description={o.description} />
        ))}
      </div>
      {lostControl(data.controlLoss) && (
        <p className="step-in mt-6 rounded-2xl border border-navy-100 bg-navy-50 px-5 py-4 text-[0.95rem] leading-relaxed text-ink">
          {GAMBLING_SUPPORT_NOTE}
        </p>
      )}
    </>
  );
}

export function SituationStep({ data, update, headingRef }: { data: WizardData; update: Update; headingRef: HeadingRef }) {
  const toggle = (value: WizardData["situations"][number]) =>
    update({ situations: data.situations.includes(value) ? data.situations.filter((s) => s !== value) : [...data.situations, value] });
  const options = situationValuesFor(data.controlLoss).map((value) => SITUATIONS.find((s) => s.value === value)!);
  return (
    <>
      <StepHeading
        headingRef={headingRef}
        id="q-situation"
        title={lostControl(data.controlLoss) ? "O que aconteceu com você?" : "O que aconteceu?"}
        subtitle="Marque tudo o que se aplica."
      />
      <div role="group" aria-labelledby="q-situation" className="space-y-2.5">
        {options.map((s) => (
          <ChoiceCard key={s.value} compact multiple selected={data.situations.includes(s.value)} onSelect={() => toggle(s.value)} title={s.label} />
        ))}
      </div>
      {currentSituations(data).includes("other") && (
        <div className="step-in mt-5">
          <Field label="Descreva em poucas palavras" htmlFor="situation-other" hint={`${data.situationOther.length}/140 caracteres`}>
            <TextInput
              id="situation-other"
              value={data.situationOther}
              maxLength={140}
              onChange={(e) => update({ situationOther: e.target.value.slice(0, 140) })}
            />
          </Field>
        </div>
      )}
    </>
  );
}

// ─── Etapa 7 ──────────────────────────────────────────────────────────────
export function CommitmentStep({ data, update, headingRef, reviewDays }: { data: WizardData; update: Update; headingRef: HeadingRef; reviewDays: number }) {
  return (
    <>
      <StepHeading headingRef={headingRef} id="q-commitment" title="Durante sua análise" />
      <label
        className={cx(
          "flex cursor-pointer items-start gap-4 rounded-2xl border bg-surface p-5 transition-colors",
          data.commitment ? "border-navy-900 bg-navy-50 shadow-[inset_0_0_0_1px_var(--color-navy-900)]" : "border-line hover:border-line-strong",
        )}
      >
        <input
          type="checkbox"
          checked={data.commitment}
          onChange={(e) => update({ commitment: e.target.checked })}
          className="mt-1 size-5 shrink-0 accent-navy-900"
        />
        <span className="text-[0.98rem] leading-relaxed text-ink">{commitmentText(reviewDays)}</span>
      </label>
      <div className="mt-4 space-y-1.5 text-sm leading-relaxed text-muted">
        <p>Esse compromisso é pessoal e não representa bloqueio técnico das suas contas.</p>
        <p>O cumprimento deste compromisso não garante aprovação ou recuperação de valores.</p>
      </div>
      <p className="mt-8 border-t border-dashed border-line-strong pt-5 text-sm leading-relaxed text-ink-soft">
        Se preferir um bloqueio efetivo, a autoexclusão oficial do Governo Federal fica em{" "}
        <a
          href="https://gov.br/autoexclusaoapostas"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-navy-700 underline underline-offset-2"
        >
          gov.br/autoexclusaoapostas
        </a>
        . Ela encerra as contas nas plataformas autorizadas; guarde antes uma cópia dos seus históricos.
      </p>
    </>
  );
}

// ─── Dados do solicitante ─────────────────────────────────────────────────
export function ContactStep({
  data,
  update,
  headingRef,
  showErrors,
  cpfLocked,
  serverError,
}: {
  data: WizardData;
  update: Update;
  headingRef: HeadingRef;
  showErrors: boolean;
  /** Já existe ComprovaBet enviado com este CPF: para trocar o CPF, é preciso remover o arquivo. */
  cpfLocked: boolean;
  serverError?: string | null;
}) {
  const errors = showErrors ? contactErrors(data) : {};
  const cpfError = errors.cpf ?? serverError ?? null;
  const savedCpf = Boolean(data.cpfMasked) && !data.cpf;
  return (
    <>
      <StepHeading headingRef={headingRef} id="q-contact" title="Seus dados" subtitle="Usamos apenas para esta solicitação." />
      <div className="space-y-5">
        <Field label="Nome completo" htmlFor="fullName" error={errors.fullName}>
          <TextInput id="fullName" autoComplete="name" maxLength={120} value={data.fullName} onChange={(e) => update({ fullName: e.target.value })} />
        </Field>
        {savedCpf ? (
          <div>
            <p className="block text-sm font-medium text-ink">CPF</p>
            <div className="mt-1.5 flex min-h-[3.25rem] items-center justify-between gap-3 rounded-xl border border-line-strong bg-paper px-3.5">
              <span className="text-base tabular-nums tracking-wide text-ink">{data.cpfMasked}</span>
              {!cpfLocked && (
                <button
                  type="button"
                  onClick={() => update({ cpfMasked: null, cpf: "" })}
                  className="rounded-md px-1.5 py-0.5 text-sm font-medium text-navy-700 hover:bg-navy-50"
                >
                  Alterar
                </button>
              )}
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              {cpfLocked ? "Para alterar o CPF, remova antes o ComprovaBet enviado na próxima etapa." : "O mesmo CPF do seu ComprovaBet."}
            </p>
          </div>
        ) : (
          <Field label="CPF" htmlFor="cpf" error={cpfError} hint="O mesmo CPF do seu ComprovaBet. Usamos para conferir o documento.">
            <TextInput
              id="cpf"
              inputMode="numeric"
              autoComplete="off"
              placeholder="000.000.000-00"
              maxLength={14}
              value={maskCpfInput(data.cpf)}
              onChange={(e) => update({ cpf: cpfDigits(e.target.value).slice(0, 11) })}
              className="tabular-nums tracking-wide"
            />
          </Field>
        )}
        <Field label="E-mail" htmlFor="email" error={errors.email} hint="Você vai usar este e-mail e o protocolo para acompanhar a análise.">
          <TextInput
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            maxLength={160}
            value={data.email}
            onChange={(e) => update({ email: e.target.value })}
          />
        </Field>
        <Field label="WhatsApp" htmlFor="whatsapp" error={errors.whatsapp}>
          <TextInput
            id="whatsapp"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="(00) 00000-0000"
            value={data.whatsapp}
            onChange={(e) => update({ whatsapp: maskPhoneInput(e.target.value) })}
          />
        </Field>
        <div>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-surface p-4">
            <input
              type="checkbox"
              checked={data.isAdult}
              onChange={(e) => update({ isAdult: e.target.checked })}
              className="mt-0.5 size-5 shrink-0 accent-navy-900"
            />
            <span className="text-[0.98rem] text-ink">Confirmo que tenho 18 anos ou mais.</span>
          </label>
          {errors.isAdult && <p className="mt-1.5 text-xs font-medium text-danger-700">{errors.isAdult}</p>}
        </div>
      </div>
    </>
  );
}

// ─── Revisão ──────────────────────────────────────────────────────────────
function ReviewRow({ label, children, onEdit }: { label: string; children: ReactNode; onEdit?: () => void }) {
  return (
    <div className="py-3.5">
      <div className="flex items-center justify-between gap-3">
        <dt className="text-sm text-muted">{label}</dt>
        {onEdit && (
          <button type="button" onClick={onEdit} className="rounded-md px-1.5 py-0.5 text-sm font-medium text-navy-700 hover:bg-navy-50">
            Alterar
          </button>
        )}
      </div>
      <dd className="mt-0.5 font-medium text-ink">{children}</dd>
    </div>
  );
}

const Accepted = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex items-center gap-1.5 text-ok-700">
    <IconCheck size={17} strokeWidth={2.5} />
    {children}
  </span>
);

export function ReviewStep({
  data,
  headingRef,
  platformNames,
  fileCount,
  year,
  goTo,
}: {
  data: WizardData;
  headingRef: HeadingRef;
  platformNames: string[];
  fileCount: number | null;
  year: number;
  goTo: (s: Screen) => void;
}) {
  const { loss } = declaredLoss(data);
  return (
    <>
      <StepHeading headingRef={headingRef} id="q-review" title="Confira sua solicitação" />
      <dl className="divide-y divide-line rounded-2xl border border-line bg-surface px-5 shadow-soft">
        <ReviewRow label="Seus dados" onEdit={() => goTo("contact")}>
          <span className="block">{data.fullName}</span>
          <span className="block font-normal tabular-nums tracking-wide text-ink-soft">CPF {data.cpfMasked ?? "—"}</span>
          <span className="block font-normal text-ink-soft">{data.email}</span>
          <span className="block font-normal text-ink-soft">{data.whatsapp}</span>
        </ReviewRow>
        <ReviewRow label={`ComprovaBet ${year}`} onEdit={() => goTo("documents")}>
          {fileCount === null ? <span className="font-normal text-muted">Carregando…</span> : plural(fileCount, "arquivo enviado", "arquivos enviados")}
        </ReviewRow>
        <ReviewRow label="Tipo" onEdit={() => goTo("type")}>
          {data.betType ? BET_TYPE_SUMMARY[data.betType] : "—"}
        </ReviewRow>
        <ReviewRow label="Plataformas" onEdit={() => goTo("platforms")}>
          {platformNames.join(", ") || "—"}
        </ReviewRow>
        <ReviewRow label={`Total depositado informado (${year})`} onEdit={() => goTo("amounts")}>
          <span className="tabular-nums">{formatBRL(data.depositsCents ?? 0)}</span>
        </ReviewRow>
        <ReviewRow label={`Total sacado informado (${year})`} onEdit={() => goTo("amounts")}>
          <span className="tabular-nums">{formatBRL(data.withdrawalsCents ?? 0)}</span>
        </ReviewRow>
        {data.hasBalance && (
          <ReviewRow label="Saldo informado" onEdit={() => goTo("balance")}>
            <span className="tabular-nums">{formatBRL(data.balanceCents ?? 0)}</span>
          </ReviewRow>
        )}
        <ReviewRow label="O que aconteceu" onEdit={() => goTo("control")}>
          <span className="block">{data.controlLoss ? CONTROL_LOSS_SUMMARY[data.controlLoss] : "—"}</span>
          {currentSituations(data).map((s) => (
            <span key={s} className="block text-sm font-normal text-ink-soft">
              {s === "other" && data.situationOther.trim() ? `Outro: ${data.situationOther.trim()}` : labelFor(SITUATIONS, s)}
            </span>
          ))}
        </ReviewRow>
        <ReviewRow label="Perda líquida declarada">
          <span className="text-xl font-semibold tabular-nums">{formatBRL(loss)}</span>
          <span className="block text-xs font-normal text-muted">Estimativa baseada nos valores informados.</span>
        </ReviewRow>
        <ReviewRow label="Compromisso voluntário">
          <Accepted>Aceito</Accepted>
        </ReviewRow>
        <ReviewRow label="Tratamento de dados">
          <Accepted>Autorizado</Accepted>
        </ReviewRow>
      </dl>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        Cada caso é analisado individualmente. A análise não garante recuperação, restituição ou recebimento de valores. Na próxima
        tela, você confere o valor e faz o pagamento da análise; a solicitação é enviada depois da confirmação do pagamento.
      </p>
    </>
  );
}

// ─── Pagamento da análise (antes da solicitação) ──────────────────────────
export type PaymentSettings = {
  /** Gateway e valor configurados. */
  available: boolean;
  priceCents: number | null;
  /** Formas de pagamento e quem processa (ou o aviso da demonstração), abaixo do valor. */
  note: string;
};

/** Situação do pagamento: fica no topo da tela para ser vista logo na volta do checkout. */
function PaymentStatus({
  payment,
  available,
  checking,
  onCheck,
}: {
  payment: PaymentState | null;
  available: boolean;
  checking: boolean;
  onCheck: () => void;
}) {
  const status = payment?.status ?? "none";
  if (status === "approved") {
    return (
      <Notice tone="ok">
        <span className="flex items-start gap-2">
          <IconCheck size={18} strokeWidth={2.5} className="mt-0.5 shrink-0" />
          <span>
            <strong className="font-semibold">Pagamento confirmado</strong>
            {payment?.paidAt ? ` em ${formatDateTime(payment.paidAt)}` : ""}
            {payment?.method ? ` · ${paymentMethodLabel(payment.method)}` : ""}.
            <span className="mt-0.5 block text-ink-soft">
              {payment?.protocol
                ? `Sua solicitação já está registrada com o protocolo ${payment.protocol}. Toque em Solicitar análise para concluir.`
                : "Toque em Solicitar análise para concluir."}
            </span>
          </span>
        </span>
      </Notice>
    );
  }
  if (!available) {
    return (
      <Notice tone="warn">
        O pagamento está indisponível no momento. Suas respostas ficam salvas neste aparelho: volte mais tarde para concluir.
      </Notice>
    );
  }
  if (status === "pending") {
    return (
      <Notice tone="info">
        <p>
          <strong className="font-semibold">Aguardando a confirmação do pagamento.</strong> Se você já pagou, a confirmação pode levar alguns
          instantes. Se ainda não concluiu, toque em Retomar pagamento.
        </p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={onCheck} loading={checking}>
          Verificar pagamento
        </Button>
      </Notice>
    );
  }
  if (status === "rejected") return <Notice tone="danger">O pagamento não foi aprovado. Você pode tentar de novo com Pix ou com outro cartão.</Notice>;
  if (status === "refunded") return <Notice tone="warn">O pagamento anterior foi estornado. Para solicitar a análise, faça um novo pagamento.</Notice>;
  if (status === "cancelled") return <Notice tone="warn">O pagamento anterior não foi concluído. Você pode tentar novamente.</Notice>;
  return null;
}

export function PaymentStep({
  data,
  update,
  headingRef,
  settings,
  payment,
  checking,
  showErrors,
  onCheck,
}: {
  data: WizardData;
  update: Update;
  headingRef: HeadingRef;
  settings: PaymentSettings;
  payment: PaymentState | null;
  checking: boolean;
  showErrors: boolean;
  onCheck: () => void;
}) {
  const paid = payment?.status === "approved";
  const accepted = paid || data.termsAccepted;
  const missingAccept = showErrors && !accepted;
  return (
    <>
      <StepHeading
        headingRef={headingRef}
        id="q-payment"
        title="Pagamento da análise"
        subtitle={
          paid
            ? "Pagamento confirmado. Agora é só solicitar a análise."
            : "Confira o valor, leia o aviso e marque o aceite. Depois da confirmação do pagamento, o botão Solicitar análise é liberado."
        }
      />

      <div className="mb-5 empty:mb-0" aria-live="polite">
        <PaymentStatus payment={payment} available={settings.available} checking={checking} onCheck={onCheck} />
      </div>

      <div className="rounded-2xl border border-line bg-surface px-5 py-4 shadow-soft">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-sm text-ink-soft">Valor da análise</span>
          <span className="text-2xl font-semibold tabular-nums text-ink">
            {settings.priceCents !== null ? formatBRL(settings.priceCents) : "—"}
          </span>
        </div>
        <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-muted">
          <IconLock size={14} className="mt-px shrink-0" />
          <span>{settings.note}</span>
        </p>
      </div>

      <section className="mt-4 rounded-2xl border border-warn-700/25 bg-warn-50 p-5" aria-labelledby="payment-notice-title">
        <p id="payment-notice-title" className="flex items-center gap-2 text-base font-semibold text-warn-700">
          <IconAlert size={19} /> Importante
        </p>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-ink">{PAYMENT_NOTICE}</p>
      </section>

      <label
        className={cx(
          "mt-4 flex items-start gap-3 rounded-2xl border p-4 transition-colors",
          paid
            ? "border-line bg-surface"
            : accepted
              ? "cursor-pointer border-navy-900 bg-navy-50 shadow-[inset_0_0_0_1px_var(--color-navy-900)]"
              : missingAccept
                ? "cursor-pointer border-danger-700/40 bg-danger-50"
                : "cursor-pointer border-line-strong bg-surface",
        )}
      >
        <input
          type="checkbox"
          checked={accepted}
          disabled={paid}
          onChange={(e) => update({ termsAccepted: e.target.checked })}
          aria-invalid={missingAccept || undefined}
          className="mt-0.5 size-5 shrink-0 accent-navy-900"
        />
        <span className="text-[0.95rem] leading-relaxed text-ink">{SERVICE_TERMS_CHECKBOX}</span>
      </label>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        {payment?.termsAcceptedAt
          ? `Aceite registrado em ${formatDateTime(payment.termsAcceptedAt)}. `
          : "O aceite fica registrado com data e hora ao abrir o pagamento. "}
        Leia as condições completas nos{" "}
        <Link href="/termos" target="_blank" className="font-medium text-navy-700 underline underline-offset-2">
          Termos de Uso
        </Link>
        .
      </p>
    </>
  );
}

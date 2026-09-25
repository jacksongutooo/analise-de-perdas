"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import { cx } from "@/lib/cx";
import { plural } from "@/lib/format";
import { DOC_CATEGORIES, INITIAL_DOC_CATEGORY_VALUES, NO_PASSWORD_NOTICE, PRIVACY_CONSENT_TEXT, type InitialDocCategory } from "@/lib/options";
import { IconCheck, IconLock, IconPlus } from "../icons";
import { Button, Notice } from "../ui";
import { FileRow, type FileRowItem } from "../upload/FileRow";
import { ACCEPT_ATTRIBUTE, preflightError, shrinkImageIfNeeded, tempId, uploadWithProgress } from "../upload/upload-client";
import { StepHeading } from "./steps";
import { draftHeaders, type DraftCreds, type DraftFile, type WizardData } from "./state";

type Pending = { key: string; name: string; size: number; platform: string; progress: number; error: string | null };

const categoryLabel = (value: string) => DOC_CATEGORIES.find((c) => c.value === value)?.label ?? "Documento";
const INITIAL_CATEGORIES = DOC_CATEGORIES.filter((c) => (INITIAL_DOC_CATEGORY_VALUES as readonly string[]).includes(c.value));

export function DocumentsStep({
  data,
  update,
  headingRef,
  platformNames,
  files,
  setFiles,
  ensureDraft,
  getDraft,
  onDraftInvalid,
  setBusy,
  maxUploadMb,
  notice,
  loadingFiles = false,
}: {
  data: WizardData;
  update: (patch: Partial<WizardData>) => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
  platformNames: string[];
  files: DraftFile[];
  setFiles: Dispatch<SetStateAction<DraftFile[]>>;
  ensureDraft: () => Promise<DraftCreds>;
  getDraft: () => DraftCreds | null;
  onDraftInvalid: () => void;
  setBusy: (busy: boolean) => void;
  maxUploadMb: number;
  notice: string | null;
  loadingFiles?: boolean;
}) {
  const [pending, setPending] = useState<Pending[]>([]);
  const [categories, setCategories] = useState<Record<string, InitialDocCategory>>({});
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const maxBytes = maxUploadMb * 1024 * 1024;

  useEffect(() => {
    setBusy(pending.some((p) => p.error === null));
  }, [pending, setBusy]);
  useEffect(() => () => setBusy(false), [setBusy]);

  const patchPending = (key: string, patch: Partial<Pending>) => setPending((list) => list.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  async function handleFiles(platform: string, list: FileList | null) {
    const selected = list ? Array.from(list) : [];
    const input = inputs.current[platform];
    if (input) input.value = "";
    const category = categories[platform] ?? "financial_history";
    for (const original of selected) {
      const key = tempId();
      setPending((p) => [...p, { key, name: original.name, size: original.size, platform, progress: 0, error: null }]);
      const fail = (error: string) => patchPending(key, { error });

      const invalid = preflightError(original);
      if (invalid) {
        fail(invalid);
        continue;
      }
      if (files.some((f) => f.platform === platform && f.name === original.name && f.size === original.size)) {
        fail("Este arquivo já foi enviado.");
        continue;
      }
      const file = await shrinkImageIfNeeded(original, maxBytes);
      if (file.size > maxBytes) {
        fail(`Arquivo maior que ${maxUploadMb} MB. Envie uma versão menor ou dividida.`);
        continue;
      }
      let creds: DraftCreds;
      try {
        creds = await ensureDraft();
      } catch (error) {
        fail(error instanceof Error ? error.message : "Não foi possível iniciar o envio.");
        continue;
      }
      const form = new FormData();
      form.append("file", file);
      form.append("platform", platform);
      form.append("category", category);
      const res = await uploadWithProgress("/api/draft/files", form, draftHeaders(creds), (progress) => patchPending(key, { progress }));
      if (res.status === 201 && res.body.file) {
        setFiles((current) => [...current, res.body.file as DraftFile]);
        setPending((p) => p.filter((item) => item.key !== key));
      } else {
        if (res.status === 401) onDraftInvalid();
        fail(res.body.error ?? "Não foi possível enviar o arquivo. Tente novamente.");
      }
    }
  }

  async function removeFile(id: string) {
    const creds = getDraft();
    if (!creds) return;
    const res = await fetch(`/api/draft/files/${id}`, { method: "DELETE", headers: draftHeaders(creds) });
    if (res.ok || res.status === 404) {
      setFiles((current) => current.filter((f) => f.id !== id));
      return;
    }
    if (res.status === 401) {
      onDraftInvalid();
      return;
    }
    throw new Error("Não foi possível remover o arquivo. Tente novamente.");
  }

  const lowerNames = platformNames.map((n) => n.toLowerCase());
  const orphans = files.filter((f) => !f.platform || !lowerNames.includes(f.platform.toLowerCase()));

  const itemsFor = (platform: string): FileRowItem[] => [
    ...files
      .filter((f) => f.platform?.toLowerCase() === platform.toLowerCase())
      .map((f) => ({ key: f.id, name: f.name, size: f.size, meta: categoryLabel(f.category) })),
    ...pending
      .filter((p) => p.platform === platform)
      .map((p) => ({ key: p.key, name: p.name, size: p.size, progress: p.progress, error: p.error, uploading: p.error === null })),
  ];

  return (
    <>
      <StepHeading
        headingRef={headingRef}
        id="q-documents"
        title="Comprove Bet anual do período de 2025"
        subtitle="Envie o resumo anual das movimentações em seu nome e com o mesmo CPF informado no cadastro."
      />
      {notice && (
        <Notice tone="warn" className="mb-5">
          {notice}
        </Notice>
      )}

      <div className="rounded-2xl border border-line bg-surface px-4 py-4 shadow-soft sm:px-5">
        <p className="text-sm font-semibold text-ink">O que precisamos receber:</p>
        <ol className="mt-3 space-y-1.5 text-sm leading-relaxed text-ink-soft">
          <li className="flex gap-2.5">
            <span className="w-4 shrink-0 text-muted tabular-nums">1.</span>Comprove Bet ou resumo anual das movimentações
          </li>
          <li className="flex gap-2.5">
            <span className="w-4 shrink-0 text-muted tabular-nums">2.</span>Período de 2025
          </li>
          <li className="flex gap-2.5">
            <span className="w-4 shrink-0 text-muted tabular-nums">3.</span>Mesmo CPF do solicitante no cadastro
          </li>
          <li className="flex gap-2.5">
            <span className="w-4 shrink-0 text-muted tabular-nums">4.</span>Documentos complementares somente se a equipe solicitar
          </li>
        </ol>
        <p className="mt-3 border-t border-dashed border-line-strong pt-3 text-xs leading-relaxed text-muted">
          PDF, CSV, XLSX, JPG ou PNG, até {maxUploadMb} MB por arquivo. O documento deve ser legível e estar em nome do mesmo CPF informado na solicitação.
        </p>
      </div>

      <div className="mt-4 rounded-2xl border border-ok-600/20 bg-ok-50 px-4 py-3 sm:px-5">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ok-700">Importante</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Para prosseguir, o Comprove Bet precisa corresponder ao mesmo CPF do solicitante e ao período informado. Caso a documentação esteja inconsistente, a equipe pode solicitar novos documentos ou encerrar o caso para revisão.
        </p>
      </div>

      <label
        className={cx(
          "mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors",
          data.privacyConsent ? "border-ok-600/30 bg-ok-50" : "border-line-strong bg-surface",
        )}
      >
        <input
          type="checkbox"
          checked={data.privacyConsent}
          onChange={(e) => update({ privacyConsent: e.target.checked })}
          className="mt-0.5 size-5 shrink-0 accent-navy-900"
        />
        <span className="text-[0.95rem] leading-relaxed text-ink">
          {PRIVACY_CONSENT_TEXT}{" "}
          <Link href="/privacidade" target="_blank" className="whitespace-nowrap font-medium text-navy-700 underline underline-offset-2">
            Política de Privacidade
          </Link>
        </span>
      </label>

      {loadingFiles && <p className="mt-4 text-sm text-muted">Carregando os arquivos já enviados…</p>}

      <div className="mt-5 space-y-4">
        {platformNames.map((platform, index) => {
          const items = itemsFor(platform);
          const sent = files.filter((f) => f.platform?.toLowerCase() === platform.toLowerCase()).length;
          const current = categories[platform] ?? "financial_history";
          return (
            <section key={platform} className="rounded-2xl border border-line bg-surface p-4 shadow-soft sm:p-5" aria-labelledby={`platform-${index}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id={`platform-${index}`} className="text-base font-semibold text-ink">
                    {platform}
                  </h2>
                  <p className="text-sm text-muted">Histórico financeiro</p>
                </div>
                {sent > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-ok-50 px-2.5 py-1 text-xs font-medium text-ok-700">
                    <IconCheck size={13} strokeWidth={2.5} />
                    {plural(sent, "arquivo", "arquivos")}
                  </span>
                )}
              </div>

              <div className="mt-4" role="radiogroup" aria-label={`Tipo de documento para ${platform}`}>
                <p className="text-xs font-medium text-muted">O que você está enviando?</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {INITIAL_CATEGORIES.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      role="radio"
                      aria-checked={current === c.value}
                      onClick={() => setCategories((prev) => ({ ...prev, [platform]: c.value as InitialDocCategory }))}
                      className={cx(
                        "rounded-full border px-3 py-1.5 text-sm transition-colors",
                        current === c.value ? "border-navy-900 bg-navy-900 text-white" : "border-line-strong text-ink-soft hover:border-navy-600",
                      )}
                    >
                      {c.short}
                    </button>
                  ))}
                </div>
              </div>

              <input
                ref={(el) => {
                  inputs.current[platform] = el;
                }}
                type="file"
                accept={ACCEPT_ATTRIBUTE}
                multiple
                tabIndex={-1}
                className="sr-only"
                aria-hidden="true"
                onChange={(e) => handleFiles(platform, e.target.files)}
              />
              <Button variant="secondary" className="mt-4 w-full" disabled={!data.privacyConsent} onClick={() => inputs.current[platform]?.click()}>
                <IconPlus size={18} /> Enviar arquivo
              </Button>
              {!data.privacyConsent && <p className="mt-2 text-xs text-muted">Marque a autorização acima para enviar arquivos.</p>}

              {items.length > 0 && (
                <ul className="mt-3 divide-y divide-line">
                  {items.map((item) => (
                    <FileRow
                      key={item.key}
                      item={item}
                      onRemove={item.uploading || item.error ? undefined : () => removeFile(item.key)}
                      onDismiss={item.error ? () => setPending((p) => p.filter((x) => x.key !== item.key)) : undefined}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}

        {orphans.length > 0 && (
          <section className="rounded-2xl border border-warn-700/20 bg-warn-50 p-4 sm:p-5">
            <h2 className="text-base font-semibold text-warn-700">Arquivos de plataformas desmarcadas</h2>
            <p className="mt-1 text-sm text-warn-700">
              Estes arquivos não serão enviados. Remova-os ou marque a plataforma novamente na etapa 2.
            </p>
            <ul className="mt-3 divide-y divide-warn-700/15">
              {orphans.map((f) => (
                <FileRow
                  key={f.id}
                  item={{ key: f.id, name: f.name, size: f.size, meta: f.platform ?? undefined }}
                  onRemove={() => removeFile(f.id)}
                />
              ))}
            </ul>
          </section>
        )}
      </div>

      <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-muted">
        <IconLock size={15} className="mt-0.5 shrink-0" />
        {NO_PASSWORD_NOTICE}
      </p>
    </>
  );
}

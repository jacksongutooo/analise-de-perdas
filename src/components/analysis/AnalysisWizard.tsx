"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BetTypeValue } from "@/lib/options";
import { IconCheck, IconX } from "../icons";
import { Logo } from "../site";
import { Button } from "../ui";
import { DocumentsStep } from "./DocumentsStep";
import {
  EMPTY_DATA,
  FIELD_SCREEN,
  SCREENS,
  TOTAL_STEPS,
  attachedFiles,
  buildPayload,
  clearProgress,
  draftHeaders,
  loadProgress,
  resumeScreen,
  saveProgress,
  screenError,
  selectedPlatformNames,
  type DraftCreds,
  type DraftFile,
  type Screen,
  type WizardData,
} from "./state";
import {
  AmountsStep,
  BalanceStep,
  CommitmentStep,
  ContactStep,
  PeriodStep,
  PlatformsStep,
  ReviewStep,
  SituationStep,
  TypeDetailStep,
  TypeStep,
} from "./steps";

export type WizardSettings = { maxUploadMb: number; reviewDays: number };

export function AnalysisWizard({ settings }: { settings: WizardSettings }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>("type");
  const [data, setData] = useState<WizardData>(EMPTY_DATA);
  const [draft, setDraftState] = useState<DraftCreds | null>(null);
  const [files, setFiles] = useState<DraftFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [resumed, setResumed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filesLoading, setFilesLoading] = useState(false);

  const draftRef = useRef<DraftCreds | null>(null);
  const restoredDraftId = useRef<string | null>(null);
  const draftPromise = useRef<Promise<DraftCreds> | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const advanceTimer = useRef<number | null>(null);
  const finished = useRef(false);
  const latest = useRef<{ screen: Screen; data: WizardData; draft: DraftCreds | null } | null>(null);

  const setDraft = useCallback((creds: DraftCreds | null) => {
    draftRef.current = creds;
    setDraftState(creds);
  }, []);

  // Retoma o preenchimento salvo neste navegador.
  useEffect(() => {
    const saved = loadProgress();
    if (saved) {
      setData(saved.data);
      setDraft(saved.draft);
      restoredDraftId.current = saved.draft?.id ?? null;
      setScreen(resumeScreen(saved.screen, saved.data));
      setSavedAt(saved.savedAt);
      setResumed(saved.screen !== "type");
    }
    setReady(true);
  }, [setDraft]);

  // Salvamento automático a cada alteração.
  useEffect(() => {
    if (!ready || finished.current) return;
    latest.current = { screen, data, draft };
    const timeout = window.setTimeout(() => {
      const now = Date.now();
      if (saveProgress({ v: 1, screen, data, draft, savedAt: now })) setSavedAt(now);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [ready, screen, data, draft]);

  // Garante o salvamento se a página for fechada ou recarregada antes do intervalo acima.
  useEffect(() => {
    const flush = () => {
      if (latest.current && !finished.current) saveProgress({ v: 1, ...latest.current, savedAt: Date.now() });
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);

  const invalidateDraft = useCallback(() => {
    restoredDraftId.current = null;
    setDraft(null);
    draftPromise.current = null;
    setFiles([]);
    setNotice("Sua sessão de envio anterior expirou. Envie os arquivos novamente.");
  }, [setDraft]);

  // Ao retomar um preenchimento salvo, busca os arquivos já enviados (ex.: ao voltar outro dia).
  // Só para o rascunho restaurado: num rascunho novo, a lista local já é a fonte certa.
  const draftId = draft?.id ?? null;
  useEffect(() => {
    const creds = draftRef.current;
    if (!ready || !draftId || !creds || draftId !== restoredDraftId.current) {
      setFilesLoading(false);
      return;
    }
    let cancelled = false;
    setFilesLoading(true);
    fetch("/api/draft/files", { headers: draftHeaders(creds), cache: "no-store" })
      .then(async (res) => {
        if (cancelled) return;
        if (res.ok) {
          const body = (await res.json()) as { files?: DraftFile[] };
          setFiles((current) => {
            const known = new Set(current.map((f) => f.id));
            return [...current, ...(body.files ?? []).filter((f) => !known.has(f.id))];
          });
        } else if (res.status === 401) {
          invalidateDraft();
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setFilesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, draftId, invalidateDraft]);

  // Avisa antes de sair da página durante um envio.
  useEffect(() => {
    if (!busy) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [busy]);

  const ensureDraft = useCallback(async (): Promise<DraftCreds> => {
    if (draftRef.current) return draftRef.current;
    if (!draftPromise.current) {
      draftPromise.current = (async () => {
        const res = await fetch("/api/draft", { method: "POST" });
        const body = (await res.json().catch(() => ({}))) as { id?: string; token?: string; error?: string };
        if (!res.ok || !body.id || !body.token) throw new Error(body.error ?? "Não foi possível iniciar o envio. Tente novamente.");
        const creds = { id: body.id, token: body.token };
        setDraft(creds);
        return creds;
      })().finally(() => {
        draftPromise.current = null;
      });
    }
    return draftPromise.current;
  }, [setDraft]);

  const getDraft = useCallback(() => draftRef.current, []);

  const index = Math.max(0, SCREENS.findIndex((s) => s.id === screen));
  const meta = SCREENS[index] ?? SCREENS[0]!;
  const platformNames = useMemo(() => selectedPlatformNames(data), [data]);
  const attached = useMemo(() => attachedFiles(files, platformNames), [files, platformNames]);
  const progress = Math.round(((index + 1) / SCREENS.length) * 100);

  const goTo = useCallback((target: Screen) => {
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    setError(null);
    setAttempted(false);
    setResumed(false);
    setScreen(target);
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    if (ready) headingRef.current?.focus({ preventScroll: true });
  }, [screen, ready]);

  const update = useCallback((patch: Partial<WizardData>) => {
    setData((current) => ({ ...current, ...patch }));
    setError(null);
  }, []);

  const advanceFrom = (from: Screen) => {
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(() => {
      const i = SCREENS.findIndex((s) => s.id === from);
      const target = SCREENS[i + 1];
      if (target) goTo(target.id);
    }, 260);
  };

  const chooseType = (value: BetTypeValue) => {
    update(value === data.betType ? { betType: value } : { betType: value, sportsKind: null, casinoGames: [], mainLossArea: null });
    advanceFrom("type");
  };

  async function submit() {
    const ctx = { fileCount: attached.length, busy };
    const invalid = SCREENS.find((s) => s.id !== "review" && screenError(s.id, data, ctx));
    if (invalid) {
      goTo(invalid.id);
      setAttempted(true);
      setError(screenError(invalid.id, data, ctx));
      return;
    }
    const creds = draftRef.current;
    if (!creds) {
      goTo("documents");
      setError("Envie ao menos um documento.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...draftHeaders(creds) },
        body: JSON.stringify(buildPayload(data)),
      });
      const body = (await res.json().catch(() => ({}))) as { protocol?: string; error?: string; field?: string };
      if (res.ok && body.protocol) {
        finished.current = true;
        clearProgress();
        router.replace("/analise/recebida");
        return;
      }
      const message = body.error ?? "Não foi possível enviar agora. Tente novamente.";
      if (res.status === 401 || res.status === 410) {
        invalidateDraft();
        goTo("documents");
      } else {
        const target = body.field ? FIELD_SCREEN[body.field.split(".")[0] ?? ""] : undefined;
        if (target) {
          goTo(target);
          setAttempted(true);
        }
      }
      setError(message);
    } catch {
      setError("Sem conexão. Verifique sua internet e tente novamente.");
    } finally {
      if (!finished.current) setSubmitting(false);
    }
  }

  function next() {
    if (filesLoading && (screen === "documents" || screen === "review")) return;
    const message = screenError(screen, data, { fileCount: attached.length, busy });
    if (message) {
      setError(message);
      setAttempted(true);
      return;
    }
    if (screen === "review") {
      void submit();
      return;
    }
    const target = SCREENS[index + 1];
    if (target) goTo(target.id);
  }

  function back() {
    const previous = SCREENS[index - 1];
    if (previous) goTo(previous.id);
    else router.push("/");
  }

  async function restart() {
    if (!window.confirm("Recomeçar do início? As respostas e os arquivos enviados até agora serão apagados.")) return;
    const creds = draftRef.current;
    if (creds) await fetch("/api/draft", { method: "DELETE", headers: draftHeaders(creds) }).catch(() => undefined);
    clearProgress();
    setData(EMPTY_DATA);
    setDraft(null);
    setFiles([]);
    setNotice(null);
    setSavedAt(null);
    goTo("type");
  }

  function renderScreen() {
    const common = { data, update, headingRef };
    switch (screen) {
      case "type":
        return <TypeStep data={data} headingRef={headingRef} onChoose={chooseType} />;
      case "typeDetail":
        return <TypeDetailStep {...common} onSingleChoice={() => advanceFrom("typeDetail")} />;
      case "platforms":
        return <PlatformsStep {...common} />;
      case "period":
        return <PeriodStep {...common} />;
      case "amounts":
        return <AmountsStep {...common} />;
      case "balance":
        return <BalanceStep {...common} />;
      case "situation":
        return <SituationStep {...common} />;
      case "documents":
        return (
          <DocumentsStep
            {...common}
            platformNames={platformNames}
            files={files}
            setFiles={setFiles}
            ensureDraft={ensureDraft}
            getDraft={getDraft}
            onDraftInvalid={invalidateDraft}
            setBusy={setBusy}
            maxUploadMb={settings.maxUploadMb}
            notice={notice}
            loadingFiles={filesLoading}
          />
        );
      case "commitment":
        return <CommitmentStep {...common} reviewDays={settings.reviewDays} />;
      case "contact":
        return <ContactStep {...common} showErrors={attempted} />;
      case "review":
        return (
          <ReviewStep
            data={data}
            headingRef={headingRef}
            platformNames={platformNames}
            fileCount={filesLoading ? null : attached.length}
            goTo={goTo}
          />
        );
    }
  }

  const stepLabel = meta.step ? `Etapa ${meta.step} de ${TOTAL_STEPS}` : meta.label;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-5 pt-3">
          <Logo compact />
          <div className="flex items-center gap-1">
            {ready && savedAt && (
              <span key={savedAt} className="fade-in inline-flex items-center gap-1 text-xs font-medium text-ok-700" aria-live="polite">
                <IconCheck size={14} strokeWidth={2.5} />
                Informações salvas
              </span>
            )}
            <Link href="/" className="ml-2 rounded-lg p-2 text-muted hover:bg-surface hover:text-ink" aria-label="Sair do formulário">
              <IconX size={20} />
            </Link>
          </div>
        </div>
        <div className="mx-auto max-w-xl px-5 pb-3 pt-3">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold text-ink">{ready ? stepLabel : " "}</span>
            <span className="text-muted tabular-nums">{ready ? `${progress}%` : ""}</span>
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-navy-100"
            role="progressbar"
            aria-label="Progresso da solicitação"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={ready ? progress : 0}
          >
            <div className="h-full rounded-full bg-navy-900 transition-[width] duration-500 ease-out" style={{ width: `${ready ? progress : 0}%` }} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-5 pb-40 pt-7 sm:pt-10">
        {!ready ? (
          <div className="space-y-3" aria-busy="true" aria-label="Carregando">
            <div className="h-9 w-3/4 animate-pulse rounded-lg bg-line" />
            <div className="h-20 animate-pulse rounded-2xl bg-line/70" />
            <div className="h-20 animate-pulse rounded-2xl bg-line/70" />
            <div className="h-20 animate-pulse rounded-2xl bg-line/70" />
          </div>
        ) : (
          <>
            {resumed && (
              <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm">
                <span className="text-ink-soft">Continuando de onde você parou.</span>
                <button type="button" onClick={restart} className="font-medium text-navy-700 hover:underline">
                  Recomeçar
                </button>
              </div>
            )}
            <div key={screen} className="step-in">
              {renderScreen()}
            </div>
            {error && (
              <p role="alert" className="mt-6 rounded-xl border border-danger-700/20 bg-danger-50 px-4 py-3 text-sm font-medium text-danger-700">
                {error}
              </p>
            )}
          </>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        <div className="mx-auto flex max-w-xl gap-3 px-5 py-3">
          <Button variant="secondary" onClick={back} className="w-[7.5rem] shrink-0" disabled={!ready || submitting}>
            Voltar
          </Button>
          <Button
            onClick={next}
            className="flex-1"
            disabled={!ready}
            loading={submitting || (filesLoading && (screen === "documents" || screen === "review"))}
          >
            {screen === "review" ? "Solicitar análise" : "Continuar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { IconCheck } from "@/components/icons";
import { PageShell } from "@/components/site";
import { LinkButton } from "@/components/ui";
import { getTrackingCaseId } from "@/lib/auth/tracking";
import { prisma } from "@/lib/db";
import { config } from "@/lib/env";

export const metadata: Metadata = { title: "Solicitação recebida", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function RecebidaPage() {
  const caseId = await getTrackingCaseId();
  const c = caseId ? await prisma.case.findUnique({ where: { id: caseId }, select: { protocol: true, isDemo: true } }) : null;
  if (!c || c.isDemo !== config.demoMode) redirect("/acompanhar");

  return (
    <PageShell showTracking={false}>
      <div className="step-in rounded-[1.75rem] border border-line bg-surface p-6 shadow-soft sm:p-8">
        <span className="grid size-12 place-items-center rounded-full bg-ok-50 text-ok-600">
          <IconCheck size={24} strokeWidth={2.5} />
        </span>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-ink">Solicitação recebida</h1>
        <p className="mt-2 text-lg text-ink-soft">Seu ComprovaBet foi enviado para a validação documental.</p>

        <div className="mt-7 rounded-2xl border border-dashed border-line-strong bg-paper px-5 py-4">
          <p className="text-sm text-muted">Protocolo</p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[2rem] font-semibold tracking-wide text-ink tabular-nums">{c.protocol}</p>
            <CopyButton text={c.protocol} />
          </div>
        </div>

        <p className="mt-6 font-semibold text-ink">Próximos passos</p>
        <ol className="mt-2 space-y-1.5 text-[0.95rem] text-ink-soft">
          <li className="flex gap-2.5">
            <span className="w-4 tabular-nums text-muted">1.</span>Validação do ComprovaBet pela equipe
          </li>
          <li className="flex gap-2.5">
            <span className="w-4 tabular-nums text-muted">2.</span>Pagamento da análise
          </li>
          <li className="flex gap-2.5">
            <span className="w-4 tabular-nums text-muted">3.</span>Análise do caso (prazo estimado de até {config.reviewDays} dias após o pagamento)
          </li>
        </ol>

        <LinkButton href="/acompanhar" size="lg" className="mt-8 w-full">
          Acompanhar análise
        </LinkButton>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Guarde o protocolo. Para acompanhar, use o protocolo e o e-mail informado na solicitação.
        </p>
      </div>
    </PageShell>
  );
}

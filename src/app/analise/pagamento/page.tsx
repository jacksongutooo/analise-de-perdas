import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { IconCheck } from "@/components/icons";
import { PaymentOptions } from "@/components/analysis/PaymentOptions";
import { PageShell } from "@/components/site";
import { Card, LinkButton, Notice } from "@/components/ui";
import { getTrackingCaseId } from "@/lib/auth/tracking";
import { prisma } from "@/lib/db";
import { config } from "@/lib/env";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Análise completa", robots: { index: false } };
export const dynamic = "force-dynamic";

function documentIndex(preliminaryIndex: number, status: string): number {
  if (preliminaryIndex > 0) return preliminaryIndex;
  return ["eligible", "preliminary_review", "waiting_payment", "payment_confirmed", "full_review"].includes(status) ? 92 : 0;
}

function Confirmation({ protocol, estimatedMinDate, estimatedMaxDate }: { protocol: string; estimatedMinDate: Date | null; estimatedMaxDate: Date | null }) {
  return (
    <Card className="step-in">
      <span className="grid size-12 place-items-center rounded-full bg-ok-50 text-ok-600"><IconCheck size={24} strokeWidth={2.5} /></span>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight text-ink">Pagamento confirmado</h1>
      <p className="mt-2 text-lg text-ink-soft">Seu caso foi encaminhado para análise completa.</p>
      <dl className="mt-7 divide-y divide-dashed divide-line-strong rounded-2xl border border-line bg-paper px-5">
        <div className="flex items-center justify-between gap-4 py-3"><dt className="text-sm text-muted">Protocolo</dt><dd className="font-semibold tracking-wide text-ink">{protocol}</dd></div>
        <div className="flex items-center justify-between gap-4 py-3"><dt className="text-sm text-muted">Prazo</dt><dd className="text-right font-medium text-ink">5 a 7 dias úteis</dd></div>
        <div className="flex items-center justify-between gap-4 py-3"><dt className="text-sm text-muted">Resultado</dt><dd className="text-right text-sm font-medium text-ink">Será enviado para o e-mail cadastrado.</dd></div>
      </dl>
      {estimatedMinDate && estimatedMaxDate && <p className="mt-4 text-sm text-muted">Previsão: {formatDate(estimatedMinDate)} a {formatDate(estimatedMaxDate)}.</p>}
      <LinkButton href="/acompanhar" size="lg" className="mt-8 w-full">Acompanhar minha análise</LinkButton>
    </Card>
  );
}

export default async function PagamentoPage({ searchParams }: { searchParams: Promise<{ erro?: string; status?: string }> }) {
  const caseId = await getTrackingCaseId();
  if (!caseId) redirect("/acompanhar");
  const params = await searchParams;
  const c = await prisma.case.findUnique({
    where: { id: caseId },
    select: {
      protocol: true,
      status: true,
      preliminaryIndex: true,
      isDemo: true,
      payment: { select: { status: true } },
      estimatedMinDate: true,
      estimatedMaxDate: true,
    },
  });
  if (!c || c.isDemo !== config.demoMode) redirect("/acompanhar");
  if (c.status === "full_review" || c.payment?.status === "paid") {
    return <PageShell showTracking={false}><Confirmation protocol={c.protocol} estimatedMinDate={c.estimatedMinDate} estimatedMaxDate={c.estimatedMaxDate} /></PageShell>;
  }
  if (!["eligible", "preliminary_review", "waiting_payment"].includes(c.status)) redirect("/acompanhar");

  const index = documentIndex(c.preliminaryIndex, c.status);
  return (
    <PageShell showTracking={false}>
      <div className="step-in space-y-5">
        <Card>
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-muted">Índice documental</p>
          <div className="mt-3 flex items-end justify-between gap-4"><h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Seu caso está pronto para análise completa</h1><strong className="shrink-0 text-3xl font-semibold tabular-nums text-ink sm:text-4xl">{index}%</strong></div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-navy-100"><div className="h-full rounded-full bg-navy-900" style={{ width: `${index}%` }} /></div>
          <ul className="mt-5 space-y-2 text-sm text-ink-soft">
            <li>✓ Histórico de depósitos identificado</li><li>✓ Histórico de saques identificado</li><li>✓ Informações principais preenchidas</li><li>✓ Documentação suficiente para prosseguir</li>
          </ul>
          <p className="mt-5 text-xs leading-relaxed text-muted">O índice representa a qualidade e completude das informações apresentadas e não constitui garantia de recuperação de valores.</p>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-ink">Análise completa do caso</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">Nossa equipe fará uma análise detalhada das informações e documentos enviados, com base em documentação consistente e no mesmo CPF do solicitante.</p>
          <dl className="mt-5 divide-y divide-dashed divide-line-strong">
            <div className="flex items-center justify-between gap-4 py-3"><dt className="text-sm text-muted">Prazo para resultado</dt><dd className="font-medium text-ink">5 a 7 dias úteis</dd></div>
            <div className="flex items-center justify-between gap-4 py-3"><dt className="text-sm text-muted">Entrega</dt><dd className="text-right text-sm font-medium text-ink">Resultado enviado para o e-mail cadastrado</dd></div>
          </dl>
          <div className="mt-5 border-t border-line pt-5"><p className="text-sm text-muted">Valor normal</p><p className="mt-1 text-3xl font-semibold text-ink">R$ 219,90</p></div>
          <p className="mt-5 text-xs leading-relaxed text-muted">O pagamento refere-se exclusivamente ao serviço de análise do caso. A contratação não garante recuperação, restituição ou recebimento de qualquer valor.</p>
          {params.erro === "aceite" && <Notice tone="warn" className="mt-4">Leia e aceite as condições do serviço antes de prosseguir.</Notice>}
          {params.status === "pending" && <Notice tone="info" className="mt-4">Pagamento registrado como pendente. A análise completa só começa após a confirmação do pagamento.</Notice>}
          <PaymentOptions />
        </Card>
      </div>
    </PageShell>
  );
}

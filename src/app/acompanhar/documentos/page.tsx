import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { IconChevronLeft } from "@/components/icons";
import { PageShell } from "@/components/site";
import { SubmitButton } from "@/components/SubmitButton";
import { AdditionalUpload } from "@/components/tracking/AdditionalUpload";
import { Notice } from "@/components/ui";
import { getTrackingCaseId } from "@/lib/auth/tracking";
import { prisma } from "@/lib/db";
import { config } from "@/lib/env";
import { REQUEST_REASONS, labelFor } from "@/lib/options";
import { finishAdditionalDocuments } from "../actions";

export const metadata: Metadata = { title: "Enviar documentos", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function DocumentosAdicionaisPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const caseId = await getTrackingCaseId();
  if (!caseId) redirect("/acompanhar");
  const c = await prisma.case.findUnique({
    where: { id: caseId },
    select: {
      protocol: true,
      isDemo: true,
      platforms: { select: { platform: { select: { id: true, name: true } } } },
      requests: {
        where: { status: "open" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          reasons: true,
          message: true,
          documents: { orderBy: { createdAt: "asc" }, select: { id: true, originalName: true, sizeBytes: true, category: true } },
        },
      },
    },
  });
  const request = c?.requests[0];
  if (!c || c.isDemo !== config.demoMode) redirect("/acompanhar");

  return (
    <PageShell showTracking={false}>
      <Link href="/acompanhar" className="-ml-2 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-navy-700 hover:bg-navy-50">
        <IconChevronLeft size={16} /> Caso {c.protocol}
      </Link>
      {!request ? (
        <div className="mt-6">
          <h1 className="text-3xl font-semibold tracking-tight">Nenhum documento pendente</h1>
          <p className="mt-2 text-ink-soft">No momento a equipe não solicitou documentos adicionais para este caso.</p>
        </div>
      ) : (
        <>
          <h1 className="mt-5 text-[1.9rem] font-semibold leading-tight tracking-tight text-ink">Precisamos de mais informações</h1>
          <p className="mt-2 text-ink-soft">Envie os documentos solicitados para continuarmos a análise.</p>

          <div className="mt-6 rounded-2xl border border-warn-700/20 bg-warn-50 px-5 py-4">
            <p className="text-sm font-semibold text-warn-700">O que precisamos</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-warn-700">
              {request.reasons.map((r) => (
                <li key={r}>{labelFor(REQUEST_REASONS, r)}</li>
              ))}
            </ul>
            {request.message && <p className="mt-3 whitespace-pre-line text-sm text-ink">{request.message}</p>}
          </div>

          <AdditionalUpload
            platforms={c.platforms.map((p) => p.platform)}
            maxUploadMb={config.maxUploadMb}
            initialFiles={request.documents.map((d) => ({ id: d.id, name: d.originalName, size: d.sizeBytes, category: d.category }))}
          />

          {erro === "vazio" && (
            <Notice tone="danger" className="mt-5">
              Envie ao menos um arquivo antes de concluir.
            </Notice>
          )}
          <form action={finishAdditionalDocuments} className="mt-6">
            <SubmitButton size="lg" className="w-full">
              Concluir envio
            </SubmitButton>
          </form>
          <p className="mt-3 text-sm text-muted">Ao concluir, seu caso volta para análise.</p>
        </>
      )}
    </PageShell>
  );
}

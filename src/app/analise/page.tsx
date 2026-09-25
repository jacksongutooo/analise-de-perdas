import type { Metadata } from "next";
import { AnalysisWizard } from "@/components/analysis/AnalysisWizard";
import { config } from "@/lib/env";

export const metadata: Metadata = { title: "Iniciar análise" };

export default function AnalisePage() {
  return (
    <AnalysisWizard
      settings={{ maxUploadMb: config.maxUploadMb, reviewDays: config.reviewDays, comprovabetYear: config.comprovabetYear }}
    />
  );
}

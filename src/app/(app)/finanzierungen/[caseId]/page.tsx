import { FeatureComingSoon } from "@/components/shell/FeatureComingSoon";

export const metadata = {
  title: "Finanzierungs-Case · Objektpilot",
};

// V1: deferred area — soft-gated (matches /finanzierungen). The real detail view
// + data layer stay in the codebase (CaseDetailView, lib/data/finanzierung).
// To re-enable, restore the original wiring:
//
//   import { notFound } from "next/navigation";
//   import { getCase, listCaseKommentare } from "@/lib/data/finanzierung";
//   import { CaseDetailView } from "@/components/finanzierung/CaseDetailView";
//
//   export default async function CaseDetailPage({ params }: { params: Promise<{ caseId: string }> }) {
//     const { caseId } = await params;
//     let caseData;
//     try { caseData = await getCase({ caseId }); } catch { notFound(); }
//     const kommentare = await listCaseKommentare({ caseId });
//     return <CaseDetailView caseData={caseData} kommentare={kommentare} />;
//   }
export default function CaseDetailPage() {
  return <FeatureComingSoon title="Finanzierungen" />;
}

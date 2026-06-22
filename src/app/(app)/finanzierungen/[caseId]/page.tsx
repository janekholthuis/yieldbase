import { notFound } from "next/navigation";
import { getCase, listCaseKommentare } from "@/lib/data/finanzierung";
import { CaseDetailView } from "@/components/finanzierung/CaseDetailView";

export const metadata = {
  title: "Finanzierungs-Case · Objektpilot",
};

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  // The comments don't depend on the case row — load both in parallel.
  const [caseResult, kommentare] = await Promise.all([
    getCase({ caseId }).then(
      (data) => ({ data, ok: true as const }),
      () => ({ data: null, ok: false as const }),
    ),
    listCaseKommentare({ caseId }),
  ]);
  if (!caseResult.ok || !caseResult.data) {
    notFound();
  }
  return <CaseDetailView caseData={caseResult.data} kommentare={kommentare} />;
}

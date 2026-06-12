import { notFound } from "next/navigation";
import { getCase, listCaseKommentare } from "@/lib/data/finanzierung";
import { CaseDetailView } from "@/components/finanzierung/CaseDetailView";

export const metadata = {
  title: "Finanzierungs-Case · Erfolg mit Immobilien",
};

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;

  let caseData;
  try {
    caseData = await getCase({ caseId });
  } catch {
    notFound();
  }

  const kommentare = await listCaseKommentare({ caseId });

  return <CaseDetailView caseData={caseData} kommentare={kommentare} />;
}

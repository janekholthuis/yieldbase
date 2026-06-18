import { getSessionUser } from "@/lib/auth";
import { listCasesForFinanzierer, type CaseListItem } from "@/lib/data/finanzierung";
import { FinanzierungenListView } from "@/components/finanzierung/FinanzierungenListView";

export const metadata = {
  title: "Finanzierungen · Objektpilot",
};

export default async function FinanzierungenPage() {
  const session = await getSessionUser();
  const roles = session?.roles ?? [];
  const isFin = roles.includes("finanzierer");
  const isAdminLike = roles.some((r) => r === "admin" || r === "support");
  let cases: CaseListItem[] = [];
  if (isFin || isAdminLike) cases = await listCasesForFinanzierer();
  return <FinanzierungenListView cases={cases} isFin={isFin} isAdminLike={isAdminLike} />;
}

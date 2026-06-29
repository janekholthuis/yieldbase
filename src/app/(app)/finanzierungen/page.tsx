import { getSessionUser } from "@/lib/auth";
import { listCasesForFinanzierer, type CaseListItem } from "@/lib/data/finanzierung";
import { FinanzierungenListView } from "@/components/finanzierung/FinanzierungenListView";
import { requireEntitlementPage } from "@/lib/entitlements-server";

export const metadata = {
  title: "Finanzierungen · Objektpilot",
};

export default async function FinanzierungenPage() {
  // PROJ-31: commercial gate — finanzierer (external lenders) bypass the org gate.
  await requireEntitlementPage("finanzierungen", { allowRoles: ["finanzierer"] });
  const session = await getSessionUser();
  const roles = session?.roles ?? [];
  const isFin = roles.includes("finanzierer");
  const isAdminLike = roles.some((r) => r === "admin" || r === "support");
  let cases: CaseListItem[] = [];
  if (isFin || isAdminLike) cases = await listCasesForFinanzierer();
  return <FinanzierungenListView cases={cases} isFin={isFin} isAdminLike={isAdminLike} />;
}

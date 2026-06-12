import { FeatureComingSoon } from "@/components/shell/FeatureComingSoon";

export const metadata = {
  title: "Finanzierungen · Objektpilot",
};

// V1: deferred area — soft-gated. The real view + data layer stay in the
// codebase (FinanzierungenListView, lib/data/finanzierung, CaseDetailView).
// To re-enable, restore the original wiring:
//
//   import { getSessionUser } from "@/lib/auth";
//   import { listCasesForFinanzierer, type CaseListItem } from "@/lib/data/finanzierung";
//   import { FinanzierungenListView } from "@/components/finanzierung/FinanzierungenListView";
//
//   export default async function FinanzierungenPage() {
//     const session = await getSessionUser();
//     const roles = session?.roles ?? [];
//     const isFin = roles.includes("finanzierer");
//     const isAdminLike = roles.some((r) => r === "admin" || r === "support");
//     let cases: CaseListItem[] = [];
//     if (isFin || isAdminLike) cases = await listCasesForFinanzierer();
//     return <FinanzierungenListView cases={cases} isFin={isFin} isAdminLike={isAdminLike} />;
//   }
export default function FinanzierungenPage() {
  return <FeatureComingSoon title="Finanzierungen" />;
}

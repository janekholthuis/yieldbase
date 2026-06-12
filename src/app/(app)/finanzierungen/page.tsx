import { getSessionUser } from "@/lib/auth";
import { listCasesForFinanzierer, type CaseListItem } from "@/lib/data/finanzierung";
import { FinanzierungenListView } from "@/components/finanzierung/FinanzierungenListView";

export const metadata = {
  title: "Finanzierungen · Erfolg mit Immobilien",
};

export default async function FinanzierungenPage() {
  const session = await getSessionUser();
  const roles = session?.roles ?? [];
  const isFin = roles.includes("finanzierer");
  const isAdminLike = roles.some((r) => r === "admin" || r === "support");

  // Finanzierer and admin/support see the full case list. Internal VPs do not
  // have a single aggregated list here — in the OLD APP they open cases from the
  // customer record. We render an informational hint with a link to /kunden.
  // TODO(migration): if admin/support need a distinct aggregate view, the OLD APP
  // reused listCasesForFinanzierer for them too — replicated here.
  let cases: CaseListItem[] = [];
  if (isFin || isAdminLike) {
    cases = await listCasesForFinanzierer();
  }

  return (
    <FinanzierungenListView
      cases={cases}
      isFin={isFin}
      isAdminLike={isAdminLike}
    />
  );
}

import type { Metadata } from "next";
import { listProvisionen, provisionenSummary } from "@/lib/data/provisionen";
import { ProvisionenListView } from "@/components/provision/ProvisionenListView";
import { requireEntitlementPage } from "@/lib/entitlements-server";

export const metadata: Metadata = {
  title: "Provisionen · Erfolg mit Immobilien",
};

export default async function ProvisionenPage() {
  await requireEntitlementPage("provisionen"); // PROJ-31: commercial gate
  const [provisionen, summary] = await Promise.all([
    listProvisionen(),
    provisionenSummary(),
  ]);
  return <ProvisionenListView provisionen={provisionen} summary={summary} />;
}

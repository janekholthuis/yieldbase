import type { Metadata } from "next";
import { listProvisionen, provisionenSummary } from "@/lib/data/provisionen";
import { ProvisionenListView } from "@/components/provision/ProvisionenListView";

export const metadata: Metadata = {
  title: "Provisionen · Objektpilot",
};

export default async function ProvisionenPage() {
  const [provisionen, summary] = await Promise.all([
    listProvisionen(),
    provisionenSummary(),
  ]);
  return <ProvisionenListView provisionen={provisionen} summary={summary} />;
}

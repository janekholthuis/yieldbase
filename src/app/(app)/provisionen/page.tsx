import type { Metadata } from "next";
import { FeatureComingSoon } from "@/components/shell/FeatureComingSoon";

export const metadata: Metadata = {
  title: "Provisionen · Objektpilot",
};

// V1: deferred area — soft-gated. The real view + data layer stay in the
// codebase (ProvisionenListView, lib/data/provisionen, lib/actions/provisionen).
// To re-enable, restore the wiring below:
//
//   import { listProvisionen, provisionenSummary } from "@/lib/data/provisionen";
//   import { ProvisionenListView } from "@/components/provision/ProvisionenListView";
//
//   export default async function ProvisionenPage() {
//     const [provisionen, summary] = await Promise.all([
//       listProvisionen(),
//       provisionenSummary(),
//     ]);
//     return <ProvisionenListView provisionen={provisionen} summary={summary} />;
//   }
export default function ProvisionenPage() {
  return <FeatureComingSoon title="Provisionen" />;
}

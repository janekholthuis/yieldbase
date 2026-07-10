import { getPortalDashboard } from "@/lib/data/portal";
import { getMyKundeCases } from "@/lib/data/finanzierung";
import { PortalStatusView } from "@/components/portal/PortalStatusView";

export const metadata = {
  title: "Mein Status · Erfolg mit Immobilien",
};

export default async function PortalStatusPage() {
  const [data, cases] = await Promise.all([
    getPortalDashboard(),
    getMyKundeCases().catch(() => []),
  ]);

  return <PortalStatusView data={data} cases={cases} />;
}

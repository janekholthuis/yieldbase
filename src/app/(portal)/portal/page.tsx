import { getPortalDashboard } from "@/lib/data/portal";
import { getMyKundeCases } from "@/lib/data/finanzierung";
import { PortalDashboardView } from "@/components/portal/PortalDashboardView";

export default async function PortalDashboardPage() {
  const [data, cases] = await Promise.all([
    getPortalDashboard(),
    getMyKundeCases().catch(() => []),
  ]);

  return <PortalDashboardView data={data} cases={cases} />;
}

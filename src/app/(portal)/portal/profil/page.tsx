import { getPortalDashboard } from "@/lib/data/portal";
import { PortalProfilForm } from "@/components/portal/PortalProfilForm";

export default async function PortalProfilPage() {
  const data = await getPortalDashboard();
  return <PortalProfilForm data={data} />;
}

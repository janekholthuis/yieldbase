import { getPortalDashboard } from "@/lib/data/portal";
import { SelbstauskunftWizard } from "@/components/portal/SelbstauskunftWizard";

export default async function SelbstauskunftPage() {
  const data = await getPortalDashboard();
  return <SelbstauskunftWizard kunde={data.kunde} />;
}

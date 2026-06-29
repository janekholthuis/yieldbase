// PROJ-24: Verwaltung der gebrandeten Lead-Demo-Links. Nur admin/support.
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listDemoLinks } from "@/lib/actions/demo-links";
import { DemoLinksView } from "@/components/demo/DemoLinksView";
import { requireEntitlementPage } from "@/lib/entitlements-server";

export const metadata = { title: "Demo-Links" };

export default async function DemoLinksPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (!session.roles.some((r) => r === "admin" || r === "support")) {
    redirect("/dashboard");
  }
  await requireEntitlementPage("demo_links"); // PROJ-31: commercial gate

  const links = await listDemoLinks();
  return <DemoLinksView initialLinks={links} />;
}

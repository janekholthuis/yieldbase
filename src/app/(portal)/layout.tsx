import { redirect } from "next/navigation";
import { getSessionUser, isKundeOnly } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionUser();
  // Not signed in → login. Middleware also guards, this is defense-in-depth.
  if (!session) redirect("/login");
  // Internal users (admin / vp / finanzierer) belong in the AppShell.
  if (!isKundeOnly(session.roles)) redirect("/dashboard");

  return <PortalShell>{children}</PortalShell>;
}

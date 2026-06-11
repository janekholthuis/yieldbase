import { redirect } from "next/navigation";
import { getSessionUser, isKundeOnly } from "@/lib/auth";
import { AppShell } from "@/components/shell/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionUser();
  // Middleware already redirects unauthenticated users; this is defense-in-depth.
  if (!session) redirect("/login");
  // Customers belong in the portal, not the internal VP shell.
  if (isKundeOnly(session.roles)) redirect("/portal");

  return <AppShell>{children}</AppShell>;
}

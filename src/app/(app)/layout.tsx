import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { getSessionUser, isKundeOnly } from "@/lib/auth";
import { alignActiveOrgToHost } from "@/lib/data/organisationen";
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

  // PROJ-30: on an org custom domain, pin the member's active org to that org so
  // data scoping follows the domain. Awaited before AppShell/page render, so the
  // page's queries already see the aligned org. No-op for non-members/neutral URL.
  await alignActiveOrgToHost((await headers()).get("host"));

  // Sidebar-Einklapp-Zustand über Reloads hinweg merken (shadcn-Cookie,
  // server-seitig gelesen → kein Hydration-Mismatch). Default: ausgeklappt.
  const sidebarOpen =
    (await cookies()).get("sidebar_state")?.value !== "false";

  return <AppShell defaultSidebarOpen={sidebarOpen}>{children}</AppShell>;
}

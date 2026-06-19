import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { getActiveOrganisation } from "@/lib/data/organisationen";
import { getSessionUser } from "@/lib/auth";
import { buildOrgThemeCss } from "@/lib/branding";

export const metadata: Metadata = {
  title: "Objektpilot Vertriebsplattform",
  description: "Multi-Tenant Vertriebsplattform für Bestandsimmobilien.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Both share the per-request cached getSessionUser() (one auth round-trip).
  const [org, session] = await Promise.all([
    getActiveOrganisation(),
    getSessionUser(),
  ]);
  const themeCss = buildOrgThemeCss(org);

  return (
    <html lang="de" suppressHydrationWarning>
      <body className="antialiased">
        {themeCss ? (
          <style id="org-theme" dangerouslySetInnerHTML={{ __html: themeCss }} />
        ) : null}
        <Providers
          activeOrg={org ? { name: org.name, logoUrl: org.logoUrl } : null}
          initialRoles={session?.roles ?? []}
          initialUserId={session?.userId ?? null}
        >
          {children}
        </Providers>
      </body>
    </html>
  );
}

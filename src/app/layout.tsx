import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { Providers } from "@/components/providers";
import {
  getActiveOrganisation,
  resolveOrgForHost,
} from "@/lib/data/organisationen";
import { getSessionUser } from "@/lib/auth";
import { buildOrgThemeCss } from "@/lib/branding";

export const metadata: Metadata = {
  title: "Objekt Pilot",
  description: "Die Vertriebsplattform für den Immobilienvertrieb.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Branding resolves by Host first (PROJ-30): a request on an org's custom
  // domain is org-branded even when logged out. The neutral Vercel URL falls back
  // to the signed-in user's active org. getSessionUser() is per-request cached, so
  // the fallback's internal session read shares this one auth round-trip.
  const host = (await headers()).get("host");
  const [orgByHost, session] = await Promise.all([
    resolveOrgForHost(host),
    getSessionUser(),
  ]);
  const org = orgByHost ?? (await getActiveOrganisation());
  const themeCss = buildOrgThemeCss(org);

  return (
    <html lang="de" suppressHydrationWarning>
      <body className="antialiased">
        {themeCss ? (
          <style id="org-theme" dangerouslySetInnerHTML={{ __html: themeCss }} />
        ) : null}
        <Providers
          activeOrg={org ? { name: org.name, logoUrl: org.logoUrl } : null}
          entitlements={org?.entitlements ?? null}
          initialRoles={session?.roles ?? []}
          initialUserId={session?.userId ?? null}
        >
          {children}
        </Providers>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { getActiveOrganisation } from "@/lib/data/organisationen";
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
  const org = await getActiveOrganisation();
  const themeCss = buildOrgThemeCss(org);

  return (
    <html lang="de" suppressHydrationWarning>
      <body className="antialiased">
        {themeCss ? (
          <style id="org-theme" dangerouslySetInnerHTML={{ __html: themeCss }} />
        ) : null}
        <Providers
          activeOrg={org ? { name: org.name, logoUrl: org.logoUrl } : null}
        >
          {children}
        </Providers>
      </body>
    </html>
  );
}

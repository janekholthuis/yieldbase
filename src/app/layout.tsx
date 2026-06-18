import type { Metadata } from "next";
import { Spectral, Manrope } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { getActiveOrganisation } from "@/lib/data/organisationen";
import { buildOrgThemeCss } from "@/lib/branding";

// Editorial-serif for titles/prices/big metrics (B1 „Klar"), Manrope for UI.
const spectral = Spectral({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-spectral",
  display: "swap",
});
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

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
    <html
      lang="de"
      suppressHydrationWarning
      className={`${spectral.variable} ${manrope.variable}`}
    >
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

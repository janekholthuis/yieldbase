import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter, Schibsted_Grotesk, Instrument_Sans } from "next/font/google";
import "./globals.css";

// Self-hosted via next/font (no render-blocking Google @import, no FOUT).
// Inter = UI/Fließtext/Tabellenzahlen; Schibsted Grotesk = Display-Sans für
// Titel & Hero-Zahlen (editorial, sober, distinktiv — kein Inter-Default-Look).
// Opt-in via Tailwind `font-display`.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const display = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
// Instrument Sans — cleane, editorial Formular-Schrift (deckt sich mit dem
// Fillout-„EMI"-Theme). Aktuell nur auf der Selbstauskunft aktiv (Opt-in via
// Tailwind `font-instrument`); der geplante App-weite Restyle zieht sie später
// breiter (siehe docs/DESIGN-RESTYLE-PLAN.md).
const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});
import { Providers } from "@/components/providers";
import {
  getActiveOrganisation,
  resolveOrgForHost,
} from "@/lib/data/organisationen";
import { getSessionUser } from "@/lib/auth";
import { buildOrgThemeCss } from "@/lib/branding";

export const metadata: Metadata = {
  title: "Erfolg mit Immobilien",
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
    <html
      lang="de"
      className={`${inter.variable} ${display.variable} ${instrument.variable}`}
      suppressHydrationWarning
    >
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

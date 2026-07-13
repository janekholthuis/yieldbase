import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser, isKundeOnly } from "@/lib/auth";
import { resolveOrgForHost } from "@/lib/data/organisationen";
import { LandingPage } from "@/components/marketing/landing-page";
import { OrgLanding } from "@/components/marketing/org-landing";

const SAAS = {
  title: "Erfolg mit Immobilien — Eine Plattform statt zehn Tools",
  description:
    "Erfolg mit Immobilien bündelt Objekte, Kunden, Kalkulation, Reservierung und Finanzierung in einer Plattform.",
};

// Host-aware: a request on an org's custom domain (e.g. emi-hub.de) is titled
// after the org; the neutral Vercel URL gets the Erfolg-mit-Immobilien SaaS metadata.
export async function generateMetadata(): Promise<Metadata> {
  const org = await resolveOrgForHost((await headers()).get("host"));
  if (org) {
    return {
      title: org.name,
      description: `${org.name} — Anmeldung für Kunden, Finanzierer und Vertriebspartner.`,
    };
  }
  return SAAS;
}

export default async function Home() {
  const session = await getSessionUser();
  if (session) {
    redirect(isKundeOnly(session.roles) ? "/portal" : "/dashboard");
  }
  // Logged-out: an org custom domain shows the branded role-login landing
  // (PROJ-30); the neutral domain shows the Erfolg-mit-Immobilien SaaS marketing page.
  const org = await resolveOrgForHost((await headers()).get("host"));
  return org ? <OrgLanding org={org} /> : <LandingPage />;
}

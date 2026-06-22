import { headers } from "next/headers";
import { resolveOrgForHost } from "@/lib/data/organisationen";
import { LandingPage } from "@/components/marketing/landing-page";
import { OrgLanding } from "@/components/marketing/org-landing";

// Host-aware like `/`: an org custom domain shows the branded role-login landing,
// the neutral domain shows the Objekt-Pilot SaaS marketing page.
export default async function StartPage() {
  const org = await resolveOrgForHost((await headers()).get("host"));
  return org ? <OrgLanding org={org} /> : <LandingPage />;
}

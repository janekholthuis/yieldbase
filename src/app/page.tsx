import type { Metadata } from "next";
import { getSessionUser, isKundeOnly } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/marketing/landing-page";

export const metadata: Metadata = {
  title: "EMI Hub — Eine Plattform statt zehn Tools",
  description:
    "EMI Hub bündelt Objekte, Kunden, Kalkulation, Reservierung und Finanzierung in einer Plattform. Schluss mit verstreuten Mails, Excel-Listen und Ordnern.",
};

export default async function Home() {
  const session = await getSessionUser();
  if (session) {
    redirect(isKundeOnly(session.roles) ? "/portal" : "/dashboard");
  }
  // Logged-out visitors (e.g. emi-hub.de) see the marketing landing page.
  return <LandingPage />;
}

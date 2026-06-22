import Link from "next/link";
import { ArrowRight, Users, Landmark, Building2 } from "lucide-react";
import type { ActiveOrg } from "@/lib/data/organisationen";

/* ------------------------------------------------------------------ */
/*  Org-Landing — gerendert unter `/` auf einer Org-Custom-Domain      */
/*  (z. B. emi-hub.de). Gebrandet über die Org-Farben/Logo (CSS-Vars   */
/*  kommen aus dem Root-Layout). Einstieg mit Rollen-Login für die     */
/*  Endnutzer der Org (Kunde, Finanzierer, Vertriebspartner).          */
/* ------------------------------------------------------------------ */

const ROLES = [
  {
    icon: Users,
    title: "Als Kunde anmelden",
    body: "Ihre Wohnung, Dokumente, Selbstauskunft und Status — an einem Ort.",
    href: "/login?redirect=%2Fportal",
  },
  {
    icon: Landmark,
    title: "Als Finanzierer anmelden",
    body: "Finanzierungsanfragen einsehen, Angebote abgeben, Fälle verfolgen.",
    href: "/login?redirect=%2Ffinanzierungen",
  },
  {
    icon: Building2,
    title: "Als Vertriebspartner anmelden",
    body: "Ihr Arbeitsplatz: Objekte, Kunden, Kalkulation und Reservierungen.",
    href: "/login?redirect=%2Fdashboard",
  },
];

export function OrgLanding({ org }: { org: ActiveOrg }) {
  const initial = org.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <main className="flex min-h-screen flex-col bg-brand-surfaceMuted text-brand-ink">
      {/* Kopf */}
      <header className="border-b border-brand-border bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            {org.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={org.logoUrl}
                alt={org.name}
                className="h-8 w-auto max-w-[160px] object-contain"
              />
            ) : (
              <span className="grid h-8 w-8 place-items-center bg-brand-primary text-sm font-bold text-white">
                {initial}
              </span>
            )}
            <span className="text-[15px] font-semibold tracking-tight text-brand-ink">
              {org.name}
            </span>
          </div>
          <Link
            href="/login"
            className="inline-flex h-9 items-center gap-1.5 bg-brand-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-primaryHover"
          >
            Anmelden
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Hero + Rollen-Login */}
      <section className="mx-auto w-full max-w-5xl flex-1 px-6 py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 border border-brand-border bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand-accentText">
            <span className="h-1.5 w-1.5 bg-brand-accent" />
            {org.name}
          </span>
          <h1 className="mt-7 text-balance text-4xl font-bold leading-[1.06] tracking-tight text-brand-ink md:text-6xl">
            Willkommen bei{" "}
            <span className="text-brand-primary">{org.name}</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-lg leading-relaxed text-brand-body">
            Melden Sie sich bei unserer Plattform an — wählen Sie Ihren Zugang.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-px border border-brand-border bg-brand-border md:grid-cols-3">
          {ROLES.map((r) => {
            const Icon = r.icon;
            return (
              <Link
                key={r.title}
                href={r.href}
                className="group flex flex-col bg-white p-7 transition-colors hover:bg-brand-surfaceMuted"
              >
                <span className="grid h-11 w-11 place-items-center border border-brand-border bg-brand-primaryTint text-brand-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <h2 className="mt-5 text-lg font-semibold text-brand-ink">
                  {r.title}
                </h2>
                <p className="mt-2 flex-1 text-[15px] leading-relaxed text-brand-body">
                  {r.body}
                </p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-primary">
                  Anmelden
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Footer — dezenter SaaS-Hinweis */}
      <footer className="border-t border-brand-border bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6 text-sm text-brand-muted">
          <span>© 2026 {org.name}</span>
          <span>Bereitgestellt über Objekt Pilot</span>
        </div>
      </footer>
    </main>
  );
}

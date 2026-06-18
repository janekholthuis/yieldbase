import Link from "next/link";
import { ArrowRight, Check, Hammer, Compass } from "lucide-react";
import { MarketingNav, MarketingFooter } from "@/components/marketing/marketing-chrome";

/* ------------------------------------------------------------------ */
/*  EMI Hub — Öffentliche Produkt-Roadmap                              */
/*  Kuratiert & kundentauglich. Drei Spalten: Live · In Entwicklung ·  */
/*  Geplant. Gleiches Branding wie die Landing (hell, seriös, kantig). */
/* ------------------------------------------------------------------ */

type Item = { title: string; body: string };

const LIVE: Item[] = [
  {
    title: "Objekte & Einheiten",
    body: "Projekte, Wohnungen, Bilder, Dokumente und Lage zentral verwaltet.",
  },
  {
    title: "Kunden-CRM mit Bonität",
    body: "Pipeline, Selbstauskunft und Bonitätsprüfung in einem Datensatz.",
  },
  {
    title: "Investitions-Kalkulation",
    body: "AfA, Förderbausteine und Prognose-Szenarien live gerechnet.",
  },
  {
    title: "Reservierung mit Signatur",
    body: "Rechtssicher signierte PDFs mit Audit-Trail, Ablauf und Versand.",
  },
  {
    title: "Exposé & Präsentation",
    body: "Aus Objektdaten auf Knopfdruck ein professionelles Exposé.",
  },
  {
    title: "Kundenportal",
    body: "Self-Service für Endkunden: Status, Dokumente, Selbstauskunft.",
  },
  {
    title: "Team, Rollen & White-Label",
    body: "Vertriebshierarchie, Einladungen und eigenes Branding je Organisation.",
  },
  {
    title: "Automatischer Datenabgleich",
    body: "Objekt- und Einheitendaten werden per Schnittstelle synchron gehalten.",
  },
  {
    title: "Bulk-Anlage von Einheiten",
    body: "Ganze Einheitenlisten per Excel-Paste in Sekunden importieren.",
  },
  {
    title: "Finanzierungen",
    body: "Fälle an Finanzierer übergeben, Angebote einholen, Status verfolgen.",
  },
  {
    title: "Provisionsabrechnung",
    body: "Provisionen automatisch entlang der Vertriebshierarchie berechnen.",
  },
  {
    title: "KI-Lageeinschätzung",
    body: "Standort-Highlights und Lagetexte automatisch fürs Exposé erzeugen.",
  },
  {
    title: "Branding-Automatik",
    body: "Logo und Farben automatisch aus der Unternehmens-Website übernehmen.",
  },
];

const BUILDING: Item[] = [
  {
    title: "Personalisierte Lead-Ansprache",
    body: "Interessenten eine vorab auf ihr Unternehmen gebrandete Ansicht senden.",
  },
];

const PLANNED: Item[] = [
  {
    title: "Suchagenten",
    body: "Gespeicherte Suchprofile je Kunde mit automatischem Treffer-Matching.",
  },
  {
    title: "Objektvergleiche & Portfolios",
    body: "Einheiten und Kennzahlen direkt nebeneinander vergleichen.",
  },
  {
    title: "CRM-Schnittstellen",
    body: "Export und Sync mit HubSpot, Salesforce & Co. plus Webhooks.",
  },
  {
    title: "„Neue Objekte\"-Feed",
    body: "Partner-Feed mit Schlagzeilen-Posts und direktem Projekt-Link.",
  },
];

export function RoadmapPage() {
  return (
    <main className="bg-white text-brand-ink">
      <MarketingNav />

      {/* Header */}
      <section className="relative overflow-hidden border-b border-brand-border bg-brand-surfaceMuted">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.45]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #E5E7EB 1px, transparent 1px), linear-gradient(to bottom, #E5E7EB 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-6 py-20 text-center md:py-24">
          <span className="inline-flex items-center gap-2 border border-brand-border bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand-accentText">
            <span className="h-1.5 w-1.5 bg-brand-accent" />
            Produkt-Roadmap
          </span>
          <h1 className="mx-auto mt-7 max-w-3xl text-balance text-4xl font-bold leading-[1.06] tracking-tight text-brand-ink md:text-6xl">
            Wohin sich EMI Hub entwickelt
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-brand-body md:text-xl">
            Transparent statt versteckt: Was heute live ist, woran wir gerade
            bauen und was als Nächstes kommt. Ihr Feedback fließt direkt in die
            Prioritäten ein.
          </p>
        </div>
      </section>

      {/* Board */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
          <div className="grid gap-6 lg:grid-cols-3">
            <Column
              tone="live"
              icon={Check}
              label="Live"
              note="Verfügbar"
              items={LIVE}
            />
            <Column
              tone="building"
              icon={Hammer}
              label="In Entwicklung"
              note="Bald verfügbar"
              items={BUILDING}
            />
            <Column
              tone="planned"
              icon={Compass}
              label="Geplant"
              note="Auf der Roadmap"
              items={PLANNED}
            />
          </div>

          <p className="mt-10 text-center text-sm text-brand-muted">
            Stand: laufend aktualisiert. Reihenfolge und Zeitpunkte können sich
            nach Kundenbedarf verschieben.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-brand-border bg-brand-surfaceMuted">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center md:py-20">
          <h2 className="mx-auto max-w-2xl text-2xl font-bold tracking-tight text-brand-ink md:text-3xl">
            Ein Wunsch, der hier fehlt?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-brand-body">
            Sagen Sie uns, was Ihr Vertrieb braucht — wir priorisieren nach
            echtem Bedarf.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex h-12 w-full items-center justify-center gap-2 bg-brand-primary px-7 text-base font-semibold text-white transition-colors hover:bg-brand-primaryHover sm:w-auto"
            >
              Demo ansehen
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/"
              className="inline-flex h-12 w-full items-center justify-center border border-brand-ink/15 bg-white px-7 text-base font-semibold text-brand-ink transition-colors hover:bg-white sm:w-auto"
            >
              Zur Übersicht
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}

/* -------------------------------- Column -------------------------------- */

const TONES = {
  live: {
    dot: "bg-brand-success",
    chip: "bg-brand-successSoft text-brand-success",
    iconBg: "bg-brand-successSoft text-brand-success",
  },
  building: {
    dot: "bg-brand-accent",
    chip: "bg-brand-accentSoft text-brand-accentText",
    iconBg: "bg-brand-accentSoft text-brand-accentText",
  },
  planned: {
    dot: "bg-brand-primary",
    chip: "bg-brand-primaryTint text-brand-primary",
    iconBg: "bg-brand-primaryTint text-brand-primary",
  },
} as const;

function Column({
  tone,
  icon: Icon,
  label,
  note,
  items,
}: {
  tone: keyof typeof TONES;
  icon: typeof Check;
  label: string;
  note: string;
  items: Item[];
}) {
  const t = TONES[tone];
  return (
    <div className="border border-brand-border bg-white">
      <div className="flex items-center justify-between border-b border-brand-border bg-brand-surfaceMuted px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className={`grid h-7 w-7 place-items-center ${t.iconBg}`}>
            <Icon className="h-4 w-4" />
          </span>
          <span className="text-base font-semibold text-brand-ink">
            {label}
          </span>
        </div>
        <span className={`px-2 py-0.5 text-xs font-semibold ${t.chip}`}>
          {items.length}
        </span>
      </div>

      <div className="px-5 pb-2 pt-3">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-muted">
          {note}
        </span>
      </div>

      <ul className="divide-y divide-brand-borderSoft px-5 pb-5">
        {items.map((item) => (
          <li key={item.title} className="py-4">
            <div className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 shrink-0 ${t.dot}`} />
              <h3 className="text-[15px] font-semibold text-brand-ink">
                {item.title}
              </h3>
            </div>
            <p className="mt-1.5 pl-3.5 text-sm leading-relaxed text-brand-body">
              {item.body}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

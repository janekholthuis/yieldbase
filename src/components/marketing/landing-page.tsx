import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Users,
  Calculator,
  FileSignature,
  Landmark,
  Presentation,
  Mail,
  FolderOpen,
  MessageSquare,
  FileSpreadsheet,
  StickyNote,
  Check,
} from "lucide-react";
import { MarketingNav, MarketingFooter } from "@/components/marketing/marketing-chrome";

/* ------------------------------------------------------------------ */
/*  Objekt Pilot — SaaS-Marketing-Landingpage (neutrale Domain)        */
/*  Hell, seriös, kantig. Navy/Gold. Keine verspielten Verläufe.       */
/*  Gerendert unter `/` (neutrale Domain, logged-out) und `/start`.    */
/*  Auf einer Org-Custom-Domain rendert `/` stattdessen OrgLanding.    */
/* ------------------------------------------------------------------ */

export function LandingPage() {
  return (
    <main className="bg-white text-brand-ink">
      <MarketingNav />
      <Hero />
      <BeforeAfter />
      <ReplaceStack />
      <Modules />
      <Proof />
      <FinalCta />
      <MarketingFooter />
    </main>
  );
}

/* --------------------------------- Hero --------------------------------- */

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-brand-border bg-brand-surfaceMuted">
      {/* feines Raster im Hintergrund — strukturiert, nicht verspielt */}
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
      <div className="relative mx-auto max-w-6xl px-6 py-20 text-center md:py-28">
        <span className="inline-flex items-center gap-2 border border-brand-border bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand-accentText">
          <span className="h-1.5 w-1.5 bg-brand-accent" />
          Die Plattform für den Immobilienvertrieb
        </span>

        <h1 className="mx-auto mt-7 max-w-4xl text-balance text-5xl font-bold leading-[1.04] tracking-tight text-brand-ink md:text-7xl">
          Eine Plattform.
          <br />
          <span className="text-brand-primary">Statt zehn Tools.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-brand-body md:text-xl">
          Objekte, Kunden, Kalkulation, Reservierung und Finanzierung — alles an
          einem Ort. Schluss mit verstreuten Mails, Excel-Listen und Ordnern,
          die niemand wiederfindet.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex h-12 w-full items-center justify-center gap-2 bg-brand-primary px-7 text-base font-semibold text-white transition-colors hover:bg-brand-primaryHover sm:w-auto"
          >
            Jetzt starten
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#plattform"
            className="inline-flex h-12 w-full items-center justify-center border border-brand-ink/15 bg-white px-7 text-base font-semibold text-brand-ink transition-colors hover:bg-brand-surfaceMuted sm:w-auto"
          >
            Wie es funktioniert
          </a>
        </div>

        <p className="mt-6 text-sm text-brand-muted">
          Ohne Einrichtungsaufwand · DSGVO-konform · Made in Germany
        </p>
      </div>
    </section>
  );
}

/* ------------------------------ Before / After -------------------------- */

function BeforeAfter() {
  return (
    <section id="plattform" className="border-b border-brand-border bg-white">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <SectionEyebrow>Der Unterschied</SectionEyebrow>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-brand-ink md:text-4xl">
            Vom Tool-Chaos zum einen Arbeitsplatz
          </h2>
          <p className="mt-4 text-lg text-brand-body">
            Ihr Vertrieb verliert Zeit zwischen Postfächern, Tabellen und Chats.
            Objekt Pilot führt alles zusammen.
          </p>
        </div>

        <div className="mt-14 grid items-stretch gap-6 lg:grid-cols-[1fr_auto_1fr]">
          <BeforePanel />
          <div className="flex items-center justify-center">
            <div className="grid h-12 w-12 place-items-center border border-brand-border bg-white shadow-sm">
              <ArrowRight className="h-5 w-5 text-brand-primary" />
            </div>
          </div>
          <AfterPanel />
        </div>
      </div>
    </section>
  );
}

function BeforePanel() {
  const clutter = [
    { icon: Mail, label: "Posteingang", meta: "47 ungelesen", rot: "-rotate-2" },
    {
      icon: FileSpreadsheet,
      label: "Angebote_final_v3.xlsx",
      meta: "zuletzt 3 Wochen",
      rot: "rotate-1",
    },
    {
      icon: MessageSquare,
      label: "WhatsApp",
      meta: "12 offene Chats",
      rot: "rotate-2",
    },
    {
      icon: FolderOpen,
      label: "Ordner: Reservierungen",
      meta: "PDF, PDF, PDF…",
      rot: "-rotate-1",
    },
    {
      icon: StickyNote,
      label: "Notizzettel",
      meta: "Wer hat zugesagt?",
      rot: "rotate-[3deg]",
    },
  ];

  return (
    <div className="relative overflow-hidden border border-brand-border bg-brand-dangerSoft/40 p-6">
      <PanelHeader tone="danger" kicker="Vorher" title="Verstreut & verloren" />
      <div className="relative mt-6 h-[300px]">
        {clutter.map((c, i) => {
          const pos = [
            "left-1 top-0",
            "right-2 top-6",
            "left-6 top-[92px]",
            "right-6 top-[150px]",
            "left-2 bottom-1",
          ][i];
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className={`absolute ${pos} ${c.rot} w-[210px] border border-brand-border bg-white px-3.5 py-3 shadow-sm`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 shrink-0 text-brand-muted" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-brand-ink">
                    {c.label}
                  </p>
                  <p className="truncate text-xs text-brand-muted">{c.meta}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-center text-sm font-medium text-brand-danger">
        Kontext geht zwischen den Tools verloren.
      </p>
    </div>
  );
}

function AfterPanel() {
  const nav = [
    { icon: Building2, label: "Objekte", active: true },
    { icon: Users, label: "Kunden", active: false },
    { icon: Calculator, label: "Kalkulation", active: false },
    { icon: FileSignature, label: "Reservierung", active: false },
  ];
  return (
    <div className="relative overflow-hidden border border-brand-primary/15 bg-brand-primaryTint p-6">
      <PanelHeader tone="primary" kicker="Nachher" title="Ein Arbeitsplatz" />

      {/* Mini-App-Fenster */}
      <div className="mt-6 overflow-hidden border border-brand-border bg-white shadow-sm">
        <div className="flex items-center gap-1.5 border-b border-brand-border bg-brand-surfaceMuted px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-brand-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-brand-border" />
          <span className="ml-2 text-xs font-medium text-brand-muted">
            app.objekt-pilot.de
          </span>
        </div>
        <div className="grid grid-cols-[112px_1fr]">
          <div className="space-y-0.5 border-r border-brand-border bg-white p-2">
            {nav.map((n) => {
              const Icon = n.icon;
              return (
                <div
                  key={n.label}
                  className={`flex items-center gap-2 px-2 py-1.5 text-xs font-medium ${
                    n.active
                      ? "bg-brand-primary text-white"
                      : "text-brand-body"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{n.label}</span>
                </div>
              );
            })}
          </div>
          <div className="space-y-2 p-3">
            <div className="h-2 w-2/3 bg-brand-border" />
            {[0, 1, 2].map((r) => (
              <div
                key={r}
                className="flex items-center justify-between border border-brand-borderSoft bg-brand-surfaceMuted px-2.5 py-2"
              >
                <div className="space-y-1">
                  <div className="h-1.5 w-20 bg-brand-border" />
                  <div className="h-1.5 w-12 bg-brand-borderSoft" />
                </div>
                <span className="bg-brand-successSoft px-1.5 py-0.5 text-[10px] font-semibold text-brand-success">
                  aktiv
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-sm font-medium text-brand-primary">
        Jeder Vorgang mit vollem Kontext — sofort auffindbar.
      </p>
    </div>
  );
}

function PanelHeader({
  tone,
  kicker,
  title,
}: {
  tone: "danger" | "primary";
  kicker: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`px-2.5 py-1 text-xs font-bold uppercase tracking-[0.14em] ${
          tone === "danger"
            ? "bg-brand-danger text-white"
            : "bg-brand-primary text-white"
        }`}
      >
        {kicker}
      </span>
      <span className="text-base font-semibold text-brand-ink">{title}</span>
    </div>
  );
}

/* ------------------------------ Replace stack --------------------------- */

function ReplaceStack() {
  const replaced = [
    "E-Mail-Postfächer",
    "Excel-Kalkulationen",
    "Datei-Ordner & Cloud-Links",
    "WhatsApp- & Chat-Gruppen",
    "PDF-Bastelei für Exposés",
    "Insellösungen fürs CRM",
  ];
  return (
    <section id="warum" className="border-b border-brand-border bg-brand-ink">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-accent">
              Ein System statt vieler
            </span>
            <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-white md:text-5xl">
              Die Software, die Ihren ganzen Tool-Stack ersetzt.
            </h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-white/70">
              Kein Wechseln, kein Kopieren, kein Suchen. Was Ihr Vertrieb heute
              auf sechs Tools verteilt, läuft in Objekt Pilot an einem Ort —
              nachvollziehbar und revisionssicher.
            </p>
            <Link
              href="/login"
              className="mt-8 inline-flex h-11 items-center gap-2 bg-brand-accent px-6 text-base font-semibold text-white transition-colors hover:bg-brand-accentHover"
            >
              Stack zusammenführen
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <ul className="divide-y divide-white/10 border border-white/10">
            {replaced.map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 px-5 py-4 text-white/85"
              >
                <span className="grid h-5 w-5 shrink-0 place-items-center bg-brand-accent/20">
                  <Check className="h-3 w-3 text-brand-accent" />
                </span>
                <span className="text-base font-medium line-through decoration-white/30">
                  {item}
                </span>
                <span className="ml-auto text-xs font-semibold uppercase tracking-wide text-brand-accent">
                  ersetzt
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- Module ------------------------------- */

function Modules() {
  const modules = [
    {
      icon: Building2,
      title: "Objekte & Einheiten",
      body: "Projekte, Wohnungen, Bilder, Dokumente und Lage — strukturiert statt im Ordner-Dschungel.",
    },
    {
      icon: Users,
      title: "Kunden & Bonität",
      body: "Pipeline, Selbstauskunft und Bonitätsprüfung in einem Datensatz statt im Posteingang.",
    },
    {
      icon: Calculator,
      title: "Kalkulation",
      body: "AfA, Förderung und Prognose-Szenarien live gerechnet — ohne fehleranfällige Tabellen.",
    },
    {
      icon: FileSignature,
      title: "Reservierung",
      body: "Rechtssicher signierte PDFs mit Audit-Trail, Ablauf und automatischem Versand.",
    },
    {
      icon: Landmark,
      title: "Finanzierung",
      body: "Fälle an Finanzierer übergeben, Angebote einholen, Status verfolgen — durchgängig.",
    },
    {
      icon: Presentation,
      title: "Präsentation & Exposé",
      body: "Aus Objektdaten auf Knopfdruck ein professionelles Exposé statt Copy-&-Paste.",
    },
  ];
  return (
    <section id="module" className="border-b border-brand-border bg-white">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <SectionEyebrow>Module</SectionEyebrow>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-brand-ink md:text-4xl">
            Alles, was der Vertrieb braucht — verbunden
          </h2>
          <p className="mt-4 text-lg text-brand-body">
            Jedes Modul greift auf dieselben Daten zu. Einmal erfasst, überall
            aktuell.
          </p>
        </div>

        <div className="mt-14 grid gap-px border border-brand-border bg-brand-border sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.title}
                className="group bg-white p-7 transition-colors hover:bg-brand-surfaceMuted"
              >
                <span className="grid h-11 w-11 place-items-center border border-brand-border bg-brand-primaryTint text-brand-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-brand-ink">
                  {m.title}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-brand-body">
                  {m.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- Proof -------------------------------- */

function Proof() {
  const stats = [
    { value: "6", label: "Tools in einer Plattform" },
    { value: "2,5 h", label: "weniger Suchen pro Tag" },
    { value: "1×", label: "erfassen — überall aktuell" },
    { value: "100 %", label: "Vorgänge nachvollziehbar" },
  ];
  return (
    <section className="border-b border-brand-border bg-brand-surfaceMuted">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-2 gap-px border border-brand-border bg-brand-border lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-white px-6 py-8 text-center">
              <p className="text-4xl font-bold tracking-tight text-brand-primary tabular-nums">
                {s.value}
              </p>
              <p className="mt-2 text-sm font-medium text-brand-body">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- Final CTA ------------------------------ */

function FinalCta() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="relative overflow-hidden border border-brand-primary/20 bg-brand-primary px-8 py-16 text-center md:px-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white md:text-5xl">
              Bringen Sie Ihren Vertrieb auf eine Plattform.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-white/75">
              Sehen Sie in einer kurzen Demo, wie Objekt Pilot Objekte, Kunden und
              Finanzierung zusammenführt.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex h-12 w-full items-center justify-center gap-2 bg-white px-7 text-base font-semibold text-brand-primary transition-colors hover:bg-white/90 sm:w-auto"
              >
                Demo ansehen
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 w-full items-center justify-center border border-white/30 px-7 text-base font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto"
              >
                Anmelden
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- Helpers -------------------------------- */

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-accentText">
      <span className="h-1.5 w-1.5 bg-brand-accent" />
      {children}
    </span>
  );
}

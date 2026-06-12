// Customer status pipeline — derives the buyer journey from real portal data
// (assignment, Selbstauskunft, Bonität, reservation, financing, notary).
// Pure/presentational: no client hooks, safe to render in the Server Component.
import Link from "next/link";
import type { PortalDashboard } from "@/lib/data/portal";
import type { MyKundeCase } from "@/lib/data/finanzierung";
import { SectionCard } from "@/components/ui/section-card";
import { Check, ArrowRight } from "lucide-react";

type StageState = "done" | "active" | "pending";

interface Stage {
  label: string;
  description: string;
  done: boolean;
  href?: string;
  cta?: string;
}

const fmtEUR0 = (n: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

export function PortalStatusView({
  data,
  cases,
}: {
  data: PortalDashboard;
  cases: MyKundeCase[];
}) {
  const k = data.kunde;
  const beyond = (statuses: string[], e: PortalDashboard["einheiten"][number]) =>
    statuses.includes(e.reservierung_status ?? "") ||
    statuses.includes(e.status ?? "");

  const hasWohnung = data.einheiten.length > 0;
  const selbstauskunftDone =
    !!k?.selbstauskunft_submitted_at || k?.persoenlicher_steuersatz != null;
  const bonitaetDone = k?.max_finanzierbar != null;
  const reserviert = data.einheiten.some((e) =>
    beyond(["reserviert", "notarvorbereitung", "notartermin", "verkauft"], e),
  );
  const finanzierungActive = cases.length > 0;
  const notarDone = data.einheiten.some((e) =>
    beyond(["notartermin", "verkauft"], e),
  );

  const stages: Stage[] = [
    {
      label: "Wohnung ausgewählt",
      description: hasWohnung
        ? "Dein Berater hat eine Wohnung für dich vorbereitet."
        : "Sobald dein Berater eine Wohnung für dich hinterlegt, geht es los.",
      done: hasWohnung,
    },
    {
      label: "Selbstauskunft",
      description: selbstauskunftDone
        ? "Deine Angaben liegen uns vor."
        : "Fülle deine Selbstauskunft aus, damit wir deine Finanzierung prüfen können.",
      done: selbstauskunftDone,
      href: "/portal/selbstauskunft",
      cta: "Selbstauskunft öffnen",
    },
    {
      label: "Bonität geprüft",
      description: bonitaetDone
        ? `Geprüft – bis zu ${fmtEUR0(Number(k?.max_finanzierbar))} finanzierbar.`
        : "Wir prüfen deine finanziellen Möglichkeiten.",
      done: bonitaetDone,
    },
    {
      label: "Reservierung",
      description: reserviert
        ? "Deine Wohnung ist für dich reserviert."
        : "Stimme die Reservierung mit deinem Berater ab.",
      done: reserviert,
    },
    {
      label: "Finanzierung",
      description: finanzierungActive
        ? "Deine Finanzierungsanfrage läuft."
        : "Nach der Reservierung starten wir deine Finanzierung.",
      done: finanzierungActive,
    },
    {
      label: "Beurkundung",
      description: notarDone
        ? "Der Notartermin ist in Vorbereitung oder erfolgt."
        : "Zum Abschluss beurkundet ihr den Kauf beim Notar.",
      done: notarDone,
    },
  ];

  // The first not-done stage is the current focus.
  const activeIndex = stages.findIndex((s) => !s.done);
  const doneCount = stages.filter((s) => s.done).length;
  const pct = Math.round((doneCount / stages.length) * 100);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 md:px-6 md:py-10">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Mein Status
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dein Weg zur Kapitalanlage – alle Etappen auf einen Blick.
        </p>
      </header>

      <SectionCard>
        <div className="mb-5 flex items-end justify-between gap-3">
          <div className="font-display text-lg font-semibold">
            {doneCount} von {stages.length} Schritten erledigt
          </div>
          <div className="text-sm font-semibold tabular-nums text-brand-accent">
            {pct}%
          </div>
        </div>
        <div className="mb-7 h-2 w-full overflow-hidden rounded-full bg-brand-surfaceMuted">
          <div
            className="h-full rounded-full bg-brand-accent transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>

        <ol className="relative space-y-0">
          {stages.map((s, i) => {
            const state: StageState = s.done
              ? "done"
              : i === activeIndex
                ? "active"
                : "pending";
            const isLast = i === stages.length - 1;
            return (
              <li key={s.label} className="relative flex gap-4 pb-7 last:pb-0">
                {/* Connector line */}
                {!isLast && (
                  <span
                    className={`absolute left-[15px] top-8 h-[calc(100%-1rem)] w-0.5 ${
                      s.done ? "bg-[color:var(--success)]" : "bg-brand-divider"
                    }`}
                    aria-hidden
                  />
                )}
                {/* Node */}
                <span
                  className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                    state === "done"
                      ? "border-[color:var(--success)] bg-[color:var(--success)] text-white"
                      : state === "active"
                        ? "border-brand-accent bg-[color:var(--highlight-bg)] text-brand-accent"
                        : "border-brand-divider bg-brand-surface text-brand-subtle"
                  }`}
                >
                  {state === "done" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-bold tabular-nums">{i + 1}</span>
                  )}
                </span>
                {/* Content */}
                <div className="min-w-0 flex-1 pt-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-display font-semibold ${
                        state === "pending"
                          ? "text-brand-muted"
                          : "text-brand-primary"
                      }`}
                    >
                      {s.label}
                    </span>
                    {state === "active" && (
                      <span className="rounded-full bg-[color:var(--highlight-bg)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-accent">
                        Jetzt dran
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {s.description}
                  </p>
                  {state === "active" && s.href && s.cta && (
                    <Link
                      href={s.href}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[color:var(--primary)] hover:underline"
                    >
                      {s.cta}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </SectionCard>
    </div>
  );
}

"use client";

import Link from "next/link";
import type { PortalDashboard } from "@/lib/data/portal";
import type { MyKundeCase } from "@/lib/data/finanzierung";
import { CASE_STATUS_KUNDE, type CaseStatus } from "@/lib/finanzierung-status";
import { unterlagenFor } from "@/lib/kunden-dokumente";
import { pickFinanzierungHint } from "@/lib/portal-finanzierung-hint";
import { getUserInitial } from "@/lib/user-initial";
import { SectionCard } from "@/components/ui/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  FolderClosed,
  Coins,
  ArrowRight,
  Mail,
  Phone,
  CalendarCheck,
  CheckCircle2,
  Banknote,
} from "lucide-react";

const statusBadge = (
  s: string | null,
): "default" | "secondary" | "outline" | "destructive" => {
  switch (s) {
    case "reserviert":
      return "default";
    case "beurkundet":
      return "secondary";
    case "storniert":
    case "abgelaufen":
      return "destructive";
    default:
      return "outline";
  }
};

const fmtEUR0 = (n: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

export function PortalDashboardView({
  data,
  cases,
}: {
  data: PortalDashboard;
  cases: MyKundeCase[];
}) {
  const vorname = data.kunde?.vorname ?? "";
  const initials = getUserInitial({
    vorname: data.kunde?.vorname ?? null,
    name: null,
    email: data.kunde?.email ?? null,
  });

  const reservierteEinheit =
    data.einheiten.find((e) => e.reservierung_status === "reserviert") ??
    data.einheiten[0];

  const berufStatus = data.kunde?.beruf_status ?? null;
  const kategorien = unterlagenFor(berufStatus);
  const benoetigt = kategorien.length;
  // TODO(migration): kunden documents storage — live „eingereicht" count once
  // uploads land. Until then we show the required count and a CTA.
  const eingereicht = 0;
  const dokPct = benoetigt === 0 ? 0 : Math.round((eingereicht / benoetigt) * 100);
  const dokHint =
    eingereicht === 0
      ? "Lade deine ersten Unterlagen hoch."
      : eingereicht >= benoetigt
        ? "Alle Unterlagen vollständig."
        : "Du bist auf einem guten Weg.";

  const submittedAt = data.kunde?.selbstauskunft_submitted_at ?? null;
  const maxFin = data.kunde?.max_finanzierbar ?? null;

  const hasReservierung = data.einheiten.some(
    (e) => e.reservierung_status === "reserviert",
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
      {/* Hero */}
      <header className="mb-8 flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--highlight-bg)] font-display text-xl font-bold text-[color:var(--primary)]">
          {initials}
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Hey {vorname || "schön, dass du da bist"} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hier siehst du deinen aktuellen Stand auf einen Blick.
          </p>
        </div>
      </header>

      {/* 3 KPI-Kacheln */}
      <section className="grid gap-4 md:grid-cols-3">
        {/* Meine Wohnung */}
        <SectionCard icon={<Building2 className="h-5 w-5" />} title="Meine Wohnung">
          {reservierteEinheit ? (
            <div className="space-y-2">
              <div className="font-display text-lg font-semibold leading-tight">
                {reservierteEinheit.projekt_name ?? "Projekt"}
              </div>
              <div className="text-sm text-muted-foreground">
                {[
                  reservierteEinheit.adresse,
                  [reservierteEinheit.plz, reservierteEinheit.stadt]
                    .filter(Boolean)
                    .join(" "),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
              <Badge
                variant={statusBadge(
                  reservierteEinheit.reservierung_status ??
                    reservierteEinheit.status,
                )}
              >
                {reservierteEinheit.reservierung_status ??
                  reservierteEinheit.status}
              </Badge>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Noch keine Reservierung.
            </p>
          )}
        </SectionCard>

        {/* Unterlagen */}
        <Link
          href="/portal/dokumente"
          className="group block focus:outline-none"
          aria-label="Zu meinen Unterlagen"
        >
          <SectionCard
            icon={<FolderClosed className="h-5 w-5" />}
            title="Unterlagen"
            subtitle="Eingereicht / Benötigt"
            className="h-full transition group-hover:shadow-[var(--shadow-card-hover)] group-focus-visible:ring-2 group-focus-visible:ring-ring"
          >
            <div className="flex items-end justify-between gap-3">
              <div className="font-display text-3xl font-semibold tracking-tight text-brand-primary tabular-nums">
                {eingereicht}
                <span className="text-brand-muted"> / </span>
                {benoetigt}
              </div>
              <div className="text-sm font-semibold tabular-nums text-brand-accent">
                {dokPct}%
              </div>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-brand-surfaceMuted">
              <div
                className="h-full rounded-full bg-brand-accent transition-all"
                style={{ width: `${dokPct}%` }}
              />
            </div>
            <p className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
              {dokHint}
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </p>
          </SectionCard>
        </Link>

        {/* Finanzierung */}
        <SectionCard icon={<Coins className="h-5 w-5" />} title="Finanzierung">
          {(() => {
            const hint = pickFinanzierungHint({
              cases,
              hasReservierung,
              submittedAt,
              maxFin: maxFin == null ? null : Number(maxFin),
            });

            if (hint.kind === "cta") {
              return (
                <>
                  <p className="text-sm text-muted-foreground">
                    Bitte fülle deine Selbstauskunft aus, damit wir deine
                    Finanzierung prüfen können.
                  </p>
                  <Button asChild size="sm" className="mt-3 rounded-2xl">
                    <Link href="/portal/selbstauskunft">
                      Selbstauskunft starten
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </>
              );
            }

            return (
              <>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-success">
                  Bonität geprüft
                </div>
                {maxFin != null && (
                  <div className="mt-1 font-display text-3xl font-semibold tabular-nums tracking-tight text-brand-ink">
                    {fmtEUR0(Number(maxFin))}
                  </div>
                )}
                <p className="mt-2 text-sm text-muted-foreground">{hint.text}</p>
              </>
            );
          })()}
        </SectionCard>
      </section>

      {/* Meine Wohnungen */}
      <section className="mt-10">
        <h2 className="mb-4 font-display text-xl font-semibold tracking-tight">
          Meine Wohnungen
        </h2>
        {data.einheiten.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {data.einheiten.map((e) => (
              <SectionCard key={e.einheit_id} className="overflow-hidden" noPadding>
                {e.cover_image_url ? (
                  <div
                    className="h-40 w-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${e.cover_image_url})` }}
                  />
                ) : (
                  <div className="flex h-40 w-full items-center justify-center bg-[color:var(--highlight-bg)] text-[color:var(--primary)]">
                    <Building2 className="h-10 w-10 opacity-60" />
                  </div>
                )}
                <div className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-display text-base font-semibold">
                        {e.projekt_name ?? "Wohnung"}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {[e.adresse, [e.plz, e.stadt].filter(Boolean).join(" ")]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                    <Badge
                      variant={statusBadge(
                        e.reservierung_status ?? e.zuweisung_status ?? e.status,
                      )}
                    >
                      {e.reservierung_status ?? e.zuweisung_status ?? e.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Details und Unterlagen folgen in Kürze in deinem Portal.
                  </p>
                </div>
              </SectionCard>
            ))}
          </div>
        ) : (
          <SectionCard>
            <p className="text-sm text-muted-foreground">
              Hier erscheinen die Wohnungen, die dein Berater für dich
              vorbereitet hat.
            </p>
          </SectionCard>
        )}
      </section>

      {/* Meine Finanzierung */}
      <section className="mt-10">
        <h2 className="mb-4 font-display text-xl font-semibold tracking-tight">
          {cases.length === 1
            ? "Deine Finanzierungsanfrage"
            : "Deine Finanzierungsanfragen"}
        </h2>
        {cases.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {cases.map((c) => {
              const label =
                CASE_STATUS_KUNDE[c.status as CaseStatus] ?? c.status;
              const datum = c.created_at
                ? new Date(c.created_at).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })
                : null;
              return (
                <SectionCard
                  key={c.id}
                  icon={<Banknote className="h-5 w-5" />}
                  title="Finanzierungsanfrage"
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">
                    {label}
                  </div>
                  {datum ? (
                    <div className="mt-2 text-xs text-brand-muted">
                      Anfrage vom {datum}
                    </div>
                  ) : null}
                </SectionCard>
              );
            })}
          </div>
        ) : (
          <SectionCard>
            <p className="text-sm text-muted-foreground">
              Du hast aktuell keine offene Finanzierungsanfrage. Sobald dein
              Berater eine startet, siehst du hier den Status.
            </p>
          </SectionCard>
        )}
      </section>

      {/* Berater + Nächste Schritte */}
      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <SectionCard icon={<Mail className="h-5 w-5" />} title="Mein Berater">
          {data.vp ? (
            <div className="flex items-start gap-4">
              {data.vp.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.vp.avatar_url}
                  alt={data.vp.name ?? "Berater"}
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--highlight-bg)] font-display text-lg font-bold text-[color:var(--primary)]">
                  {(data.vp.vorname?.[0] ?? data.vp.name?.[0] ?? "B").toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-display text-base font-semibold">
                  {data.vp.name ||
                    [data.vp.vorname, data.vp.nachname]
                      .filter(Boolean)
                      .join(" ") ||
                    "Dein Berater"}
                </div>
                <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                  {data.vp.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5" />
                      <a
                        href={`mailto:${data.vp.email}`}
                        className="hover:text-foreground"
                      >
                        {data.vp.email}
                      </a>
                    </div>
                  )}
                  {data.vp.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5" />
                      <a
                        href={`tel:${data.vp.phone}`}
                        className="hover:text-foreground"
                      >
                        {data.vp.phone}
                      </a>
                    </div>
                  )}
                </div>
                {data.vp.email && (
                  <Button asChild variant="outline" size="sm" className="mt-3">
                    <a href={`mailto:${data.vp.email}`}>Anschreiben</a>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Dein Berater wird gerade zugewiesen.
            </p>
          )}
        </SectionCard>

        <SectionCard
          icon={<CalendarCheck className="h-5 w-5" />}
          title="Wichtige nächste Schritte"
        >
          <ul className="space-y-3 text-sm">
            <NextStep
              done={false}
              label="Lade deine Finanzierungs-Unterlagen hoch"
              href="/portal/dokumente"
              cta="Jetzt starten"
            />
            <NextStep
              done={!!data.kunde?.persoenlicher_steuersatz}
              label="Vervollständige deine Selbstauskunft"
              href="/portal/selbstauskunft"
              cta="Selbstauskunft öffnen"
            />
            <NextStep
              done={!!reservierteEinheit?.reservierung_status}
              label="Reservierung mit deinem Berater abstimmen"
            />
          </ul>
        </SectionCard>
      </section>
    </div>
  );
}

function NextStep({
  done,
  label,
  href,
  cta,
}: {
  done: boolean;
  label: string;
  href?: string;
  cta?: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <CheckCircle2
        className={`mt-0.5 h-5 w-5 shrink-0 ${
          done ? "text-[color:var(--success)]" : "text-muted-foreground/40"
        }`}
      />
      <div className="min-w-0 flex-1">
        <div className={done ? "text-muted-foreground line-through" : ""}>
          {label}
        </div>
        {!done && href && cta && (
          <Link
            href={href}
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[color:var(--primary)] hover:underline"
          >
            {cta}
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </li>
  );
}

"use client";

import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { formatEUR } from "@/lib/objekt-format";
import { CASE_STATUS_LABEL, type CaseStatus } from "@/lib/finanzierung-status";
import type { CaseListItem } from "@/lib/data/finanzierung";

const STATUS_TONE: Record<CaseStatus, string> = {
  neu: "bg-brand-infoSoft text-brand-info",
  in_pruefung: "bg-brand-infoSoft text-brand-info",
  in_bearbeitung: "bg-brand-infoSoft text-brand-info",
  angefragt: "bg-brand-infoSoft text-brand-info",
  unterlagen_fehlen: "bg-brand-warningSoft text-brand-warning",
  angebot_vorhanden: "bg-brand-accentSoft text-brand-accent",
  angebot_beim_kunden: "bg-brand-accentSoft text-brand-accent",
  angebot_akzeptiert: "bg-brand-successSoft text-brand-success",
  genehmigt: "bg-brand-successSoft text-brand-success",
  bewilligt: "bg-brand-successSoft text-brand-success",
  ausgezahlt: "bg-brand-successSoft text-brand-success",
  abgelehnt: "bg-brand-dangerSoft text-brand-danger",
  storniert: "bg-brand-dangerSoft text-brand-danger",
};

const OFFEN_STATUS: CaseStatus[] = [
  "neu",
  "in_pruefung",
  "angefragt",
  "in_bearbeitung",
  "unterlagen_fehlen",
];
const ANGEBOT_STATUS: CaseStatus[] = [
  "angebot_vorhanden",
  "angebot_beim_kunden",
  "angebot_akzeptiert",
];
const ERLEDIGT_STATUS: CaseStatus[] = [
  "genehmigt",
  "bewilligt",
  "ausgezahlt",
  "abgelehnt",
  "storniert",
];

export function FinanzierungenListView({
  cases,
  isFin,
  isAdminLike,
}: {
  cases: CaseListItem[];
  isFin: boolean;
  isAdminLike: boolean;
}) {
  const showList = isFin || isAdminLike;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <PageHeader
        title="Finanzierungen"
        description={
          isFin
            ? "Eingehende Anfragen und laufende Cases"
            : isAdminLike
              ? "Alle Cases im Überblick"
              : "Cases sind in der jeweiligen Kunden-Akte sichtbar"
        }
      />

      {!showList ? <VpHint /> : <CaseList cases={cases} />}
    </div>
  );
}

function VpHint() {
  return (
    <div className="rounded-3xl border border-brand-border bg-card p-8 text-center shadow-card">
      <p className="text-sm text-brand-body">
        Finanzierungscases öffnest du direkt in der Akte des jeweiligen Kunden unter dem Reiter
        &bdquo;Finanzierung&ldquo;.
      </p>
      <Link
        href="/kunden"
        className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Zu meinen Kunden <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function CaseList({ cases }: { cases: CaseListItem[] }) {
  if (cases.length === 0) {
    return (
      <div className="rounded-3xl border border-brand-border bg-card p-10 text-center text-sm text-brand-muted shadow-card">
        Aktuell keine offenen Cases.
      </div>
    );
  }

  const buckets = {
    offen: cases.filter((c) => OFFEN_STATUS.includes(c.status)),
    angebot: cases.filter((c) => ANGEBOT_STATUS.includes(c.status)),
    erledigt: cases.filter((c) => ERLEDIGT_STATUS.includes(c.status)),
  };

  return (
    <div className="space-y-6">
      <KpiRow cases={cases} />
      <Section title="Offen" items={buckets.offen} />
      <Section title="Angebot" items={buckets.angebot} />
      <Section title="Erledigt" items={buckets.erledigt} muted />
    </div>
  );
}

function KpiRow({ cases }: { cases: CaseListItem[] }) {
  const offen = cases.filter((c) => OFFEN_STATUS.includes(c.status)).length;
  const angebot = cases.filter((c) => ANGEBOT_STATUS.includes(c.status)).length;
  const erledigt = cases.filter((c) => ERLEDIGT_STATUS.includes(c.status)).length;
  const volumen = cases.reduce((s, c) => s + (c.finanzierungs_summe ?? 0), 0);
  const tiles = [
    { label: "Offene Anfragen", value: String(offen) },
    { label: "Angebote draußen", value: String(angebot) },
    { label: "Erledigt", value: String(erledigt) },
    { label: "Pipeline-Volumen", value: formatEUR(volumen) },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="rounded-3xl border border-brand-border bg-card p-5 shadow-card"
        >
          <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand-muted">
            {t.label}
          </div>
          <div className="mt-2 font-display text-2xl font-semibold tracking-tight text-brand-primary tabular-nums">
            {t.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function Section({
  title,
  items,
  muted,
}: {
  title: string;
  items: CaseListItem[];
  muted?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand-muted">
        {title} <span className="ml-2 tabular-nums">{items.length}</span>
      </h2>
      <ul className="space-y-2">
        {items.map((c) => (
          <li key={c.id}>
            <Link
              href={`/finanzierungen/${c.id}`}
              className={`group flex items-center gap-4 rounded-3xl border border-brand-border bg-card p-4 shadow-card transition hover:border-brand-primary/40 ${
                muted ? "opacity-80" : ""
              }`}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-primaryTint text-brand-primary">
                <Building2 className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display font-semibold text-brand-ink">
                    {c.kunde?.vorname ?? ""} {c.kunde?.nachname ?? ""}
                  </span>
                  <Badge
                    className={`${STATUS_TONE[c.status]} border-transparent text-[11px] font-medium`}
                  >
                    {CASE_STATUS_LABEL[c.status]}
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-brand-muted">
                  {c.einheit?.projekt_name ?? "—"} · {c.einheit?.wohnungsnummer ?? "—"} ·{" "}
                  {c.einheit?.stadt ?? "—"} ·{" "}
                  {new Date(c.created_at).toLocaleDateString("de-DE")}
                </div>
              </div>
              <div className="hidden text-right md:block">
                <div className="text-[11px] uppercase tracking-[0.2em] text-brand-muted">
                  Kaufpreis
                </div>
                <div className="font-display text-base font-semibold text-brand-primary tabular-nums">
                  {formatEUR(c.einheit?.kaufpreis ?? null)}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-brand-muted transition group-hover:translate-x-0.5 group-hover:text-brand-primary" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

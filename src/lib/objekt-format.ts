import type { EinheitStatus } from "@/lib/data/objekte";

export const STATUS_LABELS: Record<EinheitStatus, string> = {
  verfuegbar: "Verfügbar",
  reserviert: "Reserviert",
  in_finanzierung: "In Finanzierung",
  kaufvertrag_bestellt: "Kaufvertrag bestellt",
  notartermin: "Notartermin",
  verkauft: "Verkauft",
  abgebrochen: "Abgebrochen",
};

export const STATUS_BADGE_CLASS: Record<EinheitStatus, string> = {
  verfuegbar: "bg-success text-success-foreground",
  reserviert: "bg-warning text-warning-foreground",
  in_finanzierung: "bg-info text-info-foreground",
  kaufvertrag_bestellt: "bg-brand-accent text-white",
  notartermin: "bg-brand-accentHover text-white",
  verkauft: "bg-muted text-muted-foreground",
  abgebrochen: "bg-destructive text-destructive-foreground",
};

export function formatEUR(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatNumber(n: number | null | undefined, suffix = ""): string {
  if (n == null) return "—";
  return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(n)}${suffix}`;
}

export function pricePerSqm(kp: number | null, fl: number | null): number | null {
  if (!kp || !fl || fl === 0) return null;
  return kp / fl;
}

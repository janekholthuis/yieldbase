import type { EinheitStatus } from "@/lib/data/objekte";

export const STATUS_LABELS: Record<EinheitStatus, string> = {
  frei: "Frei",
  auf_anfrage: "Auf Anfrage",
  reserviert: "Reserviert",
  notarvorbereitung: "Notarvorbereitung",
  notartermin: "Notartermin",
  verkauft: "Verkauft",
};

export const STATUS_BADGE_CLASS: Record<EinheitStatus, string> = {
  frei: "bg-success text-success-foreground",
  auf_anfrage: "bg-info text-info-foreground",
  reserviert: "bg-warning text-warning-foreground",
  notarvorbereitung: "bg-brand-accent text-white",
  notartermin: "bg-brand-accentHover text-white",
  verkauft: "bg-muted text-muted-foreground",
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

/**
 * Joins address parts into one line, dropping any part already represented in an
 * earlier part. `adresse` often already contains PLZ + Stadt, so a naive
 * `[adresse, plz, stadt].join(", ")` produces duplicates like
 * "Schonensche Straße 13, 10439 Berlin, 10439, Berlin". This collapses them to
 * "Schonensche Straße 13, 10439 Berlin".
 */
export function formatAddress(
  adresse?: string | null,
  plz?: string | null,
  stadt?: string | null,
  bundesland?: string | null,
): string {
  const out: string[] = [];
  let acc = "";
  for (const raw of [adresse, plz, stadt, bundesland]) {
    const s = (raw ?? "").trim();
    if (!s) continue;
    if (acc.includes(s.toLowerCase())) continue; // already represented
    out.push(s);
    acc += " " + s.toLowerCase();
  }
  return out.join(", ");
}

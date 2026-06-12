// Derived purchase-cost helpers for Objekte (PROJ-12).
// Grunderwerbsteuer (real-estate transfer tax) varies by Bundesland; Notar &
// Gerichtskosten default to 2% of the price; Gebäudeanteil = price − land share.
// Pure + framework-agnostic — usable in client forms and server actions.

/** Grunderwerbsteuer rate (%) per Bundesland (Stand 2026). */
export const GRUNDERWERBSTEUER_SATZ: Record<string, number> = {
  "Baden-Württemberg": 5.0,
  Bayern: 3.5,
  Berlin: 6.0,
  Brandenburg: 6.5,
  Bremen: 5.0,
  Hamburg: 5.5,
  Hessen: 6.0,
  "Mecklenburg-Vorpommern": 6.0,
  Niedersachsen: 5.0,
  "Nordrhein-Westfalen": 6.5,
  "Rheinland-Pfalz": 5.0,
  Saarland: 6.5,
  Sachsen: 5.5,
  "Sachsen-Anhalt": 5.0,
  "Schleswig-Holstein": 6.5,
  Thüringen: 6.5,
};

export const BUNDESLAENDER = Object.keys(GRUNDERWERBSTEUER_SATZ);

/** Default notary + court cost rate (% of Kaufpreis), overridable. */
export const NOTAR_GERICHT_SATZ_DEFAULT = 2.0;

export function grunderwerbsteuerSatz(bundesland?: string | null): number | null {
  if (!bundesland) return null;
  return GRUNDERWERBSTEUER_SATZ[bundesland.trim()] ?? null;
}

export function grunderwerbsteuer(
  kaufpreis: number | null | undefined,
  bundesland?: string | null,
): number | null {
  const satz = grunderwerbsteuerSatz(bundesland);
  if (kaufpreis == null || satz == null) return null;
  return (kaufpreis * satz) / 100;
}

export function notarGerichtskosten(
  kaufpreis: number | null | undefined,
  satz: number = NOTAR_GERICHT_SATZ_DEFAULT,
): number | null {
  if (kaufpreis == null) return null;
  return (kaufpreis * satz) / 100;
}

/** Gebäudeanteil (AfA basis) = Kaufpreis − Grundstückswertanteil. */
export function gebaeudeanteil(
  kaufpreis: number | null | undefined,
  grundstueckswertAnteil: number | null | undefined,
): number | null {
  if (kaufpreis == null) return null;
  return Math.max(0, kaufpreis - (grundstueckswertAnteil ?? 0));
}

/** Sum of derived ancillary purchase costs (GrESt + Notar/Gericht). */
export function kaufnebenkosten(
  kaufpreis: number | null | undefined,
  bundesland?: string | null,
  notarSatz: number = NOTAR_GERICHT_SATZ_DEFAULT,
): number | null {
  if (kaufpreis == null) return null;
  const grest = grunderwerbsteuer(kaufpreis, bundesland) ?? 0;
  const notar = notarGerichtskosten(kaufpreis, notarSatz) ?? 0;
  return grest + notar;
}

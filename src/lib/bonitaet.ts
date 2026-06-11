// Reine Berechnungs-Logik für Bonitäts-Schnellcheck.
// Keine DB-Calls, isomorph nutzbar (Server-Function + UI Live-Preview).

export type BerufStatus = "angestellter" | "selbststaendiger" | "unternehmer";

export interface BonitaetInput {
  brutto: number;
  verheiratet: boolean;
  eigenkapital: number;
  kreditverpflichtungen_monatlich: number;
  erwachsene_im_haushalt: 1 | 2;
  kinder_anzahl: number;
  beruf_status: BerufStatus;
}

export interface BonitaetBreakdown {
  steuersatz_durchschnitt: number; // 0..1, für Bonitäts-Berechnung
  steuersatz_grenze: number; // 0..1, für spätere Kalkulations-Module
  netto_jahr: number;
  netto_monat: number;
  lebenshaltung: number;
  verfuegbar: number;
  max_monatsrate: number;
  max_darlehen: number;
  max_finanzierbar: number;
}

export interface BonitaetResult extends BonitaetBreakdown {
  breakdown: BonitaetBreakdown;
}

// Progressive Stufen 2026 (vereinfacht).
// Jede Stufe: bis zu welchem zvE sie gilt + Grenzsteuersatz auf den Anteil in der Stufe.
const TAX_BRACKETS: Array<{ bis: number; satz: number }> = [
  { bis: 11604, satz: 0 },
  { bis: 17000, satz: 0.14 },
  { bis: 35000, satz: 0.25 },
  { bis: 60000, satz: 0.32 },
  { bis: 100000, satz: 0.38 },
  { bis: 200000, satz: 0.42 },
  { bis: Infinity, satz: 0.45 },
];

/** Grenzsteuersatz: Satz der Stufe, in die das zvE fällt. */
export function lookupGrenzsteuersatz(zvE: number): number {
  for (const b of TAX_BRACKETS) {
    if (zvE <= b.bis) return b.satz;
  }
  return 0.45;
}

/** Absolute Steuer durch Aufsummierung der Stufenbeträge. */
function steuerAbsolut(zvE: number): number {
  let prevBis = 0;
  let steuer = 0;
  for (const b of TAX_BRACKETS) {
    if (zvE <= prevBis) break;
    const obergrenze = Math.min(zvE, b.bis);
    const anteil = obergrenze - prevBis;
    steuer += anteil * b.satz;
    prevBis = b.bis;
  }
  return steuer;
}

/** Durchschnittsteuersatz auf das Gesamtbrutto, mit Splittingtarif-Logik. */
export function lookupDurchschnittsteuersatz(brutto: number, verheiratet: boolean): number {
  if (brutto <= 0) return 0;
  if (verheiratet) {
    // Splittingtarif: Steuer pro Hälfte berechnen, verdoppeln, auf Brutto teilen
    const halb = brutto / 2;
    const steuer = 2 * steuerAbsolut(halb);
    return steuer / brutto;
  }
  return steuerAbsolut(brutto) / brutto;
}

export function calculateBonitaet(input: BonitaetInput): BonitaetResult {
  const brutto = Math.max(0, input.brutto);
  const ek = Math.max(0, input.eigenkapital);
  const kredite = Math.max(0, input.kreditverpflichtungen_monatlich);
  const erw = input.erwachsene_im_haushalt === 2 ? 2 : 1;
  const kinder = Math.max(0, input.kinder_anzahl);

  // Schritt 1: Beide Steuersätze
  const steuersatz_durchschnitt = lookupDurchschnittsteuersatz(brutto, input.verheiratet);
  const grenzeBasis = input.verheiratet ? brutto / 2 : brutto;
  const steuersatz_grenze = lookupGrenzsteuersatz(grenzeBasis);

  // Schritt 2: Netto (Durchschnittsteuer + 20% pauschal Sozialabgaben)
  const netto_jahr = Math.max(0, brutto * (1 - steuersatz_durchschnitt - 0.2));
  const netto_monat = netto_jahr / 12;

  // Schritt 3: Lebenshaltung
  const lebenshaltung = (erw === 2 ? 1600 : 1000) + 350 * kinder;

  // Schritt 4: Verfügbar
  const verfuegbar = Math.max(0, netto_monat - lebenshaltung - kredite);

  // Schritt 5: Max. Monatsrate (35% Banker-Faktor, konservativ)
  const max_monatsrate = verfuegbar * 0.35;

  // Schritt 6: Max. Darlehen (4% Zins + 2% Tilgung = 6% Annuität)
  const max_darlehen = (max_monatsrate * 12) / 0.06;

  // Schritt 7: Max. Kaufpreis (12% Kaufnebenkosten)
  const max_finanzierbar = (max_darlehen + ek) / 1.12;

  const breakdown: BonitaetBreakdown = {
    steuersatz_durchschnitt,
    steuersatz_grenze,
    netto_jahr,
    netto_monat,
    lebenshaltung,
    verfuegbar,
    max_monatsrate,
    max_darlehen,
    max_finanzierbar,
  };

  return { ...breakdown, breakdown };
}

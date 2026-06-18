// PROJ-24: Generische Musterobjekte für die Lead-Sandbox. KEINE echten Daten,
// kein DB-Zugriff — rein statisch, client-safe. Bewusst neutral/anonymisiert.

import type { CalcInputs } from "@/lib/kalkulation";

export interface DemoUnit {
  id: string;
  bezeichnung: string;
  zimmer: number;
  wohnflaeche: number; // m²
  etage: string;
  kaufpreis: number; // €
  kaltmieteMonat: number; // €
  status: "frei" | "reserviert" | "verkauft";
}

export interface DemoProjekt {
  id: string;
  name: string;
  strasse: string;
  plz: string;
  stadt: string;
  baujahr: number;
  zustand: string;
  energieklasse: string;
  /** Akzent-Tönung für den Karten-Header (Tailwind-Gradient-Klasse). */
  accent: string;
  einheiten: DemoUnit[];
}

export const DEMO_PROJEKTE: DemoProjekt[] = [
  {
    id: "p1",
    name: "Stadtquartier Lindenhöfe",
    strasse: "Lindenstraße 12",
    plz: "04109",
    stadt: "Leipzig",
    baujahr: 1998,
    zustand: "gepflegt",
    energieklasse: "C",
    accent: "from-slate-100 to-slate-200",
    einheiten: [
      { id: "p1-1", bezeichnung: "WE 03", zimmer: 2, wohnflaeche: 58, etage: "1. OG", kaufpreis: 189000, kaltmieteMonat: 690, status: "frei" },
      { id: "p1-2", bezeichnung: "WE 07", zimmer: 3, wohnflaeche: 74, etage: "2. OG", kaufpreis: 244000, kaltmieteMonat: 880, status: "frei" },
      { id: "p1-3", bezeichnung: "WE 11", zimmer: 1, wohnflaeche: 41, etage: "3. OG", kaufpreis: 142000, kaltmieteMonat: 520, status: "reserviert" },
    ],
  },
  {
    id: "p2",
    name: "Wohnpark Auenblick",
    strasse: "Am Auenpark 4",
    plz: "01097",
    stadt: "Dresden",
    baujahr: 2016,
    zustand: "neuwertig",
    energieklasse: "A",
    accent: "from-stone-100 to-stone-200",
    einheiten: [
      { id: "p2-1", bezeichnung: "WE 02", zimmer: 3, wohnflaeche: 81, etage: "EG", kaufpreis: 329000, kaltmieteMonat: 1090, status: "frei" },
      { id: "p2-2", bezeichnung: "WE 05", zimmer: 2, wohnflaeche: 62, etage: "1. OG", kaufpreis: 268000, kaltmieteMonat: 850, status: "frei" },
    ],
  },
  {
    id: "p3",
    name: "Altbau-Ensemble Gründerzeit",
    strasse: "Kaiserallee 28",
    plz: "76133",
    stadt: "Karlsruhe",
    baujahr: 1904,
    zustand: "saniert",
    energieklasse: "D",
    accent: "from-zinc-100 to-zinc-200",
    einheiten: [
      { id: "p3-1", bezeichnung: "WE 01", zimmer: 4, wohnflaeche: 112, etage: "Hochparterre", kaufpreis: 415000, kaltmieteMonat: 1340, status: "frei" },
      { id: "p3-2", bezeichnung: "WE 04", zimmer: 2, wohnflaeche: 67, etage: "2. OG", kaufpreis: 251000, kaltmieteMonat: 820, status: "verkauft" },
      { id: "p3-3", bezeichnung: "WE 06", zimmer: 3, wohnflaeche: 89, etage: "3. OG", kaufpreis: 318000, kaltmieteMonat: 1020, status: "frei" },
    ],
  },
  {
    id: "p4",
    name: "Neubau Hafenterrassen",
    strasse: "Speicherweg 9",
    plz: "20457",
    stadt: "Hamburg",
    baujahr: 2022,
    zustand: "Erstbezug",
    energieklasse: "A+",
    accent: "from-neutral-100 to-neutral-200",
    einheiten: [
      { id: "p4-1", bezeichnung: "WE 12", zimmer: 2, wohnflaeche: 55, etage: "4. OG", kaufpreis: 312000, kaltmieteMonat: 940, status: "frei" },
      { id: "p4-2", bezeichnung: "WE 18", zimmer: 3, wohnflaeche: 78, etage: "5. OG", kaufpreis: 446000, kaltmieteMonat: 1280, status: "reserviert" },
    ],
  },
];

/** Bruttomietrendite in % (Jahreskaltmiete / Kaufpreis). */
export function bruttorendite(u: DemoUnit): number {
  return ((u.kaltmieteMonat * 12) / u.kaufpreis) * 100;
}

/** Sinnvolle Default-Kalkulationsinputs für ein Musterobjekt (für den Rechner). */
export function demoCalcInputs(u: DemoUnit): CalcInputs {
  return {
    kaufpreis: u.kaufpreis,
    kaltmieteMonat: u.kaltmieteMonat,
    hausgeldNichtUmlagef: Math.round(u.wohnflaeche * 0.6),
    instandhaltung: Math.round(u.wohnflaeche * 0.5),
    sondereigVerwaltung: 25,
    grundstueckswertAnteil: 20,
    ekBetrag: Math.round(u.kaufpreis * 0.1),
    kaufnebenkostenProzent: 10,
    kaufnebenkostenFinanziert: false,
    zins: 3.8,
    tilgung: 2,
    haltedauerJahre: 15,
    afaSatz: 2,
    wertsteigerung: 2,
    mietsteigerung: 2,
    steuersatz: 42,
    erhaltungsaufwand: 0,
  };
}

export const DEMO_KPIS = {
  objekte: DEMO_PROJEKTE.length,
  einheiten: DEMO_PROJEKTE.reduce((n, p) => n + p.einheiten.length, 0),
  frei: DEMO_PROJEKTE.reduce(
    (n, p) => n + p.einheiten.filter((e) => e.status === "frei").length,
    0,
  ),
};

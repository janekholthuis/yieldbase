// Reine Kalkulations-Engine — keine DOM/Server-Abhängigkeiten.
// Annuitätendarlehen (Bank + optionale KfW-Tranche), monatlicher Cashflow,
// Steuer (lineare AfA, Denkmal-AfA §7i, Sonder-AfA §7b, Möblierungs-AfA) und
// Vermögensentwicklung. Alle ab Kalkulation 2.0 (PROJ-20) ergänzten Felder
// sind optional und fallen auf das bisherige Verhalten zurück.

export type AfaTyp = "linear" | "denkmal" | "sonder_7b";

export interface CalcInputs {
  // Objekt
  kaufpreis: number;
  kaltmieteMonat: number;
  hausgeldNichtUmlagef: number; // €/Monat
  instandhaltung: number; // €/Monat
  sondereigVerwaltung: number; // €/Monat
  grundstueckswertAnteil: number; // % vom Kaufpreis (Default 20%)
  // Finanzierung
  ekBetrag: number; // €
  kaufnebenkostenProzent: number; // % vom Kaufpreis (Default 10)
  kaufnebenkostenFinanziert: boolean;
  zins: number; // % p.a. (Bank-Tranche)
  tilgung: number; // % p.a. (Bank-Tranche)
  // Annahmen
  haltedauerJahre: number;
  afaSatz: number; // % p.a. — lineare AfA auf den Gebäudewert
  wertsteigerung: number; // % p.a.
  mietsteigerung: number; // % p.a. (default 2)
  steuersatz: number; // %
  erhaltungsaufwand: number; // € einmalig Jahr 1

  // --- Kalkulation 2.0 (alle optional, Defaults = bisheriges Verhalten) ---
  // AfA-Typ
  afaTyp?: AfaTyp; // default "linear"
  // Denkmal-AfA §7i: Gebäudewert wird in Altbausubstanz + Sanierungsanteil gesplittet
  sanierungsanteil?: number; // € (Modernisierungs-/Sanierungskosten, Teil des Gebäudewerts)
  altbauAfaSatz?: number; // % linear für die Altbausubstanz (2 oder 2,5)
  // Sonder-AfA §7b (Neubau, vermietet): 5 % p.a. in den ersten 4 Jahren on top
  sonderAfaBemessung?: number; // € Bemessungsgrundlage für die Sonder-AfA (default = Gebäudewert)
  // Möblierungs-AfA (linear über Nutzungsdauer)
  moeblierungswert?: number; // €
  moeblierungJahre?: number; // Nutzungsdauer (default 10)
  // Inflation — steigert die nicht-umlagefähigen Bewirtschaftungskosten p.a.
  inflation?: number; // % p.a. (default 0 = konstant)
  // KfW-Förderung als zweite Darlehenstranche
  kfwBetrag?: number; // € (Teil des Gesamtdarlehens, Rest läuft als Bank-Tranche)
  kfwZins?: number; // % p.a.
  kfwTilgung?: number; // % p.a.
  kfwTilgungszuschussProzent?: number; // % von kfwBetrag, als Tilgungszuschuss in Jahr 1 gutgeschrieben
}

export interface JahrZeile {
  jahr: number;
  immobilienwert: number;
  restschuld: number;
  vermoegen: number;
  cashflowMonat: number;
  steuerersparnisJahr: number;
  afaJahr: number;
}

export interface CalcResult {
  inputs: CalcInputs;

  kaufnebenkosten: number;
  gesamtkosten: number;
  darlehen: number;
  bankTranche: number;
  kfwTranche: number;
  ekTatsaechlich: number; // EK + (KNK falls nicht finanziert)
  gebaeudewert: number;

  annuitaetMonat: number; // Bank + KfW
  zinsMonat1: number;
  tilgungMonat1: number;

  // Cashflow Jahr 1 (Detail-Komponenten)
  bruttomieteMonat: number;
  kostenMonat: number; // Hausgeld+Instand+Sondereig
  cashflowVorSteuerMonat: number;
  steuerersparnisMonat1: number;
  cashflowNachSteuerMonat: number;
  afaJahr1: number; // gesamte AfA in Jahr 1 (alle Komponenten)

  bruttoMietrendite: number; // %

  // Über Haltedauer
  jahre: JahrZeile[];
  summeCashflows: number;
  kumulierteSteuerersparnis: number;
  endRestschuld: number;
  endImmobilienwert: number;
  endVermoegen: number; // = wert - restschuld
  ekRenditeMultiplikator: number; // (vermoegen + cashflows) / ek
  ekRenditeProJahr: number; // %
}

// AfA-Betrag für ein konkretes Jahr (1-basiert) über alle aktiven Komponenten.
function afaFuerJahr(jahr: number, gebaeudewert: number, i: CalcInputs): number {
  const typ = i.afaTyp ?? "linear";
  let afa = 0;

  if (typ === "denkmal") {
    // Sanierungsanteil läuft degressiv nach §7i, der Rest (Altbausubstanz) linear.
    const sanierung = Math.min(Math.max(0, i.sanierungsanteil ?? 0), gebaeudewert);
    const altbau = Math.max(0, gebaeudewert - sanierung);
    const altbauSatz = i.altbauAfaSatz ?? 2;
    afa += (altbau * altbauSatz) / 100;
    if (jahr >= 1 && jahr <= 8) afa += sanierung * 0.09;
    else if (jahr >= 9 && jahr <= 12) afa += sanierung * 0.07;
  } else {
    // linear & sonder_7b teilen sich die lineare Basis-AfA auf den Gebäudewert.
    afa += (gebaeudewert * i.afaSatz) / 100;
    if (typ === "sonder_7b" && jahr >= 1 && jahr <= 4) {
      const bemessung = Math.min(Math.max(0, i.sonderAfaBemessung ?? gebaeudewert), gebaeudewert);
      afa += bemessung * 0.05;
    }
  }

  // Möblierungs-AfA (linear über Nutzungsdauer) — additiv zu jedem Typ.
  const moebel = Math.max(0, i.moeblierungswert ?? 0);
  const moebelJahre = Math.max(1, i.moeblierungJahre ?? 10);
  if (moebel > 0 && jahr >= 1 && jahr <= moebelJahre) {
    afa += moebel / moebelJahre;
  }

  return afa;
}

export function calculate(i: CalcInputs): CalcResult {
  const knk = i.kaufpreis * (i.kaufnebenkostenProzent / 100);
  const gesamtkosten = i.kaufpreis + knk;
  const darlehen = Math.max(
    0,
    i.kaufnebenkostenFinanziert ? gesamtkosten - i.ekBetrag : i.kaufpreis - i.ekBetrag,
  );
  const ekTatsaechlich = i.kaufnebenkostenFinanziert ? i.ekBetrag : i.ekBetrag + knk;
  const gebaeudewert = i.kaufpreis * (1 - i.grundstueckswertAnteil / 100);

  // Darlehen in KfW- und Bank-Tranche aufteilen.
  const kfwTranche = Math.min(Math.max(0, i.kfwBetrag ?? 0), darlehen);
  const bankTranche = darlehen - kfwTranche;
  const kfwZins = i.kfwZins ?? 0;
  const kfwTilgung = i.kfwTilgung ?? 0;

  // Annuitäten je Tranche (Zins + Tilgung % vom Anfangsbetrag der Tranche).
  const bankAnnuitaetMonat = (bankTranche * ((i.zins + i.tilgung) / 100)) / 12;
  const kfwAnnuitaetMonat = (kfwTranche * ((kfwZins + kfwTilgung) / 100)) / 12;
  const annuitaetMonat = bankAnnuitaetMonat + kfwAnnuitaetMonat;
  const zinsMonat1 = (bankTranche * (i.zins / 100) + kfwTranche * (kfwZins / 100)) / 12;
  const tilgungMonat1 = annuitaetMonat - zinsMonat1;

  const kostenMonatBasis = i.hausgeldNichtUmlagef + i.instandhaltung + i.sondereigVerwaltung;
  const inflation = i.inflation ?? 0;

  // Jahr-für-Jahr-Simulation
  const jahre: JahrZeile[] = [];
  let restBank = bankTranche;
  let restKfw = kfwTranche;
  let immobilienwert = i.kaufpreis;
  let mieteMonat = i.kaltmieteMonat;
  let summeCashflows = 0;
  let kumulierteSteuer = 0;
  let cashflowNachSteuerMonat1 = 0;
  let steuerersparnisMonat1 = 0;
  let afaJahr1 = 0;

  // Year 0 = Start
  jahre.push({
    jahr: 0,
    immobilienwert,
    restschuld: restBank + restKfw,
    vermoegen: immobilienwert - (restBank + restKfw),
    cashflowMonat: 0,
    steuerersparnisJahr: 0,
    afaJahr: 0,
  });

  for (let y = 1; y <= i.haltedauerJahre; y++) {
    // Zins-/Tilgungsanteile beider Tranchen im Jahr aggregieren.
    let zinsJahr = 0;
    let tilgungJahr = 0;
    for (let m = 0; m < 12; m++) {
      if (restBank > 0) {
        const zinsM = (restBank * (i.zins / 100)) / 12;
        const tilgungM = Math.min(restBank, bankAnnuitaetMonat - zinsM);
        zinsJahr += zinsM;
        tilgungJahr += tilgungM;
        restBank -= tilgungM;
      }
      if (restKfw > 0) {
        const zinsM = (restKfw * (kfwZins / 100)) / 12;
        const tilgungM = Math.min(restKfw, kfwAnnuitaetMonat - zinsM);
        zinsJahr += zinsM;
        tilgungJahr += tilgungM;
        restKfw -= tilgungM;
      }
    }

    // KfW-Tilgungszuschuss in Jahr 1 gegen die Restschuld gutschreiben.
    if (y === 1 && (i.kfwTilgungszuschussProzent ?? 0) > 0 && kfwTranche > 0) {
      const zuschuss = kfwTranche * ((i.kfwTilgungszuschussProzent ?? 0) / 100);
      restKfw = Math.max(0, restKfw - zuschuss);
    }

    const afaJahr = afaFuerJahr(y, gebaeudewert, i);
    const kostenJahr = kostenMonatBasis * 12 * Math.pow(1 + inflation / 100, y - 1);
    const werbungskostenJahr = kostenJahr + zinsJahr + (y === 1 ? i.erhaltungsaufwand : 0);
    const steuerlVerlustJahr = afaJahr + werbungskostenJahr - mieteMonat * 12;
    // Negative Einkünfte → Steuerersparnis (vereinfacht: gesamter Verlust × Steuersatz)
    const steuerersparnisJahr = Math.max(0, steuerlVerlustJahr) * (i.steuersatz / 100);

    const cashflowJahrVorSteuer = mieteMonat * 12 - kostenJahr - (zinsJahr + tilgungJahr);
    const cashflowJahrNachSteuer = cashflowJahrVorSteuer + steuerersparnisJahr;
    const cashflowMonatNachSteuer = cashflowJahrNachSteuer / 12;

    summeCashflows += cashflowJahrNachSteuer;
    kumulierteSteuer += steuerersparnisJahr;

    immobilienwert = immobilienwert * (1 + i.wertsteigerung / 100);

    if (y === 1) {
      cashflowNachSteuerMonat1 = cashflowMonatNachSteuer;
      steuerersparnisMonat1 = steuerersparnisJahr / 12;
      afaJahr1 = afaJahr;
    }

    const restschuld = Math.max(0, restBank) + Math.max(0, restKfw);
    jahre.push({
      jahr: y,
      immobilienwert,
      restschuld,
      vermoegen: immobilienwert - restschuld,
      cashflowMonat: cashflowMonatNachSteuer,
      steuerersparnisJahr,
      afaJahr,
    });

    mieteMonat = mieteMonat * (1 + i.mietsteigerung / 100);
  }

  const endImmobilienwert = jahre[jahre.length - 1].immobilienwert;
  const endRestschuld = jahre[jahre.length - 1].restschuld;
  const endVermoegen = endImmobilienwert - endRestschuld;

  const totalReturn = endVermoegen + summeCashflows;
  const ekRenditeMultiplikator = ekTatsaechlich > 0 ? totalReturn / ekTatsaechlich : 0;
  const ekRenditeProJahr =
    ekTatsaechlich > 0 && i.haltedauerJahre > 0
      ? (Math.pow(Math.max(0.0001, ekRenditeMultiplikator), 1 / i.haltedauerJahre) - 1) * 100
      : 0;

  return {
    inputs: i,
    kaufnebenkosten: knk,
    gesamtkosten,
    darlehen,
    bankTranche,
    kfwTranche,
    ekTatsaechlich,
    gebaeudewert,
    annuitaetMonat,
    zinsMonat1,
    tilgungMonat1,
    bruttomieteMonat: i.kaltmieteMonat,
    kostenMonat: kostenMonatBasis,
    cashflowVorSteuerMonat: i.kaltmieteMonat - kostenMonatBasis - annuitaetMonat,
    steuerersparnisMonat1,
    cashflowNachSteuerMonat: cashflowNachSteuerMonat1,
    afaJahr1,
    bruttoMietrendite:
      i.kaufpreis > 0 ? ((i.kaltmieteMonat * 12) / i.kaufpreis) * 100 : 0,
    jahre,
    summeCashflows,
    kumulierteSteuerersparnis: kumulierteSteuer,
    endRestschuld,
    endImmobilienwert,
    endVermoegen,
    ekRenditeMultiplikator,
    ekRenditeProJahr,
  };
}

// --- Prognose-Szenarien (PROJ-20) ---
// Ein Szenario überschreibt nur die Zukunftsannahmen; die Engine bleibt gleich.
export type SzenarioKey = "konservativ" | "individuell" | "historisch";

export interface SzenarioAnnahmen {
  wertsteigerung: number;
  mietsteigerung: number;
  inflation: number;
}

export interface Szenario {
  key: SzenarioKey;
  label: string;
  beschreibung: string;
  editierbar: boolean;
  annahmen: SzenarioAnnahmen;
}

// Vorsichtige Werte — das „Sicherheitsnetz".
export const SZENARIO_KONSERVATIV: SzenarioAnnahmen = {
  wertsteigerung: 0.5,
  mietsteigerung: 1.0,
  inflation: 2.0,
};

// Bundesweite Langfrist-Durchschnitte (keine objektspezifische Prognose).
export const SZENARIO_HISTORISCH: SzenarioAnnahmen = {
  wertsteigerung: 3.0,
  mietsteigerung: 2.0,
  inflation: 2.0,
};

export function defaultSzenarien(individuell: SzenarioAnnahmen): Szenario[] {
  return [
    {
      key: "konservativ",
      label: "Konservativ",
      beschreibung: "Vorsichtige Annahmen als Sicherheitsnetz.",
      editierbar: false,
      annahmen: SZENARIO_KONSERVATIV,
    },
    {
      key: "individuell",
      label: "Individuell",
      beschreibung: "Frei anpassbare Annahmen für die Beratung.",
      editierbar: true,
      annahmen: individuell,
    },
    {
      key: "historisch",
      label: "Historisch",
      beschreibung:
        "Bundesweiter Langfrist-Durchschnitt für Wohnimmobilien — keine objektspezifische Prognose.",
      editierbar: false,
      annahmen: SZENARIO_HISTORISCH,
    },
  ];
}

// --- KfW-Förderprogramme (PROJ-20) ---
// Vereinfachte Presets; Konditionen sind editierbar und bewusst konservativ
// gehalten. KfW-Konditionen ändern sich — Werte vor Beratung prüfen.
export interface KfwProgramm {
  key: string;
  label: string;
  zins: number; // % p.a. (Richtwert)
  tilgung: number; // % p.a.
  maxBetrag: number; // € je Wohneinheit (Richtwert)
  tilgungszuschussProzent: number; // % (0 wenn keiner)
  hinweis: string;
}

export const KFW_PROGRAMME: KfwProgramm[] = [
  {
    key: "261",
    label: "KfW 261 — Wohngebäude (Sanierung zum Effizienzhaus)",
    zins: 3.0,
    tilgung: 2.0,
    maxBetrag: 150_000,
    tilgungszuschussProzent: 15,
    hinweis: "Tilgungszuschuss je nach erreichter Effizienzhaus-Stufe (5–45 %).",
  },
  {
    key: "297",
    label: "KfW 297/298 — Klimafreundlicher Neubau",
    zins: 2.5,
    tilgung: 2.0,
    maxBetrag: 100_000,
    tilgungszuschussProzent: 0,
    hinweis: "Zinsverbilligtes Darlehen, kein Tilgungszuschuss.",
  },
  {
    key: "300",
    label: "KfW 300 — Wohneigentum für Familien",
    zins: 2.1,
    tilgung: 2.0,
    maxBetrag: 170_000,
    tilgungszuschussProzent: 0,
    hinweis: "Nur Familien mit Kindern, Einkommensgrenzen beachten.",
  },
];

// Default-Hierarchie auflösen
export interface CalcDefaults {
  zins: number;
  tilgung: number;
  haltedauer: number;
  afa: number;
  ekProzent: number;
  wertsteigerung: number;
}

export const FALLBACK_DEFAULTS: CalcDefaults = {
  zins: 4.0,
  tilgung: 2.0,
  haltedauer: 10,
  afa: 2.0,
  ekProzent: 12.5,
  wertsteigerung: 2.0,
};

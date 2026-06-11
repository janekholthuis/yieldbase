// Reine Kalkulations-Engine — keine DOM/Server-Abhängigkeiten.
// Annuitätendarlehen, monatlicher Cashflow, Steuer, Vermögensentwicklung.

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
  zins: number; // % p.a.
  tilgung: number; // % p.a.
  // Annahmen
  haltedauerJahre: number;
  afaSatz: number; // % p.a.
  wertsteigerung: number; // % p.a.
  mietsteigerung: number; // % p.a. (default 2)
  steuersatz: number; // %
  erhaltungsaufwand: number; // € einmalig Jahr 1
}

export interface JahrZeile {
  jahr: number;
  immobilienwert: number;
  restschuld: number;
  vermoegen: number;
  cashflowMonat: number;
  steuerersparnisJahr: number;
}

export interface CalcResult {
  inputs: CalcInputs;

  kaufnebenkosten: number;
  gesamtkosten: number;
  darlehen: number;
  ekTatsaechlich: number; // EK + (KNK falls nicht finanziert)
  gebaeudewert: number;

  annuitaetMonat: number;
  zinsMonat1: number;
  tilgungMonat1: number;

  // Cashflow Jahr 1 (Detail-Komponenten)
  bruttomieteMonat: number;
  kostenMonat: number; // Hausgeld+Instand+Sondereig
  cashflowVorSteuerMonat: number;
  steuerersparnisMonat1: number;
  cashflowNachSteuerMonat: number;

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

export function calculate(i: CalcInputs): CalcResult {
  const knk = i.kaufpreis * (i.kaufnebenkostenProzent / 100);
  const gesamtkosten = i.kaufpreis + knk;
  const darlehen = Math.max(
    0,
    i.kaufnebenkostenFinanziert ? gesamtkosten - i.ekBetrag : i.kaufpreis - i.ekBetrag,
  );
  const ekTatsaechlich = i.kaufnebenkostenFinanziert ? i.ekBetrag : i.ekBetrag + knk;
  const gebaeudewert = i.kaufpreis * (1 - i.grundstueckswertAnteil / 100);

  // Annuität (zins + tilgung) % vom Anfangsdarlehen
  const annuitaetJahr = darlehen * ((i.zins + i.tilgung) / 100);
  const annuitaetMonat = annuitaetJahr / 12;
  const zinsMonat1 = (darlehen * (i.zins / 100)) / 12;
  const tilgungMonat1 = annuitaetMonat - zinsMonat1;

  const kostenMonat = i.hausgeldNichtUmlagef + i.instandhaltung + i.sondereigVerwaltung;
  const afaJahr = (gebaeudewert * i.afaSatz) / 100;
  const afaMonat = afaJahr / 12;

  // Jahr-für-Jahr-Simulation
  const jahre: JahrZeile[] = [];
  let restschuld = darlehen;
  let immobilienwert = i.kaufpreis;
  let mieteMonat = i.kaltmieteMonat;
  let summeCashflows = 0;
  let kumulierteSteuer = 0;
  let cashflowNachSteuerMonat1 = 0;
  let steuerersparnisMonat1 = 0;

  // Year 0 = Start
  jahre.push({
    jahr: 0,
    immobilienwert,
    restschuld,
    vermoegen: immobilienwert - restschuld,
    cashflowMonat: 0,
    steuerersparnisJahr: 0,
  });

  for (let y = 1; y <= i.haltedauerJahre; y++) {
    // Zinsanteil im Jahr aggregieren
    let zinsJahr = 0;
    let tilgungJahr = 0;
    for (let m = 0; m < 12 && restschuld > 0; m++) {
      const zinsM = (restschuld * (i.zins / 100)) / 12;
      const tilgungM = Math.min(restschuld, annuitaetMonat - zinsM);
      zinsJahr += zinsM;
      tilgungJahr += tilgungM;
      restschuld -= tilgungM;
    }

    const werbungskostenJahr =
      kostenMonat * 12 + zinsJahr + (y === 1 ? i.erhaltungsaufwand : 0);
    const steuerlVerlustJahr = afaJahr + werbungskostenJahr - mieteMonat * 12;
    // Negative Einkünfte → Steuerersparnis (vereinfacht: gesamter Verlust × Steuersatz)
    const steuerersparnisJahr = Math.max(0, steuerlVerlustJahr) * (i.steuersatz / 100);

    const cashflowJahrVorSteuer =
      mieteMonat * 12 - kostenMonat * 12 - (zinsJahr + tilgungJahr);
    const cashflowJahrNachSteuer = cashflowJahrVorSteuer + steuerersparnisJahr;
    const cashflowMonatNachSteuer = cashflowJahrNachSteuer / 12;

    summeCashflows += cashflowJahrNachSteuer;
    kumulierteSteuer += steuerersparnisJahr;

    immobilienwert = immobilienwert * (1 + i.wertsteigerung / 100);

    if (y === 1) {
      cashflowNachSteuerMonat1 = cashflowMonatNachSteuer;
      steuerersparnisMonat1 = steuerersparnisJahr / 12;
    }

    jahre.push({
      jahr: y,
      immobilienwert,
      restschuld: Math.max(0, restschuld),
      vermoegen: immobilienwert - Math.max(0, restschuld),
      cashflowMonat: cashflowMonatNachSteuer,
      steuerersparnisJahr,
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
    ekTatsaechlich,
    gebaeudewert,
    annuitaetMonat,
    zinsMonat1,
    tilgungMonat1,
    bruttomieteMonat: i.kaltmieteMonat,
    kostenMonat,
    cashflowVorSteuerMonat:
      i.kaltmieteMonat - kostenMonat - annuitaetMonat,
    steuerersparnisMonat1,
    cashflowNachSteuerMonat: cashflowNachSteuerMonat1,
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

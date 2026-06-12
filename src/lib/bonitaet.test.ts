import { describe, it, expect } from "vitest";
import {
  calculateBonitaet,
  lookupGrenzsteuersatz,
  lookupDurchschnittsteuersatz,
  type BonitaetInput,
} from "./bonitaet";

// PROJ-4: Bonitäts-Schnellcheck — legally/financially sensitive scoring.

describe("lookupGrenzsteuersatz", () => {
  it("returns 0 inside the Grundfreibetrag", () => {
    expect(lookupGrenzsteuersatz(0)).toBe(0);
    expect(lookupGrenzsteuersatz(11604)).toBe(0);
  });

  it("steps into the next bracket just above a threshold", () => {
    expect(lookupGrenzsteuersatz(11605)).toBe(0.14);
    expect(lookupGrenzsteuersatz(17000)).toBe(0.14);
    expect(lookupGrenzsteuersatz(35000)).toBe(0.25);
    expect(lookupGrenzsteuersatz(60000)).toBe(0.32);
    expect(lookupGrenzsteuersatz(100000)).toBe(0.38);
    expect(lookupGrenzsteuersatz(200000)).toBe(0.42);
  });

  it("caps at the Spitzensteuersatz", () => {
    expect(lookupGrenzsteuersatz(500000)).toBe(0.45);
  });
});

describe("lookupDurchschnittsteuersatz", () => {
  it("is 0 for non-positive income", () => {
    expect(lookupDurchschnittsteuersatz(0, false)).toBe(0);
    expect(lookupDurchschnittsteuersatz(-5000, false)).toBe(0);
  });

  it("computes the average rate progressively", () => {
    // 17000: only the 5396 above the Freibetrag taxed at 14% = 755.44
    expect(lookupDurchschnittsteuersatz(17000, false)).toBeCloseTo(755.44 / 17000, 6);
  });

  it("Splittingtarif halves the burden vs. a single earner", () => {
    // A married couple on 34000 is taxed like two singles on 17000 each.
    const single = lookupDurchschnittsteuersatz(17000, false);
    const married = lookupDurchschnittsteuersatz(34000, true);
    expect(married).toBeCloseTo(single, 6);
  });

  it("Splitting yields a lower average rate than a single earner on the same income", () => {
    expect(lookupDurchschnittsteuersatz(80000, true)).toBeLessThan(
      lookupDurchschnittsteuersatz(80000, false),
    );
  });
});

const base: BonitaetInput = {
  brutto: 60000,
  verheiratet: false,
  eigenkapital: 50000,
  kreditverpflichtungen_monatlich: 0,
  erwachsene_im_haushalt: 1,
  kinder_anzahl: 0,
  beruf_status: "angestellter",
};

describe("calculateBonitaet", () => {
  it("derives the documented step chain consistently", () => {
    const r = calculateBonitaet(base);
    expect(r.lebenshaltung).toBe(1000);
    expect(r.netto_jahr).toBeCloseTo(
      60000 * (1 - r.steuersatz_durchschnitt - 0.2),
      4,
    );
    expect(r.netto_monat).toBeCloseTo(r.netto_jahr / 12, 6);
    expect(r.verfuegbar).toBeCloseTo(r.netto_monat - r.lebenshaltung, 6);
    expect(r.max_monatsrate).toBeCloseTo(r.verfuegbar * 0.35, 6);
    expect(r.max_darlehen).toBeCloseTo((r.max_monatsrate * 12) / 0.06, 4);
    expect(r.max_finanzierbar).toBeCloseTo(
      (r.max_darlehen + 50000) / 1.12,
      4,
    );
  });

  it("uses the average tax rate of ~22.1% for 60k single", () => {
    const r = calculateBonitaet(base);
    expect(r.steuersatz_durchschnitt).toBeCloseTo(0.2209, 3);
  });

  it("scales Lebenshaltung by adults and children", () => {
    expect(calculateBonitaet(base).lebenshaltung).toBe(1000);
    expect(
      calculateBonitaet({ ...base, erwachsene_im_haushalt: 2 }).lebenshaltung,
    ).toBe(1600);
    expect(
      calculateBonitaet({
        ...base,
        erwachsene_im_haushalt: 2,
        kinder_anzahl: 2,
      }).lebenshaltung,
    ).toBe(1600 + 700);
  });

  it("subtracts monthly credit obligations from the available budget", () => {
    const withoutCredit = calculateBonitaet(base);
    const withCredit = calculateBonitaet({
      ...base,
      kreditverpflichtungen_monatlich: 500,
    });
    expect(withCredit.verfuegbar).toBeCloseTo(
      withoutCredit.verfuegbar - 500,
      6,
    );
  });

  it("never returns negative budgets even for tiny incomes", () => {
    const r = calculateBonitaet({ ...base, brutto: 12000 });
    expect(r.verfuegbar).toBeGreaterThanOrEqual(0);
    expect(r.max_monatsrate).toBeGreaterThanOrEqual(0);
    expect(r.max_darlehen).toBeGreaterThanOrEqual(0);
  });

  it("clamps negative inputs to zero", () => {
    const r = calculateBonitaet({
      ...base,
      brutto: -1000,
      eigenkapital: -50,
      kreditverpflichtungen_monatlich: -10,
      kinder_anzahl: -3,
    });
    expect(r.netto_jahr).toBe(0);
    expect(r.verfuegbar).toBe(0);
    expect(r.lebenshaltung).toBe(1000); // 1 adult, 0 kids after clamp
  });

  it("exposes the same numbers on the top level and the nested breakdown", () => {
    const r = calculateBonitaet(base);
    expect(r.breakdown).toEqual({
      steuersatz_durchschnitt: r.steuersatz_durchschnitt,
      steuersatz_grenze: r.steuersatz_grenze,
      netto_jahr: r.netto_jahr,
      netto_monat: r.netto_monat,
      lebenshaltung: r.lebenshaltung,
      verfuegbar: r.verfuegbar,
      max_monatsrate: r.max_monatsrate,
      max_darlehen: r.max_darlehen,
      max_finanzierbar: r.max_finanzierbar,
    });
  });
});

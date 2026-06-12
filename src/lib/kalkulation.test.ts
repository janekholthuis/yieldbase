import { describe, it, expect } from "vitest";
import { calculate, type CalcInputs } from "./kalkulation";

// PROJ-3 / PROJ-8: Investment calculation engine.

const base: CalcInputs = {
  kaufpreis: 200000,
  kaltmieteMonat: 700,
  hausgeldNichtUmlagef: 50,
  instandhaltung: 30,
  sondereigVerwaltung: 20,
  grundstueckswertAnteil: 20,
  ekBetrag: 40000,
  kaufnebenkostenProzent: 10,
  kaufnebenkostenFinanziert: false,
  zins: 4,
  tilgung: 2,
  haltedauerJahre: 10,
  afaSatz: 2,
  wertsteigerung: 2,
  mietsteigerung: 2,
  steuersatz: 42,
  erhaltungsaufwand: 0,
};

describe("calculate — upfront figures", () => {
  it("computes Kaufnebenkosten and Gesamtkosten", () => {
    const r = calculate(base);
    expect(r.kaufnebenkosten).toBe(20000);
    expect(r.gesamtkosten).toBe(220000);
  });

  it("excludes KNK from the loan when not financed (EK covers KNK)", () => {
    const r = calculate(base);
    expect(r.darlehen).toBe(160000); // 200k − 40k EK
    expect(r.ekTatsaechlich).toBe(60000); // 40k EK + 20k KNK
  });

  it("rolls KNK into the loan when financed", () => {
    const r = calculate({ ...base, kaufnebenkostenFinanziert: true });
    expect(r.darlehen).toBe(180000); // 220k − 40k EK
    expect(r.ekTatsaechlich).toBe(40000);
  });

  it("derives Gebäudewert from the Grundstücksanteil", () => {
    expect(calculate(base).gebaeudewert).toBe(160000); // 80% of 200k
  });

  it("splits the first annuity into interest and principal", () => {
    const r = calculate(base);
    expect(r.annuitaetMonat).toBeCloseTo(800, 6); // 160k × 6% / 12
    expect(r.zinsMonat1).toBeCloseTo(533.333, 2); // 160k × 4% / 12
    expect(r.tilgungMonat1).toBeCloseTo(r.annuitaetMonat - r.zinsMonat1, 6);
  });

  it("computes gross rental yield", () => {
    expect(calculate(base).bruttoMietrendite).toBeCloseTo(4.2, 6); // 700×12/200k
  });
});

describe("calculate — simulation over the holding period", () => {
  it("produces one row per year plus the start row", () => {
    const r = calculate(base);
    expect(r.jahre).toHaveLength(11);
    expect(r.jahre[0].jahr).toBe(0);
    expect(r.jahre[0].restschuld).toBe(160000);
    expect(r.jahre[10].jahr).toBe(10);
  });

  it("amortizes the loan monotonically and never goes negative", () => {
    const r = calculate(base);
    for (let y = 1; y < r.jahre.length; y++) {
      expect(r.jahre[y].restschuld).toBeLessThanOrEqual(r.jahre[y - 1].restschuld);
      expect(r.jahre[y].restschuld).toBeGreaterThanOrEqual(0);
    }
    expect(r.endRestschuld).toBe(r.jahre[10].restschuld);
  });

  it("appreciates the property value at the assumed rate", () => {
    const r = calculate(base);
    expect(r.jahre[1].immobilienwert).toBeCloseTo(200000 * 1.02, 4);
    expect(r.endImmobilienwert).toBeCloseTo(200000 * Math.pow(1.02, 10), 2);
  });

  it("ties end wealth to value minus remaining debt", () => {
    const r = calculate(base);
    expect(r.endVermoegen).toBeCloseTo(r.endImmobilienwert - r.endRestschuld, 4);
  });
});

describe("calculate — guard rails", () => {
  it("never produces a negative loan when EK exceeds the price", () => {
    const r = calculate({ ...base, ekBetrag: 999999 });
    expect(r.darlehen).toBe(0);
  });

  it("avoids division-by-zero artifacts at price 0", () => {
    const r = calculate({ ...base, kaufpreis: 0 });
    expect(r.bruttoMietrendite).toBe(0);
    expect(Number.isFinite(r.ekRenditeProJahr)).toBe(true);
  });

  it("applies Erhaltungsaufwand only in year 1", () => {
    const withAufwand = calculate({ ...base, erhaltungsaufwand: 10000 });
    const without = calculate(base);
    // Year-1 tax saving is higher when there is a one-off Erhaltungsaufwand.
    expect(withAufwand.jahre[1].steuerersparnisJahr).toBeGreaterThan(
      without.jahre[1].steuerersparnisJahr,
    );
    // Year 2 is unaffected by the one-off.
    expect(withAufwand.jahre[2].steuerersparnisJahr).toBeCloseTo(
      without.jahre[2].steuerersparnisJahr,
      6,
    );
  });
});

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

// --- Kalkulation 2.0 (PROJ-20) ---

describe("calculate — AfA: linear (default, backward compatible)", () => {
  it("year-1 AfA equals Gebäudewert × linear rate", () => {
    const r = calculate(base);
    // Gebäudewert 160k × 2% = 3200
    expect(r.afaJahr1).toBeCloseTo(3200, 6);
    expect(r.jahre[1].afaJahr).toBeCloseTo(3200, 6);
  });

  it("keeps the AfA constant across all years", () => {
    const r = calculate(base);
    expect(r.jahre[5].afaJahr).toBeCloseTo(r.jahre[1].afaJahr, 6);
  });
});

describe("calculate — Denkmal-AfA §7i", () => {
  // Gebäudewert 160k, davon 100k Sanierung → 60k Altbau (2%).
  const denkmal: CalcInputs = {
    ...base,
    afaTyp: "denkmal",
    sanierungsanteil: 100000,
    altbauAfaSatz: 2,
  };

  it("years 1–8: Altbau linear + Sanierung degressiv 9 %", () => {
    const r = calculate(denkmal);
    // 60k × 2% + 100k × 9% = 1200 + 9000 = 10200
    expect(r.jahre[1].afaJahr).toBeCloseTo(10200, 6);
    expect(r.jahre[8].afaJahr).toBeCloseTo(10200, 6);
  });

  it("years 9–12 drop the Sanierungs-AfA to 7 %", () => {
    const r = calculate({ ...denkmal, haltedauerJahre: 15 });
    // 1200 + 100k × 7% = 1200 + 7000 = 8200
    expect(r.jahre[9].afaJahr).toBeCloseTo(8200, 6);
    expect(r.jahre[12].afaJahr).toBeCloseTo(8200, 6);
  });

  it("from year 13 only the Altbau-AfA remains", () => {
    const r = calculate({ ...denkmal, haltedauerJahre: 15 });
    expect(r.jahre[13].afaJahr).toBeCloseTo(1200, 6);
  });

  it("beats linear AfA on cumulative tax savings", () => {
    const lin = calculate(base);
    const dnk = calculate(denkmal);
    expect(dnk.kumulierteSteuerersparnis).toBeGreaterThan(lin.kumulierteSteuerersparnis);
  });
});

describe("calculate — Sonder-AfA §7b", () => {
  it("adds 5 % of the base in years 1–4, linear afterwards", () => {
    const r = calculate({ ...base, afaTyp: "sonder_7b", sonderAfaBemessung: 100000 });
    // Jahr 1: 160k×2% + 100k×5% = 3200 + 5000 = 8200
    expect(r.jahre[1].afaJahr).toBeCloseTo(8200, 6);
    expect(r.jahre[4].afaJahr).toBeCloseTo(8200, 6);
    // Jahr 5: nur noch linear 3200
    expect(r.jahre[5].afaJahr).toBeCloseTo(3200, 6);
  });
});

describe("calculate — Möblierungs-AfA", () => {
  it("depreciates furniture linearly over its useful life, then stops", () => {
    const r = calculate({ ...base, moeblierungswert: 20000, moeblierungJahre: 10 });
    // linear 3200 + 20000/10 = 3200 + 2000 = 5200 in den ersten 10 Jahren
    expect(r.jahre[1].afaJahr).toBeCloseTo(5200, 6);
    expect(r.jahre[10].afaJahr).toBeCloseTo(5200, 6);
  });

  it("stops after the useful life", () => {
    const r = calculate({
      ...base,
      haltedauerJahre: 15,
      moeblierungswert: 20000,
      moeblierungJahre: 10,
    });
    expect(r.jahre[11].afaJahr).toBeCloseTo(3200, 6);
  });
});

describe("calculate — KfW financing tranche", () => {
  it("splits the loan into a bank and a KfW tranche", () => {
    const r = calculate({ ...base, kfwBetrag: 50000, kfwZins: 2, kfwTilgung: 2 });
    expect(r.darlehen).toBe(160000);
    expect(r.kfwTranche).toBe(50000);
    expect(r.bankTranche).toBe(110000);
  });

  it("lowers month-1 interest versus an all-bank loan", () => {
    const allBank = calculate(base);
    const withKfw = calculate({ ...base, kfwBetrag: 50000, kfwZins: 2, kfwTilgung: 2 });
    expect(withKfw.zinsMonat1).toBeLessThan(allBank.zinsMonat1);
  });

  it("caps the KfW tranche at the total loan", () => {
    const r = calculate({ ...base, kfwBetrag: 999999, kfwZins: 2, kfwTilgung: 2 });
    expect(r.kfwTranche).toBe(160000);
    expect(r.bankTranche).toBe(0);
  });

  it("credits a Tilgungszuschuss against the remaining debt", () => {
    const withoutZuschuss = calculate({ ...base, kfwBetrag: 50000, kfwZins: 2, kfwTilgung: 2 });
    const withZuschuss = calculate({
      ...base,
      kfwBetrag: 50000,
      kfwZins: 2,
      kfwTilgung: 2,
      kfwTilgungszuschussProzent: 20,
    });
    expect(withZuschuss.jahre[1].restschuld).toBeLessThan(
      withoutZuschuss.jahre[1].restschuld,
    );
  });

  it("is backward compatible when no KfW tranche is set", () => {
    const r = calculate(base);
    expect(r.kfwTranche).toBe(0);
    expect(r.bankTranche).toBe(160000);
    expect(r.annuitaetMonat).toBeCloseTo(800, 6);
  });
});

describe("calculate — inflation on operating costs", () => {
  it("escalates non-recoverable costs over time", () => {
    const flat = calculate(base);
    const infl = calculate({ ...base, inflation: 5 });
    // Higher costs in later years → higher deductible losses → more tax saving.
    expect(infl.jahre[5].steuerersparnisJahr).toBeGreaterThan(
      flat.jahre[5].steuerersparnisJahr,
    );
    // Year 1 is unaffected (escalation exponent is 0).
    expect(infl.jahre[1].steuerersparnisJahr).toBeCloseTo(
      flat.jahre[1].steuerersparnisJahr,
      6,
    );
  });
});

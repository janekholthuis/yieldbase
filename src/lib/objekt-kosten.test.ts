import { describe, it, expect } from "vitest";
import {
  grunderwerbsteuerSatz,
  grunderwerbsteuer,
  notarGerichtskosten,
  gebaeudeanteil,
  kaufnebenkosten,
  GRUNDERWERBSTEUER_SATZ,
  BUNDESLAENDER,
} from "./objekt-kosten";

// PROJ-12: derived purchase-cost helpers (Grunderwerbsteuer per Bundesland).

describe("grunderwerbsteuerSatz", () => {
  it("returns the per-Bundesland rate", () => {
    expect(grunderwerbsteuerSatz("Bayern")).toBe(3.5);
    expect(grunderwerbsteuerSatz("Nordrhein-Westfalen")).toBe(6.5);
  });

  it("trims whitespace", () => {
    expect(grunderwerbsteuerSatz("  Berlin  ")).toBe(6.0);
  });

  it("returns null for unknown or missing Bundesland", () => {
    expect(grunderwerbsteuerSatz("Tirol")).toBeNull();
    expect(grunderwerbsteuerSatz(null)).toBeNull();
    expect(grunderwerbsteuerSatz(undefined)).toBeNull();
    expect(grunderwerbsteuerSatz("")).toBeNull();
  });

  it("covers all 16 Bundesländer", () => {
    expect(BUNDESLAENDER).toHaveLength(16);
    expect(Object.values(GRUNDERWERBSTEUER_SATZ).every((s) => s > 0)).toBe(true);
  });
});

describe("grunderwerbsteuer", () => {
  it("multiplies price by the Bundesland rate", () => {
    expect(grunderwerbsteuer(300000, "Bayern")).toBeCloseTo(10500, 6); // 3.5%
  });

  it("returns null when price or Bundesland is missing", () => {
    expect(grunderwerbsteuer(null, "Bayern")).toBeNull();
    expect(grunderwerbsteuer(undefined, "Bayern")).toBeNull();
    expect(grunderwerbsteuer(300000, "Atlantis")).toBeNull();
  });
});

describe("notarGerichtskosten", () => {
  it("defaults to 2% of the price", () => {
    expect(notarGerichtskosten(300000)).toBeCloseTo(6000, 6);
  });

  it("honors an explicit rate", () => {
    expect(notarGerichtskosten(300000, 1.5)).toBeCloseTo(4500, 6);
  });

  it("returns null for a missing price", () => {
    expect(notarGerichtskosten(null)).toBeNull();
  });
});

describe("gebaeudeanteil", () => {
  it("subtracts the land share from the price", () => {
    expect(gebaeudeanteil(300000, 60000)).toBe(240000);
  });

  it("treats a missing land share as zero", () => {
    expect(gebaeudeanteil(300000, null)).toBe(300000);
  });

  it("never goes negative", () => {
    expect(gebaeudeanteil(100000, 250000)).toBe(0);
  });

  it("returns null for a missing price", () => {
    expect(gebaeudeanteil(null, 1000)).toBeNull();
  });
});

describe("kaufnebenkosten", () => {
  it("sums GrESt and notary/court costs", () => {
    // 300k in Bayern: 10500 GrESt + 6000 Notar(2%) = 16500
    expect(kaufnebenkosten(300000, "Bayern")).toBeCloseTo(16500, 6);
  });

  it("counts only notary costs when the Bundesland is unknown", () => {
    expect(kaufnebenkosten(300000, "Atlantis")).toBeCloseTo(6000, 6);
  });

  it("returns null for a missing price", () => {
    expect(kaufnebenkosten(null, "Bayern")).toBeNull();
  });
});

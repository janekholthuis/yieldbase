import { describe, it, expect } from "vitest";
import {
  formatEUR,
  formatNumber,
  pricePerSqm,
  formatAddress,
} from "./objekt-format";

// PROJ-3 / PROJ-12: display formatting helpers.
// Intl inserts non-breaking spaces (U+00A0 / U+202F); normalize for stable assertions.
const norm = (s: string) => s.replace(/[  ]/g, " ");

describe("formatEUR", () => {
  it("formats integers as de-DE currency without decimals", () => {
    expect(norm(formatEUR(200000))).toBe("200.000 €");
    expect(norm(formatEUR(0))).toBe("0 €");
  });

  it("rounds to whole euros", () => {
    expect(norm(formatEUR(199999.6))).toBe("200.000 €");
  });

  it("renders an em dash for null/undefined", () => {
    expect(formatEUR(null)).toBe("—");
    expect(formatEUR(undefined)).toBe("—");
  });
});

describe("formatNumber", () => {
  it("formats with up to one decimal and an optional suffix", () => {
    expect(norm(formatNumber(60.5, " m²"))).toBe("60,5 m²");
    expect(norm(formatNumber(4, " %"))).toBe("4 %");
  });

  it("renders an em dash for null", () => {
    expect(formatNumber(null)).toBe("—");
  });
});

describe("pricePerSqm", () => {
  it("divides price by area", () => {
    expect(pricePerSqm(300000, 60)).toBe(5000);
  });

  it("returns null on missing or zero inputs (no division by zero)", () => {
    expect(pricePerSqm(null, 60)).toBeNull();
    expect(pricePerSqm(300000, null)).toBeNull();
    expect(pricePerSqm(300000, 0)).toBeNull();
    expect(pricePerSqm(0, 60)).toBeNull();
  });
});

describe("formatAddress", () => {
  it("joins distinct parts", () => {
    expect(formatAddress("Hauptstr. 1", "10115", "Berlin")).toBe(
      "Hauptstr. 1, 10115, Berlin",
    );
  });

  it("drops parts already represented in an earlier part", () => {
    // adresse already contains PLZ + city → no duplicate tail
    expect(
      formatAddress("Schonensche Straße 13, 10439 Berlin", "10439", "Berlin"),
    ).toBe("Schonensche Straße 13, 10439 Berlin");
  });

  it("skips empty/nullish parts", () => {
    expect(formatAddress("Hauptstr. 1", null, "", "Berlin")).toBe(
      "Hauptstr. 1, Berlin",
    );
  });

  it("returns an empty string when nothing is provided", () => {
    expect(formatAddress(null, null, null, null)).toBe("");
  });
});

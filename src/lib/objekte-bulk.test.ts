import { describe, it, expect } from "vitest";
import {
  parseDeNumber,
  parseClipboardMatrix,
  looksLikeHeaderRow,
  guessFieldFromHeader,
  buildMapping,
  matrixToRows,
  rowError,
  rowHasContent,
  emptyRow,
  duplicateWohnungsnummern,
  normWohnungsnummer,
} from "./objekte-bulk";

// PROJ-16 — Bulk-Erfassung (Excel-Paste) Hilfsfunktionen.

describe("parseDeNumber", () => {
  it("parses German thousands + decimal (1.234,56 -> 1234.56)", () => {
    expect(parseDeNumber("1.234,56")).toBe(1234.56);
  });
  it("parses decimal comma (60,5 -> 60.5)", () => {
    expect(parseDeNumber("60,5")).toBe(60.5);
  });
  it("parses thousands-only dot (1.000 -> 1000)", () => {
    expect(parseDeNumber("1.000")).toBe(1000);
  });
  it("parses millions with multiple dots (1.000.000 -> 1000000)", () => {
    expect(parseDeNumber("1.000.000")).toBe(1000000);
  });
  it("treats single dot with non-3 trailing digits as decimal (60.5)", () => {
    expect(parseDeNumber("60.5")).toBe(60.5);
  });
  it("strips €, m² and whitespace", () => {
    expect(parseDeNumber(" 1.234,50 € ")).toBe(1234.5);
    expect(parseDeNumber("75,5 m²")).toBe(75.5);
  });
  it("returns undefined for empty / non-numeric", () => {
    expect(parseDeNumber("")).toBeUndefined();
    expect(parseDeNumber("   ")).toBeUndefined();
    expect(parseDeNumber("abc")).toBeUndefined();
  });
});

describe("parseClipboardMatrix", () => {
  it("splits tab/newline into a matrix, dropping blank lines", () => {
    const text = "WE1\t1\t60\n\nWE2\t2\t75\n";
    expect(parseClipboardMatrix(text)).toEqual([
      ["WE1", "1", "60"],
      ["WE2", "2", "75"],
    ]);
  });
  it("handles CRLF", () => {
    expect(parseClipboardMatrix("a\tb\r\nc\td")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });
});

describe("looksLikeHeaderRow", () => {
  it("detects a label row", () => {
    expect(looksLikeHeaderRow(["Wohnung", "Etage", "Kaufpreis"])).toBe(true);
  });
  it("rejects a numeric data row", () => {
    expect(looksLikeHeaderRow(["WE1", "1", "250000"])).toBe(false);
  });
});

describe("guessFieldFromHeader", () => {
  it("maps common German headers to fields", () => {
    expect(guessFieldFromHeader("Wohnungsnr.")).toBe("wohnungsnummer");
    expect(guessFieldFromHeader("Etage")).toBe("etage");
    expect(guessFieldFromHeader("Kaltmiete €/Monat")).toBe("miete");
    expect(guessFieldFromHeader("Kaufpreis")).toBe("kaufpreis");
    expect(guessFieldFromHeader("Wohnfläche m²")).toBe("wohnflaeche");
    expect(guessFieldFromHeader("Stellplatzpreis")).toBe("stellplatz_preis");
  });
  it("returns null for unknown headers", () => {
    expect(guessFieldFromHeader("Lorem")).toBeNull();
  });
});

describe("buildMapping", () => {
  it("falls back to canonical field order without a header", () => {
    expect(buildMapping(3)).toEqual(["wohnungsnummer", "etage", "zimmer"]);
  });
  it("maps by header synonyms then fills the rest", () => {
    const mapping = buildMapping(3, ["Kaufpreis", "Wohnung", "Fläche"]);
    expect(mapping).toEqual(["kaufpreis", "wohnungsnummer", "wohnflaeche"]);
  });
  it("does not assign the same field twice", () => {
    const mapping = buildMapping(2, ["Preis", "Kaufpreis"]);
    // both look like kaufpreis; only the first wins, second gets a fallback
    expect(mapping[0]).toBe("kaufpreis");
    expect(mapping[1]).not.toBe("kaufpreis");
  });
});

describe("matrixToRows", () => {
  it("maps columns to fields and parses German numbers", () => {
    const matrix = [["WE 4", "2", "75,5", "1.250.00", "250.000"]];
    const mapping = ["wohnungsnummer", "etage", "wohnflaeche", "miete", "kaufpreis"] as const;
    const rows = matrixToRows(matrix, [...mapping]);
    expect(rows[0].wohnungsnummer).toBe("WE 4");
    expect(rows[0].etage).toBe("2");
    expect(rows[0].wohnflaeche).toBe("75.5");
    expect(rows[0].kaufpreis).toBe("250000");
  });
  it("ignores null-mapped columns", () => {
    const rows = matrixToRows([["x", "WE1"]], [null, "wohnungsnummer"]);
    expect(rows[0].wohnungsnummer).toBe("WE1");
  });
});

describe("rowError", () => {
  it("flags a missing Wohnungsnummer", () => {
    expect(rowError({ ...emptyRow(), kaufpreis: "100" })).toMatch(/Wohnungsnr/);
  });
  it("flags a non-numeric number cell", () => {
    expect(rowError({ ...emptyRow(), wohnungsnummer: "1", kaufpreis: "abc" })).toMatch(
      /Kaufpreis/,
    );
  });
  it("flags a negative number", () => {
    expect(rowError({ ...emptyRow(), wohnungsnummer: "1", miete: "-5" })).toMatch(
      /negativ/,
    );
  });
  it("passes a valid row", () => {
    expect(
      rowError({ ...emptyRow(), wohnungsnummer: "1", kaufpreis: "250000" }),
    ).toBeNull();
  });
});

describe("duplicateWohnungsnummern", () => {
  const r = (wnr: string) => ({ ...emptyRow(), wohnungsnummer: wnr });
  it("flags in-batch duplicates (case-insensitive, trimmed)", () => {
    const dupes = duplicateWohnungsnummern([r("WE1"), r(" we1 "), r("WE2")]);
    expect(dupes.has("we1")).toBe(true);
    expect(dupes.has("we2")).toBe(false);
  });
  it("flags collisions with existing project units", () => {
    const dupes = duplicateWohnungsnummern([r("A1"), r("A2")], ["a2"]);
    expect(dupes.has("a2")).toBe(true);
    expect(dupes.has("a1")).toBe(false);
  });
  it("ignores blank Wohnungsnummern", () => {
    expect(duplicateWohnungsnummern([r(""), r("")]).size).toBe(0);
  });
  it("normWohnungsnummer trims and lowercases", () => {
    expect(normWohnungsnummer("  WE 4 ")).toBe("we 4");
  });
});

describe("rowHasContent", () => {
  it("is false for an empty row", () => {
    expect(rowHasContent(emptyRow())).toBe(false);
  });
  it("is true when any cell is filled", () => {
    expect(rowHasContent({ ...emptyRow(), etage: "2" })).toBe(true);
  });
});

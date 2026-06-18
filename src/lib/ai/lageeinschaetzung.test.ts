import { describe, it, expect } from "vitest";
import { buildLageMessages, parseLageResult, MAX_TAGS } from "./lageeinschaetzung";

describe("buildLageMessages", () => {
  it("includes a system prompt and a user message with the known facts", () => {
    const msgs = buildLageMessages({
      adresse: "Musterstr. 1",
      plz: "06108",
      stadt: "Halle",
      projektName: "Altstadt-Carré",
      baujahr: 1905,
      wohnflaeche: 62,
      zimmer: 2,
      etage: "2. OG",
      objektzustand: "saniert",
      nutzungsart: "Eigennutzung",
      vorhandeneHighlights: null,
    });
    expect(msgs[0].role).toBe("system");
    expect(msgs[1].role).toBe("user");
    expect(msgs[1].content).toContain("Halle");
    expect(msgs[1].content).toContain("Altstadt-Carré");
    expect(msgs[1].content).toContain("1905");
  });

  it("omits empty/null facts (no dangling labels)", () => {
    const msgs = buildLageMessages({
      adresse: null,
      plz: null,
      stadt: "Leipzig",
      baujahr: null,
      wohnflaeche: null,
      zimmer: null,
    });
    expect(msgs[1].content).toContain("Leipzig");
    expect(msgs[1].content).not.toContain("Baujahr");
    expect(msgs[1].content).not.toContain("Adresse");
  });
});

describe("parseLageResult", () => {
  it("returns the trimmed text and normalized tags", () => {
    const r = parseLageResult({
      lageeinschaetzung: "  Zentrale Lage mit guter Anbindung.  ",
      tags: ["#ÖPNV-nah", " saniert ", "Zentral"],
    });
    expect(r.lageeinschaetzung).toBe("Zentrale Lage mit guter Anbindung.");
    expect(r.tags).toEqual(["ÖPNV-nah", "saniert", "Zentral"]);
  });

  it("dedupes case-insensitively and caps tag count", () => {
    const many = Array.from({ length: 20 }, (_, i) => `Tag${i}`);
    const r = parseLageResult({
      lageeinschaetzung: "Text",
      tags: ["Zentral", "zentral", "ZENTRAL", ...many],
    });
    expect(r.tags.length).toBeLessThanOrEqual(MAX_TAGS);
    expect(r.tags.filter((t) => t.toLowerCase() === "zentral")).toHaveLength(1);
  });

  it("tolerates a missing/invalid tags array", () => {
    const r = parseLageResult({ lageeinschaetzung: "Nur Text" });
    expect(r.tags).toEqual([]);
  });

  it("throws when the assessment text is missing", () => {
    expect(() => parseLageResult({ tags: ["x"] })).toThrow();
    expect(() => parseLageResult(null)).toThrow();
    expect(() => parseLageResult({ lageeinschaetzung: "   " })).toThrow();
  });

  it("drops non-string tag entries", () => {
    const r = parseLageResult({
      lageeinschaetzung: "Text",
      tags: ["ok", 42, null, { x: 1 }, "fein"],
    });
    expect(r.tags).toEqual(["ok", "fein"]);
  });
});

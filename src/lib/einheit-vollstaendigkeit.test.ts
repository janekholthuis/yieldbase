import { describe, it, expect } from "vitest";
import {
  fehlendeFelder,
  istFreigebbar,
  vollstaendigkeitProzent,
  REQUIRED_FOR_FREIGABE,
  type VollstaendigkeitInput,
} from "./einheit-vollstaendigkeit";

// Eine vollständige, freigebbare Einheit (Bestand, vermietet → alle bedingten
// Felder gefüllt). KI-Felder absichtlich leer (nur Pflicht bei kiPflichtAktiv).
function vollstaendig(): VollstaendigkeitInput {
  return {
    wohnungsnummer: "WE 04",
    wohnflaeche: 62.5,
    zimmer: 2,
    etage: 1,
    lage_im_haus: "EG rechts",
    kaufpreis: 250000,
    grundstueckswert_anteil: 20,
    miete: 800,
    nutzungsart: "wohnen",
    objektzustand: "bestand",
    heizungsart: "Gas-Zentralheizung",
    energieklasse: "B",
    miteigentumsanteil: "123/10000",
    hausgeld_umlagefaehig: 120,
    hausgeld_nicht_umlagefaehig: 80,
    instandhaltungsruecklage: 30,
    instandhaltungsruecklage_gesamt: 5000,
    sondereigentumsverwaltung: 25,
    afa_satz: 2,
    baujahr: 1995,
    adresse: "Musterstraße 1, 10115 Berlin",
    vermietet: true,
    vermietet_seit: "2020-01-01",
    renovierungen: [{ gewerk: "Dach", jahr: 2019 }],
    tags: [],
    standort_highlights: null,
  };
}

describe("fehlendeFelder / istFreigebbar", () => {
  it("leere Einheit → alle (aktiven) Pflichtfelder fehlen", () => {
    const missing = fehlendeFelder({});
    expect(missing.length).toBeGreaterThan(0);
    expect(istFreigebbar({})).toBe(false);
    // Bedingte Felder (vermietet_seit, renovierungen) und KI-Felder zählen bei
    // leerer Einheit NICHT (when/Gruppe greifen nicht).
    const keys = missing.map((m) => m.key);
    expect(keys).not.toContain("vermietet_seit");
    expect(keys).not.toContain("renovierungen");
    expect(keys).not.toContain("tags");
    expect(keys).not.toContain("standort_highlights");
  });

  it("vollständige Einheit → nichts fehlt, freigebbar", () => {
    expect(fehlendeFelder(vollstaendig())).toEqual([]);
    expect(istFreigebbar(vollstaendig())).toBe(true);
    expect(vollstaendigkeitProzent(vollstaendig())).toBe(100);
  });

  it("jedes unbedingte Pflichtfeld einzeln fehlend blockiert die Freigabe", () => {
    const unconditional = REQUIRED_FOR_FREIGABE.filter((f) => !f.when && !f.group);
    for (const f of unconditional) {
      const e = vollstaendig();
      // @ts-expect-error – dynamisches Leeren des Feldes
      e[f.key] = f.key === "renovierungen" || f.key === "tags" ? [] : null;
      expect(istFreigebbar(e), `${f.key} fehlt`).toBe(false);
      expect(fehlendeFelder(e).map((m) => m.key)).toContain(f.key);
    }
  });

  it("0 zählt als vorhandener Zahlenwert", () => {
    const e = vollstaendig();
    e.hausgeld_umlagefaehig = 0;
    expect(fehlendeFelder(e).map((m) => m.key)).not.toContain("hausgeld_umlagefaehig");
  });
});

describe("bedingte Pflichtfelder", () => {
  it("vermietet_seit nur Pflicht, wenn vermietet=true", () => {
    const e = vollstaendig();
    e.vermietet = true;
    e.vermietet_seit = null;
    expect(fehlendeFelder(e).map((m) => m.key)).toContain("vermietet_seit");

    e.vermietet = false;
    expect(fehlendeFelder(e).map((m) => m.key)).not.toContain("vermietet_seit");
    expect(istFreigebbar(e)).toBe(true);
  });

  it("renovierungen nur Pflicht bei Bestand, nicht bei Neubau", () => {
    const e = vollstaendig();
    e.renovierungen = [];
    e.objektzustand = "bestand";
    expect(fehlendeFelder(e).map((m) => m.key)).toContain("renovierungen");

    e.objektzustand = "neubau";
    expect(fehlendeFelder(e).map((m) => m.key)).not.toContain("renovierungen");
    expect(istFreigebbar(e)).toBe(true);
  });
});

describe("KI-Felder (kiPflichtAktiv)", () => {
  it("ohne Flag nicht pflichtig, mit Flag pflichtig", () => {
    const e = vollstaendig();
    e.tags = [];
    e.standort_highlights = null;
    expect(istFreigebbar(e)).toBe(true);
    expect(istFreigebbar(e, { kiPflichtAktiv: true })).toBe(false);
    const keys = fehlendeFelder(e, { kiPflichtAktiv: true }).map((m) => m.key);
    expect(keys).toContain("tags");
    expect(keys).toContain("standort_highlights");
  });
});

describe("vollstaendigkeitProzent", () => {
  it("liegt zwischen 0 und 100", () => {
    expect(vollstaendigkeitProzent({})).toBeGreaterThanOrEqual(0);
    expect(vollstaendigkeitProzent({})).toBeLessThan(100);
  });
});

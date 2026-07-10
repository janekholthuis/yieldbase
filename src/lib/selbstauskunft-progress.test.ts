import { describe, it, expect } from "vitest";
import {
  emptySelbstauskunft,
  emptyPerson,
  selbstauskunftProgress,
  type PersonData,
  type SelbstauskunftAreaKey,
  type AreaStatus,
} from "./selbstauskunft";

/** Vollständig valide Person (Rentner → keine Beruf/Dauer-Pflicht in Schritt 2). */
function fullPerson(): PersonData {
  return {
    ...emptyPerson(),
    vorname: "Lena",
    nachname: "Sommer",
    email: "lena@example.de",
    telefon: "030 123456",
    geburtsdatum: "1990-05-01",
    strasse: "Schönhauser Allee 12",
    ort: "Berlin",
    plz: "10435",
    wohnsituation: "zur Miete",
    familienstand: "Ledig",
    staatsangehoerigkeit: "deutsch",
    beschaeftigung: "Rentner / Pensionär",
    einnahmequellen: ["Renten und Pensionen"],
    renten_monat: "1800",
    vermoegenswerte: ["Bank- und Sparguthaben"],
    bank_sparguthaben: "20000",
    lebenshaltung_monat: "1200",
    kv_status: "Gesetzlich freiwillig-/pflichtversichert",
  };
}

function statusOf(
  areas: { key: SelbstauskunftAreaKey; status: AreaStatus }[],
  key: SelbstauskunftAreaKey,
): AreaStatus {
  return areas.find((a) => a.key === key)!.status;
}

describe("selbstauskunftProgress", () => {
  it("leeres Formular → 0 %, nicht absendbar, Pflichtbereiche leer", () => {
    const p = selbstauskunftProgress(emptySelbstauskunft());
    expect(p.percent).toBe(0);
    expect(p.submittable).toBe(false);
    expect(p.requiredDone).toBe(0);
    expect(p.requiredTotal).toBe(5);
    for (const key of [
      "persoenlich",
      "taetigkeit",
      "einkommen",
      "vermoegen",
      "ausgaben",
    ] as SelbstauskunftAreaKey[]) {
      expect(statusOf(p.areas, key)).toBe("leer");
    }
  });

  it("vollständig ausgefüllter Hauptantragsteller → 100 %, absendbar", () => {
    const d = { ...emptySelbstauskunft(), haupt: fullPerson() };
    const p = selbstauskunftProgress(d);
    expect(p.percent).toBe(100);
    expect(p.submittable).toBe(true);
    expect(p.requiredDone).toBe(5);
    for (const key of [
      "persoenlich",
      "taetigkeit",
      "einkommen",
      "vermoegen",
      "ausgaben",
    ] as SelbstauskunftAreaKey[]) {
      expect(statusOf(p.areas, key)).toBe("fertig");
    }
  });

  it("nur teilweise ausgefüllt → teilweise-Status, weiterhin 0 %", () => {
    const d = {
      ...emptySelbstauskunft(),
      haupt: { ...emptyPerson(), vorname: "Max" },
    };
    const p = selbstauskunftProgress(d);
    expect(statusOf(p.areas, "persoenlich")).toBe("teilweise");
    expect(p.percent).toBe(0);
    expect(p.submittable).toBe(false);
  });

  it("Immobilien = nein → Bereich fertig (aber optional)", () => {
    const d = { ...emptySelbstauskunft(), immobilienvermoegen: "nein" as const };
    const p = selbstauskunftProgress(d);
    expect(statusOf(p.areas, "immobilien")).toBe("fertig");
    // optionaler Bereich zählt nicht in die Pflicht-%
    expect(p.percent).toBe(0);
  });

  it("Mitantragsteller aktiv + leer → Pflichtbereiche teilweise, nicht absendbar", () => {
    const d = {
      ...emptySelbstauskunft(),
      haupt: fullPerson(),
      mit: emptyPerson(),
      mitantragsteller: true,
    };
    const p = selbstauskunftProgress(d);
    expect(statusOf(p.areas, "persoenlich")).toBe("teilweise");
    expect(p.submittable).toBe(false);
  });

  it("Abschluss-Bereich fertig bei Datenschutz + Ort", () => {
    const d = {
      ...emptySelbstauskunft(),
      datenschutz: true,
      ort: "Berlin",
    };
    const p = selbstauskunftProgress(d);
    expect(statusOf(p.areas, "abschluss")).toBe("fertig");
  });
});

import { describe, it, expect } from "vitest";
import {
  emptyPerson,
  emptySelbstauskunft,
  parseEuro,
  einnahmenProMonat,
  vermoegenSumme,
  ausgabenProMonat,
  kreditverpflichtungenProMonat,
  auswerten,
  berufStatusFromBeschaeftigung,
  istVerheiratet,
  applyPrefill,
  validatePersonStep,
} from "./selbstauskunft";

describe("parseEuro", () => {
  it("parses German amounts", () => {
    expect(parseEuro("1.234,56")).toBe(1234.56);
    expect(parseEuro("2.500")).toBe(2500);
    expect(parseEuro("3000")).toBe(3000);
    expect(parseEuro("")).toBe(0);
    expect(parseEuro(null)).toBe(0);
  });
});

describe("einnahmenProMonat", () => {
  it("sums only selected sources, annualising correctly", () => {
    const p = emptyPerson();
    p.einnahmequellen = ["Lohn / Gehalt / Bezüge", "Renten und Pensionen"];
    p.lohn_netto_monat = "3.000";
    p.anzahl_gehaelter = "12";
    p.renten_monat = "500";
    // unselected source must be ignored
    p.mieteinnahmen_monat = "999";
    expect(einnahmenProMonat(p)).toBe(3500);
  });
  it("handles 13 salaries", () => {
    const p = emptyPerson();
    p.einnahmequellen = ["Lohn / Gehalt / Bezüge"];
    p.lohn_netto_monat = "1200";
    p.anzahl_gehaelter = "13";
    expect(einnahmenProMonat(p)).toBe(1300);
  });
});

describe("vermoegenSumme", () => {
  it("sums only selected asset types", () => {
    const p = emptyPerson();
    p.vermoegenswerte = ["Bank- und Sparguthaben", "Wertpapiere/Aktien"];
    p.bank_sparguthaben = "10.000";
    p.wertpapiere = "5.000";
    p.lebensversicherung = "99.000"; // not selected
    expect(vermoegenSumme(p)).toBe(15000);
  });
});

describe("ausgabenProMonat / kreditverpflichtungen", () => {
  it("includes PKV only when privately insured", () => {
    const p = emptyPerson();
    p.lebenshaltung_monat = "1000";
    p.kv_status = "Privat krankenversichert";
    p.pkv_beitrag_monat = "400";
    expect(ausgabenProMonat(p)).toBe(1400);
  });
  it("counts only selected expense posts as credit obligations", () => {
    const p = emptyPerson();
    p.ausgabenposten = ["Kredite / Leasing / 0% Finanzierungen"];
    p.kreditrate_monat = "250";
    p.sonstige_verbindlichkeit_monat = "100"; // not selected
    expect(kreditverpflichtungenProMonat(p)).toBe(250);
  });
});

describe("auswerten", () => {
  it("aggregates main applicant only when no co-applicant", () => {
    const d = emptySelbstauskunft();
    d.haupt.vermoegenswerte = ["Bank- und Sparguthaben"];
    d.haupt.bank_sparguthaben = "20000";
    d.mit.vermoegenswerte = ["Bank- und Sparguthaben"];
    d.mit.bank_sparguthaben = "50000";
    expect(auswerten(d).vermoegen_summe).toBe(20000);
  });
  it("includes co-applicant when toggled on", () => {
    const d = emptySelbstauskunft();
    d.mitantragsteller = true;
    d.haupt.vermoegenswerte = ["Bank- und Sparguthaben"];
    d.haupt.bank_sparguthaben = "20000";
    d.mit.vermoegenswerte = ["Bank- und Sparguthaben"];
    d.mit.bank_sparguthaben = "50000";
    expect(auswerten(d).vermoegen_summe).toBe(70000);
  });
});

describe("mappings", () => {
  it("maps Beschäftigung to beruf_status", () => {
    expect(berufStatusFromBeschaeftigung("Angestellt")).toBe("angestellter");
    expect(berufStatusFromBeschaeftigung("Beamter")).toBe("angestellter");
    expect(berufStatusFromBeschaeftigung("Freiberufler")).toBe("selbststaendiger");
    expect(berufStatusFromBeschaeftigung("Rentner / Pensionär")).toBeNull();
  });
  it("recognises married statuses", () => {
    expect(istVerheiratet("Verheiratet (ohne Gütertrennung)")).toBe(true);
    expect(istVerheiratet("Eingetragene Lebenspartnerschaft")).toBe(true);
    expect(istVerheiratet("Ledig")).toBe(false);
  });
});

describe("applyPrefill", () => {
  it("fills empty fields, first non-empty source wins, never overwrites", () => {
    const p = emptyPerson();
    p.vorname = "Schon da";
    const out = applyPrefill(
      p,
      { vorname: "URL", nachname: "", email: "url@x.de" },
      { nachname: "DB", email: "db@x.de" },
    );
    expect(out.vorname).toBe("Schon da"); // not overwritten
    expect(out.nachname).toBe("DB"); // URL empty -> DB
    expect(out.email).toBe("url@x.de"); // URL wins
  });
});

describe("validatePersonStep", () => {
  it("flags missing required personal data", () => {
    expect(validatePersonStep(emptyPerson(), 1)).toMatch(/Vorname/);
  });
  it("requires beruf only for employed types", () => {
    const p = emptyPerson();
    p.beschaeftigung = "Rentner / Pensionär";
    expect(validatePersonStep(p, 2)).toBeNull();
    p.beschaeftigung = "Angestellt";
    expect(validatePersonStep(p, 2)).toMatch(/Beruf/);
  });
  it("requires befristet_bis only when fixed-term", () => {
    const p = emptyPerson();
    p.beschaeftigung = "Angestellt";
    p.beruf = "Entwickler";
    p.dauer = "Befristet bis";
    expect(validatePersonStep(p, 2)).toMatch(/Befristet/);
    p.dauer = "unbefristet";
    expect(validatePersonStep(p, 2)).toBeNull();
  });
  it("requires PKV amount only when privately insured", () => {
    const p = emptyPerson();
    p.lebenshaltung_monat = "1000";
    p.kv_status = "Privat krankenversichert";
    expect(validatePersonStep(p, 6)).toMatch(/PKV/);
    p.pkv_beitrag_monat = "300";
    expect(validatePersonStep(p, 6)).toBeNull();
  });
});

// PROJ-7 — Selbstauskunft (Fillout-Nachbau). Reines Domänenmodell:
// Feldoptionen, Formularzustand (Haupt- + Mitantragsteller), Parsing,
// Summen-Ableitung (für Auswertungsspalten/Bonität) und Prefill.
// Keine React/DOM-Abhängigkeit — in selbstauskunft.test.ts getestet.

// ---------------------------------------------------------------------------
// Optionen (Labels exakt nach docs/FILLOUT-FORMSPEC.md)
// ---------------------------------------------------------------------------

export const WOHNSITUATION = [
  "im Wohneigentum",
  "zur Miete",
  "Mietfrei",
  "Bei den Eltern",
] as const;

export const FAMILIENSTAND = [
  "Ledig",
  "Verheiratet (ohne Gütertrennung)",
  "Verheiratet (mit Gütertrennung)",
  "Eingetragene Lebenspartnerschaft",
  "Geschieden",
  "Getrennt Lebend",
  "Verwitwet",
] as const;

export const BESCHAEFTIGUNG = [
  "Angestellt",
  "Beamter",
  "Freiberufler",
  "Rentner / Pensionär",
  "Arbeitsloser",
  "Hausfrau / Hausmann",
] as const;

export const DAUER = ["unbefristet", "Probezeit", "Befristet bis"] as const;

export const EINNAHMEQUELLEN = [
  "Lohn / Gehalt / Bezüge",
  "Einnahmen aus selbstständiger/freiberuflicher Arbeit",
  "Einnahmen aus nebenberuflicher Tätigkeit",
  "Renten und Pensionen",
  "Mieteinnahmen",
  "Kindergeld",
  "Unterhalt",
  "sonstige Einkünfte",
] as const;

export const VERMOEGENSWERTE = [
  "Bank- und Sparguthaben",
  "Wertpapiere/Aktien",
  "Kapitalbildende Lebens-/Rentenversicherungen",
  "Bausparvertrag",
  "Sonstiges Vermögen",
] as const;

export const KV_STATUS = [
  "Gesetzlich freiwillig-/pflichtversichert",
  "Privat krankenversichert",
] as const;

export const AUSGABENPOSTEN = [
  "Wohnkosten",
  "Kredite / Leasing / 0% Finanzierungen",
  "Unterhaltsverpflichtungen",
  "sonstige Verbindlichkeiten",
] as const;

export const IMMOBILIEN_OBJEKTART = [
  "Eigentumswohnung",
  "Einfamilienhaus",
  "Mehrfamilienhaus",
  "Gewerbe",
  "Grundstück",
  "Sonstiges",
] as const;

// ---------------------------------------------------------------------------
// Formularzustand
// ---------------------------------------------------------------------------

/** Alle Felder als String (UI-State); Zahlen werden bei Bedarf geparst. */
export interface PersonData {
  // Schritt 1 — Persönliche Daten
  vorname: string;
  nachname: string;
  email: string;
  telefon: string;
  geburtsdatum: string;
  strasse: string;
  ort: string;
  plz: string;
  wohnsituation: string;
  wohnhaft_seit: string;
  familienstand: string;
  kinder_anzahl: string;
  staatsangehoerigkeit: string;
  // Schritt 2 — Aktuelle Tätigkeit
  beschaeftigung: string;
  beruf: string;
  arbeitgeber: string;
  arbeitgeber_deutschland: boolean;
  taetig_seit: string;
  dauer: string;
  befristet_bis: string;
  // Schritt 3 — Einnahmen
  einnahmequellen: string[];
  lohn_netto_monat: string;
  anzahl_gehaelter: string;
  selbststaendig_jahr: string;
  nebenberuf_jahr: string;
  nebenberuf_beginn: string;
  renten_monat: string;
  mieteinnahmen_monat: string;
  kindergeld_monat: string;
  unterhalt_monat: string;
  sonstige_einkuenfte_jahr: string;
  sonstige_einkuenfte_art: string;
  // Schritt 4 — Vermögen
  vermoegenswerte: string[];
  bank_sparguthaben: string;
  wertpapiere: string;
  lebensversicherung: string;
  bausparen_guthaben: string;
  bausparen_rate: string;
  sonstiges_vermoegen: string;
  sonstiges_vermoegen_art: string;
  // Schritt 6 — Ausgaben
  lebenshaltung_monat: string;
  kv_status: string;
  pkv_beitrag_monat: string;
  ausgabenposten: string[];
  warmmiete_monat: string;
  kreditrate_monat: string;
  restschuld: string;
  unterhaltsverpflichtung_monat: string;
  sonstige_verbindlichkeit_monat: string;
  verbindlichkeit_art: string;
}

export interface ImmobilieData {
  objektart: string;
  adresse: string;
  verkehrswert: string;
  restdarlehen: string;
  mieteinnahme_monat: string;
  eigennutzung: boolean;
}

export interface SelbstauskunftData {
  haupt: PersonData;
  mit: PersonData;
  mitantragsteller: boolean;
  immobilienvermoegen: "ja" | "nein" | "";
  immobilien: ImmobilieData[];
  datenschutz: boolean;
  ort: string;
  datum: string;
}

export function emptyPerson(): PersonData {
  return {
    vorname: "", nachname: "", email: "", telefon: "", geburtsdatum: "",
    strasse: "", ort: "", plz: "", wohnsituation: "", wohnhaft_seit: "",
    familienstand: "", kinder_anzahl: "", staatsangehoerigkeit: "",
    beschaeftigung: "", beruf: "", arbeitgeber: "", arbeitgeber_deutschland: false,
    taetig_seit: "", dauer: "", befristet_bis: "",
    einnahmequellen: [], lohn_netto_monat: "", anzahl_gehaelter: "",
    selbststaendig_jahr: "", nebenberuf_jahr: "", nebenberuf_beginn: "",
    renten_monat: "", mieteinnahmen_monat: "", kindergeld_monat: "",
    unterhalt_monat: "", sonstige_einkuenfte_jahr: "", sonstige_einkuenfte_art: "",
    vermoegenswerte: [], bank_sparguthaben: "", wertpapiere: "",
    lebensversicherung: "", bausparen_guthaben: "", bausparen_rate: "",
    sonstiges_vermoegen: "", sonstiges_vermoegen_art: "",
    lebenshaltung_monat: "", kv_status: "", pkv_beitrag_monat: "",
    ausgabenposten: [], warmmiete_monat: "", kreditrate_monat: "", restschuld: "",
    unterhaltsverpflichtung_monat: "", sonstige_verbindlichkeit_monat: "",
    verbindlichkeit_art: "",
  };
}

export function emptyImmobilie(): ImmobilieData {
  return {
    objektart: "", adresse: "", verkehrswert: "", restdarlehen: "",
    mieteinnahme_monat: "", eigennutzung: false,
  };
}

export function emptySelbstauskunft(): SelbstauskunftData {
  return {
    haupt: emptyPerson(),
    mit: emptyPerson(),
    mitantragsteller: false,
    immobilienvermoegen: "",
    immobilien: [],
    datenschutz: false,
    ort: "",
    datum: "",
  };
}

// ---------------------------------------------------------------------------
// Parsing & Summen
// ---------------------------------------------------------------------------

/** Parse a German currency/number string ("1.234,56" / "1234.56") -> number. */
export function parseEuro(raw: string | null | undefined): number {
  if (raw == null) return 0;
  let s = String(raw).replace(/[€\s]/g, "").trim();
  if (s === "") return 0;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else {
    const dots = (s.match(/\./g) ?? []).length;
    if (dots > 1) s = s.replace(/\./g, "");
    else if (dots === 1 && (s.split(".")[1] ?? "").length === 3)
      s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/** Monatliche Gesamteinnahmen einer Person (annual sources / 12). */
export function einnahmenProMonat(p: PersonData): number {
  const has = (q: string) => p.einnahmequellen.includes(q);
  let sum = 0;
  if (has("Lohn / Gehalt / Bezüge")) {
    const anzahl = parseEuro(p.anzahl_gehaelter) || 12;
    sum += (parseEuro(p.lohn_netto_monat) * anzahl) / 12;
  }
  if (has("Einnahmen aus selbstständiger/freiberuflicher Arbeit"))
    sum += parseEuro(p.selbststaendig_jahr) / 12;
  if (has("Einnahmen aus nebenberuflicher Tätigkeit"))
    sum += parseEuro(p.nebenberuf_jahr) / 12;
  if (has("Renten und Pensionen")) sum += parseEuro(p.renten_monat);
  if (has("Mieteinnahmen")) sum += parseEuro(p.mieteinnahmen_monat);
  if (has("Kindergeld")) sum += parseEuro(p.kindergeld_monat);
  if (has("Unterhalt")) sum += parseEuro(p.unterhalt_monat);
  if (has("sonstige Einkünfte")) sum += parseEuro(p.sonstige_einkuenfte_jahr) / 12;
  return Math.round(sum * 100) / 100;
}

/** Liquide Vermögenssumme einer Person. */
export function vermoegenSumme(p: PersonData): number {
  const has = (q: string) => p.vermoegenswerte.includes(q);
  let sum = 0;
  if (has("Bank- und Sparguthaben")) sum += parseEuro(p.bank_sparguthaben);
  if (has("Wertpapiere/Aktien")) sum += parseEuro(p.wertpapiere);
  if (has("Kapitalbildende Lebens-/Rentenversicherungen"))
    sum += parseEuro(p.lebensversicherung);
  if (has("Bausparvertrag")) sum += parseEuro(p.bausparen_guthaben);
  if (has("Sonstiges Vermögen")) sum += parseEuro(p.sonstiges_vermoegen);
  return Math.round(sum * 100) / 100;
}

/** Monatliche Ausgaben/Verpflichtungen einer Person. */
export function ausgabenProMonat(p: PersonData): number {
  const has = (q: string) => p.ausgabenposten.includes(q);
  let sum = parseEuro(p.lebenshaltung_monat);
  if (p.kv_status === "Privat krankenversichert")
    sum += parseEuro(p.pkv_beitrag_monat);
  if (has("Wohnkosten")) sum += parseEuro(p.warmmiete_monat);
  if (has("Kredite / Leasing / 0% Finanzierungen"))
    sum += parseEuro(p.kreditrate_monat);
  if (has("Unterhaltsverpflichtungen"))
    sum += parseEuro(p.unterhaltsverpflichtung_monat);
  if (has("sonstige Verbindlichkeiten"))
    sum += parseEuro(p.sonstige_verbindlichkeit_monat);
  return Math.round(sum * 100) / 100;
}

/** Monatliche Kreditverpflichtungen (für kunden-Mirror). */
export function kreditverpflichtungenProMonat(p: PersonData): number {
  const has = (q: string) => p.ausgabenposten.includes(q);
  let sum = 0;
  if (has("Kredite / Leasing / 0% Finanzierungen"))
    sum += parseEuro(p.kreditrate_monat);
  if (has("sonstige Verbindlichkeiten"))
    sum += parseEuro(p.sonstige_verbindlichkeit_monat);
  return Math.round(sum * 100) / 100;
}

/** Personen, die zur Auswertung beitragen (Haupt + ggf. Mitantragsteller). */
export function relevantePersonen(d: SelbstauskunftData): PersonData[] {
  return d.mitantragsteller ? [d.haupt, d.mit] : [d.haupt];
}

export interface Auswertung {
  einnahmen_summe_monat: number;
  vermoegen_summe: number;
  ausgaben_summe_monat: number;
  kreditverpflichtungen_monat: number;
}

/** Aggregierte Kennzahlen über alle relevanten Personen. */
export function auswerten(d: SelbstauskunftData): Auswertung {
  const ps = relevantePersonen(d);
  return {
    einnahmen_summe_monat: ps.reduce((a, p) => a + einnahmenProMonat(p), 0),
    vermoegen_summe: ps.reduce((a, p) => a + vermoegenSumme(p), 0),
    ausgaben_summe_monat: ps.reduce((a, p) => a + ausgabenProMonat(p), 0),
    kreditverpflichtungen_monat: ps.reduce(
      (a, p) => a + kreditverpflichtungenProMonat(p),
      0,
    ),
  };
}

// ---------------------------------------------------------------------------
// Mapping zu kunden-Feldern
// ---------------------------------------------------------------------------

/** Fillout-Beschäftigung -> kunden.beruf_status (für Bonität). null wenn unklar. */
export function berufStatusFromBeschaeftigung(
  b: string,
): "angestellter" | "selbststaendiger" | "unternehmer" | null {
  switch (b) {
    case "Angestellt":
    case "Beamter":
      return "angestellter";
    case "Freiberufler":
      return "selbststaendiger";
    default:
      return null; // Rentner/Arbeitslos/Hausfrau -> kein Bonitäts-Status
  }
}

export function istVerheiratet(familienstand: string): boolean {
  return familienstand.startsWith("Verheiratet") ||
    familienstand === "Eingetragene Lebenspartnerschaft";
}

// ---------------------------------------------------------------------------
// Prefill
// ---------------------------------------------------------------------------

export interface PrefillSource {
  vorname?: string | null;
  nachname?: string | null;
  email?: string | null;
  telefon?: string | null;
  geburtsdatum?: string | null;
  adresse?: string | null;
  plz?: string | null;
  stadt?: string | null;
}

/** Erstes Nicht-Leeres gewinnt (URL-Param vor DB). Mutiert nicht. */
export function applyPrefill(
  person: PersonData,
  ...sources: (PrefillSource | undefined | null)[]
): PersonData {
  const pick = (...vals: (string | null | undefined)[]) =>
    vals.find((v) => v != null && String(v).trim() !== "") ?? "";
  const out = { ...person };
  const s = sources.filter(Boolean) as PrefillSource[];
  const get = (k: keyof PrefillSource) => pick(...s.map((src) => src[k]));
  out.vorname = out.vorname || get("vorname");
  out.nachname = out.nachname || get("nachname");
  out.email = out.email || get("email");
  out.telefon = out.telefon || get("telefon");
  out.geburtsdatum = out.geburtsdatum || get("geburtsdatum");
  out.strasse = out.strasse || get("adresse");
  out.plz = out.plz || get("plz");
  out.ort = out.ort || get("stadt");
  return out;
}

// ---------------------------------------------------------------------------
// Validierung (bedingt, pro Schritt) — gibt Fehlertext oder null
// ---------------------------------------------------------------------------

const req = (v: string) => v.trim() !== "";

/** Validiert eine Person für einen Schritt (1..6). null = ok. */
export function validatePersonStep(p: PersonData, step: number): string | null {
  if (step === 1) {
    if (!req(p.vorname)) return "Vorname fehlt";
    if (!req(p.nachname)) return "Nachname fehlt";
    if (!req(p.email)) return "E-Mail fehlt";
    if (!req(p.telefon)) return "Telefon fehlt";
    if (!req(p.geburtsdatum)) return "Geburtsdatum fehlt";
    if (!req(p.strasse)) return "Straße & Hausnr. fehlt";
    if (!req(p.ort)) return "Ort fehlt";
    if (!/^\d{4,5}$/.test(p.plz.trim())) return "PLZ ungültig";
    if (!req(p.wohnsituation)) return "Wohnsituation fehlt";
    if (!req(p.familienstand)) return "Familienstand fehlt";
    if (!req(p.staatsangehoerigkeit)) return "Staatsangehörigkeit fehlt";
  } else if (step === 2) {
    if (!req(p.beschaeftigung)) return "Beschäftigungsverhältnis fehlt";
    const erwerbstaetig = ["Angestellt", "Beamter", "Freiberufler"].includes(
      p.beschaeftigung,
    );
    if (erwerbstaetig) {
      if (!req(p.beruf)) return "Beruf / Tätigkeit fehlt";
      if (!req(p.dauer)) return "Dauer fehlt";
      if (p.dauer === "Befristet bis" && !req(p.befristet_bis))
        return "Befristet bis fehlt";
    }
  } else if (step === 3) {
    if (p.einnahmequellen.length === 0) return "Mind. eine Einnahmequelle wählen";
  } else if (step === 4) {
    if (p.vermoegenswerte.length === 0) return "Mind. einen Vermögenswert wählen";
  } else if (step === 6) {
    if (!req(p.lebenshaltung_monat)) return "Lebenshaltungskosten fehlen";
    if (!req(p.kv_status)) return "Krankenversicherungsstatus fehlt";
    if (p.kv_status === "Privat krankenversichert" && !req(p.pkv_beitrag_monat))
      return "PKV-Beitrag fehlt";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Fortschritt / Vollständigkeit — für den gamifizierten Hub + Reminder.
// Ein Bereich statt linearer Schritte: pro Bereich leer / teilweise / fertig.
// Baut auf validatePersonStep (Pflicht-Bereiche) auf → keine Semantik-Drift.
// ---------------------------------------------------------------------------

export type SelbstauskunftAreaKey =
  | "persoenlich"
  | "taetigkeit"
  | "einkommen"
  | "vermoegen"
  | "ausgaben"
  | "verbindlichkeiten"
  | "immobilien"
  | "abschluss";

export type AreaStatus = "leer" | "teilweise" | "fertig";

export interface AreaProgress {
  key: SelbstauskunftAreaKey;
  status: AreaStatus;
  /** Zählt in die Gesamt-% und blockiert den Abschluss. */
  required: boolean;
}

export interface SelbstauskunftProgress {
  areas: AreaProgress[];
  requiredTotal: number;
  requiredDone: number;
  /** 0..100 über die Pflichtbereiche. */
  percent: number;
  /** Alle Pflichtbereiche fertig? (Unterschrift wird beim Absenden geprüft.) */
  submittable: boolean;
}

const PERSOENLICH_KEYS: (keyof PersonData)[] = [
  "vorname", "nachname", "email", "telefon", "geburtsdatum", "strasse", "ort",
  "plz", "wohnsituation", "wohnhaft_seit", "familienstand", "kinder_anzahl",
  "staatsangehoerigkeit",
];
const TAETIGKEIT_KEYS: (keyof PersonData)[] = [
  "beschaeftigung", "beruf", "arbeitgeber", "taetig_seit", "dauer", "befristet_bis",
];
const EINKOMMEN_KEYS: (keyof PersonData)[] = [
  "lohn_netto_monat", "anzahl_gehaelter", "selbststaendig_jahr", "nebenberuf_jahr",
  "nebenberuf_beginn", "renten_monat", "mieteinnahmen_monat", "kindergeld_monat",
  "unterhalt_monat", "sonstige_einkuenfte_jahr", "sonstige_einkuenfte_art",
];
const VERMOEGEN_KEYS: (keyof PersonData)[] = [
  "bank_sparguthaben", "wertpapiere", "lebensversicherung", "bausparen_guthaben",
  "bausparen_rate", "sonstiges_vermoegen", "sonstiges_vermoegen_art",
];
const AUSGABEN_KEYS: (keyof PersonData)[] = [
  "lebenshaltung_monat", "kv_status", "pkv_beitrag_monat", "warmmiete_monat",
];
const VERBINDLICHKEIT_KEYS: (keyof PersonData)[] = [
  "kreditrate_monat", "restschuld", "unterhaltsverpflichtung_monat",
  "sonstige_verbindlichkeit_monat", "verbindlichkeit_art",
];

const LIABILITY_POSTEN = [
  "Kredite / Leasing / 0% Finanzierungen",
  "Unterhaltsverpflichtungen",
  "sonstige Verbindlichkeiten",
];

function anyFilled(p: PersonData, keys: (keyof PersonData)[]): boolean {
  return keys.some((k) => {
    const v = p[k];
    return typeof v === "string" ? v.trim() !== "" : false;
  });
}

function personStarted(p: PersonData, key: SelbstauskunftAreaKey): boolean {
  switch (key) {
    case "persoenlich":
      return anyFilled(p, PERSOENLICH_KEYS);
    case "taetigkeit":
      return anyFilled(p, TAETIGKEIT_KEYS) || p.arbeitgeber_deutschland;
    case "einkommen":
      return p.einnahmequellen.length > 0 || anyFilled(p, EINKOMMEN_KEYS);
    case "vermoegen":
      return p.vermoegenswerte.length > 0 || anyFilled(p, VERMOEGEN_KEYS);
    case "ausgaben":
      return anyFilled(p, AUSGABEN_KEYS) || p.ausgabenposten.includes("Wohnkosten");
    case "verbindlichkeiten":
      return (
        anyFilled(p, VERBINDLICHKEIT_KEYS) ||
        p.ausgabenposten.some((x) => LIABILITY_POSTEN.includes(x))
      );
    default:
      return false;
  }
}

const STEP_FOR_AREA: Partial<Record<SelbstauskunftAreaKey, number>> = {
  persoenlich: 1, taetigkeit: 2, einkommen: 3, vermoegen: 4, ausgaben: 6,
};

function personArea(p: PersonData, key: SelbstauskunftAreaKey): AreaStatus {
  const step = STEP_FOR_AREA[key];
  if (step != null) {
    if (validatePersonStep(p, step) == null) return "fertig";
    return personStarted(p, key) ? "teilweise" : "leer";
  }
  if (key === "verbindlichkeiten") {
    const selected = p.ausgabenposten.filter((x) => LIABILITY_POSTEN.includes(x));
    // Nichts anzugeben → erledigt, sobald der Ausgaben-Bereich steht.
    if (selected.length === 0)
      return validatePersonStep(p, 6) == null ? "fertig" : "leer";
    const strFilled = (v: string) => v.trim() !== "";
    const ok =
      (!selected.includes("Kredite / Leasing / 0% Finanzierungen") ||
        strFilled(p.kreditrate_monat)) &&
      (!selected.includes("Unterhaltsverpflichtungen") ||
        strFilled(p.unterhaltsverpflichtung_monat)) &&
      (!selected.includes("sonstige Verbindlichkeiten") ||
        strFilled(p.sonstige_verbindlichkeit_monat));
    return ok ? "fertig" : "teilweise";
  }
  return "leer";
}

function combineStatus(a: AreaStatus, b: AreaStatus): AreaStatus {
  if (a === "fertig" && b === "fertig") return "fertig";
  if (a === "leer" && b === "leer") return "leer";
  return "teilweise";
}

function immobilienStatus(d: SelbstauskunftData): AreaStatus {
  if (d.immobilienvermoegen === "") return "leer";
  if (d.immobilienvermoegen === "nein") return "fertig";
  if (d.immobilien.length === 0) return "teilweise";
  const allOk = d.immobilien.every(
    (im) => im.objektart.trim() !== "" && im.adresse.trim() !== "",
  );
  return allOk ? "fertig" : "teilweise";
}

function abschlussStatus(d: SelbstauskunftData): AreaStatus {
  const filled = d.datenschutz && d.ort.trim() !== "";
  if (filled) return "fertig";
  if (d.datenschutz || d.ort.trim() !== "") return "teilweise";
  return "leer";
}

/** Bereichs-Fortschritt über Haupt- (+ ggf. Mit-)antragsteller. */
export function selbstauskunftProgress(
  d: SelbstauskunftData,
): SelbstauskunftProgress {
  const persons = relevantePersonen(d);
  const perPerson = (key: SelbstauskunftAreaKey): AreaStatus =>
    persons.map((p) => personArea(p, key)).reduce(combineStatus);

  const areas: AreaProgress[] = [
    { key: "persoenlich", status: perPerson("persoenlich"), required: true },
    { key: "taetigkeit", status: perPerson("taetigkeit"), required: true },
    { key: "einkommen", status: perPerson("einkommen"), required: true },
    { key: "vermoegen", status: perPerson("vermoegen"), required: true },
    { key: "ausgaben", status: perPerson("ausgaben"), required: true },
    { key: "verbindlichkeiten", status: perPerson("verbindlichkeiten"), required: false },
    { key: "immobilien", status: immobilienStatus(d), required: false },
    { key: "abschluss", status: abschlussStatus(d), required: false },
  ];

  const requiredAreas = areas.filter((a) => a.required);
  const requiredDone = requiredAreas.filter((a) => a.status === "fertig").length;
  const requiredTotal = requiredAreas.length;
  const percent =
    requiredTotal === 0 ? 0 : Math.round((requiredDone / requiredTotal) * 100);

  return {
    areas,
    requiredTotal,
    requiredDone,
    percent,
    submittable: requiredDone === requiredTotal,
  };
}

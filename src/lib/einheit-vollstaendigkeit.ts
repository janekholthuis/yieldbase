// PROJ-21 — Single source of truth für die Pflichtfeld-/Freigabe-Vollständigkeit
// einer Einheit.
//
// Reine Hilfsfunktionen (keine React/DOM/Server-Abhängigkeit), damit sie überall
// wiederverwendbar sind:
//   - "Fehlende Daten"-Ansicht (CompletenessCard, Client),
//   - das harte Freigabe-Gate in der Server-Action `setFreigabeStatus`,
//   - Warnungen im Bulk-Import (objekte-bulk.ts).
//
// Kundenvorgabe: eine Einheit kann jederzeit als ENTWURF angelegt werden, lässt
// sich aber erst auf "freigegeben" (online) schalten, wenn ALLE Pflichtfelder
// vorhanden sind. Einige Felder sind fachlich bedingt pflichtig (siehe `when`).

export interface Renovierung {
  gewerk: string;
  jahr: number;
}

/**
 * Alle Felder, die das Gate prüft. Werte aus der Einheit selbst plus die vom
 * Projekt geerbten (`adresse`, `baujahr`). Alles optional/defensiv typisiert,
 * weil sowohl `EinheitDetail` als auch geparste Bulk-Zeilen hier reingereicht
 * werden.
 */
export interface VollstaendigkeitInput {
  wohnungsnummer?: string | null;
  wohnflaeche?: number | null;
  zimmer?: number | null;
  etage?: number | null;
  lage_im_haus?: string | null;
  kaufpreis?: number | null;
  grundstueckswert_anteil?: number | null;
  miete?: number | null;
  nutzungsart?: string | null;
  objektzustand?: string | null;
  heizungsart?: string | null;
  energieklasse?: string | null;
  miteigentumsanteil?: string | null;
  hausgeld_umlagefaehig?: number | null;
  hausgeld_nicht_umlagefaehig?: number | null;
  instandhaltungsruecklage?: number | null;
  instandhaltungsruecklage_gesamt?: number | null;
  sondereigentumsverwaltung?: number | null;
  afa_satz?: number | null;
  vermietet?: boolean | null;
  vermietet_seit?: string | null;
  renovierungen?: Renovierung[] | null;
  // Vom Projekt geerbt
  adresse?: string | null;
  baujahr?: number | null;
  // KI-Felder (erst Pflicht, wenn `kiPflichtAktiv` true ist — PROJ-22)
  tags?: string[] | null;
  standort_highlights?: string | null;
}

export interface MissingField {
  key: string;
  label: string;
}

type Group = "ki";

interface FieldSpec {
  key: keyof VollstaendigkeitInput;
  label: string;
  present: (e: VollstaendigkeitInput) => boolean;
  /** Nur prüfen, wenn diese Bedingung zutrifft (sonst überspringen). */
  when?: (e: VollstaendigkeitInput) => boolean;
  /** Gruppe, die separat scharfgeschaltet werden kann (z. B. KI-Felder). */
  group?: Group;
}

/** Zahl vorhanden (0 zählt als vorhanden; null/undefined/NaN = fehlt). */
function hasNum(v: number | null | undefined): boolean {
  return v != null && Number.isFinite(v);
}
/** String vorhanden (getrimmt nicht leer). */
function hasStr(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim() !== "";
}

const isBestand = (e: VollstaendigkeitInput) => e.objektzustand === "bestand";
const isVermietet = (e: VollstaendigkeitInput) => e.vermietet === true;

/**
 * Pflichtfelder für die Freigabe. Reihenfolge = Anzeigereihenfolge in der
 * "Fehlende Daten"-Liste. Bedingt pflichtige Felder über `when`.
 */
export const REQUIRED_FOR_FREIGABE: FieldSpec[] = [
  { key: "wohnungsnummer", label: "Wohnungsnummer", present: (e) => hasStr(e.wohnungsnummer) },
  { key: "wohnflaeche", label: "Wohnfläche", present: (e) => hasNum(e.wohnflaeche) },
  { key: "zimmer", label: "Zimmer", present: (e) => hasNum(e.zimmer) },
  { key: "etage", label: "Etage", present: (e) => hasNum(e.etage) },
  { key: "lage_im_haus", label: "Lage im Haus", present: (e) => hasStr(e.lage_im_haus) },
  { key: "kaufpreis", label: "Kaufpreis", present: (e) => hasNum(e.kaufpreis) },
  {
    key: "grundstueckswert_anteil",
    label: "Kaufpreisaufteilung (Grundstücksanteil)",
    present: (e) => hasNum(e.grundstueckswert_anteil),
  },
  { key: "miete", label: "Kaltmiete", present: (e) => hasNum(e.miete) },
  { key: "nutzungsart", label: "Objektart / Nutzungsart", present: (e) => hasStr(e.nutzungsart) },
  { key: "objektzustand", label: "Zustand", present: (e) => hasStr(e.objektzustand) },
  { key: "heizungsart", label: "Heizungsart", present: (e) => hasStr(e.heizungsart) },
  { key: "energieklasse", label: "Energieklasse", present: (e) => hasStr(e.energieklasse) },
  { key: "miteigentumsanteil", label: "Miteigentumsanteil (MEA)", present: (e) => hasStr(e.miteigentumsanteil) },
  {
    key: "hausgeld_umlagefaehig",
    label: "Hausgeld umlagefähig",
    present: (e) => hasNum(e.hausgeld_umlagefaehig),
  },
  {
    key: "hausgeld_nicht_umlagefaehig",
    label: "Hausgeld nicht umlagefähig",
    present: (e) => hasNum(e.hausgeld_nicht_umlagefaehig),
  },
  {
    key: "instandhaltungsruecklage",
    label: "Instandhaltungsrücklage (mtl.)",
    present: (e) => hasNum(e.instandhaltungsruecklage),
  },
  {
    key: "instandhaltungsruecklage_gesamt",
    label: "Instandhaltungsrücklage (gesamt)",
    present: (e) => hasNum(e.instandhaltungsruecklage_gesamt),
  },
  {
    key: "sondereigentumsverwaltung",
    label: "Kosten SEV",
    present: (e) => hasNum(e.sondereigentumsverwaltung),
  },
  { key: "afa_satz", label: "Abschreibung (AfA %)", present: (e) => hasNum(e.afa_satz) },
  { key: "baujahr", label: "Baujahr", present: (e) => hasNum(e.baujahr) },
  { key: "adresse", label: "Anschrift", present: (e) => hasStr(e.adresse) },
  // Bedingt pflichtig
  {
    key: "vermietet_seit",
    label: "Vermietet seit",
    present: (e) => hasStr(e.vermietet_seit),
    when: isVermietet,
  },
  {
    key: "renovierungen",
    label: "Renovierungsaufstellung",
    present: (e) => Array.isArray(e.renovierungen) && e.renovierungen.length > 0,
    when: isBestand,
  },
  // KI-Felder (PROJ-22): erst aktiv, wenn `kiPflichtAktiv` true
  {
    key: "tags",
    label: "Tags / Highlights",
    present: (e) => Array.isArray(e.tags) && e.tags.length > 0,
    group: "ki",
  },
  {
    key: "standort_highlights",
    label: "Standort-Highlights",
    present: (e) => hasStr(e.standort_highlights),
    group: "ki",
  },
];

export interface VollstaendigkeitOptions {
  /**
   * KI-Felder (tags, standort_highlights) als Pflicht ins Gate aufnehmen.
   * Default false — wird mit PROJ-22 (KI-Generierung live) scharfgeschaltet.
   */
  kiPflichtAktiv?: boolean;
}

/** Aktive Feld-Specs für die gegebene Einheit (bedingte + Gruppen aufgelöst). */
function activeSpecs(e: VollstaendigkeitInput, opts?: VollstaendigkeitOptions): FieldSpec[] {
  return REQUIRED_FOR_FREIGABE.filter((f) => {
    if (f.group === "ki" && !opts?.kiPflichtAktiv) return false;
    if (f.when && !f.when(e)) return false;
    return true;
  });
}

/** Liste der fehlenden Pflichtfelder (leer = vollständig & freigebbar). */
export function fehlendeFelder(
  e: VollstaendigkeitInput,
  opts?: VollstaendigkeitOptions,
): MissingField[] {
  return activeSpecs(e, opts)
    .filter((f) => !f.present(e))
    .map((f) => ({ key: f.key as string, label: f.label }));
}

/** True, wenn alle (aktiven) Pflichtfelder vorhanden sind. */
export function istFreigebbar(
  e: VollstaendigkeitInput,
  opts?: VollstaendigkeitOptions,
): boolean {
  return fehlendeFelder(e, opts).length === 0;
}

/** Vollständigkeit in Prozent (0–100), basierend auf den aktiven Pflichtfeldern. */
export function vollstaendigkeitProzent(
  e: VollstaendigkeitInput,
  opts?: VollstaendigkeitOptions,
): number {
  const specs = activeSpecs(e, opts);
  if (specs.length === 0) return 100;
  const done = specs.filter((f) => f.present(e)).length;
  return Math.round((done / specs.length) * 100);
}

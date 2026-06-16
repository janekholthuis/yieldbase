// PROJ-16 — Bulk-Erfassung von Einheiten aus einer (Excel-)Kaufpreisliste.
//
// Reine Hilfsfunktionen (keine React/DOM-Abhängigkeit) für:
//  - deutsches Zahlenparsing ("1.234,56" -> 1234.56),
//  - Zerlegen eingefügter Tabellen (Tab-getrennt, Zeilen = \n),
//  - Heuristik für Überschriftszeile + Spalten-Auto-Mapping,
//  - Validierung einer Zeile.
// In EinheitenBulkGrid.tsx verwendet und in objekte-bulk.test.ts getestet.

import {
  fehlendeFelder,
  type VollstaendigkeitInput,
  type MissingField,
} from "@/lib/einheit-vollstaendigkeit";

// Reihenfolge bewusst stabil gehalten: die 7 ursprünglichen Felder zuerst (damit
// das Auto-Mapping typischer Kaufpreislisten ohne Header unverändert bleibt),
// PROJ-21-Felder hinten angehängt.
export const BULK_FIELDS = [
  { key: "wohnungsnummer", label: "Wohnungsnr.", type: "text", required: true },
  { key: "etage", label: "Etage", type: "num", required: false },
  { key: "zimmer", label: "Zimmer", type: "num", required: false },
  { key: "wohnflaeche", label: "Fläche (m²)", type: "num", required: false },
  { key: "miete", label: "Kaltmiete (€)", type: "num", required: false },
  { key: "kaufpreis", label: "Kaufpreis (€)", type: "num", required: false },
  { key: "stellplatz_preis", label: "Stellplatz (€)", type: "num", required: false },
  { key: "lage_im_haus", label: "Lage im Haus", type: "text", required: false },
  { key: "kaufpreis_wohnung", label: "Anteil Wohnung (€)", type: "num", required: false },
  { key: "kaufpreis_moebel", label: "Anteil Möbel (€)", type: "num", required: false },
  {
    key: "instandhaltungsruecklage_gesamt",
    label: "Rücklage gesamt (€)",
    type: "num",
    required: false,
  },
] as const;

export type BulkFieldKey = (typeof BULK_FIELDS)[number]["key"];

export type BulkRow = Record<BulkFieldKey, string>;

/** A per-column mapping target; null = Spalte ignorieren. */
export type ColumnMapping = (BulkFieldKey | null)[];

export function emptyRow(): BulkRow {
  return {
    wohnungsnummer: "",
    etage: "",
    lage_im_haus: "",
    zimmer: "",
    wohnflaeche: "",
    miete: "",
    kaufpreis: "",
    kaufpreis_wohnung: "",
    kaufpreis_moebel: "",
    stellplatz_preis: "",
    instandhaltungsruecklage_gesamt: "",
  };
}

/**
 * Parse a German-formatted number. Handles thousands "." and decimal ",",
 * strips €, whitespace, NBSP and "m²". Returns undefined for empty/invalid.
 *   "1.234,56" -> 1234.56 | "60,5" -> 60.5 | "1.000" -> 1000 | "60.5" -> 60.5
 */
export function parseDeNumber(raw: string): number | undefined {
  let s = raw
    .replace(/ /g, " ")
    .replace(/m²|m2/gi, "")
    .replace(/[€\s]/g, "")
    .trim();
  if (s === "") return undefined;

  if (s.includes(",")) {
    // Comma is the decimal separator -> dots are thousands separators.
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    const dots = (s.match(/\./g) ?? []).length;
    if (dots > 1) {
      // Multiple dots can only be thousands separators (e.g. 1.000.000).
      s = s.replace(/\./g, "");
    } else if (dots === 1) {
      // A single dot followed by exactly 3 digits is a thousands separator;
      // otherwise treat it as a decimal point (e.g. English "60.5").
      const after = s.split(".")[1] ?? "";
      if (after.length === 3) s = s.replace(/\./g, "");
    }
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

/** Split pasted clipboard text into a matrix (rows of tab-separated cells). */
export function parseClipboardMatrix(text: string): string[][] {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => line.split("\t").map((c) => c.trim()));
}

/**
 * Heuristic: does this row look like a header (labels) rather than data?
 * True when at least one cell has letters and most non-empty cells are
 * non-numeric.
 */
export function looksLikeHeaderRow(cells: string[]): boolean {
  const nonEmpty = cells.filter((c) => c.trim() !== "");
  if (nonEmpty.length === 0) return false;
  const hasLetters = nonEmpty.some((c) => /[a-zA-ZäöüÄÖÜ]/.test(c));
  if (!hasLetters) return false;
  const numeric = nonEmpty.filter((c) => parseDeNumber(c) !== undefined).length;
  return numeric <= nonEmpty.length / 2;
}

const HEADER_SYNONYMS: Record<BulkFieldKey, string[]> = {
  wohnungsnummer: ["wohnungsnr", "wohnung", "we ", "we-", "einheit", "nummer", "nr", "whg"],
  etage: ["etage", "geschoss", "stockwerk", "stock", "og", "ebene"],
  lage_im_haus: ["lage im haus", "lage", "wohnungslage", "ausrichtung", "himmelsrichtung"],
  zimmer: ["zimmer", "zi.", "anzahl zimmer", "räume", "zi "],
  wohnflaeche: ["wohnfläche", "wohnflaeche", "fläche", "flaeche", "qm", "m²", "m2", "wfl"],
  miete: ["kaltmiete", "nettomiete", "nettokaltmiete", "miete", "kalt", "ist-miete", "mieteinnahme"],
  kaufpreis: ["kaufpreis", "preis", "vk-preis", "vk", "verkaufspreis", "kp"],
  kaufpreis_wohnung: ["anteil wohnung", "kaufpreis wohnung", "wohnungsanteil", "kp wohnung"],
  kaufpreis_moebel: ["anteil möbel", "möbel", "moebel", "möblierung", "kaufpreis möbel", "kp möbel"],
  stellplatz_preis: ["stellplatz", "stellpl", "garage", "tiefgarage", "tg", "parkplatz", "pkw"],
  instandhaltungsruecklage_gesamt: [
    "rücklage gesamt",
    "ruecklage gesamt",
    "instandhaltungsrücklage gesamt",
    "ihr gesamt",
    "rücklage (gesamt)",
  ],
};

// Check the most specific fields first so e.g. "Stellplatzpreis" matches
// stellplatz_preis and not kaufpreis (whose broad "preis" synonym also hits).
const GUESS_ORDER: BulkFieldKey[] = [
  "stellplatz_preis",
  "kaufpreis_wohnung",
  "kaufpreis_moebel",
  "instandhaltungsruecklage_gesamt",
  "lage_im_haus",
  "wohnflaeche",
  "wohnungsnummer",
  "zimmer",
  "etage",
  "miete",
  "kaufpreis",
];

/** Keys, deren Wert als Text (nicht als Zahl) übernommen wird. */
const TEXT_FIELD_KEYS = new Set<BulkFieldKey>(
  BULK_FIELDS.filter((f) => f.type === "text").map((f) => f.key),
);

/** Guess which field a header cell maps to; null if nothing matches. */
export function guessFieldFromHeader(header: string): BulkFieldKey | null {
  const h = header.toLowerCase().trim();
  if (h === "") return null;
  for (const key of GUESS_ORDER) {
    if (HEADER_SYNONYMS[key].some((s) => h.includes(s.trim()))) return key;
  }
  return null;
}

/**
 * Default mapping for `colCount` columns. If a header row is given, map by
 * synonym match first; otherwise (and for unmatched columns) fall back to the
 * canonical field order, skipping fields already taken.
 */
export function buildMapping(colCount: number, header?: string[]): ColumnMapping {
  const mapping: ColumnMapping = new Array(colCount).fill(null);
  const used = new Set<BulkFieldKey>();

  if (header) {
    header.forEach((cell, i) => {
      if (i >= colCount) return;
      const guess = guessFieldFromHeader(cell);
      if (guess && !used.has(guess)) {
        mapping[i] = guess;
        used.add(guess);
      }
    });
  }

  // Fill remaining columns in canonical order with not-yet-used fields.
  const order = BULK_FIELDS.map((f) => f.key);
  let next = 0;
  for (let i = 0; i < colCount; i++) {
    if (mapping[i]) continue;
    while (next < order.length && used.has(order[next])) next++;
    if (next < order.length) {
      mapping[i] = order[next];
      used.add(order[next]);
      next++;
    }
  }
  return mapping;
}

/** Turn a data matrix + column mapping into bulk rows. */
export function matrixToRows(matrix: string[][], mapping: ColumnMapping): BulkRow[] {
  return matrix.map((cells) => {
    const row = emptyRow();
    mapping.forEach((field, col) => {
      if (!field) return;
      const raw = cells[col] ?? "";
      if (TEXT_FIELD_KEYS.has(field)) {
        row[field] = raw.trim();
      } else {
        const n = parseDeNumber(raw);
        row[field] = n === undefined ? "" : String(n);
      }
    });
    return row;
  });
}

/** Validate a single row. Returns a human-readable error or null when valid. */
export function rowError(row: BulkRow): string | null {
  if (row.wohnungsnummer.trim() === "") return "Wohnungsnr. fehlt";
  for (const field of BULK_FIELDS) {
    if (field.type !== "num") continue;
    const raw = row[field.key].trim();
    if (raw === "") continue;
    const n = parseDeNumber(raw);
    if (n === undefined) return `${field.label}: keine gültige Zahl`;
    if (n < 0) return `${field.label}: negativ`;
  }
  return null;
}

/** True when the row has at least one non-empty value (worth keeping). */
export function rowHasContent(row: BulkRow): boolean {
  return Object.values(row).some((v) => v.trim() !== "");
}

/** Normalise a Wohnungsnummer for duplicate comparison (trim + lowercase). */
export function normWohnungsnummer(v: string): string {
  return v.trim().toLowerCase();
}

/**
 * Weiche Warnung (PROJ-21): welche Freigabe-Pflichtfelder fehlen in dieser
 * Bulk-Zeile? Blockiert NICHT den Import (Einheiten werden als Entwurf
 * importiert) — `rowError` bleibt der harte Validitäts-Check. Nutzt das SSOT
 * `fehlendeFelder`, aber nur für die Felder, die per Bulk überhaupt erfassbar
 * sind (Rest wird ohnehin nachgepflegt).
 */
export function bulkRowMissingForFreigabe(row: BulkRow): MissingField[] {
  const input: VollstaendigkeitInput = {
    wohnungsnummer: row.wohnungsnummer,
    etage: parseDeNumber(row.etage) ?? null,
    lage_im_haus: row.lage_im_haus,
    zimmer: parseDeNumber(row.zimmer) ?? null,
    wohnflaeche: parseDeNumber(row.wohnflaeche) ?? null,
    miete: parseDeNumber(row.miete) ?? null,
    kaufpreis: parseDeNumber(row.kaufpreis) ?? null,
    instandhaltungsruecklage_gesamt:
      parseDeNumber(row.instandhaltungsruecklage_gesamt) ?? null,
  };
  const bulkKeys = new Set<string>(BULK_FIELDS.map((f) => f.key));
  // Nur Felder melden, die per Bulk erfassbar sind — den Rest pflegt man im
  // Detail nach, das soll hier keine Warnflut auslösen.
  return fehlendeFelder(input).filter((m) => bulkKeys.has(m.key));
}

/**
 * Set of normalised Wohnungsnummern that collide — either appearing more than
 * once across `rows`, or already present in `existing` (the project's units).
 * Empty/blank numbers are ignored (those are caught by rowError instead).
 */
export function duplicateWohnungsnummern(
  rows: BulkRow[],
  existing: string[] = [],
): Set<string> {
  const existingSet = new Set(existing.map(normWohnungsnummer).filter(Boolean));
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const r of rows) {
    const key = normWohnungsnummer(r.wohnungsnummer);
    if (key === "") continue;
    if (existingSet.has(key) || seen.has(key)) dupes.add(key);
    seen.add(key);
  }
  return dupes;
}

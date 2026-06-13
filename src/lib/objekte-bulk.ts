// PROJ-16 — Bulk-Erfassung von Einheiten aus einer (Excel-)Kaufpreisliste.
//
// Reine Hilfsfunktionen (keine React/DOM-Abhängigkeit) für:
//  - deutsches Zahlenparsing ("1.234,56" -> 1234.56),
//  - Zerlegen eingefügter Tabellen (Tab-getrennt, Zeilen = \n),
//  - Heuristik für Überschriftszeile + Spalten-Auto-Mapping,
//  - Validierung einer Zeile.
// In EinheitenBulkGrid.tsx verwendet und in objekte-bulk.test.ts getestet.

export const BULK_FIELDS = [
  { key: "wohnungsnummer", label: "Wohnungsnr.", type: "text", required: true },
  { key: "etage", label: "Etage", type: "num", required: false },
  { key: "zimmer", label: "Zimmer", type: "num", required: false },
  { key: "wohnflaeche", label: "Fläche (m²)", type: "num", required: false },
  { key: "miete", label: "Kaltmiete (€)", type: "num", required: false },
  { key: "kaufpreis", label: "Kaufpreis (€)", type: "num", required: false },
  { key: "stellplatz_preis", label: "Stellplatz (€)", type: "num", required: false },
] as const;

export type BulkFieldKey = (typeof BULK_FIELDS)[number]["key"];

export type BulkRow = Record<BulkFieldKey, string>;

/** A per-column mapping target; null = Spalte ignorieren. */
export type ColumnMapping = (BulkFieldKey | null)[];

export function emptyRow(): BulkRow {
  return {
    wohnungsnummer: "",
    etage: "",
    zimmer: "",
    wohnflaeche: "",
    miete: "",
    kaufpreis: "",
    stellplatz_preis: "",
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
  zimmer: ["zimmer", "zi.", "anzahl zimmer", "räume", "zi "],
  wohnflaeche: ["wohnfläche", "wohnflaeche", "fläche", "flaeche", "qm", "m²", "m2", "wfl"],
  miete: ["kaltmiete", "nettomiete", "nettokaltmiete", "miete", "kalt", "ist-miete", "mieteinnahme"],
  kaufpreis: ["kaufpreis", "preis", "vk-preis", "vk", "verkaufspreis", "kp"],
  stellplatz_preis: ["stellplatz", "stellpl", "garage", "tiefgarage", "tg", "parkplatz", "pkw"],
};

// Check the most specific fields first so e.g. "Stellplatzpreis" matches
// stellplatz_preis and not kaufpreis (whose broad "preis" synonym also hits).
const GUESS_ORDER: BulkFieldKey[] = [
  "stellplatz_preis",
  "wohnflaeche",
  "wohnungsnummer",
  "zimmer",
  "etage",
  "miete",
  "kaufpreis",
];

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
      if (field === "wohnungsnummer") {
        row.wohnungsnummer = raw.trim();
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

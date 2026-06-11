/**
 * Modul 4b: Kunden-Dokumente — Konstanten und Helpers.
 * Standard-Unterlagen-Listen je beruf_status (Frontend-Konstante, keine DB-Tabelle).
 */

export type UnterlageDef = { slug: string; label: string };

export const STANDARD_UNTERLAGEN: Record<string, ReadonlyArray<UnterlageDef>> = {
  angestellter: [
    { slug: "personalausweis", label: "Personalausweis (Vor- und Rückseite)" },
    { slug: "gehaltsabrechnungen", label: "Letzte 3 Gehaltsabrechnungen" },
    { slug: "kontoauszuege", label: "Letzte 12 Kontoauszüge oder Selbstauskunft" },
    { slug: "schufa", label: "Schufa-Auskunft (max. 3 Monate alt)" },
    { slug: "steuerbescheid", label: "Steuerbescheid letztes Jahr" },
    { slug: "mietvertrag", label: "Mietvertrag aktuelle Wohnung (falls vorhanden)" },
  ],
  selbststaendiger: [
    { slug: "personalausweis", label: "Personalausweis" },
    { slug: "bwa", label: "BWA letzte 12 Monate" },
    { slug: "euer", label: "EÜR letztes Jahr" },
    { slug: "steuerbescheide", label: "Steuerbescheide letzte 2 Jahre" },
    { slug: "schufa", label: "Schufa" },
    { slug: "steuerberater_bestaetigung", label: "Steuerberater-Bestätigung" },
  ],
  unternehmer: [
    { slug: "personalausweis", label: "Personalausweis" },
    { slug: "gehaltsnachweise", label: "Letzte 2 Gehaltsnachweise oder Geschäftsführerbezüge" },
    { slug: "bilanzen", label: "Bilanzen und GuV letzte 2 Jahre" },
    { slug: "handelsregister", label: "Handelsregister-Auszug" },
    { slug: "schufa", label: "Schufa" },
    { slug: "steuerbescheide", label: "Steuerbescheide Privat und Gesellschaft" },
  ],
};

export const FALLBACK_BERUF: keyof typeof STANDARD_UNTERLAGEN = "angestellter";

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png"] as const;
export const ALLOWED_EXT_HINT = "PDF, JPG oder PNG, max. 20 MB";

export const KDOK_BUCKET = "kunden-dokumente";

export function unterlagenFor(berufStatus: string | null | undefined): ReadonlyArray<UnterlageDef> {
  const key = (berufStatus ?? FALLBACK_BERUF) as keyof typeof STANDARD_UNTERLAGEN;
  return STANDARD_UNTERLAGEN[key] ?? STANDARD_UNTERLAGEN[FALLBACK_BERUF];
}

/** "14,2 MB" — de-DE Komma als Dezimaltrenner. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    return `${kb.toFixed(0).replace(".", ",")} KB`;
  }
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(1).replace(".", ",")} MB`;
}

/** "vor 2 Tagen" — Intl.RelativeTimeFormat (de). */
export function formatRelative(iso: string): string {
  const rtf = new Intl.RelativeTimeFormat("de-DE", { numeric: "auto" });
  const diffMs = new Date(iso).getTime() - Date.now();
  const sec = Math.round(diffMs / 1000);
  const abs = Math.abs(sec);
  if (abs < 60) return rtf.format(sec, "second");
  const min = Math.round(sec / 60);
  if (Math.abs(min) < 60) return rtf.format(min, "minute");
  const hour = Math.round(min / 60);
  if (Math.abs(hour) < 24) return rtf.format(hour, "hour");
  const day = Math.round(hour / 24);
  if (Math.abs(day) < 30) return rtf.format(day, "day");
  const month = Math.round(day / 30);
  if (Math.abs(month) < 12) return rtf.format(month, "month");
  return rtf.format(Math.round(month / 12), "year");
}

/** Dateiname auf [a-zA-Z0-9._-] reduzieren, Länge begrenzen. */
export function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
  if (cleaned.length <= 80) return cleaned;
  const dot = cleaned.lastIndexOf(".");
  if (dot > 0 && dot > cleaned.length - 10) {
    const ext = cleaned.slice(dot);
    return cleaned.slice(0, 80 - ext.length) + ext;
  }
  return cleaned.slice(0, 80);
}

/** Crypto.randomUUID mit Fallback. */
export function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

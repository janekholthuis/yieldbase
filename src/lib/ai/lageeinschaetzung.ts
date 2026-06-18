// KI-Lageeinschätzung (PROJ-22): baut den Prompt aus Objekt-/Einheit-Kontext und
// validiert die Modell-Antwort. Reine Logik (kein server-only) → unit-testbar.
import type { ChatMessage } from "@/lib/ai/openai";

export interface LageContext {
  adresse: string | null;
  plz: string | null;
  stadt: string | null;
  projektName?: string | null;
  baujahr?: number | null;
  wohnflaeche?: number | null;
  zimmer?: number | null;
  etage?: string | number | null;
  objektzustand?: string | null;
  nutzungsart?: string | null;
  /** Optional vorhandene Standort-Notizen/POIs (z. B. aus PROJ-15) als Faktenbasis. */
  vorhandeneHighlights?: string | null;
}

export interface LageResult {
  lageeinschaetzung: string;
  tags: string[];
}

export const MAX_TAGS = 8;
const MAX_TAG_LEN = 40;
const MAX_TEXT_LEN = 1500;

const SYSTEM_PROMPT = [
  "Du bist ein Immobilien-Marketing-Texter für deutsche Kapitalanlage-Immobilien.",
  "Schreibe eine sachliche, professionelle LAGEEINSCHÄTZUNG (3–6 Sätze) für ein Exposé.",
  "Strikte Regeln:",
  "- Nur Deutsch. Seriöser, hochwertiger Ton — keine Übertreibungen, keine Emojis.",
  "- Erfinde KEINE harten Fakten (keine konkreten Distanzen in Metern/Minuten, keine Schul-/Klinik-Namen, keine Bevölkerungszahlen), wenn sie nicht im Kontext stehen.",
  "- Mache KEINE Rendite-, Wertsteigerungs- oder Gewinnversprechen (rechtlich heikel).",
  "- Beziehe dich auf die genannte Stadt/Lage allgemein und plausibel (Infrastruktur, Anbindung, Wohnumfeld) ohne unbelegte Superlative.",
  "Zusätzlich: 3–8 prägnante TAGS (je 1–3 Wörter, deutsch, ohne #) zur Lage/zum Objekt.",
  'Antworte AUSSCHLIESSLICH als JSON: {"lageeinschaetzung": string, "tags": string[]}.',
].join("\n");

function line(label: string, value: unknown): string | null {
  if (value == null || value === "") return null;
  return `${label}: ${value}`;
}

export function buildLageMessages(ctx: LageContext): ChatMessage[] {
  const ortTeile = [ctx.plz, ctx.stadt].filter(Boolean).join(" ");
  const facts = [
    line("Projekt", ctx.projektName),
    line("Adresse", ctx.adresse),
    line("Ort", ortTeile || null),
    line("Baujahr", ctx.baujahr),
    line("Wohnfläche (m²)", ctx.wohnflaeche),
    line("Zimmer", ctx.zimmer),
    line("Etage", ctx.etage),
    line("Zustand", ctx.objektzustand),
    line("Nutzungsart", ctx.nutzungsart),
    line("Vorhandene Standort-Hinweise", ctx.vorhandeneHighlights),
  ]
    .filter(Boolean)
    .join("\n");

  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Erstelle Lageeinschätzung und Tags für folgendes Objekt:\n\n${facts}`,
    },
  ];
}

/** Validiert + normalisiert die Modell-Antwort. Wirft bei unbrauchbarem Ergebnis. */
export function parseLageResult(raw: unknown): LageResult {
  if (!raw || typeof raw !== "object") {
    throw new Error("KI-Antwort hat ein unerwartetes Format.");
  }
  const obj = raw as Record<string, unknown>;

  const text =
    typeof obj.lageeinschaetzung === "string" ? obj.lageeinschaetzung.trim() : "";
  if (!text) throw new Error("KI lieferte keine Lageeinschätzung.");

  const rawTags = Array.isArray(obj.tags) ? obj.tags : [];
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const t of rawTags) {
    if (typeof t !== "string") continue;
    const clean = t.trim().replace(/^#/, "").slice(0, MAX_TAG_LEN);
    const key = clean.toLowerCase();
    if (clean && !seen.has(key)) {
      seen.add(key);
      tags.push(clean);
    }
    if (tags.length >= MAX_TAGS) break;
  }

  return { lageeinschaetzung: text.slice(0, MAX_TEXT_LEN), tags };
}

import "server-only";

// Dünner OpenAI-Chat-Client (dependency-frei via fetch). Liest den Key aus
// OPEN_API_KEY (so vom Nutzer gesetzt) mit Fallback auf den Standardnamen
// OPENAI_API_KEY. Modell via OPENAI_MODEL überschreibbar (Default: gpt-4o-mini —
// günstig + ausreichend für kurze deutsche Fachtexte).

const DEFAULT_MODEL = "gpt-4o-mini";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export function getOpenAiKey(): string | null {
  return process.env.OPEN_API_KEY ?? process.env.OPENAI_API_KEY ?? null;
}

/** Ist ein OpenAI-Key konfiguriert? (für UI-Gating / freundliche Fehler). */
export function isAiConfigured(): boolean {
  return Boolean(getOpenAiKey());
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super(
      "KI ist nicht konfiguriert. Bitte OPEN_API_KEY (OpenAI) in der Umgebung setzen.",
    );
    this.name = "AiNotConfiguredError";
  }
}

/**
 * Ruft die OpenAI Chat-Completions-API auf und erzwingt eine JSON-Antwort
 * (response_format json_object). Gibt das geparste Objekt zurück. Wirft bei
 * fehlendem Key, HTTP-Fehler, Timeout oder ungültigem JSON.
 */
export async function chatJSON<T = unknown>(
  messages: ChatMessage[],
  opts?: { model?: string; temperature?: number; timeoutMs?: number },
): Promise<T> {
  const key = getOpenAiKey();
  if (!key) throw new AiNotConfiguredError();

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts?.timeoutMs ?? 30_000);
  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: opts?.model ?? process.env.OPENAI_MODEL ?? DEFAULT_MODEL,
        temperature: opts?.temperature ?? 0.4,
        response_format: { type: "json_object" },
        messages,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `OpenAI-Anfrage fehlgeschlagen (Status ${res.status}). ${detail.slice(0, 300)}`,
      );
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenAI lieferte keine Antwort.");
    try {
      return JSON.parse(content) as T;
    } catch {
      throw new Error("OpenAI-Antwort war kein gültiges JSON.");
    }
  } finally {
    clearTimeout(timer);
  }
}

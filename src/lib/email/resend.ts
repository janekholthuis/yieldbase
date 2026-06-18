import "server-only";

// Zentrale E-Mail-Schicht via Resend (dependency-frei, fetch). Wird direkt aus
// Server-Actions aufgerufen — der Key liegt in der Next.js-Umgebung
// (RESEND_API_KEY in .env.local / Vercel). Ersetzt die Supabase-Edge-Functions
// (send-invite/portal/reservation), die ein separates Supabase-Secret bräuchten.

const RESEND_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "Objektpilot <onboarding@resend.dev>";

export function getResendKey(): string | null {
  return process.env.RESEND_API_KEY ?? null;
}

/** Ist Resend serverseitig konfiguriert? */
export function isEmailConfigured(): boolean {
  return Boolean(getResendKey());
}

export interface EmailAttachment {
  filename: string;
  /** Base64-kodierter Inhalt. */
  content: string;
}

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  /** Absender; default aus EMAIL_FROM / RESEND_FROM_EMAIL, sonst Resend-Testabsender. */
  from?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

function resolveFrom(explicit?: string): string {
  return (
    explicit ??
    process.env.EMAIL_FROM ??
    process.env.RESEND_FROM_EMAIL ??
    process.env.RESERVATION_FROM_EMAIL ??
    DEFAULT_FROM
  );
}

/**
 * Versendet eine E-Mail über Resend. Wirft NICHT — gibt ein Ergebnis-Objekt
 * zurück (E-Mail ist immer best-effort: der eigentliche Vorgang, z. B. Invite/
 * Reservierung, ist bereits persistiert). Bei fehlendem Key → ok:false.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const key = getResendKey();
  if (!key) return { ok: false, error: "RESEND_API_KEY nicht konfiguriert" };

  const payload: Record<string, unknown> = {
    from: resolveFrom(input.from),
    to: Array.isArray(input.to) ? input.to : [input.to],
    subject: input.subject,
    html: input.html,
  };
  if (input.cc?.length) payload.cc = input.cc;
  if (input.bcc?.length) payload.bcc = input.bcc;
  if (input.replyTo) payload.reply_to = input.replyTo;
  if (input.attachments?.length) payload.attachments = input.attachments;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("[resend] send failed", res.status, text.slice(0, 300));
      return { ok: false, error: `Resend ${res.status}: ${text.slice(0, 200)}` };
    }
    let id: string | undefined;
    try {
      id = (JSON.parse(text) as { id?: string }).id;
    } catch {
      /* ignore */
    }
    return { ok: true, id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[resend] send threw", msg);
    return { ok: false, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

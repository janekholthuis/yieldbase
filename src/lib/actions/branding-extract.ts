"use server";

// PROJ-23 — Branding-Auto-Extraktion: lädt eine Website serverseitig und schlägt
// Logo + Primär-/Akzentfarbe vor. Das Re-Hosting des erkannten Logos in den
// Storage (rehostLogoFromUrl) schreibt in den Branding-Bucket; das Speichern der
// Branding-Felder selbst läuft (nach Bestätigung) über updateOrganisationBranding.
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  normalizeUrl,
  absoluteUrl,
  buildSuggestion,
  type BrandingSuggestion,
} from "@/lib/branding-extract";

const FETCH_TIMEOUT_MS = 7000;
const MAX_BYTES = 2_000_000; // 2 MB Cap auf HTML/CSS
const MAX_LOGO_BYTES = 3_000_000; // 3 MB Cap auf das herunterzuladende Logo-Bild

// Logos werden — wie der manuelle Logo-Upload (EinstellungenView/FileUpload) — in
// den öffentlichen Bucket `objekt-bilder` unter `org-logos/{orgId}/…` abgelegt.
const LOGO_BUCKET = "objekt-bilder";
const LOGO_PATH_PREFIX = "org-logos";

// Erlaubte Bild-Content-Types fürs Re-Hosting → Dateiendung.
const IMAGE_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
  "image/avif": "avif",
};

/** Privater/loopback/link-local/Metadaten-Bereich? (SSRF-Schutz). */
function isPrivateAddress(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const p = ip.split(".").map(Number);
    if (p[0] === 10) return true; // 10.0.0.0/8
    if (p[0] === 127) return true; // loopback
    if (p[0] === 0) return true;
    if (p[0] === 169 && p[1] === 254) return true; // link-local + metadata 169.254.169.254
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true; // 172.16/12
    if (p[0] === 192 && p[1] === 168) return true; // 192.168/16
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true; // CGNAT 100.64/10
    return false;
  }
  if (v === 6) {
    const l = ip.toLowerCase();
    if (l === "::1" || l === "::") return true;
    if (l.startsWith("fe80")) return true; // link-local
    if (l.startsWith("fc") || l.startsWith("fd")) return true; // unique local fc00::/7
    if (l.startsWith("::ffff:")) return isPrivateAddress(ip.split(":").pop() ?? "");
    return false;
  }
  return false;
}

/** Wirft, wenn der Host privat/intern auflöst (SSRF). Gibt die geprüfte URL zurück. */
async function assertPublicUrl(rawUrl: string): Promise<URL> {
  const url = new URL(rawUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Nur http/https-Adressen werden unterstützt.");
  }
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) {
    throw new Error("Interne Adressen sind nicht erlaubt.");
  }
  // Direkte IP-Eingabe prüfen, sonst DNS auflösen.
  const literal = isIP(host);
  const addrs = literal
    ? [host]
    : (await lookup(host, { all: true })).map((a) => a.address);
  if (addrs.length === 0) throw new Error("Adresse nicht auflösbar.");
  for (const a of addrs) {
    if (isPrivateAddress(a)) {
      throw new Error("Die Adresse zeigt auf ein internes Netz und wird blockiert.");
    }
  }
  return url;
}

const MAX_REDIRECTS = 5;

/** Lädt eine URL als Text (Timeout + Größen-Cap + SSRF-Guard). */
async function fetchText(rawUrl: string, accept: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    // Redirects MANUELL verfolgen: jeder Hop wird erneut gegen den SSRF-Guard
    // geprüft. `redirect:"follow"` würde sonst einer 30x-Weiterleitung auf
    // 169.254.169.254 / interne IPs ohne erneute Validierung folgen (TOCTOU).
    let currentUrl = rawUrl;
    let res: Response | null = null;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      await assertPublicUrl(currentUrl);
      const r = await fetch(currentUrl, {
        signal: ctrl.signal,
        redirect: "manual",
        headers: { accept, "user-agent": "ObjektpilotBrandingBot/1.0" },
      });
      if (r.status >= 300 && r.status < 400) {
        const loc = r.headers.get("location");
        if (!loc) throw new Error("Weiterleitung ohne Zieladresse.");
        // Relative Locations gegen die aktuelle URL auflösen.
        currentUrl = new URL(loc, currentUrl).toString();
        continue;
      }
      res = r;
      break;
    }
    if (!res) throw new Error("Zu viele Weiterleitungen.");
    if (!res.ok) throw new Error(`Website antwortete mit Status ${res.status}.`);
    const reader = res.body?.getReader();
    if (!reader) return (await res.text()).slice(0, MAX_BYTES);
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.length;
        chunks.push(value);
        if (total > MAX_BYTES) {
          await reader.cancel();
          break;
        }
      }
    }
    return new TextDecoder("utf-8").decode(concat(chunks));
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Lädt eine URL als Binärdaten (Timeout + Größen-Cap + SSRF-Guard, Redirects
 * manuell + pro Hop re-validiert wie fetchText). Liefert Bytes + Content-Type.
 */
async function fetchBinary(
  rawUrl: string,
  accept: string,
  maxBytes: number,
): Promise<{ bytes: Uint8Array; contentType: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    let currentUrl = rawUrl;
    let res: Response | null = null;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      await assertPublicUrl(currentUrl);
      const r = await fetch(currentUrl, {
        signal: ctrl.signal,
        redirect: "manual",
        headers: { accept, "user-agent": "ObjektpilotBrandingBot/1.0" },
      });
      if (r.status >= 300 && r.status < 400) {
        const loc = r.headers.get("location");
        if (!loc) throw new Error("Weiterleitung ohne Zieladresse.");
        currentUrl = new URL(loc, currentUrl).toString();
        continue;
      }
      res = r;
      break;
    }
    if (!res) throw new Error("Zu viele Weiterleitungen.");
    if (!res.ok) throw new Error(`Bild antwortete mit Status ${res.status}.`);

    const contentType = (res.headers.get("content-type") ?? "")
      .split(";")[0]
      .trim()
      .toLowerCase();

    const reader = res.body?.getReader();
    if (!reader) {
      const buf = new Uint8Array(await res.arrayBuffer());
      if (buf.length > maxBytes) throw new Error("Bild ist zu groß.");
      return { bytes: buf, contentType };
    }
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.length;
        chunks.push(value);
        if (total > maxBytes) {
          await reader.cancel();
          throw new Error("Bild ist zu groß.");
        }
      }
    }
    return { bytes: concat(chunks), contentType };
  } finally {
    clearTimeout(timer);
  }
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const len = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

/** Findet das erste <link rel="stylesheet" href>. */
function firstStylesheetHref(html: string, base: string): string | null {
  const m = html.match(
    /<link[^>]+rel=["']?stylesheet["']?[^>]*href=["']([^"']+)["']/i,
  );
  if (!m) {
    const m2 = html.match(
      /<link[^>]+href=["']([^"']+)["'][^>]*rel=["']?stylesheet["']?/i,
    );
    return m2 ? absoluteUrl(m2[1], base) : null;
  }
  return absoluteUrl(m[1], base);
}

/**
 * Extrahiert einen Branding-Vorschlag (Logo + Farben) aus einer Website-URL.
 * Nur admin/support/vertriebsleiter (Org-Verwalter). Schreibt nichts.
 */
export async function extractBrandingFromUrl(input: {
  url: string;
}): Promise<BrandingSuggestion> {
  await requireRole("admin", "support", "vertriebsleiter");

  const normalized = normalizeUrl(input.url);
  const html = await fetchText(normalized, "text/html,application/xhtml+xml");

  // Best-effort: erstes Stylesheet für bessere Farb-Treffer mitlesen.
  let css = "";
  try {
    const cssHref = firstStylesheetHref(html, normalized);
    if (cssHref) css = await fetchText(cssHref, "text/css");
  } catch {
    /* Stylesheet optional — Fehler ignorieren */
  }

  return buildSuggestion(html, normalized, css);
}

export interface RehostLogoResult {
  /** Endgültige Logo-URL: Bucket-URL bei Erfolg, sonst der ursprüngliche Hotlink. */
  logoUrl: string;
  /** true = im Storage re-gehostet, false = graceful auf den Hotlink zurückgefallen. */
  rehosted: boolean;
}

/**
 * Lädt ein extrahiertes Logo SERVERSEITIG herunter (SSRF-geschützt, Größen-Cap,
 * Content-Type muss image/* sein) und legt es im Branding-Bucket (`objekt-bilder`
 * unter `org-logos/{orgId}/…`) ab — analog zum manuellen Logo-Upload. Gespeichert
 * wird dann die stabile Bucket-URL statt des fremden Hotlinks.
 *
 * Bricht NIE den Flow: schlägt Download/Upload/Validierung fehl, fällt das
 * Ergebnis graceful auf den ursprünglichen Hotlink zurück (rehosted: false).
 *
 * Nur admin/support/vertriebsleiter (Org-Verwalter).
 */
export async function rehostLogoFromUrl(input: {
  orgId: string;
  sourceUrl: string;
}): Promise<RehostLogoResult> {
  await requireRole("admin", "support", "vertriebsleiter");

  const fallback: RehostLogoResult = { logoUrl: input.sourceUrl, rehosted: false };

  // orgId muss eine UUID sein (verhindert Path-Traversal im Object-Key).
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.orgId)) {
    return fallback;
  }

  try {
    const normalized = normalizeUrl(input.sourceUrl);
    const { bytes, contentType } = await fetchBinary(
      normalized,
      "image/*",
      MAX_LOGO_BYTES,
    );

    if (bytes.length === 0) return fallback;
    const ext = IMAGE_EXT[contentType];
    if (!ext) {
      // Kein (erlaubter) Bild-Content-Type → nicht re-hosten, Hotlink behalten.
      return fallback;
    }

    const id = Math.random().toString(36).slice(2, 10);
    const path = `${LOGO_PATH_PREFIX}/${input.orgId}/${id}-extracted.${ext}`;

    // Service-Role-Client: dieser Write läuft serverseitig nach Rollen-Check;
    // der Object-Key ist strikt auf die orgId gescopt.
    const admin = createAdminClient();
    const { error } = await admin.storage.from(LOGO_BUCKET).upload(path, bytes, {
      cacheControl: "3600",
      upsert: false,
      contentType,
    });
    if (error) return fallback;

    const publicUrl = admin.storage.from(LOGO_BUCKET).getPublicUrl(path).data
      .publicUrl;
    if (!publicUrl) return fallback;

    return { logoUrl: publicUrl, rehosted: true };
  } catch {
    // Jeder Fehler (SSRF-Block, Timeout, zu groß, Upload) → Hotlink-Fallback.
    return fallback;
  }
}

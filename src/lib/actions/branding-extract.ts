"use server";

// PROJ-23 — Branding-Auto-Extraktion: lädt eine Website serverseitig und schlägt
// Logo + Primär-/Akzentfarbe vor. KEIN Schreibzugriff — das Speichern läuft (nach
// Bestätigung in der Vorschau) über updateOrganisationBranding (PROJ-13).
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { requireRole } from "@/lib/auth";
import {
  normalizeUrl,
  absoluteUrl,
  buildSuggestion,
  type BrandingSuggestion,
} from "@/lib/branding-extract";

const FETCH_TIMEOUT_MS = 7000;
const MAX_BYTES = 2_000_000; // 2 MB Cap auf HTML/CSS

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

/** Lädt eine URL als Text (Timeout + Größen-Cap + SSRF-Guard). */
async function fetchText(rawUrl: string, accept: string): Promise<string> {
  await assertPublicUrl(rawUrl);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(rawUrl, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { accept, "user-agent": "ObjektpilotBrandingBot/1.0" },
    });
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

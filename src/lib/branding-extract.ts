// PROJ-23 — Branding-Auto-Extraktion (Heuristik, pure + testbar).
// Diese Datei enthält KEINE Netzwerkzugriffe — nur das Parsen/Ranking auf bereits
// geladenem HTML/CSS-Text. Das Laden (fetch), der SSRF-Schutz und das Speichern
// liegen in der Server-Action (src/lib/actions/branding-extract.ts).

import { parse } from "node-html-parser";

export interface BrandingSuggestion {
  /** Absolute URL des besten Logo-Kandidaten (oder null). */
  logoUrl: string | null;
  /** #RRGGBB oder null. */
  primaryColor: string | null;
  /** #RRGGBB oder null. */
  accentColor: string | null;
  detected: { logo: boolean; primary: boolean; accent: boolean };
}

/** Normalisiert eine Nutzereingabe zu einer http(s)-URL (ergänzt https://). */
export function normalizeUrl(input: string): string {
  let s = (input ?? "").trim();
  if (!s) throw new Error("Bitte eine Website-Adresse eingeben.");
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = `https://${s}`;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    throw new Error("Ungültige Website-Adresse.");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("Nur http/https-Adressen werden unterstützt.");
  }
  return u.toString();
}

/** href relativ zu base → absolute URL (oder null). */
export function absoluteUrl(href: string, base: string): string | null {
  try {
    return new URL(href.trim(), base).toString();
  } catch {
    return null;
  }
}

/** "#abc" / "#aabbcc" / "rgb(...)" / "rgba(...)" → "#RRGGBB" (uppercase) oder null. */
export function normalizeHex(input: string): string | null {
  if (!input) return null;
  const s = input.trim().toLowerCase();

  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(s);
  if (short) {
    const [, r, g, b] = short;
    return `#${(r + r + g + g + b + b).toUpperCase()}`;
  }
  const long = /^#([0-9a-f]{6})$/.exec(s);
  if (long) return `#${long[1].toUpperCase()}`;

  const rgb = /^rgba?\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})/.exec(s);
  if (rgb) {
    const parts = [rgb[1], rgb[2], rgb[3]].map((n) => {
      const v = Math.max(0, Math.min(255, parseInt(n, 10)));
      return v.toString(16).padStart(2, "0");
    });
    return `#${parts.join("").toUpperCase()}`;
  }
  return null;
}

/** #RRGGBB → {h: 0..360, s: 0..1, l: 0..1}. */
export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const r = parseInt(m[1].slice(0, 2), 16) / 255;
  const g = parseInt(m[1].slice(2, 4), 16) / 255;
  const b = parseInt(m[1].slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return { h, s, l };
}

/** Markentaugliche Farbe? (nicht fast-weiß/-schwarz, nicht grau). */
function isBrandColor(hex: string): boolean {
  const hsl = hexToHsl(hex);
  if (!hsl) return false;
  if (hsl.l >= 0.94 || hsl.l <= 0.06) return false; // fast weiß/schwarz raus
  if (hsl.s < 0.16) return false; // Graustufen raus
  return true;
}

/** <meta name="theme-color"> → #RRGGBB oder null. */
export function parseThemeColor(html: string): string | null {
  const root = parse(html);
  const metas = root.querySelectorAll(
    'meta[name="theme-color"], meta[name="msapplication-TileColor"]',
  );
  for (const m of metas) {
    const hex = normalizeHex(m.getAttribute("content") ?? "");
    if (hex) return hex;
  }
  return null;
}

/**
 * Logo-Kandidaten in Prioritätsreihenfolge:
 * explizites Logo-<img> › og:image › apple-touch-icon › Favicon/Icon.
 * Liefert absolute, deduplizierte URLs.
 */
export function parseLogoCandidates(html: string, baseUrl: string): string[] {
  const root = parse(html);
  const out: string[] = [];
  const push = (href: string | undefined | null) => {
    if (!href) return;
    const abs = absoluteUrl(href, baseUrl);
    if (abs && !out.includes(abs)) out.push(abs);
  };

  // 1) <img>, dessen src/alt/class/id auf ein Logo hindeutet
  for (const img of root.querySelectorAll("img")) {
    const hay = `${img.getAttribute("alt") ?? ""} ${img.getAttribute("class") ?? ""} ${img.getAttribute("id") ?? ""} ${img.getAttribute("src") ?? ""}`.toLowerCase();
    if (hay.includes("logo")) push(img.getAttribute("src"));
  }
  // 2) og:image
  for (const m of root.querySelectorAll('meta[property="og:image"], meta[name="og:image"]')) {
    push(m.getAttribute("content"));
  }
  // 3) apple-touch-icon
  for (const l of root.querySelectorAll('link[rel~="apple-touch-icon"], link[rel~="apple-touch-icon-precomposed"]')) {
    push(l.getAttribute("href"));
  }
  // 4) Favicon / Icon
  for (const l of root.querySelectorAll('link[rel~="icon"], link[rel="shortcut icon"], link[rel~="mask-icon"]')) {
    push(l.getAttribute("href"));
  }
  return out;
}

/** Alle Farb-Tokens aus HTML/CSS-Text (inkl. <style>, style=, theme-color). */
export function extractCssColors(text: string): string[] {
  const found: string[] = [];
  const re = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgba?\([^)]*\)/g;
  const matches = text.match(re) ?? [];
  for (const raw of matches) {
    const hex = normalizeHex(raw);
    if (hex) found.push(hex);
  }
  return found;
}

/**
 * Wählt Primär-/Akzentfarbe aus theme-color + Farb-Pool.
 * Primär = theme-color (falls vorhanden) sonst häufigste Markenfarbe.
 * Akzent = häufigste Markenfarbe mit anderem Farbton als Primär.
 */
export function pickBrandColors(opts: {
  themeColor?: string | null;
  cssColors?: string[];
}): { primary: string | null; accent: string | null } {
  const freq = new Map<string, number>();
  for (const c of opts.cssColors ?? []) {
    if (!isBrandColor(c)) continue;
    freq.set(c, (freq.get(c) ?? 0) + 1);
  }
  const ranked = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([hex]) => hex);

  const themeBrand =
    opts.themeColor && isBrandColor(opts.themeColor) ? opts.themeColor : null;

  const primary = themeBrand ?? ranked[0] ?? opts.themeColor ?? null;

  let accent: string | null = null;
  if (primary) {
    const pHsl = hexToHsl(primary);
    for (const hex of ranked) {
      if (hex === primary) continue;
      const hsl = hexToHsl(hex);
      // deutlich anderer Farbton (>25°) als Akzent bevorzugen
      if (!pHsl || !hsl || Math.abs(hsl.h - pHsl.h) > 25) {
        accent = hex;
        break;
      }
    }
    if (!accent) accent = ranked.find((h) => h !== primary) ?? null;
  } else {
    accent = ranked[1] ?? null;
  }

  return { primary, accent };
}

/** Baut die Gesamt-Empfehlung aus HTML (+ optional zusätzlichem CSS-Text). */
export function buildSuggestion(
  html: string,
  baseUrl: string,
  extraCss = "",
): BrandingSuggestion {
  const logos = parseLogoCandidates(html, baseUrl);
  const themeColor = parseThemeColor(html);
  const cssColors = extractCssColors(`${html}\n${extraCss}`);
  const { primary, accent } = pickBrandColors({ themeColor, cssColors });

  return {
    logoUrl: logos[0] ?? null,
    primaryColor: primary,
    accentColor: accent,
    detected: {
      logo: logos.length > 0,
      primary: Boolean(primary),
      accent: Boolean(accent),
    },
  };
}

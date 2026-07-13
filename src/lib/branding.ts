// Per-organisation theming: convert an org's hex brand colors into the CSS
// custom-property overrides our design system reads. Pure + framework-agnostic.
//
// The design system stores semantic tokens as OKLCH channels (e.g. `--primary`)
// and the brand primary/accent as RGB channels (`--brand-primary`/`--brand-accent`,
// alpha-enabled). An org overrides both so `bg-primary`, `bg-brand-primary`,
// `ring-ring`, charts, sidebar, etc. all pick up its colors.

import type { ActiveOrg } from "@/lib/data/organisationen";

function parseHex(hex: string): [number, number, number] | null {
  const m = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(m)) return null;
  return [
    parseInt(m.slice(0, 2), 16),
    parseInt(m.slice(2, 4), 16),
    parseInt(m.slice(4, 6), 16),
  ];
}

/** "#0A2E4F" -> "10 46 79" (RGB channels for `rgb(var(--x) / <alpha>)`). */
export function hexToRgbChannels(hex: string): string | null {
  const rgb = parseHex(hex);
  return rgb ? rgb.join(" ") : null;
}

/** Mischt eine RGB-Farbe in Richtung Ziel (0 = original, 1 = Ziel). */
function blend(
  rgb: [number, number, number],
  target: [number, number, number],
  amt: number,
): string {
  return rgb
    .map((c, i) => Math.round(c + (target[i] - c) * amt))
    .join(" ");
}

/** "#0A2E4F" -> "L C H" OKLCH channels (for `oklch(var(--x) / <alpha>)`). */
export function hexToOklchChannels(hex: string): string | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const lin = (c: number) => {
    const cs = c / 255;
    return cs <= 0.04045 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
  };
  const R = lin(rgb[0]);
  const G = lin(rgb[1]);
  const B = lin(rgb[2]);
  const l = 0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B;
  const m = 0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B;
  const s = 0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const C = Math.sqrt(a * a + bb * bb);
  let H = (Math.atan2(bb, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return `${L.toFixed(4)} ${C.toFixed(4)} ${H.toFixed(2)}`;
}

/**
 * Build the `:root` CSS override for an organisation's branding, or "" when the
 * org has no custom colors (falls back to the Erfolg-mit-Immobilien default theme).
 */
export function buildOrgThemeCss(org: Pick<ActiveOrg, "primaryColor" | "accentColor"> | null): string {
  if (!org) return "";
  const decls: string[] = [];

  if (org.primaryColor) {
    const oklch = hexToOklchChannels(org.primaryColor);
    const rgb = hexToRgbChannels(org.primaryColor);
    if (oklch) {
      decls.push(
        `--primary:${oklch}`,
        `--ring:${oklch}`,
        `--sidebar-primary:${oklch}`,
        `--sidebar-ring:${oklch}`,
        `--sidebar-accent-foreground:${oklch}`,
        `--secondary-foreground:${oklch}`,
        `--chart-1:${oklch}`,
        `--info:${oklch}`,
        `--highlight-fg:${oklch}`,
      );
    }
    if (rgb) decls.push(`--brand-primary:${rgb}`);
  }

  if (org.accentColor) {
    const oklch = hexToOklchChannels(org.accentColor);
    const rgb = hexToRgbChannels(org.accentColor);
    if (oklch) decls.push(`--accent:${oklch}`, `--chart-3:${oklch}`);
    if (rgb) decls.push(`--brand-accent:${rgb}`);

    // Weiche Akzent-Töne (Chips/Tints/Hover) aus dem Akzent ableiten, damit
    // keine fest verdrahtete Gold-Farbe durchscheint, wenn die Org z. B. Blau
    // nutzt: soft/tint → Richtung Weiß aufgehellt, hover/text → abgedunkelt.
    const base = parseHex(org.accentColor);
    if (base) {
      const WHITE: [number, number, number] = [255, 255, 255];
      const BLACK: [number, number, number] = [0, 0, 0];
      decls.push(
        `--brand-accent-soft:${blend(base, WHITE, 0.86)}`,
        `--brand-accent-tint:${blend(base, WHITE, 0.92)}`,
        `--brand-accent-hover:${blend(base, BLACK, 0.22)}`,
        `--brand-accent-text:${blend(base, BLACK, 0.4)}`,
      );
    }
  }

  return decls.length ? `:root{${decls.join(";")}}` : "";
}

// Mapbox helpers — geocoding + static map URLs. Ported from the OLD APP.
// Token is read at runtime from NEXT_PUBLIC_MAPBOX_TOKEN so the build never
// fails when it is absent; hasMapbox() guards every network call.
export const MAPBOX_TOKEN =
  (process.env.NEXT_PUBLIC_MAPBOX_TOKEN as string | undefined) ?? "";

export function hasMapbox() {
  return MAPBOX_TOKEN.length > 0;
}

const cache = new Map<string, Promise<[number, number] | null>>();

export async function geocodeAddress(
  query: string,
): Promise<[number, number] | null> {
  if (!hasMapbox() || !query.trim()) return null;
  const key = query.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key)!;

  const p = (async () => {
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        query,
      )}.json?country=de&limit=1&access_token=${MAPBOX_TOKEN}`;
      const r = await fetch(url);
      const j = await r.json();
      const c = j?.features?.[0]?.center;
      if (Array.isArray(c) && c.length === 2)
        return [c[0], c[1]] as [number, number];
      return null;
    } catch {
      return null;
    }
  })();
  cache.set(key, p);
  return p;
}

/**
 * Builds a clean geocoding query from address parts, dropping any part already
 * represented (e.g. `adresse` often already contains PLZ + Stadt, so appending
 * them again produces a malformed, un-geocodable string).
 */
function dedupeQuery(...parts: (string | null | undefined)[]): string {
  let acc = "";
  const out: string[] = [];
  for (const raw of parts) {
    const s = (raw ?? "").trim();
    if (!s) continue;
    const low = s.toLowerCase();
    if (acc.includes(low)) continue; // already represented
    out.push(s);
    acc += " " + low;
  }
  return out.join(", ");
}

/**
 * Robust geocoding from separate address parts. Tries the full (deduped)
 * address, then falls back to PLZ + main city (Ortsteil after a hyphen
 * stripped), then to the PLZ alone — so a slightly-off address still lands on
 * the right town instead of failing outright.
 */
export async function geocodeAddressParts(
  adresse?: string | null,
  plz?: string | null,
  stadt?: string | null,
): Promise<[number, number] | null> {
  if (!hasMapbox()) return null;

  const full = dedupeQuery(adresse, plz, stadt);
  let c = await geocodeAddress(full);
  if (c) return c;

  // Fallback 1: PLZ + main city (strip "-Ortsteil"/"/Ortsteil").
  const cityMain = (stadt ?? "").split(/[-/]/)[0].trim();
  const coarse = dedupeQuery(plz, cityMain || stadt);
  if (coarse && coarse !== full) {
    c = await geocodeAddress(coarse);
    if (c) return c;
  }

  // Fallback 2: PLZ alone (German postal code centroid).
  if (plz?.trim()) {
    c = await geocodeAddress(`${plz.trim()} Deutschland`);
    if (c) return c;
  }
  return null;
}

export type GeocodeSuggestion = {
  place_name: string;
  address: string; // street + housenumber
  plz: string;
  stadt: string;
  bundesland: string | null;
  lng: number;
  lat: number;
};

export async function searchAddresses(
  query: string,
  limit = 5,
): Promise<GeocodeSuggestion[]> {
  if (!hasMapbox() || query.trim().length < 3) return [];
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      query,
    )}.json?country=de&autocomplete=true&types=address&limit=${limit}&language=de&access_token=${MAPBOX_TOKEN}`;
    const r = await fetch(url);
    if (!r.ok) return [];
    const j = await r.json();
    const feats = Array.isArray(j?.features) ? j.features : [];
    return feats
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((f: any): GeocodeSuggestion | null => {
        const center = f?.center;
        if (!Array.isArray(center) || center.length !== 2) return null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ctx: any[] = Array.isArray(f.context) ? f.context : [];
        const findCtx = (prefix: string) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ctx.find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (c: any) => typeof c?.id === "string" && c.id.startsWith(prefix),
          )?.text ?? "";
        const street = f.text ?? "";
        const num = f.address ?? "";
        const address = [street, num].filter(Boolean).join(" ").trim();
        return {
          place_name: f.place_name ?? "",
          address,
          plz: findCtx("postcode"),
          stadt: findCtx("place") || findCtx("locality"),
          bundesland: findCtx("region") || null,
          lng: center[0],
          lat: center[1],
        };
      })
      .filter(Boolean) as GeocodeSuggestion[];
  } catch {
    return [];
  }
}

export function staticMapImageUrl(
  lng: number,
  lat: number,
  opts: { zoom?: number; width?: number; height?: number; retina?: boolean } = {},
): string | null {
  if (!hasMapbox()) return null;
  const { zoom = 14, width = 800, height = 500, retina = true } = opts;
  const marker = `pin-l+06b6d4(${lng},${lat})`;
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${marker}/${lng},${lat},${zoom},0/${width}x${height}${
    retina ? "@2x" : ""
  }?access_token=${MAPBOX_TOKEN}`;
}

export async function fetchStaticMapDataUrl(
  address: string,
): Promise<string | null> {
  try {
    const coords = await geocodeAddress(address);
    if (!coords) return null;
    const url = staticMapImageUrl(coords[0], coords[1]);
    if (!url) return null;
    const r = await fetch(url);
    if (!r.ok) return null;
    const blob = await r.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

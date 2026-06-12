// Mapbox helpers — geocoding + static map URLs. Ported from the OLD APP.
// Token is read at runtime from NEXT_PUBLIC_MAPBOX_TOKEN so the build never
// fails when it is absent; hasMapbox() guards every network call.
export const MAPBOX_TOKEN =
  (process.env.NEXT_PUBLIC_MAPBOX_TOKEN as string | undefined) ?? "";

/**
 * A valid Mapbox token is `pk.<payload>.<signature>` (public) or
 * `sk.<payload>.<signature>` (secret) — three non-empty, dot-separated parts.
 * A bare JWT payload (`eyJ…In0`) or a prefix-only value would make every API
 * call return 401, so we treat anything malformed as "no token" and degrade
 * gracefully instead of spamming the network/console.
 */
export function isValidMapboxToken(token: string): boolean {
  if (!/^(pk|sk)\./.test(token)) return false;
  const parts = token.split(".");
  return parts.length >= 3 && parts.every((p) => p.length > 0);
}

export function hasMapbox() {
  return isValidMapboxToken(MAPBOX_TOKEN);
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
      // Geocoding API v6 — forward search. Coordinates live on
      // features[].geometry.coordinates ([lng, lat]).
      const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(
        query,
      )}&country=de&limit=1&access_token=${MAPBOX_TOKEN}`;
      const r = await fetch(url);
      if (!r.ok) return null;
      const j = await r.json();
      const c = j?.features?.[0]?.geometry?.coordinates;
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
    // Geocoding API v6 — forward search with autocomplete, restricted to
    // addresses. Context is now a keyed object (not an array of id-prefixed
    // entries) on properties.context.{postcode,place,region,…}.
    const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(
      query,
    )}&country=de&autocomplete=true&types=address&limit=${limit}&language=de&access_token=${MAPBOX_TOKEN}`;
    const r = await fetch(url);
    if (!r.ok) return [];
    const j = await r.json();
    const feats = Array.isArray(j?.features) ? j.features : [];
    return feats
       
      .map((f: any): GeocodeSuggestion | null => {
        const center = f?.geometry?.coordinates;
        if (!Array.isArray(center) || center.length !== 2) return null;
         
        const props: any = f.properties ?? {};
         
        const ctx: any = props.context ?? {};
        const address =
          ctx.address?.name ??
          [ctx.address?.street_name, ctx.address?.address_number]
            .filter(Boolean)
            .join(" ")
            .trim();
        return {
          place_name: props.full_address ?? props.name ?? "",
          address: address ?? "",
          plz: ctx.postcode?.name ?? "",
          stadt: ctx.place?.name ?? ctx.locality?.name ?? "",
          bundesland: ctx.region?.name ?? null,
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

// Standort-Highlights (PROJ-15) — fetches the nearest point of interest per
// sales-relevant category around a property and reports the straight-line
// distance. Source: Mapbox Search Box "Category Search" API (per-request
// billing, no session token). Every call is guarded by hasMapbox() and degrades
// to an empty result when no valid token is configured — same philosophy as
// src/lib/mapbox.ts.
//
// Distances are straight-line (Haversine) by product decision — no routing API.
// Category canonical IDs could not be verified against a live token during
// development (local token is a placeholder); each category therefore carries a
// short list of candidate canonical IDs and we keep the truly nearest hit across
// them. Unsupported IDs simply return nothing and are skipped — optimise the
// lists later once a working token is available.
import { MAPBOX_TOKEN, hasMapbox } from "@/lib/mapbox";

export type HighlightCategoryKey =
  | "oepnv"
  | "einkauf"
  | "bildung"
  | "gesundheit"
  | "autobahn";

export interface CategoryDef {
  key: HighlightCategoryKey;
  /** German label shown to users. */
  label: string;
  /** Candidate Mapbox Search Box canonical category IDs (nearest hit wins). */
  canonicalIds: string[];
}

// Ordered by sales relevance — the list renders in this order, not by distance,
// so the layout stays stable across properties.
export const HIGHLIGHT_CATEGORIES: CategoryDef[] = [
  {
    key: "oepnv",
    label: "ÖPNV",
    canonicalIds: ["public_transportation", "bus_stop", "train_station"],
  },
  { key: "einkauf", label: "Einkauf", canonicalIds: ["grocery", "supermarket"] },
  { key: "bildung", label: "Bildung", canonicalIds: ["school", "kindergarten"] },
  {
    key: "gesundheit",
    label: "Gesundheit",
    canonicalIds: ["pharmacy", "doctors_office", "hospital"],
  },
  { key: "autobahn", label: "Autobahn", canonicalIds: ["motorway_junction"] },
];

export interface StandortHighlight {
  category: HighlightCategoryKey;
  label: string;
  /** Name of the nearest POI, e.g. "REWE" or "S Alexanderplatz". */
  name: string;
  /** Straight-line distance from the property, in metres. */
  distanceMeters: number;
  lng: number;
  lat: number;
}

const SEARCH_BOX_BASE =
  "https://api.mapbox.com/search/searchbox/v1/category";

/** Haversine distance in metres between two [lng, lat] points. */
export function haversineMeters(
  a: [number, number],
  b: [number, number],
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** "420 m" (rounded to 10 m) below 1 km, otherwise "1,2 km" (German decimal). */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters / 10) * 10} m`;
  }
  return `${(meters / 1000).toFixed(1).replace(".", ",")} km`;
}

type NearestHit = { name: string; lng: number; lat: number; distance: number };

async function fetchCategoryFeatures(
  canonicalId: string,
  center: [number, number],
): Promise<NearestHit[]> {
  const proximity = `${center[0]},${center[1]}`;
  const url =
    `${SEARCH_BOX_BASE}/${encodeURIComponent(canonicalId)}` +
    `?proximity=${proximity}&limit=5&language=de&country=de` +
    `&access_token=${MAPBOX_TOKEN}`;
  try {
    const r = await fetch(url);
    if (!r.ok) return [];
    const j = await r.json();
    const feats = Array.isArray(j?.features) ? j.features : [];
    return feats
      .map((f: unknown): NearestHit | null => {
        const feat = f as {
          geometry?: { coordinates?: number[] };
          properties?: { name?: string };
        };
        const c = feat.geometry?.coordinates;
        if (!Array.isArray(c) || c.length !== 2) return null;
        const point: [number, number] = [c[0], c[1]];
        return {
          name: feat.properties?.name ?? "",
          lng: point[0],
          lat: point[1],
          distance: haversineMeters(center, point),
        };
      })
      .filter((x: NearestHit | null): x is NearestHit => x !== null);
  } catch {
    return [];
  }
}

// Cache keyed by rounded centre + category so re-renders / tab switches don't
// re-hit the API. Addresses rarely move, so a coarse 4-decimal key (~11 m) is
// plenty and keeps nearby units sharing results.
const cache = new Map<string, Promise<StandortHighlight | null>>();

function nearestForCategory(
  cat: CategoryDef,
  center: [number, number],
): Promise<StandortHighlight | null> {
  const key = `${center[0].toFixed(4)},${center[1].toFixed(4)}|${cat.key}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const p = (async (): Promise<StandortHighlight | null> => {
    const lists = await Promise.all(
      cat.canonicalIds.map((id) => fetchCategoryFeatures(id, center)),
    );
    let best: NearestHit | null = null;
    for (const hit of lists.flat()) {
      if (!hit.name) continue;
      if (!best || hit.distance < best.distance) best = hit;
    }
    if (!best) return null;
    return {
      category: cat.key,
      label: cat.label,
      name: best.name,
      distanceMeters: best.distance,
      lng: best.lng,
      lat: best.lat,
    };
  })();
  cache.set(key, p);
  return p;
}

/**
 * Returns the nearest POI per category around the given [lng, lat] centre,
 * ordered by HIGHLIGHT_CATEGORIES. Categories with no result are omitted.
 * Returns [] when no valid Mapbox token is configured.
 */
export async function fetchStandortHighlights(
  center: [number, number],
): Promise<StandortHighlight[]> {
  if (!hasMapbox()) return [];
  const results = await Promise.all(
    HIGHLIGHT_CATEGORIES.map((cat) => nearestForCategory(cat, center)),
  );
  return results.filter((r): r is StandortHighlight => r !== null);
}

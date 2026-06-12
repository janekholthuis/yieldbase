// Typed client for the Investagon API (API Platform / Hydra).
//
// Auth: every request needs `organization_id` + `api_key` as query params.
// Collections return Hydra envelopes; pagination is followed via
// `hydra:view -> hydra:next` until no next link remains.
//
// Credentials are passed in explicitly by the caller (per-organisation,
// loaded from the `organisationen` table) — never read from env here.
//
// This module is server-only. Do NOT import it into client components.

const BASE_URL = "https://api.investagon.com/api/";

/** Per-organisation Investagon API credentials. */
export interface InvestagonCredentials {
  orgId: string;
  apiKey: string;
}

/** A single Investagon project (ApiProject). Extra fields are preserved. */
export interface InvestagonProject {
  id: string;
  name?: string | null;
  /** Array of property IRIs, e.g. "/api/api_properties/123". */
  properties?: string[];
  updated?: string | null;
  external_id?: string | null;
  prototypeId?: string | null;
  externalSyncId?: string | null;
  propertiesCount?: number | null;
  [key: string]: unknown;
}

/** A single Investagon property (ApiProperty). Extra fields are preserved. */
export interface InvestagonProperty {
  id: string;
  active?: number | null;
  visibility?: number | null;
  object_country?: string | null;
  object_postal_code?: string | null;
  object_city?: string | null;
  object_street?: string | null;
  object_house_number?: string | null;
  object_apartment_number?: string | null;
  /**
   * Parent project reference. The API returns this EITHER as a string IRI
   * ("/api/api_projects/abc") OR as an embedded object
   * ({ "@id": "/api/api_projects/abc", id: "abc" }). Handle both.
   */
  project?: string | { "@id"?: string | null; id?: string | null } | null;
  updated?: string | null;
  commission?: unknown;
  selling_price_commission?: unknown;
  listing_broker?: unknown;
  prototypeId?: string | null;
  statusName?: string | null;
  [key: string]: unknown;
}

/** Minimal shape of a Hydra collection envelope. */
interface HydraCollection<T> {
  "hydra:member"?: T[];
  "hydra:totalItems"?: number;
  "hydra:view"?: {
    "hydra:next"?: string;
  };
}

/**
 * Builds an absolute URL for an Investagon endpoint or path, attaching the
 * auth query params. Accepts either a bare path ("api_projects"), an
 * absolute API path ("/api/api_properties?page=2") returned by Hydra's
 * `hydra:next`, or a full URL.
 */
function buildUrl(
  creds: InvestagonCredentials,
  pathOrUrl: string,
  params: Record<string, string | number | undefined> = {},
): string {
  const { orgId, apiKey } = creds;

  let url: URL;
  if (pathOrUrl.startsWith("http")) {
    url = new URL(pathOrUrl);
  } else if (pathOrUrl.startsWith("/api/")) {
    // hydra:next returns a root-relative path like "/api/...".
    url = new URL(pathOrUrl.replace(/^\/api\//, ""), BASE_URL);
  } else if (pathOrUrl.startsWith("/")) {
    url = new URL(pathOrUrl.replace(/^\//, ""), BASE_URL);
  } else {
    url = new URL(pathOrUrl, BASE_URL);
  }

  url.searchParams.set("organization_id", orgId);
  url.searchParams.set("api_key", apiKey);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function fetchJson<T>(urlString: string): Promise<T> {
  const res = await fetch(urlString, {
    method: "GET",
    headers: { Accept: "application/ld+json, application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Investagon request failed (${res.status} ${res.statusText}): ${body.slice(0, 500)}`,
    );
  }
  return (await res.json()) as T;
}

/**
 * Generic Hydra collection fetcher: yields each page's members, following
 * `hydra:next` until exhausted. Guards against runaway pagination loops.
 */
async function* paginate<T>(
  creds: InvestagonCredentials,
  firstPath: string,
  params: Record<string, string | number | undefined>,
): AsyncGenerator<T, void, unknown> {
  let next: string | undefined = buildUrl(creds, firstPath, params);
  const seen = new Set<string>();

  while (next) {
    if (seen.has(next)) break; // defensive: avoid infinite loops
    seen.add(next);

    const page: HydraCollection<T> = await fetchJson<HydraCollection<T>>(next);
    const members = page["hydra:member"] ?? [];
    for (const member of members) {
      yield member;
    }

    const nextLink = page["hydra:view"]?.["hydra:next"];
    // Re-sign the next link with auth params (Hydra omits them).
    next = nextLink ? buildUrl(creds, nextLink) : undefined;
  }
}

/** Format a Date as the `Y-m-d H:i:s` string Investagon expects. */
export function formatUpdatedAfter(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
  );
}

/**
 * Fetch all projects, following Hydra pagination.
 * @param creds per-organisation Investagon API credentials.
 * @param updatedAfter optional `Y-m-d H:i:s` cutoff for incremental sync.
 */
export async function fetchAllProjects(
  creds: InvestagonCredentials,
  updatedAfter?: string,
): Promise<InvestagonProject[]> {
  const out: InvestagonProject[] = [];
  for await (const project of paginate<InvestagonProject>(creds, "api_projects", {
    updated_after: updatedAfter,
  })) {
    out.push(project);
  }
  return out;
}

/**
 * Fetch all properties, following Hydra pagination.
 * @param creds per-organisation Investagon API credentials.
 * @param updatedAfter optional `Y-m-d H:i:s` cutoff for incremental sync.
 * @param project optional project filter (id or IRI).
 */
export async function fetchAllProperties(
  creds: InvestagonCredentials,
  updatedAfter?: string,
  project?: string,
): Promise<InvestagonProperty[]> {
  const out: InvestagonProperty[] = [];
  for await (const property of paginate<InvestagonProperty>(creds, "api_properties", {
    updated_after: updatedAfter,
    project,
  })) {
    out.push(property);
  }
  return out;
}

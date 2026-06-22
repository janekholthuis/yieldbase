import "server-only";

// Thin client for the Vercel Domains API — lets an org connect its own domain
// self-service (PROJ-30). Reads VERCEL_API_TOKEN / VERCEL_PROJECT_ID /
// VERCEL_TEAM_ID (set in Vercel env). Throws a friendly error if unconfigured.

const API = "https://api.vercel.com";

function cfg() {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;
  if (!token || !projectId) {
    throw new Error(
      "Vercel-API nicht konfiguriert (VERCEL_API_TOKEN / VERCEL_PROJECT_ID fehlen).",
    );
  }
  return { token, projectId, teamId };
}

export function isVercelConfigured(): boolean {
  return !!process.env.VERCEL_API_TOKEN && !!process.env.VERCEL_PROJECT_ID;
}

async function vfetch(path: string, init?: RequestInit): Promise<any> {
  const { token, teamId } = cfg();
  const sep = path.includes("?") ? "&" : "?";
  const url = `${API}${path}${teamId ? `${sep}teamId=${teamId}` : ""}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error?.message ?? `Vercel API ${res.status}`);
  }
  return body;
}

export interface VercelDomainStatus {
  name: string;
  verified: boolean;
  /** TXT/CNAME challenges Vercel needs to verify ownership (if any). */
  verification: Array<{ type: string; domain: string; value: string; reason?: string }>;
}

export interface DnsRecord {
  type: "A" | "CNAME";
  name: string;
  value: string;
}

function normalize(d: any): VercelDomainStatus {
  return {
    name: d?.name,
    verified: !!d?.verified,
    verification: Array.isArray(d?.verification) ? d.verification : [],
  };
}

/** Add a domain to the Vercel project. */
export async function addDomain(name: string): Promise<VercelDomainStatus> {
  const { projectId } = cfg();
  const d = await vfetch(`/v10/projects/${projectId}/domains`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return normalize(d);
}

/** Read a project domain's verification status, or null if not added yet. */
export async function getDomain(name: string): Promise<VercelDomainStatus | null> {
  const { projectId } = cfg();
  try {
    return normalize(await vfetch(`/v9/projects/${projectId}/domains/${name}`));
  } catch {
    return null;
  }
}

/** Ask Vercel to re-check verification (after DNS was set). */
export async function verifyDomain(name: string): Promise<VercelDomainStatus> {
  const { projectId } = cfg();
  return normalize(
    await vfetch(`/v9/projects/${projectId}/domains/${name}/verify`, { method: "POST" }),
  );
}

/** Remove a domain from the Vercel project (best-effort). */
export async function removeDomain(name: string): Promise<void> {
  const { projectId } = cfg();
  try {
    await vfetch(`/v9/projects/${projectId}/domains/${name}`, { method: "DELETE" });
  } catch {
    /* already gone — ignore */
  }
}

/**
 * The DNS record the org owner must set at their registrar. Apex domains
 * (example.com) point via an A record to Vercel's anycast IP; subdomains
 * (portal.example.com) via CNAME.
 */
export function recommendedDnsRecords(domain: string): DnsRecord[] {
  const labels = domain.split(".");
  const isApex = labels.length <= 2;
  if (isApex) {
    return [{ type: "A", name: "@", value: "76.76.21.21" }];
  }
  const sub = labels.slice(0, labels.length - 2).join(".");
  return [{ type: "CNAME", name: sub, value: "cname.vercel-dns.com" }];
}

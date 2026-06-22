"use server";

// PROJ-30 — Org-Custom-Domains: connect/verify/disconnect a domain for an org.
// Gated to org owner/admin. Adds the domain to the Vercel project (self-service)
// and persists the mapping on organisationen.domain. Host→Org resolution lives in
// the data layer (resolveOrgForHost) and runs in the root layout.
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import * as vercel from "@/lib/vercel/domains";
import type { DnsRecord } from "@/lib/vercel/domains";

export interface DomainStatus {
  domain: string | null;
  verified: boolean;
  records: DnsRecord[];
  /** Vercel ownership challenges, if the domain is in use elsewhere. */
  verification: Array<{ type: string; domain: string; value: string; reason?: string }>;
  configured: boolean; // whether the Vercel API is wired up
}

// Domain: a-z0-9, dots & hyphens, at least one dot, no protocol/path.
const domainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.[a-z0-9-]{1,63})+$/,
    "Bitte eine gültige Domain eingeben (z. B. meine-firma.de)",
  );

const orgIdSchema = z.string().uuid();

/** Throw unless the caller is owner/admin of the org. Uses the RLS client. */
async function assertOrgAdmin(orgId: string) {
  const { supabase, userId } = await requireUser();
  const { data: mem } = await supabase
    .from("organisation_members")
    .select("rolle")
    .eq("organisation_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!mem || (mem.rolle !== "owner" && mem.rolle !== "admin")) {
    throw new Error("Nur Org-Inhaber/Admins dürfen Domains verwalten.");
  }
}

const empty = (): DomainStatus => ({
  domain: null,
  verified: false,
  records: [],
  verification: [],
  configured: vercel.isVercelConfigured(),
});

/** Connect a domain to an org: add it to Vercel, persist the mapping. */
export async function connectOrgDomain(input: {
  orgId: string;
  domain: string;
}): Promise<DomainStatus> {
  const orgId = orgIdSchema.parse(input.orgId);
  const domain = domainSchema.parse(input.domain);
  await assertOrgAdmin(orgId);

  // Add to the Vercel project (idempotent — already-added returns its status).
  const v = await vercel.addDomain(domain);

  // Persist (unique index → friendly error if another org already owns it).
  const admin = createAdminClient();
  const { error } = await admin
    .from("organisationen")
    .update({ domain, domain_verified: v.verified })
    .eq("id", orgId);
  if (error) {
    if (error.code === "23505") {
      throw new Error("Diese Domain ist bereits mit einer anderen Organisation verbunden.");
    }
    throw new Error(error.message);
  }

  revalidatePath("/", "layout");
  return {
    domain,
    verified: v.verified,
    verification: v.verification,
    records: vercel.recommendedDnsRecords(domain),
    configured: true,
  };
}

/** Read the org's domain + live Vercel verification status. */
export async function getOrgDomainStatus(input: { orgId: string }): Promise<DomainStatus> {
  const orgId = orgIdSchema.parse(input.orgId);
  await assertOrgAdmin(orgId);

  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organisationen")
    .select("domain, domain_verified")
    .eq("id", orgId)
    .maybeSingle();

  if (!org?.domain) return empty();

  let verified = org.domain_verified;
  let verification: DomainStatus["verification"] = [];
  if (vercel.isVercelConfigured()) {
    const v = await vercel.getDomain(org.domain);
    if (v) {
      verified = v.verified;
      verification = v.verification;
      if (verified !== org.domain_verified) {
        await admin.from("organisationen").update({ domain_verified: verified }).eq("id", orgId);
        revalidatePath("/", "layout");
      }
    }
  }

  return {
    domain: org.domain,
    verified,
    verification,
    records: vercel.recommendedDnsRecords(org.domain),
    configured: vercel.isVercelConfigured(),
  };
}

/** Re-check verification with Vercel (after DNS was set). */
export async function verifyOrgDomain(input: { orgId: string }): Promise<DomainStatus> {
  const orgId = orgIdSchema.parse(input.orgId);
  await assertOrgAdmin(orgId);

  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organisationen")
    .select("domain")
    .eq("id", orgId)
    .maybeSingle();
  if (!org?.domain) return empty();

  const v = await vercel.verifyDomain(org.domain);
  await admin.from("organisationen").update({ domain_verified: v.verified }).eq("id", orgId);
  revalidatePath("/", "layout");
  return {
    domain: org.domain,
    verified: v.verified,
    verification: v.verification,
    records: vercel.recommendedDnsRecords(org.domain),
    configured: true,
  };
}

/** Disconnect the org's domain (remove from Vercel + clear mapping). */
export async function disconnectOrgDomain(input: { orgId: string }): Promise<DomainStatus> {
  const orgId = orgIdSchema.parse(input.orgId);
  await assertOrgAdmin(orgId);

  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organisationen")
    .select("domain")
    .eq("id", orgId)
    .maybeSingle();

  if (org?.domain && vercel.isVercelConfigured()) {
    await vercel.removeDomain(org.domain);
  }
  await admin
    .from("organisationen")
    .update({ domain: null, domain_verified: false })
    .eq("id", orgId);

  revalidatePath("/", "layout");
  return empty();
}

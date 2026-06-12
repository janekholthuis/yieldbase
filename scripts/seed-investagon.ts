// Standalone Investagon sync / seed runner.
//
//   npx tsx scripts/seed-investagon.ts [org-slug]
//
// Runs the same core sync as the `syncInvestagon` server action, but without
// the request/role layer, so it can populate the DB directly (e.g. seeding test
// data). Reads NEXT_PUBLIC_SUPABASE_URL from .env.local.
//
// The Investagon credentials are loaded from the target organisation row in
// `organisationen` (matched by slug, default `erfolg-mit-immobilien`) — no
// Investagon env vars are needed.
//
// Service-role key resolution order:
//   1. SUPABASE_SERVICE_ROLE_KEY from env (if set)
//   2. fetched from the Supabase Management API using the personal access token
//      in .mcp.json (handy locally — the value never needs to live in .env.local)

import fs from "node:fs";
import { createAdminClient } from "../src/lib/supabase/admin";
import { runInvestagonSync } from "../src/lib/investagon/sync-core";

function loadEnvFile(path: string) {
  let raw: string;
  try {
    raw = fs.readFileSync(path, "utf8");
  } catch {
    return;
  }
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

/** Resolve a valid service-role key via the Management API + .mcp.json token. */
async function fetchServiceRoleFromMcp(): Promise<string | null> {
  try {
    const mcp = JSON.parse(fs.readFileSync(".mcp.json", "utf8"));
    const sb = mcp?.mcpServers?.supabase;
    const token: string | undefined = sb?.env?.SUPABASE_ACCESS_TOKEN;
    const refArg: string | undefined = (sb?.args ?? []).find((a: string) =>
      a.startsWith("--project-ref="),
    );
    const ref = refArg?.split("=")[1];
    if (!token || !ref) return null;
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${ref}/api-keys?reveal=true`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return null;
    const keys: Array<{ name?: string; api_key?: string }> = await res.json();
    return keys.find((k) => k.name === "service_role")?.api_key ?? null;
  } catch {
    return null;
  }
}

async function main() {
  loadEnvFile(".env.local");

  // Prefer a freshly-resolved service-role key (the ambient/.env one is often
  // stale or absent); fall back to whatever is in the environment.
  const resolved = await fetchServiceRoleFromMcp();
  if (resolved) {
    process.env.SUPABASE_SERVICE_ROLE_KEY = resolved;
    console.log("[env] service-role key resolved via Management API");
  }

  for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
    if (!process.env[k]) {
      console.error(`Missing required env var: ${k}`);
      process.exit(1);
    }
  }

  const admin = createAdminClient();

  // Resolve the target organisation (by slug) and its Investagon credentials.
  const slug = process.argv[2] ?? "erfolg-mit-immobilien";
  const { data: org, error: orgErr } = await admin
    .from("organisationen")
    .select("id, investagon_org_id, investagon_api_key")
    .eq("slug", slug)
    .maybeSingle();
  if (orgErr) {
    console.error(`Failed to load organisation "${slug}": ${orgErr.message}`);
    process.exit(1);
  }
  if (!org) {
    console.error(`Organisation with slug "${slug}" not found.`);
    process.exit(1);
  }
  if (!org.investagon_org_id || !org.investagon_api_key) {
    console.error(
      `Organisation "${slug}" has no Investagon credentials (investagon_org_id / investagon_api_key).`,
    );
    process.exit(1);
  }

  const started = Date.now();
  const result = await runInvestagonSync(admin, {
    organisationId: org.id,
    credentials: {
      orgId: org.investagon_org_id,
      apiKey: org.investagon_api_key,
    },
    log: (m) => console.log("[sync]", m),
    concurrency: 8,
  });
  console.log(
    `\n✅ DONE in ${((Date.now() - started) / 1000).toFixed(1)}s →`,
    `${result.projects} projects, ${result.properties} units`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\n❌ Sync failed:", e instanceof Error ? e.message : e);
    process.exit(1);
  });

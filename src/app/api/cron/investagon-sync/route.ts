// Scheduled INCREMENTAL Investagon sync (Vercel Cron).
//
// Protected by CRON_SECRET — Vercel Cron sends `Authorization: Bearer <secret>`.
// Runs an incremental sync (changes since the last successful run, with a 1h
// overlap) for every organisation that has Investagon credentials. The initial
// full backfill is NOT done here (it's long) — use scripts/seed-investagon.ts.
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runInvestagonSync } from "@/lib/investagon/sync-core";
import { formatUpdatedAfter } from "@/lib/investagon/client";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  // Never run the sync against a non-production (preview/branch) DB — Vercel only
  // fires crons on Production deployments, but this guards manual/preview hits too
  // so a Supabase branch DB is never mutated by the sync.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    return NextResponse.json({ skipped: "non-production environment" });
  }

  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: orgs } = await admin
    .from("organisationen")
    .select("id, investagon_org_id, investagon_api_key")
    .not("investagon_api_key", "is", null);

  const results: Array<Record<string, unknown>> = [];

  for (const org of orgs ?? []) {
    if (!org.investagon_org_id || !org.investagon_api_key) continue;

    // Incremental cutoff from the last successful sync (1h overlap).
    const { data: lastOk } = await admin
      .from("investagon_sync_log")
      .select("finished_at")
      .eq("status", "success")
      .not("finished_at", "is", null)
      .order("finished_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastOk?.finished_at) {
      // No prior full backfill — skip to avoid a multi-minute full run in cron.
      results.push({ org: org.id, skipped: "no prior successful sync" });
      continue;
    }
    const cutoff = new Date(lastOk.finished_at);
    cutoff.setHours(cutoff.getHours() - 1);

    try {
      const r = await runInvestagonSync(admin, {
        organisationId: org.id,
        credentials: {
          orgId: org.investagon_org_id,
          apiKey: org.investagon_api_key,
        },
        updatedAfter: formatUpdatedAfter(cutoff),
        concurrency: 6,
      });
      results.push({ org: org.id, ...r });
    } catch (e) {
      results.push({
        org: org.id,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), results });
}

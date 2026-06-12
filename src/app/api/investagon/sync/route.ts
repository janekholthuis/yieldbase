// Admin-triggered Investagon sync (full or incremental) for the active org.
// Session-authed (admin/support). Runs in a route handler with an extended
// maxDuration so the initial full backfill (a few minutes) doesn't hit the
// short server-action limit. The settings UI calls this for "Erstsynchronisierung".
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { runInvestagonSync } from "@/lib/investagon/sync-core";
import { formatUpdatedAfter } from "@/lib/investagon/client";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  let session: Awaited<ReturnType<typeof requireRole>>;
  try {
    session = await requireRole("admin", "support");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const full = body?.full === true;

  const { data: profile } = await session.supabase
    .from("profiles")
    .select("active_organisation_id")
    .eq("id", session.userId)
    .maybeSingle();
  const organisationId = profile?.active_organisation_id;
  if (!organisationId) {
    return NextResponse.json({ error: "Keine Organisation ausgewählt." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organisationen")
    .select("id, investagon_org_id, investagon_api_key")
    .eq("id", organisationId)
    .maybeSingle();
  if (!org?.investagon_org_id || !org?.investagon_api_key) {
    return NextResponse.json(
      { error: "Diese Organisation hat keine Investagon-Zugangsdaten." },
      { status: 400 },
    );
  }

  // Incremental: cutoff from last successful sync (1h overlap). Full: no cutoff.
  let updatedAfter: string | undefined;
  if (!full) {
    const { data: lastOk } = await admin
      .from("investagon_sync_log")
      .select("finished_at")
      .eq("status", "success")
      .not("finished_at", "is", null)
      .order("finished_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastOk?.finished_at) {
      const c = new Date(lastOk.finished_at);
      c.setHours(c.getHours() - 1);
      updatedAfter = formatUpdatedAfter(c);
    }
  }

  try {
    const r = await runInvestagonSync(admin, {
      organisationId: org.id,
      credentials: {
        orgId: org.investagon_org_id,
        apiKey: org.investagon_api_key,
      },
      updatedAfter,
      concurrency: 8,
    });
    return NextResponse.json({ ok: true, full, ...r });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sync fehlgeschlagen" },
      { status: 500 },
    );
  }
}

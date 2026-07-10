// Scheduled reminder for stalled Selbstauskunft (Vercel Cron).
//
// Nudges customers who STARTED their financial self-disclosure but stalled:
// status still 'entwurf', last touched > 3 days ago, some progress but not yet
// submittable. Sends (a) an in-app portal notification and (b) a warm du-tone
// email with the no-login token resume link.
//
// Protected by CRON_SECRET (Vercel Cron sends `Authorization: Bearer <secret>`)
// and skipped on non-production environments so a Supabase branch DB is never
// touched. Mirrors src/app/api/cron/investagon-sync/route.ts.
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications-server";
import { sendEmail } from "@/lib/email/resend";
import { selbstauskunftReminderEmail } from "@/lib/email/templates";
import {
  emptySelbstauskunft,
  selbstauskunftProgress,
  type SelbstauskunftData,
} from "@/lib/selbstauskunft";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const STALL_DAYS = 3;

function resolveSiteUrl(request: Request): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  const fwd = request.headers.get("x-forwarded-host");
  if (fwd) return `https://${fwd}`;
  try {
    return new URL(request.url).origin;
  } catch {
    return "http://localhost:3000";
  }
}

export async function GET(request: Request) {
  // Never run against a non-production (preview/branch) DB.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    return NextResponse.json({ skipped: "non-production environment" });
  }

  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const siteUrl = resolveSiteUrl(request);

  const stallCutoff = new Date(
    Date.now() - STALL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dedupeCutoff = stallCutoff; // reminded within the last 3 days → skip
  // For token-only customers (no portal account) we can't dedupe via the
  // notifications table, so we only remind inside a single ~24h window right
  // after the draft crosses the stall threshold — never daily spam.
  const windowCutoff = new Date(
    Date.now() - (STALL_DAYS + 1) * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: rows, error } = await admin
    .from("selbstauskuenfte")
    .select(
      "id, kunde_id, daten, updated_at, kunden:kunde_id(id, email, vorname, selbstauskunft_token, user_id)",
    )
    .eq("status", "entwurf")
    .lt("updated_at", stallCutoff)
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let checked = 0;
  let reminded = 0;

  for (const row of rows ?? []) {
    checked++;
    // supabase types a FK-embed as array-or-object depending on cardinality;
    // normalise to a single kunde.
    const kunde = Array.isArray(row.kunden) ? row.kunden[0] : row.kunden;
    if (!kunde) continue;

    try {
      const data: SelbstauskunftData = {
        ...emptySelbstauskunft(),
        ...((row.daten ?? {}) as Partial<SelbstauskunftData>),
      };
      const progress = selbstauskunftProgress(data);

      // Nothing to nudge: never really started, or already ready to submit.
      if (progress.percent === 0 || progress.submittable) continue;

      // Dedupe without a schema change.
      if (kunde.user_id) {
        // Portal customer: skip if they already got a reminder in the last 3 days.
        const { count } = await admin
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", kunde.user_id)
          .eq("typ", "selbstauskunft_reminder")
          .gt("created_at", dedupeCutoff);
        if ((count ?? 0) > 0) continue;
      } else {
        // Token-only customer (no account → no notification to dedupe against):
        // remind exactly once, only while the draft sits in the 3–4 day window.
        if (!row.updated_at || row.updated_at <= windowCutoff) continue;
      }

      let didRemind = false;

      // (a) In-app notification — only if the customer has a portal account.
      if (kunde.user_id) {
        const res = await createNotification(
          {
            userId: kunde.user_id,
            typ: "selbstauskunft_reminder",
            titel: "Dein Finanz-Check wartet",
            body: `Du hast schon ${progress.percent} % geschafft — mit ein paar Minuten bist du fertig.`,
            link: "/portal/selbstauskunft",
          },
          admin,
        );
        if (res.ok) didRemind = true;
      }

      // (b) Email via the no-login token link (best for conversion).
      if (kunde.email && kunde.selbstauskunft_token) {
        const resumeUrl = `${siteUrl}/selbstauskunft/${kunde.selbstauskunft_token}`;
        const mail = selbstauskunftReminderEmail({
          vorname: kunde.vorname,
          percent: progress.percent,
          resumeUrl,
        });
        const sent = await sendEmail({
          to: kunde.email,
          subject: mail.subject,
          html: mail.html,
        });
        if (sent.ok) didRemind = true;
      }

      if (didRemind) reminded++;
    } catch (e) {
      // Best-effort per kunde — one failure must not abort the batch.
      console.error(
        "[selbstauskunft-reminder] failed for kunde",
        row.kunde_id,
        e instanceof Error ? e.message : String(e),
      );
    }
  }

  return NextResponse.json({ checked, reminded });
}

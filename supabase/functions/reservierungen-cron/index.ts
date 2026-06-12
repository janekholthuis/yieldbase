// Tägliche Wartung der Reservierungen:
// - Setzt abgelaufene Reservierungen ('reserviert' AND expires_at < now()) auf 'abgelaufen'
//   (Trigger sync_einheit_status_from_reservierung gibt die Einheit frei)
// - Verschickt 7-Tage- und 3-Tage-Reminder an VP + Admins
// - Erzeugt In-App Notifications für VP, Admin und Kunde bei Ablauf
// - Best-effort Email via Resend (RESEND_API_KEY)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM = Deno.env.get("RESERVATION_FROM_EMAIL") ?? "EMI <onboarding@resend.dev>";

interface ReservierungRow {
  id: string;
  status: string;
  expires_at: string;
  vp_id: string;
  kunde_id: string;
  einheit_id: string;
  reminder_7d_sent_at: string | null;
  reminder_3d_sent_at: string | null;
  expired_notified_at: string | null;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

async function sb(path: string, init: RequestInit = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });
  if (!r.ok) throw new Error(`Supabase ${path}: ${r.status} ${await r.text()}`);
  return r.json();
}

async function sbPatch(path: string, body: unknown) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "PATCH",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Supabase PATCH ${path}: ${r.status} ${await r.text()}`);
}

async function sbInsert(table: string, rows: unknown[]) {
  if (!rows.length) return;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!r.ok) throw new Error(`Insert ${table}: ${r.status} ${await r.text()}`);
}

async function sendEmail(to: string[], subject: string, html: string, cc: string[] = []) {
  if (!RESEND_API_KEY || !to.length) return;
  const payload: Record<string, unknown> = { from: FROM, to, subject, html };
  if (cc.length) payload.cc = cc;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!r.ok) console.warn("Resend error", r.status, await r.text());
  } catch (e) {
    console.warn("Resend exception", e);
  }
}

async function getAdminUserIds(): Promise<string[]> {
  const rows = (await sb("user_roles?select=user_id&role=eq.admin")) as Array<{ user_id: string }>;
  return [...new Set(rows.map((r) => r.user_id))];
}

interface CtxRow {
  id: string;
  expires_at: string;
  vp_id: string;
  kunde_id: string;
  einheit_id: string;
  einheiten: {
    wohnungsnummer: string;
    projekte: { name: string | null; stadt: string | null; adresse: string | null } | null;
  } | null;
  kunden: { vorname: string | null; nachname: string | null; email: string | null; user_id: string | null } | null;
  vp: { email: string | null; vorname: string | null; nachname: string | null; name: string | null } | null;
}

async function loadCtx(ids: string[]): Promise<Map<string, CtxRow>> {
  if (!ids.length) return new Map();
  const sel =
    "id,expires_at,vp_id,kunde_id,einheit_id," +
    "einheiten:einheit_id(wohnungsnummer,projekte:projekt_id(name,stadt,adresse))," +
    "kunden:kunde_id(vorname,nachname,email,user_id)," +
    "vp:profiles!reservierungen_vp_id_fkey(email,vorname,nachname,name)";
  // FK-Embed-Name evtl. nicht vorhanden; fallback auf separate Query
  let rows: CtxRow[];
  try {
    rows = (await sb(
      `reservierungen?select=${encodeURIComponent(sel)}&id=in.(${ids.join(",")})`,
    )) as CtxRow[];
  } catch {
    const base = (await sb(
      `reservierungen?select=${encodeURIComponent(
        "id,expires_at,vp_id,kunde_id,einheit_id," +
          "einheiten:einheit_id(wohnungsnummer,projekte:projekt_id(name,stadt,adresse))," +
          "kunden:kunde_id(vorname,nachname,email,user_id)",
      )}&id=in.(${ids.join(",")})`,
    )) as CtxRow[];
    const vpIds = [...new Set(base.map((b) => b.vp_id))];
    const profs = (await sb(
      `profiles?select=id,email,vorname,nachname,name&id=in.(${vpIds.join(",")})`,
    )) as Array<{ id: string; email: string | null; vorname: string | null; nachname: string | null; name: string | null }>;
    const pmap = new Map(profs.map((p) => [p.id, p]));
    rows = base.map((b) => ({ ...b, vp: pmap.get(b.vp_id) ?? null }));
  }
  return new Map(rows.map((r) => [r.id, r]));
}

function describe(ctx: CtxRow) {
  const kunde =
    `${ctx.kunden?.vorname ?? ""} ${ctx.kunden?.nachname ?? ""}`.trim() || "Kunde";
  const einheit = ctx.einheiten?.wohnungsnummer ?? "—";
  const projekt = ctx.einheiten?.projekte?.name ?? "Objekt";
  const stadt = ctx.einheiten?.projekte?.stadt ?? "";
  return { kunde, einheit, projekt, stadt };
}

function reminderHtml(d: ReturnType<typeof describe>, daysLeft: number, frist: string) {
  return `<!doctype html><html><body style="font-family:sans-serif;color:#0F172A">
  <h2 style="margin:0 0 12px">Reservierung läuft in ${daysLeft} Tagen ab</h2>
  <p>Die Reservierung von <strong>${d.kunde}</strong> für
  <strong>${d.projekt}${d.stadt ? `, ${d.stadt}` : ""} · Whg. ${d.einheit}</strong>
  läuft am <strong>${frist}</strong> ab.</p>
  <p>Bitte verlängern oder Status klären.</p>
  </body></html>`;
}

function expiredHtml(d: ReturnType<typeof describe>) {
  return `<!doctype html><html><body style="font-family:sans-serif;color:#0F172A">
  <h2 style="margin:0 0 12px">Reservierung automatisch storniert</h2>
  <p>Die Reservierung von <strong>${d.kunde}</strong> für
  <strong>${d.projekt}${d.stadt ? `, ${d.stadt}` : ""} · Whg. ${d.einheit}</strong>
  ist abgelaufen und wurde automatisch storniert. Die Einheit ist wieder verfügbar.</p>
  </body></html>`;
}

async function processExpired(adminIds: string[]) {
  const nowIso = new Date().toISOString();
  const list = (await sb(
    `reservierungen?select=id,vp_id,kunde_id,einheit_id,expires_at&status=eq.reserviert&expires_at=lt.${nowIso}`,
  )) as ReservierungRow[];
  if (!list.length) return { count: 0 };

  const ids = list.map((r) => r.id);
  // Status setzen → Trigger gibt Einheit frei
  await sbPatch(`reservierungen?id=in.(${ids.join(",")})`, {
    status: "abgelaufen",
    expired_notified_at: nowIso,
  });

  const ctxMap = await loadCtx(ids);
  const notifs: Array<Record<string, unknown>> = [];

  for (const r of list) {
    const ctx = ctxMap.get(r.id);
    if (!ctx) continue;
    const d = describe(ctx);
    const link = `/reservierungen?focus=${r.id}`;

    // VP + Admins
    const recipients = [...new Set([r.vp_id, ...adminIds])];
    for (const uid of recipients) {
      notifs.push({
        user_id: uid,
        typ: "reservierung_abgelaufen",
        titel: "Reservierung automatisch storniert",
        body: `${d.kunde} · ${d.projekt} · Whg. ${d.einheit} – Frist abgelaufen.`,
        link,
        meta: { reservierung_id: r.id, einheit_id: r.einheit_id },
      });
    }
    // Kunde (falls Portal-User)
    if (ctx.kunden?.user_id) {
      notifs.push({
        user_id: ctx.kunden.user_id,
        typ: "reservierung_abgelaufen",
        titel: "Deine Reservierung ist abgelaufen",
        body: `${d.projekt} · Whg. ${d.einheit}`,
        link: "/portal",
        meta: { reservierung_id: r.id },
      });
    }

    // Email
    const to = ctx.vp?.email ? [ctx.vp.email] : [];
    if (to.length) {
      await sendEmail(
        to,
        `Reservierung abgelaufen: ${d.kunde} · Whg. ${d.einheit}`,
        expiredHtml(d),
      );
    }
  }
  await sbInsert("notifications", notifs);
  return { count: list.length };
}

async function processReminders(daysLeft: 7 | 3, adminIds: string[]) {
  const colSent = daysLeft === 7 ? "reminder_7d_sent_at" : "reminder_3d_sent_at";
  const now = new Date();
  const winStart = new Date(now.getTime() + (daysLeft - 1) * 86400_000).toISOString();
  const winEnd = new Date(now.getTime() + (daysLeft + 1) * 86400_000).toISOString();

  const list = (await sb(
    `reservierungen?select=id,vp_id,kunde_id,einheit_id,expires_at,${colSent}&status=eq.reserviert&expires_at=gte.${winStart}&expires_at=lt.${winEnd}&${colSent}=is.null`,
  )) as ReservierungRow[];
  if (!list.length) return { count: 0 };

  const ids = list.map((r) => r.id);
  const ctxMap = await loadCtx(ids);
  const notifs: Array<Record<string, unknown>> = [];

  for (const r of list) {
    const ctx = ctxMap.get(r.id);
    if (!ctx) continue;
    const d = describe(ctx);
    const frist = fmtDate(r.expires_at);
    const link = `/reservierungen?focus=${r.id}`;

    const recipients = [...new Set([r.vp_id, ...adminIds])];
    for (const uid of recipients) {
      notifs.push({
        user_id: uid,
        typ: `reservierung_reminder_${daysLeft}d`,
        titel: `Reservierung läuft in ${daysLeft} Tagen ab`,
        body: `${d.kunde} · ${d.projekt} · Whg. ${d.einheit} – Frist: ${frist}`,
        link,
        meta: { reservierung_id: r.id, einheit_id: r.einheit_id, days_left: daysLeft },
      });
    }
    const to = ctx.vp?.email ? [ctx.vp.email] : [];
    if (to.length) {
      await sendEmail(
        to,
        `Reservierung läuft in ${daysLeft} Tagen ab: Whg. ${d.einheit}`,
        reminderHtml(d, daysLeft, frist),
      );
    }
  }

  await sbPatch(`reservierungen?id=in.(${ids.join(",")})`, {
    [colSent]: new Date().toISOString(),
  });
  await sbInsert("notifications", notifs);
  return { count: list.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const adminIds = await getAdminUserIds();
    const expired = await processExpired(adminIds);
    const r7 = await processReminders(7, adminIds);
    const r3 = await processReminders(3, adminIds);
    const result = { expired: expired.count, reminders_7d: r7.count, reminders_3d: r3.count, ts: new Date().toISOString() };
    console.log("reservierungen-cron", result);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("reservierungen-cron failed", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

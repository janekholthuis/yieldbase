// Sendet dem Kunden seinen einmaligen Login-Link zum Kundenportal via Resend.
// Intern aufgerufen (Server-Action activate/resendPortalLink). Erwartet
// RESEND_API_KEY und optional PORTAL_FROM_EMAIL / RESERVATION_FROM_EMAIL.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  to: string;
  kundeName: string | null;
  orgName: string | null;
  loginUrl: string;
}

function renderHtml(b: Body): string {
  const org = b.orgName ?? "Ihr Kundenportal";
  const hallo = b.kundeName ? `Hallo ${b.kundeName},` : "Hallo,";

  return `<!doctype html>
<html lang="de">
<body style="margin:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0F172A;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08)">
        <tr><td style="background:#1e3a5f;padding:20px 28px">
          <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.01em">${org}</span>
        </td></tr>
        <tr><td style="padding:28px">
          <h1 style="margin:0 0 14px;font-size:22px;font-weight:700;line-height:1.2">
            Ihr Zugang zum Kundenportal
          </h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.55">
            ${hallo} mit dem folgenden Link gelangen Sie direkt in Ihr persönliches
            Kundenportal — dort können Sie Ihre Selbstauskunft ausfüllen und
            Unterlagen einsehen.
          </p>
          <p style="margin:18px 0 6px">
            <a href="${b.loginUrl}" style="display:inline-block;background:#1e3a5f;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:10px">
              Zum Kundenportal
            </a>
          </p>
          <p style="margin:8px 0 0;font-size:12px;color:#64748B;line-height:1.5">
            Dieser Anmelde-Link ist nur einmal und zeitlich begrenzt gültig. Falls
            der Button nicht funktioniert, kopieren Sie diese Adresse in den Browser:<br/>
            <span style="word-break:break-all;color:#475569">${b.loginUrl}</span>
          </p>
        </td></tr>
        <tr><td style="padding:14px 28px 22px;border-top:1px solid #E2E8F0;color:#94A3B8;font-size:11px;line-height:1.5">
          ${org}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY nicht konfiguriert" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const FROM =
      Deno.env.get("PORTAL_FROM_EMAIL") ??
      Deno.env.get("INVITE_FROM_EMAIL") ??
      Deno.env.get("RESERVATION_FROM_EMAIL") ??
      "Objektpilot <onboarding@resend.dev>";

    const body = (await req.json()) as Body;
    if (!body.to || !body.loginUrl) {
      return new Response(
        JSON.stringify({ error: "to und loginUrl sind erforderlich" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const subject = `Ihr Zugang zum Kundenportal${body.orgName ? ` · ${body.orgName}` : ""}`;
    const html = renderHtml(body);

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to: [body.to], subject, html }),
    });

    const text = await resp.text();
    if (!resp.ok) {
      console.error("Resend error", resp.status, text);
      return new Response(JSON.stringify({ error: text }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(text, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("send-portal-link failed", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

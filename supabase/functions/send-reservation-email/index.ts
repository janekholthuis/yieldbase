// Sendet Reservierungs-Bestätigung per Email mit PDF-Anhang via Resend
// CORS-frei: nur intern aufgerufen via SUPABASE_PUBLISHABLE_KEY
// Erwartet RESEND_API_KEY und optional RESERVATION_FROM_EMAIL als Secrets.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  kunde: { vorname: string | null; nachname: string | null; email: string };
  vp: { vorname: string | null; nachname: string | null; name: string | null; email: string | null; phone: string | null } | null;
  einheit: {
    wohnungsnummer: string;
    projekt: { name: string | null; stadt: string | null; adresse: string | null } | null;
  } | null;
  bank: { kontoinhaber: string | null; iban: string | null; bic: string | null };
  reservierungsgebuehr: number;
  expiresAt: string;
  pdfBase64: string;
  pdfFilename: string;
  siteUrl?: string | null;
  portalUrl?: string | null;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const fmtEur = (n: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

function renderHtml(b: Body, portalUrl: string | null): string {
  const kundeName =
    `${b.kunde.vorname ?? ""} ${b.kunde.nachname ?? ""}`.trim() || "Du";
  const vpName = b.vp
    ? `${b.vp.vorname ?? ""} ${b.vp.nachname ?? ""}`.trim() ||
      b.vp.name ||
      "Dein Vertriebspartner"
    : "Dein Vertriebspartner";
  const projektName = b.einheit?.projekt?.name ?? "deinem Wunschobjekt";
  const stadt = b.einheit?.projekt?.stadt ?? "";
  const wohnung = b.einheit?.wohnungsnummer ?? "—";
  const frist = fmtDate(b.expiresAt);

  return `<!doctype html>
<html lang="de">
<body style="margin:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0F172A;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08)">
        <tr><td style="background:#06B6D4;padding:20px 28px">
          <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.01em;font-family:Manrope,-apple-system,sans-serif">EMI</span>
        </td></tr>
        <tr><td style="padding:28px">
          <h1 style="margin:0 0 14px;font-family:Manrope,-apple-system,sans-serif;font-size:22px;font-weight:700;line-height:1.2">
            Deine Reservierung ist bestätigt
          </h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.55">
            Hallo ${kundeName},<br/>
            schön, dass du dich für <strong>${projektName}${stadt ? `, ${stadt}` : ""}</strong> entschieden hast.
            Deine Reservierung für <strong>Wohnung ${wohnung}</strong> ist hiermit bestätigt.
          </p>

          <div style="border-left:3px solid #06B6D4;padding:10px 14px;background:#ECFEFF;border-radius:0 8px 8px 0;margin:16px 0">
            <p style="margin:0;font-size:14px;line-height:1.55">
              <strong>Reservierungsgebühr:</strong> ${fmtEur(b.reservierungsgebuehr)}<br/>
              <strong>Reservierung gültig bis:</strong> ${frist}
            </p>
          </div>

          <h2 style="margin:22px 0 8px;font-family:Manrope,-apple-system,sans-serif;font-size:15px;font-weight:700">
            Bankverbindung
          </h2>
          <table cellpadding="0" cellspacing="0" style="width:100%;font-size:13px;border-collapse:collapse">
            <tr><td style="padding:6px 0;color:#64748B;width:120px">Kontoinhaber</td><td style="padding:6px 0">${b.bank.kontoinhaber ?? "—"}</td></tr>
            <tr><td style="padding:6px 0;color:#64748B">IBAN</td><td style="padding:6px 0;font-family:monospace">${b.bank.iban ?? "—"}</td></tr>
            <tr><td style="padding:6px 0;color:#64748B">BIC</td><td style="padding:6px 0;font-family:monospace">${b.bank.bic ?? "—"}</td></tr>
            <tr><td style="padding:6px 0;color:#64748B">Verwendung</td><td style="padding:6px 0">Reservierung ${wohnung} · ${kundeName}</td></tr>
          </table>

          <p style="margin:18px 0 0;font-size:14px;line-height:1.55">
            Bitte überweise die Reservierungsgebühr innerhalb von 7 Tagen. Bei Beurkundung wird sie
            vollständig auf den Kaufpreis angerechnet.
          </p>

          ${
            portalUrl
              ? `<h2 style="margin:24px 0 8px;font-family:Manrope,-apple-system,sans-serif;font-size:15px;font-weight:700">
            Nächster Schritt: Unterlagen hochladen
          </h2>
          <p style="margin:0 0 14px;font-size:14px;line-height:1.55">
            Damit wir mit der Finanzierung starten können, lade bitte deine Unterlagen
            in deinem persönlichen Kunden-Portal hoch. Über den folgenden Button loggst du
            dich direkt ein – ganz ohne Passwort.
          </p>
          <p style="margin:0 0 6px">
            <a href="${portalUrl}" style="display:inline-block;background:#06B6D4;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:10px">
              Zum Kunden-Portal
            </a>
          </p>
          <p style="margin:8px 0 0;font-size:12px;color:#64748B;line-height:1.5">
            Der Login-Link ist 24 Stunden gültig. Falls der Button nicht funktioniert,
            kopiere diese Adresse in den Browser:<br/>
            <span style="word-break:break-all;color:#475569">${portalUrl}</span>
          </p>`
              : ""
          }

          <h2 style="margin:22px 0 8px;font-family:Manrope,-apple-system,sans-serif;font-size:15px;font-weight:700">
            Dein Ansprechpartner
          </h2>
          <p style="margin:0;font-size:14px;line-height:1.55">
            ${vpName}${b.vp?.email ? `<br/><a href="mailto:${b.vp.email}" style="color:#06B6D4;text-decoration:none">${b.vp.email}</a>` : ""}
            ${b.vp?.phone ? `<br/>${b.vp.phone}` : ""}
          </p>

          <p style="margin:24px 0 0;font-size:13px;color:#64748B;line-height:1.55">
            Im Anhang findest du die unterzeichnete Reservierungsvereinbarung als PDF.
          </p>
        </td></tr>
        <tr><td style="padding:14px 28px 22px;border-top:1px solid #E2E8F0;color:#94A3B8;font-size:11px;line-height:1.5">
          EMI · Vertriebsplattform für Bestandsimmobilien
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
      return new Response(JSON.stringify({ error: "RESEND_API_KEY nicht konfiguriert" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const FROM = Deno.env.get("RESERVATION_FROM_EMAIL") ?? "EMI <onboarding@resend.dev>";

    const body = (await req.json()) as Body;

    // Magic-Link für Kunden-Portal generieren (best-effort)
    let portalUrl: string | null = body.portalUrl ?? null;
    const siteUrl =
      body.siteUrl ?? Deno.env.get("PUBLIC_SITE_URL") ?? null;
    if (!portalUrl && body.kunde?.email && siteUrl) {
      try {
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
        const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const linkResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
          method: "POST",
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "magiclink",
            email: body.kunde.email,
            options: {
              redirect_to: `${siteUrl.replace(/\/$/, "")}/portal/dokumente`,
            },
          }),
        });
        if (linkResp.ok) {
          const j = await linkResp.json();
          portalUrl =
            j?.properties?.action_link ??
            j?.action_link ??
            null;
        } else {
          console.warn("generate_link failed", linkResp.status, await linkResp.text());
        }
      } catch (err) {
        console.warn("Magic-Link Erzeugung fehlgeschlagen", err);
      }
    }

    const stadt = body.einheit?.projekt?.stadt ?? "";
    const subject = `Deine Reservierung für Wohnung ${body.einheit?.wohnungsnummer ?? ""}${stadt ? ` in ${stadt}` : ""}`;
    const html = renderHtml(body, portalUrl);

    const cc: string[] = [];
    if (body.vp?.email) cc.push(body.vp.email);
    const bcc: string[] = [];
    const adminBcc = Deno.env.get("RESERVATION_BCC_EMAIL");
    if (adminBcc) bcc.push(adminBcc);

    const payload: Record<string, unknown> = {
      from: FROM,
      to: [body.kunde.email],
      subject,
      html,
      attachments: [
        {
          filename: body.pdfFilename,
          content: body.pdfBase64,
        },
      ],
    };
    if (cc.length) payload.cc = cc;
    if (bcc.length) payload.bcc = bcc;

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
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
    console.error("send-reservation-email failed", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

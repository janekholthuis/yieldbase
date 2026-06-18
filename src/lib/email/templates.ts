// E-Mail-Templates (HTML). Reine Funktionen → unit-testbar; portiert aus den
// bisherigen Supabase-Edge-Functions (send-portal-link/invite/reservation).

export interface RenderedEmail {
  subject: string;
  html: string;
}

function esc(s: string | null | undefined): string {
  if (s == null) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtEur(n: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function shell(headerLabel: string, headerBg: string, inner: string, footer: string): string {
  return `<!doctype html>
<html lang="de">
<body style="margin:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0F172A;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08)">
        <tr><td style="background:${headerBg};padding:20px 28px">
          <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.01em">${esc(headerLabel)}</span>
        </td></tr>
        <tr><td style="padding:28px">${inner}</td></tr>
        <tr><td style="padding:14px 28px 22px;border-top:1px solid #E2E8F0;color:#94A3B8;font-size:11px;line-height:1.5">
          ${esc(footer)}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ───────────── Portal-Login-Link ─────────────
export function portalLinkEmail(b: {
  kundeName: string | null;
  orgName: string | null;
  loginUrl: string;
}): RenderedEmail {
  const org = b.orgName ?? "Ihr Kundenportal";
  const hallo = b.kundeName ? `Hallo ${esc(b.kundeName)},` : "Hallo,";
  const url = esc(b.loginUrl);
  const inner = `
    <h1 style="margin:0 0 14px;font-size:22px;font-weight:700;line-height:1.2">Ihr Zugang zum Kundenportal</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55">
      ${hallo} mit dem folgenden Link gelangen Sie direkt in Ihr persönliches Kundenportal —
      dort können Sie Ihre Selbstauskunft ausfüllen und Unterlagen einsehen.
    </p>
    <p style="margin:18px 0 6px">
      <a href="${url}" style="display:inline-block;background:#1e3a5f;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:10px">Zum Kundenportal</a>
    </p>
    <p style="margin:8px 0 0;font-size:12px;color:#64748B;line-height:1.5">
      Dieser Anmelde-Link ist nur einmal und zeitlich begrenzt gültig. Falls der Button nicht funktioniert, kopieren Sie diese Adresse in den Browser:<br/>
      <span style="word-break:break-all;color:#475569">${url}</span>
    </p>`;
  return {
    subject: `Ihr Zugang zum Kundenportal${b.orgName ? ` · ${b.orgName}` : ""}`,
    html: shell(org, "#1e3a5f", inner, org),
  };
}

// ───────────── Einladung ─────────────
export function inviteEmail(b: {
  inviterName: string | null;
  orgName: string | null;
  roleLabel: string;
  acceptUrl: string;
  expiresAt: string;
}): RenderedEmail {
  const org = b.orgName ?? "unsere Vertriebsplattform";
  const inviter = b.inviterName ?? "Dein Ansprechpartner";
  const url = esc(b.acceptUrl);
  const inner = `
    <h1 style="margin:0 0 14px;font-size:22px;font-weight:700;line-height:1.2">Du wurdest eingeladen</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55">
      <strong>${esc(inviter)}</strong> hat dich zu <strong>${esc(org)}</strong> als
      <strong>${esc(b.roleLabel)}</strong> eingeladen. Erstelle jetzt dein Konto, um loszulegen.
    </p>
    <p style="margin:18px 0 6px">
      <a href="${url}" style="display:inline-block;background:#1e3a5f;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:10px">Einladung annehmen</a>
    </p>
    <p style="margin:8px 0 0;font-size:12px;color:#64748B;line-height:1.5">
      Der Einladungslink ist bis <strong>${fmtDate(b.expiresAt)}</strong> gültig. Falls der Button nicht funktioniert, kopiere diese Adresse in den Browser:<br/>
      <span style="word-break:break-all;color:#475569">${url}</span>
    </p>`;
  return {
    subject: `Einladung zu ${org}`,
    html: shell(org, "#1e3a5f", inner, `${org} · Vertriebsplattform`),
  };
}

// ───────────── Reservierungs-Bestätigung ─────────────
export function reservationEmail(b: {
  kunde: { vorname: string | null; nachname: string | null };
  vp: { vorname: string | null; nachname: string | null; name: string | null; email: string | null; phone: string | null } | null;
  einheit: { wohnungsnummer: string | null; projekt: { name: string | null; stadt: string | null } | null } | null;
  bank: { kontoinhaber: string | null; iban: string | null; bic: string | null };
  reservierungsgebuehr: number;
  expiresAt: string;
  portalUrl: string | null;
}): RenderedEmail {
  const kundeName = `${b.kunde.vorname ?? ""} ${b.kunde.nachname ?? ""}`.trim() || "Du";
  const vpName = b.vp
    ? `${b.vp.vorname ?? ""} ${b.vp.nachname ?? ""}`.trim() || b.vp.name || "Dein Vertriebspartner"
    : "Dein Vertriebspartner";
  const projektName = b.einheit?.projekt?.name ?? "deinem Wunschobjekt";
  const stadt = b.einheit?.projekt?.stadt ?? "";
  const wohnung = b.einheit?.wohnungsnummer ?? "—";
  const portalUrl = b.portalUrl ? esc(b.portalUrl) : null;

  const portalBlock = portalUrl
    ? `<h2 style="margin:24px 0 8px;font-size:15px;font-weight:700">Nächster Schritt: Unterlagen hochladen</h2>
       <p style="margin:0 0 14px;font-size:14px;line-height:1.55">Damit wir mit der Finanzierung starten können, lade bitte deine Unterlagen in deinem persönlichen Kunden-Portal hoch. Über den folgenden Button loggst du dich direkt ein – ganz ohne Passwort.</p>
       <p style="margin:0 0 6px"><a href="${portalUrl}" style="display:inline-block;background:#06B6D4;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:10px">Zum Kunden-Portal</a></p>
       <p style="margin:8px 0 0;font-size:12px;color:#64748B;line-height:1.5">Der Login-Link ist 24 Stunden gültig. Falls der Button nicht funktioniert, kopiere diese Adresse in den Browser:<br/><span style="word-break:break-all;color:#475569">${portalUrl}</span></p>`
    : "";

  const inner = `
    <h1 style="margin:0 0 14px;font-size:22px;font-weight:700;line-height:1.2">Deine Reservierung ist bestätigt</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55">
      Hallo ${esc(kundeName)},<br/>
      schön, dass du dich für <strong>${esc(projektName)}${stadt ? `, ${esc(stadt)}` : ""}</strong> entschieden hast.
      Deine Reservierung für <strong>Wohnung ${esc(wohnung)}</strong> ist hiermit bestätigt.
    </p>
    <div style="border-left:3px solid #06B6D4;padding:10px 14px;background:#ECFEFF;border-radius:0 8px 8px 0;margin:16px 0">
      <p style="margin:0;font-size:14px;line-height:1.55">
        <strong>Reservierungsgebühr:</strong> ${fmtEur(b.reservierungsgebuehr)}<br/>
        <strong>Reservierung gültig bis:</strong> ${fmtDate(b.expiresAt)}
      </p>
    </div>
    <h2 style="margin:22px 0 8px;font-size:15px;font-weight:700">Bankverbindung</h2>
    <table cellpadding="0" cellspacing="0" style="width:100%;font-size:13px;border-collapse:collapse">
      <tr><td style="padding:6px 0;color:#64748B;width:120px">Kontoinhaber</td><td style="padding:6px 0">${esc(b.bank.kontoinhaber) || "—"}</td></tr>
      <tr><td style="padding:6px 0;color:#64748B">IBAN</td><td style="padding:6px 0;font-family:monospace">${esc(b.bank.iban) || "—"}</td></tr>
      <tr><td style="padding:6px 0;color:#64748B">BIC</td><td style="padding:6px 0;font-family:monospace">${esc(b.bank.bic) || "—"}</td></tr>
      <tr><td style="padding:6px 0;color:#64748B">Verwendung</td><td style="padding:6px 0">Reservierung ${esc(wohnung)} · ${esc(kundeName)}</td></tr>
    </table>
    <p style="margin:18px 0 0;font-size:14px;line-height:1.55">Bitte überweise die Reservierungsgebühr innerhalb von 7 Tagen. Bei Beurkundung wird sie vollständig auf den Kaufpreis angerechnet.</p>
    ${portalBlock}
    <h2 style="margin:22px 0 8px;font-size:15px;font-weight:700">Dein Ansprechpartner</h2>
    <p style="margin:0;font-size:14px;line-height:1.55">
      ${esc(vpName)}${b.vp?.email ? `<br/><a href="mailto:${esc(b.vp.email)}" style="color:#06B6D4;text-decoration:none">${esc(b.vp.email)}</a>` : ""}${b.vp?.phone ? `<br/>${esc(b.vp.phone)}` : ""}
    </p>
    <p style="margin:24px 0 0;font-size:13px;color:#64748B;line-height:1.55">Im Anhang findest du die unterzeichnete Reservierungsvereinbarung als PDF.</p>`;

  return {
    subject: `Deine Reservierung für Wohnung ${wohnung}${stadt ? ` in ${stadt}` : ""}`,
    html: shell("EMI", "#06B6D4", inner, "EMI · Vertriebsplattform für Bestandsimmobilien"),
  };
}

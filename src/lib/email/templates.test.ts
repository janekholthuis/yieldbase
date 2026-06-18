import { describe, it, expect } from "vitest";
import { portalLinkEmail, inviteEmail, reservationEmail } from "./templates";

describe("portalLinkEmail", () => {
  it("includes the login URL and greeting with name", () => {
    const { subject, html } = portalLinkEmail({
      kundeName: "Max Mustermann",
      orgName: "Acme Immobilien",
      loginUrl: "https://portal.example.com/login?token=abc",
    });
    expect(subject).toContain("Acme Immobilien");
    expect(html).toContain("Hallo Max Mustermann,");
    expect(html).toContain("https://portal.example.com/login?token=abc");
  });

  it("falls back gracefully without name/org", () => {
    const { subject, html } = portalLinkEmail({
      kundeName: null,
      orgName: null,
      loginUrl: "https://x/y",
    });
    expect(subject).toBe("Ihr Zugang zum Kundenportal");
    expect(html).toContain("Hallo,");
  });
});

describe("inviteEmail", () => {
  it("includes inviter, role, accept URL and formatted expiry", () => {
    const { subject, html } = inviteEmail({
      inviterName: "Chris",
      orgName: "Acme",
      roleLabel: "Vertriebspartner",
      acceptUrl: "https://x/invite/tok",
      expiresAt: "2026-07-01T00:00:00.000Z",
    });
    expect(subject).toBe("Einladung zu Acme");
    expect(html).toContain("Chris");
    expect(html).toContain("Vertriebspartner");
    expect(html).toContain("https://x/invite/tok");
    expect(html).toContain("01.07.2026");
  });
});

describe("reservationEmail", () => {
  const base = {
    kunde: { vorname: "Anna", nachname: "Beispiel" },
    vp: { vorname: "Tom", nachname: "VP", name: null, email: "tom@vp.de", phone: "0151" },
    einheit: { wohnungsnummer: "WE3", projekt: { name: "Altbau", stadt: "Halle" } },
    bank: { kontoinhaber: "Bauträger", iban: "DE123", bic: "ABCDEF" },
    reservierungsgebuehr: 5000,
    expiresAt: "2026-07-01T00:00:00.000Z",
  };

  it("renders unit, EUR fee, bank details and subject", () => {
    const { subject, html } = reservationEmail({ ...base, portalUrl: null });
    expect(subject).toContain("WE3");
    expect(subject).toContain("Halle");
    expect(html).toContain("Anna Beispiel");
    expect(html).toContain("DE123");
    expect(html).toMatch(/5\.000\s*€/);
  });

  it("includes the portal button only when a portalUrl is given", () => {
    const without = reservationEmail({ ...base, portalUrl: null });
    expect(without.html).not.toContain("Zum Kunden-Portal");
    const withUrl = reservationEmail({ ...base, portalUrl: "https://p/portal" });
    expect(withUrl.html).toContain("Zum Kunden-Portal");
    expect(withUrl.html).toContain("https://p/portal");
  });

  it("escapes HTML in user-provided fields", () => {
    const { html } = reservationEmail({
      ...base,
      kunde: { vorname: "<script>", nachname: "x" },
      portalUrl: null,
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

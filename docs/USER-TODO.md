# 🔑 Objektpilot — Offene Aufgaben

> Live: **https://portal.erfolg-mit-immobilien.com** (Custom-Domain auf Vercel, deployt von `main`; alte URL `objekt-pilot.vercel.app` bleibt als Vercel-Default bestehen)

## 🎯 V1-Scope (Stand 2026-06-12)
**V1 aktiv:** Objekte (inkl. Kalkulation, Bilder, Dokumente, Karte), Kunden,
Reservierungen (inkl. Mailing), **Mein Team** (VP anlegen & verwalten), Profil.

**Reaktiviert 2026-06-18** (waren V1-gegated, jetzt live):
- **Provisionen** — Nav + Seite scharf; `updateProvisionStatus` mit Org+Tree-Guard gehärtet.
- **Finanzierungen** — Nav + Seite + Case-Detail scharf; `updateCaseOffer` auf Finanzierer-Rolle gegatet.
- **KI-Lageeinschätzung (PROJ-22)** — „Per KI generieren" im Einheiten-Formular (OpenAI), Lage-Text in der Präsentation.

## 🛠️ V1 — offene Bauarbeiten (Claude, kein User-Input nötig)
- [x] **`/profil`** ausgebaut: persönliche Daten + Adresse + persönl. Steuersatz, Passwort ändern, Abmelden (2026-06-12)
- [ ] **V1-Kernflows QA + INDEX-Status angleichen** (Objekte/Kunden/Reservierungen/Team) — viele stehen in INDEX noch auf „In Progress", sind aber live
- [x] **Einladungs-Mail** gebaut: `send-invite-email` Edge-Function + Versand in `createInvite` + Accept-Link-Fallback in TeamView (2026-06-12)
- [x] **Resend-Versand auf Next.js-direkt umgestellt** (2026-06-18): Invite-/Portal-Link-/Reservierungs-Mails gehen jetzt direkt über `RESEND_API_KEY` der Next.js-/Vercel-Env (nicht mehr über Supabase-Edge-Functions). Key ist gesetzt → Versand läuft.
- [ ] **Verifizierte Absender-Domain in Resend** (deine Seite, login-/zustellungskritisch): in Resend eine eigene Domain verifizieren und in **Vercel-Env** einen Absender setzen — `EMAIL_FROM` (globaler Default) und/oder spezifisch `INVITE_FROM_EMAIL` / `PORTAL_FROM_EMAIL` / `RESERVATION_FROM_EMAIL` (Format z. B. `Objektpilot <noreply@deine-domain.de>`), optional `RESERVATION_BCC_EMAIL`. Ohne verifizierte Domain liefert `onboarding@resend.dev` nur an den Resend-Account-Owner.
- [ ] **OpenAI-Key-Name (optional vereinheitlichen):** du hast `OPEN_API_KEY` gesetzt (funktioniert — der Client liest beide). Sauberer wäre der Standardname `OPENAI_API_KEY` in Vercel. Modell via `OPENAI_MODEL` überschreibbar (Default `gpt-4o-mini`).

## 🟡 Optional / später
- [ ] **Leaked-Password-Schutz aktivieren** (Supabase → Auth → Passwords; HaveIBeenPwned-Check) — Advisor-Hinweis
- [ ] **Öffentlichen Storage-Bucket prüfen** (Advisor: „public bucket allows listing") — Listing ggf. einschränken
- [ ] **Domain `portal.erfolg-mit-immobilien.com` finalisieren** (Code ist domain-agnostisch — nur Config, login-kritisch):
  1. **Vercel** → Projekt → Settings → Domains: `portal.erfolg-mit-immobilien.com` hinzufügen + DNS-CNAME beim Provider setzen.
  2. **Vercel** → Settings → Environment Variables: `NEXT_PUBLIC_SITE_URL=https://portal.erfolg-mit-immobilien.com` (Production) → danach **Redeploy**.
  3. **Supabase** → Auth → URL Configuration: **Site URL** = `https://portal.erfolg-mit-immobilien.com`; unter **Redirect URLs** zusätzlich `https://portal.erfolg-mit-immobilien.com/**` aufnehmen (sonst brechen Invite-/Magic-/Reset-Links). ⚠️ login-kritisch.
  4. _(E-Mail-Edge-Function-Secrets nicht mehr nötig — Mails gehen jetzt direkt aus Next.js; der Portal-/Reservierungs-Magic-Link nutzt den Request-Origin bzw. `NEXT_PUBLIC_SITE_URL`.)_
  5. **Mapbox**-Token (falls URL-Restriction aktiv): neue Domain zur erlaubten Referrer-Liste hinzufügen.
- [ ] Auth-Email-Templates anpassen (Vorlagen: `OLD APP/docs/email-templates/`)
- [ ] RLS-Policies gegen das cookie-basierte `@supabase/ssr`-Auth gegenprüfen
- [ ] Struktur-Gaps entscheiden ([STRUCTURE-AUDIT.md](STRUCTURE-AUDIT.md)): Projektentwickler-Tabelle? Datenraum-Tabelle?
- [x] **Reaktivierung Provisionen/Finanzierungen/KI** — erledigt 2026-06-18 (siehe oben)
- [ ] **Visuelle Prod-Verifikation (eingeloggt):** B1-Projektansicht, Provisionen, Finanzierungen, KI-Generierung — als VP/Finanzierer einmal durchklicken (kann ich nicht ohne Login)


## ✅ Investagon (erledigt 2026-06-12)
Echte Preise/Flächen/Mieten liegen auf den **vollen** `Project`/`Property`-Ressourcen
(`GET /api/projects/{id}`, `/api/properties/{id}`) — nicht auf den schlanken
`Api*`-Listen. Sync zieht jetzt echte Daten (synthetischer Generator entfernt),
Volllauf erledigt (222 Projekte, 2108 Einheiten, 7023 Fotos, 9703 Dokumente).
UI-Trigger in den Einstellungen + täglicher Vercel-Cron (inkrementell). Details:
`docs/INVESTAGON-PLAN.md`. **Offen (deine Seite):** `CRON_SECRET` in Vercel-Env setzen.

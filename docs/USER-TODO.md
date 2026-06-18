# 🔑 Objektpilot — Offene Aufgaben

> Live: **https://emi-hub.de** (Custom-Domain auf Vercel, deployt von `main`; alte URL `objekt-pilot.vercel.app` bleibt als Vercel-Default bestehen)

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
- [x] **Resend-Domain `emi-hub.de` verifiziert + `EMAIL_FROM` gesetzt** (2026-06-18). Versand läuft jetzt produktiv über `@emi-hub.de`. Optional pro Flow überschreibbar: `INVITE_FROM_EMAIL` / `PORTAL_FROM_EMAIL` / `RESERVATION_FROM_EMAIL`, optional `RESERVATION_BCC_EMAIL`.
- [x] **OpenAI-Key gesetzt — lokal + Vercel-Env (Prod)** (2026-06-18). „Per KI generieren" läuft jetzt auch live. Modell via `OPENAI_MODEL` (Default `gpt-4o-mini`).

## 🟡 Optional / später
- [ ] **Leaked-Password-Schutz aktivieren** (Supabase → Auth → Passwords; HaveIBeenPwned-Check) — Advisor-Hinweis
- [ ] **Öffentlichen Storage-Bucket prüfen** (Advisor: „public bucket allows listing") — Listing ggf. einschränken
- [x] **Domain `emi-hub.de` finalisiert** (2026-06-18; ersetzt das frühere `portal.erfolg-mit-immobilien.com`). Code ist domain-agnostisch — Restpunkte sind reine Config:
  1. **Vercel** → Projekt → Settings → Domains: `emi-hub.de` hinzufügen + DNS-CNAME beim Provider setzen. ✅ erledigt
  2. **Vercel** → Settings → Environment Variables: `NEXT_PUBLIC_SITE_URL=https://emi-hub.de` (Production) → danach **Redeploy**. ⚠️ prüfen, dass der Wert auf `emi-hub.de` zeigt (nur Fallback, da der Request-Origin normalerweise greift).
  3. **Supabase** → Auth → URL Configuration: **Redirect URL** `https://emi-hub.de/**` aufgenommen ✅ (2026-06-18). Falls noch nicht geschehen: **Site URL** ebenfalls auf `https://emi-hub.de` setzen.
  4. _(E-Mail-Edge-Function-Secrets nicht mehr nötig — Mails gehen jetzt direkt aus Next.js; der Portal-/Reservierungs-Magic-Link nutzt den Request-Origin bzw. `NEXT_PUBLIC_SITE_URL`.)_
  5. **Mapbox**-Token (falls URL-Restriction aktiv): `emi-hub.de` zur erlaubten Referrer-Liste hinzufügen.
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
`docs/INVESTAGON-PLAN.md`.

**Wichtig — Credentials gehören NICHT in `.env.local`:** Investagon-ORG-ID + API-Key
werden **pro Organisation in der DB** gespeichert (`organisationen.investagon_org_id`
/`investagon_api_key`) und über die **App → Einstellungen → Karte „Investagon-
Synchronisierung"** (admin/support) eingetragen. Ein Eintrag in `.env.local`/Vercel
wird vom Sync **ignoriert**.

**Investagon-Credentials gesetzt** (2026-06-18, in den App-Einstellungen) ✅.

**`CRON_SECRET` gesetzt** (2026-06-18, Vercel-Env) ✅. Der automatische tägliche
Investagon-Sync (`/api/cron/investagon-sync`, 04:00) ist damit scharf; Vercel Cron
sendet das Secret automatisch als `Authorization: Bearer <secret>`.

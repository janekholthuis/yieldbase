# 🔑 Objektpilot — Offene Aufgaben

> Live: **https://portal.erfolg-mit-immobilien.com** (Custom-Domain auf Vercel, deployt von `main`; alte URL `objekt-pilot.vercel.app` bleibt als Vercel-Default bestehen)

## 🎯 V1-Scope (Stand 2026-06-12)
**V1 aktiv:** Objekte (inkl. Kalkulation, Bilder, Dokumente, Karte), Kunden,
Reservierungen (inkl. Mailing), **Mein Team** (VP anlegen & verwalten), Profil.

**In V1 NICHT gebraucht** — im Front-End ausgegraut/gegated, Code bleibt erhalten:
- **Provisionen** (Nav „Bald", Seite soft-gated)
- **Finanzierungen** (Nav „Bald", Seite + Case-Detail soft-gated)
- **KI-Features** (z. B. KI-Standort-Modul in der Objekt-Karte → „Bald")

Reaktivierung später: Wiring liegt als Kommentar in den jeweiligen Page-Dateien.

## 🛠️ V1 — offene Bauarbeiten (Claude, kein User-Input nötig)
- [x] **`/profil`** ausgebaut: persönliche Daten + Adresse + persönl. Steuersatz, Passwort ändern, Abmelden (2026-06-12)
- [ ] **V1-Kernflows QA + INDEX-Status angleichen** (Objekte/Kunden/Reservierungen/Team) — viele stehen in INDEX noch auf „In Progress", sind aber live
- [x] **Einladungs-Mail** gebaut: `send-invite-email` Edge-Function + Versand in `createInvite` + Accept-Link-Fallback in TeamView (2026-06-12)
- [ ] **Resend für echten Versand konfigurieren** (deine Seite): eigene Domain in Resend verifizieren + `RESERVATION_FROM_EMAIL`/`INVITE_FROM_EMAIL` als Supabase-Edge-Secrets setzen — sonst liefert `onboarding@resend.dev` nur an den Resend-Account-Owner

## 🟡 Optional / später
- [ ] **Leaked-Password-Schutz aktivieren** (Supabase → Auth → Passwords; HaveIBeenPwned-Check) — Advisor-Hinweis
- [ ] **Öffentlichen Storage-Bucket prüfen** (Advisor: „public bucket allows listing") — Listing ggf. einschränken
- [ ] **Domain `portal.erfolg-mit-immobilien.com` finalisieren** (Code ist domain-agnostisch — nur Config, login-kritisch):
  1. **Vercel** → Projekt → Settings → Domains: `portal.erfolg-mit-immobilien.com` hinzufügen + DNS-CNAME beim Provider setzen.
  2. **Vercel** → Settings → Environment Variables: `NEXT_PUBLIC_SITE_URL=https://portal.erfolg-mit-immobilien.com` (Production) → danach **Redeploy**.
  3. **Supabase** → Auth → URL Configuration: **Site URL** = `https://portal.erfolg-mit-immobilien.com`; unter **Redirect URLs** zusätzlich `https://portal.erfolg-mit-immobilien.com/**` aufnehmen (sonst brechen Invite-/Magic-/Reset-Links). ⚠️ login-kritisch.
  4. **Supabase** → Edge Functions Secrets: `PUBLIC_SITE_URL=https://portal.erfolg-mit-immobilien.com` (für `send-reservation-email`/`send-invite-email`, falls ohne Request-Origin aufgerufen).
  5. **Mapbox**-Token (falls URL-Restriction aktiv): neue Domain zur erlaubten Referrer-Liste hinzufügen.
- [ ] Auth-Email-Templates anpassen (Vorlagen: `OLD APP/docs/email-templates/`)
- [ ] RLS-Policies gegen das cookie-basierte `@supabase/ssr`-Auth gegenprüfen
- [ ] Struktur-Gaps entscheiden ([STRUCTURE-AUDIT.md](STRUCTURE-AUDIT.md)): Projektentwickler-Tabelle? Datenraum-Tabelle?
- [ ] Reaktivierung Provisionen/Finanzierungen/KI (V2)


## ✅ Investagon (erledigt 2026-06-12)
Echte Preise/Flächen/Mieten liegen auf den **vollen** `Project`/`Property`-Ressourcen
(`GET /api/projects/{id}`, `/api/properties/{id}`) — nicht auf den schlanken
`Api*`-Listen. Sync zieht jetzt echte Daten (synthetischer Generator entfernt),
Volllauf erledigt (222 Projekte, 2108 Einheiten, 7023 Fotos, 9703 Dokumente).
UI-Trigger in den Einstellungen + täglicher Vercel-Cron (inkrementell). Details:
`docs/INVESTAGON-PLAN.md`. **Offen (deine Seite):** `CRON_SECRET` in Vercel-Env setzen.

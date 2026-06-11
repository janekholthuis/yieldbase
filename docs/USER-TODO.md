# 🔑 Dinge, die DU erledigen musst (Objektpilot)

> Claude baut autonom weiter und kann diese Dinge nicht selbst tun (Secrets, externe Accounts, manuelle Dashboard-Schritte). Abgearbeitet? Haken setzen.

## Secrets / Env-Variablen

- [ ] **`SUPABASE_SERVICE_ROLE_KEY`** in Vercel setzen (Settings → Environment Variables → Production) **und** in lokaler `.env.local`.
  - Wert: Supabase Dashboard → Project Settings → API → `service_role` key (GEHEIM, niemals ins Frontend).
  - Wird gebraucht für: Einladungen, Kunden-Portal-Aktivierung, Reservierungen, Demo-Seed — alle Server-Actions mit Admin-Client.
- [ ] **`NEXT_PUBLIC_MAPBOX_TOKEN`** in Vercel + `.env.local` setzen.
  - Wert: https://account.mapbox.com → Access Tokens.
  - Wird gebraucht für: Karten-Tab in Objekt-Detail, Karten in Präsentation/Objekte-Map-View.
- [ ] **`RESEND_API_KEY`** in Supabase Edge Functions Secrets setzen (für Reservierungs-Emails).
  - Wert: https://resend.com → API Keys. Setzen via `supabase secrets set RESEND_API_KEY=...`.
- [ ] **`SUPABASE_SERVICE_ROLE_KEY` rotieren** — der alte stand evtl. in der Lovable-`.env`. Sicherheitshalber neu generieren.
- [ ] **MCP-Token rotieren** — der `sbp_...` Token in `.mcp.json` war im Chat sichtbar.

## Supabase Dashboard

- [ ] **Auth → URL Configuration**: Site URL = `https://objelt-pilot.vercel.app`, Redirect URLs ergänzen (`https://objelt-pilot.vercel.app/**`, `http://localhost:3000/**`). Sonst funktionieren Magic-Link / Passwort-Reset / Invite-Emails nicht.
- [ ] **Auth → Email Templates**: anpassen (Lovable-Templates lagen unter `OLD APP/docs/email-templates/`).
- [ ] **Edge Functions deployen** (sobald portiert): `supabase functions deploy` für `reservierungen-cron`, `send-reservation-email`, `seed-demo-users`, `reset-demo-passwords`.
- [ ] **Cron** für `reservierungen-cron` einrichten (Supabase → Database → Cron oder pg_cron), täglich.

## Vercel

- [x] Deployment Protection deaktiviert (Seite ist öffentlich). ✅
- [ ] Nach dem Setzen neuer Env-Vars **Redeploy** (Env-Vars greifen nicht rückwirkend) — oder Claude deployed beim nächsten Push.
- [ ] (Optional) Eigene Domain verbinden statt `objelt-pilot.vercel.app`.

## Daten / Test

- [ ] **Test-User anlegen** in Supabase Auth (oder Demo-Seed-Function ausführen) mit Rollen in `user_roles`, damit Login + Rollen-Routing testbar ist.
- [ ] Prüfen, ob die **RLS-Policies** mit dem cookie-basierten `@supabase/ssr` Auth weiterhin greifen (Claude nutzt jetzt User-Sessions statt Bearer-Header).

---

## Was Claude in dieser autonomen Session gebaut hat
_(wird laufend ergänzt)_

- ✅ Objekte-Liste (deployed)
- ✅ Objekte-Detail read-only (deployed)

# Supabase-Komplettumzug — Runbook

> Ziel: das gesamte Supabase-Projekt **1:1 auf ein neues, leeres Projekt** umziehen
> (z. B. in eine Pro-Org). Mit kurzem Wartungsfenster. Quelle: `ffagjzkkzlywejzjfgue`.

## TL;DR — das ist ein KLEINER Umzug
Gemessen am Ist-Stand (2026-06-22):

| Größe | Wert | Bedeutung |
|---|---|---|
| DB | **49 MB** | Dump/Restore in Sekunden |
| Storage-Dateien | **15** | die „7000 Fotos" sind externe Investagon-**CDN-URLs als Text**, keine Blobs |
| Auth-User | **21** | wandern im Dump mit |
| Buckets | 4 (`objekt-bilder` public, `objekt-dokumente`/`reservierungen`/`kunden-dokumente` privat) | neu anlegen + 15 Dateien kopieren |
| Edge-Functions | 6 | redeploy + Secrets |
| pg_cron | 1 (`reservierungen-cron-daily` 02:00) | neu anlegen, **URL/Key zeigen sonst aufs alte Projekt** |
| Vault-Secrets | 0 | nichts zu tun |

**Realistisch ~30 Min, geringes Risiko.** Das alte Projekt bleibt als Backup stehen.

---

## Gesamtablauf (neuer Account — bestätigter Pfad)
Linearer Durchlauf; Detail-Kommandos je Schritt weiter unten.

**A · Neuen Account + Projekt (neue E-Mail)**
1. Mit der **neuen E-Mail** bei supabase.com registrieren → neue Organization.
2. Org auf **Pro** (25 $/Mo).
3. Neues, **leeres** Projekt anlegen — **gleiche Region wie Prod** (EU/Frankfurt). Notiere: Project Ref, DB-Passwort.
4. **API-Keys** (anon, service_role) + **Personal Access Token** (Account → Access Tokens) notieren.

**B · Migration** → Schritte 0–6 unten
5. Extensions im Ziel (0) → Wartungsfenster (1) → Dump (2) → Restore (3) → Storage 15 Dateien (4) → Edge-Functions+Secrets (5) → pg_cron neu (6).

**C · Umschalten** → Schritte 7–8 unten
6. Auth-Config (Site/Redirect-URLs) im Ziel (7).
7. `.mcp.json` (Ref + neuer PAT) + **Vercel-Env** (URL/anon/service_role) + `config.toml` project_id → neues Projekt; App redeploy (8).
8. Verifizieren: Advisors, Zeilenzahlen Quelle/Ziel, Login, Bild lädt (9).

**D · Abschluss**
9. Altes Projekt 1–2 Wochen pausiert als Backup, alten PAT widerrufen.
10. **Branching aktivieren** auf dem neuen Projekt → Staging-Loop (siehe `docs/STAGING-PLAN.md`), danach Repo-Migrations-Abgleich.

---

## Baseline Quelle (2026-06-22) — Ziel muss das nach Restore matchen
| Tabelle | n | | Tabelle | n |
|---|---|---|---|---|
| organisationen | 2 | | reservierungen | 13 |
| profiles | 21 | | finanzierungs_cases | 5 |
| user_roles | 21 | | selbstauskuenfte | 1 |
| organisation_members | 38 | | objekt_bilder | 7090 |
| projekte | 233 | | objekt_dokumente | 9772 |
| einheiten | 2132 | | kunden_dokumente | 7 |
| kunden | 8 | | notifications | 26 |
| provisionen | 4 | | **auth.users** | **21** |
| | | | **storage.objects** | **15** |

## Voraussetzungen (lokal)
- **Supabase CLI** (`supabase --version`) + **Docker** laufend (für `db dump`).
- **psql** (Postgres-Client) im PATH.
- Beide **DB-Connection-Strings** (Dashboard → Project Settings → Database → *Connection string* → **Session/Direct**, Port 5432, inkl. Passwort).
- Das **Ziel-Projekt** ist bereits angelegt (leer) in der Pro-Org. Notiere: `PROJECT REF`, `anon key`, `service_role key`, DB-Passwort.

```bash
# Platzhalter — einmal im Terminal setzen:
export SRC_DB="postgresql://postgres:<PW>@db.ffagjzkkzlywejzjfgue.supabase.co:5432/postgres"
export DST_DB="postgresql://postgres:<PW>@db.<NEU-REF>.supabase.co:5432/postgres"
export DST_REF="<NEU-REF>"
```

---

## Schritt 0 — Ziel-Projekt vorbereiten
Extensions, die nicht per Default an sind, **vor** dem Restore im Ziel-SQL-Editor aktivieren:
```sql
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;
create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists pg_stat_statements;
-- supabase_vault ist Default-aktiv; 0 Secrets → nichts weiter
```

## Schritt 1 — Wartungsfenster öffnen (Writes stoppen)
Damit der Dump konsistent ist:
1. **Vercel-Cron pausieren**: `investagon-sync` ist durch den neuen `VERCEL_ENV`-Guard ohnehin nur Prod — für die Dauer am besten den App-Deploy kurz in den Wartungsmodus (oder Schreib-Pfade meiden).
2. **pg_cron auf der Quelle pausieren** (verhindert mitten im Dump):
   ```sql
   select cron.unschedule('reservierungen-cron-daily');
   ```
3. Nutzer kurz informieren / keine aktiven Reservierungen/Selbstauskünfte währenddessen.

## Schritt 2 — Dump von der Quelle
Der CLI-`db dump` nutzt pg_dump und erfasst **public + auth + storage** korrekt:
```bash
supabase db dump --db-url "$SRC_DB" -f roles.sql  --role-only
supabase db dump --db-url "$SRC_DB" -f schema.sql
supabase db dump --db-url "$SRC_DB" -f data.sql   --data-only --use-copy
```

## Schritt 3 — Restore ins Ziel
```bash
# roles.sql: Warnungen zu bereits existierenden Supabase-Basisrollen sind normal.
psql "$DST_DB" --set ON_ERROR_STOP=0 -f roles.sql
psql "$DST_DB" --set ON_ERROR_STOP=1 -f schema.sql
psql "$DST_DB" --set ON_ERROR_STOP=1 -f data.sql
```
Damit sind **Schema (Tabellen, ~44 SECURITY-DEFINER-Funktionen, Trigger wie `handle_new_user`, Enums, RLS-Policies inkl. `org_isolation`), alle Daten und alle 21 Auth-User** drüben. **Wichtig:** Weil hier der **echte Live-Dump** restored wird (nicht die Repo-Migrationen), bekommst du die vollständige Prod-Struktur — die bekannte Repo-Migrations-Lücke ist hier kein Problem.

## Schritt 4 — Storage-Dateien kopieren (15 Stück)
Die `storage.buckets`-Zeilen kamen im Dump mit (Buckets existieren). Die **Datei-Bytes** müssen separat. Object-Metadaten im Ziel einmal leeren, dann via API neu hochladen (erzeugt Zeile **und** Datei):
```sql
-- im Ziel-SQL-Editor:
truncate storage.objects;
```
Dann dieses kleine Node-Skript (Quelle → Ziel, alle Buckets):
```js
// migrate-storage.mjs  →  node migrate-storage.mjs
import { createClient } from "@supabase/supabase-js";
const SRC = createClient("https://ffagjzkkzlywejzjfgue.supabase.co", "<SRC_SERVICE_ROLE_KEY>");
const DST = createClient("https://<NEU-REF>.supabase.co", "<DST_SERVICE_ROLE_KEY>");
const buckets = ["objekt-bilder", "objekt-dokumente", "reservierungen", "kunden-dokumente"];
for (const b of buckets) {
  const { data: list } = await SRC.storage.from(b).list("", { limit: 1000 });
  for (const f of list ?? []) {
    const { data: blob } = await SRC.storage.from(b).download(f.name);
    if (!blob) continue;
    await DST.storage.from(b).upload(f.name, blob, { upsert: true, contentType: f.metadata?.mimetype });
    console.log(b, f.name, "✓");
  }
}
```
> Hat ein Bucket Unterordner, das `list("")` rekursiv erweitern. Bei 15 Dateien i. d. R. flach.

## Schritt 5 — Edge-Functions deployen + Secrets
```bash
for fn in send-invite-email send-portal-link send-reservation-email \
          reservierungen-cron reset-demo-passwords seed-demo-users; do
  supabase functions deploy "$fn" --project-ref "$DST_REF"
done
```
Function-/Projekt-Secrets neu setzen (sind **nicht** im DB-Dump):
```bash
supabase secrets set --project-ref "$DST_REF" \
  RESEND_API_KEY="<...>" \
  OPENAI_API_KEY="<...>"
# ggf. weitere, die deine Functions lesen
```
`config.toml`-`verify_jwt`-Einstellungen wandern mit dem Repo-Deploy mit.

## Schritt 6 — pg_cron-Job neu anlegen (zeigt sonst aufs alte Projekt!)
Der Job `reservierungen-cron-daily` ruft die Edge-Function per `net.http_post` mit **alter** Projekt-URL + altem Service-Key. Auf der Quelle das `command` ansehen und im Ziel mit **neuer URL + neuem Key** neu schedulen:
```sql
-- Quelle: altes command lesen
select jobname, schedule, command from cron.job;

-- Ziel: neu anlegen (URL/Key auf das neue Projekt anpassen)
select cron.schedule('reservierungen-cron-daily', '0 2 * * *', $$
  select net.http_post(
    url := 'https://<NEU-REF>.supabase.co/functions/v1/reservierungen-cron',
    headers := '{"Authorization":"Bearer <NEU-SERVICE-ROLE-KEY>","Content-Type":"application/json"}'::jsonb
  );
$$);
```

## Schritt 7 — Auth-Konfiguration im Ziel-Dashboard
Wird **nicht** mit-gedumpt → manuell setzen (Auth → URL Configuration / Providers / Templates):
- **Site URL** + **Redirect-Allowlist** (emi-hub.de + Vercel-Preview-Domains) — sonst brechen Magic-Links/Invites.
- **E-Mail/SMTP**: ihr versendet über **Resend direkt aus Next.js** (nicht Supabase-SMTP) → meist nichts nötig; nur falls Supabase-Auth-Mails genutzt werden, Resend-SMTP eintragen.
- E-Mail-Templates (Invite/Magic-Link), falls angepasst.
- Hinweis: Der **JWT-Secret ist neu** → alle bestehenden Sessions werden ungültig, alle loggen sich einmal neu ein (unkritisch).

## Schritt 8 — App auf das neue Projekt umstellen
1. `supabase/config.toml` → `project_id = "<NEU-REF>"` (Commit).
2. **Vercel-Env (Production)** umstellen:
   - `NEXT_PUBLIC_SUPABASE_URL` → `https://<NEU-REF>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → neuer anon key
   - `SUPABASE_SERVICE_ROLE_KEY` → neuer service_role key
   - `CRON_SECRET` bleibt (App-seitig).
3. Falls CI/GitHub-Actions Keys nutzen → dort ebenfalls aktualisieren.
4. **Redeploy** der App.

## Schritt 9 — Verifizieren
```bash
# Zeilenzahlen Quelle vs. Ziel vergleichen (Beispiel)
psql "$SRC_DB" -c "select 'einheiten', count(*) from einheiten union all select 'kunden', count(*) from kunden union all select 'auth.users', count(*) from auth.users;"
psql "$DST_DB" -c "select 'einheiten', count(*) from einheiten union all select 'kunden', count(*) from kunden union all select 'auth.users', count(*) from auth.users;"
```
- Supabase **Advisors** (Security) auf dem Ziel laufen lassen → 0 ERROR (RLS intakt).
- App: Login (Demo-/echter User), `/objekte` lädt, eine Projekt-Detailseite + ein Storage-Bild lädt, eine Reservierung/Selbstauskunft testen.
- pg_cron: `select * from cron.job;` zeigt den neuen Job.

## Schritt 10 — Cutover & Cleanup
- Wartungsfenster schließen, Vercel-Cron wieder normal.
- **Altes Projekt 1–2 Wochen pausiert als Backup** behalten, dann löschen.
- Danach: Branching auf dem neuen Projekt aktivieren (siehe `docs/STAGING-PLAN.md`) und die **Repo-Migrationen gegen das neue Prod abgleichen** (Phase 2), damit Branches Prod 1:1 reproduzieren.

---

## Umzug in einen NEUEN ACCOUNT (nicht nur neue Org)
Für die Daten-Migration ändert sich **nichts** (Connection-String-basiert). Neu sind nur die Zugangsdaten + die Tool-Verbindungen:

| Wert | Quelle (neuer Account) | Wohin |
|---|---|---|
| Project Ref | Settings / URL | `.mcp.json` `--project-ref`, DB-Connection-Strings, `supabase link` |
| Personal Access Token `sbp_…` | Account → Access Tokens → Generate | `.mcp.json` `SUPABASE_ACCESS_TOKEN`, `supabase login --token` |
| anon + service_role key | Project Settings → API | Vercel-Env, Storage-Copy-Skript |
| DB-Passwort | Project Settings → Database | `$SRC_DB`/`$DST_DB` |

**MCP umstellen** (`.mcp.json` ist gitignored, lokal — nur Ref + Token tauschen), dann Claude Code neu starten / MCP reconnecten.
**CLI:** `supabase login` mit neuem Account (oder `--token <NEU-PAT>`), `supabase link --project-ref <NEU-REF>`.
**Reihenfolge:** erst migrieren+verifizieren (MCP zeigt noch auf alte Quelle) → dann `.mcp.json` + Vercel-Env auf neues Projekt → zuletzt alten PAT widerrufen + altes Projekt pausieren.
**claude.ai-Connector** (separate OAuth-Variante des Supabase-MCP): in claude.ai → Settings → Connectors neu mit dem neuen Account verbinden.

## Stolperfallen (kurz)
- **anon/service_role-Keys sind neu** — überall ersetzen (Vercel, Skripte, CI). Alte Keys funktionieren nicht mehr.
- **pg_cron-Job** zeigt nach dem Dump-Restore auf die **alte** URL/Key → Schritt 6 nicht vergessen.
- **Storage-Bytes** kommen NICHT mit dem DB-Dump — Schritt 4 (sonst 404 auf Bildern).
- **Auth Site-/Redirect-URLs** sind Dashboard-Config, nicht im Dump — sonst brechen Invites/Magic-Links.
- **Investagon-Bilder/Dokumente** sind externe CDN-URLs (Text) — funktionieren nach dem Umzug sofort weiter, ohne Storage-Copy.
- **Repo-Migrationen** bleiben unvollständig — das neue Prod ist aus dem **Dump** korrekt, aber für Branching müssen die Migrationen noch abgeglichen werden.

# QA-Bericht — V1-Features (2026-06-12)

> **Deployed 2026-06-12:** Commits `9c028c5..d263a5e` nach `main` gepusht →
> Vercel-Prod (objekt-pilot.vercel.app). Pre-Flight grün (Lint 0 Errors, 107
> Unit-Tests, Build ok); DB-Migrationen A/B bereits live. Post-Deploy verifiziert:
> `/login` → 200, `/dashboard` (unauth) → `307 → /login?redirect=%2Fdashboard`.

> QA-Pass über die V1-Kernmodule. Schwerpunkt: Unit-Tests der finanzkritischen
> reinen Logik, statische Regression (Lint/Build) und ein Security-Audit der
> Server-Action-Autorisierung + Supabase-Advisors.
> Getestete Features: PROJ-1, PROJ-2, PROJ-3, PROJ-4, PROJ-5, PROJ-7, PROJ-8,
> PROJ-9 (Team), PROJ-12, PROJ-13.

## Zusammenfassung

| Bereich | Ergebnis |
|---------|----------|
| ESLint (`npm run lint`) | ✅ keine Fehler |
| Production Build (`npm run build`) | ✅ erfolgreich |
| Unit-Tests (`npm test`) | ✅ **97/97 grün** (9 Dateien) |
| Supabase Security Advisors | 0 ERROR · 75 WARN (bekannte Tuning-Punkte) |
| Server-Action-Authz-Audit | **1 High**, 1 Low gefunden |
| E2E (Playwright) | ⚙️ Gerüst angelegt, unauth-Smoke grün (`tests/PROJ-1-auth.spec.ts`) — authed braucht Test-Creds/Staging |

**Produktionsreife-Empfehlung:** Bedingt READY. Die ausgelieferten V1-Module sind
fachlich/statisch solide; **vor weiterem Multi-Org-Rollout** sollte BUG-001
(Mandanten-Isolation bei Objekt-CRUD) geschlossen werden.

---

## 1. Automatisierte Tests (neu angelegt)

Co-located Unit-Tests für die reine, framework-unabhängige Kernlogik:

| Datei | Feature | Tests | Abdeckung |
|-------|---------|-------|-----------|
| `src/lib/bonitaet.test.ts` | PROJ-4 | 14 | Steuerstufen, Splittingtarif, Schritt-Kette, Clamping |
| `src/lib/kalkulation.test.ts` | PROJ-3/8 | 14 | KNK, Darlehen, Annuität, Tilgungsverlauf, Rendite, Guards |
| `src/lib/objekt-kosten.test.ts` | PROJ-12 | 16 | GrESt je Bundesland, Notar, Gebäudeanteil, KNK-Summe |
| `src/lib/objekte-filter.test.ts` | PROJ-3/12 | 9 | Volltext, Status, Preis/Fläche, Zimmer-Bucket, AND-Semantik |
| `src/lib/objekt-format.test.ts` | PROJ-3/12 | 11 | EUR/Zahl-Format, €/m², Adress-Dedupe |
| `src/lib/password.test.ts` | PROJ-1 | 8 | Passwort-Policy (Länge, Groß/Klein/Ziffer) |
| `src/lib/portal-finanzierung-hint.test.ts` | PROJ-7 | 10 | Status-Priorität, Legacy-Filter, Hint-Auswahl |
| `src/lib/branding.test.ts` | PROJ-13 | 13 | hex→RGB/OKLCH, Theme-CSS, Malformed-Guard |
| `src/lib/user-initial.test.ts` | PROJ-2 | 6 | Initial-Fallback-Kette, Uppercase |

Lauf: `npm test` → **97 passed (97)**.

### Während der Tests gefundene Auffälligkeiten
- Keine Logikfehler in den getesteten Modulen. Alle Invarianten (keine
  negativen Budgets/Darlehen, keine Division durch 0, monotone Tilgung,
  Clamping negativer Eingaben) werden eingehalten.

---

## 2. Security-Audit (Red Team)

> **Update 2026-06-12 — BUG-001 + BUG-002 behoben.** Neuer Guard
> `assertOrgAccess()` in `src/lib/actions/_org.ts`; alle Objekt-CRUD-Writes
> prüfen jetzt die Org-Zugehörigkeit (admin/support: Cross-Org per Konvention).
> `createProjekt` lehnt null-Org ab. Regressionstests:
> `src/lib/actions/_org.test.ts`. `npm test` → **107/107 grün**, Build grün.

### BUG-001 — Objekt-CRUD umgeht Mandanten-Isolation (High) — ✅ BEHOBEN
**Feature:** PROJ-3/PROJ-12/PROJ-13 · **Datei:** `src/lib/actions/objekte-crud.ts`

`createProjekt`, `updateProjekt`, `deleteProjekt`, `createEinheit`,
`updateEinheit`, `deleteEinheit` gaten ausschließlich per
`requireRole(...INTERNAL_ROLES)` und schreiben anschließend über den
**Service-Role-Admin-Client** (`createAdminClient`, umgeht RLS) **nur per `id`**
— ohne zu prüfen, ob das Ziel-Objekt zur Organisation des Aufrufers gehört.

**Auswirkung:** Ein interner Nutzer (admin/support/vp_l1–l3) aus Org A kann
Projekte/Einheiten **einer anderen Organisation B** ändern oder löschen, sofern
er die UUID kennt. `createEinheit` erbt sogar die `organisation_id` des
fremden Eltern-Projekts. Das hebelt die restriktive Org-RLS aus, die laut
PROJ-13 die Mandantentrennung sicherstellt.

**Belege für die korrekte Variante (zum Vergleich):**
- `actions/organisationen.ts` schreibt über den **authed Cookie-Client**
  (RLS-scoped) + expliziten owner/admin-Check.
- `actions/kunden.ts` → `activateKundenportal` ruft
  `assertCanManageKunde(supabase, actorId, id)` **vor** dem Admin-Write.

`objekte-crud.ts` fehlt genau dieser Row-/Org-Ownership-Check.

**Voraussetzungen / Einschränkung:** gültiges internes Konto **und** Kenntnis
einer fremden UUID **und** ≥2 reale Organisationen. Aktuell teils latent (PROJ-13
„In Progress"), wird aber beim Multi-Org-Betrieb sofort ausnutzbar.

**Empfohlene Behebung:** Vor jedem Admin-Write die `organisation_id` des
Zielobjekts laden und gegen `activeOrgId(session.supabase, userId)` prüfen
(bzw. Schreibpfad auf den authed RLS-Client umstellen, analog
`organisationen.ts`). Einheitliches Muster wie `assertCanManageKunde` einführen.

### BUG-003 — Middleware lief gar nicht (Root Cause) — ✅ BEHOBEN
**Feature:** PROJ-1/PROJ-2 · **Datei:** `middleware.ts` → **`src/proxy.ts`**

**Symptom:** Beim Aufruf einer geschützten Route ohne Session landete man auf
einem param-losen `/login` (`GET /dashboard` → `307 → /login`, ohne `?redirect`)
— der param-erhaltende Middleware-Redirect griff nie.

**Root Cause (per Instrumentierung verifiziert):** Die Middleware lag im
**Repo-Root** (`middleware.ts`), das Projekt nutzt aber ein **`src/`-Verzeichnis**
(`src/app/...`). Next.js erwartet die Datei dann unter `src/` — die Root-Datei
wurde **komplett ignoriert** (Marker-Header `x-mw` fehlte auf allen Routen).
Dadurch lief weder der Route-Guard **noch der Session-Refresh (`updateSession`)**
der Middleware; der Schutz kam allein aus dem RSC-Layout-`redirect("/login")`
(ohne Param).

**Fix:** Datei nach `src/` verschoben und gemäß Next-16-Konvention zu
**`src/proxy.ts`** (Export `proxy`) umbenannt (`middleware`-Dateiname ist
deprecated). Verifiziert: `GET /dashboard` → `307 → /login?redirect=%2Fdashboard`
(`x-mw: redirect`), `/login` → `200` (`x-mw: pass user=0`). Damit ist auch der
**Session-Refresh reaktiviert**. Regression: `tests/PROJ-1-auth.spec.ts` prüft
jetzt die Param-Erhaltung.

### BUG-002 — Unisolierter Insert bei fehlender aktiver Org (Low) — ✅ BEHOBEN
**Datei:** `src/lib/actions/_org.ts`, genutzt in `objekte-crud.ts`

`activeOrgId()` gibt bei fehlender aktiver Organisation `null` zurück; der
Kommentar dokumentiert „insert proceeds unisolated rather than failing".
`createProjekt` legt dann ein Projekt mit `organisation_id = null` an. Unter der
restriktiven RLS (`organisation_id = current_org_id()`) wird dieses Projekt für
**niemanden** mehr sichtbar (verwaistes Datum). Kein Datenleck, aber
Daten-/UX-Defekt. **Empfehlung:** Bei `null` den Insert ablehnen statt
unisoliert zu schreiben.

### Supabase Advisors (Security)
**0 ERROR · 75 WARN** — keine RLS-Lücke. Verteilung & Behandlung:
- 72× SECURITY-DEFINER-RPCs für `anon`/`authenticated` ausführbar (Lints
  0028/0029). **Analyse:** Der Großteil ist by-design — `authenticated` braucht
  EXECUTE für RLS-Policy-Auswertung (`current_org_id`, `can_*`, `*_sees_*`, …)
  oder Client-`.rpc()` (`is_descendant_of`, `submit_selbstauskunft`, `get_my_*`,
  `list_finanzierer_for_pool`, `add/remove_finanzierer_to_pool`). Diese **bleiben
  unangetastet**. **✅ Behoben:** 10 Trigger-/Event-Trigger-/Wartungsfunktionen
  (nie client-aufgerufen) → EXECUTE für `public/anon/authenticated` entzogen
  (Migration `20260612150000_harden_trigger_fn_execute_grants.sql`).
- 1× `public_bucket_allows_listing` (Bucket `objekt-bilder`) → **✅ Behoben:**
  Listing-Policy gedroppt (Migration
  `20260612150100_drop_objekt_bilder_public_listing_policy.sql`). Bucket bleibt
  `public`, App listet nie, aktuell 0 Objekte im Bucket → folgenlos verifiziert.
- 1× `extension_in_public` (`pg_net`) → **⏸️ zurückgestellt** (moderates Risiko
  durch Referenzen, niedriger Sicherheitswert).
- 1× `auth_leaked_password_protection` deaktiviert → **🔧 USER-Aktion** (nur per
  Dashboard setzbar): *Authentication → Passwords → „Leaked password
  protection" → on* (HaveIBeenPwned-Abgleich).

Beide Migrationen wurden gegen Prod (`ffagjzkkzlywejzjfgue`) angewandt und
verifiziert (RLS-Helfer wie `current_org_id` nachweislich unverändert).

### Positiv bestätigt
- Durchgängige **Zod-Eingabevalidierung** in allen Server Actions.
- Passwort-Policy serverseitig erzwungen (`passwordSchema`).
- Auth-Helfer (`requireUser`/`requireRole`/`getSessionUser`) sauber, per-Request
  gecached.
- Kein CSS-Injection-Risiko im Org-Branding: `buildOrgThemeCss` emittiert nur aus
  hex-validierten Werten (`^#[0-9a-fA-F]{6}$`).
- Kunden-/Reservierungs-Writes laufen überwiegend RLS-scoped (authed Client).

---

## 3. Nicht abgedeckt / Gaps

- **E2E (Playwright) — Gerüst steht.** `tests/PROJ-1-auth.spec.ts` +
  `tests/helpers/auth.ts` + `tests/README.md` angelegt; **5 unauth-Smoke-Tests
  grün** (Login-Render, Magic-Link-Tab, Route-Guards, Public-Route). Die
  **authentifizierten** Specs (`login()`-Helper, Deep-Link-Redirect) sind
  `test.skip` bis `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD` gesetzt sind. **Offen für
  Write-Path-Abdeckung:** dediziertes **Staging**-Supabase-Projekt + Seed +
  Test-Logins je Rolle (admin, vp_l1–l3, finanzierer, kunde) — aktuell liefe
  authed-E2E gegen Prod. Details in `tests/README.md`.
- **Manuelles Cross-Browser/Responsive-Testing** (Chrome/FF/Safari · 375/768/1440)
  nicht durchgeführt — kein Browser-Treiber in dieser Umgebung.
- **PROJ-6 Finanzierungen / KI** = V2, ausgegraut/zurückgestellt → nicht getestet.
- **PROJ-10 Investagon-Sync** (synthetische Daten, In Progress) → nicht im
  V1-QA-Scope.

---

## Priorisierung (Vorschlag)
1. ~~**BUG-001** (High) — Org-Ownership-Checks in `objekte-crud.ts`.~~ ✅ behoben.
2. ~~**BUG-002** (Low) — `null`-Org-Insert ablehnen.~~ ✅ behoben.
3. ~~Advisor-Tuning (WARN): Trigger-Fn-Grants + Bucket-Listing.~~ ✅ behoben
   (2 Migrationen, gegen Prod angewandt). Offen: **Leaked-Password-Protection
   (USER-Dashboard-Aktion)** und `pg_net`-Schema (zurückgestellt).
4. ~~Infra: `npm run lint` defekt (`next lint` in Next 16 entfernt).~~ ✅ behoben
   (ESLint-Flat-Config, `eslint .`).
5. E2E-Infrastruktur: ~~Gerüst~~ ✅ angelegt (unauth-Smoke grün). Offen:
   **Staging-Supabase + Seed + Test-Logins je Rolle** für authed/Write-Path-E2E.
6. ~~BUG-003: Login-Guard verwirft Redirect-Ziel.~~ ✅ behoben — Root Cause war
   die fehlplatzierte Middleware (`middleware.ts` im Root statt `src/`); jetzt
   `src/proxy.ts`. Reaktiviert zugleich den Middleware-Session-Refresh.

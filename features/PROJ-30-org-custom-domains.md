# PROJ-30 — Org-Custom-Domains

**Status:** In Progress (Fundament gelegt)
**Created:** 2026-06-22
**Erweitert:** PROJ-13 (Multi-Tenant Organisationen)

## Ziel
Die App läuft kanonisch auf einer **neutralen Vercel-URL**. Jede **Organisation**
kann eine **eigene Domain** verbinden; Requests auf dieser Domain liefern die
**komplette, auf die Org gebrandete & gescopte App** aus. `emi-hub.de` ist die
Domain der Haupt-Org „Erfolg mit Immobilien".

## Entscheidungen (mit Nutzer, 2026-06-22)
- **Domain-Scope:** komplette org-gebrandete App (Login + internes Tool + Portal). Vercel-URL = neutraler Default-Einstieg / Org-Switcher.
- **Provisioning:** automatisch über die **Vercel-Domains-API** (Self-Service: Org-Admin gibt Domain ein → App fügt sie zum Vercel-Projekt hinzu, zeigt DNS-Records, pollt Verify-Status).

## Architektur
1. **DB** (`organisationen`): `domain text` (unique, case-insensitive über `lower(domain)`), `domain_verified boolean`. Migration `20260622120000_org_custom_domains.sql`. ✅
2. **Host→Org-Auflösung:** im **Root-Layout** (Server Component) per `headers().get('host')`; `www.`-Präfix wird normalisiert. Treffer → diese Org liefert Branding + ist der Org-Kontext. **Kein Eingriff in die Auth-Middleware** (`proxy.ts`) → kein Auth-Flow-Risiko. Cross-Request-Cache (`unstable_cache`, analog `getOrgBrandingCached`) hält den Host→Org-Lookup vom Hot-Path fern.
3. **Vercel-Domains-API-Client** (`src/lib/vercel/domains.ts`): `addDomain`, `getDomainConfig` (liefert benötigte DNS-Records + verified-Status), `removeDomain`. Nutzt `VERCEL_API_TOKEN` + `VERCEL_PROJECT_ID`/`VERCEL_TEAM_ID` (aus `.vercel/project.json`).
4. **Server-Actions** (`src/lib/actions/domains.ts`): `connectOrgDomain(domain)` (Rollen-Gate org-admin/owner, `assertOrgAccess`; ruft Vercel-add, persistiert `domain`), `getOrgDomainStatus()` (DNS-Records + verified live), `disconnectOrgDomain()`.
5. **Einstellungen-UI:** Karte „Eigene Domain" — Eingabe, DNS-Anweisungen (CNAME/A), Verify-Status (Pending → Verified), Trennen.
6. **Org-Erstellung:** vorhandener Create-Org-Flow (`createOrganisation`) bleibt; Domain wird separat nach Anlage verbunden.
7. **Neutralisierung Vercel-URL:** Marketing/Branding fällt ohne Host-Treffer auf neutrales Default-Branding zurück (kein hartes emi-hub).

## Voraussetzung (Nutzer)
- **Vercel-API-Token** (Account → Settings → Tokens, Scope auf Team `team_yinicbS1D8wfxARW7jjjpPGK`) → wird als `VERCEL_API_TOKEN` in Vercel-Env gesetzt. Ohne ihn funktioniert der Self-Service-Add nicht (Host-Auflösung + manuelles Domain-Hinzufügen gehen auch ohne).

## Akzeptanzkriterien
- [ ] Org-Admin kann in Einstellungen eine Domain eingeben; App fügt sie in Vercel hinzu und zeigt die DNS-Records.
- [ ] Nach DNS-Setup wird der Status „Verified" angezeigt; `domain_verified=true`.
- [ ] Request auf einer verbundenen Domain zeigt die App auf die richtige Org gebrandet/gescoped.
- [ ] Vercel-Default-URL zeigt neutrales Branding + Org-Switcher.
- [ ] `emi-hub.de` → „Erfolg mit Immobilien" (Bestand). ✅ DB-Mapping gesetzt.
- [ ] Eine Domain kann nur einer Org gehören (unique).

## Fortschritt
- ✅ DB-Migration + emi-hub→Haupt-Org-Mapping (live auf Prod `gfbokqnjwmkcpcundtfs`).
- ✅ Vercel-Domains-API-Client + `VERCEL_API_TOKEN`/`PROJECT_ID`/`TEAM_ID` in Vercel-Env (Token verifiziert).
- ✅ Host→Org-Auflösung (`resolveOrgForHost`) im Root-Layout; brandet auch ausgeloggt.
- ✅ Server-Actions (`connectOrgDomain`/`getOrgDomainStatus`/`verifyOrgDomain`/`disconnectOrgDomain`, org-admin-gegated).
- ✅ Einstellungen → DomainCard (verbinden, DNS-Records, Verify-Status, trennen).
- ✅ App generisch „Objekt Pilot" (Metadata, Chrome, Landing, Logo-Mark); neutrale URL = SaaS-Landing.
- ✅ OrgLanding auf Org-Domain: gebrandet + Rollen-Login (Kunde/Finanzierer/Vertriebspartner → `/login` mit Redirect-Hint). `/` und `/start` host-aware.
- ✅ **Host-Pinning der Active-Org** (`alignActiveOrgToHost` im `(app)`-Layout): Daten-Scoping folgt der Domain für Org-Mitglieder (RLS unverändert; nur Mitglieder, Write nur bei Mismatch).
- **Live deployed** (Commits `faef0d4`/`d5b3465`/`353456a`/`d8c0da4` → emi-hub.de + objekt-pilot.vercel.app, beide Landings verifiziert).
- **Offen:** eigenes echtes Objekt-Pilot-Logo (aktuell SVG-Mark); Finanzierer-Active-Org-Edgecase (Nicht-Mitglieder werden bewusst nicht gepinnt).

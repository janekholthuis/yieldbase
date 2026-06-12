# PROJ-13 — Multi-Tenant: Organisationen mit eigenem Branding

> Das „Erfolg mit Immobilien"-Branding wurde per Revert entfernt; der Objektpilot-Look (Navy + Gold) ist jetzt nur noch **Default/Fallback**. Künftig hat **jede Organisation ihr eigenes Branding**, und Vertriebspartner & Finanzierer können zwischen Organisationen wechseln.

## Ziel (aus der Anforderung)
- **Jeder SaaS-Kunde** (eine Vertriebsfirma) legt seine **eigene Organisation** an: Name, Logo, Farben.
- **Vertriebspartner & Finanzierer** können Mitglied **mehrerer** Organisationen sein und über die **Einstellungen schnell wechseln**.
- Beim Wechsel ändert sich (mind.) das Branding — optional auch der Datenkontext (siehe Phase 13.2).

## Ist-Stand
- Branding existiert heute nur **pro Profil** (`profiles.branding_color`, `branding_logo_url`) — wird in Exposé/Präsentation genutzt.
- Keine `organisationen`-Tabelle, kein `organisation_id` auf den Domänentabellen. Hierarchie heute über `vp_hierarchy`.

## Datenmodell (neu)
| Tabelle | Spalten |
|---|---|
| `organisationen` | id, name, slug (unique), logo_url, primary_color, accent_color, settings (jsonb), owner_id → profiles, created_at, updated_at |
| `organisation_members` | organisation_id, user_id, rolle (`owner`/`admin`/`member`), created_at · **PK (organisation_id, user_id)** → Many-to-Many, damit VP/Finanzierer in mehreren Orgs sein können |
| `profiles.active_organisation_id` | nullable FK → organisationen (persistiert die aktuelle Auswahl) |

## Phasen

### Phase 13.1 — Org-Grundgerüst + Branding + Switcher  *(sichtbar, leichtgewichtig)*
1. **Migration:** `organisationen` + `organisation_members` + `profiles.active_organisation_id`. Eine **Default-Org** anlegen, alle bestehenden User als Member eintragen, `active_organisation_id` setzen. RLS: Mitglieder sehen ihre Orgs; Owner/Admin dürfen ihre Org bearbeiten.
2. **Server-Actions:** `createOrganisation`, `updateOrganisationBranding`, `listMyOrganisations`, `switchOrganisation(orgId)` (setzt `active_organisation_id`), `inviteToOrganisation` / `joinOrganisation`.
3. **Dynamisches Theming:** Root-Layout liest die aktive Org (Server Component) → injiziert die Org-Farben als CSS-Variablen (`--primary`, `--accent`, `brand-*`) und das Org-Logo, überschreibt die globals-Defaults. Kein Org-Branding gesetzt → Objektpilot-Default.
4. **Logo-Komponente:** rendert das Org-Logo (Bild) statt des fixen SVG; Fallback = Objektpilot-SVG.
5. **UI:**
   - **Org-Switcher** im Topbar-/Sidebar-Menü (nur sichtbar bei >1 Mitgliedschaft) + in den **Einstellungen**.
   - **Branding-Editor** (Owner/Admin): Name, Logo-Upload (Storage), Primary-/Accent-Farb-Picker, Live-Preview.
   - **Org-Erstellungs-Flow** („Neue Organisation anlegen").

### Phase 13.2 — Daten-Mandantenfähigkeit  *(schwer — separater, sorgfältiger Schritt)*
1. `organisation_id` auf tenant-scoped Tabellen: `projekte`, `kunden`, `vp_hierarchy`, `invites`, `provisionen`, `finanzierungs_cases`, `reservierungen`, … (`einheiten` erbt über `projekt_id`).
2. **RLS-Umbau:** Zugriff zusätzlich nach Org-Mitgliedschaft **und aktiver Org** scopen — Helper `current_org_id()` (aus `profiles.active_organisation_id`) + `is_member_of(org_id)`. **Größter & riskantester Teil.**
3. **Daten-Migration:** bestehende 222 Projekte / 2108 Einheiten / Kunden der Default-Org zuordnen.
4. Org-Wechsel ändert dann den **Datenkontext**, nicht nur die Optik.

## Offene Entscheidungen (vor dem Bau klären)
- **Tiefe:** Nur Branding (13.1) zuerst — oder direkt volle Daten-Trennung (13.2)? Letzteres ist der große RLS-Umbau.
- **Wer darf Orgs anlegen?** Vertriebsleiter/Admin — oder Self-Service-Signup für neue Kunden?
- **Default-Org-Name** für die Migration der Bestandsdaten?
- **Farbumfang:** nur Primary + Accent pro Org (reicht fürs Theming) oder volle Palette?
- **Mitgliedschaft:** per Einladung (wie heute `invites`) oder per Org-Code/Link zum Beitreten?

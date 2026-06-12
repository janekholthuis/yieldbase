# PROJ-14 — „Neue Objekte"-Feed (Partner-Feed)

**Status:** Planned (Refine 2026-06-12) · **V-Scope:** V2 — vorgemerkt, im
Front-End **ausgegraut** (Nav `comingSoon: true`), Code wird vorerst nicht gebaut.
**Created:** 2026-06-12

> ⚠️ Diese Spec ist bewusst nur **geplant**. Nicht implementieren, bis der V1-Kern
> (Objekte-Projekt-Detail, Reservierungen, Kunden) steht und das Feature
> freigegeben wird.

## Vision
Ein chronologischer **Feed**, in den neue/aktualisierte Objekte als Beiträge
„gepusht" werden — analog zum Investagon „PartnerHub → Feed": kurze
Schlagzeilen-Posts (z. B. *„+++ 6,67 % Abschreibung und gute Rendite in Top-Lage
von Magdeburg +++"*) mit Datum, Link zum Projekt und „Mehr lesen". Dient
Vertriebspartnern als zentraler Neuheiten-/Highlight-Kanal.

## Target Users
- **Vertriebspartner (VP L1–L3), Vertriebsleiter:** sehen neue Objekte/Highlights
  gebündelt, ohne die ganze Objektliste zu scannen.
- **Admin/Support:** erstellen/kuratieren Feed-Beiträge (manuell und/oder
  automatisch beim Anlegen/Freischalten eines Projekts).

## User Stories
- Als VP möchte ich einen Feed neuer Objekte sehen, um Vertriebs-Highlights schnell zu erfassen.
- Als VP möchte ich aus einem Beitrag direkt zum Projekt springen.
- Als Admin möchte ich Beiträge anlegen (Titel, Text, Verknüpfung zu einem Projekt, Datum).
- Als Admin möchte ich, dass beim Freischalten eines neuen Projekts optional automatisch ein Feed-Beitrag entsteht.

## Akzeptanzkriterien (Entwurf)
- [ ] Nav-Eintrag **„Neue Objekte"** erscheint **ausgegraut/nicht navigierbar**
      (V2-Gating wie Finanzierungen/Provisionen, `comingSoon: true` in
      `src/lib/navigation.ts`). Kein aktiver Link bis Freigabe.
- [ ] Feed-Seite (`/neue-objekte`) listet Beiträge chronologisch (neueste zuerst).
- [ ] Beitrag = Titel, Datum/Zeit, optionaler `projekt_id`-Link („Link zum Projekt"),
      Textauszug + „Mehr lesen" (Detail/Expand).
- [ ] Suche + Sortierung (wie Investagon-Feed: Suchfeld + Sortieren-Dropdown).
- [ ] Beitrag mit `projekt_id` verlinkt auf die Projekt-Detailseite
      (`/objekte/projekt/[projektId]`, siehe `docs/OBJEKTE-PROJEKT-DETAIL-PLAN.md`).
- [ ] Org-Isolation: Beiträge sind organisations-gescoped (Multi-Tenant, PROJ-13).
- [ ] RLS: interne Rollen lesen; nur Admin/Support schreiben.

## Datenmodell (Entwurf — noch nicht migriert)
Tabelle `feed_posts`:
- `id uuid pk`
- `organisation_id uuid` (Org-Isolation, wie projekte/einheiten)
- `titel text`
- `inhalt text` (Markdown/Plaintext)
- `projekt_id uuid null` (optionaler Deep-Link)
- `published_at timestamptz`
- `created_by uuid`, `created_at timestamptz`
- RLS: SELECT interne Rollen derselben Org; INSERT/UPDATE/DELETE Admin/Support.
- Index auf `(organisation_id, published_at desc)`.

## Out of Scope (V2-Erstausbau)
- Kommentare/Reaktionen, Push-Benachrichtigungen, E-Mail-Digest.
- Automatischer Auto-Post beim Projekt-Anlegen (später; erst manuell).
- Kunden-/Finanzierer-Sicht auf den Feed (zunächst nur interne Rollen).

## Dependencies
- PROJ-3/PROJ-12 Objekte (Projekt-Detailseite als Link-Ziel).
- PROJ-13 Multi-Tenant (Org-Isolation der Beiträge).
- PROJ-2 App-Shell (Nav-Gating `comingSoon`).

## Offene Fragen
- [ ] Eigener Top-Level-Nav-Eintrag „Neue Objekte" oder Sub-Tab unter „Objekte"?
      (Vorbild zeigt eigenen Bereich → Tendenz Top-Level, ausgegraut.)
- [ ] Beiträge rein manuell oder (später) Auto-Post-Regeln?
- [ ] Sichtbar auch für Finanzierer/Kunden? (Default: nur intern.)

## Decision Log
- 2026-06-12 — Feature als **V2 vorgemerkt**, Nav-Eintrag ausgegraut
  (`comingSoon`), Code nicht gebaut (User: „Plane ein Projekt, noch nicht bauen").

# Objekte-Revision Runde 2 — Projekt-Detailseite + Status-Taxonomie

> **Status:** Geplant (Refine 2026-06-12, PROJ-3/PROJ-12). Noch nicht gebaut.
> Auslöser: User-Feedback — klare Trennung Projekt/Wohnhaus (mehrere Einheiten)
> vs. einzelne Einheit; Projekt-Detail soll Kaufpreisliste + Einheiten-Anzahl +
> Verkaufsstatus zeigen; Status-Werte an Investagon-Vorbild angleichen.

## Ist-Zustand (bereits vorhanden)
- Datenmodell trennt `projekte` ⟶ `einheiten` (1:n).
- **Liste aggregiert MFH bereits** zu `ProjektCard` (Preis-/Zimmer-/Größen-/
  €-m²-/Kaltmiete-/Rendite-Range, Baujahr, AfA, Anlageklasse, Bauträger, Ort);
  `etw_einzeln` rendert als einzelne `ObjektCard`. Siehe
  `src/components/objekte/ObjekteListView.tsx` (`groupForGrid`) + `ProjektCard.tsx`.
- `getProjektDetail(projektId)` im Data-Layer existiert (lädt Projekt + alle
  Einheiten + Bilder + Dokumente) — **wird aber nirgends gerendert**.
- **Lücke:** keine Projekt-Detailseite. `ProjektCard` verlinkt notdürftig auf die
  erste Einheit (`/objekte/<firstUnitId>`, TODO in `ProjektCard.tsx:71-74`) →
  Klick auf ein Projekt landet auf einer Einzel-Einheit statt auf dem Projekt.

---

## Teil A — Status-Taxonomie (Entscheidung: strikt 6 Werte)

**Ziel-Status:** `Frei · Auf Anfrage · Reserviert · Notarvorbereitung · Notartermin · Verkauft`

**Mapping vom aktuellen Enum (`einheit_status`):**

| Alt (Enum-Wert) | Neu (Enum-Wert) | Aktion |
|---|---|---|
| `verfuegbar` | `frei` | RENAME VALUE + Label „Frei" |
| — | `auf_anfrage` | NEU (ADD VALUE), Label „Auf Anfrage" |
| `reserviert` | `reserviert` | unverändert |
| `kaufvertrag_bestellt` | `notarvorbereitung` | RENAME VALUE + Label „Notarvorbereitung" |
| `notartermin` | `notartermin` | unverändert |
| `verkauft` | `verkauft` | unverändert |
| `in_finanzierung` | → `reserviert` | Zeilen migrieren, Wert stilllegen |
| `abgebrochen` | → `frei` | Zeilen migrieren, Wert stilllegen |

**⚠️ Technische Einschränkung (Postgres):** `ALTER TYPE … RENAME VALUE` und
`ADD VALUE` gehen problemlos. **Enum-Werte entfernen geht NICHT direkt** —
Optionen: (a) Zeilen umziehen und die Alt-Werte (`in_finanzierung`,
`abgebrochen`) als ungenutzt belassen, oder (b) den Enum-Typ sauber neu
aufbauen (neuen Typ anlegen, Spalte casten, alten Typ droppen). Empfehlung:
**(b) in einer dedizierten Migration**, damit das Enum exakt 6 Werte hat —
erfordert Anfassen aller abhängigen Objekte (Trigger, Defaults, Policies).

### Betroffene Stellen (Migration + Code)
- **DB:** Enum-Typ `einheit_status`; Default von `einheiten.status`
  (`verfuegbar` → `frei`); Trigger `sync_einheit_status_from_reservierung`
  (referenziert Status-Werte); evtl. RLS-Policies/Views mit Status-Bezug.
- **Reservierungs-Sync:** Reservierung anlegen → Einheit `reserviert`;
  Ablauf/Storno → zurück auf `frei`. Mapping prüfen.
- **Code:** `src/lib/data/objekte.ts` (`EinheitStatus`),
  `src/lib/objekt-format.ts` (`STATUS_LABELS`, `STATUS_BADGE_CLASS`),
  `src/lib/status-colors.ts`, `src/components/objekte/ObjekteFilterSidebar.tsx`
  (`ALL_STATUSES`), `src/lib/actions/objekte-crud.ts` (`einheitStatusEnum` Zod
  + Default `"verfuegbar"`), `src/lib/objekte-filter.ts`,
  `src/lib/supabase/types.ts` (regenerieren).
- **Tests:** `src/lib/objekte-filter.test.ts` etc. auf neue Werte anpassen.

---

## Teil B — Projekt-Detailseite

**Route:** `/objekte/projekt/[projektId]` (statischer Segment „projekt" kollidiert
nicht mit der bestehenden dynamischen Einheiten-Route `/objekte/[einheitId]`).
`ProjektCard` verlinkt künftig hierher statt auf die erste Einheit. Klick auf
eine Einheit in der Kaufpreisliste → bestehende Einheiten-Detailseite
`/objekte/[einheitId]`.

**Inhalt der Seite** (rendert `getProjektDetail`):
1. **Projekt-Header:** Name/Adresse, Bauträger, Baujahr, Anlageklasse, Cover +
   Galerie, Ranges (wie auf der Karte), Dokumente.
2. **Verkaufsstatus-Breakdown** (2. Screenshot „Verkaufsstatus"): Tabelle mit
   Zeilen `Frei · Auf Anfrage · Reserviert · Notarvorbereitung · Notartermin ·
   Verkauft · Gesamt`, Spalten **Einheiten (Anzahl)** und **% vom Gesamt**.
   Reine Aggregation über `projekt.einheiten` — als wiederverwendbare Komponente
   `VerkaufsstatusTabelle`.
3. **Kaufpreisliste:** Tabelle aller Einheiten — Wohnungsnummer, Etage, Zimmer,
   Wohnfläche, Kaufpreis, €/m², Kaltmiete, Bruttorendite, Status-Badge.
   Sortier-/Filterbar; Zeile klickbar → Einheiten-Detail.
4. **Einheiten-Anzahl** prominent (z. B. „4 Einheiten · 4 frei").

**Edge Cases:** Projekt ohne Einheiten (leere Liste + Hinweis); `etw_einzeln`
(1 Einheit) — Karte zeigt weiterhin Einzel-Einheit, Projekt-Detail optional;
Status-% bei 0 Einheiten (kein Division-durch-0).

---

## Out of Scope (dieser Runde)
- Mapbox-Kartenansicht (weiterhin offen, separater Punkt).
- Der „Neue Objekte"-Feed → eigene Feature-Spec `features/PROJ-14-neue-objekte-feed.md`.

## Offene Punkte
- [ ] Enum-Cleanup-Strategie final: Werte stilllegen (a) vs. Typ neu aufbauen (b).
- [ ] Reservierungs-Status-Sync nach Umbenennung verifizieren (E2E).
- [ ] Soll `etw_einzeln` ebenfalls eine Projekt-Detailseite bekommen oder direkt
      die Einheiten-Detailseite bleiben? (Empfehlung: direkt Einheit.)

## Decision Log
- 2026-06-12 — **Status strikt auf 6 Werte** reduziert (User). `in_finanzierung`
  → `reserviert`, `abgebrochen` → `frei` migrieren; Storno-Status entfällt.
- 2026-06-12 — Projekt-Detailseite unter `/objekte/projekt/[projektId]`,
  Einheiten-Detail bleibt `/objekte/[einheitId]`.
- 2026-06-12 — Listen-Aggregation/Ranges sind bereits implementiert (kein Neubau).

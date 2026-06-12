# Struktur-Audit — Entitäten-Diagramm vs. bestehendes Supabase-Schema

> Abgleich des von dir gelieferten Domänen-Diagramms mit dem Live-Schema (Projekt `ffagjzkkzlywejzjfgue`, 24 Tabellen). Ergebnis: **Diagramm ist zu ~85 % abgedeckt.** Zwei echte Lücken, beide optional.

## Abdeckung

| Diagramm-Entität | Im Schema | Status |
|---|---|---|
| **Objekte** | `projekte` + `einheiten` | ✅ vollständig |
| **Objektdaten (technisch/steuerlich)** | `einheiten` (afa_satz, hausgeld_*, instandhaltungsruecklage, grundstueckswert_anteil, kalkulation jsonb …) | ✅ |
| **Dokumente (Objekt)** | `objekt_dokumente` (+ `objekt_bilder`) | ✅ |
| **Individuelles Exposé** | `objekt_dokumente` (kategorie `expose`) + Exposé-PDF-Generator | ✅ (PDF-Generator noch zu portieren) |
| **Status von Einheit** (frei/reserviert/verkauft) | `einheiten.status` enum (`verfuegbar`, `reserviert`, `in_finanzierung`, `kaufvertrag_bestellt`, `notartermin`, `verkauft`, `abgebrochen`) | ✅ (sogar feiner) |
| **Provision** | `provisionen` + `vp_hierarchy.commission_rate` | ✅ |
| **Vertrieb / Vertriebsleiter / Vertriebspartner** | `user_roles` (Rollen) + `vp_hierarchy` | ✅ |
| **Untervertriebe** | `vp_hierarchy.parent_vp_id` (Hierarchie L1–L3) | ✅ |
| **Anleger** | `kunden` | ✅ |
| **Persönliche Daten (Anleger)** | `kunden` Felder + `kunden.persoenliche_daten` (jsonb) | ✅ |
| **Dokumente (Anleger)** | `kunden_dokumente` | ✅ |
| **Bank** | `finanzierungs_cases` + Rolle `finanzierer` + Finanzierer-Pool (RPCs) | ✅ (Bank = Finanzierer) |
| **Projektentwickler** | `projekte.bautraeger` (nur Textfeld) | ⚠️ Lücke (s. u.) |
| **Datenraum** | — (verteilt auf `kunden_dokumente` / `objekt_dokumente` / `finanzierungs_cases`) | ⚠️ Lücke (s. u.) |

## Lücke 1 — Projektentwickler als eigene Entität
Aktuell ist der Projektentwickler nur ein **Textfeld** `projekte.bautraeger`. Im Diagramm ist er ein eigener Knoten, der mit mehreren Objekten verbunden ist.

**Wenn** Entwickler verwaltbar sein sollen (eigene Kontaktdaten, mehrere Projekte, Auswertung pro Entwickler), empfiehlt sich:
```sql
create table projektentwickler (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ansprechpartner text, email text, telefon text,
  created_at timestamptz default now()
);
alter table projekte add column projektentwickler_id uuid references projektentwickler(id);
-- Migration: bestehende projekte.bautraeger-Werte in projektentwickler überführen.
```
**Sonst** (nur Anzeige des Namens) → aktuelles Textfeld reicht.

## Lücke 2 — Datenraum (Bank ↔ Anleger)
Das Diagramm zeigt einen **Datenraum**, der Anleger-Unterlagen + Exposé + Einheit-Status bündelt und der **Bank** zugänglich macht (für die Finanzierungsprüfung). Aktuell gibt es Dokumente getrennt (`kunden_dokumente`, `objekt_dokumente`) und `finanzierungs_cases`, aber **keinen pro-Fall gebündelten, bank-sichtbaren Dokumentenraum**.

**Empfehlung** (schließt die Lücke sauber):
```sql
create table finanzierungs_case_dokumente (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references finanzierungs_cases(id) on delete cascade,
  dokument_quelle text check (dokument_quelle in ('kunde','objekt','upload')),
  kunden_dokument_id uuid references kunden_dokumente(id),
  objekt_dokument_id uuid references objekt_dokumente(id),
  storage_path text, dateiname text, kategorie text,
  freigegeben_fuer_bank boolean default true,
  created_at timestamptz default now()
);
-- RLS: der zugewiesene finanzierer (über finanzierungs_cases.finanzierer_id) darf SELECT.
```
Damit wird „Datenraum" zur Verbindung Anleger-Dokumente → Fall → Bank, genau wie im Diagramm.

## Empfehlung
Beide Lücken sind **optional** und blockieren den Vertriebs-Kernfluss nicht. Vorschlag: nach der Investagon-Integration entscheiden — Investagon liefert evtl. Projektentwickler-Daten mit, was Lücke 1 ohnehin beeinflusst.

_Hinweis: Schema wurde NICHT verändert — dies ist nur die Analyse. Migrationen lege ich auf Wunsch an._

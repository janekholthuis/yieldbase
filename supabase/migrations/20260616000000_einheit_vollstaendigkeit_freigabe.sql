-- PROJ-21 — Einheiten-Vollständigkeit + Freigabe-Gate
--
-- Adds a publication/quality state (freigabe_status) orthogonal to the sales
-- `status` enum, plus the additional data fields the customer requires per unit.
-- Purely additive: existing rows backfill via defaults, so this is safe on prod.
-- No RLS change — new columns inherit the existing einheiten policy.

create type public.einheit_freigabe_status as enum
  ('entwurf', 'in_bearbeitung', 'freigegeben');

alter table public.einheiten
  -- Publication / quality gate (default: every (existing) unit starts as Entwurf)
  add column freigabe_status public.einheit_freigabe_status not null default 'entwurf',
  add column freigegeben_at timestamptz,
  -- Kaufpreis-Aufteilung (kaufpreis bleibt der maßgebliche GESAMT-Wert für die
  -- Kalkulations-Engine; diese Felder sind informativ. stellplatz_preis existiert.)
  add column kaufpreis_wohnung numeric,
  add column kaufpreis_moebel numeric,
  -- Instandhaltungsrücklage GESAMT (Bestandsspalte instandhaltungsruecklage ist monatlich)
  add column instandhaltungsruecklage_gesamt numeric,
  -- Renovierungsaufstellung der Gewerke: [{ gewerk: text, jahr: int }]
  add column renovierungen jsonb not null default '[]'::jsonb,
  -- Lage der Wohnung im Haus, z. B. "EG rechts" (etage bleibt numerisch)
  add column lage_im_haus text,
  -- KI-Felder (werden in PROJ-22 generiert; Spalten jetzt anlegen)
  add column tags text[] not null default '{}',
  add column standort_highlights text;

create index if not exists einheiten_freigabe_status_idx
  on public.einheiten (freigabe_status);

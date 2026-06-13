-- ============================================================================
-- ENTWURF (noch NICHT angewendet) — Fillout-Nachbau: Selbstauskunft & Reservierung
-- PROJ-7 / PROJ-5. Spiegelt das bestehende `kunden`-Zugriffsmodell (RLS).
-- Erst nach User-Freigabe via mcp apply_migration ausführen.
-- ============================================================================

-- 1) selbstauskuenfte — 1:1 zu kunden, vollständiger Formularzustand ----------
create table if not exists public.selbstauskuenfte (
  id                    uuid primary key default gen_random_uuid(),
  kunde_id              uuid not null references public.kunden(id) on delete cascade,
  organisation_id       uuid references public.organisationen(id),
  status                text not null default 'entwurf'
                          check (status in ('entwurf','eingereicht')),
  step                  smallint not null default 0,
  mitantragsteller      boolean not null default false,

  -- Auswertungs-/Bonitätsspalten (gespiegelt aus `daten` beim Einreichen)
  einnahmen_summe_monat numeric,
  vermoegen_summe       numeric,
  ausgaben_summe_monat  numeric,
  kv_status             text,
  beschaeftigung        text,

  -- vollständiger, rehydrierbarer Formularzustand (Haupt + Mitantragsteller)
  daten                 jsonb not null default '{}'::jsonb,

  -- Unterschrift + Bestätigung
  ort                   text,
  datum                 date,
  datenschutz_bestaetigt boolean not null default false,
  signatur_haupt_url    text,
  signatur_mit_url      text,
  submitted_at          timestamptz,

  -- Audit (DSGVO/Beweis)
  ip                    inet,
  user_agent            text,

  -- CRM / versteckt (Close.io) — nie im UI gezeigt, für späteren Sync
  close_lead_id         text,
  close_opportunity_id  text,
  berater_vorname       text,
  berater_nachname      text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (kunde_id)
);

create index if not exists idx_selbstauskuenfte_kunde on public.selbstauskuenfte(kunde_id);
create index if not exists idx_selbstauskuenfte_org   on public.selbstauskuenfte(organisation_id);

drop trigger if exists trg_selbstauskuenfte_touch on public.selbstauskuenfte;
create trigger trg_selbstauskuenfte_touch
  before update on public.selbstauskuenfte
  for each row execute function public.touch_updated_at();

-- 2) selbstauskunft_immobilien — wiederholbare Subform ------------------------
create table if not exists public.selbstauskunft_immobilien (
  id                 uuid primary key default gen_random_uuid(),
  selbstauskunft_id  uuid not null references public.selbstauskuenfte(id) on delete cascade,
  objektart          text,           -- z. B. ETW, EFH, MFH, Gewerbe
  adresse            text,
  verkehrswert       numeric,
  restdarlehen       numeric,
  mieteinnahme_monat numeric,
  eigennutzung       boolean,
  daten              jsonb not null default '{}'::jsonb,  -- Reserve für weitere Felder
  created_at         timestamptz not null default now()
);
create index if not exists idx_sa_immobilien_parent
  on public.selbstauskunft_immobilien(selbstauskunft_id);

-- 3) reservierungen — fehlende Fillout-Felder (Hybrid: typed + jsonb) ---------
alter table public.reservierungen
  add column if not exists steuer_id              text,
  add column if not exists staatsangehoerigkeit   text,
  add column if not exists antragsteller_iban     text,   -- Antragsteller-IBAN (bank_* = Projektkonto)
  add column if not exists mitantragsteller        boolean not null default false,
  add column if not exists datenschutz_bestaetigt  boolean not null default false,
  add column if not exists gebuehr_ueberwiesen     boolean not null default false,
  add column if not exists ort                     text,
  add column if not exists datum                   date,
  add column if not exists daten                   jsonb not null default '{}'::jsonb,
  add column if not exists close_lead_id           text,
  add column if not exists close_opportunity_id    text,
  add column if not exists berater_vorname         text,
  add column if not exists berater_nachname        text;

-- 4) RLS — selbstauskuenfte (Modell: wie kunden) -----------------------------
alter table public.selbstauskuenfte enable row level security;

-- Kunde: eigene Zeile lesen/anlegen/ändern
create policy sa_self_select on public.selbstauskuenfte for select to authenticated
using (exists (select 1 from public.kunden k
               where k.id = selbstauskuenfte.kunde_id and k.user_id = auth.uid()));
create policy sa_self_insert on public.selbstauskuenfte for insert to authenticated
with check (exists (select 1 from public.kunden k
                    where k.id = selbstauskuenfte.kunde_id and k.user_id = auth.uid()));
create policy sa_self_update on public.selbstauskuenfte for update to authenticated
using (exists (select 1 from public.kunden k
               where k.id = selbstauskuenfte.kunde_id and k.user_id = auth.uid()))
with check (exists (select 1 from public.kunden k
                    where k.id = selbstauskuenfte.kunde_id and k.user_id = auth.uid()));

-- VP-Subtree: lesen
create policy sa_vp_select on public.selbstauskuenfte for select to authenticated
using (exists (select 1 from public.kunden k
               where k.id = selbstauskuenfte.kunde_id
                 and (k.vp_id = auth.uid() or public.is_descendant_of(auth.uid(), k.vp_id))));
-- Vertriebsleiter / Support: lesen
create policy sa_vl_select on public.selbstauskuenfte for select to authenticated
using (public.has_role(auth.uid(),'vertriebsleiter'));
create policy sa_support_select on public.selbstauskuenfte for select to authenticated
using (public.has_role(auth.uid(),'support'));
-- Admin: alles
create policy sa_admin_all on public.selbstauskuenfte for all to authenticated
using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- 5) RLS — selbstauskunft_immobilien (Zugriff über Parent) --------------------
alter table public.selbstauskunft_immobilien enable row level security;

create policy sai_self_all on public.selbstauskunft_immobilien for all to authenticated
using (exists (select 1 from public.selbstauskuenfte s
               join public.kunden k on k.id = s.kunde_id
               where s.id = selbstauskunft_immobilien.selbstauskunft_id and k.user_id = auth.uid()))
with check (exists (select 1 from public.selbstauskuenfte s
                    join public.kunden k on k.id = s.kunde_id
                    where s.id = selbstauskunft_immobilien.selbstauskunft_id and k.user_id = auth.uid()));

create policy sai_vp_select on public.selbstauskunft_immobilien for select to authenticated
using (exists (select 1 from public.selbstauskuenfte s
               join public.kunden k on k.id = s.kunde_id
               where s.id = selbstauskunft_immobilien.selbstauskunft_id
                 and (k.vp_id = auth.uid() or public.is_descendant_of(auth.uid(), k.vp_id))));
create policy sai_vl_select on public.selbstauskunft_immobilien for select to authenticated
using (public.has_role(auth.uid(),'vertriebsleiter'));
create policy sai_support_select on public.selbstauskunft_immobilien for select to authenticated
using (public.has_role(auth.uid(),'support'));
create policy sai_admin_all on public.selbstauskunft_immobilien for all to authenticated
using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- (reservierungen-RLS bleibt unverändert — neue Spalten erben bestehende Policies.)

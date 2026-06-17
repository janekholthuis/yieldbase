-- Performance (DURABLE FIX): Objekte-Liste lädt nicht mehr alle ~2.108 Einheiten
-- pro Aufruf. Stattdessen werden die für die Projekt-Kacheln nötigen Aggregate
-- (Anzahl, Preis-/Flächen-/Zimmer-/AfA-Spannen, €/m², Miete/m², Status-Verteilung)
-- auf `projekte.einheiten_aggregat` (jsonb) denormalisiert und per Trigger gepflegt.
-- Die Liste liest dann nur noch ~222 projekte-Zeilen (kein Einheiten-Scan auf dem
-- heißen Pfad → kein statement_timeout mehr). Genau der in
-- 20260617010000_bump_authenticated_statement_timeout.sql notierte „durable fix".

alter table public.projekte
  add column if not exists einheiten_aggregat jsonb;

-- Aggregat für EIN Projekt neu berechnen. SECURITY DEFINER, damit der Trigger das
-- volle (RLS-unabhängige) Aggregat schreiben kann; nur intern vom Trigger genutzt.
create or replace function public.recompute_projekt_aggregat(_projekt_id uuid)
returns void
language sql
security definer
set search_path to 'public'
as $$
  update public.projekte p
  set einheiten_aggregat = coalesce((
    select jsonb_build_object(
      'count',            count(*),
      'kaufpreis_min',    min(e.kaufpreis),
      'kaufpreis_max',    max(e.kaufpreis),
      'wohnflaeche_min',  min(e.wohnflaeche),
      'wohnflaeche_max',  max(e.wohnflaeche),
      'zimmer_min',       min(e.zimmer),
      'zimmer_max',       max(e.zimmer),
      'afa_min',          min(e.afa_satz),
      'afa_max',          max(e.afa_satz),
      'ppsm_min',         min(e.kaufpreis / nullif(e.wohnflaeche, 0)),
      'ppsm_max',         max(e.kaufpreis / nullif(e.wohnflaeche, 0)),
      'miete_sqm_min',    min(e.miete / nullif(e.wohnflaeche, 0)),
      'miete_sqm_max',    max(e.miete / nullif(e.wohnflaeche, 0)),
      'status_counts',    (
        select jsonb_object_agg(s.status, s.c)
        from (
          select e2.status, count(*) c
          from public.einheiten e2
          where e2.projekt_id = _projekt_id
          group by e2.status
        ) s
      )
    )
    from public.einheiten e
    where e.projekt_id = _projekt_id
  ), jsonb_build_object('count', 0))
  where p.id = _projekt_id;
$$;

-- Trigger-Funktion: hält das Aggregat des betroffenen Projekts aktuell.
create or replace function public.trg_einheit_aggregat()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recompute_projekt_aggregat(old.projekt_id);
    return old;
  end if;

  perform public.recompute_projekt_aggregat(new.projekt_id);

  -- Bei Projekt-Wechsel auch das alte Projekt nachziehen.
  if tg_op = 'UPDATE' and new.projekt_id is distinct from old.projekt_id then
    perform public.recompute_projekt_aggregat(old.projekt_id);
  end if;

  return new;
end;
$$;

drop trigger if exists einheit_aggregat_trg on public.einheiten;
create trigger einheit_aggregat_trg
  after insert or update or delete on public.einheiten
  for each row execute function public.trg_einheit_aggregat();

-- Interne Helfer nicht für Clients exponieren.
revoke all on function public.recompute_projekt_aggregat(uuid) from public, anon, authenticated;
revoke all on function public.trg_einheit_aggregat() from public, anon, authenticated;

-- Backfill für alle bestehenden Projekte.
select public.recompute_projekt_aggregat(id) from public.projekte;

-- PROJ-3/PROJ-12: reduce einheit_status to the strict 6-value taxonomy.
-- Old: verfuegbar, reserviert, in_finanzierung, kaufvertrag_bestellt, notartermin, verkauft, abgebrochen
-- New: frei, auf_anfrage, reserviert, notarvorbereitung, notartermin, verkauft
-- Postgres can't DROP enum values, so the type is rebuilt. Row remap:
--   verfuegbar -> frei, kaufvertrag_bestellt -> notarvorbereitung,
--   in_finanzierung -> reserviert, abgebrochen -> frei.
-- The reservation-sync trigger + two legacy RPCs are recreated with 'frei'.

alter table public.einheiten alter column status drop default;

create type public.einheit_status_new as enum
  ('frei','auf_anfrage','reserviert','notarvorbereitung','notartermin','verkauft');

alter table public.einheiten
  alter column status type public.einheit_status_new
  using (
    case status::text
      when 'verfuegbar' then 'frei'
      when 'kaufvertrag_bestellt' then 'notarvorbereitung'
      when 'in_finanzierung' then 'reserviert'
      when 'abgebrochen' then 'frei'
      else status::text
    end::public.einheit_status_new
  );

drop type public.einheit_status;
alter type public.einheit_status_new rename to einheit_status;

alter table public.einheiten alter column status set default 'frei'::public.einheit_status;

create or replace function public.sync_einheit_status_from_reservierung()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF NEW.status = 'reserviert' THEN
      UPDATE public.einheiten SET status = 'reserviert', updated_at = now()
        WHERE id = NEW.einheit_id AND status = 'frei';
    ELSIF NEW.status IN ('storniert', 'abgelaufen') THEN
      UPDATE public.einheiten e SET status = 'frei', updated_at = now()
        WHERE e.id = NEW.einheit_id AND e.status = 'reserviert'
          AND NOT EXISTS (
            SELECT 1 FROM public.reservierungen r2
            WHERE r2.einheit_id = e.id AND r2.id <> NEW.id AND r2.status = 'reserviert'
          );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Legacy RPCs: only the default status literal changes ('verfuegbar' -> 'frei').
-- Full bodies are recreated 1:1 in the applied migration; see Supabase migration
-- history entry `einheit_status_taxonomy_6_values` for the verbatim definitions.

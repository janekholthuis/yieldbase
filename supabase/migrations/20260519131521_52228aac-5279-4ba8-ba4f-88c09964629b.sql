
CREATE OR REPLACE FUNCTION public.submit_selbstauskunft(
  _anrede anrede_typ, _vorname text, _nachname text, _geburtsdatum date,
  _verheiratet boolean, _adresse text, _plz text, _stadt text,
  _beruf_status text, _brutto numeric, _erwachsene smallint, _kinder smallint,
  _bestehende_immobilien boolean, _eigenkapital numeric, _kreditverpflichtungen numeric,
  _steuersatz_grenze numeric, _steuersatz_durchschnitt numeric,
  _max_finanzierbar numeric, _max_monatsrate numeric, _max_darlehen numeric,
  _telefon text DEFAULT NULL, _bundesland text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_kunde_id uuid;
  v_user_id  uuid;
  v_prev_max numeric;
begin
  select id, user_id, max_finanzierbar
    into v_kunde_id, v_user_id, v_prev_max
  from public.kunden
  where user_id = auth.uid()
  limit 1;

  if v_kunde_id is null then
    raise exception 'Kein Kundenprofil verknüpft' using errcode = 'P0001';
  end if;

  perform set_config('app.bypass_kunden_protect', 'on', true);

  update public.kunden set
    anrede = _anrede, vorname = _vorname, nachname = _nachname,
    geburtsdatum = _geburtsdatum, verheiratet = _verheiratet,
    adresse = _adresse, plz = _plz, stadt = _stadt,
    telefon = coalesce(_telefon, telefon),
    bundesland = coalesce(_bundesland, bundesland),
    beruf_status = _beruf_status, brutto_jahreseinkommen = _brutto,
    erwachsene_im_haushalt = _erwachsene, kinder_anzahl = _kinder,
    bestehende_immobilien = _bestehende_immobilien,
    eigenkapital = _eigenkapital, kreditverpflichtungen_monatlich = _kreditverpflichtungen,
    persoenlicher_steuersatz = _steuersatz_grenze,
    steuersatz_durchschnitt = _steuersatz_durchschnitt,
    max_finanzierbar = _max_finanzierbar, max_monatsrate = _max_monatsrate,
    max_darlehen = _max_darlehen,
    selbstauskunft_step = 5,
    selbstauskunft_submitted_at = now(),
    status = 'bonitaet_geprueft'
  where id = v_kunde_id;

  perform set_config('app.bypass_kunden_protect', 'off', true);

  if v_user_id is not null then
    update public.profiles set
      anrede = _anrede,
      vorname = _vorname,
      nachname = _nachname,
      name = trim(coalesce(_vorname,'') || ' ' || coalesce(_nachname,'')),
      geburtsdatum = _geburtsdatum,
      address = _adresse,
      plz = _plz,
      stadt = _stadt,
      bundesland = coalesce(_bundesland, public.profiles.bundesland),
      phone = coalesce(_telefon, public.profiles.phone),
      persoenlicher_steuersatz = _steuersatz_grenze,
      steuersatz_durchschnitt = _steuersatz_durchschnitt
    where id = v_user_id;
  end if;

  insert into public.audit_logs (action, entity_type, entity_id, kunde_id, by_user_id, meta)
  values (
    'selbstauskunft.submitted', 'kunde', v_kunde_id, v_kunde_id, auth.uid(),
    jsonb_build_object('max_finanzierbar', _max_finanzierbar, 'max_finanzierbar_alt', v_prev_max)
  );

  return jsonb_build_object('ok', true, 'kunde_id', v_kunde_id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.sync_kunde_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if NEW.user_id is null then
    return NEW;
  end if;

  if TG_OP = 'UPDATE' and (
       NEW.anrede is distinct from OLD.anrede
    or NEW.vorname is distinct from OLD.vorname
    or NEW.nachname is distinct from OLD.nachname
    or NEW.geburtsdatum is distinct from OLD.geburtsdatum
    or NEW.adresse is distinct from OLD.adresse
    or NEW.plz is distinct from OLD.plz
    or NEW.stadt is distinct from OLD.stadt
    or NEW.bundesland is distinct from OLD.bundesland
    or NEW.telefon is distinct from OLD.telefon
  ) then
    update public.profiles set
      anrede = NEW.anrede,
      vorname = NEW.vorname,
      nachname = NEW.nachname,
      name = trim(coalesce(NEW.vorname,'') || ' ' || coalesce(NEW.nachname,'')),
      geburtsdatum = NEW.geburtsdatum,
      address = NEW.adresse,
      plz = NEW.plz,
      stadt = NEW.stadt,
      bundesland = coalesce(NEW.bundesland, public.profiles.bundesland),
      phone = coalesce(NEW.telefon, public.profiles.phone)
    where id = NEW.user_id;
  end if;
  return NEW;
end;
$function$;

-- 1) Trigger: alter Bypass raus, zwei neue Bypass-Pfade rein
CREATE OR REPLACE FUNCTION public.kunden_protect_system_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- Bypass-Pfad 1: Service-Role / Migration (kein Auth-Kontext)
  if auth.uid() is null then
    return new;
  end if;

  -- Bypass-Pfad 2: SECURITY-DEFINER-RPC mit explizitem System-Bypass
  -- Nutzung: PERFORM set_config('app.kunden_rpc_bypass', 'true', true);
  if current_setting('app.kunden_rpc_bypass', true) = 'true' then
    return new;
  end if;

  if public.has_role(auth.uid(), 'kunde')
     and not public.has_any_role(auth.uid(), array['admin','support','vertriebsleiter','vp_l1','vp_l2','vp_l3']::app_role[]) then
    if new.vp_id is distinct from old.vp_id
       or new.user_id is distinct from old.user_id
       or new.max_finanzierbar is distinct from old.max_finanzierbar
       or new.max_monatsrate is distinct from old.max_monatsrate
       or new.max_darlehen is distinct from old.max_darlehen
       or new.persoenlicher_steuersatz is distinct from old.persoenlicher_steuersatz
       or new.status is distinct from old.status then
      raise exception 'Kunden dürfen System-Felder (vp_id, user_id, max_*, status) nicht ändern';
    end if;
  end if;
  return new;
end;
$function$;

-- 2) submit_selbstauskunft (alte Signatur ohne telefon/bundesland) — neuer GUC
CREATE OR REPLACE FUNCTION public.submit_selbstauskunft(
  _anrede anrede_typ, _vorname text, _nachname text, _geburtsdatum date,
  _verheiratet boolean, _adresse text, _plz text, _stadt text,
  _beruf_status text, _brutto numeric, _erwachsene smallint, _kinder smallint,
  _bestehende_immobilien boolean, _eigenkapital numeric, _kreditverpflichtungen numeric,
  _steuersatz_grenze numeric, _steuersatz_durchschnitt numeric,
  _max_finanzierbar numeric, _max_monatsrate numeric, _max_darlehen numeric)
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

  perform set_config('app.kunden_rpc_bypass', 'true', true);

  update public.kunden set
    anrede = _anrede, vorname = _vorname, nachname = _nachname,
    geburtsdatum = _geburtsdatum, verheiratet = _verheiratet,
    adresse = _adresse, plz = _plz, stadt = _stadt,
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

  perform set_config('app.kunden_rpc_bypass', 'false', true);

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

-- 3) submit_selbstauskunft (neue Signatur mit telefon/bundesland) — neuer GUC
CREATE OR REPLACE FUNCTION public.submit_selbstauskunft(
  _anrede anrede_typ, _vorname text, _nachname text, _geburtsdatum date,
  _verheiratet boolean, _adresse text, _plz text, _stadt text,
  _beruf_status text, _brutto numeric, _erwachsene smallint, _kinder smallint,
  _bestehende_immobilien boolean, _eigenkapital numeric, _kreditverpflichtungen numeric,
  _steuersatz_grenze numeric, _steuersatz_durchschnitt numeric,
  _max_finanzierbar numeric, _max_monatsrate numeric, _max_darlehen numeric,
  _telefon text DEFAULT NULL::text, _bundesland text DEFAULT NULL::text)
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

  perform set_config('app.kunden_rpc_bypass', 'true', true);

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

  perform set_config('app.kunden_rpc_bypass', 'false', true);

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
create or replace function public.submit_selbstauskunft(
  _anrede public.anrede_typ,
  _vorname text,
  _nachname text,
  _geburtsdatum date,
  _verheiratet boolean,
  _adresse text,
  _plz text,
  _stadt text,
  _beruf_status text,
  _brutto numeric,
  _erwachsene smallint,
  _kinder smallint,
  _bestehende_immobilien boolean,
  _eigenkapital numeric,
  _kreditverpflichtungen numeric,
  _steuersatz_grenze numeric,
  _steuersatz_durchschnitt numeric,
  _max_finanzierbar numeric,
  _max_monatsrate numeric,
  _max_darlehen numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kunde_id uuid;
  v_prev_max numeric;
begin
  select id, max_finanzierbar
    into v_kunde_id, v_prev_max
  from public.kunden
  where user_id = auth.uid()
  limit 1;

  if v_kunde_id is null then
    raise exception 'Kein Kundenprofil verknüpft' using errcode = 'P0001';
  end if;

  update public.kunden set
    anrede = _anrede,
    vorname = _vorname,
    nachname = _nachname,
    geburtsdatum = _geburtsdatum,
    verheiratet = _verheiratet,
    adresse = _adresse,
    plz = _plz,
    stadt = _stadt,
    beruf_status = _beruf_status,
    brutto_jahreseinkommen = _brutto,
    erwachsene_im_haushalt = _erwachsene,
    kinder_anzahl = _kinder,
    bestehende_immobilien = _bestehende_immobilien,
    eigenkapital = _eigenkapital,
    kreditverpflichtungen_monatlich = _kreditverpflichtungen,
    persoenlicher_steuersatz = _steuersatz_grenze,
    steuersatz_durchschnitt = _steuersatz_durchschnitt,
    max_finanzierbar = _max_finanzierbar,
    max_monatsrate = _max_monatsrate,
    max_darlehen = _max_darlehen,
    selbstauskunft_step = 5,
    selbstauskunft_submitted_at = now(),
    status = 'bonitaet_geprueft'
  where id = v_kunde_id;

  insert into public.audit_logs (action, entity_type, entity_id, kunde_id, by_user_id, meta)
  values (
    'selbstauskunft.submitted',
    'kunde',
    v_kunde_id,
    v_kunde_id,
    auth.uid(),
    jsonb_build_object(
      'max_finanzierbar', _max_finanzierbar,
      'max_finanzierbar_alt', v_prev_max
    )
  );

  return jsonb_build_object('ok', true, 'kunde_id', v_kunde_id);
end;
$$;

revoke all on function public.submit_selbstauskunft(
  public.anrede_typ, text, text, date, boolean, text, text, text,
  text, numeric, smallint, smallint, boolean, numeric, numeric,
  numeric, numeric, numeric, numeric, numeric
) from public;

grant execute on function public.submit_selbstauskunft(
  public.anrede_typ, text, text, date, boolean, text, text, text,
  text, numeric, smallint, smallint, boolean, numeric, numeric,
  numeric, numeric, numeric, numeric, numeric
) to authenticated;

-- Trigger so anpassen, dass die Funktion selbst (security definer, ohne kunden-Rolle für definer) durchkommt:
-- Der Trigger prüft auth.uid()'s Rolle. Da der Kunde nach wie vor auth.uid() = Kunde ist,
-- müssen wir die System-Felder-Sperre für DIESE Funktion umgehen.
-- Lösung: GUC-Flag in der Function setzen, Trigger respektiert es.

create or replace function public.kunden_protect_system_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('app.bypass_kunden_protect', true) = 'on' then
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
$$;

create or replace function public.submit_selbstauskunft(
  _anrede public.anrede_typ,
  _vorname text,
  _nachname text,
  _geburtsdatum date,
  _verheiratet boolean,
  _adresse text,
  _plz text,
  _stadt text,
  _beruf_status text,
  _brutto numeric,
  _erwachsene smallint,
  _kinder smallint,
  _bestehende_immobilien boolean,
  _eigenkapital numeric,
  _kreditverpflichtungen numeric,
  _steuersatz_grenze numeric,
  _steuersatz_durchschnitt numeric,
  _max_finanzierbar numeric,
  _max_monatsrate numeric,
  _max_darlehen numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kunde_id uuid;
  v_prev_max numeric;
begin
  select id, max_finanzierbar
    into v_kunde_id, v_prev_max
  from public.kunden
  where user_id = auth.uid()
  limit 1;

  if v_kunde_id is null then
    raise exception 'Kein Kundenprofil verknüpft' using errcode = 'P0001';
  end if;

  perform set_config('app.bypass_kunden_protect', 'on', true);

  update public.kunden set
    anrede = _anrede,
    vorname = _vorname,
    nachname = _nachname,
    geburtsdatum = _geburtsdatum,
    verheiratet = _verheiratet,
    adresse = _adresse,
    plz = _plz,
    stadt = _stadt,
    beruf_status = _beruf_status,
    brutto_jahreseinkommen = _brutto,
    erwachsene_im_haushalt = _erwachsene,
    kinder_anzahl = _kinder,
    bestehende_immobilien = _bestehende_immobilien,
    eigenkapital = _eigenkapital,
    kreditverpflichtungen_monatlich = _kreditverpflichtungen,
    persoenlicher_steuersatz = _steuersatz_grenze,
    steuersatz_durchschnitt = _steuersatz_durchschnitt,
    max_finanzierbar = _max_finanzierbar,
    max_monatsrate = _max_monatsrate,
    max_darlehen = _max_darlehen,
    selbstauskunft_step = 5,
    selbstauskunft_submitted_at = now(),
    status = 'bonitaet_geprueft'
  where id = v_kunde_id;

  perform set_config('app.bypass_kunden_protect', 'off', true);

  insert into public.audit_logs (action, entity_type, entity_id, kunde_id, by_user_id, meta)
  values (
    'selbstauskunft.submitted',
    'kunde',
    v_kunde_id,
    v_kunde_id,
    auth.uid(),
    jsonb_build_object(
      'max_finanzierbar', _max_finanzierbar,
      'max_finanzierbar_alt', v_prev_max
    )
  );

  return jsonb_build_object('ok', true, 'kunde_id', v_kunde_id);
end;
$$;
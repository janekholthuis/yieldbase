
create or replace function public.consume_kundenlink(_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link record;
  v_result jsonb;
begin
  select id, kunde_id, einheit_id, vp_id, expires_at, accessed_count
    into v_link
  from public.kundenlinks
  where token = _token;

  if not found then
    raise exception 'Link ungültig.' using errcode = 'P0001';
  end if;
  if v_link.expires_at < now() then
    raise exception 'Link abgelaufen.' using errcode = 'P0001';
  end if;

  update public.kundenlinks
     set accessed_count   = coalesce(accessed_count, 0) + 1,
         last_accessed_at = now()
   where id = v_link.id;

  select jsonb_build_object(
    'expiresAt', v_link.expires_at,
    'kunde', (
      select jsonb_build_object('vorname', k.vorname, 'nachname', k.nachname)
      from public.kunden k where k.id = v_link.kunde_id
    ),
    'vp', (
      select jsonb_build_object(
        'name', p.name, 'vorname', p.vorname, 'nachname', p.nachname,
        'email', p.email, 'phone', p.phone, 'avatar_url', p.avatar_url
      )
      from public.profiles p where p.id = v_link.vp_id
    ),
    'zuweisungStatus', (
      select z.status::text from public.objekt_kunde_zuweisungen z
      where z.einheit_id = v_link.einheit_id and z.kunde_id = v_link.kunde_id
      limit 1
    ),
    'einheit', (
      select jsonb_build_object(
        'einheit_id', e.id,
        'wohnungsnummer', e.wohnungsnummer,
        'etage', e.etage,
        'wohnflaeche', e.wohnflaeche,
        'zimmer', e.zimmer,
        'kaufpreis', e.kaufpreis,
        'miete', e.miete,
        'hausgeld_umlagefaehig', e.hausgeld_umlagefaehig,
        'hausgeld_nicht_umlagefaehig', e.hausgeld_nicht_umlagefaehig,
        'instandhaltungsruecklage', e.instandhaltungsruecklage,
        'sondereigentumsverwaltung', e.sondereigentumsverwaltung,
        'grundstueckswert_anteil', e.grundstueckswert_anteil,
        'afa_satz', e.afa_satz,
        'erhaltungsaufwand', e.erhaltungsaufwand,
        'balkon', e.balkon,
        'keller', e.keller,
        'aufzug', e.aufzug,
        'vermietet', e.vermietet,
        'status', e.status::text,
        'projekt_name', pr.name,
        'adresse', pr.adresse,
        'plz', pr.plz,
        'stadt', pr.stadt,
        'bundesland', pr.bundesland,
        'mietrendite_brutto', pr.mietrendite_brutto,
        'bilder', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', b.id, 'url', b.url, 'alt', b.alt, 'sort_order', b.sort_order
          ) order by coalesce(b.sort_order, 0))
          from public.objekt_bilder b
          where b.einheit_id = e.id
        ), '[]'::jsonb)
      )
      from public.einheiten e
      left join public.projekte pr on pr.id = e.projekt_id
      where e.id = v_link.einheit_id
    )
  ) into v_result;

  if v_result->'einheit' is null then
    raise exception 'Einheit nicht mehr verfügbar.' using errcode = 'P0001';
  end if;

  return v_result;
end;
$$;

revoke all on function public.consume_kundenlink(text) from public;
grant execute on function public.consume_kundenlink(text) to anon, authenticated;

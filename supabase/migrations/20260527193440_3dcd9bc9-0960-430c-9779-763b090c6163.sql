-- Modul 2 Sub-Block 2: RPC create_projekt_quick + Bauträger-Suggest-RPC

-- RPC: ETW-Einzel oder MFH-Projekt anlegen (admin/support only)
CREATE OR REPLACE FUNCTION public.create_projekt_quick(
  p_typ projekt_typ,
  p_name text,
  p_adresse text,
  p_plz text,
  p_stadt text,
  p_bautraeger text DEFAULT NULL,
  p_baujahr smallint DEFAULT NULL,
  p_geo jsonb DEFAULT NULL,
  -- ETW-only:
  p_wohnungsnummer text DEFAULT '1',
  p_etage smallint DEFAULT NULL,
  p_wohnflaeche numeric DEFAULT NULL,
  p_zimmer numeric DEFAULT NULL,
  p_kaufpreis numeric DEFAULT NULL,
  p_miete numeric DEFAULT NULL,
  p_vermietet boolean DEFAULT false
)
RETURNS TABLE(projekt_id uuid, einheit_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_projekt_id uuid;
  v_einheit_id uuid := NULL;
  v_final_name text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth required' USING ERRCODE = '42501';
  END IF;
  IF NOT (has_role(v_uid, 'admin'::app_role) OR has_role(v_uid, 'support'::app_role)) THEN
    RAISE EXCEPTION 'forbidden: admin or support only' USING ERRCODE = '42501';
  END IF;

  -- Server-side Validierung
  IF p_adresse IS NULL OR length(trim(p_adresse)) = 0 THEN
    RAISE EXCEPTION 'adresse_required';
  END IF;
  IF p_plz IS NULL OR length(trim(p_plz)) = 0 THEN
    RAISE EXCEPTION 'plz_required';
  END IF;
  IF p_stadt IS NULL OR length(trim(p_stadt)) = 0 THEN
    RAISE EXCEPTION 'stadt_required';
  END IF;

  IF p_typ = 'etw_einzeln' THEN
    IF p_kaufpreis IS NULL OR p_kaufpreis <= 0 THEN
      RAISE EXCEPTION 'kaufpreis_invalid';
    END IF;
    IF p_wohnflaeche IS NULL OR p_wohnflaeche <= 0 THEN
      RAISE EXCEPTION 'wohnflaeche_invalid';
    END IF;
    IF p_zimmer IS NULL OR p_zimmer <= 0 THEN
      RAISE EXCEPTION 'zimmer_invalid';
    END IF;
  ELSIF p_typ = 'mfh' THEN
    IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
      RAISE EXCEPTION 'name_required';
    END IF;
    IF p_bautraeger IS NULL OR length(trim(p_bautraeger)) = 0 THEN
      RAISE EXCEPTION 'bautraeger_required';
    END IF;
  ELSE
    RAISE EXCEPTION 'invalid_typ';
  END IF;

  v_final_name := COALESCE(NULLIF(trim(p_name), ''), p_stadt || ', ' || p_adresse);

  INSERT INTO projekte (
    projekt_typ, name, adresse, plz, stadt, bautraeger, baujahr, geo, created_by
  ) VALUES (
    p_typ, v_final_name, p_adresse, p_plz, p_stadt, NULLIF(trim(p_bautraeger), ''), p_baujahr, p_geo, v_uid
  )
  RETURNING id INTO v_projekt_id;

  INSERT INTO audit_logs (action, entity_type, entity_id, by_user_id, meta)
  VALUES (
    'objekt.projekt_created',
    'projekt',
    v_projekt_id,
    v_uid,
    jsonb_build_object(
      'projekt_typ', p_typ,
      'name', v_final_name,
      'adresse', p_adresse,
      'stadt', p_stadt
    )
  );

  IF p_typ = 'etw_einzeln' THEN
    INSERT INTO einheiten (
      projekt_id, wohnungsnummer, etage, wohnflaeche, zimmer, kaufpreis, miete, vermietet, status
    ) VALUES (
      v_projekt_id, p_wohnungsnummer, p_etage, p_wohnflaeche, p_zimmer, p_kaufpreis, p_miete, COALESCE(p_vermietet, false), 'verfuegbar'
    )
    RETURNING id INTO v_einheit_id;

    INSERT INTO audit_logs (action, entity_type, entity_id, by_user_id, meta)
    VALUES (
      'objekt.einheit_created',
      'einheit',
      v_einheit_id,
      v_uid,
      jsonb_build_object(
        'projekt_id', v_projekt_id,
        'wohnungsnummer', p_wohnungsnummer,
        'kaufpreis', p_kaufpreis,
        'wohnflaeche', p_wohnflaeche
      )
    );
  END IF;

  RETURN QUERY SELECT v_projekt_id, v_einheit_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_projekt_quick(projekt_typ, text, text, text, text, text, smallint, jsonb, text, smallint, numeric, numeric, numeric, numeric, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_projekt_quick(projekt_typ, text, text, text, text, text, smallint, jsonb, text, smallint, numeric, numeric, numeric, numeric, boolean) TO authenticated;

-- RPC: Bauträger-Suggest (Distinct-Liste aus projekte.bautraeger)
CREATE OR REPLACE FUNCTION public.list_bautraeger_suggest()
RETURNS TABLE(bautraeger text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT p.bautraeger
  FROM projekte p
  WHERE p.bautraeger IS NOT NULL
    AND length(trim(p.bautraeger)) > 0
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'support'::app_role)
    )
  ORDER BY p.bautraeger;
$$;

REVOKE ALL ON FUNCTION public.list_bautraeger_suggest() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_bautraeger_suggest() TO authenticated;
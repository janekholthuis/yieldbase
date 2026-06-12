-- Sub-Block 3: RPC create_einheit_in_projekt
-- Anlegen einer neuen Einheit innerhalb eines bestehenden Projekts (MFH-Sub-Modal).
-- Pattern (Q3): Beim Anlegen der Einheit werden die kalkulations_defaults aus dem
-- Projekt in den einheiten.kalkulation-JSON kopiert (Snapshot), damit spätere
-- Änderungen am Projekt-Default nicht rückwirkend bestehende Einheiten ändern.
-- Spätere Devs: Pattern auch bei jeder zukünftigen Einheiten-Anlage-RPC anwenden.

CREATE OR REPLACE FUNCTION public.create_einheit_in_projekt(
  p_projekt_id uuid,
  p_wohnungsnummer text,
  p_etage smallint DEFAULT NULL,
  p_wohnflaeche numeric DEFAULT NULL,
  p_zimmer numeric DEFAULT NULL,
  p_kaufpreis numeric DEFAULT NULL,
  p_miete numeric DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_einheit_id uuid;
  v_projekt_defaults jsonb;
  v_projekt_typ projekt_typ;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Nicht authentifiziert' USING ERRCODE = '42501';
  END IF;
  IF NOT (has_role(v_uid, 'admin'::app_role) OR has_role(v_uid, 'support'::app_role)) THEN
    RAISE EXCEPTION 'Keine Berechtigung' USING ERRCODE = '42501';
  END IF;
  IF p_wohnungsnummer IS NULL OR length(btrim(p_wohnungsnummer)) = 0 THEN
    RAISE EXCEPTION 'Wohnungsnummer ist Pflicht' USING ERRCODE = '23514';
  END IF;

  SELECT kalkulations_defaults, projekt_typ
    INTO v_projekt_defaults, v_projekt_typ
    FROM projekte WHERE id = p_projekt_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Projekt nicht gefunden' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO einheiten (
    projekt_id, wohnungsnummer, etage, wohnflaeche, zimmer,
    kaufpreis, miete, status, kalkulation
  ) VALUES (
    p_projekt_id, btrim(p_wohnungsnummer), p_etage, p_wohnflaeche, p_zimmer,
    p_kaufpreis, p_miete, 'verfuegbar'::einheit_status,
    COALESCE(v_projekt_defaults, '{}'::jsonb)
  )
  RETURNING id INTO v_einheit_id;

  INSERT INTO audit_logs (action, entity_type, entity_id, by_user_id, meta)
  VALUES (
    'objekt.einheit_created', 'einheit', v_einheit_id, v_uid,
    jsonb_build_object(
      'projekt_id', p_projekt_id,
      'wohnungsnummer', btrim(p_wohnungsnummer),
      'projekt_typ', v_projekt_typ
    )
  );

  RETURN v_einheit_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_einheit_in_projekt(uuid, text, smallint, numeric, numeric, numeric, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_einheit_in_projekt(uuid, text, smallint, numeric, numeric, numeric, numeric) TO authenticated;
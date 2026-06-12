-- Sub-Block 4: Vollständigkeits-Check für Projekt-Pflege
CREATE OR REPLACE FUNCTION public.get_projekt_completeness(p_projekt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_p projekte%ROWTYPE;
  v_bilder_count int;
  v_dok_count int;
  v_eckdaten boolean;
  v_kalk boolean;
  v_bilder boolean;
  v_dok boolean;
  v_sicht boolean;
  v_bank boolean;
  v_done int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Nicht authentifiziert' USING ERRCODE = '42501';
  END IF;
  IF NOT (has_role(v_uid, 'admin'::app_role) OR has_role(v_uid, 'support'::app_role)) THEN
    RAISE EXCEPTION 'Keine Berechtigung' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_p FROM projekte WHERE id = p_projekt_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Projekt nicht gefunden' USING ERRCODE = 'P0002';
  END IF;

  SELECT count(*) INTO v_bilder_count
    FROM objekt_bilder
    WHERE projekt_id = p_projekt_id AND deleted_at IS NULL;
  SELECT count(*) INTO v_dok_count
    FROM objekt_dokumente
    WHERE projekt_id = p_projekt_id AND deleted_at IS NULL;

  v_eckdaten := v_p.name IS NOT NULL
                AND v_p.adresse IS NOT NULL
                AND v_p.plz IS NOT NULL
                AND v_p.stadt IS NOT NULL
                AND v_p.baujahr IS NOT NULL
                AND v_p.bautraeger IS NOT NULL;
  v_kalk := v_p.kalkulations_defaults IS NOT NULL
            AND v_p.kalkulations_defaults <> '{}'::jsonb;
  v_bilder := v_bilder_count > 0;
  v_dok := v_dok_count > 0;
  v_sicht := v_p.visibility_reviewed_at IS NOT NULL;
  v_bank := v_p.bank_kontoinhaber IS NOT NULL
            AND v_p.bank_iban IS NOT NULL
            AND length(btrim(v_p.bank_iban)) > 0;

  v_done := (v_eckdaten::int) + (v_kalk::int) + (v_bilder::int)
          + (v_dok::int) + (v_sicht::int) + (v_bank::int);

  RETURN jsonb_build_object(
    'eckdaten', v_eckdaten,
    'kalkulation', v_kalk,
    'bilder', v_bilder,
    'dokumente', v_dok,
    'sichtbarkeit', v_sicht,
    'bank', v_bank,
    'done', v_done,
    'total', 6,
    'bilder_count', v_bilder_count,
    'dokumente_count', v_dok_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_projekt_completeness(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_projekt_completeness(uuid) TO authenticated;
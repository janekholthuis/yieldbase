-- Sub-Block 9: Sichtbarkeits-Review-Marker
CREATE OR REPLACE FUNCTION public.mark_projekt_visibility_reviewed(p_projekt_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ts timestamptz := now();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Nicht authentifiziert' USING ERRCODE = '42501';
  END IF;
  IF NOT (has_role(v_uid, 'admin'::app_role) OR has_role(v_uid, 'vertriebsleiter'::app_role)) THEN
    RAISE EXCEPTION 'Keine Berechtigung' USING ERRCODE = '42501';
  END IF;

  UPDATE projekte SET visibility_reviewed_at = v_ts, updated_at = v_ts
    WHERE id = p_projekt_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Projekt nicht gefunden' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO audit_logs (action, entity_type, entity_id, by_user_id, meta)
  VALUES ('objekt.visibility_reviewed', 'projekt', p_projekt_id, v_uid,
          jsonb_build_object('at', v_ts));

  RETURN v_ts;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_projekt_visibility_reviewed(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_projekt_visibility_reviewed(uuid) TO authenticated;
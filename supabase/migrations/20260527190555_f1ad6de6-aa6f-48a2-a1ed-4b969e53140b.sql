
CREATE OR REPLACE FUNCTION public.verify_trigger_defense()
RETURNS TABLE(trigger_name text, blocked_test text, allowed_test text, error_message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  c_anna_uid constant uuid := '9412daaa-fa4c-457c-9a68-fcdf2a734792';
  c_vp_l1_a  constant uuid := 'cc0199bc-7120-4e62-96da-b4597377f453';
  c_case_id uuid;
  c_dok_id uuid;
  c_kunde_id uuid;
  c_projekt_id uuid;
  v_blocked text;
  v_allowed text;
  v_err text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Nur Admin darf verify_trigger_defense aufrufen' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO c_case_id FROM public.finanzierungs_cases ORDER BY created_at LIMIT 1;
  SELECT id INTO c_dok_id FROM public.kunden_dokumente WHERE deleted_at IS NULL ORDER BY uploaded_at LIMIT 1;
  SELECT id INTO c_kunde_id FROM public.kunden WHERE user_id = c_anna_uid LIMIT 1;
  SELECT id INTO c_projekt_id FROM public.projekte ORDER BY created_at LIMIT 1;

  -- 1. cases_protect_update_columns
  trigger_name := 'cases_protect_update_columns';
  v_blocked := 'fail'; v_allowed := 'fail'; v_err := NULL;
  IF c_case_id IS NULL THEN
    v_err := 'Keine finanzierungs_cases-Zeile';
  ELSE
    BEGIN
      PERFORM set_config('request.jwt.claims',
        json_build_object('sub', c_vp_l1_a::text, 'role', 'authenticated')::text, true);
      UPDATE public.finanzierungs_cases SET zins_satz = 99.999 WHERE id = c_case_id;
      v_blocked := 'fail';
      RAISE EXCEPTION 'YB_ROLLBACK';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM <> 'YB_ROLLBACK' THEN v_blocked := 'pass'; END IF;
    END;
    BEGIN
      PERFORM set_config('app.cases_rpc_bypass', 'true', true);
      UPDATE public.finanzierungs_cases SET zins_satz = 99.999 WHERE id = c_case_id;
      v_allowed := 'pass';
      RAISE EXCEPTION 'YB_ROLLBACK';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM <> 'YB_ROLLBACK' THEN
        v_allowed := 'fail';
        v_err := COALESCE(v_err || ' | ', '') || 'allowed: ' || SQLERRM;
      END IF;
    END;
  END IF;
  blocked_test := v_blocked; allowed_test := v_allowed; error_message := v_err;
  RETURN NEXT;

  -- 2. kunden_dokumente_protect_update
  trigger_name := 'kunden_dokumente_protect_update';
  v_blocked := 'fail'; v_allowed := 'fail'; v_err := NULL;
  IF c_dok_id IS NULL THEN
    v_err := 'Keine kunden_dokumente-Zeile';
  ELSE
    BEGIN
      PERFORM set_config('request.jwt.claims',
        json_build_object('sub', c_anna_uid::text, 'role', 'authenticated')::text, true);
      UPDATE public.kunden_dokumente SET dateiname = 'YB_TEST_' || gen_random_uuid()::text WHERE id = c_dok_id;
      v_blocked := 'fail';
      RAISE EXCEPTION 'YB_ROLLBACK';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM <> 'YB_ROLLBACK' THEN v_blocked := 'pass'; END IF;
    END;
    BEGIN
      PERFORM set_config('app.kunden_dokumente_rpc_bypass', 'true', true);
      UPDATE public.kunden_dokumente SET dateiname = 'YB_TEST_' || gen_random_uuid()::text WHERE id = c_dok_id;
      v_allowed := 'pass';
      RAISE EXCEPTION 'YB_ROLLBACK';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM <> 'YB_ROLLBACK' THEN
        v_allowed := 'fail';
        v_err := COALESCE(v_err || ' | ', '') || 'allowed: ' || SQLERRM;
      END IF;
    END;
  END IF;
  blocked_test := v_blocked; allowed_test := v_allowed; error_message := v_err;
  RETURN NEXT;

  -- 3. kunden_protect_system_fields
  trigger_name := 'kunden_protect_system_fields';
  v_blocked := 'fail'; v_allowed := 'fail'; v_err := NULL;
  IF c_kunde_id IS NULL THEN
    v_err := 'Keine kunde-Zeile fuer Anna (' || c_anna_uid::text || ')';
  ELSE
    BEGIN
      PERFORM set_config('request.jwt.claims',
        json_build_object('sub', c_anna_uid::text, 'role', 'authenticated')::text, true);
      UPDATE public.kunden SET vp_id = gen_random_uuid() WHERE id = c_kunde_id;
      v_blocked := 'fail';
      RAISE EXCEPTION 'YB_ROLLBACK';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM <> 'YB_ROLLBACK' THEN v_blocked := 'pass'; END IF;
    END;
    BEGIN
      PERFORM set_config('request.jwt.claims',
        json_build_object('sub', c_anna_uid::text, 'role', 'authenticated')::text, true);
      PERFORM set_config('app.kunden_rpc_bypass', 'true', true);
      UPDATE public.kunden SET vp_id = gen_random_uuid() WHERE id = c_kunde_id;
      v_allowed := 'pass';
      RAISE EXCEPTION 'YB_ROLLBACK';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM <> 'YB_ROLLBACK' THEN
        v_allowed := 'fail';
        v_err := COALESCE(v_err || ' | ', '') || 'allowed: ' || SQLERRM;
      END IF;
    END;
  END IF;
  blocked_test := v_blocked; allowed_test := v_allowed; error_message := v_err;
  RETURN NEXT;

  -- 4. projekte_protect_pool_columns
  trigger_name := 'projekte_protect_pool_columns';
  v_blocked := 'fail'; v_allowed := 'fail'; v_err := NULL;
  IF c_projekt_id IS NULL THEN
    v_err := 'Keine projekte-Zeile';
  ELSE
    BEGIN
      PERFORM set_config('request.jwt.claims',
        json_build_object('sub', c_vp_l1_a::text, 'role', 'authenticated')::text, true);
      UPDATE public.projekte SET finanzierer_ids = ARRAY[gen_random_uuid()] WHERE id = c_projekt_id;
      v_blocked := 'fail';
      RAISE EXCEPTION 'YB_ROLLBACK';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM <> 'YB_ROLLBACK' THEN v_blocked := 'pass'; END IF;
    END;
    BEGIN
      PERFORM set_config('app.pool_rpc_bypass', 'true', true);
      UPDATE public.projekte SET finanzierer_ids = ARRAY[gen_random_uuid()] WHERE id = c_projekt_id;
      v_allowed := 'pass';
      RAISE EXCEPTION 'YB_ROLLBACK';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM <> 'YB_ROLLBACK' THEN
        v_allowed := 'fail';
        v_err := COALESCE(v_err || ' | ', '') || 'allowed: ' || SQLERRM;
      END IF;
    END;
  END IF;
  blocked_test := v_blocked; allowed_test := v_allowed; error_message := v_err;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_trigger_defense() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_trigger_defense() TO authenticated;

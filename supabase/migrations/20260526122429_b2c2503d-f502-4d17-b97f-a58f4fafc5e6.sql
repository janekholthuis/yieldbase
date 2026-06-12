-- =========================================
-- 6.1a: Protection Trigger on public.projekte
-- =========================================
CREATE OR REPLACE FUNCTION public.projekte_protect_pool_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('session_replication_role', true) = 'replica' THEN
    RETURN NEW;
  END IF;

  IF NEW.finanzierer_ids IS DISTINCT FROM OLD.finanzierer_ids THEN
    RAISE EXCEPTION 'Direkter UPDATE auf finanzierer_ids ist nicht erlaubt. Bitte add_finanzierer_to_pool / remove_finanzierer_from_pool verwenden.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.finanzierer_round_robin_counter IS DISTINCT FROM OLD.finanzierer_round_robin_counter THEN
    RAISE EXCEPTION 'Direkter UPDATE auf finanzierer_round_robin_counter ist nicht erlaubt.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_projekte_protect_pool_columns ON public.projekte;
CREATE TRIGGER trg_projekte_protect_pool_columns
  BEFORE UPDATE ON public.projekte
  FOR EACH ROW
  EXECUTE FUNCTION public.projekte_protect_pool_columns();

-- =========================================
-- 6.1b: add_finanzierer_to_pool
-- =========================================
CREATE OR REPLACE FUNCTION public.add_finanzierer_to_pool(
  p_projekt_id uuid,
  p_finanzierer_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pool_before uuid[];
  v_pool_after  uuid[];
  v_counter     integer;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support')) THEN
    RAISE EXCEPTION 'Nicht berechtigt (nur admin/support).' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_role(p_finanzierer_id, 'finanzierer') THEN
    RAISE EXCEPTION 'Nutzer % hat nicht die Rolle finanzierer.', p_finanzierer_id USING ERRCODE = 'P0001';
  END IF;

  SELECT finanzierer_ids, finanzierer_round_robin_counter
    INTO v_pool_before, v_counter
    FROM public.projekte
   WHERE id = p_projekt_id
   FOR UPDATE;

  IF v_pool_before IS NULL THEN
    RAISE EXCEPTION 'Projekt nicht gefunden.' USING ERRCODE = 'P0002';
  END IF;

  IF p_finanzierer_id = ANY(v_pool_before) THEN
    RAISE EXCEPTION 'Finanzierer ist bereits im Pool.' USING ERRCODE = 'P0001';
  END IF;

  v_pool_after := v_pool_before || p_finanzierer_id;

  PERFORM set_config('session_replication_role', 'replica', true);
  UPDATE public.projekte
     SET finanzierer_ids = v_pool_after,
         updated_at = now()
   WHERE id = p_projekt_id;
  PERFORM set_config('session_replication_role', 'origin', true);

  INSERT INTO public.audit_logs (action, entity_type, entity_id, by_user_id, meta)
  VALUES (
    'pool.finanzierer_added',
    'projekt',
    p_projekt_id,
    auth.uid(),
    jsonb_build_object(
      'finanzierer_id', p_finanzierer_id,
      'pool_before', to_jsonb(v_pool_before),
      'pool_after',  to_jsonb(v_pool_after)
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'pool_after', to_jsonb(v_pool_after),
    'counter', v_counter
  );
END;
$$;

-- =========================================
-- 6.1c: remove_finanzierer_from_pool
-- =========================================
CREATE OR REPLACE FUNCTION public.remove_finanzierer_from_pool(
  p_projekt_id uuid,
  p_finanzierer_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pool_before uuid[];
  v_pool_after  uuid[];
  v_counter     integer;
  v_new_counter integer;
  v_open_cases  integer;
  v_len_after   integer;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support')) THEN
    RAISE EXCEPTION 'Nicht berechtigt (nur admin/support).' USING ERRCODE = '42501';
  END IF;

  SELECT finanzierer_ids, finanzierer_round_robin_counter
    INTO v_pool_before, v_counter
    FROM public.projekte
   WHERE id = p_projekt_id
   FOR UPDATE;

  IF v_pool_before IS NULL THEN
    RAISE EXCEPTION 'Projekt nicht gefunden.' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (p_finanzierer_id = ANY(v_pool_before)) THEN
    RAISE EXCEPTION 'Finanzierer ist nicht im Pool.' USING ERRCODE = 'P0001';
  END IF;

  v_pool_after := array_remove(v_pool_before, p_finanzierer_id);
  v_len_after := COALESCE(array_length(v_pool_after, 1), 0);

  IF v_len_after = 0 THEN
    v_new_counter := 0;
  ELSE
    v_new_counter := v_counter % v_len_after;
  END IF;

  SELECT COUNT(*)::int INTO v_open_cases
    FROM public.finanzierungs_cases c
    JOIN public.einheiten e ON e.id = c.einheit_id
   WHERE c.finanzierer_id = p_finanzierer_id
     AND e.projekt_id = p_projekt_id
     AND c.status NOT IN ('abgelehnt'::case_status, 'angebot_akzeptiert'::case_status);

  PERFORM set_config('session_replication_role', 'replica', true);
  UPDATE public.projekte
     SET finanzierer_ids = v_pool_after,
         finanzierer_round_robin_counter = v_new_counter,
         updated_at = now()
   WHERE id = p_projekt_id;
  PERFORM set_config('session_replication_role', 'origin', true);

  INSERT INTO public.audit_logs (action, entity_type, entity_id, by_user_id, meta)
  VALUES (
    'pool.finanzierer_removed',
    'projekt',
    p_projekt_id,
    auth.uid(),
    jsonb_build_object(
      'finanzierer_id', p_finanzierer_id,
      'pool_before', to_jsonb(v_pool_before),
      'pool_after',  to_jsonb(v_pool_after),
      'counter_before', v_counter,
      'counter_after',  v_new_counter,
      'open_cases_count', v_open_cases
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'pool_after', to_jsonb(v_pool_after),
    'counter', v_new_counter,
    'open_cases_count', v_open_cases
  );
END;
$$;

-- =========================================
-- 6.1d: list_finanzierer_for_pool
-- =========================================
CREATE OR REPLACE FUNCTION public.list_finanzierer_for_pool(
  p_projekt_id uuid
)
RETURNS TABLE(
  id uuid,
  name text,
  vorname text,
  nachname text,
  email text,
  phone text,
  avatar_url text,
  in_pool boolean,
  pool_position integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pool uuid[];
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support')) THEN
    RAISE EXCEPTION 'Nicht berechtigt (nur admin/support).' USING ERRCODE = '42501';
  END IF;

  SELECT finanzierer_ids INTO v_pool
    FROM public.projekte WHERE id = p_projekt_id;

  IF v_pool IS NULL THEN
    RAISE EXCEPTION 'Projekt nicht gefunden.' USING ERRCODE = 'P0002';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.vorname,
    p.nachname,
    p.email,
    p.phone,
    p.avatar_url,
    (p.id = ANY(v_pool)) AS in_pool,
    array_position(v_pool, p.id) AS pool_position
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE ur.role = 'finanzierer'::app_role;
END;
$$;

-- =========================================
-- 6.1e: Grants
-- =========================================
REVOKE ALL ON FUNCTION public.add_finanzierer_to_pool(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_finanzierer_from_pool(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_finanzierer_for_pool(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.add_finanzierer_to_pool(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_finanzierer_from_pool(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_finanzierer_for_pool(uuid) TO authenticated;
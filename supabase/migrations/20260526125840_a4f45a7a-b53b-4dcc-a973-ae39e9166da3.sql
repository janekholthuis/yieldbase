CREATE OR REPLACE FUNCTION public.list_finanzierer_for_pool(
  p_projekt_id uuid
) RETURNS TABLE(
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
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pool uuid[];
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support')) THEN
    RAISE EXCEPTION 'Nicht berechtigt (nur admin/support).' USING ERRCODE = '42501';
  END IF;

  SELECT projekte.finanzierer_ids INTO v_pool
    FROM public.projekte WHERE projekte.id = p_projekt_id;

  IF v_pool IS NULL THEN
    RAISE EXCEPTION 'Projekt nicht gefunden.' USING ERRCODE = 'P0002';
  END IF;

  RETURN QUERY
  SELECT
    p.id          AS id,
    p.name        AS name,
    p.vorname     AS vorname,
    p.nachname    AS nachname,
    p.email       AS email,
    p.phone       AS phone,
    p.avatar_url  AS avatar_url,
    (p.id = ANY(v_pool)) AS in_pool,
    array_position(v_pool, p.id)::int AS pool_position
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'finanzierer'::app_role
  ORDER BY
    (p.id = ANY(v_pool)) DESC,
    array_position(v_pool, p.id) ASC NULLS LAST,
    COALESCE(p.nachname, p.name, '') ASC,
    COALESCE(p.vorname, '') ASC;
END;
$$;
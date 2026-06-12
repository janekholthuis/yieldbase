CREATE OR REPLACE FUNCTION public.get_my_kunde_cases()
RETURNS TABLE (
  id         uuid,
  status     public.case_status,
  einheit_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT c.id, c.status, c.einheit_id, c.created_at, c.updated_at
    FROM public.finanzierungs_cases c
   WHERE c.kunde_id IN (
     SELECT k.id FROM public.kunden k WHERE k.user_id = auth.uid()
   )
   ORDER BY c.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_my_kunde_cases() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_kunde_cases() TO authenticated;

COMMENT ON FUNCTION public.get_my_kunde_cases() IS
  'Pseudonymisierte Case-Liste für den eingeloggten Kunden. Whitelist: id, status, einheit_id, created_at, updated_at. Keine Eckdaten, keine finanzierer_id, keine Notizen. Spec Z. 893.';
-- 1) FK constraints
ALTER TABLE public.objekt_kunde_zuweisungen
  ADD CONSTRAINT okz_einheit_id_fkey
    FOREIGN KEY (einheit_id) REFERENCES public.einheiten(id) ON DELETE RESTRICT,
  ADD CONSTRAINT okz_kunde_id_fkey
    FOREIGN KEY (kunde_id)   REFERENCES public.kunden(id)    ON DELETE RESTRICT,
  ADD CONSTRAINT okz_vp_id_fkey
    FOREIGN KEY (vp_id)      REFERENCES public.profiles(id)  ON DELETE RESTRICT;

NOTIFY pgrst, 'reload schema';

-- 2) get_my_vp RPC
CREATE OR REPLACE FUNCTION public.get_my_vp()
RETURNS TABLE(
  id uuid,
  name text,
  vorname text,
  nachname text,
  email text,
  phone text,
  avatar_url text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p.id, p.name, p.vorname, p.nachname, p.email, p.phone, p.avatar_url
    FROM public.profiles p
   WHERE p.id = (
     SELECT k.vp_id FROM public.kunden k
      WHERE k.user_id = auth.uid()
      LIMIT 1
   );
$$;

REVOKE ALL ON FUNCTION public.get_my_vp() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_vp() TO authenticated;
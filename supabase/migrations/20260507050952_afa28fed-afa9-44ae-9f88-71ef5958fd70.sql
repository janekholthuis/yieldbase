
-- Revoke default PUBLIC/anon execute on SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_roles() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_internal_non_kunde(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_descendant_of(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_in_my_subtree(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_vp_hierarchy() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_internal_non_kunde(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_descendant_of(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_in_my_subtree(uuid) TO authenticated;

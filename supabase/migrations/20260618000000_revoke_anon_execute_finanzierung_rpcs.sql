-- BUG-F1 (Low / Hygiene): the finanzierung-family RPCs are SECURITY DEFINER and
-- were EXECUTE-able by the `anon` role. They are only ever invoked by
-- authenticated users — pool mutations are admin/support-gated internally and
-- get_my_kunde_cases is scoped to auth.uid() — so `anon` has no legitimate use.
-- Revoke anon EXECUTE to shrink the attack surface and clear the advisor WARN.
--
-- We deliberately DO NOT revoke the RLS-predicate helpers
-- (can_access_case, finanzierer_sees_einheit, finanzierer_sees_projekt): those are
-- evaluated inside RLS policy expressions, where revoking EXECUTE could affect
-- policy evaluation for anon-context queries. Only the direct RPCs are revoked.

revoke execute on function public.add_finanzierer_to_pool(uuid, uuid) from anon;
revoke execute on function public.remove_finanzierer_from_pool(uuid, uuid) from anon;
revoke execute on function public.list_finanzierer_for_pool(uuid) from anon;
revoke execute on function public.get_my_kunde_cases() from anon;

-- QA hardening (Supabase advisor lints 0028/0029
-- anon/authenticated_security_definer_function_executable).
--
-- Trigger, event-trigger and maintenance SECURITY DEFINER functions are never
-- invoked directly by API clients — the trigger mechanism executes them
-- regardless of role EXECUTE grants. Remove the redundant anon/authenticated/
-- PUBLIC EXECUTE so they are no longer reachable via the PostgREST RPC surface.
-- service_role + postgres keep their explicit grants.
--
-- Deliberately NOT touched: RLS-policy helper functions (current_org_id,
-- can_access_*, *_sees_*, is_org_*, has_role, ...) and client-called RPCs
-- (is_descendant_of, submit_selbstauskunft, get_my_*, list_finanzierer_for_pool,
-- add/remove_finanzierer_to_pool, get_my_vp) — authenticated legitimately needs
-- EXECUTE on those, so revoking would break RLS evaluation and app features.
revoke execute on function
  public.cases_protect_update_columns(),
  public.kunden_dokumente_audit(),
  public.kunden_dokumente_protect_update(),
  public.kunden_protect_system_fields(),
  public.projekte_protect_pool_columns(),
  public.set_default_org_id(),
  public.sync_einheit_status_from_reservierung(),
  public.sync_kunde_to_profile(),
  public.rls_auto_enable(),
  public.verify_trigger_defense()
from public, anon, authenticated;

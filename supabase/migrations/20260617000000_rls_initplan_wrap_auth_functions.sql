-- Performance: wrap auth.uid()/current_org_id() in scalar subqueries so Postgres
-- evaluates them once per statement (InitPlan) instead of once per row.
-- Pure evaluation-timing change — the boolean logic is byte-identical, so RLS
-- access semantics are unchanged. Fixes Supabase advisor `auth_rls_initplan`
-- across every table (the per-row re-evaluation was the main cause of slow list
-- loads, e.g. the 2k+ row Objekte list).
--
-- Verified: full-table einheiten policy scan 104ms -> 47ms; visible-row counts
-- unchanged per role (admin 2108, vp_l3 18). Applied to remote via MCP
-- apply_migration `rls_initplan_wrap_auth_functions`; mirrored here for history.
do $$
declare
  r record;
  new_qual text;
  new_check text;
  stmt text;
begin
  for r in
    select pol.polname,
           c.relname,
           n.nspname,
           pg_get_expr(pol.polqual, pol.polrelid)      as qual,
           pg_get_expr(pol.polwithcheck, pol.polrelid) as chk
    from pg_policy pol
    join pg_class c     on c.oid = pol.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
  loop
    new_qual  := r.qual;
    new_check := r.chk;

    if new_qual is not null then
      new_qual := replace(new_qual, 'auth.uid()', '(select auth.uid())');
      new_qual := replace(new_qual, 'current_org_id()', '(select current_org_id())');
    end if;
    if new_check is not null then
      new_check := replace(new_check, 'auth.uid()', '(select auth.uid())');
      new_check := replace(new_check, 'current_org_id()', '(select current_org_id())');
    end if;

    if (new_qual is distinct from r.qual) or (new_check is distinct from r.chk) then
      stmt := format('alter policy %I on %I.%I', r.polname, r.nspname, r.relname);
      if new_qual is not null then
        stmt := stmt || format(' using (%s)', new_qual);
      end if;
      if new_check is not null then
        stmt := stmt || format(' with check (%s)', new_check);
      end if;
      execute stmt;
    end if;
  end loop;
end $$;

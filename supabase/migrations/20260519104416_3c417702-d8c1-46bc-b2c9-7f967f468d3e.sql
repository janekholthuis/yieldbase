
-- Generic audit_logs table for cross-module audit (kunden_dokumente, reservierungen, provisionen, tickets, ...)
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  kunde_id uuid references public.kunden(id) on delete set null,
  by_user_id uuid not null references public.profiles(id),
  meta jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);

create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_kunde_idx on public.audit_logs (kunde_id) where kunde_id is not null;
create index audit_logs_user_idx on public.audit_logs (by_user_id);
create index audit_logs_at_idx on public.audit_logs (at desc);

alter table public.audit_logs enable row level security;

-- Only admin/support can read audit logs. No insert/update/delete policy for clients;
-- inserts happen exclusively via SECURITY DEFINER triggers from owning modules.
create policy "audit_logs_admin_support_select"
  on public.audit_logs
  for select
  using (
    has_role(auth.uid(), 'admin'::app_role)
    or has_role(auth.uid(), 'support'::app_role)
  );

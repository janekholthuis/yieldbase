-- PROJ-24: Personalisierte Lead-Sandbox („Branded Demo-Link").
-- demo_links = von Admin/Support erzeugte, gebrandete Token-Links auf eine
-- öffentliche, ephemere Demo-Instanz. demo_link_leads = über den CTA erfasste
-- Kontaktanfragen. Lead-Reads/Open-Tracking/Capture laufen serverseitig über
-- den Service-Role-Client (gescopt auf den Slug); die Verwaltung läuft über RLS.

create table if not exists public.demo_links (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  lead_company text not null,
  lead_website text,
  logo_url text,
  primary_color text,   -- Hex, z.B. #0A2E4F (null = neutrales EMI-Hub-Theme)
  accent_color text,    -- Hex
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  is_active boolean not null default true,
  opened_count integer not null default 0,
  first_opened_at timestamptz,
  last_opened_at timestamptz
);

create index if not exists demo_links_slug_idx on public.demo_links (slug);
create index if not exists demo_links_created_by_idx on public.demo_links (created_by);

create table if not exists public.demo_link_leads (
  id uuid primary key default gen_random_uuid(),
  demo_link_id uuid not null references public.demo_links(id) on delete cascade,
  name text,
  company text,
  email text,
  message text,
  created_at timestamptz not null default now()
);

create index if not exists demo_link_leads_link_idx on public.demo_link_leads (demo_link_id);

alter table public.demo_links enable row level security;
alter table public.demo_link_leads enable row level security;

-- Verwaltung: nur admin + support (FOR ALL). Lead-seitige Zugriffe laufen über
-- den Service-Role-Client und umgehen RLS bewusst (gescopt auf den Slug im Code).
create policy demo_links_admin_all on public.demo_links for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
create policy demo_links_support_all on public.demo_links for all to authenticated
  using (public.has_role(auth.uid(), 'support'))
  with check (public.has_role(auth.uid(), 'support'));

create policy demo_leads_admin_all on public.demo_link_leads for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
create policy demo_leads_support_all on public.demo_link_leads for all to authenticated
  using (public.has_role(auth.uid(), 'support'))
  with check (public.has_role(auth.uid(), 'support'));

-- anon hat keinerlei direkten Tabellenzugriff (kein Policy-Match) — Defense-in-depth.
revoke all on public.demo_links from anon;
revoke all on public.demo_link_leads from anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- Synthetic seed for Supabase BRANCH / LOCAL databases (staging).
--
-- Runs automatically on `supabase db reset`, `supabase start`, and on every
-- branch DB provisioned by Supabase Branching. Contains ONLY synthetic data —
-- never real customer PII. See docs/STAGING-PLAN.md.
--
-- Defensive by design: upserts + exception guards so it survives whether or not
-- an `on auth.users insert` trigger (handle_new_user) pre-creates profiles/roles.
-- NB: validate against the first real branch — organisation_members shape and any
-- auth triggers are env-specific (Phase 2 in the runbook).
-- ─────────────────────────────────────────────────────────────────────────────

-- Fixed IDs so business data can reference the demo users deterministically.
-- org:         11111111-…   admin: a000…0001   vp: a000…0002   finanzierer: a000…0003
-- Password for all three demo users: staging-demo-123

-- ── 1) Auth users (login-fähig) ─────────────────────────────────────────────
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
   created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
   confirmation_token, recovery_token, email_change, email_change_token_new)
values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001',
   'authenticated', 'authenticated', 'admin@staging.test',
   crypt('staging-demo-123', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000002',
   'authenticated', 'authenticated', 'vp@staging.test',
   crypt('staging-demo-123', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000003',
   'authenticated', 'authenticated', 'finanzierer@staging.test',
   crypt('staging-demo-123', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}', '', '', '', '')
on conflict (id) do nothing;

-- Email identities (newer GoTrue requires an identity row to allow password login).
insert into auth.identities
  (id, user_id, identity_data, provider, provider_id,
   last_sign_in_at, created_at, updated_at)
values
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001',
   '{"sub":"a0000000-0000-0000-0000-000000000001","email":"admin@staging.test"}',
   'email', 'a0000000-0000-0000-0000-000000000001', now(), now(), now()),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002',
   '{"sub":"a0000000-0000-0000-0000-000000000002","email":"vp@staging.test"}',
   'email', 'a0000000-0000-0000-0000-000000000002', now(), now(), now()),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000003',
   '{"sub":"a0000000-0000-0000-0000-000000000003","email":"finanzierer@staging.test"}',
   'email', 'a0000000-0000-0000-0000-000000000003', now(), now(), now())
on conflict do nothing;

-- ── 2) Organisation ─────────────────────────────────────────────────────────
insert into public.organisationen (id, name, slug, owner_id, primary_color, accent_color)
values ('11111111-1111-1111-1111-111111111111', 'Staging Demo GmbH', 'staging-demo',
        'a0000000-0000-0000-0000-000000000001', '#1B2D45', '#C99B4D')
on conflict (id) do nothing;

-- ── 3) Profiles (upsert — robust gegen handle_new_user-Trigger) ─────────────
insert into public.profiles
  (id, email, vorname, nachname, name, active_organisation_id)
values
  ('a0000000-0000-0000-0000-000000000001', 'admin@staging.test', 'Anna', 'Admin',
   'Anna Admin', '11111111-1111-1111-1111-111111111111'),
  ('a0000000-0000-0000-0000-000000000002', 'vp@staging.test', 'Viktor', 'Partner',
   'Viktor Partner', '11111111-1111-1111-1111-111111111111'),
  ('a0000000-0000-0000-0000-000000000003', 'finanzierer@staging.test', 'Felix', 'Finanz',
   'Felix Finanz', '11111111-1111-1111-1111-111111111111')
on conflict (id) do update
  set active_organisation_id = excluded.active_organisation_id,
      vorname = excluded.vorname, nachname = excluded.nachname, name = excluded.name;

-- ── 4) Rollen (kein garantierter Unique-Constraint → where not exists) ───────
insert into public.user_roles (user_id, role)
select v.uid, v.role::app_role from (values
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'admin'),
  ('a0000000-0000-0000-0000-000000000002'::uuid, 'vp_l1'),
  ('a0000000-0000-0000-0000-000000000003'::uuid, 'finanzierer')
) as v(uid, role)
where not exists (
  select 1 from public.user_roles ur where ur.user_id = v.uid and ur.role = v.role::app_role
);

-- ── 5) Org-Mitgliedschaft (best-effort — Shape env-spezifisch, Phase 2) ──────
do $$ begin
  insert into public.organisation_members (organisation_id, user_id, rolle)
  values
    ('11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000001', 'admin'),
    ('11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000002', 'mitglied')
  on conflict do nothing;
exception when others then
  raise notice 'organisation_members seed skipped (validate shape on first branch): %', sqlerrm;
end $$;

-- ── 6) Projekte ─────────────────────────────────────────────────────────────
insert into public.projekte
  (id, name, adresse, stadt, plz, bundesland, projekt_typ, organisation_id,
   created_by, baujahr, mietrendite_brutto, cover_image_url)
values
  ('c1000000-0000-0000-0000-000000000001', 'Stadtquartier Süd', 'Musterstraße 1',
   'Leipzig', '04109', 'Sachsen', 'mfh', '11111111-1111-1111-1111-111111111111',
   'a0000000-0000-0000-0000-000000000001', 1998, 4.2, null),
  ('c1000000-0000-0000-0000-000000000002', 'Parkresidenz Nord', 'Beispielweg 12',
   'Halle (Saale)', '06108', 'Sachsen-Anhalt', 'mfh', '11111111-1111-1111-1111-111111111111',
   'a0000000-0000-0000-0000-000000000001', 2012, 3.8, null),
  ('c1000000-0000-0000-0000-000000000003', 'Altbau-Perle', 'Demoallee 7',
   'Dresden', '01067', 'Sachsen', 'etw_einzeln', '11111111-1111-1111-1111-111111111111',
   'a0000000-0000-0000-0000-000000000001', 1925, 3.5, null)
on conflict (id) do nothing;

-- ── 7) Einheiten ────────────────────────────────────────────────────────────
insert into public.einheiten
  (projekt_id, wohnungsnummer, etage, wohnflaeche, zimmer, kaufpreis, miete,
   status, freigabe_status, organisation_id, vermietet)
values
  ('c1000000-0000-0000-0000-000000000001', 'WE 1', 0, 58.0, 2, 189000, 690,
   'frei', 'freigegeben', '11111111-1111-1111-1111-111111111111', true),
  ('c1000000-0000-0000-0000-000000000001', 'WE 2', 1, 72.5, 3, 245000, 850,
   'auf_anfrage', 'freigegeben', '11111111-1111-1111-1111-111111111111', true),
  ('c1000000-0000-0000-0000-000000000001', 'WE 3', 2, 45.0, 1, 149000, 540,
   'reserviert', 'in_bearbeitung', '11111111-1111-1111-1111-111111111111', false),
  ('c1000000-0000-0000-0000-000000000002', 'WE 1', 0, 64.0, 2, 210000, 760,
   'frei', 'freigegeben', '11111111-1111-1111-1111-111111111111', true),
  ('c1000000-0000-0000-0000-000000000002', 'WE 2', 1, 88.0, 3, 295000, 980,
   'verkauft', 'freigegeben', '11111111-1111-1111-1111-111111111111', true),
  ('c1000000-0000-0000-0000-000000000003', 'EG rechts', 0, 95.0, 4, 320000, 1100,
   'frei', 'entwurf', '11111111-1111-1111-1111-111111111111', false)
on conflict do nothing;

-- ── 8) Kunden (synthetisch — keine echte PII) ───────────────────────────────
insert into public.kunden
  (vp_id, organisation_id, status, anrede, vorname, nachname, email, telefon,
   brutto_jahreseinkommen, eigenkapital, persoenlicher_steuersatz)
values
  ('a0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'lead', null, 'Maria', 'Muster', 'maria.muster@example.test', '+49 30 0000001',
   65000, 40000, 42),
  ('a0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'aktiviert', null, 'Tom', 'Test', 'tom.test@example.test', '+49 30 0000002',
   82000, 60000, 44),
  ('a0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'bonitaet_geprueft', null, 'Sara', 'Sample', 'sara.sample@example.test', '+49 30 0000003',
   110000, 90000, 45)
on conflict do nothing;

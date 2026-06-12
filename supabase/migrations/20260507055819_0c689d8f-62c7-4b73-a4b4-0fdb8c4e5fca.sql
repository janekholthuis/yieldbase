INSERT INTO public.invites (token, email, role, invited_by, parent_vp_id, vertriebsleiter_id, expires_at)
VALUES (
  'smoketest1234567890abcdef',
  'smoketest@yieldbase.demo',
  'kunde',
  '3ddeb633-cad5-4952-a6db-62f1f4c1e601',
  NULL,
  '3ddeb633-cad5-4952-a6db-62f1f4c1e601',
  now() + interval '7 days'
) ON CONFLICT (token) DO NOTHING;
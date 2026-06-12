UPDATE auth.users
SET email = replace(email, '@yieldbase.demo', '@yieldbase.example.com'),
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) ||
      jsonb_build_object('email', replace(COALESCE(raw_user_meta_data->>'email', email), '@yieldbase.demo', '@yieldbase.example.com'))
WHERE email LIKE '%@yieldbase.demo';

UPDATE auth.identities
SET identity_data = identity_data ||
  jsonb_build_object('email', replace(identity_data->>'email', '@yieldbase.demo', '@yieldbase.example.com'))
WHERE identity_data->>'email' LIKE '%@yieldbase.demo';

DELETE FROM public.invites WHERE token = 'smoketest1234567890abcdef';
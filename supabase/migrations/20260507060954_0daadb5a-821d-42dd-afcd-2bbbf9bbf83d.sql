UPDATE public.profiles
SET email = replace(email, '@yieldbase.demo', '@yieldbase.example.com')
WHERE email LIKE '%@yieldbase.demo';
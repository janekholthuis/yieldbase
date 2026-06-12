ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bank_kontoinhaber text,
  ADD COLUMN IF NOT EXISTS bank_iban text,
  ADD COLUMN IF NOT EXISTS bank_bic text;
ALTER TABLE public.kunden ADD COLUMN IF NOT EXISTS steuersatz_durchschnitt numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS steuersatz_durchschnitt numeric;
COMMENT ON COLUMN public.kunden.steuersatz_durchschnitt IS 'Durchschnittsteuersatz (0..1), für Bonitäts-/Netto-Berechnung';
COMMENT ON COLUMN public.kunden.persoenlicher_steuersatz IS 'Grenzsteuersatz (0..1), für Kalkulations-Module (Steuerersparnis Vermietung)';
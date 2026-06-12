ALTER TYPE public.zuweisung_status ADD VALUE IF NOT EXISTS 'kalkulation_erstellt';
ALTER TYPE public.zuweisung_status ADD VALUE IF NOT EXISTS 'praesentation_gehalten';
ALTER TYPE public.zuweisung_status ADD VALUE IF NOT EXISTS 'reserviert';
ALTER TYPE public.zuweisung_status ADD VALUE IF NOT EXISTS 'verkauft';
-- Rebuild einheit_status (7 Werte) and provision_status (5 Werte) atomically

BEGIN;

-- ============ einheit_status ============
ALTER TYPE public.einheit_status RENAME TO einheit_status_old;

CREATE TYPE public.einheit_status AS ENUM (
  'verfuegbar',
  'reserviert',
  'in_finanzierung',
  'kaufvertrag_bestellt',
  'notartermin',
  'verkauft',
  'abgebrochen'
);

-- Drop default before type change
ALTER TABLE public.einheiten ALTER COLUMN status DROP DEFAULT;

-- Migrate column: map old values to new (gesperrt -> abgebrochen as closest semantic)
ALTER TABLE public.einheiten
  ALTER COLUMN status TYPE public.einheit_status
  USING (
    CASE status::text
      WHEN 'gesperrt' THEN 'abgebrochen'
      ELSE status::text
    END
  )::public.einheit_status;

ALTER TABLE public.einheiten
  ALTER COLUMN status SET DEFAULT 'verfuegbar'::public.einheit_status;

DROP TYPE public.einheit_status_old;

-- ============ provision_status ============
ALTER TYPE public.provision_status RENAME TO provision_status_old;

CREATE TYPE public.provision_status AS ENUM (
  'pipeline',
  'verdient',
  'in_auszahlung',
  'ausgezahlt',
  'storniert'
);

ALTER TABLE public.provisionen ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.provisionen
  ALTER COLUMN status TYPE public.provision_status
  USING (
    CASE status::text
      WHEN 'offen'    THEN 'pipeline'
      WHEN 'faellig'  THEN 'verdient'
      ELSE status::text
    END
  )::public.provision_status;

ALTER TABLE public.provisionen
  ALTER COLUMN status SET DEFAULT 'pipeline'::public.provision_status;

DROP TYPE public.provision_status_old;

COMMIT;
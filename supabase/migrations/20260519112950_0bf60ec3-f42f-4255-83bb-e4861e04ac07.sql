alter table public.kunden
  add column if not exists selbstauskunft_step integer not null default 0,
  add column if not exists selbstauskunft_submitted_at timestamptz;
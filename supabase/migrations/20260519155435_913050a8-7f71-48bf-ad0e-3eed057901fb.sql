-- Spread Anna Schmidt's 3 demo cases into different statuses for portal-card demo
SET session_replication_role = replica;

UPDATE public.finanzierungs_cases
SET status = 'in_pruefung'::case_status
WHERE id = '856226b6-38ac-4f23-b83f-3c087863f39b';

UPDATE public.finanzierungs_cases
SET status = 'unterlagen_fehlen'::case_status
WHERE id = '670ee3b9-b3af-4a91-a08b-f463d03d6a03';

UPDATE public.finanzierungs_cases
SET status = 'angebot_vorhanden'::case_status,
    zins_satz = 3.85,
    tilgung_initial = 2.0,
    laufzeit_jahre = 30,
    sondertilgung_pa = 5.0,
    monatliche_rate = 1180,
    finanzierungs_summe = 240000,
    gesamtkosten = 268500,
    notiz_finanzierer = 'Standardkonditionen, Bonität geprüft.',
    offer_filled_at = now()
WHERE id = '211a7194-db47-4ba5-aca4-147ecb8e7e01';

SET session_replication_role = DEFAULT;
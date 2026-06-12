
UPDATE public.profiles SET vorname='Anna', nachname='Schmidt', name='Anna Schmidt', email='kunde1@example.com', anrede='frau'
WHERE id = '9412daaa-fa4c-457c-9a68-fcdf2a734792';
UPDATE public.kunden SET anrede='frau', vorname='Anna', nachname='Schmidt', email='kunde1@example.com',
  brutto_jahreseinkommen=72000, eigenkapital=80000, persoenlicher_steuersatz=35,
  max_finanzierbar=420000, max_monatsrate=1800, max_darlehen=340000, status='bonitaet_geprueft'
WHERE id = 'cc6f6312-b48f-4f4c-a4c1-4744ab1c8d5f';

UPDATE public.profiles SET vorname='Markus', nachname='Weber', name='Markus Weber', email='kunde2@example.com', anrede='herr'
WHERE id = '7437b823-9449-4806-a82e-d5045ec001f5';
UPDATE public.kunden SET anrede='herr', vorname='Markus', nachname='Weber', email='kunde2@example.com',
  brutto_jahreseinkommen=95000, eigenkapital=120000, persoenlicher_steuersatz=42,
  max_finanzierbar=560000, max_monatsrate=2400, max_darlehen=440000, status='bonitaet_geprueft'
WHERE id = '96114b0e-6971-4ffd-ba26-95c88ac190e6';

UPDATE public.profiles SET vorname='Tobias', nachname='Bauer', name='Tobias Bauer', email='kunde3@example.com', anrede='herr'
WHERE id = '1742582f-5409-4d56-a67e-5f1939060005';
UPDATE public.kunden SET anrede='herr', vorname='Tobias', nachname='Bauer', email='kunde3@example.com',
  brutto_jahreseinkommen=58000, eigenkapital=45000, persoenlicher_steuersatz=30,
  max_finanzierbar=320000, max_monatsrate=1450, max_darlehen=275000, status='bonitaet_geprueft'
WHERE id = 'c11dcb5a-9c10-411d-ad7f-49ed354da9f1';

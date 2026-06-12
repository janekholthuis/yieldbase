UPDATE public.profiles
   SET vorname = 'Bank',
       nachname = 'Müller',
       name = 'Bank Müller'
 WHERE email = 'fin1@yieldbase.example.com'
   AND vorname IS NULL
   AND nachname IS NULL;

UPDATE public.profiles
   SET vorname = 'Volksbank',
       nachname = 'Schmidt',
       name = 'Volksbank Schmidt'
 WHERE email = 'fin2@yieldbase.example.com'
   AND vorname IS NULL
   AND nachname IS NULL;

UPDATE public.profiles
   SET vorname = 'Sparkasse',
       nachname = 'Weber',
       name = 'Sparkasse Weber'
 WHERE email = 'fin3@yieldbase.example.com'
   AND vorname IS NULL
   AND nachname IS NULL;
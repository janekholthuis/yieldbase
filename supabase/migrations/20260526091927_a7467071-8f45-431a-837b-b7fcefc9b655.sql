SET LOCAL session_replication_role = replica;

UPDATE public.finanzierungs_cases
   SET status = 'in_bearbeitung'
 WHERE status = 'in_pruefung';

UPDATE public.finanzierungs_cases
   SET status = 'bewilligt'
 WHERE status = 'genehmigt';

SET LOCAL session_replication_role = origin;
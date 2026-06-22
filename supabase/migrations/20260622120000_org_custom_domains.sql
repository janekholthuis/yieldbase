-- PROJ-30: Org-Custom-Domains
-- Jede Organisation kann eine eigene Domain verbinden. Die App löst beim Request
-- den Host-Header gegen organisationen.domain auf (Branding + Org-Scope).
-- domain_verified wird gesetzt, sobald die Domain in Vercel verifiziert ist.

alter table organisationen
  add column if not exists domain text,
  add column if not exists domain_verified boolean not null default false;

-- Domains sind case-insensitive eindeutig (eine Domain → genau eine Org).
create unique index if not exists organisationen_domain_unique
  on organisationen (lower(domain)) where domain is not null;

-- Bestandsdaten: emi-hub.de gehört der Haupt-Org „Erfolg mit Immobilien".
update organisationen set domain = 'emi-hub.de', domain_verified = true
  where slug = 'erfolg-mit-immobilien' and domain is null;

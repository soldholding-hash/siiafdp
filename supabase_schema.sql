-- SIGEF — Schéma de persistance Supabase
-- Chaque table stocke les lignes sous forme d'objet JSON (colonne "data"),
-- ce qui correspond exactement à la structure déjà utilisée dans
-- l'application React. Cette approche permet de brancher la persistance
-- réelle sans réécrire toute la logique métier existante.

create table if not exists parcelles (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists cartes (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists dossiers (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists baux (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists encaissements (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists audit (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- Row Level Security : activé par précaution, avec une politique
-- permissive pour l'instant (l'application ne passe pas encore par
-- Supabase Auth — voir la note de sécurité dans le README).
alter table parcelles enable row level security;
alter table cartes enable row level security;
alter table dossiers enable row level security;
alter table baux enable row level security;
alter table encaissements enable row level security;
alter table audit enable row level security;

create policy "Accès complet (démo)" on parcelles for all using (true) with check (true);
create policy "Accès complet (démo)" on cartes for all using (true) with check (true);
create policy "Accès complet (démo)" on dossiers for all using (true) with check (true);
create policy "Accès complet (démo)" on baux for all using (true) with check (true);
create policy "Accès complet (démo)" on encaissements for all using (true) with check (true);
create policy "Accès complet (démo)" on audit for all using (true) with check (true);

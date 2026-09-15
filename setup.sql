create table if not exists dropit_user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table dropit_user_data enable row level security;

-- Profil de personnalisation (questionnaire d'onboarding).
-- Table séparée de dropit_user_data : celle-ci est réécrite en entier à chaque
-- sauvegarde debouncée des projets, le profil n'a pas à subir ce cycle.
-- answers : identifiants stables uniquement ({"age":"25_34"}), jamais les libellés.
create table if not exists dropit_user_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table dropit_user_profile enable row level security;

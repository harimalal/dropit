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

-- Limite de débit applicative basique par utilisateur et par endpoint
-- (functions/_lib/auth.js, checkRateLimit/enforceRateLimit). Jamais interrogée
-- directement par le client (clé anon) : uniquement par les fonctions
-- Cloudflare via la clé service_role, donc pas de policy RLS requise (RLS
-- activée quand même par cohérence avec les autres tables, refus par défaut).
create table if not exists dropit_rate_limit (
  user_id uuid not null,
  endpoint text not null,
  window_start timestamptz not null,
  count int not null default 1,
  primary key (user_id, endpoint, window_start)
);

alter table dropit_rate_limit enable row level security;

-- Incrémente le compteur de la fenêtre courante (1 minute) de façon atomique
-- (insert .. on conflict .. do update dans une seule instruction = pas de
-- race condition entre deux requêtes simultanées) et purge au passage les
-- fenêtres de plus de 10 minutes pour que la table ne grossisse jamais sans
-- limite. Retourne true si l'appelant est encore sous le plafond p_max.
create or replace function dropit_check_rate_limit(p_user_id uuid, p_endpoint text, p_max int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz := date_trunc('minute', now());
  v_count int;
begin
  delete from dropit_rate_limit where window_start < v_window - interval '10 minutes';

  insert into dropit_rate_limit (user_id, endpoint, window_start, count)
  values (p_user_id, p_endpoint, v_window, 1)
  on conflict (user_id, endpoint, window_start)
  do update set count = dropit_rate_limit.count + 1
  returning count into v_count;

  return v_count <= p_max;
end;
$$;

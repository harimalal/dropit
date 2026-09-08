# DROPIT

Application de productivité personnelle assistée par IA : une intention exprimée en langage naturel ("On aimerait partir à Bali en septembre") est transformée en projet structuré (catégories, tâches, priorités), avec en permanence une seule prochaine action mise en avant.

Déployée sur Cloudflare Pages : **https://dropit-dbx.pages.dev**

## Structure du repo

| Chemin | Rôle |
|---|---|
| `index.html` | Page d'atterrissage publique ("Dropit — Arrête de perdre tes idées.") |
| `app.html` | L'application elle-même (écrans Accueil, Détail projet, Priorités, Chat IA, Calendrier) |
| `functions/api/` | Fonctions Cloudflare Pages (backend) : `ai.js` (appels au modèle IA), `projects.js` (lecture/écriture des données utilisateur), `config.js` |
| `functions/_lib/auth.js` | Vérification du jeton d'authentification côté serveur |
| `setup.sql` | Schéma Supabase (`dropit_user_data`, RLS activée) |
| `SETUP_AUTH.md` | État et procédure de configuration de l'authentification (Supabase) |
| `onboarding/` | Visuels des slides d'onboarding |
| `docs/superpowers/` | Specs et plans ponctuels hors méthodologie `MISSIONS/` |
| `vivre.html`, `vivre-handoff.md` | Prototype exploratoire indépendant ("Vivre"), pas l'app déployée |

## Méthodologie `MISSIONS/`

Chaque effort de fond (audit, refonte, cadrage produit) a son propre dossier daté sous `MISSIONS/AAAA-MM-JJ-nom-court/`, avec une convention commune :

- **`CADRAGE.md`** — reformulation de l'objectif, hypothèses, benchmark produit, options de fond avec recommandation, lignes rouges, plan de phases. Rédigé avant tout code.
- **`decisions.md`** — choix validés une fois le cadrage arbitré, débats structurants (position de chaque option, convergence retenue, ce qui a été écarté et pourquoi), décisions d'exécution mineures au fil de l'eau.
- **`etat.md`** — statut courant de la mission et journal append-only (une ligne par événement, jamais réécrit).
- Certaines missions ajoutent `BENCHMARK.md`, `plan.md`, `AUDIT.md` ou un dossier `livrables/` selon le besoin.

Missions existantes : voir `MISSIONS/`.

## Backend

- **Hébergement** : Cloudflare Pages + Cloudflare Functions.
- **Données & auth** : Supabase (Postgres avec Row Level Security, voir `setup.sql` et `SETUP_AUTH.md`).
- **IA** : API Anthropic (Claude), appelée exclusivement via `functions/api/ai.js` — jamais de clé API exposée côté client.

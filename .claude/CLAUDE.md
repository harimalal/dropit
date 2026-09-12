# DROPIT — Contexte de session

Tu travailles sur DROPIT, une app de productivité personnelle assistée par IA.
URL de prod : https://dropit-dbx.pages.dev
Repo : https://github.com/harimalal/dropit

## Stack

- Frontend : `app.html` — SPA vanilla JS, ~5000 lignes, fichier unique, rendu par `innerHTML` via `render()`, aucun framework
- Backend : Cloudflare Pages Functions (`functions/api/`) — `ai.js` (Anthropic API), `projects.js` (lecture/écriture), `config.js`
- Auth : Supabase (Postgres + RLS, JWT vérifié côté serveur dans `functions/_lib/auth.js`)
- Landing : `index.html` (carrousel non-scrollable, 6 slides)
- Déploiement : Cloudflare Pages, push sur `main` = déploiement automatique

## Règles techniques non négociables

- Jamais de clé API côté client — tous les appels Anthropic passent par `functions/api/ai.js`
- `user_id` toujours dérivé du JWT vérifié serveur, jamais d'un paramètre client
- `render()` réinitialise tout le innerHTML ET rebind les events via `bindGlobalEvents()` — tout nouveau listener passe par là
- Modèles autorisés : `claude-haiku-4-5-20251001` (appels fréquents), `claude-sonnet-4-6` (création de projet)
- Commits en français, messages courts, jamais de `git add -A` (risque d'embarquer des fichiers non voulus)
- Toujours tester dans un vrai navigateur (Playwright) avant de pousser — pas de "ça devrait marcher"

## Convention MISSIONS/

Chaque chantier de fond a son dossier `MISSIONS/AAAA-MM-JJ-nom/` avec :
- `CADRAGE.md` — objectif, options tranchées, benchmark, lignes rouges. Écrit AVANT tout code.
- `decisions.md` — choix validés, options écartées et pourquoi, itérations
- `etat.md` — statut courant + journal append-only (une ligne par événement, jamais réécrit)

Avant de coder quoi que ce soit : lire le `CADRAGE.md` et `decisions.md` de la mission en cours.
Après chaque livraison : mettre à jour `etat.md`.

### Artefacts de session (règle non négociable)

Tout artefact produit pendant une session (mockup HTML, analyse approfondie, page de test localhost, capture d'écran, script d'exploration...) doit être commité dans `MISSIONS/<mission>/livrables/` — jamais laissé uniquement dans le bac à sable cloud, un dossier temporaire, ou le disque local sans être versionné. C'est le dossier projet Git qui fait foi, pas l'environnement d'exécution.
Ces livrables ne font jamais partie du code de l'application (`app.html`, `index.html`, `functions/`) : ils documentent/illustrent, ils ne sont pas déployés. Ne jamais les fusionner dans le code applicatif sauf demande explicite de le faire passer en fonctionnalité réelle.

## Avant de démarrer une session

1. Lire ce fichier
2. `git pull origin main` pour être à jour
3. Lire `etat.md` de la mission en cours (voir ci-dessous)
4. Si nouvelle mission : créer le dossier MISSIONS/ et écrire CADRAGE.md avant tout code

## État actuel du projet (mis à jour 2026-09-12)

### Mission en cours : 2026-09-08-vision-engagement-identite
Statut : IMPLÉMENTATION EN COURS
Chantiers 1, 2, 3, 4 livrés + 7 chantiers bonus livrés (accordéon catégories, refonte vue projet, Drop Zone, carrousel Prochaine action, nettoyage nav)
Prochaine étape : Chantier 5 (statuts de vélocité) — à confirmer avec l'utilisateur avant de démarrer
Bloqué : Chantier 8 (mosaïque image) — attend un service de génération d'image tiers

### Mission terminée : 2026-09-10-landing-carousel-benefices
Landing page carrousel livrée (6 slides, mockups SVG, swipe tactile). Fermée.

### Backlog acté (pas encore en mission)
- BYOK Anthropic : chaque utilisateur colle sa propre clé API (table `dropit_user_settings` à créer)
- Chantier 5 : statuts de vélocité (flèche + barre teintée, pause auto/manuelle — nécessite historisation des dates de complétion)
- Chantier 6 : signature move sur "C'est fait" (récompense variable, micro-animation)
- Chantier 7 : intitulé d'identité par projet (un champ texte + langage dynamique)
- Suppression de compte en libre-service (RGPD)

## Branche active

`feature/ux-navbar-liste-projet` : historique disjoint de `main` (aucun ancêtre commun, ancienne lignée du repo antérieure à la mission en cours). Archivée le 2026-09-12 sous `archive/feature-ux-navbar-liste-projet` (copie complète de l'historique) ; la branche d'origine reste à supprimer manuellement sur GitHub (aucun outil de suppression de branche distante disponible côté session cloud). Ne pas la merger.

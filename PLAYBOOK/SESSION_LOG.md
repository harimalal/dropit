# SESSION LOG — DROPIT

---

## Session 4 — 2026-09-05/06 · Onboarding, fuite de données critique, audit, landing page

**Commits :** 810129d · 0175cdb · db6283a · 622af15 · 78315c3 · 95bdf29 · bad0b5e · 588b784 · 1dec6bd · b26a4f7 · 5c77be1 · bfa133e · 6fffe6b — tous poussés et déployés

Durée réelle (horodatage git) : 20:25 → 02:55, soit environ 6h30, en une session continue.

### Travail réalisé

**Branding auth + polish accueil (20:25–22:51)**
- Logo "DROP●IT" en pilule + tagline 3 lignes + icônes flottantes (anniv, voiture, formation, taf) sur l'écran de connexion, ~11 itérations de calage
- Bascule des appels IA fréquents (suggestion, chat, DNA projet) sur `claude-haiku-4-5`, garde `claude-sonnet-4-6` pour la génération de projet complète (plus complexe) — décision utilisateur explicite via choix fermé
- Fix titres de tuiles tronqués horizontalement sur l'accueil (`word-break`, `overflow-wrap`)
- Salutation "Let's Go ! `<Prénom>`" en tête de l'accueil, prénom dérivé de l'email (bug corrigé : séparateur `.`/`-`/`_`/chiffre, pas juste capitaliser tout le local-part)

**Onboarding première connexion (bad0b5e)**
- 6 slides déclenchées une seule fois (flag localStorage), popup modal (pas plein écran — retour utilisateur explicite), logo DROP●IT fixe en en-tête, une couleur d'accent différente par slide, boutons fond blanc/bordure colorée
- Captures réelles de l'app recadrées avec cutouts agrandis sur les éléments clés (carte "Prochaine action", badge P1, icône Suggérer, bandeau chat) — technique : `background-image` + `background-size`/`background-position` recalculés par élément, pas un dessin approximatif
- Contenu 100% fictif (5-6 projets inventés), jamais les vraies données personnelles de l'utilisateur

**Fuite de données critique — trouvée et corrigée en production (588b784)**
- Signalement utilisateur : "mes projets du premier compte sont visibles sur tous mes comptes"
- Cause : la récupération des projets créés avant connexion (clé `device_id`, partagée par tous les comptes du même navigateur) ne supprimait jamais la ligne source après l'avoir copiée — chaque nouveau compte créé sur le même navigateur réclamait la même ligne
- Fix : suppression de la ligne legacy juste après récupération (réclamation à usage unique)
- Nettoyage en production avec les identifiants Supabase fournis par l'utilisateur : ligne fautive supprimée, 2 comptes ayant hérité à tort des projets du 1er compte remis à zéro, identifiants supprimés du poste après usage

**Audit sécurité/fiabilité/qualité (AUDIT.md)**
- Lecture complète du code (index.html, functions/api/*.js, auth.js, setup.sql, _headers)
- 3 failles majeures trouvées et corrigées le jour même : `/api/ai` acceptait n'importe quel modèle/volume (liste blanche ajoutée), `/api/projects` sans plafond de taille (500 Ko / 300 projets ajoutés), sauvegarde debouncée perdue silencieusement à la fermeture d'onglet (flush forcé via `visibilitychange`/`pagehide` + `keepalive`)
- Points mineurs documentés mais non traités : CSP absente, pas de suppression de compte en libre-service, pas de détection de conflit multi-appareils, champ `emoji` jamais échappé au rendu

**Landing page publique (bfa133e, 6fffe6b)**
- App déplacée de `index.html` vers `app.html`, inchangée fonctionnellement
- Nouvelle landing page à la racine : promesse seule en hero (fond blanc + cercles colorés flous), bénéfices en alternance texte/image avec captures réelles recadrées "de près", flèches SVG + éléments de couleur par section
- ~6 itérations de refonte visuelle (copywriting conversion directe choisi parmi 3 angles proposés, mobile-first, crops resserrés, gros titres, puis simplification : emoji retirés, slides fusionnées)
- Redirection automatique vers `app.html` si une session valide existe déjà en local — un utilisateur connecté ne revoit jamais la page marketing

### Erreurs & corrections (en cours de session)

| Erreur | Cause | Fix |
|--------|-------|-----|
| Callout onboarding vide/mal placé | Mauvaise constante de hauteur de référence pour `background-size` (649 au lieu de 575,65), aspect ratio du fond étiré | Recalcul avec la bonne échelle `S=266/390` |
| Catégories "tronquées" sur la landing | Icônes ✨ flanquantes ajoutaient 420px de large dans un viewport de 390px, poussant le bord droit hors écran | Icônes flanquantes cachées sur mobile, visibles seulement à partir de 760px |
| `git commit` bloqué sur `UID` readonly | Variable bash réservée utilisée comme nom de boucle pour un ID Supabase | Renommée en `ACC` |

### Vérifié en production

Onboarding : 6 slides testées de bout en bout (Suivant × 5, Commencer, Passer), non-réapparition après reconnexion. Fix sécurité `/api/ai` : logique de liste blanche relue, pas de régression sur les appels réels de l'app (tous ≤ 800 tokens, 2 modèles utilisés). Isolation : 3 comptes réels vérifiés en base (`dropit_user_data`), 1 legitime + 2 corrigés. Landing : chargement à la racine, clic CTA vers `/app.html`, redirection auto avec session simulée, app inchangée fonctionnelle sur `/app.html`.

### Point d'arrêt

Landing page et onboarding en ligne et stables. Reste non-bloquant, par ordre de priorité suggéré dans AUDIT.md : rate limiting applicatif basique, suppression de compte en libre-service, détection de conflit multi-appareils, Content-Security-Policy.

### Fichiers modifiés/créés cette session

- `/home/radoraj/DROPIT/index.html` — devient la landing page (l'ancien contenu déménage vers app.html)
- `/home/radoraj/DROPIT/app.html` — l'application complète (ex-index.html)
- `/home/radoraj/DROPIT/functions/api/ai.js` — liste blanche modèles + plafond tokens
- `/home/radoraj/DROPIT/functions/api/projects.js` — plafond taille payload + suppression legacy à usage unique
- `/home/radoraj/DROPIT/onboarding/*.png` — 5 captures réelles pour l'onboarding
- `/home/radoraj/DROPIT/MISSIONS/2026-09-06-audit-securite/AUDIT.md`
- `/home/radoraj/DROPIT/MISSIONS/2026-09-06-landing-page/livrables/` — 6 versions de mockup + captures

---

## Session 3 (suite 2) — 2026-09-05 · Authentification

**Commits :** 2150733 · 6ef748a — NON POUSSÉS (attente config Supabase/Cloudflare)

### Décisions prises

- Supabase Auth plutôt qu'un JWT maison : email/mot de passe, Google et Apple natifs, c'est déjà la base de données
- Email + Google d'abord, Apple préparé mais désactivé (compte Apple Developer 99 $/an non ouvert)
- Auth obligatoire, pas de mode essai : un seul chemin de données, pas de projets orphelins
- Validation du jeton via `/auth/v1/user` plutôt que vérification de signature locale : une requête de plus mais la révocation de session est prise en compte
- Nouvelle table `dropit_user_data` plutôt que migration de `dropit_projects` : schéma existant inconnu, risque nul, et l'ancienne table sert à la reprise des données

### Travail réalisé

Backend : `functions/_lib/auth.js` (requireUser), `functions/api/config.js` (sert URL + clé anon depuis env Cloudflare), `projects.js` scopé user_id avec reprise device_id à la première connexion, `ai.js` désormais authentifié.

Client : écran connexion/inscription/mot de passe oublié, erreurs Supabase traduites, Google OAuth avec consommation du fragment `#access_token`, `apiFetch()` qui injecte et renouvelle le jeton et déconnecte sur 401, écran de démarrage neutre, bouton compte + déconnexion.

### Faille corrigée au passage

`/api/ai` était totalement ouvert : n'importe qui pouvait POST dessus et consommer le quota Anthropic. Désormais authentifié.

### Vérifié au navigateur (Playwright + serveur mock)

Mauvais identifiants (message traduit), connexion réussie, persistance au rechargement, renouvellement automatique d'un jeton expiré, 401 sans jeton sur `/api/ai`, email déjà inscrit, déconnexion complète.

### Mise en production (même session)

Erreur SQL rencontrée par l'utilisateur : `syntax error at or near ")"` ligne 10.
Cause : le bloc SQL était noyé dans SETUP_AUTH.md, le copier-coller emportait le titre `## Étape 1 — Table Supabase (2 min)` et Postgres bloquait sur la parenthèse de "(2 min)". Correction : fichier `setup.sql` ne contenant que du SQL.

Découverte utile : wrangler était déjà authentifié localement (`~/.wrangler/config/default.toml`, compte reflexia2908@gmail.com, scope pages:write). Aucun accès supplémentaire n'a été nécessaire côté Cloudflare.

Clé anon reçue et vérifiée avant usage (décodage JWT : role=anon, ref=rcixohoduunxorkzuvde). Refus délibéré d'un Personal Access Token Supabase : non scopable, donne accès à tous les projets, pour un gain de deux clics.

Actions réalisées :
- Table `dropit_user_data` vérifiée existante avec les bonnes colonnes (sonde REST : colonnes attendues OK, colonne bidon → 42703)
- `SUPABASE_ANON_KEY` posée via `wrangler pages secret put`
- `ENABLE_GOOGLE_AUTH=false` posée : Supabase renvoyait `google: false` dans /auth/v1/settings, le bouton se serait affiché sans fonctionner
- Push + déploiement, vérifié en production : /api/config correct, 401 sur projects et ai sans jeton et avec faux jeton, écran de connexion rendu sans erreur console

### Validé en production par l'utilisateur

Compte créé avec succès. Les projets existants (mode device_id) ont bien été
retrouvés après connexion : la reprise automatique fonctionne. C'était le
point le plus risqué de la chaîne, il est levé.

Authentification email/mot de passe : opérationnelle de bout en bout.

### Point d'arrêt

Reste, non bloquant :
1. Tester la synchronisation depuis un second appareil ou navigateur — c'est
   le vrai bénéfice de la fonctionnalité et il n'est pas encore éprouvé
2. Optionnel : Google OAuth. La création du client dans la console Google
   Cloud reste manuelle (aucune API), le reste est automatisable
3. Optionnel : SMTP dédié dans Supabase. Le SMTP par défaut est bridé à
   quelques envois par heure et tombe souvent en indésirables — acceptable
   pour un usage personnel, insuffisant dès qu'il y a d'autres utilisateurs
4. L'ancienne table `dropit_projects` est conservée telle quelle : elle sert
   désormais de sauvegarde des données d'avant le compte. La reprise ne se
   redéclenche pas (elle ne s'exécute que si le compte n'a aucune ligne)

### Fichiers

- `functions/_lib/auth.js`, `functions/api/config.js` — nouveaux
- `functions/api/projects.js`, `functions/api/ai.js` — réécrits
- `index.html` — couche auth complète
- `SETUP_AUTH.md` — nouveau

---

## Session 3 (suite) — 2026-09-05 · Task list globale

**Commit :** c8d774c

### Travail réalisé

**Remplacement complet du toggle treemap/liste par une task list globale en swipe**

Bug de la session précédente : `layoutHomeTreemap()` toujours appelé après render() → écrasait le contenu liste.
Décision : supprimer l'approche toggle, remplacer par une vue séparée plein écran accessible au swipe.

- Swipe gauche sur home → `tasklist-screen` slide depuis la droite (CSS transition 280ms)
- Swipe droite sur task list → slide out → retour treemap
- `buildFlatTasks()` : liste plate de toutes les tâches, tous projets, avec priorité calculée (P1 = prochaine action, P2 = 2e-3e, P3 = reste, fait = terminé)
- `renderTaskList()` : header + chips tri + scroll
- Tri Priorité (groupes sticky P1/P2/P3/Terminé), Projet (groupé par projet), Récent (par updatedAt)
- `renderTlRow()` : badge P1/P2, dot couleur par projet (palette 7 couleurs), meta projet+catégorie
- Clic ligne → slide out + navigation vers le projet
- Checkbox → toggle done/undone, reste sur la task list
- Hint swipe discret au-dessus de la compose bar
- Suppression : homeViewMode, homeListOpenIds, renderHomeListInner(), listIcon, gridIcon, chevronRightIcon, handlers liste obsolètes

### Point d'arrêt

Task list déployée. Prochaine session :
1. Choix direction design (A/B/C dans MOCKUPS/design_v1.html) — toujours en attente
2. Task list : cocher une tâche depuis la liste sans quitter la vue (déjà fait)
3. Idée : taper sur l'emoji/nom du projet dans la task list pour y aller directement

---

## Session 3 — 2026-09-05

**Modèle :** Claude Sonnet 4.6 (Code CLI)
**Commit :** a2aa266

---

### Point de départ

Reprend après session 2. Deux améliorations UX demandées :
1. Vue liste sur l'accueil (toggle depuis treemap)
2. Barre de saisie fixe en bas des fenêtres catégorie/tâches

---

### Travail réalisé

**Feature 1 — Toggle treemap/liste sur l'accueil**

- Bouton icône (coin haut droit, position:fixed, z-index:45) pour basculer entre les deux vues
- Icône listIcon() quand en treemap → clic passe en liste · icône gridIcon() quand en liste → clic repasse en treemap
- `homeViewMode = 'treemap'` (défaut) · `homeListOpenIds = {}` pour l'état dépliage
- Vue liste : chaque projet = row avec emoji + titre + meta (done/total/statut)
- Chevron cliquable (data-list-toggle) → déplie/replie les tâches dessous par catégorie
- Clic sur la zone info du projet (data-project-link) → navigue vers la vue détail
- Tâches done grisées + point coloré adapté au statut

**Feature 2 — Barre fixe en bas des fenêtres catégorie/tâches**

- `renderItemBar(catId)` → barre commune pour vues catégorie et tâches (projet 1 cat + renderCategoryDetail)
  - Champ texte "Ajouter une tâche…" + icône sparkle (suggérer) + icône check (valider/ajouter)
  - Icônes uniquement, pas de texte
- `renderProjectBar(p)` → barre spécifique pour vue projet multi-catégories
  - Champ texte "Nouvelle catégorie…" + icône sparkle (suggérer projet) + icône + (ajouter catégorie)
- Suppression de tous les add-step-row inline (champs "Ajouter un élément") + boutons "Suggérer" inline
- Suppression du lien "+ Nouvelle catégorie" et bouton "Suggérer la suite" en bas de vue projet
- Bouton chat décalé à bottom:82px quand barre fixe présente (évite le recouvrement)
- Padding bottom detail-inner déjà 140px : pas de changement nécessaire

**Nettoyage**

- Suppression des event handlers devenus orphelins (suggest-category-btn, suggest-project-btn, add-category-link-btn, add-item-btn)

---

### Point d'arrêt

Push effectué, Cloudflare Pages redéploie automatiquement depuis GitHub.

**Prochaines pistes :**
- Choix de direction design (A/B/C dans MOCKUPS/design_v1.html) toujours en attente
- Onboarding premier lancement
- Vue liste : ajouter un tap sur la tâche pour la cocher directement depuis l'accueil

---

### Fichiers modifiés

- `/home/radoraj/DROPIT/index.html` — 2050+ lignes, +202 / -48 lignes

---

## Session 2 — 2026-09-03

**Durée réelle :** ~00h35 → ~01h50 (estimation ~1h15)
**Modèle :** Claude Sonnet 4.6 (Code CLI)
**Commits :** 58e36b6 · 79aa5bc · 678b548 · cc61466 · 17bfd55 · b0881b4 · e04a7ed · cd95df5

---

### Point de départ

App live sur dropit-dbx.pages.dev. Refonte UX demandée : supprimer la feature "Décide pour moi" (questionnaire trop lourd), remplacer par chat IA projet + système de notes avancé.

---

### Travail réalisé

**Bloc 1 — Chat IA projet (modal flottant)**

- Suppression du questionnaire "Décide pour moi" + de la recherche IA par tâche
- Création d'un chat modal bottom-sheet par projet : `chatState{}`, `chatProjectOpen`, `renderChatModal(p)` 
- Context injecté : DNA du projet (notes + résumé + tâches) → réponses formatées HTML (`parseAiText`)
- Project DNA auto-généré après chaque note sauvée : `generateProjectDNA()` appel async
- Chat home page : `chatHomeOpen`, `renderHomeChatModal()`, contexte = tous les projets

**Bloc 2 — Notes par tâche**

- Icône note par ligne de tâche : badge count (si notes > 0), panel slide-down
- Multi-notes par tâche, sauvegarde auto au blur du textarea
- Edit in-place avec icône crayon (pencil), supprimer par ×
- Tâche terminée : vert + texte gris (pas de strikethrough)

**Bloc 3 — Notes libres projet (projectNotes)**

- Notes créées depuis le chat (icône bookmark sur chaque réponse IA) → auto-title depuis première ligne
- Stockées dans `p.projectNotes = [{id, title, body, catId, createdAt}]`
- catId=null → niveau projet global · catId=X → dans la catégorie X
- Edit body (pencil) + supprimer + déplacer entre catégories (select)

**Bloc 4 — Fix expand/collapse notes (bug session)**

- Bugs rapportés : notes non visibles au tap, textarea édition vide
- Fix : ajout état `projectNoteOpenId`, chevron ▸/▾ par note
- Body masqué par défaut, tap chevron = toggle expand/collapse
- Sauvegarde depuis chat → auto-expand immédiat de la nouvelle note
- Pencil → expand + focus textarea pré-rempli avec `n.body`
- OK → reste ouvert, Annuler → reste ouvert

**Bloc 5 — Home UX**

- Suppression bouton "Données d'exemple" (inutile, confirmé par l'utilisateur)
- Suppression du handler associé

**Bloc 6 — Maquettes design (non implémenté)**

- Fichier `/home/radoraj/DROPIT/MOCKUPS/design_v1.html`
- 3 directions avec switcher A/B/C, 2 phones chacune (home + détail)
- A : Obsidian Warm (dark) — Mia, B : Neo Cream (indigo + mesh) — Kenji, C : Orange Brûlé (évolution actuelle)
- Comparatif tableau + débat expert + accord commun (glow bouton, bandes par projet, checkbox couleur projet)

---

### Erreurs & corrections

| Erreur | Cause | Fix |
|--------|-------|-----|
| `normalizeCategory` lisait `raw.notes` au lieu de `raw.catNotes` | Rename field non cohérent | Aligné makeCategory + normalizeCategory sur `catNotes` |
| Edit textarea ouvre vide | Body stocké mais masqué sans expand — utilisateur ne voit rien | Ajout `projectNoteOpenId`, toggle expand/collapse obligatoire |
| Syntaxe JS cassée après suppression bouton | `new_string='` — apostrophe seule = string non fermée | Correction manuelle de la concaténation |

---

### Décisions prises

- Notes libres = niveau projet uniquement (`p.projectNotes`) — abandon de `catNotes` sur les catégories
- Pas de note créée manuellement : seules les réponses chat peuvent devenir des notes libres
- Design : 3 directions présentées en maquette, choix en attente

---

### Point d'arrêt

**En attente du choix de direction design.** L'utilisateur doit répondre A, B, C (ou mix) sur le fichier :
`file:///home/radoraj/DROPIT/MOCKUPS/design_v1.html`

Après choix → implémenter la charte graphique directement dans `index.html` (couleurs, tiles, cards, bouton, barre de saisie).

**Prochaine session :**
1. Recevoir A/B/C → implémenter la charte
2. Micro-effets communs validés par les deux experts : glow bouton envoi, bandes couleur par projet, checkbox couleur projet

---

### Fichiers modifiés/créés cette session

- `/home/radoraj/DROPIT/index.html` — ~1740 lignes, refonte complète features
- `/home/radoraj/DROPIT/MOCKUPS/design_v1.html` — maquettes 3 directions (nouveau)

---

## Session 1 — 2026-09-02

**Durée réelle :** ~21h28 → ~23h00 (estimation ~1h30)
**Modèle :** Claude Sonnet 4.6 (Code CLI)
**Commits :** d780c17 · 5282cb3 · e710c82 · a104630

---

### Point de départ

Prototype `vivre.html` dans un artifact Claude.ai — fonctionne en local mais s'appuie sur `window.storage` (API artifact) et appelle Anthropic directement côté client (clé exposée). Objectif : le déployer en ligne, persistant, sécurisé.

---

### Travail réalisé

**Phase 1 — Déploiement Cloudflare + Supabase**

- Analyse du prototype `vivre.html` + `vivre-handoff.md`
- Décision stack : Cloudflare Pages (gratuit illimité, webhook GitHub auto) + Supabase (PostgreSQL, REST API) vs Netlify (limites gratuites plus basses)
- Création de 4 fichiers :
  - `index.html` — prototype adapté : device_id UUID localStorage, fetch `/api/projects`, fetch `/api/ai`
  - `functions/api/ai.js` — proxy Anthropic (ANTHROPIC_API_KEY côté serveur uniquement)
  - `functions/api/projects.js` — CRUD Supabase (SUPABASE_SERVICE_ROLE_KEY côté serveur uniquement)
  - `_headers` — headers sécurité Cloudflare (X-Frame-Options, nosniff, Referrer-Policy)
- Pattern de stockage : un JSON blob par device_id en JSONB Supabase, upsert avec `Prefer: resolution=merge-duplicates`
- 3 commits pushés, Cloudflare Pages lié au repo GitHub

**Phase 2 — MAESTRO UX Push (3 features)**

Skill `/maestro` invoqué. Gate CADRAGE.md validé (choix A1+B1+C1+D1).

- T1 **Focus strict** : vue projet à une catégorie → seule la "PROCHAINE ACTION" visible, reste caché derrière "Voir la suite (N tâches)". `showAllItems = false` par défaut, reset à la navigation.
- T2 **Panneau recherche IA par tâche** : icône 🔍 sur chaque ligne → `performResearchForItem()` → POST `/api/ai` avec contexte projet+tâche → 4-6 options condensées → checkboxes inline persistants dans `item.research.options[]`
- T3 **Reclasser par priorité** : bouton en bas de vue → `generateReclassify()` → IA retourne IDs dans l'ordre prioritaire → items réordonnés, `PROCHAINE ACTION` mis à jour, persisté Supabase

**Phase 3 — Test navigateur (Playwright)**

- Focus strict : validé — "Voir la suite (2 tâches)" visible, PROCHAINE ACTION seule
- Research panel : validé — 6 options contextuelles générées, checkboxes fonctionnels
- Reclasser : validé — "Identifier qui est impliqué" promu PROCHAINE ACTION après reclassification

---

### Erreurs & corrections

| Erreur | Cause | Fix |
|--------|-------|-----|
| Cloudflare "disconnected from Git account" | Cloudflare Pages n'avait pas accès au repo GitHub | GitHub Settings → Applications → Cloudflare Pages → Configure → cocher le repo dropit |
| "IA indisponible" toast après déploiement | Le build existait avant que les env vars soient ajoutées → Pages Function n'avait pas la clé | Re-enter ANTHROPIC_API_KEY dans Cloudflare Pages env vars → Retry deployment |
| Variables disparues de l'UI Cloudflare | Comportement normal : Cloudflare masque les secrets sauvegardés | Ignoré — "already exists" à la re-saisie confirme qu'elles étaient bien enregistrées |
| Cloudflare ne redéploie pas après e710c82 | Webhook GitHub → Cloudflare raté ou silencieux | `git commit --allow-empty` → push → nouveau build déclenché |
| `[data-research-btn]` count = 0 sur la page | Page servait le build 5282cb3 (49KB) au lieu de e710c82 (57KB) | Confirmé via `document.documentElement.innerHTML.length`, fix = empty commit ci-dessus |

---

### Décisions prises

- Pas d'authentification pour le MVP : device_id UUID localStorage suffit
- Supabase Row Level Security désactivée — sécurité assurée par le service_role_key côté serveur uniquement
- Reclasser au niveau projet uniquement, pas par catégorie
- Pas de badge P1/P2/P3 sur les tâches — l'ordre est la priorité
- Research panel = inline déployable sous la ligne (pas de drawer/modal)

---

### Point d'arrêt

Mission livrée. App live sur https://dropit-dbx.pages.dev/ avec les 3 features validées navigateur.

**Prochaine session : à définir** — pistes possibles :
- Onboarding : premier lancement → prompt guidé pour créer le 1er projet
- Partage de projet : URL partageable (device_id dans l'URL plutôt qu'en localStorage)
- UI polish : animations treemap, micro-interactions
- Nouveau nom de domaine si le projet évolue

---

### Fichiers modifiés/créés cette session

- `/home/radoraj/DROPIT/index.html` — 1235 lignes, toute la logique app
- `/home/radoraj/DROPIT/functions/api/ai.js` — proxy Anthropic
- `/home/radoraj/DROPIT/functions/api/projects.js` — CRUD Supabase
- `/home/radoraj/DROPIT/_headers` — headers sécurité
- `/home/radoraj/DROPIT/MISSIONS/2026-09-02-mvp-ux-push/CADRAGE.md` — gate Maestro
- `/home/radoraj/DROPIT/MISSIONS/2026-09-02-mvp-ux-push/etat.md` — état mission (phase 6 LIVRÉ)

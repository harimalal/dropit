# CADRAGE — DROPIT mobile (React Native / Expo)

Écrit le 2026-09-29, AVANT tout code. Source des faits : `livrables/inventaire-fonctionnel.md` (lecture intégrale de `app.html` et `functions/`, références `app.html:ligne`).

## 1. Objectif

Livrer DROPIT comme application **100 % mobile, iOS et Android**, à partir d'un seul projet Expo (React Native, TypeScript), qui reproduit l'expérience actuelle de `app.html` (accueil treemap, projets, tâches, notes, agenda, Drop Zone, chat IA, profil) et y ajoute ce que le mobile natif apporte : connexion Google et Apple, notifications push, gestes et feuilles natives, retour haptique.

Le backend (`functions/`, Supabase) reste **le même**. Le site web actuel continue de fonctionner sur le même compte.

## 2. Constats qui changent la lecture de la demande

1. **`app.html` n'est pas une PWA au sens strict** : ni manifest, ni service worker, ni `Notification`. C'est un site web mobile. Il n'existe aucun mode hors-ligne, aucune notification, aucune coquille iOS. Une coquille Android Capacitor existe seulement sur la branche distante `feature/capacitor-android`, non fusionnée.
2. **« À l'identique » doit être précisé** : l'app actuelle contient des bugs et des incohérences (inventaire §9.2, 26 constats). On reproduit l'expérience voulue, pas les défauts (voir décision D2).
3. **Aucun geste programmé** (ni swipe, ni appui long, ni glisser-déposer) : seuls des taps. Il n'y a donc rien de gestuel à « porter ».
4. **Risque critique déjà présent dans le web (R-01)** : `load()` ne contrôle pas `res.ok` ; une erreur 500 ou 429 est traitée comme un compte neuf et peut **écraser les données réelles** par des exemples (`app.html:3014-3044`, vérifié à la lecture, non reproduit). À corriger dans le client mobile dès le lot 0, et à signaler pour le web.
5. **Taille** : ≈ 6 000 lignes source, estimées à 5 900-8 400 lignes TS/TSX pour la migration, hors tests et configuration. C'est une hypothèse de ratio, à recaler après le lot 0.

## 3. Périmètre

### Dans le périmètre
- Tous les écrans et flux de l'inventaire §1-2, sauf ceux listés ci-dessous comme exclus.
- Connexion : e-mail/mot de passe (existant), Google, Apple. Réinitialisation de mot de passe par lien profond. Suppression de compte dans l'app (existe déjà côté serveur, exigée par Apple).
- Notifications push (voir décision D7 : le contenu reste à définir avec l'utilisateur).
- Design : reproduction des 8 teintes déterministes, jetons, typographie, avec les améliorations natives (feuilles basses, retour haptique, clavier, bouton retour iOS).
- Distribution : builds Expo Cloud, TestFlight (iOS) et test interne (Android).

### Hors périmètre (v1)
- Mode hors-ligne complet (un écran d'erreur avec « Réessayer » remplace l'affichage trompeur des exemples).
- Mode sombre.
- Tour d'onboarding désactivé dans le web (186 lignes de JS mort).
- Synchronisation incrémentale (décision D6 de la mission de robustesse, chantier séparé).
- BYOK Anthropic, statuts de vélocité, signature move, identité par projet (backlog existant).
- Landing `index.html`, `vivre.html`, `telechargement-android.html`.
- Tablettes et paysage (portrait téléphone uniquement).

## 4. Architecture retenue (à valider au lot 0)

- **Emplacement** : dossier `mobile/` dans ce dépôt. `app.html`, `index.html` et `functions/` ne sont pas modifiés, sauf changement backend explicite et minimal (liste blanche de redirections Supabase, endpoint de jeton de notification).
- **Stack** : Expo (SDK stable au moment du lot 0), TypeScript, `expo-router`, `expo-secure-store` pour la session, `expo-notifications`, `expo-apple-authentication`, Google Sign In via un build de développement.
- **Auth** : jetons Supabase en stockage sécurisé ; tous les appels métier passent par `apiFetch` vers `functions/api/*` avec `Authorization: Bearer`. Le `user_id` vient toujours du JWT vérifié côté serveur.
- **État** : un document `{projects, dropZone}` par utilisateur, chargé et sauvegardé comme aujourd'hui (contrat inchangé : `baseUpdatedAt`, plafonds 50 projets et 2 Mo).
- **Tests** : Jest sur la logique pure (hash de teinte, calcul du treemap, normalisation, règles de l'annexe C de l'inventaire) ; Playwright sur `react-native-web` pour les parcours ; test réel sur iPhone et Android par l'utilisateur.

## 5. Options écartées

| Option | Pourquoi écartée |
|---|---|
| Capacitor (WebView autour du code web) | Garderait le code existant mais garderait aussi ses limites (pas de vrai natif, clavier et retour fragiles). L'utilisateur veut du natif. |
| Flutter | Nouveau langage (Dart), aucune logique réutilisable, rien ne partage avec le backend JS. |
| Rester sur le web seul | Ne répond pas à l'objectif de publication sur les boutiques. |

## 6. Lots

Chaque lot se termine par : tests verts, `etat.md` mis à jour, commit, et une validation de l'utilisateur quand il y a quelque chose à tester à la main.

| Lot | Contenu | Test utilisateur |
|---|---|---|
| 0 | Socle Expo, TypeScript, navigation, jetons de design, connexion e-mail, `load`/`save` **sans le défaut R-01**, banc de test web. Spike du treemap. Recalage du chiffrage. | Expo Go |
| 1 | Auth complète : inscription, réinitialisation par lien profond, session sécurisée, gestion des jetons expirés | Expo Go |
| 2 | Modèle de données, normalisation, synchronisation avec conflits, tests portés depuis `quota-check.js` | (technique) |
| 3 | Accueil : treemap, tuiles, salutation, icônes et photos | Expo Go |
| 4 | Détail projet : étapes, tâches, notes, accordéon de catégories, « Prochaine action » | Expo Go |
| 5 | Liste Priorités, Agenda, Drop Zone | Expo Go |
| 6 | IA : création de projet, chat, icônes, photos Pexels (tout via `functions/api`) | Expo Go |
| 7 | Questionnaire, profil, suppression de compte | Expo Go |
| 8 | Sign in with Apple, Google Sign In | build de développement |
| 9 | Notifications push | build de développement |
| 10 | Builds de production, TestFlight, fiches boutique, confidentialité | TestFlight |

**Chiffrage** : de l'ordre de 10 à 15 sessions de travail, soit **3 à 5 semaines calendaires** avec un test utilisateur par lot. C'est une estimation à recaler à la fin du lot 0, pas un engagement.

## 7. Ce que l'utilisateur doit fournir, et quand

| Élément | Quand | Pourquoi |
|---|---|---|
| Un compte Expo et un jeton (`EXPO_TOKEN`) en secret d'environnement | Avant le lot 8 (avant les builds) | Lancer les builds Expo Cloud depuis la session cloud |
| Un compte Apple Developer (99 $/an) | Avant le lot 8 | Sign in with Apple, build iOS installable, TestFlight |
| Une clé App Store Connect (.p8) en secret | Avant le lot 8 | Signature iOS sans connexion Apple interactive avec double authentification, impossible depuis le cloud (à vérifier) |
| Identifiants OAuth Google (iOS et Android) | Lot 8 | Google Sign In |
| Un compte de test dédié sur la prod | Lot 0 | Tester contre l'API réelle sans toucher aux données réelles |
| Décision sur le contenu des notifications | Avant le lot 9 | Voir D7 |
| Validation sur un vrai téléphone après chaque lot | Chaque lot | Seul test qui compte |

Réseau : les hôtes `expo.dev`, `api.expo.dev`, `u.expo.dev` et `exp.host` sont maintenant autorisés (vérifié le 2026-09-29).

## 8. Lignes rouges

- Aucune clé API dans l'application. Anthropic et Pexels passent par `functions/api/`. Modèles autorisés : `claude-haiku-4-5-20251001` (appels fréquents), `claude-sonnet-4-6` (création de projet).
- `user_id` toujours dérivé du JWT vérifié côté serveur.
- Jetons de session uniquement dans `expo-secure-store`, jamais en clair.
- Aucun secret dans le dépôt (jeton Expo, clé Apple, identifiants Google) : secrets d'environnement uniquement.
- Aucune donnée de l'utilisateur écrasée sur une erreur de chargement : une réponse non-OK n'est jamais lue comme un compte neuf.
- Le site web continue de fonctionner tel quel, y compris sur les comptes utilisés depuis le mobile.
- Aucune publication sur l'App Store ou Google Play sans validation explicite de l'utilisateur.
- Commits en français, courts, jamais de `git add -A`. Tester dans un vrai environnement avant de pousser.
- Branche de travail : `claude/cli-claude-code-sync-ti3dgo`. Pas de PR tant que l'utilisateur ne la demande pas.
- Les livrables de session (captures, analyses, scripts) vont dans `MISSIONS/2026-09-29-react-native-mobile/livrables/`, jamais uniquement dans le bac à sable.

## 9. Risques principaux

1. **Treemap** : la mesure de texte par canvas et la police système diffèrent en RN (R-16). Spike au lot 0 avant de s'engager sur la fidélité.
2. **Google Sign In et notifications** inutilisables dans Expo Go : dépendent du compte Apple et du build de développement, donc tardifs.
3. **Deux clients, un document** : web et mobile écrivent le même document sans fusion (R-25). Risque de « dernier gagnant » si l'utilisateur utilise les deux.
4. **Non-testé aujourd'hui** : chat IA, agenda, questionnaire, profil. On porte du comportement qu'aucun test ne protège ; on écrit les tests au fil des lots.
5. **Règles Apple** : Sign in with Apple exigé avec Google, suppression de compte dans l'app, attribution Pexels (R-14). À vérifier avant soumission.

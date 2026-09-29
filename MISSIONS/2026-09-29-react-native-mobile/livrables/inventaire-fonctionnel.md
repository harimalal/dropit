# Inventaire fonctionnel de DROPIT — base du CADRAGE de la migration React Native / Expo

Date : 2026-09-29. Mission : `2026-09-29-react-native-mobile`. Livrable de lecture seule : aucun fichier existant n'a été modifié.

## 0. Périmètre, méthode, conventions

**Sources lues intégralement** : `app.html` (6 066 lignes, lu de la ligne 1 à la ligne 6066 ; les lignes 2580-2581, qui portent chacune un objet JSON de plusieurs dizaines de Ko — catalogue d'icônes et table emoji→icône — ont été lues par extraction programmatique : 83 icônes, 312 entrées emoji), `functions/api/{ai,account,config,photos,profile,projects}.js`, `functions/_lib/{auth,profile}.js`, `setup.sql`. Lus en complément pour le contexte : `README.md`, `SETUP_AUTH.md`, `_headers`, `.well-known/assetlinks.json`, `telechargement-android.html`, `MISSIONS/2026-09-18-audit-securite-qualite/AUDIT.md`, `MISSIONS/2026-09-29-robustesse-sauvegarde-nettoyage/etat.md`, et la liste des fichiers de la branche distante `feature/capacitor-android`.

**Convention** : `app.html:NNNN` = numéro de ligne dans `app.html` (état de `main`, commit `59344ce`). `fichier.js:NN` pour le backend. Toute affirmation que je n'ai pas pu prouver par lecture est marquée **« à vérifier »**. Les estimations chiffrées (section 8) sont des estimations, pas des mesures.

**Une vérification mécanique a été faite** : le JS de `app.html` (lignes 1307-6063) passé à ESLint `no-undef` ne détecte qu'un seul identifiant non déclaré (`noteEditId`, voir R-03, section 9).

### 0.1 Constats préliminaires qui changent la lecture de la demande

1. **Ce n'est pas une PWA au sens strict.** Il n'y a dans `app.html` ni `<link rel="manifest">`, ni enregistrement de service worker, ni appel à l'API `Notification` (recherche exhaustive par grep : aucune occurrence de `serviceWorker`, `manifest` côté page, `Notification`, `navigator.share`, `vibrate`, `beforeinstallprompt`). Le dépôt ne contient pas de `manifest.json` ni de `sw.js`. L'app est un **site web mobile** (`app.html` servi par Cloudflare Pages) plus, sur la branche distante `feature/capacitor-android` (non fusionnée dans `main`), une **coquille Capacitor Android** qui charge l'URL de production dans une WebView (`capacitor.config.json` : `appId: com.dropit.app`, `server.url: https://dropit-dbx.pages.dev`, plugins `@capacitor/app` et `@capacitor/browser`). L'APK distribué est un build debug (`telechargement-android.html:82`, tag `android-debug-latest`). Il n'existe aucune coquille iOS.
2. **Il n'y a aucun mode hors-ligne.** L'état complet vit sur le serveur (`/api/projects`) ; il n'est pas mis en cache localement (voir section 4). Seuls quelques réglages secondaires sont dans `localStorage`.
3. **Aucune notification push, aucun rappel.** Le mot « notification » n'apparaît dans le code que comme nom de couleur (`--notif-red`, `app.html:118`) et pastille de compteur.
4. **Aucun geste tactile programmé** : pas de swipe, pas d'appui long, pas de glisser-déposer, pas de pull-to-refresh (recherche : aucun `touchstart/touchmove/pointerdown/dragstart/contextmenu`). Les commentaires et textes qui parlent de « swipe » (`app.html:780`, `app.html:1400`) sont périmés : la Liste s'ouvre par un tap sur l'onglet. Seul « geste » : le retour arrière système (`popstate`, `app.html:6006`).
5. **Le backend est déjà « mobile-ready »** sur l'essentiel : REST JSON + jeton Bearer Supabase, aucune dépendance aux cookies, aucun CORS requis pour du fetch natif. Les URL du client sont relatives (`/api/...`) : il faudra une URL de base absolue.

---

## 1. Écrans, vues, onglets, modales, bottom sheets

### 1.0 Architecture de navigation actuelle

Il n'y a **pas de routeur**. La « navigation » est un jeu de variables globales rendues par `render()` (`app.html:3641`), qui réécrit tout `#app` à chaque changement d'état.

| Variable | Rôle | Ligne |
|---|---|---|
| `currentProjectId` | `null` = accueil ; sinon écran détail projet | 2449 |
| `taskListOpen` | écran « Priorités » ouvert | 2461 |
| `calendarOpen` | écran « Aujourd'hui » (agenda) ouvert | 1325 |
| `dropSheetOpen` | bottom sheet Drop Zone | 2448 |
| `chatHomeOpen` / `chatProjectOpen` | modales de chat | 2455 / 2454 |
| `accountSheetOpen`, `projectMenuOpen` + `projectMenuMode` (`main`/`due`) | sheets compte / menu projet | 1320-1322 |
| `noteModal` | modale d'édition de note de tâche | 2457 |
| `expandedCategoryId` | catégorie dépliée (accordéon) | 2450 |

- **L'accueil est toujours rendu** en base ; projet, liste et agenda sont posés par-dessus et glissent depuis la droite (`left:100% → 0`, `.28s cubic-bezier(.4,0,.2,1)`, `app.html:786-801, 859-863`) ; `slideScreenIn` (3603) et `slideScreenOutThenBack` (3561, délai 280 ms avec capture d'un « snapshot » d'état pour éviter la course signalée dans l'audit du 18/09, 4.1).
- **Bouton retour = `history.back()`** : chaque écran profond fait `pushState` (`pushNavEntry`, 3548) ; `popstate` appelle `goBackOneLevel` (3576) qui referme dans l'ordre agenda → liste → projet. Incohérences d'historique : voir R-07.
- Le **détail projet n'a pas de bouton retour à l'écran** (la barre du haut ne contient que le bouton « ⋮ », `app.html:4484-4487`) : on revient par l'onglet Accueil ou le geste/bouton retour Android. Point bloquant pour iOS (R-08).
- Les états d'UI **ne sont pas réinitialisés** à la navigation : `chatProjectOpen`, `noteModal`, `noteOpenId`, `editingItemId`, `projectNoteOpenId` survivent au changement de projet (R-11).

### 1.1 Tableau récapitulatif des écrans

| # | Écran / vue | Type | Accès | Rendu (lignes) | CSS (lignes) |
|---|---|---|---|---|---|
| E0 | Écran de démarrage (spinner) | plein écran | au `boot()` | 6027 | 1033-1036 |
| E1 | Connexion / Inscription / Mot de passe oublié | plein écran | pas de session | `renderAuth` 3757-3830 | 943-1036 |
| E2 | Nouveau mot de passe | plein écran | lien e-mail de récupération | `renderNewPasswordScreen` 3706-3734 | idem |
| E3 | Service indisponible | plein écran | échec `/api/config` | 6050-6059 | idem |
| E4 | Accueil (mosaïque treemap) | écran racine | après connexion, onglet Accueil | `renderHome` 3924, `layoutHomeTreemap` 3997 | 151-287 |
| E5 | Barre de composition IA | barre fixe | accueil | `renderComposeBar` 3983 | 483-504 |
| E6 | Barre d'onglets (bottom tab bar) | barre fixe | accueil, détail, liste, agenda | `renderBottomTabBar` 3519-3540 | 625-698 |
| E7 | Détail projet | écran plein (slide) | tap sur tuile / ligne de liste / création | `renderDetail` 4469-4591 | 288-475, 543-616 |
| E8 | Priorités (liste de tâches) | écran plein (slide) | onglet « Liste » | `renderTaskList` 4197-4263 | 786-856 |
| E9 | Aujourd'hui (agenda) | écran plein (slide) | onglet « Aujourd'hui » | `renderCalendarScreen` 4364, `renderCalendarGrid` 4304 | 859-907 |
| S1 | Drop Zone | bottom sheet 72 vh | bouton central « DROP●IT » | `renderDropSheet` 4687-4709 | 700-751 |
| S2 | Chat IA — vue d'ensemble | bottom sheet 72 vh | onglet « Chat IA » depuis l'accueil, liste, agenda | `renderHomeChatModal` 3948-3981 | 660-676, 752-769 |
| S3 | Chat IA — projet | bottom sheet 72 vh | onglet « Chat IA » depuis un projet | `renderChatModal` 4834-4871 | idem |
| S4 | Compte | bottom sheet | bouton rond (initiale) en haut à droite de l'accueil | `renderAccountSheet` 3857-3876 | 1264-1282 |
| S5 | Mon profil (relecture du questionnaire) | bottom sheet | Compte → « Mon profil » | `openProfileSheet` 2112-2150 | 1248-1257 |
| S6 | Menu projet (+ sous-menu Échéance) | bottom sheet | « ⋮ » du détail | `renderProjectMenu` 3878-3902 | 1285-1300 |
| S7 | Note de tâche (édition) | bottom sheet 94 vh | « + Ajouter une note » / crayon d'une note | `renderNoteModal` 4758-4773 | 578-590 |
| Q1 | Questionnaire de personnalisation | plein écran (20 écrans) | compte neuf ; Profil → « Refaire » ou tap sur une ligne | `openQuestionnaire` 2030-2073 | 1113-1245 |
| N1 | Notice « 3 exemples de projets » | popup centrée | compte neuf, une fois | 1523-1554 | 1095-1111 |
| N2 | Tour d'onboarding (6 slides) | popup centrée | **désactivé** (`showOnboardingIfNeeded` retourne immédiatement, 1511-1516) | 1334-1509 | 1038-1093 |
| O1 | Overlay de chargement IA | overlay | pendant génération/suggestion | `renderLoadingOverlay` 4896-4905 | 506-519 |
| O2 | Toast | élément unique | messages brefs | `showToast` 4907-4914 | 521-527 |
| O3 | Bandeau « sauvegarde bloquée » | bandeau persistant hors `render()` | refus définitif du serveur | `updateSaveBanner` 3163-3176 | 529-537 |

### 1.2 Fiches détaillées

#### E1 — Connexion / Inscription / Mot de passe oublié (`app.html:3757-3855`)
- **Affiche** : 4 icônes flottantes décoratives animées (💝 « Anniv chérie », 🚗 « Nouvelle voiture », 🎓 « Formation » badge 2, 💼 « Nouveau taf » badge 1 — `renderAuthFloatingIcons` 3738), logo pilule « DROP●IT », accroche « Vos idées, vos projets, vos rêves… », titre/sous-titre selon le mode, champ e-mail, champ mot de passe (absent en mode « forgot »), bouton principal (`Se connecter` / `Créer mon compte` / `Envoyer le lien`, « … » pendant l'appel), message d'erreur (rouge) ou d'info (vert), séparateur « ou », boutons « Continuer avec Google » / « Continuer avec Apple » (affichés selon `supa.providers`, absents en mode « forgot »), liens de bascule, mention légale.
- **Interactions** : submit du formulaire (touche Entrée incluse), liens `data-auth-mode` (login ↔ signup ↔ forgot), boutons OAuth. Autofocus du champ e-mail après 40 ms (3829). `autocomplete="username|current-password|new-password"` (gestionnaires de mots de passe).
- **Icônes flottantes** : positions absolues `top:18px / 126px`, `left/right 14-18px`, animation `auth-floaty 4.5s ease-in-out infinite` (translateY -9px, rotate -3°), décalées de .6 s ; désactivée sous `prefers-reduced-motion` (965-975, 989-992).

#### E2 — Nouveau mot de passe (`3706-3734`, `performSetNewPassword` 2403)
- Un champ, bouton « Valider », minimum 6 caractères. Le jeton de récupération devient la session (`saveSession(recoverySession)`, 2425) puis `bootAfterAuth()` + toast « Mot de passe mis à jour ».

#### E4 — Accueil : mosaïque treemap (`3924-3992`, `3994-4081`)
- **Affiche** : salutation « C'est parti ! {Prénom} {emoji} » (le prénom vient de la **partie locale de l'e-mail**, pas du questionnaire : `accountFirstName` 3909 ; l'emoji est tiré une fois par session parmi 10, 3921) ; la zone treemap ; ou, sans projet, un état vide (« Dis ce que tu veux réaliser. », 3931) ; bouton rond compte (initiale de l'e-mail, 3904, `fixed; right:16px; top:16px`).
- **Treemap** : un projet = une tuile de poids `max(1, nb tâches + nb catégories)` (4009). Disposition par algorithme *squarified* (`squarify` 3352, `computeTreemap` 3384). Constantes : `TREEMAP_UNIT_AREA = 3400` px² par point de poids, `TREEMAP_MIN_HEIGHT = 130`, gouttière 3 px. Hauteur du treemap = `min(hauteur utile, max(130, poids total × 3400 / largeur))` (4015-4016) ; la hauteur utile retire la barre de composition, la barre d'onglets et 12 px (4004-4005). **Pas de défilement** : la zone est `overflow:hidden` (157) — avec beaucoup de projets, les tuiles rétrécissent (jusqu'à `size-tiny`).
- **Classes de taille** (`sizeClassFor` 3393) : `tiny` si aire < 8 500 ou largeur < 80 ou hauteur < 62 ; `flat` si hauteur < 124 ; `small` < 20 000 ; `medium` < 42 000 ; sinon `large`. `tiny` masque la barre de progression ; `flat` la masque sous 86 px de haut (4032).
- **Contenu d'une tuile** : fond `--proj-*-card` (teinte du projet) ou photo Pexels plein cadre (`.tile-photo`, avec filtre `saturate(.82) sepia(.1) contrast(1.03)`, 179-182) + scrim dégradé du bas (185-188) ; pastille d'icône plate ronde (diamètre proportionnel : `iconBoxFor` 3451, 34 % du petit côté sans photo, 24 % avec photo, bornes 22-52) ; titre (police 11 à 22 px calculée par `titleFontSizeFor` 3464 avec simulation du retour à la ligne par `canvas.measureText`, 1 ou 2 lignes selon `titleMaxLinesFor` 3458) ; barre de progression + `%` (police mono 10 px) + chevron (4049-4055). Avec photo : icône en coin haut-droit, titre en blanc sur puce teintée à 22 % (200-206), texte aligné en bas à gauche. Projet accompli : `opacity:.55` (168).
- **Interactions** : tap sur tuile → `currentProjectId = id; pushNavEntry(); render()` (4071-4076). Aucun appui long ni glisser. Au passage, chaque rendu lance en tâche de fond `ensureProjectIcon` et `ensureProjectPhoto` pour tout projet qui n'en a pas (4013 ; voir flux F9).
- **Resize** : `layoutHomeTreemap` rappelé 150 ms après un `resize` si aucun projet ouvert (5998-6002).

#### E5 — Barre de composition IA (`3983-3992`, `483-504`)
- Champ « On aimerait partir à Bali en septembre… » avec préfixe ✨, bouton d'envoi rond vert (`--ia-accent`, halo `box-shadow:0 0 0 5px --ia-accent-soft`), désactivé pendant la génération. Entrée = envoi (5486-5488). Le texte est conservé dans `composeText` (5485) pour survivre à `render()`. Posée au-dessus de la barre d'onglets (`bottom = tabbar-h + safe-area`).

#### E6 — Barre d'onglets (`3519-3540`)
5 emplacements : **Accueil** (icône maison), **Liste**, **DROP●IT** (bouton pilule blanche, ombre, décalé de -8 px vers le haut, point rouge, pastille rouge avec le nombre d'éléments de la Drop Zone), **Chat IA**, **Aujourd'hui**. Hauteur `58px + safe-area-inset-bottom`.
- Accueil : remet à zéro tous les états de navigation (5399-5408). Liste : ouvre la liste, **scopée au projet courant** si l'on vient d'un projet (5410-5422). Chat IA : ouvre le chat projet si un projet est ouvert, sinon le chat d'ensemble (5424-5436). Aujourd'hui : ouvre l'agenda sur la date du jour (5438-5449). DROP●IT : ouvre la Drop Zone (5459-5462).
- Onglet actif (couleur accent) : seulement Accueil / Liste / Aujourd'hui ; jamais Chat ni Drop.
- Copies multiples de la barre dans le DOM (une par écran superposé) : les événements sont liés à la **dernière** occurrence (`lastById` 5388) — artefact DOM, sans objet en RN.

#### E7 — Détail projet (`4469-4623`)
Contenu, de haut en bas dans `.detail-scroll` (colonne max 600 px, padding 50 px 20 px + hauteur des barres) :
1. **Bouton « ⋮ »** flottant en haut à droite (4484-4487, classe `top-delete-btn`, nom trompeur) → menu projet S6.
2. **En-tête** : icône de projet 56 px, titre (19/800), résumé (13 px), ADN legacy `p.dna` si présent (`project-dna`, italique verte, lecture seule, 4495) ; ligne de progression : barre 6 px teintée + `%` mono 12 px (4498-4501).
3. **Bande d'étapes** (`renderStepsStrip` 4431-4457), affichée si ≥ 2 étapes : étapes = catégories (si > 1 catégorie) sinon tâches de l'unique catégorie (`projectSteps` 4418). Pastilles 30 px reliées par des traits 3 px (rempli jusqu'à l'étape en cours), libellé sur 2 lignes max, compteur `i/n`, défilement horizontal recentré sur l'étape courante à chaque rendu (`scrollStepsToCurrent` 4461). Indicateur seulement, non cliquable.
4. **Carte « Prochaine action »** (4511-4523) : fond `--proj-*-next`, badge blanc « PROCHAINE ACTION », titre 18/700, nom de catégorie en italique si multi-catégories, bouton « ✓ C'est fait » (fond `--proj-*-btn`, texte encre). **Carrousel** : si plusieurs actions prioritaires (jusqu'à 3), deux boutons ronds blancs (34 px) à cheval sur les bords gauche/droit de la carte (`right:-17px`, 381-390) parcourent les actions sans les valider (`nextActionPreviewIndex`, 2935 ; 5725-5746 ; circulaire). L'index est remis à 0 quand on change de projet (4480) ou qu'on coche (5722).
5. **Bannière « Vous l'avez fait »** si toutes les tâches sont faites (4505-4510) : fond plein teinte du projet, icône inline, « N étapes accomplies ».
6. **Corps — une seule catégorie** (4528-4545) : section « Ensuite » (tâches restantes hors la première, top 3 mis en évidence en teinte `--proj-*-priority`, les autres grisées `muted`), section « Terminé (n) », bloc Notes du projet ; barre d'ajout de tâche.
7. **Corps — multi-catégories** (4546-4556) : badge « Catégories » + **accordéon** (`renderCategoryAccordionItem` 4596-4623) : carte pleine largeur (titre, mini-barre de progression 56 px, compteur `fait/total`, chevron qui pivote de 180° en .2 s), un seul dépliage à la fois (`expandedCategoryId`), zone dépliée animée `categoryExpand .45s ease-out` (opacité + translateY -6 px), contenant tâches restantes, « Terminé (n) », lien « Supprimer cette catégorie » (confirm natif). Puis Notes du projet.
8. **Barre fixe du bas** (`detail-fixed-bar`, 915-940) : si une catégorie est dépliée (ou projet mono-catégorie) → `renderItemBar` (4395) : champ « Ajouter une tâche… » ✨, bouton vert ✓ (ajouter), bouton ampoule (suggestion IA ciblée sur la catégorie) ; sinon `renderProjectBar` (4405) : champ « Nouvelle catégorie… (verbe + sujet, ex : Préparer le budget) », bouton + (ajouter), bouton ampoule (suggestion IA pour le projet). Projet accompli : la barre reste (on peut rouvrir).
9. Barre d'onglets propre à l'écran, toast propre.

**Ligne de tâche** (`renderItemRow` 4873-4890) : rond de coche (18 px) qui bascule `done` (`data-toggle-item`), titre, icône note avec pastille du nombre de notes, bouton « × » de suppression **sans confirmation**. **Tap sur la ligne (hors boutons)** → titre en édition inline (textarea auto-extensible, Entrée ou perte de focus = enregistre, Échap = annule ; `setupItemTap` 5365, 5760-5781).
**Notes de tâche** : le tap sur l'icône note déplie un panneau (`renderItemNotePanel` 4632) : liste de notes (texte, crayon → S7, × supprime sans confirmation) et « + Ajouter une note » → S7.
**Notes du projet** (`renderProjectNotes` 4775-4815) : en-tête (badge « Notes » + bouton rond +), lignes repliables : chevron, icône, **titre éditable en place** (enregistré au blur), crayon (édition du corps dans un textarea 5 lignes avec OK/Annuler), × (suppression sans confirmation) ; le corps est affiché via `parseAiText` (mini-markdown). Une note créée à la main s'ouvre directement en édition avec focus (5165-5179).

#### S6 — Menu projet (`3878-3902`, événements 5493-5570)
Lignes : **Renommer** (`prompt()` natif, 60 caractères max, 5508), **Préciser l'objectif** (`prompt()` natif, 5521), **Échéance** (valeur affichée « Sous 1 mois » / « Non définie » → sous-menu : 6 seuils + « Aucune échéance », coche sur l'actif, bouton Retour), **Changer la photo** (`regeneratePhoto` 2896), **Supprimer le projet** (`confirm()` natif, en rouge). Le tap sur le fond ferme.

#### S7 — Note de tâche (`4758-4773`, `5926-5961`)
Bottom sheet 94 vh (max 620 px) : titre « Nouvelle note » / « Modifier la note », croix, textarea plein écran (16 px, « Écris, colle ou dicte une note… »), bouton « Enregistrer ». Enregistrer un texte vide referme sans rien créer. **Bug probable à l'édition d'une note existante : voir R-03.**

#### S1 — Drop Zone (`4647-4756`, `700-751`)
Bottom sheet 72 vh : en-tête de marque (emoji 📥, titre « DROP **ZONE** » avec ZONE en violet `#5B3FE8`, pilule « Ton espace de « décharge mentale » **en 1 clic.** »), croix, corps = **badges** colorés (couleur déterministe par id, texte en teinte pleine, petite case blanche à gauche), état vide « Rien à trier — la Drop Zone est vide. », pied = champ « Une idée, une tâche… » + bouton « Envoyer » (Entrée aussi).
- **Ajouter** : `performDropCapture` (4711) ajoute `{id, title, createdAt}` à `state.dropZone`, `persist()`, insère le badge avec l'animation `dropToss` (.4 s, `cubic-bezier(.34,1.56,.64,1)`, translateY 50 px → 0, scale .4 → 1, rotate -12° → 0), toast « Envoyé dans la Drop Zone », met à jour la pastille de l'onglet.
- **Tap sur un badge** = **suppression immédiate et définitive**, sans confirmation (`performDropCheck` 4740). **Il n'existe aucune fonction pour transformer une entrée en tâche ou en projet** (le « tri » n'est que la suppression) — à confronter à la promesse produit (R-13).

#### S2 / S3 — Chats IA (`3948-3981`, `4834-4871`)
Bottom sheet 72 vh, laissant l'onglet-bar visible et cliquable (bottom borné à la hauteur de la barre, 670). En-tête : titre (« Vue d'ensemble » + nombre de projets, ou nom du projet), croix ; liste de messages (utilisateur : bulle accent à droite ; IA : bulle claire à gauche avec mini-markdown) ; sous chaque réponse IA : bouton « copier » (les deux chats) et, **chat projet seulement**, « note » (enregistre la réponse comme note du projet, 5141) ; indicateur « En train de répondre… » avec mini-spinner ; champ + bouton « Envoyer ». Historique **uniquement en mémoire** (`chatState`, 2453), perdu au rechargement ; 20 derniers messages envoyés au modèle (5058, 5194). Échap ferme (`Escape`, sans objet mobile).

#### L — Priorités / liste de tâches (`4083-4132`, `4190-4263`, `4384-4393`)
- En-tête : retour, titre « Priorités » (ou icône + nom du projet, tronqué à 22 caractères, en mode scopé), compteur (« n prioritaires » / « n tâches »).
- **Mode global** (onglet Liste depuis l'accueil) : rangée de **puces-icônes de projets** (40 px, sélection multiple, bordure teintée quand actif) ; digest **plafonné à 3 tâches non faites par projet** (`buildFlatTasks` 4083 ; priorité P1, P2, P3 selon le rang d'ordre du projet).
- **Mode scopé** (onglet Liste depuis un projet) : rangée de puces texte : catégories (« Toutes » + une par catégorie, si > 1) | séparateur | priorité (Tout / P1 / P2 / P3) ; toutes les tâches non faites du projet, les hors-top-3 grisées (`reste`).
- **Ligne** (`renderTlRow` 4108) : rond de coche (26 px : marque **faite** immédiatement, sans annulation possible dans cet écran, 4384), titre (2 lignes max), méta « Projet · Catégorie » (catégorie seulement si > 1), badge P1/P2/P3 ou « En retard », icône du projet 30 px (masquée en mode scopé). Tap sur la ligne → ouvre le projet (glissement de sortie de la liste 200 ms, 5696-5715).

#### K — Aujourd'hui / agenda (`4134-4188`, `4265-4382`)
- Barre haute : retour + « Aujourd'hui » ; navigation de mois (‹ ›), libellé mois/année (capitalisé), en-têtes Lun→Dim, grille 7 colonnes lundi-premier, jours du mois adjacent désactivés (opacité .4).
- **Marqueurs par jour** (max 3) : *badges d'échéance* (projets dont `dueDate` tombe ce jour ; anneau `conic-gradient` = avancement % ; glyphe du projet 9 px) et *badges de jalon* (`projectCheckpoints` 4280 : à +30 jours si échéance > 1 mois, et à mi-parcours ; pas de jalon pour 1w/2w ; verdict « dans les temps » si le % réel ≥ 25/50 % attendu, sinon « en retard » ; **aucune règle CSS pour ces états** : R-10).
- **Liste du jour** (max `CAL_DAY_MAX = 5`, 4143) : *aujourd'hui* = file « vivante » : projets non accomplis ayant des priorités, triés par seuil d'échéance (1w … 1y, sans échéance en dernier), **rotation quotidienne** (`floor(now/86400000) % n`), répartition tour par tour sur les 3 premières tâches de chaque projet, les projets en retard d'abord (badge « En retard ») ; *autre jour sélectionné* = uniquement les 3 premières tâches des projets dont l'échéance tombe ce jour-là. Libellé : « Aujourd'hui · n tâche(s) » ou la **date ISO brute** `AAAA-MM-JJ` (4367 : R-11).
- Interactions : tap jour, flèches de mois, coche (marque faite), tap ligne → projet (sans animation de glissement).

#### S4 — Compte (`3857-3876`, `5591-5629`)
E-mail, ligne « {Google|Apple|Email} · N projet(s) synchronisé(s) », boutons : « Mon profil · personnaliser mon IA », « Fermer », « Se déconnecter », « Supprimer mon compte » (confirm natif « … irréversible », puis `DELETE /api/account`, `signOut()`, message « Ton compte a été supprimé. »).

#### S5 — Mon profil (`2112-2150`)
Liste des 17-18 questions (écrans avec identifiant ; ni l'intro ni l'écran final) avec la réponse courante (« Pas encore répondu » sinon) ; tap sur une ligne → rouvre le questionnaire à cet écran ; boutons « Refaire le questionnaire » et « Fermer ». Au retour du questionnaire on revient sur le profil (`obqAfter`).

#### Q1 — Questionnaire de personnalisation (`1556-2150`, styles `1113-1245`)
Voir flux F3 pour le contenu. Plein écran, thème bleu propre (fond à 3 dégradés radiaux, `#16243F`), barre du haut (retour, compteur « i / n », logo), phrase d'encouragement (20 phrases, `PROFILE_QUIPS` 1575), barre de progression avec **emoji d'humeur** qui glisse avec la pointe de la barre (20 humeurs, `PROFILE_MOODS` 1572), corps animé, pied (CTA « Continuer », lien « Passer » / « Plus tard » sur l'intro).
Types d'écran (`k`) : `intro` (puces), `field` (champ prénom), `one` (choix unique, lignes), `many` (choix multiples, lignes avec case), `cards` (grille 3 colonnes de cartes pastel), `free` (zone de texte), `done` (liste de coches vertes). Options « Autre… » (champ texte libre) sur les écrans marqués `other`. Sélection : bascule de classes sans re-render pour ne pas perdre la saisie (1923-1957).
Animations : sortie `translateX(∓26px)` + fondu 190 ms `ease-in` ; entrée 360 ms `cubic-bezier(.16,1,.3,1)` avec apparition **échelonnée** des options (délai 55 ms + 30 ms × rang) ; barre `width .5s cubic-bezier(.65,0,.35,1)` ; emoji d'humeur rebondit (`scale .78 → 1`, .34 s spring) ; case `scale(1.07)`, coche `scale(.5 → 1)` ; CTA `:active scale(.976)`.

#### N1 / N2 — Notice d'exemples et tour d'onboarding
- **N1** (`1523-1554`) : popup « 🌴 🎂 📦 Voici 3 exemples de projets… », bouton « J'ai compris » ; drapeau `dropit_sample_notice_seen` (localStorage). Affichée après le questionnaire pour un compte neuf.
- **N2 tour** : 6 slides (une « features » + 5 captures avec « callouts » en découpe d'image), **désactivé volontairement** (1511-1516) ; le code et les 5 PNG de `/onboarding/` subsistent (code mort ≈ 186 lignes JS + 74 lignes CSS). Ne pas migrer sauf décision explicite.

#### O1 — O3 — Overlays
- **Chargement** (`4896`) : fond `rgba(43,36,32,.5)`, carte blanche avec spinner (26 px, `spin .8s linear infinite`) et « Je construis ton projet… » (**le même texte sert aux suggestions IA**, puisqu'elles passent par `generating = true`, 5319/5337).
- **Toast** (`4907`) : élément unique par écran, capsule sombre, apparition `opacity .25s`, visible 1,8 s (4913), au-dessus de la barre d'onglets (bottom = 78 px + hauteur de barre).
- **Bandeau de sauvegarde** (`3163`) : rouge `#D42A20`, 12 px de marge, au-dessus de la barre d'onglets, persistant tant que la cause dure.

### 1.3 Inventaire des gestes et entrées

| Geste | Où | Réf. |
|---|---|---|
| Tap | partout (tuiles, coches, puces, lignes, boutons, backdrops de sheets = fermeture) | — |
| Appui long | **aucun** | recherche négative |
| Swipe / glisser-déposer | **aucun** (la fonction `moveIcon` a été supprimée, MISSIONS 2026-09-29 lot 3) | — |
| Retour arrière système | `popstate` → `goBackOneLevel` | 6006, 3576 |
| Défilement vertical | détail, liste, agenda, chats, Drop Zone, questionnaire, profil (`prof-list` max 52 vh) | 310, 830, 906, 752, 720, 1147, 1257 |
| Défilement horizontal | bande d'étapes, rangées de filtres de la liste | 333, 811 |
| Clavier : Entrée | valide champs auth, composition, ajout tâche/catégorie, chat, Drop Zone, prénom du questionnaire ; sur un titre de tâche : enregistre | 5486, 5801, 5827, 5851, 5985, 5476, 2068, 5765 |
| Clavier : Échap | ferme un chat ; annule l'édition d'un titre de tâche | 5852, 5986, 5766 |
| Survol (`:hover`) | états desktop seulement (bordures, luminosité) | nombreux |
| Appui (`:active`) | fond `accent-soft` sur lignes de liste/menus ; échelle du CTA du questionnaire | 836, 1252, 1294, 1242 |

### 1.4 Dialogues natifs du navigateur (à remplacer en RN)
`prompt()` : renommer (5508), objectif (5521). `confirm()` : supprimer projet (5564), supprimer catégorie (5583), supprimer compte (5617). Aucun `alert()`.

---

## 2. Flux utilisateur clés

### F1 — Démarrage (`boot` 6025-6060, `bootAfterAuth` 6012)
1. Spinner (`auth-boot`). 2. `GET /api/config` (sans auth) → `supa.url`, `supa.anon`, `providers`. Échec → écran « Service indisponible » + bouton Recharger. 3. Lecture d'un éventuel fragment OAuth dans l'URL (`consumeOAuthRedirect` 2394) ; sinon session lue dans `localStorage["dropit-session"]`. 4. Pas de session → `renderAuth()`. 5. Session → `ensureToken()` (rafraîchit si expirée) ; échec → session effacée, écran de connexion. 6. `bootAfterAuth` → `render()` puis `load()` (chargement des projets) ; en parallèle, si `session.user` est absent (retour OAuth), `GET /auth/v1/user` complète l'utilisateur.
Sur le web, la page `index.html` redirige vers `app.html` si une session valide est en localStorage (`index.html:8-19`).

### F2 — Connexion / inscription (méthodes actuelles)
| Méthode | Mécanisme | Réf. |
|---|---|---|
| E-mail + mot de passe (connexion) | `POST {supa}/auth/v1/token?grant_type=password` `{email,password}` | 2250 |
| E-mail + mot de passe (inscription) | `POST /auth/v1/signup` ; min. 6 caractères vérifié côté client ; **confirmation par e-mail activée** (`mailer_autoconfirm:false`, SETUP_AUTH.md) : sans jeton en réponse → message « Compte créé. Ouvre le lien de confirmation… » | 2245-2265 |
| Mot de passe oublié | `POST /auth/v1/recover` `{email, redirect_to: origin+pathname}` ; réponse neutre (« Si un compte existe… ») ; le lien revient avec `#access_token=…&type=recovery` → écran E2 (pas de connexion automatique) | 2323-2337, 2365-2389 |
| Google | redirection navigateur vers `{supa}/auth/v1/authorize?provider=google&redirect_to=…` (flux implicite : jetons dans le fragment `#`) ; bouton visible si `providers.google` (défaut **vrai** tant que `ENABLE_GOOGLE_AUTH !== "false"`, `config.js:16`) | 2282-2302 |
| Apple | idem `provider=apple` ; bouton visible seulement si `ENABLE_APPLE_AUTH === "true"` (`config.js:17`) ; **non configuré** (SETUP_AUTH.md) | idem |
| Coquille Capacitor | ouvre le navigateur externe (`@capacitor/browser`) avec `redirect_to = com.dropit.app://auth-callback` ; le retour est capté par `@capacitor/app` `appUrlOpen` (2307-2321) | 2278-2321 |
Session : `{access_token, refresh_token, expires_at, user}` (2163), `expires_at = now + (expires_in||3600 − 60) s`. Rafraîchissement paresseux avant chaque appel API (`ensureToken` 2196, `POST /auth/v1/token?grant_type=refresh_token`). Un `401` d'un endpoint `/api/*` déclenche `signOut()` (2216).
Messages d'erreur traduits par `authErrorMessage` (2221) : identifiants invalides, compte existant, mot de passe trop court, e-mail non confirmé, limite de débit, e-mail invalide.
Déconnexion (`signOut` 2339) : `POST /auth/v1/logout`, efface la session et réinitialise l'état (voir R-04 pour ce qui n'est **pas** réinitialisé).

### F3 — Onboarding d'un compte neuf (`load` 3014, `startFreshAccount` 2078)
Déclencheur : `load()` a trouvé **0 projet** côté serveur (`fresh`, 3020) → l'état est rempli avec 3 projets d'exemple (`defaultData` 2965-3005 : « Bali cet été » 🌴, « Anniversaire de Julie » 🎂, « Déménagement » 📦, avec des tâches déjà cochées et des `updatedAt` étalés) puis sauvegardé. Ensuite : `GET /api/profile` → si `completedAt` : notice d'exemples ; sinon **questionnaire**, puis (tour désactivé) notice d'exemples.
Questionnaire (`QUIZ` 1604-1718) : **20 écrans, 19 effectifs** (l'écran « âge des enfants » n'apparaît que si `enfants = oui`, `obqScreens` 1729) : intro ; prénom (champ, 60 car.) ; âge (7) ; genre (3) ; statut (7) ; situation (7) ; enfants (2) ; âge des enfants (conditionnel, multiple, 7) ; quotidien (5) ; projets (6 cartes, multiple, « Autre… ») ; rêves (6, multiple, autre) ; adore (9, multiple, autre) ; motive (6, multiple, autre) ; fonctionne (6, multiple) ; fil (7, multiple, autre) ; rôle (6, multiple, autre) ; tâches (5, choix unique) ; temps (7, multiple) ; un dernier mot (texte libre 300 car.) ; écran final (4 coches). Identifiants stables stockés, jamais les libellés (commentaire 1560-1563 ; table `LABELS` dans `functions/_lib/profile.js:12-50`, à garder synchronisée).
Persistance : sauvegarde intermédiaire différée de 600 ms à chaque sélection / passage (`obqPersist` 1764) → `POST /api/profile {answers}` ; fin : `{answers, completed:true}` (`obqFinish` 2014). « Passer » supprime la réponse de l'écran ; « Plus tard » (intro seulement) ferme sans marquer `completed`. Échecs réseau silencieux (« ne doit jamais bloquer »).
Effet serveur : chaque appel `/api/ai` reçoit le profil en tête du prompt système (`ai.js:69-74`, `profile.js:84-127`).

### F4 — Création de projet par l'IA (`performCreateFromIntention` 5257-5314, `generateProject` 4930)
1. Saisie dans la barre de composition (E5), Entrée ou bouton. 2. Refus **avant** l'appel si ≥ 50 projets (toast « Limite de 50 projets atteinte… », 5263). 3. `generating = true` → overlay. 4. `POST /api/ai` modèle `claude-sonnet-4-6`, `max_tokens: 800`, prompt en français (4931-4947) demandant un JSON `{title, domain, emoji, icon, summary, dueBucket, categories:[{title, items[]}]}` : 1 à 5 catégories nommées « verbe + sujet » (2-3 mots), 3 à 7 éléments courts (5-10 mots) dans l'ordre logique, `dueBucket` parmi `1w|2w|1m|3m|6m|1y`, `domain` parmi 7 domaines + « autre », `icon` parmi 83 clés. 5. Analyse : suppression des balises ```json, `JSON.parse`. 6. Construction : catégories sans éléments écartées ; si aucune, catégorie « À faire » avec 2 tâches génériques ; `dueBucket` invalide → `1m` ; `dueDate = now + jours(bucket)` ; titre tronqué à 60 caractères ; icône acceptée seulement si dans le catalogue. 7. Le projet est ajouté, **ouvert immédiatement**, `ensureProjectPhoto` lancé, `persistNow()` (sauvegarde sans debounce). 8. **Échec IA** (réseau, JSON invalide, tout `catch`) : projet de repli (titre = intention, résumé « Projet créé — complète les étapes ci-dessous. », 3 tâches génériques, échéance 1 mois) + toast « IA indisponible — projet créé avec des étapes de départ » (5296-5313).

### F5 — Tâches
- **Ajouter** : champ de la barre fixe (5787-5803) → `makeItem(title)` ; sans catégorie choisie en multi-catégories, la barre n'est pas celle des tâches (elle crée une catégorie, 5814-5826).
- **Cocher / décocher** : `data-toggle-item` (5717-5724) bascule `done`, met à jour `p.updatedAt`, remet le carrousel à 0. Le bouton « C'est fait » et la coche de ligne utilisent le même gestionnaire. Depuis la Liste ou l'agenda : marque faite (sans décochage possible dans ces écrans).
- **Éditer le titre** : tap sur la ligne (5365). **Supprimer** : « × » sans confirmation (5747). **Supprimer une catégorie** : confirm (5579).
- **Suggestions IA** : *catégorie* (`generateCategorySuggestion` 4966, Haiku 300 tokens) : sans texte, 1 à 3 éléments manquants ; avec texte du champ, transforme le texte en 1 à 3 tâches (`slice(0,3)`, 5324) ; *projet* (`generateProjectSuggestion` 5008, Haiku 400 tokens) : réponse `{type:"add_items", categoryId, items}` ou `{type:"new_category", category}` (5341-5353) ; catégorie inconnue → création d'une catégorie « Suite ». Toasts « Nouveaux éléments ajoutés » / « Rien à ajouter pour l'instant » / « La suite du projet a été ajoutée » / « Suggestion indisponible pour l'instant ».
- **Priorités** : les 3 premières tâches non faites parcourues dans l'ordre catégories → items (`priorityItems` 2937) ; utilisées pour la carte « Prochaine action », le surlignage, la Liste (P1-P3) et l'agenda.
- **Statut d'activité** (`activityStatus` 2928) : accompli / actif (< 2 j depuis `updatedAt`) / ralentit (< 7 j) / pause ; **seul « accompli » a un effet visuel** (opacité de tuile) ; les 3 autres n'en ont pas (jetons de couleur définis 33-40, non utilisés — chantier 5 « vélocité » au backlog).

### F6 — Notes
- **Notes de tâche** : tableau `item.notes[{id,text,createdAt}]` ; ajout via S7 (`performAddNote` 5072), suppression directe (5084), édition via S7 (`performEditNote` 5128, **bug R-03**).
- **Notes de projet** : `p.projectNotes[{id,title,body,catId,createdAt}]` ; création manuelle (ouvre en édition, 5165) ; **depuis le chat** : « note » enregistre la réponse IA comme note, titre = première ligne nettoyée (markdown retiré), 65 caractères + « … » (5141-5159) ; édition du titre au blur (5098), du corps (5108) ; suppression (5120). `catId` est toujours `null` (champ hérité de l'ancien rattachement à une catégorie, migration à la normalisation, 2652-2664).
- Rendu markdown-lite (`parseAiText` 4821) : `###`, `##`, `#` (titres), `**gras**`, lignes `- ` ou `• ` (puces), lignes vides (espace 5 px) ; échappement HTML préalable. Pas de liens, listes numérotées, italique ni code.

### F7 — Agenda / calendrier
Décrit en 1.2 (K). Échéances : `dueBucket` (`1w` 7 j, `2w` 14, `1m` 30, `3m` 90, `6m` 180, `1y` 365, 2509-2516) → `dueDate = maintenant + jours` (calculée au moment du choix, pas à partir de `createdAt`, 2520). Les dates sont comparées en **heure locale** (`dateToStr` 4279).

### F8 — Chat IA
Envoi (`performChatSend` 5229, `performHomeChatSend` 5207) : message ajouté, `loading`, `render()`, appel `POST /api/ai` Haiku avec `system` et l'historique (20 derniers, en supprimant les tours initiaux non-utilisateur, 5058-5059) ; `max_tokens` 1800 (projet) / 2100 (ensemble). Contexte projet : titre + `dna || summary` + liste « Catégorie / Tâche → notes (fait) » (5045-5057). Contexte ensemble : une ligne par projet « emoji titre — fait/total · catégories (n en attente) · dna » (5182-5190). Consignes de style : titres, gras, tirets, concis, sans introduction. Pas de streaming. Erreur réseau → message « Désolé, je ne peux pas répondre pour l'instant. » ; **erreur amont sans exception (429/5xx du proxy ou d'Anthropic) → réponse vide** (R-05). Copier : `navigator.clipboard.writeText` + toast « Copié » / « Copie impossible » (5854-5861).

### F9 — Photos Pexels et icônes de projet
1. **Déclenchement** : à chaque `layoutHomeTreemap`, pour tout projet sans `photo` (4013) ; garde mémoire `photoFetchAttempted[id]` (une tentative par projet et par session, 2731) ; garde persistée « aucune photo » 24 h par projet, clé `dropit.photoMiss.<uid>` avec identifiant `titre|emoji` (2789-2812).
2. **Classification** : `classifyPhotoDomain` (2859) — Haiku, 100 tokens, à partir du **titre et de l'icône uniquement** → `{domain, subject}` (`subject` = 1-3 mots anglais concrets, jamais de visage).
3. **Requête** : `subject` nettoyé (`cleanSubject` 2706) sinon mots-clés du domaine (`PHOTO_ICON_TAXONOMY` 2693, 7 domaines) sinon table par icône (`iconDomainQuery` 2718).
4. **Serveur** (`photos.js`) : recherche Pexels `query + " wallpaper"`, `per_page=80`, `size=large` ; filtre strict : résolution ≥ 2560 px sur le grand côté, texte alt/slug prouvant un « fond d'écran », pas de visage/portrait, au moins un mot-clé du sujet, hors `exclude` ; sinon `404 no_results`. Renvoie `{url (large2x sinon large), photographer, photographerUrl, pexelsId, pageUrl}` ; l'URL doit être en `https://*.pexels.com/`.
5. **Stockage** : `p.photo = {url, photographer, photographerUrl, pexelsId, pageUrl, query, fetchedAt}` (2755) + copie de secours `dropit.pendingPhotos.<uid>` dans localStorage jusqu'à confirmation serveur (3088-3133).
6. **« Changer la photo »** : `regeneratePhoto` (2896) reclasse puis relance en excluant les ≤ 20 photos déjà vues dans la session (`photoSeen`) ; la photo actuelle n'est **remplacée que si une nouvelle est trouvée** ; toast « Recherche d'une nouvelle photo… » puis éventuellement « Aucune photo adaptée trouvée — la photo actuelle est conservée ».
7. **Icône** : `projectIconKey` (2595) : `p.icon` (catalogue de 83 icônes Material Design Icons) sinon déduite de `p.emoji` via une table de 312 emoji ; sinon drapeau. `ensureProjectIcon` (2819) : si l'emoji n'a pas d'équivalent, demande à Haiku (40 tokens) une clé du catalogue, une seule tentative par session.
8. **Attribution** : le photographe et les liens sont stockés mais **jamais affichés** (R-14).

### F10 — Carrousel « Prochaine action » : voir E7 point 4. Boutons précédent/suivant (circulaires, jamais de validation), index en mémoire uniquement.

### F11 — Catégories / accordéon : voir E7 points 6-8 ; création manuelle (barre projet) ou par IA ; suppression avec confirmation ; une seule catégorie dépliée à la fois ; la catégorie dépliée devient la cible de la barre d'ajout.

### F12 — Profil : voir S5 et F3. Lecture `GET /api/profile` ; le profil n'est chargé qu'à la demande pour un compte ancien (5599-5601).

### F13 — Suppression de compte (RGPD partiel)
Confirm natif → `DELETE /api/account` (rate limit 5/min) → suppression de l'utilisateur via l'API Admin Supabase → suppression en cascade de `dropit_user_data` et `dropit_user_profile` (FK `on delete cascade`, `setup.sql:2,14`) → `signOut()` + message. Les clés `localStorage` `dropit.photoMiss.*`, `dropit.pendingPhotos.*` et les drapeaux ne sont pas effacés.

### F14 — Sauvegarde : voir section 4.

---

## 3. Modèle de données

L'état complet est **un seul document JSON** par utilisateur, stocké dans `dropit_user_data.data` (jsonb) :

```
state = { projects: Project[], dropZone: DropItem[] }
```
Le serveur ne valide que `state.projects` (tableau, ≤ 50). `dropZone` et la forme interne des projets ne sont **pas** validés côté serveur (`projects.js:125-131`) ; le client normalise à la lecture (`normalizeProject` 2638, `normalizeCategory` 2564, `normalizeItem` 2550, `normalizeDropItem` 2575, `normalizePhoto` 2625).

### 3.1 Project (fabrique `makeProject` 2529 ; normalisation 2638-2685)
| Champ | Type | Défaut / règle | Note |
|---|---|---|---|
| `id` | string | `uid()` = `Date.now().toString(36)` + 6 car. base36 aléatoires (2468) | **détermine la couleur** (hash, voir 6.1) |
| `title` | string | « Projet » ; tronqué à 60 caractères à la création et au renommage | |
| `emoji` | string | « ✨ » | encore stocké et envoyé à l'IA ; n'est plus affiché comme icône |
| `icon` | string \| null | clé du catalogue (83) sinon `null` | résolu par IA ou par la table emoji→icône |
| `summary` | string | « » | modifiable par `prompt()` |
| `dna` | string | « » | **champ hérité en lecture seule**, à conserver (2671-2675) ; affiché et injecté dans les prompts de chat |
| `dueBucket` | `"1w"\|"2w"\|"1m"\|"3m"\|"6m"\|"1y"` \| null | | |
| `dueDate` | string ISO \| null | `now + jours(bucket)` au moment du choix | |
| `photo` | `Photo` \| null | | |
| `categories` | `Category[]` | migration d'anciens projets à `steps[]` → une catégorie « À faire » (2643) | |
| `projectNotes` | `ProjectNote[]` | | |
| `createdAt`, `updatedAt` | string ISO | `updatedAt` mis à jour à chaque modification ; **pilote le statut d'activité** | |

### 3.2 Category
`{id, title (défaut « À faire »), items: Item[], catNotes: [] (héritage, vidé à la normalisation), createdAt, updatedAt}` (2539, 2564).
### 3.3 Item (tâche)
`{id, title, done: boolean, createdAt, notes: TaskNote[]}` (2547, 2550). Pas de date d'échéance ni de date de complétion propre (`doneAt` n'existe pas : la « vélocité » du backlog l'exigera).
### 3.4 TaskNote
`{id, text, createdAt}`. (migration d'une ancienne note unique `raw.note`, 2554.)
### 3.5 ProjectNote
`{id, title, body, catId (toujours null en pratique), createdAt}` (2652-2654).
### 3.6 Photo
`{url (https://*.pexels.com/… obligatoire, sinon rejetée), photographer, photographerUrl, pexelsId (number|null), pageUrl, query, fetchedAt (ISO)}` (2625-2636).
### 3.7 DropItem
`{id, title, createdAt}` (4716).
### 3.8 Profil (table `dropit_user_profile`, endpoint `/api/profile`)
`{answers: object, completedAt: ISO|null}`. `answers` = identifiants stables : `prenom` (texte ≤ 60 client), `age`, `genre`, `statut`, `situation`, `enfants`, `enfants_ages[]`, `quotidien`, `projets[]`, `reves[]`, `adore[]`, `motive[]`, `fonctionne[]`, `fil[]`, `role[]`, `taches`, `temps[]`, `mot` (texte ≤ 300), et `<clé>_autre` (texte libre ≤ 120) pour les écrans « Autre… ». Serveur : ≤ 60 clés, ≤ 32 Ko ; texte libre tronqué à 300 à l'injection dans le prompt.
### 3.9 Réglages
Il n'y a **pas de table de réglages** (`dropit_user_settings` est au backlog, BYOK). Réglages locaux (localStorage) : voir Annexe B.
### 3.10 Session (côté client)
`{access_token, refresh_token, expires_at (ms epoch), user}` — `user` = objet utilisateur Supabase (`email`, `app_metadata.provider`, `id`, …).

### 3.11 Limites et plafonds (client ↔ serveur)
| Limite | Valeur | Où | Miroir |
|---|---|---|---|
| Projets par compte | **50** | `projects.js:93` ; `app.html:3075` (`MAX_PROJECTS_CLIENT`) | à changer des deux côtés |
| Taille du document envoyé | **2 Mo** (2 × 1024 × 1024) | `projects.js:90` ; `app.html:3069` (`SAVE_MAX_BYTES`) | idem |
| Alerte de taille | 70 % du plafond, une fois par session | 3072, 3179 | client seul |
| Corps `keepalive` | 60 000 octets | 3060 | client seul (limite navigateur 64 Kio) |
| Profil : corps / clés | 32 Ko / 60 clés | `profile.js:12-13` | |
| Titre de projet | 60 caractères (création, renommage) | 5282, 5510 | client seul |
| Historique de chat envoyé | 20 messages | 5058, 5194 | client seul |
| `max_tokens` IA | ≤ 2 200 | `ai.js:18` | |
| Suggestions ajoutées | 3 éléments max | 5324, 5345 | |
| Priorités | 3 tâches | 2939 | |
| Tâches par jour d'agenda | 5 | 4143 | |
| Requête photo | 80 caractères ; `exclude` ≤ 20 ids ; 80 résultats Pexels | `photos.js:7,11,112` | |
| Peu de contrôle de taille de champ | titres de tâche, notes, résumé : **aucun plafond** sauf les 2 Mo globaux | — | |

---

## 4. Sauvegarde et synchronisation

### 4.1 Principe
- **Source de vérité = serveur.** Au chargement : `GET /api/projects` (`load` 3014). Aucun cache local de l'état (pas de `localStorage`/IndexedDB pour `state`).
- **Écriture = document entier**, `POST /api/projects` `{state, baseUpdatedAt}` ; `baseUpdatedAt` = `updated_at` du dernier état connu (`lastKnownUpdatedAt`, 3012). Verrou optimiste côté serveur : `PATCH … ?user_id=eq.X&updated_at=eq.<baseUpdatedAt>` (`projects.js:21-39`) ; 0 ligne modifiée → **409** avec la version serveur. Sans `baseUpdatedAt` : `POST … on_conflict=user_id` avec `resolution=merge-duplicates` = **upsert qui écrase** (`projects.js:41-52`).

### 4.2 `persist()` et variantes (`3304-3348`)
- `persist()` : `pendingSave = true`, **debounce 350 ms** puis `sendSaveNow`.
- `persistNow()` : sans debounce (création de projet).
- `sendSaveNow(attempt, unloading)` (3185) : une seule sauvegarde en vol (`saveInFlight`) ; si l'état sérialisé est identique au dernier envoi confirmé (`lastSavedStateJson`), rien n'est envoyé (sauf en reprise d'échec) ; timeout 30 s (`AbortController`) ; `keepalive` seulement à la fermeture et si le corps < 60 000 octets.
- **Déclencheurs supplémentaires** : `visibilitychange` (page cachée → envoi immédiat avec `unloading=true` ; retour → relance ce qui est en attente), `pagehide`, `online` (3330-3348).

### 4.3 Gestion des réponses
| Réponse | Comportement | Réf. |
|---|---|---|
| 200 `{ok, updatedAt}` | met à jour `lastKnownUpdatedAt`, efface les photos « en attente » confirmées, lève le bandeau, toast « Modifications enregistrées » si on sortait d'une série d'échecs | 3259-3270 |
| **409** (conflit) | retente jusqu'à **5 tentatives** avec la version serveur fraîche et un délai `200×(n+1) + aléa(0-300) ms` ; après 5 échecs : **l'état local est remplacé par celui du serveur**, toast « Modifié sur un autre appareil — tes derniers changements n'ont pas pu être enregistrés » ; seules les photos en attente sont rejouées (une fois par épisode) — **pas de fusion** | 3216-3250 |
| Erreur définitive (400/413 hors 408/429) | bandeau **persistant** rouge : « Tes projets dépassent la taille maximale… » (413/`too_large`), « Tu as atteint la limite de N projets… » (`too_many_projects`), ou « Enregistrement refusé par le serveur… » ; aucune nouvelle tentative | 3279-3292 |
| Réseau, timeout, 408, 429, ≥ 500 | nouvelle tentative automatique avec attentes de **2, 5, 15, 30, 60 s** (`SAVE_RETRY_DELAYS`), un seul toast par épisode : « Enregistrement en attente — nouvelle tentative automatique » | 3293-3300, 3062 |
| 401 | `signOut()` | 2216 |

### 4.4 Quotas et alertes
Client : refus de création avant appel IA à 50 projets (5263) ; alerte à 70 % de 2 Mo (3179). Serveur : 413 `too_large`, 400 `too_many_projects`, 429 `Trop de requêtes` (30/min partagé GET+POST). Mesures de poids (MISSIONS 2026-09-29) : 2,9 Ko (sortie IA brute) / 10,1 Ko (usage moyen) / 60 Ko (grand utilisateur de notes) par projet ; 50 projets moyens ≈ 503 Ko.

### 4.5 localStorage — ce qu'il porte réellement
Session (`dropit-session`), drapeaux (`dropit_sample_notice_seen`, `dropit_onboarding_v1_seen`), et **deux caches de sécurité par utilisateur** : `dropit.pendingPhotos.<uid>` (photo changée mais pas encore confirmée, rejouée au chargement suivant si plus récente que celle du serveur, 3120-3133) et `dropit.photoMiss.<uid>` (« aucune photo » pendant 24 h). Le compte n'est jamais lu depuis `localStorage`.

### 4.6 Points d'attention pour la migration
- Le modèle « document entier à chaque sauvegarde » (jusqu'à 2 Mo) est coûteux sur mobile ; l'état d'avancement du repo indique que la **synchronisation incrémentale est reportée** (décision D6 de la mission 2026-09-29-robustesse) — la migration RN doit décider si elle reprend ce contrat tel quel.
- **Cohabitation PWA / RN** sur le même compte : mêmes conflits 409 ; le format de `state` devient un contrat commun.
- **Chargement défaillant = risque de perte de données** : voir R-01 (critique).

---

## 5. API

Tous les endpoints sont des Cloudflare Pages Functions (`functions/api/*.js`), réponses `Content-Type: application/json`. **Auth** : en-tête `Authorization: Bearer <access_token Supabase>` ; `requireUser` (`_lib/auth.js:43`) interroge `GET {SUPABASE_URL}/auth/v1/user` à **chaque** requête (la révocation de session est donc immédiate, au prix d'un aller-retour supplémentaire). `user_id` est toujours dérivé de ce jeton, jamais d'un paramètre. Accès à Postgres via clé `service_role` (RLS activée **sans policy** : refus par défaut pour anon/authenticated, `setup.sql`).
**Limite de débit** (`enforceRateLimit`, `auth.js:71` + RPC `dropit_check_rate_limit`) : fenêtre fixe d'1 minute par (utilisateur, endpoint), incrément atomique en base (`setup.sql:42-62`), **fail-open** si la base ne répond pas, purge des fenêtres > 10 min. Dépassement : `429 {"error":"Trop de requêtes, réessaie dans un instant."}`.

| Endpoint | Méthode | Auth | Rate limit (clé, /min) | Entrée | Sortie / erreurs |
|---|---|---|---|---|---|
| `/api/config` | GET | non | aucune | — | `{supabaseUrl, supabaseAnonKey, providers:{google, apple}}` ; 500 si non configuré (`config.js`) |
| `/api/projects` | GET | oui | `projects` **30** (partagé avec POST) | — | `{data, updatedAt}` (`data` = `{projects:[]}` si aucune ligne, `updatedAt:null`) ; 500 `{error: <texte brut Supabase>}` |
| `/api/projects` | POST | oui | `projects` 30 | `{state:{projects[], dropZone[]}, baseUpdatedAt: string\|null}` ; corps ≤ **2 Mo** | 200 `{ok:true, updatedAt}` ; **409** `{error:"conflict", data, updatedAt}` ; 413 `{error:"too_large", limit}` ; 400 `Invalid JSON body` / `state required` / `{error:"too_many_projects", limit:50}` |
| `/api/ai` | POST | oui | `ai` **20** | `{model, max_tokens, messages[], system?, temperature?}` (liste blanche `model, max_tokens, system, messages, temperature`) | corps Anthropic relayé tel quel avec son statut (`content:[{type:"text",text}]`) ; 400 `Modèle non autorisé` / `max_tokens invalide` (≤ 2200) / `messages requis` ; 500 clé absente ; 502 `IA injoignable` / `Réponse inattendue de l'IA` |
| `/api/photos` | GET | oui | `photos` **20** | `?q=<≤80 car.>&exclude=<ids Pexels séparés par virgule, ≤ 20>` | `{url, photographer, photographerUrl, pexelsId, pageUrl}` ; 400 `q required` ; 404 `no_results` ; 502 `Pexels indisponible` ; 500 clé absente |
| `/api/profile` | GET | oui | `profile` **15** (partagé avec POST) | — | `{profile:{answers, completedAt}}` ou `{profile:null}` |
| `/api/profile` | POST | oui | `profile` 15 | `{answers:object, completed?:boolean}` ; ≤ 32 Ko, ≤ 60 clés | `{ok:true}` ; 413 `Payload trop volumineux` ; 400 `answers required` / `Trop de réponses` |
| `/api/account` | DELETE | oui | `account-delete` **5** | — | `{ok:true}` ; 500 |

**Modèles Anthropic autorisés** (`ai.js:14-17`) : `claude-haiku-4-5-20251001`, `claude-sonnet-4-6`. Version d'API `anthropic-version: 2023-06-01`, clé serveur partagée (`ANTHROPIC_API_KEY`), pas de streaming. **Injection du profil** : si l'utilisateur a un profil, un bloc « Profil de l'utilisateur, renseigné par lui-même… » est **préfixé** au `system` (`ai.js:69-74`).

**Sept points d'appel IA côté client** :
| Usage | Fonction (ligne) | Modèle | `max_tokens` | Sortie attendue |
|---|---|---|---|---|
| Création de projet | `generateProject` 4930 | `claude-sonnet-4-6` | 800 | JSON objet |
| Suggestion catégorie | `generateCategorySuggestion` 4966 | haiku-4-5 | 300 | JSON tableau de chaînes |
| Suggestion projet | `generateProjectSuggestion` 5008 | haiku-4-5 | 400 | JSON `{type, …}` |
| Chat projet | `generateChatResponse` 5044 | haiku-4-5 | 1800 | texte (mini-markdown) |
| Chat ensemble | `generateHomeChatResponse` 5181 | haiku-4-5 | 2100 | texte |
| Classification photo | `classifyPhotoDomain` 2859 | haiku-4-5 | 100 | JSON `{domain, subject}` |
| Choix d'icône | `ensureProjectIcon` 2819 | haiku-4-5 | 40 | JSON `{icon}` |

**Supabase Auth appelé directement par le client** (avec la clé anon, via `fetch`, sans SDK `supabase-js`) : `POST /auth/v1/signup`, `POST /auth/v1/token?grant_type=password|refresh_token`, `POST /auth/v1/recover`, `POST /auth/v1/logout`, `GET /auth/v1/user`, `PUT /auth/v1/user` (nouveau mot de passe avec le jeton de récupération), `GET /auth/v1/authorize?provider=…&redirect_to=…`. **Aucun appel client vers `/rest/v1/`** (les tables ne sont accessibles que via les Functions).

**Variables d'environnement Cloudflare** : `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `PEXELS_API_KEY`, `ENABLE_GOOGLE_AUTH`, `ENABLE_APPLE_AUTH`.
**Schéma** (`setup.sql`) : `dropit_user_data(user_id uuid PK → auth.users ON DELETE CASCADE, data jsonb NOT NULL, updated_at timestamptz)`, `dropit_user_profile(user_id PK, answers jsonb default '{}', completed_at, updated_at)`, `dropit_rate_limit(user_id, endpoint, window_start, count, PK triple)` + fonction `dropit_check_rate_limit` (`security definer`).
**Cohérence à noter** : la fin de `profile.js` commente que `completed_at` n'est « posé qu'une fois » (`profile.js:80-81`), mais le code le **réécrit** à chaque appel avec `completed:true` (87) — à vérifier si cela compte.

**Impact RN sur l'API** : URL de base absolue (`https://dropit-dbx.pages.dev`) à la place des chemins relatifs ; aucun CORS nécessaire côté natif ; les redirections OAuth/recovery doivent être ajoutées à la liste blanche « Redirect URLs » de Supabase (schéma d'URL ou lien universel) ; le proxy IA est déjà le bon patron (aucune clé côté client). Le backlog BYOK (clé utilisateur) n'est pas implémenté.

---

## 6. Design system

### 6.1 Couleur de projet (8 teintes, déterministes)
`projectColorName(id)` (2480) : `h = 0 ; pour chaque caractère : h = (h × 31 + charCode) >>> 0 ; index = h % 8` dans l'ordre `["terracotta","corail","ambre","emeraude","sarcelle","azur","indigo","mure"]`. **À reproduire à l'identique** (même id → même couleur que sur le web).

Chaque teinte porte 11 déclinaisons (`:root` 42-101) :
| Teinte | card | badge | solid | rgb | ink | strong | glass (α .40) | card-faint | priority | next | btn |
|---|---|---|---|---|---|---|---|---|---|---|---|
| terracotta | #FAE8E4 | #F8E0DB | #D25C41 | 210,92,65 | #743324 | #9E4531 | 221,102,75 | #FDF6F4 | #FCF0ED | #FAEAE6 | #E8AEA0 |
| corail | #FAE4E9 | #F8DBE2 | #D24165 | 210,65,101 | #742438 | #9E314C | 221,75,111 | #FDF4F6 | #FCEDF1 | #FAE6EB | #E8A0B2 |
| ambre | #FAF1E4 | #F8ECDB | #C6872F | 198,135,47 | #6D4A1A | #946523 | 221,160,75 | #FDF9F4 | #FCF6ED | #FAF2E6 | #E2C397 |
| emeraude | #E4FAF1 | #DBF8EC | #27A571 | 39,165,113 | #155B3E | #1D7C55 | 75,221,160 | #F4FDF9 | #EDFCF6 | #E6FAF2 | #93D2B8 |
| sarcelle | #E4FAFA | #DBF8F8 | #26A1A1 | 38,161,161 | #155959 | #1C7979 | 75,221,221 | #F4FDFD | #EDFCFC | #E6FAFA | #92D0D0 |
| azur | #E4F1FA | #DBECF8 | #4196D2 | 65,150,210 | #245274 | #31709E | 75,160,221 | #F4F9FD | #EDF6FC | #E6F2FA | #A0CAE8 |
| indigo | #E6E4FA | #DDDBF8 | #4D41D2 | 77,65,210 | #2A2474 | #3A319E | 87,75,221 | #F5F4FD | #EEEDFC | #E7E6FA | #A6A0E8 |
| mure | #F4E4FA | #F1DBF8 | #AE41D2 | 174,65,210 | #602474 | #82319E | 184,75,221 | #FBF4FD | #F8EDFC | #F5E6FA | #D6A0E8 |

Rôles : **card** = fond de tuile et de carte (voile ≈ 15 %) ; **card-faint** = fond des cartes de catégorie (≈ 6 %) ; **priority** = fond des 3 tâches prioritaires (≈ 10 %) ; **next** = fond de la carte « Prochaine action » (≈ 14 %) ; **badge** = voile ≈ 20 % (pastille, puces actives, badges de la Drop Zone) ; **solid** = teinte pleine (coche cochée, barre de progression du détail, texte des badges, bannière « accompli ») ; **btn** = voile 50 % du bouton « C'est fait » (texte `--ink`) ; **rgb** = composantes pour rgba (pastille d'icône : 40 % sur les tuiles, 18 % ailleurs ; puce de titre sur photo : 22 %) ; **ink** = glyphe des icônes sur les tuiles ; **strong** = glyphe coloré ailleurs (contraste ≥ 4:1 au pire) ; **glass** = barre de progression des tuiles (deux voiles superposés sur du blanc, 257-261). **Décision D13 (mission 2026-09-29)** : `glass` n'est PAS dérivable de `solid` (écart +10 à +60 par canal) ; `rgb`, `ink`, `strong` en sont des dérivées exactes (test `livrables/test-couleurs.mjs`) ; ne pas « simplifier ».

### 6.2 Neutres, accents, sémantiques
| Jeton | Valeur | Usage |
|---|---|---|
| `--canvas` | #F8F8F9 | fond des écrans, champs de saisie |
| `--canvas-card` | #FFFFFF | cartes, barres, sheets |
| `--ink` / `--ink-soft` / `--ink-faint` | #2B2420 / #7A7168 / #A79E93 | texte principal / secondaire / atténué |
| `--line` | #EFEBE6 | filets, bordures, pistes |
| `--grid-line` | rgba(43,36,32,.035) | quadrillage 26 px du `body` (recouvert par des fonds opaques : probablement invisible — à vérifier) ; séparateur de lignes de liste |
| `--accent` / `--accent-soft` | #BF5B44 / #F3E2DC | boutons génériques, onglet actif, bulle utilisateur ; survol du bouton primaire #A34936 |
| `--ia-accent` / `--ia-accent-soft` | #3F8A5C / #E3EFE6 | barres de saisie IA, halo du bouton d'envoi ; survol #357A50 |
| Statuts | actif #3F8A5C, ralentit #C48A2E, pause #A79E93, accompli #BF5B44 (+ versions `-soft`) | définis ; `ralentit`/`pause`/`actif` non utilisés visuellement ; `p2` de la liste utilise `ralentit` |
| `--dropzone-violet` | #5B3FE8 | « ZONE » et pilule de la Drop Zone (fond rgba(91,63,232,.10)) |
| `--notif-red` | #D42A20 | point et pastille de la Drop Zone, bandeau de sauvegarde |
| Danger (en dur) | #9C4632 | suppression, erreurs (fond #FBEAE5, bordure #E9C4B8) ; « En retard » fond rgba(156,70,50,.12) |
| Bouton auth principal | #9CECCB (survol #7FE0B5), texte `--ink` | 1000-1004 |
| Info auth | fond `--status-actif-soft`, texte #3F8A5C, bordure #BFD9C8 | 1029 |
| Badge compteur auth | #E6493F | 977 |
| Boutons « copier » / « note » du chat | azur solid / ambre solid | 760-763 |
| Icônes flottantes auth | teintes corail, azur, indigo, ambre à 16 % + couleur pleine | 989-992 |
| Questionnaire (palette propre) | texte #16243F, bleu #3B82F6 / #2563EB, bordure #E9EEF5, secondaire #64748B, atténué #94A3B8, coches #22C55E, point du logo #EF5D4E ; cartes pastel `OBQ_T` = #FDEBE3 #E3EEFD #FBE4EE #E4F6EA #EDE8FD #FEF2D9 #E2F3F6 #FCE8E4 #E9F0FD (1599) | 1116-1245 |

Constante inutilisée : `TL_COLORS` (2466, jamais lue).

### 6.3 Typographie
Aucune police web : pile système `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif` (`--font-display`, 120) et pile mono `"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace` (`--font-mono`, 121, utilisée pour compteurs, pourcentages, étiquettes de section, libellés d'onglets, badges P1-P3). `text-size-adjust:100%` (128). Tailles/graisses principales :
| Élément | Taille / graisse / autres | Ligne |
|---|---|---|
| Salutation | 20 / 800, ls -.01em | 155 |
| Titre de tuile | **11 à 22 calculé** (voir 1.2 E4) / 700, ls -.01em, lh 1.25 | 231, 3464 |
| % de tuile | mono 10 / 700 | 262 |
| Titre de détail | 19 / 800 ; résumé 13 ; % mono 12 / 700 | 317-323 |
| Carte « Prochaine action » | titre 18 / 700 lh 1.35 ; badge mono 10.5 / 700 MAJ ls .06em ; catégorie 11.5 italique | 371-391 |
| Étapes | pastille 12 / 800 ; libellé 10.5 / 700 ; compteur mono 9.5 | 344-363 |
| Libellé de section | mono 10.5 MAJ ls .06em ; « Notes » mono 10 ls .05em | 404-407, 594 |
| Titre de catégorie | 16.5 / 700 ; méta mono 10.5 | 428-434 |
| Tâche (détail) | 14 ; (liste) 14 lh 1.35 ; méta 11.5 ; badge mono 9.5 / 700 | 461, 844-850 |
| Notes | texte 13 lh 1.4-1.6 ; titre de note 15.5 / 600 ; textarea de modale 16 lh 1.6 | 559, 608, 588 |
| Chat | bulle 13.5 lh 1.5/1.6 ; titres IA 17/800, 15/700, 13.5/700 | 756-757, 771-773 |
| Barres de saisie | 14 ; champ auth 16 | 495, 997 |
| Auth | titre 22 / 800 ls -.02em ; sous-titre 13.5 ; bouton 15 / 700 | 949-950, 1001 |
| Onglets | libellé mono 9.5 ; bouton DROP●IT 11.5 / 800 ls .02em | 656, 688 |
| Drop Zone | titre 27 / **900** ls .06em ; pilule 11.5 / 600 ; badge 12.5 / 600 | 709-735 |
| Questionnaire | titre 23 / 800 ls -.03em ; sous-titre 13 / 500 ; ligne 14 / 600 ; carte 10.5 / 700 | 1154-1183 |
| Toast 13 ; bandeau 12.5 lh 1.45 ; bouton `.btn` 13.5 / 600 | | 523, 534, 144 |
Emoji utilisés comme éléments d'interface : accueil (salutation), auth (icônes flottantes), questionnaire (options, humeurs), Drop Zone (📥), notice (🌴 🎂 📦), ampoule/étoile ✨ en préfixe des champs IA.

### 6.4 Rayons, ombres, traits
- **Rayons** : `--radius` 12, `--radius-lg` 18, `--radius-sm` 10 ; tuile 18 (conteneur) / 16 (corps) ; pilules 999 ; bottom sheets 20 20 0 0 ; champs de composition 20 ; boutons 10 ; champs auth 11 ; carte de chargement 16 ; popup onboarding 24 ; notice 22 ; questionnaire : lignes 14, cartes 16, CTA 15, champ 14, zone 16.
- **Ombres** : carte `0 2px 10px rgba(43,36,32,.07)` ; boutons ronds `0 6px 16px rgba(43,36,32,.14)` ; barres du bas `0 -4px 16px rgba(43,36,32,.08)` ; barre d'onglets `0 -2px 12px …(.06)` ; sheets `0 -8px 32px …(.18)` ; bouton DROP●IT `0 3px 10px …(.16)` ; toast `0 10px 24px rgba(0,0,0,.25)` ; bandeau `0 8px 22px rgba(0,0,0,.22)` ; pastille auth `0 10px 28px …(.12)` ; icônes auth `0 8px 20px …(.14)` ; **halo « anneau » du bouton d'envoi** `0 0 0 5px --ia-accent-soft` (ombre d'étalement, non portable, voir 7) ; questionnaire : deux ombres empilées (`0 1px 2px` + `0 6px 16px`).
- **Traits** : 1 px `--line` partout ; coches 1,5-1,8 px ; étapes 3 px ; barres de progression 4-6 px.
- **Voiles** : fond des sheets `rgba(43,36,32,.38)`, overlay de chargement `.5`, popups `.55`.
- **Couches z-index** : top-bar 40 ; barres du bas 42 ; bouton compte 45 ; tabbar 46 ; toast/note-modal 55 ; écrans slide, overlay de chargement, bandeau 60 ; Drop sheet 62 ; chat 63 ; compte 70 ; auth 100 ; tour 300 ; notice 310 ; questionnaire 320.

### 6.5 Animations et transitions
| Élément | Animation | Ligne |
|---|---|---|
| Écrans projet/liste/agenda | `left` .28 s `cubic-bezier(.4,0,.2,1)` ; sortie liste vers projet 200 ms `ease-in` | 786-801, 5701 |
| Spinner | rotation .8 s linéaire infinie | 517 |
| Toast | opacité .25 s, visible 1,8 s | 526, 4913 |
| Barre de progression du détail | `width .3s ease` | 327 |
| Chevron de catégorie | rotation .2 s | 435 |
| Zone dépliée | `categoryExpand .45s ease-out` (opacité 0→1, translateY -6→0) | 439-443 |
| Badge jeté (Drop Zone) | `dropToss .4s cubic-bezier(.34,1.56,.64,1)` | 747-751 |
| Icônes flottantes auth | `auth-floaty 4.5s ease-in-out infinite` | 969-975 |
| Tuile (survol) | filtre `brightness(.98)` .12 s (desktop) | 164-165 |
| Questionnaire | voir 1.2 Q1 (190 ms / 360 ms / 500 ms, ressorts .34 s) | 1875-1900, 1140-1146 |
| Tour (désactivé) | fondu .3 s, points .2 s | 1058, 1082 |
| Boutons | fond/bordure .12 s | 144 |
| Réduction des animations | `prefers-reduced-motion` respecté pour tuile, progress, spinner, toast, icônes auth, questionnaire | 164, 327, 517, 526, 971, 1259 |

### 6.6 Composants récurrents à reproduire
Pastille d'icône ronde (`.picon`) : 8 tailles (22-56 px), rond teinté + glyphe SVG du catalogue (83 chemins MDI 24×24, remplis) ; bouton rond 34-38 px (retour, menu, envoi, ajout) ; carte (fond teinte, rayon 18, ombre carte) ; ligne de tâche (coche ronde + titre + icône note + ×) ; ligne de liste (coche 26 px, titre, méta, badge, icône) ; badge P1/P2/P3 ; puces (icône ou texte, active/inactive) ; barre de progression (piste + remplissage teinté + % mono) ; bande d'étapes ; bottom sheet (poignée absente, backdrop cliquable, coins hauts arrondis 20) ; bouton pilule « DROP●IT » ; barre de saisie IA (✨ + champ arrondi 20 + bouton rond vert) ; champ de formulaire auth (16 px) ; bulles de chat ; toast ; bandeau d'erreur persistant ; icône SVG (18 icônes d'interface tracées à la main, 3500-3517, trait 1,3-2,4 px, `currentColor`).

---

## 7. Fonctions dépendantes du navigateur et équivalents RN probables

| Dépendance web | Usage dans l'app (lignes) | Équivalent RN / Expo probable |
|---|---|---|
| `localStorage` (session, drapeaux, caches par utilisateur) | 1503, 1535, 2154-2161, 2793-2799, 3093-3101 | Session : `expo-secure-store` (tailles de valeur limitées, **à vérifier** pour l'objet `user` complet) ; reste : `AsyncStorage`/MMKV |
| `history.pushState`/`popstate` | 3548, 6006 | pile de navigation (Expo Router / React Navigation) + `BackHandler` Android ; geste de retour iOS natif (nouveau) |
| `window.location.hash/origin`, `history.replaceState` (OAuth, recovery) | 2365-2400, 2292-2296, 2329 | `expo-auth-session` / `expo-web-browser` + `expo-linking` (schéma `com.dropit.app://` déjà utilisé côté Android, ou App Link/Universal Link) |
| `@capacitor/browser`, `@capacitor/app` | 2297-2321 | `expo-web-browser`, `expo-linking` |
| `fetch` relatif `/api/*` | partout | URL de base absolue (variable d'environnement Expo) |
| `fetch` `keepalive` à la fermeture | 3207 | non disponible : vider la file au passage `AppState` → `background` |
| `visibilitychange`, `pagehide`, `online` | 3330-3348 | `AppState`, `@react-native-community/netinfo` |
| `AbortController`, `TextEncoder`, `URLSearchParams` | 3080, 3210, 2368 | dispo partiellement sous Hermes ; **à vérifier** (`TextEncoder`, `URLSearchParams`) |
| `navigator.clipboard.writeText` | 5859 | `expo-clipboard` |
| `prompt()` / `confirm()` | 5508, 5521, 5564, 5583, 5617 | `Alert.alert` pour les confirmations ; `Alert.prompt` n'existe que sur iOS → **modale de saisie maison** pour Android |
| `canvas.measureText` (titres de tuiles) | 3404-3443 | mesure via `onTextLayout` / Skia / table de métriques ; **risque d'écart de rendu** (voir R-16) |
| Focus/curseur (`captureFocus`) | 3620-3639 | inutile (état React) ; gestion clavier à refaire |
| `innerHTML` + rebind d'événements | `render()` | composants React ; le défilement est conservé nativement |
| `env(safe-area-inset-*)`, `viewport-fit=cover`, `--tabbar-h` | 10, 154, 311, 484, 626 | `react-native-safe-area-context`, mode edge-to-edge |
| Unités `vh` (72 vh, 94 vh, 52 vh, 92 vh) | 671, 703, 583, 1257, 1044 | `useWindowDimensions` |
| `position: fixed/absolute` + z-index | tout | vues absolues / `Modal` / portail (bottom sheet : `@gorhom/bottom-sheet` ou équivalent) |
| CSS Grid (7 colonnes agenda, 3 colonnes cartes) | 878-880, 1179 | flex-wrap avec largeurs calculées |
| `conic-gradient` (anneau de progression des échéances) | 894 | `react-native-svg` (cercle, `strokeDasharray`) |
| `linear-gradient` (scrim de tuile, barre du questionnaire, faux dégradé de la barre de progression, quadrillage) | 132-135, 187, 257-261, 1140 | `expo-linear-gradient` ; la barre « double voile sur blanc » se recompose par calque |
| `radial-gradient` ×3 (fond du questionnaire) | 1118-1122 | `react-native-svg` (`RadialGradient`) ou approximation |
| `backdrop-filter` | **non utilisé** (évité volontairement, 75-76) | — |
| `filter: saturate/sepia/contrast` sur la photo de tuile | 181 | pas d'équivalent direct : matrice de couleur (Skia) ou voile de teinte ; écart visuel probable |
| `background-size: cover` (photo de tuile) | 180 | `expo-image` (`contentFit="cover"`, avec cache disque en plus) |
| `-webkit-line-clamp` | 232, 359, 845 | `numberOfLines` + `ellipsizeMode` |
| Fond de texte « en ligne » avec `box-decoration-break: clone` (titre sur photo) | 200-206 | `Text` imbriqué avec fond : pas de rayon/padding par ligne ; fidélité **à risquer** |
| `text-shadow`, `letter-spacing`, `text-transform: capitalize/uppercase` | 205, divers | supportés (capitalize/uppercase à appliquer en JS pour certains cas) |
| `text-wrap: balance` | 1154 | absent (ignorer) |
| `box-shadow` (dont ombres d'étalement `0 0 0 5px`) | 109, 500, 1197… | `shadow*` iOS / `elevation` Android (rendu différent) ; halo d'étalement = vue annexe |
| Animations CSS (`transition`, `@keyframes`, `cubic-bezier`) | 6.5 | `react-native-reanimated` / `Animated`, `Easing.bezier` ; `LayoutAnimation` pour l'accordéon |
| `prefers-reduced-motion` | 164… | `AccessibilityInfo.isReduceMotionEnabled` |
| `:hover`, `:active`, `:focus-visible` | nombreux | `Pressable` (état `pressed`) ; pas de survol |
| `<input type=email/password>`, `autocomplete`, `inputmode`, `autocapitalize` | 3779-3815 | `TextInput` (`textContentType`, `autoComplete`, `keyboardType`, `autoCapitalize`) ; Entrée = `onSubmitEditing` |
| `<textarea>` auto-extensible | 4923 | `TextInput multiline` + `onContentSizeChange` |
| SVG inline (18 icônes UI + 83 pictos MDI) | 3500-3517, 2580 | `react-native-svg` ; licence Apache 2.0 des pictos à conserver (`THIRD_PARTY_NOTICES.md`) |
| Polices système, `text-size-adjust` | 120-128 | police système native ; décider de la mise à l'échelle (`allowFontScaling`) ; graisses 800/900 sur Android : **à vérifier** |
| Emoji système | auth, questionnaire, Drop Zone | rendu par la police émoji native (aspect différent iOS/Android) |
| `setTimeout`, `requestAnimationFrame` | nombreux | disponibles |
| Notification, service worker, manifest | **absents** | sans objet ; les notifications seraient une **nouvelle** fonctionnalité (`expo-notifications`) |
| `assetlinks.json` (App Links Android) | `.well-known/` | conserver ; ajouter AASA pour iOS si liens universels |
| `_headers` (no-cache sur `app.html`) | `_headers` | sans objet ; les mises à jour passent désormais par les stores / EAS Update |
| Tests Playwright (règle du projet) | CLAUDE.md | à remplacer (Detox / Maestro / tests de composants) |

---

## 8. Estimation de taille par domaine

**Méthode** : décompte exact des lignes de `app.html` par domaine (sections JS + CSS), puis fourchette de lignes TypeScript/TSX à écrire, en supposant un ratio ligne source → ligne RN de 0,9-1,1 pour la logique pure et 1,2-1,5 pour l'UI (JSX + `StyleSheet` remplacent chaîne HTML + CSS). **Ce sont des hypothèses, à recaler après un spike** ; elles n'incluent ni tests, ni configuration (EAS, app.json), ni le fichier de données du catalogue d'icônes (généré, ≈ 34 Ko).

### 8.1 Décompte du code source existant
| Bloc | Lignes | Détail |
|---|---|---|
| `app.html` total | 6 066 | ≈ 1 300 lignes d'en-tête + CSS ; ≈ 4 760 lignes de JS (1307-6063) |
| dont CSS | ≈ 1 290 | tokens 138 ; accueil/tuiles 137 ; détail 188 ; barres/overlays 65 ; notes 75 ; tabbar/chat/drop 161 ; liste/agenda/écrans 161 ; auth 95 ; tour+notice 74 ; questionnaire+profil 149 ; compte/menus 38 |
| dont JS | ≈ 4 760 | (voir 8.2 ; le décompte par blocs de 8.2 totalise 5 993 lignes JS + CSS sur 6 066) |
| `functions/api/*.js` | 552 | ai 105, account 26, config 20, photos 150, profile 97, projects 154 |
| `functions/_lib/*.js` | 202 | auth 75, profile 127 |
| `setup.sql` | 62 | |
| Hors périmètre RN probable | ≈ 195 + coquille | `index.html` (landing, 195 lignes), `telechargement-android.html`, `vivre.html` (prototype indépendant, 47 Ko) |

### 8.2 Par domaine fonctionnel
| Domaine | Lignes source (JS + CSS) | Références | RN estimé (lignes TS/TSX) |
|---|---|---|---|
| Design system : jetons, couleurs, icônes UI/projet, hash de teinte | 138 CSS + 18 + 38 + 81 JS | 13-150, 2447-2527, 2578-2615, 3500-3517 | 400 – 550 (+ données générées) |
| Authentification + session + récupération | 462 JS + 95 CSS | 1310-1322, 2152-2443, 3699-3855, 943-1036 | 450 – 700 |
| Questionnaire + profil | 595 JS + 149 CSS | 1556-2150, 1113-1261 | 700 – 1 000 |
| Notice d'exemples | 37 JS + ≈ 20 CSS | 1518-1554, 1095-1111 | 50 – 80 |
| Tour d'onboarding (désactivé) | 186 JS + 56 CSS | 1331-1516, 1038-1093 | **0** (à confirmer) |
| Modèle, normalisation, données d'exemple | 49 + 70 + 43 JS | 2529-2577, 2616-2685, 2963-3005 | 250 – 350 |
| Persistance / synchronisation | 342 JS + 65 CSS (bandeau, toast) | 3007-3348 | 350 – 550 (hors cache hors-ligne, non existant) |
| Accueil treemap (calcul + rendu) | 149 + 158 JS + 137 CSS | 3350-3498, 3924-4081, 151-287 | 500 – 700 |
| Moteur de photos Pexels + icônes IA | 226 JS | 2687-2912 | 250 – 350 |
| Détail projet (étapes, prochaine action, accordéon, lignes de tâches, barres, menu projet) | ≈ 240 + 66 + 54 JS + 188 CSS + 38 | 4384-4623, 3857-3922, 4873-4926, 288-475 | 900 – 1 300 |
| Liste « Priorités » | 50 + 74 JS + ≈ 75 CSS | 4083-4132, 4190-4263 | 250 – 350 |
| Agenda « Aujourd'hui » | 55 + 118 JS + ≈ 90 CSS | 4134-4188, 4265-4382 | 350 – 500 |
| Drop Zone | 110 JS + ≈ 55 CSS | 4647-4756 | 200 – 300 |
| Notes (tâche + projet + modale) | 21 + 58 + ≈ 110 JS + 75 CSS | 4625-4645, 4758-4815, 5072-5179 | 350 – 500 |
| Chat IA + génération IA (7 appels) | 55 + 142 + ≈ 75 JS + ≈ 100 CSS | 4817-4871, 4928-5069, 5181-5253, 5257-5361 | 450 – 650 |
| Coque de navigation : onglets, sheets, toasts, overlays, sécurité de zones, gestion du retour | 179 JS + ≈ 330 CSS | 3519-3697, 618-698, 660-676 | 500 – 750 |
| Gestionnaires d'événements (absorbés par les composants ci-dessus) | 634 JS | 5363-5996 | inclus |
| Boot + config | 66 JS | 5998-6063 | 60 – 100 |
| **Total (hors tests, config, données générées)** | ≈ 6 000 | | **≈ 5 900 – 8 400** |

À ajouter, non présent dans la PWA : initialisation du projet Expo et navigation, configuration de build (EAS), liens profonds, icônes/splash, tests de bout en bout — volumétrie non estimée ici. Backend : ≈ 750 lignes à conserver ; changements probables limités (liste blanche de redirections Supabase, éventuel endpoint de notification si retenu, éventuelle version de contrat de `state`).

---

## 9. Zones non testées, risques et ambiguïtés

### 9.1 Ce qui n'est pas couvert par des tests (source : `MISSIONS/2026-09-29-robustesse-sauvegarde-nettoyage/etat.md`)
- **Aucun test automatisé** sur le chat IA, l'agenda, l'onboarding/questionnaire et le profil.
- Le plafond de 2 Mo n'a jamais été franchi en conditions réelles (raisonné sur des mesures).
- Pexels est injoignable depuis le bac à sable : le filtre de domaine est testé unitairement, jamais contre une vraie réponse Pexels.
- La limite de débit serveur n'est pas prouvée en conditions réelles (la table n'a pas été inspectée).
- Les tests existants (`livrables/quota-check.js`, `focus-check.js`, `test-couleurs.mjs`, `test-securite.mjs`) couvrent la sauvegarde, le focus de `render()`, la cohérence des teintes et la liste blanche IA.

### 9.2 Bugs et risques identifiés par la lecture (avec sévérité)
| ID | Sév. | Constat | Réf. |
|---|---|---|---|
| **R-01** | **Critique** | **Chargement sans contrôle de statut → écrasement possible des données réelles.** `load()` fait `res.json()` sans vérifier `res.ok` (3015-3016). Une réponse `500` ou `429` de `GET /api/projects` (`{error:…}`, sans `data`) est traitée comme un compte **neuf** (`fresh`, 3020) : `state = defaultData(); persist()` (3023-3024) avec `lastKnownUpdatedAt = null` ; le serveur reçoit `baseUpdatedAt: null` et fait un **upsert qui écrase** (`projects.js:41-52`). Idem si le fetch échoue (catch 3037-3043 : `state = defaultData()` avec `baseUpdatedAt` nul ; toute action suivante déclenche la même écriture). Non reproduit (pas de navigateur/serveur ici) : **à vérifier par test**, mais le chemin est non ambigu à la lecture. À traiter en RN dès le premier jour. | 3014-3044 |
| R-02 | Élevé | Supprimer tous ses projets → au prochain chargement, `fresh` est vrai : les 3 exemples sont réinjectés et le questionnaire/notice se rejouent (le questionnaire n'est jamais proposé automatiquement aux comptes qui ont déjà des projets). | 3020-3035, 2078 |
| **R-03** | Élevé | **Édition d'une note de tâche existante cassée (bug quasi certain)** : `performEditNote` assigne `noteEditId = null` (5136), variable **jamais déclarée** dans un IIFE en mode strict (`"use strict"`, 1308) → `ReferenceError` avant `persist()`/`render()`. Confirmé par ESLint `no-undef`. Conséquence probable : la modale reste ouverte, la note change en mémoire seulement, un second « Enregistrer » lève une `TypeError` (`noteModal` déjà nul). **À confirmer par test navigateur.** Ne pas reproduire « à l'identique ». | 5128-5139 |
| R-04 | Moyen | `signOut()` ne remet pas à zéro `profile`, `obqAnswers`, `composeText`, `noteOpenId`, `chatProjectOpen`, `chatHomeOpen`, `photoFetchAttempted`, `photoSeen`, `lastKnownUpdatedAt`, `lastSavedStateJson`, file de sauvegarde en attente, etc. Après changement de compte sans rechargement, « Mon profil » peut afficher le profil du compte précédent (`if(profile) openProfileSheet()`, 5600) ; une reprise de sauvegarde pourrait envoyer l'état d'un autre compte — **à vérifier**. | 2339-2356 |
| R-05 | Moyen | Chat : `res.json()` sans `res.ok` (5066, 5202) → une erreur amont (429 du proxy, 5xx d'Anthropic) donne une **bulle IA vide** (le message d'excuse n'est utilisé que sur exception). | 5063-5068, 5199-5204 |
| R-06 | Moyen | Création de projet : `max_tokens: 800` pour un JSON pouvant contenir jusqu'à 5 × 7 éléments (prompt 4940) → troncature possible → `JSON.parse` échoue → projet de repli « IA indisponible » silencieux. **À mesurer** (taille de sortie réelle de Sonnet). | 4955, 5296 |
| R-07 | Moyen | Historique de navigation incohérent : le tap sur une ligne de la Liste ouvre un projet **sans `pushNavEntry`** (5696-5715) ; l'onglet Accueil ne dépile rien (5399) ; l'audit du 18/09 (4.1) documentait une course de 280 ms, corrigée par `snapshot` (3561) mais non revérifiée. En RN, la pile sera définie par le routeur : **spécifier le comportement « retour » attendu**. | 3548-3591 |
| R-08 | Moyen (iOS) | Le détail projet n'a **aucun bouton retour visible** (4484-4487) ; seuls le geste/bouton retour Android ou l'onglet Accueil ramènent. Sur iOS il faudra un en-tête ou le geste de bord. | 4484 |
| R-09 | Moyen | `prompt()`/`confirm()` natifs : pas d'équivalent Android pour `Alert.prompt`. | 5508… |
| R-10 | Faible | Marqueurs de jalon de l'agenda : les classes `cp-ontrack/cp-behind/cp-upcoming` (4343) **n'ont aucune règle CSS** (seule `.cal-checkpoint-badge`, 898) → le verdict « dans les temps / en retard » n'a probablement aucune couleur ; le seul signal est le `title` (info-bulle, inexistante au toucher). **À vérifier visuellement.** | 4338-4344, 898-901 |
| R-11 | Faible | États d'UI non réinitialisés : `chatProjectOpen` reste vrai en quittant un projet → le chat s'ouvre au prochain projet ouvert ; idem `noteModal`, `noteOpenId`. Libellé d'agenda en date ISO brute (4367). Le prénom de la salutation vient de l'e-mail, pas du questionnaire (3909). | 5424-5436, 4367, 3909 |
| R-12 | Faible | Carte « Prochaine action » : quand l'index du carrousel > 0, la liste « Ensuite » retire toujours `remaining[0]` (4534-4540) → l'action affichée dans la carte figure aussi dans la liste, et la première n'apparaît plus qu'en « précédente ». **À vérifier.** | 4534-4540, 4482 |
| R-13 | Moyen (produit) | **Drop Zone : le « tri » n'existe pas** : un tap sur un badge le supprime définitivement, sans confirmation ni conversion en tâche/projet ; l'interface parle de « Rien à trier » et de « décharge mentale ». Confronter à ce que la landing/le backlog promet avant de « reproduire à l'identique ». | 4740-4756 |
| R-14 | Moyen (conformité) | Attribution Pexels : `photographer`, `photographerUrl`, `pageUrl` sont stockés mais jamais affichés. **À vérifier** au regard des conditions d'usage de l'API Pexels avant publication en boutique. | 2629-2632, 2755 |
| R-15 | Moyen | Rafales d'appels au premier affichage : chaque `layoutHomeTreemap` boucle sur tous les projets sans photo/icône (4013) sans étranglement ; un projet peut coûter 2 appels IA (icône + classification) + 1 Pexels. Avec ≥ 10 projets sans photo, dépassement probable de `ai` = 20/min → échecs silencieux, retentés seulement à la prochaine session ; Pexels : 200 requêtes/heure (commentaire 2787). Inférence à partir du code, **à vérifier**. | 4013, 2848, 2819 |
| R-16 | Moyen | Treemap à l'identique : `titleFontSizeFor` repose sur la mesure canvas de la police système (`-apple-system`/Roboto) mot par mot ; la police RN diffère (San Francisco vs Roboto, hinting) → mêmes tailles de tuile mais coupures de lignes/tailles de police différentes. | 3404-3498 |
| R-17 | Moyen | Barres de saisie absolues (composition, ajout de tâche, Drop Zone) posées au-dessus de l'onglet-bar : la gestion du clavier (poussée, `KeyboardAvoidingView`) est à concevoir ; le comportement actuel du viewport avec clavier (Android WebView, `resize`) n'est pas documenté — **à vérifier**. | 483, 915, 721 |
| R-18 | Moyen | **Aucun mode hors-ligne** et aucun cache de l'état : au démarrage sans réseau, l'app affiche des données d'exemple (toast « données locales affichées » : ce ne sont **pas** les données de l'utilisateur, 3042). Décision produit nécessaire pour un produit « 100 % mobile » (cf. R-01). | 3037-3043 |
| R-19 | Moyen | Session : `refreshSession` efface la session (`saveSession(null)`) sur toute réponse non-OK, y compris 429/5xx (2183-2193) ; pas de dédoublonnage des rafraîchissements concurrents (plusieurs appels API simultanés avec un jeton expiré → plusieurs `refresh_token` en parallèle ; **à vérifier** avec la rotation de jetons de Supabase). Après un tel échec, `apiFetch` rejette `no-session` sans écran de reconnexion (2207). | 2183-2219 |
| R-20 | Moyen (sécurité) | Jetons stockés en clair dans `localStorage` (web) ; RN → stockage sécurisé. Redirection OAuth par schéma d'URL personnalisé (audit 2.1 : interceptable par une autre app Android) ; la migration vers App Link n'est pas faite. | 2160, 2292 |
| R-21 | Moyen | Fournisseurs : `providers.google` vaut vrai par défaut dans le code (`config.js:16`) mais `SETUP_AUTH.md` indique `ENABLE_GOOGLE_AUTH=false` au 05/09 : **état de production à vérifier**. Apple non configuré. Si Google est proposé sur iOS, la règle App Store sur « Sign in with Apple » s'applique probablement (**à vérifier**). | `config.js:14-18` |
| R-22 | Faible | Réinitialisation de mot de passe : `redirect_to` = origine web (2329), donc le lien de l'e-mail ouvre le web, pas l'app ; à concevoir avec lien profond. Comportement dans la coquille Capacitor actuelle : **à vérifier**. | 2329 |
| R-23 | Faible | Code mort / documents périmés : tour d'onboarding désactivé, `json.migrated` (3032, jamais renvoyé par l'API actuelle), `TL_COLORS`, statuts d'activité non affichés, `SETUP_AUTH.md` (parle encore de la reprise par `device_id`, absente du code actuel). | 1511, 3032, 2466 |
| R-24 | Faible | `profile.js:80-81` dit que `completed_at` n'est posé qu'une fois mais le code le réécrit à chaque `completed:true`. | `profile.js:87` |
| R-25 | Moyen (dette) | Le contrat de synchronisation (document entier, sans fusion, dernier gagnant côté serveur après 5 conflits) peine avec plusieurs clients (PWA + RN, plusieurs appareils) ; la synchro incrémentale est repoussée (décision D6). | 3216-3250 |
| R-26 | Faible | Si un `401` survient pendant une création IA, `signOut()` vide l'état, puis le `catch` de `performCreateFromIntention` crée quand même un projet de repli dans l'état vidé et déclenche `persistNow()` sans session (boucle de retry sur `no-session`, traité comme retriable, 3278). **Inférence, à vérifier.** | 5296-5313, 3274-3300 |

### 9.3 Ambiguïtés à trancher dans le CADRAGE (« à l'identique » : quelle version ?)
1. **Périmètre iOS / Android** : la PWA ne connaît qu'une coquille Android ; la demande est « 100 % mobile » (Expo) → iOS entre dans le périmètre ? (implique Sign in with Apple, retour arrière iOS, sheets natifs.)
2. **Quelle « identité » reproduire** quand le comportement actuel est un bug (R-03, R-10, R-12) ou une incohérence (R-11, R-13) : recopier ou corriger ?
3. **Tour d'onboarding** : désactivé (N2) — hors périmètre, ou à réactiver dans RN ?
4. **Mode hors-ligne / cache local** : inexistant aujourd'hui (R-18) ; à introduire ou hors périmètre ?
5. **Cohabitation PWA ↔ RN** : le web reste-t-il un client du même compte ? (contrat `state`, conflits, versionnement du schéma.)
6. **Drop Zone** : reproduire la suppression seule (R-13) ou spécifier un vrai tri ?
7. **Notifications / rappels** : absents aujourd'hui ; hors périmètre ou nouveaux ?
8. **Boutons de retour** sur iOS et comportement du retour Android (R-07, R-08).
9. **Fidélité visuelle acceptable** pour les éléments non portables (filtre photo, halo d'étalement, titre encadré sur photo, dégradés radiaux, anneau conique) — comparer aux captures de référence `Lancement/Création de contenu/Assets/compte-démo/01…13-*.png` (13 captures de l'app, présentes dans le dépôt).
10. **Où se trouve la coquille Android** (`android/`, `capacitor.config.json`) : uniquement sur la branche distante `feature/capacitor-android`, non fusionnée dans `main` ; à décider : abandon, ou conservation pour la période de transition.
11. **Clé Anthropic partagée** (coût, quotas de 20 appels/min/utilisateur) : le backlog BYOK est-il un préalable ?
12. **Mise à l'échelle des polices système** (`allowFontScaling`), tablettes (largeurs maximales 600-620 px du web), orientation paysage : non spécifiés dans l'app actuelle (la coquille Android a des splash paysage — à vérifier).

---

## Annexe A — Catalogue d'icônes de projet (83 clés, `app.html:2580`)
famille, coeur, bebe, fete, gateau, cadeau, avion, valise, palmier, carte, monde, plage, boussole, train, camping, montagne, bateau, maison, immeuble, canape, lit, plante, fleur, arbre, cle, outils, carton, course, velo, haltere, ballon, natation, randonnee, trophee, medaille, mallette, courbe, argent, tirelire, fusee, poignee, boutique, banque, carte_bancaire, cible, balance, document, liste, valide, calendrier, horloge, ampoule, courriel, telephone, palette, camera, musique, guitare, crayon, cinema, jeu, livre, diplome, ordinateur, code, fiole, langue, voiture, courses, cuisine, cafe, chien, chat, animaux, sante, soleil, vetement, portefeuille, cloche, engrenage, etoile, drapeau, dossier.
Structure : `{clé: {label, path}}` (chemin SVG 24×24, remplissage). Table `EMOJI_TO_ICON` : 312 entrées emoji → clé (2581) ; l'emoji est comparé sans le sélecteur de variante U+FE0F, puis, pour les séquences ZWJ, sur la base avant le joiner (2588-2594). Générés par `build-icones.js` (non présent dans `main` : à vérifier) ; source des pictos : Material Design Icons (Pictogrammers), licence Apache 2.0.

## Annexe B — Clés `localStorage`
| Clé | Contenu | Réf. |
|---|---|---|
| `dropit-session` | `{access_token, refresh_token, expires_at, user}` | 1312, 2154 |
| `dropit_sample_notice_seen` | `"1"` | 1520 |
| `dropit_onboarding_v1_seen` | `"1"` (tour désactivé, écriture seulement) | 1332, 1503 |
| `dropit.pendingPhotos.<uid>` | `{<projectId>: Photo}` | 3088-3102 |
| `dropit.photoMiss.<uid>` | `{<projectId>: {id: "titre|emoji", at: ms}}` | 2790-2799 |

## Annexe C — Résumé des règles de calcul à reproduire à l'identique
- **Couleur de projet** : hash 31 sur l'id, modulo 8 (2480).
- **Progression** : `round(faites / total × 100)`, 0 si aucune tâche (2918). **Accompli** : ≥ 1 tâche et toutes faites (2924).
- **Priorités** : 3 premières tâches non faites, ordre catégories → tâches (2937).
- **Liste globale** : max 3 tâches non faites par projet, P1/P2/P3 ; **scopée** : toutes, `reste` au-delà du 3ᵉ (4083).
- **Agenda du jour** : tri par seuil d'échéance, rotation `floor(Date.now()/86400000) % n`, tour par tour sur 3 tâches/projet, en retard d'abord, plafond 5 (4144-4188).
- **Jalons** : +30 j (si échéance ∉ {1w, 2w, 1m} et `created+30j < due`) à 25 %, mi-parcours à 50 % (4280-4293).
- **Treemap** : poids `max(1, tâches + catégories)`, aire naturelle 3 400 px² par point, squarify, seuils de taille (3393), police 11-22 réduite par pas de 0,5 jusqu'à 8 pour tenir en 1 ou 2 lignes (3464).
- **Échéances** : 7, 14, 30, 90, 180, 365 jours (2509).
- **Statut d'activité** : < 2 j actif, < 7 j ralentit, sinon pause ; accompli prioritaire (2928).

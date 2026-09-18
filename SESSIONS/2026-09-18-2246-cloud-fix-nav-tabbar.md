# Session 2026-09-18 — Cloud — Correction navigation & barre de menu

## Contexte

4 bugs remontés par l'utilisateur :
1. Barre de menu masquée quand la fenêtre Chat IA est ouverte.
2. Le chat IA ne s'affichait plus en tapant sur "Chat IA" depuis la vue projet.
3. La barre de saisie de Drop it tombait sur la barre système du téléphone (impossible d'écrire/envoyer).
4. Les boutons de la barre de menu ne naviguaient pas quand on était sur un autre écran (accueil, liste, calendrier).

## Diagnostic

- **Cause racine des bugs 2 et 4** : `renderDetail()` et `renderCalendarScreen()` embarquent chacun leur propre copie de la bottom-tabbar (même id), pendant que celle de l'accueil reste dans le DOM en dessous. `bindTabBarEvents()` utilisait `getElementById`, qui renvoie toujours la première occurrence (celle de l'accueil, masquée) au lieu de celle réellement affichée — les taps sur la barre visible ne faisaient donc rien, y compris sur le bouton "Chat IA".
- L'écran "Liste" (tasklist-screen) n'avait quant à lui **aucune** bottom-tabbar du tout (seulement la barre d'ajout de tâche) — impossible d'en sortir autrement qu'avec le bouton retour.
- **Bug 1** : `.chat-modal` couvrait `inset:0` avec un z-index (50) supérieur à celui de `.bottom-tabbar` (46) — la barre de menu se retrouvait visuellement et fonctionnellement recouverte par le fond assombri de la modale de chat.
- **Bug 3** : `.drop-sheet-compose` était la seule barre de saisie fixe de l'app sans `padding-bottom` tenant compte de `env(safe-area-inset-bottom)` — elle tombait donc dans la zone de la barre de gestes du téléphone.
- Confirmé au passage : `generateChatResponse()` inclut déjà l'intégralité du projet (titre, DNA/résumé, toutes les tâches de toutes les catégories avec leurs notes et leur statut fait/à faire) dans le prompt système envoyé à l'IA — le chat projet a bien le contexte complet du projet.

## Corrections

- `bindTabBarEvents()` : nouvelle fonction `lastById()` qui prend la dernière occurrence d'un id (= celle de l'écran au premier plan) au lieu de la première.
- `.chat-modal` : `bottom` borné à `--tabbar-h` (au lieu de `inset:0`) pour laisser la barre de menu visible et cliquable ; z-index relevé à 63 pour rester au-dessus de `.tasklist-screen`/`.calendar-screen` (nécessaire maintenant que "Chat IA" y est cliquable).
- `.drop-sheet-compose` : ajout du padding de zone de sécurité en bas.
- `renderTaskList()` : ajout de `renderBottomTabBar()` (barre de nav complète, comme sur les 3 autres écrans), avec `.tl-compose-bar` repositionnée en absolute au-dessus (même gabarit que `.detail-fixed-bar`). La tabbar n'est émise que quand `taskListOpen` est vrai (l'écran Liste reste toujours dans le DOM hors-écran pour l'animation de glissement — sinon doublon permanent hors-champ).
- `renderHome()` : la tabbar de base n'est plus émise quand la liste est ouverte, pour éviter le doublon d'id.

## Vérification

Testé en conditions réelles avec Playwright (Chromium, viewport mobile 390×844), API `/api/config`, `/api/projects`, `/api/ai` mockées via `page.route` (pas de backend Supabase/Anthropic disponible dans cet environnement) :
- Ouverture du chat depuis la vue projet → OK (bug 2 corrigé).
- Barre de menu visible et cliquable ("Accueil") pendant que le chat est ouvert → OK (bug 1 corrigé).
- Navigation croisée détail ↔ calendrier ↔ liste ↔ accueil, y compris "Chat IA" depuis la liste et le calendrier → OK (bug 4 corrigé).
- Barre Drop it : bouton "Envoyer" cliquable avec un safe-area-inset-bottom simulé, règle CSS confirmée → OK (bug 3 corrigé).

## Statut

LIVRÉ. Push direct sur `main` (fix mineur/cosmétique, cf. workflow git de CLAUDE.md).

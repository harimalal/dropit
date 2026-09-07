# Design — Menu FAB + SUGGERER enrichi
Date : 2026-09-07

## 1. Contexte

app.html — SPA mobile first, ~3400 lignes, rendu par innerHTML. Pas de framework.

Vues possibles (pilotées par `currentProjectId` et `currentCategoryId`) :
- Home (aucun projet ouvert, `taskListOpen=false`)
- Tasklist (`taskListOpen=true`)
- Projet (`currentProjectId` défini, `currentCategoryId=null`)
- Catégorie (`currentProjectId` + `currentCategoryId` définis)

## 2. Fonctionnalité 1 — Menu FAB (remplace le swipe)

### Ce qu'on supprime
- Event listeners touchstart/touchmove/touchend (lignes 3309-3344)
- `.home-swipe-hint` div et sa CSS (lignes 508-516)
- Le rendu des deux `chat-icon-btn` (home-icon-btn + son homologue projet) — remplacés par le FAB

### Nouvel état global
```js
var menuOpen = false;
```

### FAB — comportement

Bouton fixe, bottom:76px right:16px (dégage toutes les barres existantes), couleur accent du projet courant ou orange/coral de l'app si vue home.

Tap sur le FAB : toggle `menuOpen`. Tap en dehors : ferme.

Quand `menuOpen=true`, 3 boutons apparaissent en colonne au-dessus du FAB avec animation slide-up :

1. Icône Liste (rayures) — label "Liste"
   - Disabled si déjà dans la tasklist (vue `taskListOpen=true`)
   - Sinon : `taskListOpen=true ; if(currentProjectId) tlSelectedProjects=[currentProjectId] ; menuOpen=false ; render()`
   
2. Icône Chat (bulle) — label "Chat IA"
   - Si `currentProjectId` : ouvre `chatProjectOpen=true`
   - Sinon : ouvre `chatHomeOpen=true`
   - `menuOpen=false ; render()`

3. Icône Calendrier — label "Bientôt"
   - Toujours disabled, style grisé, non cliquable

### CSS
```
.fab-menu-btn      — bouton principal (cercle 52px, couleur accent, ombre)
.fab-menu-open     — état ouvert du bouton principal (rotation icône)
.fab-menu-items    — container des 3 sous-boutons (hidden par défaut)
.fab-menu-items.open — visible + slide-up animation
.fab-item          — chaque sous-bouton (cercle + label sous)
.fab-item.disabled — opacity 0.35, pointer-events none
```

### Présence sur toutes les vues
Le FAB est rendu dans `render()` lui-même (hors des sous-fonctions renderHome/renderProject/etc.), pour être systématiquement présent. Il ne doit pas apparaître sur les écrans d'auth/boot/onboarding.

### Fermeture au clic extérieur
Overlay transparent z-index juste en dessous du FAB, ou listener `click` sur document avec `stopPropagation` sur le FAB.

## 3. Fonctionnalité 2 — SUGGERER enrichi

### Problème actuel
`generateCategorySuggestion` et `generateProjectSuggestion` ignorent le texte saisi dans le champ. Seul `performTlSuggest` exploite le texte (pattern déjà correct).

### Fix — `performSuggestForCategory`
Avant d'appeler `generateCategorySuggestion`, lire :
```js
var dfbInput = document.getElementById('dfb-input');
var userText = dfbInput ? dfbInput.value.trim() : '';
```
Passer `userText` à `generateCategorySuggestion(p, cat, userText)`.

Dans `generateCategorySuggestion`, si `userText` est non vide : même logique que `performTlSuggest` (transformer le texte en tâches pour cette catégorie). Si vide : comportement actuel (suggérer logiquement).

### Fix — `performSuggestForProject`
Même pattern avec `dfb-proj-input` → `generateProjectSuggestion(p, userText)`.

Dans `generateProjectSuggestion`, si `userText` : orienter la suggestion vers ce que l'utilisateur a écrit en plus du contexte complet. Si vide : comportement actuel.

### Prompt enrichi (catégorie avec texte)
```
Projet : <titre> — <summary>
Catégorie : <cat.title>
Tâches faites dans cette catégorie : [...]
Tâches restantes dans cette catégorie : [...]
Texte de l'utilisateur : "<userText>"

Transforme ce texte en 1 à 3 nouvelles tâches concrètes pour CETTE catégorie.
[mêmes règles que performTlSuggest]
Réponds UNIQUEMENT avec un tableau JSON.
```

### Prompt enrichi (projet avec texte)
```
Projet : <titre> — <summary>
État actuel (JSON) : <categoriesSummary>
Texte de l'utilisateur : "<userText>"

En tenant compte du texte ci-dessus et de l'état du projet, propose la suite la plus utile.
[mêmes règles qu'actuellement sur le format de réponse]
```

## 4. Ce qui ne change pas

- `renderTaskListBar()`, `renderCategoryBar()`, `renderProjectBar()` — inchangés
- `chatState`, `chatProjectOpen`, `chatHomeOpen` — inchangés
- `tlSelectedProjects` — inchangé, sauf qu'on le prépopule si nécessaire au moment d'ouvrir depuis le FAB
- `performTlSuggest` — déjà correct, inchangé
- L'animation et la logique de fermeture de la tasklist (tl-back-btn) — inchangés

## 5. Fichiers touchés

- `app.html` uniquement (CSS + JS + HTML inline)

## 6. Plan de tests

1. Home : tap FAB → 3 items apparaissent. Tap Liste → tasklist s'ouvre, aucun filtre pré-sélectionné.
2. Projet : tap FAB → Liste ouvre tasklist avec le projet courant pré-sélectionné. Les autres projets sont visibles et sélectionnables via les chips.
3. Projet : tap FAB → Chat IA ouvre le chat projet (non le chat home).
4. Home : tap FAB → Chat IA ouvre le chat global.
5. Tasklist ouverte : tap FAB → icône Liste disabled (aucun effet au clic).
6. Icône Calendrier : disabled dans toutes les vues, label "Bientôt" visible.
7. Tap en dehors du FAB ouvert → ferme sans rien déclencher.
8. SUGGERER catégorie sans texte : comportement actuel préservé.
9. SUGGERER catégorie avec texte → tâches générées reflètent le texte + contexte catégorie.
10. SUGGERER projet avec texte → suggestion orientée par le texte utilisateur.
11. Swipe horizontal : ne déclenche plus rien (listeners supprimés).
12. Vérifier qu'aucune régression sur les notes, l'édition inline, le treemap, l'onboarding.

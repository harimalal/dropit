# Audit du code après la série de changements visuels (2026-09-29)

Portée : `app.html` (5 985 lignes), `functions/api/*` et `functions/_lib/*` (686 lignes).
Méthode : lecture, plus des relevés mécaniques (classes CSS jamais référencées, fonctions jamais
appelées, interpolations HTML non échappées, calcul de contraste). Ce qui suit distingue ce que
j'ai **mesuré** de ce que j'ai **estimé**.

---

## A. Failles et bombes à retardement

### A1. Le plafond de 500 Ko coupera les sauvegardes définitivement — même classe que le bug keepalive
**Gravité : haute. C'est le point le plus important de cet audit.**

`functions/api/projects.js` refuse un corps de plus de `MAX_BODY_BYTES` (500 Ko) avec un **413**.
Côté client (`app.html`, `sendSaveNow`), 413 est classé non rejouable :

```js
var retryable = !status || status === 408 || status === 429 || status >= 500;
if(!retryable){ showToast("Enregistrement refusé par le serveur"); return; }
```

Donc au franchissement du seuil : un toast, puis **plus aucune sauvegarde ne passe, jamais**, sans
message de rappel ni voie de sortie. C'est exactement le scénario keepalive corrigé hier (blocage
silencieux à un seuil de taille), déplacé de 64 Kio à 500 Ko.

Ce n'est pas théorique : le compte principal mesure déjà **67 104 octets pour 8 projets** (mesuré
hier en base), soit ~8,4 Ko par projet. À ce rythme le seuil tombe vers **55-60 projets** — estimation,
pas mesure, et elle dépend surtout des notes. Rien n'élague jamais : tâches faites, notes, URL de
photos s'accumulent.

Incohérence associée : `MAX_PROJECTS = 300` alors que la limite d'octets mord vers ~60. Les deux
plafonds ne racontent pas la même histoire, et c'est celui qui n'est pas annoncé à l'utilisateur
qui frappe en premier.

**Ce que je propose :** prévenir avant le mur (avertir à 70 % du plafond), et faire du 413 un état
visible et persistant plutôt qu'un toast unique. À décider ensemble ; je n'ai rien changé.

### A2. `/api/ai` relaie le corps client presque tel quel
**Gravité : moyenne.**

Seuls `model` et `max_tokens` sont validés ; tout le reste du JSON part chez Anthropic avec la clé
partagée. Un compte authentifié peut donc passer des champs non prévus par l'app. Le plafond de
jetons et la limite de 20/min bornent le coût, donc ce n'est pas une fuite de clé — c'est une
surface plus large que nécessaire. Une liste blanche de champs (`model`, `max_tokens`, `system`,
`messages`, `temperature`) la refermerait.

Deux points secondaires dans le même fichier :
- `await anthropicRes.json()` casse si Anthropic renvoie du non-JSON (page d'erreur de passerelle) :
  l'utilisateur reçoit une 500 muette au lieu d'un message.
- La limite de débit **laisse passer** quand Supabase est injoignable (`checkRateLimit` renvoie
  `true` en `catch`). C'est documenté et défendable, mais ça veut dire que la limite ne protège pas
  pendant une panne Supabase, soit le moment où on en aurait le plus besoin.

### A3. URL de photo insérée dans du CSS sans échappement
**Gravité : faible.**

```js
photoLayer.style.backgroundImage = "url('" + p.photo.url + "')";
```

`normalizePhoto` ne vérifie que le préfixe `https://`. Une URL contenant `'` ou `)` casse la
déclaration. Ça ne permet pas d'exécuter du script (passer par `style.backgroundImage` limite au
parsage d'une seule propriété) et la valeur vient de notre propre endpoint, donc l'impact réel est
« la photo ne s'affiche pas ». À durcir par hygiène : restreindre à `images.pexels.com` dans
`normalizePhoto`, et passer par `encodeURI`.

### A4. Ce que j'ai vérifié et qui est sain
- **Aucune injection HTML.** Les 12 interpolations sans `escapeHtml` que le relevé remonte sont
  toutes des chaînes de prompt IA ou des `confirm()`, jamais du HTML. Tous les chemins HTML échappent.
- **`user_id` vient bien du JWT vérifié** dans les quatre endpoints, jamais d'un paramètre client.
- **Aucune clé API côté client.**
- **La concurrence d'écriture est correcte** : le PATCH conditionné sur `updated_at` est un
  compare-and-swap atomique côté Postgres, pas une lecture-puis-écriture.
- **Pas d'injection de regex** dans `photos.js` : les mots-clés sont filtrés à `[a-z0-9]+` avant
  de construire la `RegExp`.

---

## B. Reliques et désordre

### B1. Une fonctionnalité entière sans porte d'entrée : « Project DNA »
`performGenerateDNA()` **n'est appelée nulle part** (relevé mécanique). Elle est le seul appelant
de `generateProjectDNA()`. Conséquence : plus aucun projet ne peut obtenir de `dna`. Or le champ
survit dans quatre endroits : normalisation au chargement, affichage conditionnel, CSS
`.project-dna`, et **deux prompts IA** qui le préfèrent au résumé (`p.dna || p.summary`). Du code
et un style maintenus pour une valeur qui vaut toujours `""`, sauf sur d'anciens comptes.

### B2. Mes propres chiffres de contraste étaient faux — corrigés dans ce commit
J'avais écrit « au moins 4,8:1 » pour le glyphe de tuile et « 4,2:1 » pour le glyphe des autres
fenêtres. Le recalcul donne **4,64:1** et **4,01:1**. Les deux passent le seuil de 3:1 applicable à
un élément graphique, mais les nombres que j'avais annoncés étaient inexacts. `calc-contraste.js`
modélisait encore le dégradé supprimé : il a été réécrit pour l'état réel.

### B3. Deux teintes divergentes sous un commentaire qui affirme le contraire
`--proj-*-glass` vaut `rgba(221,102,75,…)` là où `--proj-*-solid` vaut `#D25C41` = `(210,92,65)`.
Ce sont deux teintes différentes. La barre de progression utilise `glass`, l'overlay du titre
utilise `--tile-rgb` (le solide) — et le commentaire affirmait que la barre « reprend exactement la
teinte du badge du titre ». C'est faux depuis que le badge a changé de source. Commentaire corrigé
dans ce commit ; l'unification des deux teintes reste à faire.

### B4. 88 valeurs de couleur calculées à la main
Huit teintes × onze variantes (`card`, `badge`, `solid`, `rgb`, `ink`, `strong`, `glass`, `priority`,
`btn`, `next`, `card-faint`), toutes en hexadécimal écrit à la main, dont trois séries sont de
simples dérivées arithmétiques du solide (`rgb` = ses composantes, `ink` = ×0,55, `strong` = ×0,75).
Changer une teinte demande aujourd'hui de recalculer onze valeurs à la main, sans filet : rien ne
vérifie l'alignement, et B3 montre que la dérive arrive réellement.

### B5. Classes CSS orphelines
Seize classes définies et jamais utilisées : `btn-ghost`, `add-category-link`, `add-step-row`,
`suggest-more-btn`, `reset-link`, `note-edit-area`, `note-add-hint`, `cp-ontrack`, `cp-behind`,
`cp-upcoming`, `afi-5` à `afi-9`, `ob-tagline`. Plus la fonction `moveIcon()`, jamais appelée.
Traces de la barre d'ajout de tâches supprimée et d'états de checkpoint abandonnés.

---

## C. Ce qui rend chaque modification coûteuse

Ces trois points ne sont pas des bugs. Ce sont les raisons pour lesquelles un changement d'apparence
anodin a demandé, cette semaine, plusieurs allers-retours et a cassé des choses à distance.

**C1. `render()` reconstruit tout, à chaque fois.** Un clic sur une case à cocher réécrit
l'`innerHTML` de toute l'application et rebranche 73 écouteurs. Tout état du DOM non recréé à
l'identique est perdu : le défilement est sauvegardé explicitement (`SCROLL_CONTAINER_IDS`), **le
focus et le curseur de saisie ne le sont pas**. C'est ce qui oblige chaque champ de texte à éviter
de déclencher un rendu, règle non écrite et facile à enfreindre.

**C2. 85 variables au niveau module, sans séparation.** Constantes, état persisté, état d'interface
éphémère et verrous de sauvegarde partagent une seule portée. Rien ne distingue ce qui part sur le
serveur de ce qui meurt au rechargement.

**C3. Un seul fichier de 5 985 lignes.** Le CSS, le catalogue de 83 icônes (~35 Ko généré), le
moteur de treemap, la persistance, l'authentification et sept écrans y cohabitent. Aucune frontière
n'empêche un changement de tuile de toucher la sauvegarde.

---

## D. Plan de nettoyage proposé

Ordonné par rapport valeur / risque. **Rien de tout cela n'est fait** : c'est une proposition.

### Étape 1 — Le plafond de sauvegarde (A1). Seul point vraiment urgent.
Avertir l'utilisateur à 70 % du plafond, rendre l'état « refusé » persistant et non un toast unique,
aligner `MAX_PROJECTS` et `MAX_BODY_BYTES` sur la même réalité. Sans dépendance, gain immédiat,
empêche une panne totale et silencieuse. **Chantier à part, avec cadrage** — c'est un changement de
comportement, pas du nettoyage.

### Étape 2 — Supprimer les reliques (B1, B5). Sans risque.
Retirer `performGenerateDNA`, `generateProjectDNA`, `moveIcon`, les 16 classes orphelines, et
trancher sur `dna` : soit le champ disparaît des prompts et de l'affichage, soit on lui redonne une
porte d'entrée. Aucune dépendance ; vérifiable par les tests existants.

### Étape 3 — Dériver les couleurs au lieu de les écrire (B3, B4).
Ne garder que `--proj-<teinte>-rgb` comme source unique, et calculer les dérivées au point d'usage
avec `color-mix()` — `rgb`, `ink`, `strong` et `glass` deviennent des fonctions de la teinte, pas
des constantes à resynchroniser. De 88 déclarations à 8. Au passage, B3 se résout : la barre de
progression et l'overlay partagent enfin la même teinte.
**Réserve honnête :** `color-mix()` demande Chrome 111+ / Safari 16.2+ / Firefox 113+. À vérifier
contre le parc réel avant de s'engager, et le rendu de chaque teinte est à comparer avant/après —
les valeurs à la main ne sont peut-être pas toutes de pures dérivées.

### Étape 4 — Séparer l'état (C2).
Trois objets nommés au lieu de 85 variables : `persisted` (ce qui part sur le serveur), `ui` (ce qui
meurt au rechargement), `net` (verrous et compteurs de sauvegarde). Purement mécanique, aucun
changement de comportement, mais touche tout le fichier — donc à faire **seul**, dans son propre
commit, jamais mélangé à un changement visuel.

### Étape 5 — Préserver le focus dans `render()` (C1).
Sauvegarder l'élément actif et la position du curseur comme le défilement l'est déjà. Une vingtaine
de lignes qui suppriment une règle non écrite et une classe entière de bugs.

### Étape 6 — Découper le fichier. À ne lancer que si les étapes 2 à 5 sont faites.
Sortir d'abord ce qui n'a aucune dépendance : le catalogue d'icônes (déjà généré, ~35 Ko), puis le
CSS, puis la couche de persistance. Gros chantier, bénéfice réel mais différé — je ne le
recommande pas maintenant.

### Ordre conseillé
**1 → 2 → 5 → 3 → 4**, l'étape 6 plus tard. Les étapes 1 et 2 sont indépendantes et peuvent partir
tout de suite. Les étapes 3 et 4 méritent chacune un commit isolé, car elles touchent beaucoup de
lignes pour zéro changement visible — exactement le genre de diff où une régression passe inaperçue.

---

## Limites de cet audit
- **Pas d'analyse dynamique** : les relevés de code mort sont textuels. Une fonction appelée par
  chaîne (`window[nom]`) ou depuis un attribut HTML ne serait pas vue. J'ai vérifié à la main les
  deux fonctions signalées ; les 16 classes CSS n'ont pas été vérifiées une par une dans un navigateur.
- **Pas de test de charge ni de vérification du plafond de 500 Ko en conditions réelles** : le
  raisonnement de A1 s'appuie sur la lecture du code et sur la taille mesurée hier, pas sur un compte
  réellement poussé jusqu'au seuil.
- **Supabase non interrogé** : la table de limitation de débit n'a pas été inspectée (requête non
  autorisée hier). L'efficacité réelle des limites reste non vérifiée.
- **La couverture de test ne porte que sur la sauvegarde, les requêtes photo et les icônes.** Le
  chat IA, l'agenda, l'onboarding et le profil n'ont aucun test automatisé.

# Lot visuel : tuiles, navigation, Drop Zone, fenêtre projet (2026-09-28)

Sept demandes traitées d'un bloc, sur `app.html` uniquement (aucun changement serveur).

## 1. Tuiles d'accueil

- **Anneau supprimé.** Le `conic-gradient` autour de la tuile (qui encodait la progression
  en longueur d'arc) disparaît, avec son padding et les variables `--pct` / `--ring-color`.
  Les jetons `--proj-*-ring`, devenus sans usage, sont retirés.
- **Barre de progression sous le titre**, suivie du pourcentage puis d'un petit chevron.
  La barre reprend exactement la teinte du badge/encadré de titre (`--tile-badge-glass`),
  empilée deux fois sur du blanc : même couleur, mais assez dense pour se lire sur une
  carte déjà teintée de cette couleur. Masquée sur les tuiles « tiny », qui n'ont pas la
  hauteur pour l'accueillir.
- **Icônes sans cadre de couleur et 30% plus petites**, proportionnellement à chaque taille
  de tuile (31→22, 22→15, 20→14, 14→10 px). Sur une tuile photo, l'icône n'a plus de fond :
  c'est une ombre portée (`drop-shadow`, qui épouse le glyphe — `box-shadow` suivrait la
  boîte transparente) qui la garde lisible.

## 2. Salutation

`Let's Go ! <prénom> 🔥` → `C'est parti ! <prénom> <emoji>`, l'emoji étant tiré au hasard
dans une famille d'encouragements (✨💪🚀🌟🙌👊🎯☀️👏🤩). Le tirage se fait **une fois par
session** et non à chaque `render()`, sinon la salutation clignoterait à chaque tâche cochée.

## 3. Bouton Drop it dans la barre de navigation

Le bouton flottant est supprimé. Le bouton vit maintenant au centre de la `bottom-tabbar`,
entre « Liste » et « Chat IA », en pilule pleine légèrement remontée (`translateY(-8px)`)
pour se lire comme un bouton d'action et non comme un cinquième onglet. Le badge du nombre
d'entrées de la Drop Zone est conservé.

Deux pièges traités :
- **Doublons d'id.** L'écran projet/liste/agenda embarque sa propre barre pendant que celle
  de l'accueil reste dans le DOM en dessous : le clic passe par `lastById()` (helper déjà en
  place pour les onglets), sinon seule la copie masquée recevrait les taps.
- **Compteur.** `updateDropTabBadgeCount()` met à jour **toutes** les copies du badge
  (`querySelectorAll`), pas seulement la première.
- La barre de navigation s'affiche désormais même sans projet : la masquer priverait un
  compte tout neuf du seul accès à la Drop Zone, maintenant que le bouton y vit.

## 4. En-tête Drop Zone

`👇 La Drop Zone 👇` → en-tête repris de la landing : icône 📥, titre bicolore
**DROP** (encre) / **ZONE** (violet `--dropzone-violet:#5B3FE8`), sous-titre en pilule
« Ton espace de « décharge mentale » **en 1 clic.** ».

## 5. Vue liste

Les icônes de projet sélectionnées passent du rond à bord épais à un encadré carré à coins
arrondis (`border-radius:50%` → `12px`).

## 6. Opacité des badges de couleur

- `--proj-*-badge` : voile 28% → 20% (fond plus pâle sous un texte qui reste la teinte
  pleine `--proj-*-solid` → contraste creusé).
- `--proj-*-glass` : 0.55 → 0.40.
- Contrepartie : sur une tuile photo, le texte blanc du titre ne peut plus s'appuyer sur la
  densité du voile — une `text-shadow` prend le relais.

## 7. Fenêtre projet

Agencement repris de la maquette :
- **En-tête en rangée** : icône du projet en badge carré à gauche, titre et sous-titre
  alignés à gauche à côté (remplace le bloc centré en colonne).
- **Barre de progression avec le pourcentage à droite**.
- **Bande d'étapes fusionnée avec la progression** : le trait qui relie les pastilles *est*
  la barre — rempli jusqu'à l'étape en cours, vide après. Pastille ✓ pour une étape finie,
  numérotée sinon, l'étape courante ressortant en teinte du projet. Sous chaque pastille :
  le libellé et le rang (`2/6`).
  - Les étapes sont les **catégories** quand il y en a plusieurs, sinon les **tâches** de
    l'unique catégorie — dans les deux cas la séquence réellement parcourue.
  - Indicateur seulement (des `div`, pas des boutons) : on voit où on en est, on n'y navigue
    pas — un faux bouton serait pire qu'un indicateur assumé.
  - Bande défilante horizontalement, recentrée sur l'étape en cours après chaque rendu
    (`scrollStepsToCurrent`) : sur un projet à 12 étapes, celle qui compte est sinon hors champ.

## Bug corrigé en cours de route

Sur une tuile photo, une lichette de la 3ᵉ ligne du titre dépassait sous l'encadré :
`-webkit-line-clamp` coupe au bord de la **boîte de padding**, pas du texte, et le
`padding:3px 8px` du chip laissait donc passer 3px de la ligne suivante. Corrigé en
supprimant le padding vertical et en confiant la respiration du chip à `line-height:1.55` —
la coupe tombe alors exactement sur la 2ᵉ ligne. Visible avant/après dans `crop-p2.png`.

## Vérification

Banc de test navigateur (Playwright + Chromium local), `app.html` réel avec amorçage et
`fetch` simulés — jamais dans le fichier livré :

- `mkfixture.js` : reconstruit la fixture depuis `app.html` (à relancer après chaque édition).
- `shots.js` : parcourt les 4 écrans touchés (accueil → Drop Zone → projet → liste), vérifie
  la présence/absence des éléments attendus et capture chacun. Aucune erreur JS.
- `check-drop.js` : le cas risqué des id en double — 2 barres dans le DOM sur l'écran projet,
  la fenêtre s'ouvre bien depuis la barre visible, et le compteur reste synchronisé sur les
  deux copies après ajout (3→4) puis cochage (4→3).
- Captures : `shot-accueil.png`, `shot-dropzone.png`, `shot-projet.png`, `shot-liste.png`,
  `crop-tuiles.png` (tuiles en 3x), `crop-p2.png` (le bug de troncature, après correctif).

Limite du bac à sable : `images.pexels.com` est hors de portée réseau ici, les tuiles photo
tombent donc sur leur repli couleur+icône dans les captures. Le rendu du titre blanc sur une
vraie photo reste à confirmer en production.

## Fichiers modifiés

`app.html` uniquement (jetons de couleur, CSS des tuiles / barre de navigation / Drop Zone /
vue liste / fenêtre projet, `renderBottomTabBar`, `renderHome`, `layoutHomeTreemap`,
`renderDetail`, `projectSteps`/`renderStepsStrip`/`scrollStepsToCurrent` ajoutées,
`renderDropFab` supprimée, `updateDropFabBadgeCount` → `updateDropTabBadgeCount`).

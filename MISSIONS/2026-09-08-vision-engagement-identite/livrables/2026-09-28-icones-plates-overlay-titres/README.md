# Icônes plates + overlay des titres (2026-09-29)

## Demandes successives

1. « **Overlay sur les titres** : un dégradé plutôt qu'un rectangle uniforme ; couleur concentrée derrière le texte ; bords moins capsule ; pas d'ombre lourde. **Icône** : flat icônes, pas emoji, dans un encadré rond coloré. »
2. « Icône **sans contour blanc**, fond à **40 %**, **taille proportionnelle** à la tuile. Overlay des titres : **reviens à la version précédente mais encore plus transparente**. Icônes des **autres fenêtres** : fond à **60 % de transparence**. »
3. « **Pas de dégradé sur l'overlay.** »
4. « Icônes des autres fenêtres : **fond pâle, icône colorée grasse**. »

L'état final ci-dessous est celui de la demande 4 : les trois premiers essais (dégradé, liseré blanc, rond plein) ont été remplacés.

## 1. Overlay des titres sur photo (`.tile.has-photo .tile-title`)

**Aplat uni de la teinte du projet à 22 % d'opacité**, sans aucun dégradé, dans un rectangle aux coins arrondis de 10 px : la puce d'origine, revenue, mais beaucoup plus transparente (40 % avant) et sans son reflet de verre. Ce reflet éclaircissait le fond derrière le texte blanc et faisait tomber le contraste à 1,4-2,1:1 au pire. Ombre de texte légère (1 px / 2 px à 35 %). Padding horizontal 8 px, aucun padding vertical (la respiration vient de `line-height`, sinon `-webkit-line-clamp` laisse dépasser une lichette de la ligne suivante).

Le voile sombre du **bas de la tuile** (`.tile-scrim`, dégradé de 0 à 60 % sous le titre) reste en place : c'est lui qui rend le texte lisible sur une photo claire, l'overlay à 22 % n'y suffirait pas. L'overlay lui-même ne contient aucun dégradé.

**Contraste du texte blanc** (`calc-contraste.js`, pire des 8 teintes, voile du bas compris) :

| Photo derrière | Contraste minimal |
|---|---|
| grise | 5,41:1 |
| sombre | 9,66:1 |
| entièrement blanche (cas irréaliste) | 2,16:1 |

Seul le cas d'une photo blanche pure reste sous 4,5:1.

## 2. Icônes plates

**Source** : Material Design Icons (`@mdi/js`, Apache 2.0), tracés pleins sur grille 24×24. Notice : `THIRD_PARTY_NOTICES.md` à la racine. **Catalogue** : `build-icones.js` génère le bloc `ICONS:BEGIN`…`ICONS:END` d'`app.html` : 83 icônes, 312 emojis reconnus, clés en français.

**Données** : champ `icon` (clé du catalogue) sur le projet. `emoji` reste stocké (repère pour l'IA) mais n'est plus jamais affiché comme icône. Aucune migration : un projet sans `icon` retrouve son icône par son emoji. Projet créé : l'IA renvoie la clé. Emoji sans équivalent : drapeau générique, puis l'IA choisit une icône une fois (sauvegardée), retentée si l'IA est indisponible.

### Rendu, par contexte

| Où | Rond | Glyphe |
|---|---|---|
| **Tuiles de l'accueil**, sans photo | teinte du projet à **40 %**, sans contour ni ombre ; diamètre **proportionnel** à la tuile (0,34 × le petit côté, borné 26-52 px) | teinte foncée du projet (×0,55), 58 % du rond |
| **Tuiles avec photo** | teinte à 40 %, sans contour ni voile ; diamètre 0,24 × le petit côté (20-38 px) ; posé dans le coin | **blanc**, 58 % du rond |
| **Autres fenêtres** (liste, filtres, fenêtre projet, bandeau « accompli ») | teinte à **18 %**, donc un fond pâle | teinte du projet assombrie de 25 %, **66 % du rond**, avec un contour de 1 px de la même couleur qui épaissit le tracé : icône colorée et grasse |
| Pastilles du calendrier (14 px) | aucun (un rond cacherait l'anneau de progression) | glyphe seul, de la couleur du projet |

**Pourquoi le glyphe de la tuile n'est pas blanc sans photo** : un glyphe blanc sur un rond à 40 % de la teinte, sur une carte claire, n'atteint que 1,6 à 2,3:1. Il est donc foncé. Sur photo, le voile doux sous l'icône garantit le fond sombre nécessaire au blanc.

**Contrastes** (`calc-contraste.js`, recalculé après la suppression du halo — les chiffres annoncés
avant, « 4,22:1 » et « 4,51:1 », étaient inexacts) :

| | photo grise | photo sombre | photo blanche (irréaliste) |
|---|---|---|---|
| Titre blanc sur l'overlay à 22 % | 5,41:1 | 11,13:1 | 2,16:1 |
| Glyphe blanc de l'icône, **sans halo** | 3,61:1 | 7,53:1 | 1,50:1 |

Glyphe foncé sur tuile sans photo : 4,64:1. Glyphe fort des autres fenêtres : 4,01:1.

Le halo sombre sous l'icône a été retiré à la demande. Il apportait environ 0,9 point de contraste
au glyphe blanc sur une photo claire : celui-ci passe de 4,51:1 à **3,61:1**. Une icône est un
élément graphique, dont le seuil WCAG est 3:1 (et non 4,5:1), donc le cas « photo grise » reste
conforme ; le cas d'une photo quasi blanche ne l'est pas et ne l'était déjà pas.

Jetons CSS : `--proj-*-rgb` (composantes, pour l'alpha variable), `--proj-*-ink` (×0,55), `--proj-*-strong` (×0,75).

## 3. Deux défauts trouvés en vérifiant, corrigés

- **Mots coupés dans les titres** (« Reprendr / e le sport ») : la simulation de retour à la ligne acceptait un mot trop large comme « coupé proprement ». Désormais un mot ne peut être coupé que si la police est déjà au plancher de 8 px ; sinon elle diminue jusqu'à ce que le mot tienne.
- **Icône rognée sur les tuiles larges et basses** (78 à 96 px) : nouveau gabarit `size-flat` (moins de 124 px de haut) : marges réduites, titre sur une ligne sous 108 px, barre de progression masquée sous 86 px.

## Vérification

- `test-icones.mjs` : catalogue complet, tracés sûrs, taxonomie photo couverte, variantes d'emoji.
- `verif-lot3.js` (vrai navigateur, `fetch` réel, photos de test claire et sombre) : style de chaque icône (fond, contour, ratio du glyphe, diamètre), overlay (fond, nombre de dégradés), style des icônes de la liste, des filtres et de la fenêtre projet, aucun emoji affiché, aucun contenu rogné ni mot coupé ni titre tronqué. Résultats de la dernière exécution : voir la section « Dernière exécution » ci-dessous.
- Non-régression : sauvegarde et requêtes photo.

## Limites

- **Non testé sur de vraies photos** : Pexels est injoignable depuis le bac à sable. Les photos de test (ciel clair, paysage sombre) valident les deux cas extrêmes, pas un jeu réel.
- **Photo très claire** : le rond à 40 % et le glyphe blanc y sont moins contrastés qu'avec l'ancien rond plein ; le voile doux compense en partie.
- Les emojis restent affichés ailleurs que sur les icônes de projet : salutation, écran de connexion, contexte du chat IA.
- 83 icônes : un projet très singulier tombe sur l'icône la plus proche choisie par l'IA. Étendre le catalogue = ajouter une ligne dans `build-icones.js` et relancer.
- `verif-lot2.js` (dossier précédent) teste encore `.tile-emoji` : `verif-lot3.js` le remplace pour les icônes.

## Captures
`lot3-accueil.png`, `lot3-liste.png`, `lot3-projet.png`, `lot3-calendrier.png` (données de test, photos générées).

## Dernière exécution
Sortie complète : `lot3-sortie.json`.

- Tuiles (9) : fond `rgba(teinte, 0.4)`, contour `0px / none`, glyphe 58 % du rond ; diamètres de 22 px (tuile 64×140) à 40 px (tuile 118×186) ; glyphe foncé sans photo, blanc sur photo.
- Overlay : fond `rgba(39,165,113,0.22)`, **0 dégradé**, rayon 10 px, ombre de texte `0 1px 2px` à 35 %.
- Autres fenêtres : ligne de liste, filtre et en-tête de fenêtre projet : fond à 0,18, glyphe à 66 %, remplissage et contour 1 px de la teinte ×0,75.
- 0 contenu rogné, 0 icône hors tuile, 0 titre tronqué, 0 mot coupé, 0 emoji affiché, 0 erreur JS.
- Non-régression : `save-check.js` (reprise, réseau, rechargement, file, conflit, gros compte), `photo-query-check.js` (requête, exclusion, IA indisponible) et `test-icones.mjs` verts.
- Observation sur les captures : sur les photos très claires (ciel), le voile sombre sous l'icône se voit comme une tache douce dans le coin.

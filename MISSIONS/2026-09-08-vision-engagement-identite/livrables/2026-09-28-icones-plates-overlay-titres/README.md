# Icônes plates + overlay des titres (2026-09-29)

## Demande

> **Overlay sur les titres** : un dégradé plutôt qu'un rectangle uniforme ; couleur concentrée derrière le texte ; bords moins « capsule » ; pas d'ombre lourde.
> **Icône** : utiliser des flat icônes, pas emoji, dans un encadré rond coloré.

## 1. Overlay des titres sur photo

Avant : un rectangle uniforme en capsule (voile de 40 % de la couleur du projet + reflet + ombre de texte marquée).
Après (`.tile.has-photo .tile-title`) :
- **Dégradé horizontal** de la couleur du projet : 85 % à gauche, 65 % au milieu, 0 % à droite. Le padding droit (28 px) déborde du texte, c'est là que la couleur s'estompe : elle reste concentrée derrière le texte, sans bord droit visible.
- **Bords moins capsule** : coins de 7 px à gauche seulement (10 px sur les 4 coins avant).
- **Pas d'ombre lourde** : `text-shadow` de 1 px / 2 px à 25 % (avant : 3 px à 45 %).
- **Contraste** : un second dégradé sombre, léger (42 % → 34 % → 0 %), est posé sous le premier. Sans lui, un texte blanc sur l'ambre ou l'émeraude n'atteint pas 4,5:1 sur une photo claire. Calcul (`calc-contraste.js`) sur les 8 teintes, dans le pire cas d'une photo **entièrement blanche** sous le voile sombre qui recouvre toujours le bas de la tuile, là où se pose le titre : **5,06:1 au minimum** (ambre, à mi-dégradé). Un premier calcul ne comptait pas ce voile et donnait 3,5:1 : c'est ce qui a motivé de renforcer la couche sombre plutôt que de se fier à mon estimation initiale.
- Nouveaux jetons `--proj-*-rgb` (les composantes des teintes pleines), nécessaires pour faire varier l'opacité dans un dégradé, ce qu'un code hexadécimal ne permet pas.

## 2. Icônes plates dans un rond coloré

**Choix de la source** : Material Design Icons (paquet `@mdi/js`, Apache 2.0) : tracés pleins, donc « plats », sur grille 24×24. Plutôt que de dessiner des tracés à la main. Notice de licence : `THIRD_PARTY_NOTICES.md` à la racine.

**Catalogue** (`build-icones.js` génère le bloc entre `ICONS:BEGIN` et `ICONS:END` d'`app.html`, +35 Ko) : **83 icônes** couvrant les 7 domaines de la taxonomie et la vie courante (voiture, avion, maison, haltère, mallette, palette, livre, cuisine, animaux, santé…), avec **312 emojis** reconnus. Clés en français (`voiture`, `haltere`…).

**Modèle de données** : nouveau champ `icon` (clé du catalogue) sur le projet. **`emoji` reste stocké** : il continue de servir de repère à l'IA (photo, chat) mais n'est plus jamais affiché comme icône. Aucune migration : un projet existant sans `icon` retrouve son icône par son emoji.

**Comment une icône est choisie** :
1. Projet existant : par son emoji (312 correspondances). Variantes gérées : `❤` = `❤️` ; une séquence inconnue retombe sur sa base (🏃‍♀️ → course, 🐕‍🦺 → chien).
2. Projet créé : l'IA renvoie une clé du catalogue en même temps que le titre et l'emoji.
3. Emoji sans équivalent (rare) : le drapeau générique s'affiche, et l'IA choisit une icône **une fois** à partir du titre et de l'emoji ; le choix est sauvegardé sur le projet. Si l'IA est indisponible, rien n'est posé et c'est retenté à la prochaine visite.

**Rendu** : rond plein à la **couleur du projet**, glyphe blanc (58 % du diamètre). Sur une photo, un liseré blanc de 2 px détache le rond, sans ombre. Affiché partout où l'icône d'un projet apparaît : tuiles, lignes et filtres de la vue liste, en-tête de la fenêtre projet, bandeau « accompli ». Sur les pastilles de 14 px du calendrier, un rond plein cacherait l'anneau de progression qu'elles portent : elles reçoivent le **glyphe seul**, à la couleur du projet.

## 3. Deux défauts trouvés en vérifiant, corrigés

- **Mots coupés dans les titres** (« Reprendr / e le sport ») : ma simulation de retour à la ligne comptait un mot trop large comme « coupé proprement sur 2 lignes », donc acceptable, et gardait la police. Désormais un mot ne peut être coupé que si la police est déjà au plancher de 8 px ; sinon elle diminue jusqu'à ce que le mot tienne entier.
- **Icône rognée sur les tuiles larges et basses** (78 à 96 px de haut) : la disposition complète (icône, titre sur 2 lignes, barre de progression) demande environ 120 px. Ce n'est pas né des icônes : la barre de progression ajoutée plus tôt avait déjà relevé la hauteur nécessaire. Nouveau gabarit `size-flat` (tuiles de moins de 124 px) : marges réduites, icône de 30 px, titre sur une ligne sous 108 px et sur deux au-delà, barre de progression masquée sous 86 px.

## Vérification

- `test-icones.mjs` (13 verts) : catalogue complet, tracés sûrs à insérer dans un attribut, toute la taxonomie photo couverte, variantes d'emoji.
- `verif-lot3.js` (vrai navigateur, `fetch` réel, photos de test claire et sombre) :
  - 9 tuiles : toutes avec un rond de la bonne couleur, aucun emoji affiché (tuiles, liste, calendrier), aucun résidu de `.tile-emoji` ;
  - **0** contenu rogné, **0** icône hors de la tuile, **0** mot coupé, **0** titre tronqué ;
  - emoji rare `🧿` : l'IA choisit `cible`, **sauvegardé sur le projet** ; le prompt contient le titre et l'emoji, pas le résumé ;
  - liste : 9 filtres et 19 lignes avec icône ; fenêtre projet : rond de 56 px ; calendrier : 2 glyphes ;
  - aucune erreur JS.
- Non-régression : sauvegarde (gros compte, panne puis reprise, rechargement) et requêtes photo (sujet, exclusion, mémoire des échecs) toujours verts.

## Limites

- **Non testé sur de vraies photos** : Pexels est injoignable depuis le bac à sable. Les photos de test (ciel clair, paysage sombre) valident le contraste de l'overlay dans les deux cas extrêmes, pas un jeu de vraies photos.
- **Les emojis restent affichés** ailleurs que sur les icônes de projet : salutation de l'accueil, écran de connexion, contexte envoyé au chat IA. Seule l'icône du projet change.
- L'ancien `verif-lot2.js` (dossier précédent) teste encore `.tile-emoji` : `verif-lot3.js` le remplace pour tout ce qui concerne les icônes.
- 83 icônes : un projet très singulier tombera sur l'icône « la plus proche » choisie par l'IA. Étendre le catalogue = ajouter une ligne dans `build-icones.js` et relancer.

## Captures
`lot3-accueil.png`, `lot3-liste.png`, `lot3-projet.png`, `lot3-calendrier.png` (données de test, photos générées).

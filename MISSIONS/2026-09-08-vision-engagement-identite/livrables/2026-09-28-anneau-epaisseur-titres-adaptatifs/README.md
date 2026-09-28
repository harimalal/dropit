# Anneau plus épais + titres adaptatifs (2026-09-28)

## Demande

> Fais un peu plus épais le contour de la progression autour de l'image. Pas le double
> mais de cinquante pour cent par rapport à l'épaisseur actuelle. Et fais en sorte
> également que les titres ne soient pas tronqués, par rapport à la taille de
> l'encart : adapte la taille de police d'écriture par rapport à la taille de
> l'encart, même s'il doit faire deux lignes.

## 1. Anneau de progression +50%

`.tile{padding:2.5px→3.75px;}` — l'anneau conic-gradient (statut + progression) est
posé via le padding de `.tile`, donc son épaisseur est directement ce padding.
Vérifié via un contrôle de style calculé (`padding: "3.75px"`).

## 2. Titres non tronqués

### Bug racine n°1 — flex-shrink

`.tile-body` est en `display:flex;flex-direction:column`. Sans `flex-shrink:0` sur
`.tile-title`, le rétrécissement flex par défaut écrasait la boîte du titre bien en
dessous de la hauteur de ses 2 lignes autorisées (`-webkit-line-clamp:2`), quelle que
soit la taille de police calculée. `.tile-emoji` avait déjà `flex-shrink:0` mais pas
`.tile-title`. Ajouté.

### Bug racine n°2 — largeur disponible sous-estimée

`titleFontSizeFor(w,h,title,hasPhoto)` calcule la taille de police en simulant le
retour à la ligne mot par mot (mesure Canvas réelle, pas un ratio approximatif). La
première version ne retranchait que le padding de `.tile-body` (8/14px) de la largeur
de la tuile pour obtenir la largeur dispo pour le texte — elle oubliait :
- le padding de l'anneau de progression (`.tile{padding:3.75px}`, doublement compté
  puisqu'il est des deux côtés),
- le padding propre au "chip" du titre en mode photo (`.tile.has-photo .tile-title{padding:3px 8px}`).

Résultat : la largeur dispo était surestimée d'environ 15px de chaque côté, donc la
simulation autorisait plus de texte par ligne que ce que le navigateur affiche
réellement → troncature malgré un calcul "correct" en apparence. Corrigé en
retranchant `ringPadding(3.75) + bodyPadding(8|14) + chipPadding(hasPhoto?8:0)` de
chaque côté ; `chipPadding` dépend maintenant de l'état réel de la tuile (avec/sans
photo), passé en paramètre depuis `layoutHomeTreemap()`.

### Simulation de retour à la ligne

`linesNeededAt(text, fontPx, availableWidth)` simule le découpage mot par mot
(`measureText` réel, pas une estimation par caractère) et gère aussi le cas d'un mot
seul plus large que la largeur dispo (coupé en plein milieu par
`overflow-wrap:break-word`, compté en plusieurs "morceaux" de ligne). Remplace
l'ancienne approche par ratio fixe (largeur totale / nombre de lignes × marge de
sécurité arbitraire), qui ne modélisait pas le gaspillage réel du découpage par mot.

`titleFontSizeFor` réduit la police par pas de 0.5px depuis le plafond lisible
jusqu'à ce que `linesNeededAt` confirme que le texte tient dans `maxLines`
(1 pour les tuiles "tiny", 2 sinon), avec un plancher de lisibilité à 8px.

## Limite assumée

Un titre très long (4-5 mots) sur une petite tuile étroite peut encore dépasser 2
lignes même à la taille plancher (8px) — impossible à éviter sans descendre sous le
seuil de lisibilité ou sans réserver plus de hauteur verticale (hors périmètre de
cette demande). Dans ce cas, l'ellipse `-webkit-line-clamp` s'applique proprement sur
2 lignes complètes — un filet de sécurité propre, plus aucune troncature en plein mot
ni en 1 ligne comme avant le correctif. Vérifié visuellement (`tiles-apres.png`) :
tous les titres courts/moyens s'affichent intégralement, les cas extrêmes (titres de
test délibérément trop longs) se coupent proprement en fin de 2e ligne.

## Vérification

- `check-troncature.js` : pour chaque tuile, compare la hauteur "naturelle" (clamp
  désactivé) à la hauteur réellement affichée (clamp actif) → détecte toute
  troncature réelle, indépendamment de la valeur de police calculée.
- Jeu de titres de test : mélange de titres courts ("Sport", "Budget", "Studio",
  "Anniversaire" — tiennent parfaitement, avant et après) et de titres délibérément
  très longs (4-5 mots, jusqu'à un cas pathologique à 100+ caractères sur une tuile
  "tiny") pour vérifier le comportement aux limites.
- `tiles-apres.png` : capture après correctif, à comparer visuellement.
- Vérification de syntaxe : `node -e "new Function(...)"` sur le bloc `<script>` de
  `app.html` — OK.

## Fichiers modifiés

- `app.html` : `.tile{padding}`, `.tile-title{flex-shrink}`, `titleFontSizeFor()`,
  `linesNeededAt()` (nouvelle fonction), `layoutHomeTreemap()` (passe `hasPhoto` à
  `titleFontSizeFor`).

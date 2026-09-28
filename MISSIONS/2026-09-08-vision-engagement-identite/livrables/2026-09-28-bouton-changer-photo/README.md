# Bouton "Changer la photo" (2026-09-28)

Demande : donner à l'utilisateur un moyen manuel de forcer une nouvelle photo sur un
projet (au lieu de repasser par une réinitialisation en base par Claude à chaque fois),
en garantissant que l'objet principal de la nouvelle photo reste lié à l'icône du
projet — l'icône elle-même ne change pas, elle sert d'ancre.

## Implémentation

- Nouvelle entrée "Changer la photo" dans le menu du projet (renderProjectMenu +
  binding `pmenu-photo-btn`).
- `classifyPhotoDomain(p)` : appel `/api/ai` (haiku, 150 tokens) qui reclasse le
  projet à partir de son titre ET de son icône actuelle dans un des 7 domaines de
  `PHOTO_ICON_TAXONOMY`, plus un descripteur spécifique — même règle que la création
  de projet, mais utilisable sur un projet déjà existant (créé avant la taxonomie,
  donc sans domain/photoQuery stockés).
- `regeneratePhoto(p)` : efface la photo actuelle, reclasse, puis relance la
  recherche avec la requête combinée (mots-clés du domaine + descripteur).

## Bug trouvé et corrigé pendant la vérification

Premier jet : `regeneratePhoto` appelait `ensureProjectPhoto(p, ...)` (la version
gardée, anti-doublon) après la classification. Mais `render()` relaie *toujours*
`layoutHomeTreemap()` en arrière-plan, même depuis l'écran projet (pour l'animation de
retour vers la Home) — qui relance le backfill automatique dès que `p.photo` est vide.
Comme le clic sur "Changer la photo" appelle `render()` juste après avoir vidé
`p.photo`, le backfill automatique (requête = titre brut) gagnait quasi systématiquement
la course contre la classification (plus lente, un aller-retour IA de plus), et la
requête reclassée n'était jamais utilisée : confirmé par un premier test Playwright où
la requête envoyée à `/api/photos` restait le titre brut.

Corrigé en extrayant l'appel réseau nu (`fetchProjectPhoto`, sans garde) de la version
gardée (`ensureProjectPhoto`), et en posant `photoFetchAttempted[p.id] = true`
*synchrone­ment* dans `regeneratePhoto`, avant tout `render()` — le backfill automatique
voit alors le projet comme "déjà tenté cette session" et ne part plus en course contre
la classification.

## Vérification

Playwright : projet mocké avec une ancienne photo, clic Home → détail → menu → "Changer
la photo", `/api/ai` mocké (domain "maison" + descripteur "kitchen counter marble").
Résultat : un seul appel à `/api/photos`, requête exacte
`"home interior renovation cozy kitchen counter marble"` (mots-clés du domaine +
descripteur), photo bien remplacée dans l'état du projet, aucune erreur console.

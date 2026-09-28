# Titres encadrés + qualité des photos (2026-09-28)

Suite demandée après validation du chantier photo/icône de base :

1. **Titres encadrés** : le titre de chaque tuile photo prend maintenant exactement le
   même traitement visuel (couleur + opacité) que le badge de l'icône —
   `background: linear-gradient(...sheen...), var(--tile-badge-glass)`, identique aux
   deux endroits. Vérifié via `getComputedStyle` : `titleBg === emojiBg` sur toutes les
   tuiles testées (voir `qa-check.js`).
2. **Photos "inspirantes, sans personne, tonalité cohérente"** :
   - `generateProject()` (app.html) demande maintenant à l'IA un champ `photoQuery`
     dédié en plus de title/emoji/summary : une description anglaise courte d'une scène
     ou d'un objet réel lié au thème, explicitement sans personne ni visage — pensé
     comme "l'icône choisie, mais en photo réelle". Utilisé en priorité pour la
     recherche Pexels, avec repli sur le titre si absent (vieux projets, échec IA).
   - `functions/api/photos.js` : filet de secours serveur — récupère 6 candidats
     (`per_page=6`) au lieu d'1 et écarte ceux dont le texte `alt` Pexels contient un mot
     lié à une personne (person/people/man/woman/family/portrait/face/couple/...), avant
     de prendre le premier restant. Pexels n'offre pas de filtre "sans personne" natif,
     donc c'est un filtre heuristique, pas une garantie absolue.
   - Tonalité cohérente : plutôt que le filtre `color` de Pexels (risque de réduire
     fortement le nombre de résultats et donc la pertinence), traitement CSS uniforme
     sur un calque dédié `.tile-photo` (`filter: saturate(.82) sepia(.1) contrast(1.03)`)
     — toutes les photos, quelle que soit leur source, prennent la même patine chaude et
     désaturée. Le calque est séparé du reste du contenu de la tuile (icône, titre) pour
     que le filtre ne les affecte pas.

## Vérification

`qa-fixture-app.html` + `qa-check.js` : Playwright, 4 projets mockés (2 avec photo à
tailles différentes, 1 sans photo en fallback, 1 tuile "tiny" avec photo) — confirme
`titleBg === emojiBg` sur chaque tuile avec photo, le filtre CSS appliqué au calque
photo, le fallback (sans photo) inchangé. Capture `home-title-frame.png`.

Limite de cet environnement de test : réseau sortant vers `images.pexels.com` bloqué
dans ce sandbox (déjà noté dans le livrable du 28/09 précédent) — le rendu visuel réel
des photos (tonalité, filtrage personnes) reste à confirmer en conditions réelles une
fois `PEXELS_API_KEY` posée.

# QA — tuiles Home avec photo + icône (Chantier 8 révisé, 2026-09-28)

Vérification en navigateur réel (Playwright + Chromium local) avant de pousser le code
de `functions/api/photos.js` et des modifications de `app.html`.

## Fixture

`qa-fixture-app.html` : copie de `app.html` avec, uniquement à la toute fin du script,
un bloc de test qui remplace l'appel `boot()` par un contournement de l'authentification
et un mock de `fetch` pour `/api/projects` et `/api/photos` (aucune modification du reste
du fichier). **Jamais un fichier à faire évoluer** : à regénérer à partir de `app.html` si
un futur chantier a besoin de refaire ce type de vérification.

`qa-check.js` : script Playwright qui sert la fixture via `http-server`, attend le rendu
du treemap + la résolution des fetch `/api/photos` (asynchrones), puis inspecte le DOM de
chaque tuile (classes, `background-image` calculé, position/taille du badge icône, couleur
du titre) et prend une capture d'écran.

## Scénarios couverts

- Projet avec photo trouvée (mock 200) → tuile `has-photo`, `background-image` posé,
  icône en badge absolu dans le coin (30px, 22px en taille "tiny"), titre blanc lisible
  sur fond assombri (scrim).
- Projet sans résultat Pexels (mock 404, simule aussi l'absence de clé API) → tuile reste
  dans son état actuel (couleur de projet + icône centrée), aucune régression du design
  existant.
- Tuile de taille `tiny` avec photo → badge icône réduit sans chevaucher le titre.

## Limite de cet environnement de test

Le sandbox cloud bloque les requêtes réseau sortantes vers `images.pexels.com`
(`ERR_TUNNEL_CONNECTION_FAILED` dans la console) : le `background-image` CSS est bien
posé avec la bonne URL (vérifié via `getComputedStyle`), mais l'image elle-même ne se
charge pas visuellement dans cette capture — seul le dégradé du scrim est visible. Ce
n'est pas un bug du code, seulement une restriction réseau du sandbox ; à revérifier en
conditions réelles une fois `PEXELS_API_KEY` posée sur Cloudflare Pages.

## Résultat

`home-treemap-photos.png` : capture des 5 tuiles de test (2 avec photo en taille
medium/small, 1 avec photo en taille tiny, 2 sans photo en fallback couleur+icône).

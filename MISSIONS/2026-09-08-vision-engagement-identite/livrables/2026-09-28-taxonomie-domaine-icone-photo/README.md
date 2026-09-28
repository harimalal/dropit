# Taxonomie domaine : icône et photo liées (2026-09-28)

Demande explicite : la clé Pexels était déjà posée sur Cloudflare (rien à refaire côté
config). Le vrai sujet : renforcer la sélection des photos en réutilisant la taxonomie
visuelle du cadrage initial (FAMILLE, VOYAGE, MAISON, SPORT, BUSINESS, CRÉATIVITÉ,
APPRENTISSAGE), et garantir que l'objet de la photo est lié à l'icône — pas deux choix
indépendants de l'IA qui pourraient diverger.

## Implémentation

`PHOTO_ICON_TAXONOMY` (app.html) : objet fixe à 7 domaines, chacun avec une poignée
d'icônes suggérées et des mots-clés visuels anglais (repris du cadrage initial : ex.
maison → "home interior renovation cozy"). Extensible sans toucher à l'architecture —
ajouter un domaine suffit.

`generateProject()` demande maintenant à l'IA un champ `"domain"` (une des 7 clés
exactes, ou "autre") en plus de `emoji`, et instruit explicitement que l'icône et la
photo dépendent toutes deux de ce domaine, jamais deux choix indépendants. Le champ
`"photoQuery"` n'est plus une description complète de la scène : juste le détail
spécifique à CE projet (2-4 mots), le domaine se charge du reste.

`buildPhotoQuery(result)` : combine en code (pas seulement dans le prompt, donc
vérifié à chaque fois plutôt qu'espéré) les mots-clés fixes du domaine + le descripteur
spécifique de l'IA. Si le domaine renvoyé par l'IA n'est pas valide (ancienne réponse,
IA qui n'a pas suivi la consigne), repli sur le descripteur seul, puis sur le titre du
projet (comportement du chantier précédent, inchangé).

## Vérification

Testé unitairement (Node, `buildPhotoQuery` isolée) : combinaison correcte pour un
domaine valide, repli correct pour domaine absent/invalide/inconnu.

Testé en navigateur réel (Playwright, `/api/ai` mocké pour renvoyer
`domain:"voyage", photoQuery:"tropical bali temple"`) : la requête effectivement
envoyée à `/api/photos` est `"travel vacation landscape scenic tropical bali temple"`
— mots-clés du domaine voyage + détail spécifique, confirmé par interception de l'URL
de la requête.

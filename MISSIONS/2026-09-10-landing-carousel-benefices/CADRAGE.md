# CADRAGE — Landing page carousel, bénéfices directs

Mission : `2026-09-10-landing-carousel-benefices`

## Objectif

Remplacer la landing page existante (`index.html`, à défilement vertical, une section plein écran par bénéfice — livrée par la mission `2026-09-06-landing-page`) par une page unique non scrollable, où les bénéfices se parcourent via un carrousel horizontal (flèches, swipe, points de navigation).

Demande initiale de l'utilisateur :
- Garder l'ancienne page en archive (ne pas la perdre).
- Une seule page, pas de scroll vertical, défilement carrousel.
- Chaque écran de carrousel : le bénéfice en texte, un mockup de l'app en dessous pour illustrer — en SVG (pas de vraie capture d'écran).
- Garder la même charte graphique que l'app (`app.html`).
- Les bénéfices doivent parler de ce que l'utilisateur **gagne ou ne perd pas** de précieux (temps, énergie, idées) — pas de description de fonctionnalité.

## Option retenue avant implémentation : lister les bénéfices d'abord

Plutôt que de construire directement, les bénéfices ont été rédigés et soumis à validation avant tout code — voir `decisions.md` pour les trois itérations de copywriting (liste initiale orientée perte → resserrage decharge mentale/copilote/rappel auto → reformulation directe sans tournures).

## Contrainte de fidélité

Les mockups SVG doivent illustrer des mécaniques réellement construites dans `app.html` à ce jour (Drop Zone, chat IA contextualisé par projet, génération de plan à partir d'une phrase, écran "Aujourd'hui" à rotation automatique, sauvegarde auto) — aucune fonctionnalité non livrée (ex : chantiers 5 à 9 du cadrage `2026-09-08-vision-engagement-identite`, non commencés) n'est mise en avant.

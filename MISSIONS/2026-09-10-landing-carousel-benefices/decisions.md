# DÉCISIONS — Landing page carousel, bénéfices directs
Mission : `2026-09-10-landing-carousel-benefices`

## Format de la page

| Option | Description | Statut |
|---|---|---|
| A | Garder le défilement vertical existant (une section plein écran par bénéfice, scroll classique) | Écartée — demande explicite d'une page unique non scrollable |
| B | Page fixe (100svh, `overflow:hidden`), carrousel horizontal pour parcourir les bénéfices : flèches rondes latérales, swipe tactile, points de navigation en bas | **Retenue** |

L'ancienne page est conservée telle quelle dans `archive/index-v1-scroll.html` plutôt que supprimée — remplacée en place dans `index.html`.

Décision d'ergonomie non demandée mais ajoutée : le bouton CTA ("Essayer gratuitement") et le logo restent fixes en haut/bas de l'écran sur toutes les slides du carrousel, plutôt que de n'apparaître qu'en fin de parcours — pour que la conversion reste possible à tout moment sans avoir à parcourir tous les bénéfices.

## Mockups : SVG dessiné vs capture d'écran réelle

| Option | Description | Statut |
|---|---|---|
| A | Réutiliser les vraies captures d'écran de l'app (`onboarding/*.png`, utilisées par l'ancienne page) | Écartée — demande explicite d'illustrations SVG |
| B | Mockups SVG dessinés à la main, reproduisant fidèlement la charte de l'app (couleurs, rayons, typographie) sans être des captures pixel-perfect | **Retenue** |

Chaque mockup représente un scénario concret et nommé plutôt qu'un exemple générique (ex : "Devis toiture" / "Réserver le traiteur — Mariage de Julie" / "Relancer M. Dupont — Freelance" sur le mockup "Aujourd'hui", plutôt que des libellés du type "Tâche 1/2/3") — les couleurs des badges de projet reprennent la palette réelle de `app.html` (terracotta/corail/ambre/émeraude/azur/mûre).

## Itérations du copywriting (trois passes avant validation)

### Itération 1 — première liste, orientée "perte évitée"
Proposition initiale : 5 à 6 bénéfices, chacun formulé autour d'une perte concrète évitée (idée oubliée, temps perdu à choisir, projet abandonné, réexplication à l'IA, bon conseil noyé dans le chat), avec un exemple de mockup associé à chacun. Présentée à l'utilisateur avant tout code, conformément à sa demande de voir la liste d'abord.

### Itération 2 — resserrage : décharge mentale, copilote, rappel auto
- Retour utilisateur : copie trop longue, vocabulaire à corriger — "décharge mentale" et "copilote" comme axes centraux, "objectif"/"étape" à la place de "tâche", et un bénéfice sur le "rappel auto".
- **Point de vigilance vérifié avant d'écrire** : l'app n'a aucun système de notification push (recherché dans `app.html`, aucune occurrence). Le "rappel auto" a donc été cadré non pas comme une notification, mais comme la résurfaçe automatique de la prochaine étape sur l'écran "Aujourd'hui" (mécanique réellement construite) — pour ne pas promettre une fonctionnalité qui n'existe pas.
- Ajout demandé : un bénéfice distinct sur le rôle de l'IA comme mémoire/second cerveau (au-delà du simple "elle a le contexte, tu ne réexpliques pas").

### Itération 3 — formulation directe, sans tournure
- Retour utilisateur : les titres de bénéfices utilisaient des tournures indirectes/métaphoriques ("Ta tête se vide, l'appli se souvient", "Ton copilote connaît déjà le dossier") — demande explicite de dire les choses directement.
- Les deux bénéfices proches sur la mémoire IA (rappel de détails oubliés / pas de réexplication) ont été fusionnés en un seul, décidé sans nouvelle question posée à l'utilisateur (l'utilisateur avait explicitement demandé moins de tournures hésitantes, pas plus d'allers-retours).
- Liste finale retenue (5 bénéfices, formulés comme des constats directs plutôt que des images) :
  1. Tu notes tout, rien ne se perd. *(Drop Zone)*
  2. L'IA connaît tout ton projet, tu ne répètes jamais rien. *(mémoire/contexte IA)*
  3. Tu donnes l'objectif, l'IA fait le plan. *(génération de plan à partir d'une phrase)*
  4. Chaque jour, elle te montre quoi faire — sur tous tes projets. *(écran Aujourd'hui, rappel automatique)*
  5. Tout est sauvegardé automatiquement. *(notes + progression)*

## Vérification avant livraison

Testé en navigateur réel (Playwright) sur trois tailles d'écran (iPhone SE 375×667, iPhone 14 390×844, iPhone XR 414×896) : aucun scroll vertical sur aucune des tailles, avant et après avoir parcouru tout le carrousel ; navigation par boutons flèche fonctionnelle sur les 6 slides (hero + 5 bénéfices) ; contenu de chaque slide tient dans la hauteur d'écran la plus petite testée sans être coupé.

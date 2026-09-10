mission: 2026-09-10-landing-carousel-benefices
dossier: MISSIONS/2026-09-10-landing-carousel-benefices
phase: 1
statut: LIVRÉ
derniere_sous_tache_finie: Landing page carousel livrée et poussée (commit 34d123c, index.html + archive/index-v1-scroll.html)
prochaine_sous_tache: aucune — mission terminée sauf nouvelle demande
modele_courant: sonnet
blocage: aucun
maj: 2026-09-10

# Journal (append-only, une ligne par événement)
# 2026-09-10 — Demande de refonte de la landing page : page unique non scrollable, carrousel de bénéfices (pas de fonctionnalités), mockups SVG dessinés (pas de captures réelles), même charte graphique que l'app, ancienne page conservée en archive.
# 2026-09-10 — Itération 1 du copywriting : liste initiale de bénéfices orientée "perte évitée" (idée oubliée, temps de décision perdu, projet abandonné, réexplication à l'IA, conseil noyé dans le chat) soumise à l'utilisateur avant tout code, avec un exemple de mockup par bénéfice.
# 2026-09-10 — Itération 2 : resserrage demandé (décharge mentale, copilote, vocabulaire "objectif/étape", bénéfice sur le rappel auto). Vérifié dans app.html qu'aucun système de notification push n'existe — le "rappel auto" cadré comme la résurfaçe automatique de la prochaine étape sur l'écran Aujourd'hui, pas une notification. Ajout d'un bénéfice distinct sur l'IA comme mémoire/second cerveau.
# 2026-09-10 — Itération 3 : retour sur les tournures de phrase indirectes/métaphoriques des titres de bénéfices — reformulation en constats directs. Les deux bénéfices proches sur la mémoire IA fusionnés en un seul, décidé directement sans nouvelle question à l'utilisateur.
# 2026-09-10 — Implémentation : ancienne page copiée dans archive/index-v1-scroll.html, index.html entièrement réécrit — carrousel horizontal (flèches, swipe tactile, points de navigation), 6 slides (hero + 5 bénéfices), mockups SVG dessinés à la main reprenant la palette et les rayons de app.html, CTA et logo fixes sur toutes les slides. Vérifié en navigateur réel (Playwright, 3 tailles d'écran mobile) : aucun scroll vertical, navigation fonctionnelle, contenu non coupé même sur le plus petit écran testé. Poussé sur origin/main (commit 34d123c).

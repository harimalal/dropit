# DÉCISIONS — Vision, Engagement & Identité
Mission : `2026-09-08-vision-engagement-identite`

## Choix validés au cadrage

| Chantier | Décision retenue | Raisonnement clé |
|---|---|---|
| 1. Aujourd'hui | Renommage seul de l'onglet "Calendrier", même écran, même composant | Réutilise l'existant, pas de nouvel écran à construire |
| 2. Nettoyage IA | Retrait du nom du modèle affiché + retrait du compteur "total" (garde "prioritaires") | Le nom du modèle est un artefact de debug ; le total expose une surcharge (183 tâches) sans agir dessus |
| 3. Liste du jour | Uniquement tâches datées à aujourd'hui + tâches en retard non cochées, jamais de fallback sur des tâches sans date | Corrige le bug observé (tâches admin sans date poussées sur "aujourd'hui") |
| 3bis. Tâches en retard | Affichées, marquées "En retard" (pas masquées) | Évite la perte silencieuse d'une tâche non traitée |
| 4. Drop Zone — emplacement | Icône ♻️ sur la barre de texte de capture, à côté du bouton d'envoi — pas sur l'écran d'accueil, pas de bouton flottant | Le home aurait fait passer Drop Zone pour un "onzième projet" ; un FAB entre en conflit avec la barre déjà en bas d'écran |
| 4bis. Triage Drop Zone | Liste ouverte au tap, affectation en 1 tap via une rangée d'émojis de projets | Répond à l'exigence "retrouver et affecter en un clic" |
| 5. Format du badge de vélocité | Flèche en haut à droite (tendance) + barre de progression existante teintée (santé) | Réutilise un élément déjà présent au lieu d'ajouter un second badge sur une grille déjà dense |
| 5bis. Définition d'"activité" | Cocher, ajouter OU modifier une tâche (pas seulement cocher) | Ne pénalise pas une réorganisation qui n'est pas une case cochée |
| 5ter. Pause | Automatique (14 jours sans activité) ET manuelle (déclenchable par l'utilisateur à tout moment) | Une pause légitime (attente d'un tiers) ne doit pas s'afficher comme un échec |
| 5quater. Tâches en retard (calendrier) | Voir 3bis, ligne partagée avec le chantier 3 | — |
| 8. Ordre de révélation mosaïque | Mosaïque de tuiles (pas un flou continu), révélation dans le désordre, indexée sur le nombre de tâches (pas le %) | Le désordre entretient la curiosité jusqu'à la fin ; indexer sur le % recréerait le problème déjà identifié au chantier 5 |
| 8bis. Source de l'image | Générée ou piochée par IA selon le thème du projet — pas de photo personnelle en MVP | La photo perso ajoute un besoin de consentement/stockage de données sensibles hors scope MVP ; garder la surprise nécessite un contenu jamais montré à l'utilisateur avant révélation |

## Débats structurants (résumé du raisonnement)

### Décision — Emplacement de Drop Zone
- Position initiale : carte fixe dans l'écran Priorités.
- Révisée par l'utilisateur : doit être trouvable depuis la capture elle-même.
- Options comparées : tuile d'accueil / icône flottante / icône sur la barre de texte.
- CONVERGENCE : icône sur la barre de texte — c'est le point exact où le besoin se manifeste (une tâche sans projet choisi), pas un emplacement de consultation générique. Écarté : accueil (confusion avec un projet), flottant (conflit avec la barre existante).

### Décision — Calcul du statut de vélocité
- Option A (retenue) : règles de seuils simples sur les jours depuis la dernière activité.
- Option B (écartée pour le MVP) : score composite vitesse+régularité pondéré — plus fin mais nécessite une "cible" par projet qui n'existe pas dans le modèle actuel de données. À reconsidérer en v2 si le modèle simple s'avère trop grossier à l'usage.
- Option C (rejetée) : estimation qualitative par le LLM — même défaut de confiance que le bug de comptage observé dans l'audit (chat qui annonce 9 puis se corrige à 10 projets) ; un statut de confiance doit être déterministe et auditable.

### Décision — Le "signature move" et la référence produit
- Question posée par l'utilisateur : qui est la référence absolue en UX produit avec un geste simple qui fédère les utilisateurs ?
- Réponses apportées : *Hooked* (Nir Eyal, Hook Model), Octalysis (Yu-kai Chou), le cas d'école du pull-to-refresh (Loren Brichter).
- CONVERGENCE : le diagnostic Hook Model appliqué à DROPIT montre que Trigger/Action/Investissement existent déjà mais que la Récompense variable est absente — c'est la case vide qui empêche le bouton "C'est fait" de devenir une vraie habitude. Le chantier 6 (signature move) en découle directement.

### Décision — Le pivot "identité" (qui n'en est pas un)
- Proposition initiale de l'utilisateur : faire de l'app un outil de transformation identitaire (mood board, portrait qui évolue).
- Risque signalé : la recherche sur le mental contrasting (WOOP, Oettingen) montre que la pure visualisation positive sans lien à l'action réduit la motivation.
- CONVERGENCE : ne pas pivoter le produit — infuser le principe (chaque action = un vote pour une identité, *Atomic Habits*) dans les patterns déjà spécifiés (bouton de complétion, badges), plutôt que construire un nouvel écran "vision". Scope MVP réduit à un champ "intitulé d'identité" par projet (chantier 7).

### Décision — Mécanique de révélation visuelle (flou vs mosaïque)
- Proposition 1 (utilisateur) : icône colorée → noir et blanc → recolorisation avec la progression.
- Proposition 2 (utilisateur, retenue) : image floutée qui se précise avec la progression — reformulée ensuite en mosaïque de tuiles qui se révèlent dans le désordre.
- CONVERGENCE : la mosaïque l'emporte sur le flou continu car elle porte une métaphore de construction/puzzle plus cohérente avec le narratif identitaire, et elle est plus simple à indexer discrètement sur le nombre de tâches (une tuile = une tâche).
- Point bloquant identifié : Claude ne génère pas d'image nativement (modèle de texte) — nécessite un service tiers (DALL-E/GPT-image, Imagen, Stable Diffusion, Flux) côté backend. Confirmé à l'utilisateur, noté comme dépendance du chantier 8.

## Décisions d'exécution (non structurantes)

- 2026-09-08 — Repo cible identifié et attaché à la session : `harimalal/dropit` (le repo initialement fourni, `harimalal/yoitubesum`, est un projet sans rapport — résumeur de vidéos YouTube).
- 2026-09-08 — Convention de mission existante (`MISSIONS/<date>-<slug>/{CADRAGE,decisions,etat}.md`) découverte et réutilisée telle quelle pour cette mission plutôt que d'inventer un nouveau format de log.

## Questions restées ouvertes (non tranchées)

- Chantier 8 : une fois une mosaïque révélée à 100%, l'image reste-t-elle l'icône permanente du projet ou rejoint-elle une "galerie des identités accomplies" séparée ?
- Chantier 9 (collaboration) : non détaillé au-delà du MVP réduit proposé (invitation par lien, commentaires, pièce jointe) — à recadrer en mission dédiée le moment venu.

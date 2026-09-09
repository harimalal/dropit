mission: 2026-09-08-vision-engagement-identite
dossier: MISSIONS/2026-09-08-vision-engagement-identite
phase: 1
statut: IMPLÉMENTATION EN COURS — chantiers 1 et 2 livrés
derniere_sous_tache_finie: Chantiers 1 et 2 implémentés et poussés (commit cea3df3, app.html)
prochaine_sous_tache: Chantier 3 (logique de la liste "Aujourd'hui" : dates réelles + "En retard") puis 4 et 5
modele_courant: sonnet
blocage: Chantier 8 (mosaïque) bloqué tant qu'un service de génération d'image tiers n'est pas choisi et chiffré (Claude ne génère pas d'image nativement)
maj: 2026-09-08

# Journal (append-only, une ligne par événement)
# 2026-09-08 — Audit 360° du MVP mené à partir de 6 captures d'écran (accueil, détail projet, priorités, chat IA, calendrier, catégorie)
# 2026-09-08 — Bug de confiance identifié : le chat IA (claude-haiku-4-5) annonce 9 projets puis se corrige en direct à 10 — diagnostic : ne jamais faire compter/agréger des données par le LLM
# 2026-09-08 — Cadrage des chantiers 1 à 5 (Aujourd'hui, nettoyage affichage IA, logique liste du jour, Drop Zone, statuts de vélocité) avec options tranchées
# 2026-09-08 — Recherche de référence produit : Hook Model (Nir Eyal), Octalysis (Yu-kai Chou), pull-to-refresh comme cas d'école de "signature move"
# 2026-09-08 — Diagnostic Hook Model appliqué à DROPIT : Trigger/Action/Investissement présents, Récompense variable absente → chantier 6
# 2026-09-08 — Discussion du pivot "identité" (Atomic Habits, James Clear) ; garde-fou WOOP (Oettingen) posé contre le mood board contemplatif ; scope réduit à un champ identité par projet → chantier 7
# 2026-09-08 — Conception de la mécanique de révélation visuelle : flou continu écarté au profit d'une mosaïque de tuiles révélées dans le désordre, indexée sur le nombre de tâches → chantier 8
# 2026-09-08 — Confirmation : Claude ne génère pas d'image nativement, chantier 8 dépend d'un service tiers (DALL-E/GPT-image, Imagen, Stable Diffusion ou Flux)
# 2026-09-08 — Chantier 9 (collaboration : invite, commentaires, pièce jointe) noté pour mémoire, hors scope proche
# 2026-09-08 — Repo cible identifié (harimalal/dropit) et attaché à la session ; le repo fourni initialement (yoitubesum) n'a aucun rapport avec DROPIT
# 2026-09-08 — Convention de mission existante repérée dans le repo (MISSIONS/<date>-<slug>/CADRAGE+decisions+etat) et réutilisée pour cette mission
# 2026-09-08 — CADRAGE.md, decisions.md, etat.md rédigés ; captures d'écran source archivées dans screenshots/
# 2026-09-08 — decisions.md étoffé : chaque chantier détaille désormais options écartées + raisons, et les itérations où une décision a été révisée en cours de route (emplacement Drop Zone, mécanique de révélation visuelle, portée du chantier identité)
# 2026-09-09 — Question hors-mission posée : faisabilité d'un portage Android/App Store (PWA/TWA vs Capacitor vs réécriture native) ; réponse donnée, aucune décision actée, aucun code touché à ce stade
# 2026-09-09 — Préparation PWA amorcée (manifest.json, sw.js, icônes) puis mise en pause à la demande explicite de l'utilisateur, qui a recentré sur les chantiers déjà cadrés — fichiers PWA laissés non commités dans l'arbre de travail, à reprendre sur confirmation
# 2026-09-09 — Chantiers 1 et 2 implémentés dans app.html : onglet/titre "Calendrier" -> "Aujourd'hui" ; retrait de "claude-haiku-4-5" dans les deux fenêtres de chat ; retrait du "· N total" dans Priorités. Vérification syntaxique JS effectuée avant commit. Poussé sur origin/main (commit cea3df3)

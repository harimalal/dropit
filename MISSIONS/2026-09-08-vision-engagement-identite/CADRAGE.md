# CADRAGE — Vision, Engagement & Identité
Mission : `2026-09-08-vision-engagement-identite`
Date : 2026-09-08 · Statut : CADRAGE VALIDÉ (issu d'une session de brainstorm structurée avec l'utilisateur) — IMPLÉMENTATION NON DÉMARRÉE

Contexte : cette mission fait suite à un audit 360° du MVP mené hors-repo à partir de captures d'écran réelles, puis approfondi en brainstorm produit. Elle couvre à la fois des correctifs MVP concrets et une réflexion de fond sur ce qui fait revenir un utilisateur et ce qui donne un sens durable à l'usage de l'app.

Captures d'écran source de l'audit (conservées dans `screenshots/` de ce dossier de mission) :
- `01-accueil.jpg` — écran d'accueil "Let's Go ! Rado", grille de projets avec %
- `02-detail-projet-voiture.jpg` — détail du projet "Vendre sa voiture propre" (prochaine action, priorités, catégories, notes)
- `03-priorites.jpg` — vue transverse "Priorités" (29 prioritaires · 183 total)
- `04-chat-ia-vue-ensemble.jpg` — chat IA, illustre le bug de comptage corrigé en direct par le modèle (`claude-haiku-4-5` affiché)
- `05-calendrier.jpg` — vue Calendrier, illustre le fourre-tout de tâches sans date poussées sur "aujourd'hui"
- `06-categorie-nettoyage-exterieur.jpg` — liste de tâches filtrée par catégorie dans un projet

---

## 1. Reformulation de l'objectif

Faire passer DROPIT d'un gestionnaire de projets/tâches avec IA à un outil qui (a) élimine les frictions et bugs de confiance identifiés dans l'audit, et (b) exploite consciemment les leviers d'engagement et de transformation identitaire qui manquent aujourd'hui — sans pour autant pivoter le produit : il s'agit d'infuser cet esprit dans les patterns existants (bouton de complétion, badges de projet, écran d'accueil), pas de construire de nouveaux écrans séparés.

## 2. Définition de "fini" pour cette mission

- Chaque chantier ci-dessous a un comportement attendu écrit noir sur blanc, des options tranchées (pas de "à débattre" en suspens sur les chantiers 1 à 5), et un impact technique identifié.
- Aucune ligne de code n'est requise pour clore cette mission — c'est un cadrage, l'implémentation est une mission séparée à ouvrir ensuite (probablement une par chantier ou groupée 1-5 puis 6-9).

## 3. Hypothèses prises

- H1 : Les chantiers 1 à 5 sont un lot MVP cohérent, livrable ensemble, sans dépendance à un service externe.
- H2 : Le chantier 8 (mosaïque) dépend d'une intégration de génération d'image tierce (Claude ne génère pas d'image nativement — voir §6) ; il ne peut pas être livré dans le même lot que 1-5.
- H3 : Le chantier 9 (collaboration) est noté pour mémoire mais hors scope de toute implémentation proche — ampleur largement supérieure à tout le reste cumulé.
- H4 : Le projet système "Drop Zone" n'est pas un projet au sens propre (pas d'entrée dans la grille d'accueil comme "onzième projet") — vérifier au moment de l'implémentation.

## 4. Benchmark — références produit et cadres théoriques mobilisés

| Référence | Ce qu'on en tire |
|---|---|
| *Hooked* — Nir Eyal (Hook Model : Trigger → Action → Récompense variable → Investissement) | Diagnostic : DROPIT a l'Action et l'Investissement, pas de Récompense variable — c'est le trou qui explique l'absence d'habitude formée autour du bouton "C'est fait". |
| Octalysis — Yu-kai Chou (8 core drives de gamification) | Grille de lecture pour les statuts de vélocité (Core Drive 2, Accomplissement), la mosaïque (Core Drive 7, Curiosité/Imprévisibilité), et la collaboration future (Core Drive 5, Influence sociale). |
| *Atomic Habits* — James Clear (habitudes basées sur l'identité) | "Chaque action est un vote pour le type de personne qu'on veut devenir" — fondement du chantier 7 (intitulé d'identité par projet, langage de confirmation). |
| WOOP / mental contrasting — Gabriele Oettingen | Garde-fou : la pure visualisation positive (mood board) sans lien à l'action réduit la motivation. Tout élément "vision" doit rester câblé à une action concrète du jour, jamais contemplatif seul. |
| Pull-to-refresh (Loren Brichter, Tweetie) | Cas d'école d'un geste unique et simple devenu signature ; le bouton "C'est fait" est le candidat naturel chez DROPIT. |
| Finch (app de habit-tracking, compagnon évolutif) | Précédent direct pour une représentation visuelle qui grandit avec l'accomplissement — inspire le chantier 8. |
| Apple Fitness (fermeture des anneaux) | Preuve qu'une métaphore visuelle très simple peut porter un narratif identitaire fort sur la durée. |
| Duolingo (streak + streak freeze) | Modèle de perte/récompense quotidienne ; le "streak freeze" est le garde-fou anti-anxiété à reprendre si un mécanisme de perte est introduit. |

## 5. Cartographie des chantiers

| # | Chantier | Statut de décision | Dépendance |
|---|---|---|---|
| 1 | "Aujourd'hui" remplace "Calendrier" (même écran) | Validé | — |
| 2 | Retrait affichage nom du modèle IA dans le chat | Validé | — |
| 3 | Logique de la liste du jour (dates réelles + "En retard", plus de fallback) | Validé | Nécessite un champ date par tâche |
| 4 | Capture rapide + Drop Zone (icône sur barre de texte, pas home/FAB) | Validé | Nécessite triage 1-clic |
| 5 | Statuts de vélocité (flèche + barre teintée, pause auto + manuelle) | Validé | Nécessite historisation des dates de complétion |
| 6 | Signature move — récompense variable sur "C'est fait" | Option retenue, à détailler en implémentation | Aucune (texte + micro-animation) |
| 7 | Identité — intitulé d'identité par projet + langage dynamique | Option retenue, scope minimal MVP défini | Un champ texte par projet |
| 8 | Révélation Mosaïque (image IA floutée/pixelisée dévoilée par tâche) | Concept validé, mécanique détaillée | Service de génération d'image tiers (voir §6) |
| 9 | Collaboration (invite, commentaires, pièce jointe) | Noté pour mémoire, hors scope proche | Auth multi-utilisateur par projet |

## 6. Détail des chantiers

### Chantier 1 — "Aujourd'hui" (ex-Calendrier)
Renommage du libellé d'onglet uniquement. Même composant, même écran (mini-calendrier + liste en dessous inchangés dans leur position).

### Chantier 2 — Nettoyage affichage IA
Retirer `claude-haiku-4-5` de l'en-tête du chat. Retirer le compteur "X total" dans Priorités, garder "N prioritaires".

### Chantier 3 — Logique de la liste du jour
La liste sous le mini-calendrier n'affiche que : les tâches datées explicitement à aujourd'hui, et les tâches datées dans le passé et non cochées (marquées "En retard"). Plus aucun fallback qui y pousserait des tâches sans date.

### Chantier 4 — Drop Zone
Icône ♻️ sur la barre de texte de capture (à côté du bouton d'envoi), pas sur l'écran d'accueil ni en bouton flottant — évite la confusion avec un "onzième projet" et place le geste exactement au moment où le besoin apparaît. Badge de comptage sur l'icône. Tap → mini-liste des tâches non triées → tap sur une tâche → rangée d'émojis de projets existants → tap = affectation immédiate.

### Chantier 5 — Statuts de vélocité
Remplace le badge "Actif" texte par un système déterministe (jamais estimé par un LLM) :
- 🟢 Vert : activité (cocher/ajouter/modifier une tâche) dans les 3 derniers jours
- 🟠 Orange : activité il y a 4 à 7 jours
- 🔴 Rouge : activité il y a 8 à 13 jours
- ⏸️ Pause : 14+ jours sans activité (auto) OU pause manuelle activée par l'utilisateur à tout moment
Affichage : flèche en haut à droite de la tuile (tendance) + barre de progression existante teintée de la couleur du statut (pas de second badge ajouté). Le badge Drop Zone (chantier 4) est exclu de ce calcul.

### Chantier 6 — Signature move (récompense variable)
Le Hook Model identifie l'absence de "récompense variable" comme le trou qui empêche le bouton "C'est fait" de créer une vraie habitude. Deux leviers à bas coût :
- Le texte de confirmation varie et se pilote par l'identité du projet (voir chantier 7) plutôt qu'un message fixe.
- Une micro-animation (particule/transfert visuel) au moment du tap, non identique à chaque fois.

### Chantier 7 — Identité (scope MVP minimal)
Ne pas pivoter le produit. Ajout minimal pour ce sprint : un champ "intitulé d'identité" optionnel à la création d'un projet (ex. "Rado qui va au bout des choses"), utilisé pour personnaliser le texte de confirmation du chantier 6. Le "portrait composite" évoqué en discussion reste une piste v2, pas une tâche de ce sprint.

### Chantier 8 — Révélation Mosaïque
- L'icône de chaque projet est une image (générée ou piochée par IA selon le thème du projet, gratuite au départ — pas de photo personnelle en MVP), affichée en mosaïque de tuiles majoritairement opaques.
- Chaque tâche cochée révèle un sous-ensemble de tuiles, **dans le désordre** (ordre aléatoire mais fixe, dérivé de l'ID du projet — pas rejoué différemment à chaque vue).
- Le nombre de tuiles révélées est indexé sur le nombre de tâches du projet, pas sur le %.
- Le nom du projet reste toujours lisible par-dessus l'image, quel que soit l'état de révélation.
- **Blocage technique confirmé** : Claude (le modèle utilisé pour le chat de l'app) ne génère pas d'image nativement. Il faut intégrer un service tiers de génération d'image (DALL-E/GPT-image, Imagen, Stable Diffusion ou Flux) côté backend — nouvelle dépendance externe, à chiffrer avant d'attaquer ce chantier.
- Question ouverte non tranchée : une fois révélée à 100%, l'image reste-t-elle l'icône permanente du projet, ou rejoint-elle une "galerie des identités accomplies" séparée ?

### Chantier 9 — Collaboration (pour mémoire)
Invitation par lien/code simple (pas de permissions fines au départ) + fil de commentaires par tâche/projet (pas de vraie messagerie temps réel) + pièce jointe simple sur une tâche/note (réutilise le pattern "Notes" existant). Reporté après les chantiers 1 à 8.

## 7. Lignes rouges

- Ne jamais faire calculer un comptage, un statut ou une agrégation de données par le LLM (chat IA) — toujours un calcul déterministe côté application. C'est la cause directe du bug de comptage observé pendant l'audit (chat annonçant 9 puis se corrigeant à 10 projets).
- Ne jamais afficher le nom technique du modèle IA à l'utilisateur.
- Toute mécanique de perte/streak doit avoir une soupape (type "streak freeze") dès sa conception, pas ajoutée après coup suite à un retour négatif.
- Le mood board / la représentation identitaire ne doit jamais exister comme pur élément contemplatif déconnecté d'une action du jour (risque documenté par la recherche WOOP).
- La Drop Zone ne doit jamais apparaître comme un projet sélectionnable parmi les vrais projets.

## 8. Plan de phases

| Phase | Contenu | Dépendance |
|---|---|---|
| 0 | Cadrage (ce document) | Fait |
| 1 | Implémentation chantiers 1 à 5 (MVP correctifs) | Aucune |
| 2 | Implémentation chantier 6 + 7 (signature move + identité minimale) | Aucune, peut suivre phase 1 |
| 3 | Chiffrage + choix du service d'image, implémentation chantier 8 | Décision service tiers |
| 4 | Chantier 9 (collaboration) | Après validation des phases précédentes en usage réel |

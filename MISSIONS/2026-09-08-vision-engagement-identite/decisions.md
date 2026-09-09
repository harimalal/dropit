# DÉCISIONS — Vision, Engagement & Identité
Mission : `2026-09-08-vision-engagement-identite`

Ce document trace, pour chaque chantier : les options qui ont été sur la table, celle retenue, celles écartées et pourquoi, et — quand c'est arrivé — les cas où une décision a été révisée en cours de route (itération). Rien n'est résumé à la seule décision finale : l'historique du raisonnement est gardé intact.

---

## Chantier 1 — "Aujourd'hui" (ex-Calendrier)

| Option | Description | Statut |
|---|---|---|
| A | Renommage seul de l'onglet, même écran, même composant | **Retenue** |
| B | Renommage + réordonner (liste des tâches remontée au-dessus du mini-calendrier) | Écartée pour ce sprint — gardée en tête si la vue mensuelle s'avère peu consultée à l'usage |

Aucune itération : décision stable dès la première proposition.

## Chantier 2 — Nettoyage affichage IA

- Retrait du nom du modèle (`claude-haiku-4-5`) affiché dans l'en-tête du chat : **retenu**, aucune alternative envisagée (correction pure d'un artefact de debug).
- Retrait du compteur "X total" dans Priorités, conservation de "N prioritaires" : **retenu**, aucune alternative envisagée.
- Point signalé mais non traité dans ce chantier : masquer le total ne résout pas la surcharge de tâches sous-jacente (183 tâches) — ce n'est pas un rejet d'option, juste une limite explicitement assumée de ce chantier (la vraie réponse à la surcharge est portée par les chantiers 4 et 5).

## Chantier 3 — Logique de la liste "Aujourd'hui"

| Option | Description | Statut |
|---|---|---|
| A | Liste vide par défaut, uniquement tâches datées à aujourd'hui | **Retenue** (base) |
| B | Garder un fallback affichant des tâches prioritaires non datées si la liste du jour est vide | **Écartée** — c'est exactement le comportement à l'origine du bug observé (tâches admin sans date poussées sur "aujourd'hui") |

### Sous-décision — tâches en retard
| Option | Description | Statut |
|---|---|---|
| A | Afficher les tâches datées dans le passé et non cochées, marquées "En retard" | **Retenue** |
| B | Ne rien afficher, strictement les tâches du jour | Écartée — risque de perte silencieuse d'une tâche non traitée, sans aucun moyen de la retrouver depuis cet écran |

### Itération — granularité de la date (décision révisée à l'implémentation)
- **Constat fait en ouvrant le code** : le modèle de données n'a **aucun champ date par tâche** (`makeItem` = id/title/done/createdAt/notes uniquement). Seuls les projets ont une échéance (`p.dueDate`, dérivée d'un `dueBucket` relatif comme "1 semaine"/"1 mois"). Le cadrage initial supposait une date par tâche — non vérifié avant implémentation.
- Options posées à l'utilisateur :

| Option | Description | Statut |
|---|---|---|
| A | Version complète : ajouter un champ date par tâche + une icône par ligne pour la fixer manuellement | Écartée — nécessite une nouvelle interaction UI (sélecteur de date par tâche) et laisserait l'écran vide tant que l'utilisateur n'a daté aucune tâche |
| B | Version allégée : réutiliser l'échéance de projet déjà existante (`p.dueDate`), granularité projet et non tâche | **Retenue** — "fais simple, à la maille du projet, pas de date sur chaque tâche" |

- Comportement finalement implémenté (`buildCalendarTasks`) : un projet sans échéance ne s'affiche jamais dans "Aujourd'hui" (fin du fourre-tout) ; sur le jour "aujourd'hui" précisément, les projets en échéance dépassée et non clos remontent aussi, badge "En retard" ; sur un autre jour du calendrier, uniquement les échéances tombant exactement ce jour-là (pas d'"en retard" hors de la vue du jour même).
- Bug latent corrigé au passage (hors périmètre du chantier, découvert en touchant la fonction) : `tasks.map(renderTlRow)` passait l'index du tableau comme second paramètre (`hideProjectEmoji`) à cause de la signature d'`Array.map` — masquait l'émoji projet sur toutes les lignes sauf la première de la liste du jour.

### Itération 2 — régression signalée par l'utilisateur après mise en prod (décision révisée)
- **Symptôme remonté** : "Aujourd'hui" n'affiche plus rien la plupart du temps — gater sur la correspondance exacte avec l'échéance du projet revient à n'afficher quelque chose qu'un seul jour dans toute la vie du projet (le jour J de l'échéance), puisqu'une échéance est un point unique, pas une fenêtre quotidienne.
- **Intention réelle clarifiée par l'utilisateur** : ne pas attendre le dernier moment de l'échéance pour agir ; afficher chaque jour un mélange de tâches issues du top 3 de priorité de plusieurs projets, en donnant la priorité aux échéances les plus courtes ; faire avancer chaque projet un peu chaque semaine plutôt que d'épuiser un seul projet avant de passer au suivant.

| Option | Description | Statut |
|---|---|---|
| A | Garder le filtre par correspondance exacte à l'échéance (comportement chantier 3 initial) | **Écartée** — confirmée régressive à l'usage |
| B | File vivante sur les projets actifs, triée par échéance la plus courte, rotation quotidienne du point de départ, répartition tour par tour (round-robin) dans le top 3 de chaque projet, échéances dépassées toujours en tête | **Retenue** |

- Comportement final : la file vivante ne s'applique qu'à la vue "aujourd'hui" précisément (`calSelectedDate === todayDateStr()`) ; la navigation vers un autre jour précis du calendrier garde le filtre par échéance exacte du chantier 3 initial (pas de rotation, pas de fourre-tout sur un jour qu'on parcourt volontairement).
- Vérifié par une simulation isolée (mock data en dehors du navigateur) avant de pousser : jamais vide tant qu'il reste une tâche active, échéance dépassée toujours en tête, rotation confirmée sur 7 jours simulés, plusieurs projets distincts représentés le même jour.
- **Limite assumée, non résolue** : le "mélange tâche facile / tâche compliquée à morceler" demandé n'est pas implémenté au sens strict — le modèle de données n'a aucun champ d'effort ou de complexité par tâche. Le mélange obtenu vient du brassage entre plusieurs projets (round-robin), pas d'un vrai critère de difficulté. Ajouter un tel champ serait un chantier de données à part, non fait ici.

## Chantier 4 — Capture rapide + Drop Zone

### Itération 1 — emplacement de Drop Zone (décision révisée)
- **Proposition initiale (retenue à ce moment-là)** : carte fixe stylisée grise, icône ♻️, dans l'écran Priorités.
- **Révision demandée par l'utilisateur** : refusée ("non") — doit être trouvable directement depuis l'écran où la tâche est capturée, pas seulement depuis un écran de triage séparé.
- Options comparées à la révision :

| Option | Description | Statut |
|---|---|---|
| A | Tuile fixe dans la grille d'accueil | Écartée — se ferait passer pour un "onzième projet" au milieu des vrais projets |
| B | Icône flottante (FAB) sur tous les écrans | Écartée — entre en conflit visuel avec la barre de composition déjà présente en bas d'écran sur tous les écrans |
| C | Icône sur la barre de texte de capture, à côté du bouton d'envoi | Retenue un temps, **remplacée à l'itération 2 ci-dessous** |

### Décision — mécanisme de triage (première version)
| Option | Description | Statut |
|---|---|---|
| A | Glisser-déposer / bouton "déplacer vers..." depuis un écran dédié | Écartée pour le MVP — plus lourd à construire qu'une liste simple |
| B | Drop Zone en tête de la vue Priorités, tri effectué depuis là | Proposée comme recommandation initiale (avant l'itération 1 ci-dessus qui a changé l'emplacement de l'icône d'accès, pas la logique de triage elle-même) |
| C | L'IA propose un projet probable pour chaque tâche du Parking | Écartée — chantier IA à part entière, hors scope de ce sprint |
| — | Icône (chantier ci-dessus) → mini-liste des tâches non triées → tap sur une tâche → rangée d'émojis de projets existants → tap = affectation en 1 clic | Mécanisme conservé, **repris tel quel dans l'itération 2** |

### Itération 2 — bouton flottant "DROP●IT" (décision finale)
- **Remise en cause par l'utilisateur** : l'icône à côté du bouton d'envoi restait trop discrète pour ce qui devait être le geste signature de l'app (cf. discussion Hook Model/pull-to-refresh). Proposition de départir vers une barre "Drop it" pleine largeur, éventuellement à la place de la barre de navigation.
- **Option écartée en cours de route** : remplacer ou masquer la barre de navigation (Accueil/Liste/Chat IA/Aujourd'hui) derrière un geste — rejetée, la navigation principale doit rester accessible en un tap selon les standards d'ergonomie mobile (Apple HIG/Material Design), et cette barre a déjà fait l'objet d'une mission de refonte dédiée (`2026-09-05-design-refonte`).
- **Question de fond soulevée** : comment différencier "nouveau projet" / "tâche pour un projet" / "Drop Zone" dans un champ de saisie unique ? Réponse retenue : c'est le contexte d'écran qui décide (comme c'était déjà le cas avant), jamais le texte lui-même ni une classification IA — la création de projet reste exclusive à la barre d'accueil, jamais un résultat possible depuis Drop It.
- Options de forme comparées pour l'élément lui-même :

| Option | Description | Statut |
|---|---|---|
| Barre "Drop it" pleine largeur à la place de la nav | Prend la place de la navigation principale | **Écartée** — coût de navigation trop élevé pour le gain sur un seul geste |
| Bouton avec glissement (gauche = Projet, droite = Drop Zone) | Geste directionnel, champ de texte révélé après le glissement | Écartée pour cette version — un geste sur un bouton statique n'est pas devinable sans indice visuel (référence : swipe Gmail/Mail iOS qui révèle icône+couleur sous le doigt) ; ajoute aussi la question de quel projet précisément parmi plusieurs | Gardée en piste v2 si un indice visuel façon Mail est ajouté |
| **Bouton flottant "DROP●IT"** (texte "DROP" + point + "IT", fond blanc, point coloré accent) | Toujours visible, au-dessus de la barre de nav, pattern FAB éprouvé (Gmail/Notion/Todoist) | **Retenue** |

- **Comment on tape le texte** : tap sur le bouton flottant → fenêtre remontant du bas (même style que la fenêtre de chat existante), champ de texte auto-focalisé (clavier ouvert immédiatement), rangée d'émojis de projets pour assigner directement, sinon Drop Zone par défaut.
- **Accès au tri de la Drop Zone** : pas un deuxième point d'accès — la même fenêtre bascule en mode tri via un lien visible "N notes à trier" en haut (titre "Drop Zone" mis en évidence, en grand, à la demande de l'utilisateur). Écarté : long-press ou geste caché pour accéder au tri, même problème de découvrabilité que le bouton à glissement.
- **Badge** : compteur numéroté sur le bouton flottant lui-même (comme un badge de notification d'icône d'appli), toujours visible sans avoir à ouvrir la fenêtre — répond au risque déjà identifié qu'un inbox non visible finit par être oublié.
- **Modèle de données retenu** : `state.dropZone`, tableau séparé de `state.projects` (pas un "projet système" caché dedans) — évite tout risque de fuite dans le treemap d'accueil, les filtres de projet ou les résumés IA, qui itèrent déjà sur `state.projects` à une dizaine d'endroits du code.

### Itération 3 — retouches finales de la fenêtre (post-implémentation)
- Bouton recentré horizontalement (était aligné à droite) — "au milieu de la ligne".
- Titre unifié en "Tu es dans la Drop Zone" pour toute la fenêtre — écarte la distinction "Drop it" (capture) / "Drop Zone" (tri) de l'itération précédente, jugée incohérente.
- **Fusion capture + tri en une seule fenêtre permanente** : la liste des notes en attente s'affiche directement dans le corps de la fenêtre, plus de lien "N notes à trier" à cliquer pour la révéler — écarté comme un clic superflu une fois qu'on a la place de tout montrer.
- Gabarit aligné sur `.chat-modal-box` (72vh fixe, liste scrollable en corps, saisie fixée en bas) plutôt qu'une hauteur variable selon le contenu (`max-height`) — "aussi grand que la fenêtre chat".
- **Bug corrigé** : sélectionner un projet de destination avant d'envoyer déclenchait un `render()` complet (reconstruction de tout le DOM de l'app), ce qui faisait visuellement "sauter" la fenêtre et perdait le texte en cours de frappe. Corrigé en ne mettant à jour que la classe `.active` du chip concerné directement en DOM, sans passer par `render()` — la fenêtre ne bouge plus pendant qu'on choisit une destination.
- La fenêtre ne se ferme plus après l'envoi d'une idée (avant : fermeture systématique) — reste ouverte pour enchaîner plusieurs captures, cohérent avec le nouveau gabarit "fenêtre de chat".

### Itération 4 — retrait de l'affectation par icônes (simplification du tri)
- **Changement demandé** : les notes de la Drop Zone ne s'affichent plus avec une rangée d'émojis de projets à assigner — elles deviennent des tâches ordinaires (case à cocher + titre), et cocher une note la retire immédiatement et complètement de la liste.
- Conséquence assumée : la Drop Zone n'est plus strictement un "sas obligatoire avant affectation à un projet" — elle devient aussi un endroit où noter et cocher directement des choses qui n'ont pas vocation à rejoindre un projet (ex: "Acheter du lait"). L'affectation à un projet depuis la Drop Zone n'existe plus comme fonctionnalité — si elle redevient nécessaire, ce sera un nouveau chantier, pas une simple réactivation.
- Pas de champ "done" persistant sur les entrées de `state.dropZone` : cocher supprime l'entrée directement (`splice`), pas de trace conservée après coup.

## Chantier 5 — Statuts de vélocité

### Décision — mode de calcul
| Option | Description | Statut |
|---|---|---|
| A | Règles de seuils simples sur les jours depuis la dernière activité (3/7/13/14 jours) | **Retenue pour le MVP** |
| B | Score composite pondéré (vitesse + régularité de complétion) | Écartée pour le MVP — nécessite une "cible" de rythme par projet qui n'existe dans aucun champ du modèle actuel ; à reconsidérer en v2 si le modèle simple s'avère trop grossier à l'usage |
| C | Estimation qualitative par le LLM à partir de l'historique | **Rejetée définitivement** — un statut de confiance doit être déterministe et auditable ; c'est le même défaut que le bug de comptage observé dans l'audit (le chat annonce 9 projets puis se corrige en direct à 10) |

### Décision — affichage du badge
| Option | Description | Statut |
|---|---|---|
| A | Flèche en haut à droite (tendance) + barre de progression existante teintée (santé) | **Retenue** |
| B | Flèche en haut à droite + second badge distinct en bas de la tuile | Écartée — fidèle à la demande initiale mais ajoute un élément visuel de plus sur une grille déjà dense (titres déjà tronqués observés dans l'audit) |

### Décision — définition d'"activité" (remet le compteur de pause à zéro)
| Option | Description | Statut |
|---|---|---|
| A | Cocher une tâche uniquement | Écartée — pénalise une réorganisation ou un ajout qui n'est pas une case cochée |
| B | Cocher, ajouter ou modifier une tâche | **Retenue** |

### Décision — pause
| Option | Description | Statut |
|---|---|---|
| A | Uniquement automatique (14 jours sans activité) | Écartée seule |
| B | Automatique **et** manuelle (déclenchable par l'utilisateur à tout moment) | **Retenue** — une pause légitime (attente d'un tiers) ne doit pas s'afficher comme un échec |

## Chantier 6 — Signature move (récompense variable)

Origine : question posée à l'IA sur la référence absolue en UX produit avec un geste simple qui fédère les utilisateurs.

| Référence évaluée | Verdict |
|---|---|
| *Hooked* (Nir Eyal) — Hook Model | **Retenue comme grille de diagnostic** : DROPIT a Trigger/Action/Investissement mais pas de Récompense variable |
| Octalysis (Yu-kai Chou) | **Retenue en complément** — identifie l'absence du Core Drive 7 (Imprévisibilité/curiosité) |
| Pull-to-refresh (Loren Brichter) | Retenue comme cas d'école illustratif, pas comme mécanique à copier telle quelle |

Décision d'exécution : le bouton "C'est fait" est le candidat naturel du signature move (geste déjà unique et répété), auquel il manque uniquement la couche "récompense variable" — pas de nouveau geste à inventer, écarté d'office comme option (aurait dupliqué un pattern déjà en place).

## Chantier 7 — Identité

### Itération — portée du chantier (décision révisée)
- **Proposition initiale de l'utilisateur** : faire de DROPIT un outil de transformation identitaire à part entière (mood board, portrait qui évolue, page d'accueil comme vision board).
- **Garde-fou soulevé** : recherche sur le mental contrasting / WOOP (Gabriele Oettingen) — la pure visualisation positive sans lien à l'action réduit la motivation.
- **Clarification apportée par l'utilisateur** : ce n'est pas un pivot, seulement l'esprit à infuser dans les patterns déjà spécifiés.
- Options finales :

| Option | Description | Statut |
|---|---|---|
| A | Pivot complet : nouvel écran "portrait/mood board", onboarding revu autour de l'identité | **Écartée** — changement de positionnement trop lourd pour ce sprint, gardée comme cap v2 |
| B | Ajout minimal : champ "intitulé d'identité" optionnel par projet, utilisé pour personnaliser le texte de confirmation du chantier 6 | **Retenue pour ce sprint** |

## Chantier 8 — Révélation Mosaïque

### Itération — mécanique visuelle (décision révisée deux fois)
1. **Proposition A** : icône colorée à la création → devient noir et blanc → se recolore progressivement avec les tâches complétées.
2. **Proposition B ("encore mieux" selon l'utilisateur)** : image floutée à la place de l'emoji → devient de moins en moins floue avec la progression.
3. **Reformulation finale retenue** : mosaïque de tuiles pixelisées (pas un flou continu), révélées dans le désordre — préférée par l'utilisateur car elle porte une métaphore de puzzle/construction plus cohérente avec le narratif identitaire, et elle est plus simple à indexer sur un compteur discret (une tuile = une tâche) qu'un flou continu indexé sur un %.

| Option | Statut |
|---|---|
| Grayscale → couleur (proposition A) | Écartée seule, mais retenue en complément possible (superposable au flou/mosaïque sans coût technique supplémentaire — deux filtres sur la même image) |
| Flou → net (proposition B) | Écartée au profit de la mosaïque, idée conservée comme mécanique alternative envisageable |
| Mosaïque de tuiles, ordre aléatoire mais fixe | **Retenue** |

### Décision — indexation de la révélation
| Option | Description | Statut |
|---|---|---|
| A | Nombre de tuiles révélées proportionnel au % de complétion | Écartée — recrée le problème déjà résolu au chantier 5 (le % n'a pas de sens stable si des tâches sont ajoutées en cours de route) |
| B | Une tuile révélée par tâche cochée, ordre aléatoire mais fixe (dérivé de l'ID du projet) | **Retenue** |

### Décision — source de l'image
| Option | Description | Statut |
|---|---|---|
| A | Générée par IA à partir du thème/identité du projet | **Retenue pour le MVP** |
| B | Piochée par l'IA dans une banque gratuite (type Unsplash) | Écartée comme option unique — moins unique (deux projets similaires pourraient partager la même image), mais reste un filet de repli possible si la génération IA échoue |
| C | Générée à partir d'une photo personnelle de l'utilisateur | **Écartée pour le MVP** — nécessite consentement explicite et stockage de données sensibles ; notée comme option activable plus tard, jamais par défaut |

### Décision — capacité technique de génération d'image
Point vérifié et non une option à trancher : Claude (modèle utilisé pour le chat de l'app) ne génère pas d'image nativement. Conséquence actée : ce chantier dépend d'un service tiers de génération d'image (DALL-E/GPT-image, Imagen, Stable Diffusion ou Flux), à choisir et chiffrer avant implémentation — **aucun service n'a encore été choisi**.

### Question restée ouverte (non tranchée)
Une fois une mosaïque révélée à 100%, l'image reste-t-elle l'icône permanente du projet, ou rejoint-elle une "galerie des identités accomplies" séparée ? Les deux options ont été évoquées, aucune n'a été choisie.

## Chantier 9 — Collaboration (pour mémoire, non cadré en détail)

| Élément demandé | Version complète (écartée pour ce sprint) | Version MVP retenue pour une future mission |
|---|---|---|
| Invitation | Système de permissions fin par rôle | Lien/code simple, pas de permissions fines au départ |
| Chat | Messagerie temps réel | Fil de commentaires par tâche/projet |
| Partage de documents | Espace documentaire dédié | Pièce jointe simple sur une tâche/note, réutilisant le pattern "Notes" déjà existant |

Statut global : chantier noté pour mémoire, non planifié dans les phases 1 à 3 (voir CADRAGE.md §8) — l'ampleur cumulée des trois éléments dépasse largement tout le reste du cadrage.

---

## Chantier bonus — Accordéon catégories (une seule fenêtre par projet)

Proposition de l'utilisateur, hors des 9 chantiers du cadrage initial : pour un projet multi-catégories, remplacer la navigation vers un écran séparé par catégorie par un dépliage inline dans l'écran du projet.

| Option | Description | Statut |
|---|---|---|
| A | Garder l'écran séparé par catégorie (`renderCategoryDetail`), navigation classique | Écartée — c'est justement ce qu'on retire |
| B | Accordéon inline : la carte de catégorie se déplie sur place, une seule fenêtre pour tout le projet | **Retenue** |

Décisions d'implémentation :
- Grille 2 colonnes → liste pleine largeur (`.category-accordion`), condition posée par l'utilisateur ("la carte du projet prend toute la largeur").
- Une seule catégorie ouverte à la fois — état scalaire (`expandedCategoryId`), pas un ensemble — ouvrir une catégorie referme implicitement celle qui était ouverte. Pas demandé explicitement mais découle naturellement du choix d'un état scalaire plutôt qu'un tableau ; à revoir si le besoin de comparer plusieurs catégories ouvertes en même temps se manifeste.
- Animation d'entrée légère (fondu + glissement, ~220ms) au dépliage — "léger effet fluide" demandé.
- `renderCategoryDetail`, `currentCategoryId` et la route de navigation associée (popstate, écran séparé) supprimés entièrement plutôt que laissés en code mort, puisque plus aucun chemin ne les atteint.
- Point technique non demandé mais nécessaire : la position de défilement de l'écran projet doit être explicitement restaurée après chaque clic, sinon le `render()` complet (déjà le mécanisme de rendu de toute l'app) ramène l'écran en haut à chaque ouverture/fermeture de catégorie — corrigé avant de pousser, pas après un signalement.
- La barre de saisie fixe en bas d'écran cible automatiquement la catégorie dépliée ; repliée, elle sert à créer une nouvelle catégorie — reprend le comportement déjà existant (`renderItemBar`/`renderProjectBar`), juste déclenché par l'état d'accordéon plutôt que par la navigation.

---

## Chantier bonus 2 — Retouches vue projet et chat IA (post-accordéon)

Cinq demandes ponctuelles de l'utilisateur sur l'écran projet et le chat IA, une fois l'accordéon catégories en place.

### Retrait du bloc "Priorités"
| Option | Description | Statut |
|---|---|---|
| A | Garder le bloc "Priorités" (3 tâches suivantes) en plus de la carte "Prochaine action" | Écartée — redondant, les deux blocs montraient une partie du même sous-ensemble de tâches prioritaires |
| B | Supprimer le bloc, ne garder que "Prochaine action" | **Retenue** |

`priorityBlockHtml` et le CSS associé (`.priority-block*`) supprimés entièrement plutôt que laissés en code mort.

### "Prochaine action" — parcourir les tâches suivantes
| Option | Description | Statut |
|---|---|---|
| A | Swipe horizontal sur la carte | Écartée — demandait un choix explicite (l'utilisateur a proposé les deux, "soit... soit"), le swipe est moins découvrable et entre en conflit potentiel avec le défilement vertical de l'écran |
| B | Petite flèche discrète, clic pour passer à la tâche suivante | **Retenue** — "garder le même format", donc pas de changement de mise en page, juste un contrôle ajouté |

Implémentation : état `nextActionPreviewIndex` (position dans `priorityItems(p)` affichée), remis à zéro à chaque changement de projet (`nextActionPreviewProjectId`) et à chaque case cochée (sinon un index resté élevé pourrait pointer au-delà d'une liste raccourcie). La flèche n'apparaît que si plus d'une tâche prioritaire existe (`priorityList.length > 1`), réutilise `chevronIcon()` pivoté pour ne pas ajouter une nouvelle icône. `nextActionItem(p)` (ne renvoyait que la première tâche) supprimée, remplacée par l'indexation sur `priorityList`.

### Accordéon catégories — vitesse d'ouverture
Demande : "rend le déploiement accordéon plus lent". Aucune option alternative posée — ajustement direct de la durée d'animation `.category-expanded` de `.22s` à `.45s`, jugement qualitatif sans mesure précise demandée par l'utilisateur ("plus lente" sans chiffre).

### Notes IA — toujours au niveau du projet
| Option | Description | Statut |
|---|---|---|
| A | Garder le rattachement automatique à la catégorie ouverte (`expandedCategoryId`) au moment de l'enregistrement | Écartée — comportement jugé surprenant par l'utilisateur ("pas possible de les mettre dans les catégories") |
| B | `catId` toujours `null` pour une note créée depuis le chat IA, quelle que soit la catégorie dépliée à ce moment | **Retenue** |

Portée volontairement limitée : la fonctionnalité de notes manuelles créées/éditées directement dans l'écran des notes (avec sélecteur "Projet (global)" / catégorie précise) n'est pas touchée — seule la création automatique depuis le chat IA (`performSaveChatAsNote`) est concernée. Vérifié qu'une note créée depuis le chat porte bien `catId:null` même quand une catégorie est dépliée au moment du clic.

### Chat IA — couleur des boutons "copier" / "mettre en note"
| Option | Description | Statut |
|---|---|---|
| A | Garder une seule couleur neutre (gris) pour les deux boutons, comme avant | Écartée — c'est justement ce qui rendait les deux actions peu différenciables d'un coup d'œil |
| B | Deux couleurs distinctes réutilisant la palette de teintes déjà existante des projets (`--proj-*-solid` / `--proj-*-badge`) plutôt qu'introduire de nouvelles couleurs | **Retenue** — "copier" en azur, "mettre en note" en ambre |

Vérifié en navigateur réel (Playwright) : couleurs calculées distinctes (`rgb(65,150,210)` vs `rgb(198,135,47)`), sur les deux points d'affichage du chat (fenêtre d'accueil multi-projets et fenêtre de chat par projet).

---

## Chantier bonus 3 — Statut/échéance retirés, refonte "Prochaine action", notes toujours projet

Suite directe du chantier bonus 2 : nouvelles retouches de l'utilisateur sur la même vue projet.

### Retrait du statut et de l'échéance dans l'en-tête du projet
| Option | Description | Statut |
|---|---|---|
| A | Garder la ligne de statut ("Actif"/"Ralentit"/...) et le chip d'échéance sous le titre du projet | Écartée — demande explicite de suppression, jugés redondants une fois le bloc Priorités retiré (chantier bonus 2) et sans lien direct avec l'action du jour |
| B | Supprimer les deux, ne garder que titre/résumé/barre de progression | **Retenue** |

Portée limitée à l'écran projet (`renderDetail`) : les indicateurs de statut/vélocité de la grille d'accueil (tuiles du treemap, chantier 5 pas encore fait) ne sont pas touchés — variables et fonctions différentes (`activityStatus` y est encore appelée). `STATUS_LABELS` et `dueDateLabel()` n'avaient plus aucun appelant après ce retrait : supprimés plutôt que laissés en code mort, ainsi que le CSS `.detail-status-row`/`.status-dot`/`.due-date-chip` associé (vérifié qu'aucune autre vue ne réutilisait ces classes avant suppression).

### Refonte de la carte "Prochaine action"
| Option | Description | Statut |
|---|---|---|
| A | Garder le texte "PROCHAINE ACTION · CATÉGORIE" en petit texte coloré au-dessus du titre de la tâche | Écartée — l'utilisateur veut le libellé "Prochaine action" mis en évidence dans un badge blanc, et la catégorie déplacée en italique au-dessus |
| B | Catégorie en italique en tout haut de l'encart, badge blanc arrondi "Prochaine action" en dessous, titre de la tâche en dessous | **Retenue** |

- Bouton carrousel : passé d'un chevron discret inline (à côté du libellé texte) à un **rond blanc flottant, à cheval sur le bord supérieur de l'encart, centré horizontalement** — repris du pattern déjà utilisé ailleurs dans l'app pour des éléments flottants proéminents (bouton DROP●IT). Demande explicite : "un bouton carrousel plus visible".
- Le badge "Prochaine action" n'est plus un simple libellé texte coloré mais un vrai badge (fond blanc, coins arrondis, ombre légère) pour le distinguer visuellement du reste du texte de la carte.

### Titres de catégorie et de note agrandis
Demande directe, sans option alternative posée : `.category-card-title` 14px → 16.5px, `.cat-note-title` 13.5px → 15.5px (poids de police également renforcé sur les notes, 400 → 600, pour rester lisible à cette taille).

### Notes — suppression totale de la possibilité de rattachement à une catégorie
- **Constat en relisant le code** : le chantier bonus 2 avait bien forcé `catId:null` pour les notes créées *depuis le chat IA*, mais deux chemins permettaient encore de faire atterrir une note dans une catégorie : (1) un sélecteur "Déplacer" (`data-pn-move`) sur chaque note existante, montré dès qu'un projet a plusieurs catégories ; (2) l'affichage des notes était filtré et dupliqué par catégorie dans l'accordéon (`renderProjectNotes(p, cat.id)` appelé depuis `renderCategoryAccordionItem`).
- Demande de l'utilisateur ("plus possibilité de le mettre dans les catégories") lue comme couvrant ces deux chemins, pas seulement la création depuis le chat.

| Option | Description | Statut |
|---|---|---|
| A | Ne toucher que la création depuis le chat (déjà fait), garder le sélecteur "Déplacer" pour les notes existantes | Écartée — laisse un moyen détourné de recréer exactement ce que l'utilisateur vient de refuser |
| B | Retirer entièrement le sélecteur "Déplacer" et l'affichage de notes par catégorie ; `renderProjectNotes(p)` affiche désormais systématiquement toutes les notes du projet, au niveau projet uniquement | **Retenue** |

`performMoveProjectNote()` et son binding d'événement supprimés (plus aucun appelant). Le champ `catId` reste dans le modèle de donnée des notes (compatibilité avec d'éventuelles notes existantes créées avant ce changement) mais n'est plus jamais lu pour filtrer l'affichage ni jamais écrit ailleurs qu'à `null`.

Vérifié en navigateur réel (Playwright) : statut/échéance absents de l'écran projet, badge "Prochaine action" et catégorie en italique affichés, carrousel fonctionnel (clic fait défiler les tâches), titres de catégorie mesurés à 16.5px et de note à 15.5px, note créée depuis le chat avec une catégorie dépliée au moment du clic enregistrée avec `catId:null`, sélecteur "Déplacer" absent du DOM.

---

## Chantier bonus 4 — Position du carrousel et taille des coches

Deux micro-retouches ponctuelles sur la même carte "Prochaine action" et les listes de tâches.

### Position du bouton carrousel
| Option | Description | Statut |
|---|---|---|
| A | Garder le rond flottant à cheval sur le bord haut, centré horizontalement (chantier bonus 3) | Écartée — l'utilisateur le veut au milieu à droite |
| B | Rond flottant à cheval sur le bord droit de l'encart, centré verticalement | **Retenue** |

Le padding droit de `.next-action-card` a été augmenté (16px → 30px) pour que le titre/badge centrés ne passent pas sous le bouton ; le padding haut et la marge supérieure, qui n'étaient là que pour dégager de la place au-dessus du bouton quand il était en haut, ont été ramenés à leur valeur normale.

### Taille des coches de tâches
Demande directe, sans option alternative : rond de coche (`.step-check`, utilisé par `renderItemUnit` pour toutes les tâches de catégorie) réduit de 22px à 18px, icône de coche interne réduite en proportion (12px → 10px).

Vérifié en navigateur réel (Playwright) : centre vertical du bouton carrousel aligné sur le centre vertical de l'encart, bouton à cheval sur le bord droit ; coches mesurées à 18×18px.

---

## Repères de méthode (décisions transverses, valables sur tous les chantiers)

- Ne jamais faire calculer un comptage, un statut ou une agrégation par le LLM — toujours un calcul déterministe côté application (origine : bug de comptage observé dans l'audit).
- Ne jamais afficher le nom technique du modèle IA à l'utilisateur.
- Toute mécanique de perte/streak doit inclure sa soupape (type "streak freeze" de Duolingo) dès sa conception, jamais ajoutée après coup.
- Le mood board / la représentation identitaire ne doit jamais exister comme élément purement contemplatif déconnecté d'une action du jour (risque documenté par la recherche WOOP).

## Décisions d'exécution (non structurantes)

- 2026-09-08 — Repo cible identifié et attaché à la session : `harimalal/dropit` (le repo initialement fourni, `harimalal/yoitubesum`, est un projet sans rapport — résumeur de vidéos YouTube).
- 2026-09-08 — Convention de mission existante (`MISSIONS/<date>-<slug>/{CADRAGE,decisions,etat}.md`) découverte et réutilisée telle quelle pour cette mission plutôt que d'inventer un nouveau format de log.

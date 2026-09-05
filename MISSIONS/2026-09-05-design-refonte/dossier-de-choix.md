# Dossier de choix — Refonte design DROPIT

## À retenir
- Verdict        : lancer sous condition
- Ce qui bloque  : rien de technique. Deux tensions réelles à trancher avant production (points 1 et 2)
- Ce que je te demande : trancher les points 1, 2 et 3 ci-dessous. Le reste est verrouillé ou hors sujet pour cette mission
- Risque n°1     : contraste texte/fond sur les cartes colorées — traité dans les tokens quel que soit ton choix

**Trajectoire retenue :** interface riche (refonte visuelle d'une app existante déjà en production). Pas de section offre/prix/seuil de rentabilité/persona à trancher — outil personnel mono-utilisateur, déjà validé par l'usage réel. Le parcours et les gestes restent strictement identiques par exigence explicite de ta part — ce n'est pas un choix, c'est une contrainte dure déjà posée.

---

### 1. Périmètre du chantier — jusqu'où va la ressemblance avec l'image ?

Ce que j'ai trouvé : ta consigne dit "ressembler" sans préciser si ça touche la structure (l'accueil passe d'un treemap à une grille de cartes comme l'image) ou seulement l'habillage (couleurs, rayons, badges — le treemap reste un treemap, mais stylé chaleureusement).

A. **Habillage seul** — le treemap actuel reste un treemap (c'est un algorithme de mise en page déjà fonctionnel, testé, qui donne une vraie lecture d'ensemble en un coup d'œil). On applique la palette, les rayons, les badges emoji, les ombres dans son esprit. Conséquence : ressemblance partielle à l'image (le ton, pas la disposition), risque de régression quasi nul (aucune structure HTML ne change sur l'accueil).

B. **Bascule structurelle de l'accueil** — l'accueil treemap est remplacé par une grille de cartes 2 colonnes façon image de référence (chaque projet = une carte à taille fixe, plus de mise en page proportionnelle au poids du projet). Conséquence : ressemblance forte à l'image, mais on perd l'information visuelle "ce projet est gros/actif donc sa tuile est grande" que le treemap donne aujourd'hui — et le risque de régression grimpe (nouvelle structure HTML + JS de rendu à écrire pour l'accueil, à côté de la task list qui existe déjà et fait déjà "liste de cartes").

C. **Les deux, au choix de l'utilisateur** — bouton de bascule treemap/cartes sur l'accueil (comme celui de la task list). Conséquence : le plus proche de "tout avoir", mais double la surface de code à maintenir sur l'accueil, et contredit un peu l'esprit "un vrai design system unifié" que tu as demandé — deux mises en page different pour la même donnée n'est pas automatiquement incohérent, mais ajoute une décision d'architecture de plus.

Recommandation : **A**, parce que ta consigne première était "ne toucher à aucune fonctionnalité" — le treemap encode une fonctionnalité réelle (voir en un coup d'œil quel projet est gros et actif), donc le remplacer serait un changement fonctionnel déguisé en changement visuel. On peut aller très loin dans la ressemblance esthétique (couleurs, rayons, badges, densité, chaleur) sans toucher à l'algorithme de disposition.

Si tu ne tranches pas : A s'applique.

---

### 2. Comment la couleur se distribue — statut ou identité de projet ?

Ce que j'ai trouvé : ton image colore chaque carte différemment, sans lien apparent avec une donnée. DROPIT aujourd'hui colore par **statut d'activité** (vert = actif, ocre = ralentit, gris = pause, terracotta = accompli) — c'est une vraie information, visible d'un coup d'œil. Duolingo, Notion et Monzo (recherche, voir `reconnaissance.md`) ont un point commun : leur couleur code toujours une donnée réelle, jamais un hasard esthétique. C'est aussi exactement ce que les deux experts de ta session de maquettes précédente avaient identifié comme le vrai levier différenciant : "chaque projet a sa couleur, ça donne l'impression que l'app connaît tes projets."

A. **Couleur = statut (existant, inchangé)** — on garde le code couleur actuel, on l'habille juste plus richement (fond de carte teinté selon le statut au lieu d'un simple point). Conséquence : zéro perte d'information, cohérence totale avec le comportement déjà en place, mais moins proche de l'esprit "chaque carte est visuellement unique" de l'image de référence — deux projets au même statut auront la même couleur de carte.

B. **Couleur = identité du projet** — chaque projet reçoit une couleur assignée une fois pour toutes (dérivée de son id, stable, jamais aléatoire d'un rendu à l'autre), réutilisée partout où ce projet apparaît : fond de carte, badge emoji, bande d'accent, checkbox "fait" dans ses tâches, puce dans la task list globale. Le statut devient un signal secondaire discret (petit indicateur, pas la couleur dominante). Conséquence : fidèle à l'image, reprend le consensus jamais exploité de la session précédente, mais on perd la lecture immédiate du statut sur l'accueil — à compenser par un petit signal visuel dédié.

C. **Les deux en superposition** — couleur de fond = identité du projet (B), ET un indicateur de statut clairement visible par-dessus (ex. anneau de progression déjà existant sur le treemap, ou petit badge). Conséquence : le plus riche d'information, demande un peu plus de soin au design des tokens pour que ça reste lisible et pas surchargé, mais ne sacrifie rien.

Recommandation : **C**, parce que c'est la seule option qui ne sacrifie aucune information déjà utile (statut) tout en apportant ce que l'image de référence et le consensus de la session précédente pointent comme le vrai gain ("l'app connaît chaque projet"). Le treemap a déjà un anneau de progression par tuile (`--ring-color`) — il suffit de le garder comme porteur du signal de statut pendant que le fond de carte porte l'identité du projet. Rien à inventer, l'un des deux mécanismes existe déjà dans le code.

Si tu ne tranches pas : C s'applique.

---

### 3. Direction visuelle — palette et tokens

Ce que j'ai trouvé : ta session précédente avait 3 directions jamais choisies (Obsidian Warm sombre, Neo Cream claire indigo, Orange Brûlé = évolution actuelle). Je ne les reprends pas telles quelles — je propose 2 directions resserrées, chacune ancrée dans la recherche et dans ce qui a déjà émergé comme consensus, pour éviter de revivre un choix qui ne vient jamais.

**A. Carnet Chaud** — évolution assumée de l'identité déjà en place (le fond crème et l'accent terracotta sont déjà "à toi", déjà vus, déjà mémorisés). On pousse la structure de carte de l'image de référence (rayons généreux, badge emoji circulaire, densité, ombres douces) sur cette base existante plutôt que de repartir de zéro.
```
Fond        : #FAF6F1 (inchangé)
Carte       : #FFFDFB (inchangé), rayon 18-20px (actuellement 14px)
Encre       : #2B2420 (inchangé)
Accent      : #BF5B44 (inchangé)
Badge emoji : cercle 40px, fond teinté = couleur projet à 15% d'opacité
Ombre carte : douce, teinte dérivée de la couleur du projet (pas de gris neutre)
```
Prend de la référence : structure carte, rayons, badge circulaire, densité, pills, barre IA
Ne prend pas : la palette multicolore saturée — restée douce et cohérente avec le ton crème existant
Anti-référence : dashboards très saturés qui changent complètement d'identité à chaque refonte — perd la reconnaissance déjà acquise

**B. Palette Étendue** — même structure de carte, mais on assume une vraie palette de couleurs de projet plus large et plus vive (7-8 teintes, comme l'image), le fond crème et l'accent terracotta ne servant plus que pour le chrome de l'app (barres, boutons génériques) — les cartes elles-mêmes vivent dans leur propre couleur de projet, plus affirmée.
```
Fond app     : #FAF6F1 (inchangé, pour le chrome)
Palette carte: 7-8 teintes pastel dérivées d'une seule formule (même saturation/luminosité, teinte qui tourne) — garantit la cohérence entre elles
Rayon        : 20px
Badge emoji  : cercle plein dans la couleur du projet (pas juste teinté)
```
Prend de la référence : l'énergie colorée, la variété entre cartes
Ne prend pas : l'assignation totalement arbitraire des teintes — une seule formule génère les 7-8 couleurs pour qu'elles soient toujours harmonieuses entre elles, jamais choisies au hasard une par une
Anti-référence : palettes assemblées teinte par teinte sans formule commune — c'est ce qui produit un rendu "généré par IA" reproché aux dashboards pastel génériques

Recommandation : **A**, parce que tu as déjà un accent terracotta investi (visible sur le domaine, les captures precedentes, l'app actuelle) et une session de maquettes qui a déjà exploré une variante plus vive (B, Neo Cream) sans qu'elle emporte la décision. Repartir sur l'identité existante réduit le risque de repasser des mois plus tard sur "encore une nouvelle palette". B reste une option solide si tu veux une rupture plus nette avec l'existant.

Si tu ne tranches pas : A s'applique.

---

### 4. Options techniques — comment structurer les tokens

Ce que j'ai trouvé : la recherche 2026 sur les design systems sans framework converge sur une architecture à 3 niveaux — primitives (valeurs brutes), sémantique (rôle), composant (cas particulier). C'est directement applicable à un fichier CSS unique, sans aucune dépendance nouvelle.

A. **Extension légère des tokens actuels** — on garde les 12 variables CSS actuelles telles quelles, on en ajoute pour les nouveaux besoins (rayons multiples, couleurs de projet, ombres). Rapide, faible risque, mais les futurs ajouts resteront un peu ad hoc.

B. **Vraie architecture à 3 niveaux** — primitives (`--color-terracotta-500`, etc.), tokens sémantiques (`--color-accent`, `--color-surface-card`) qui référencent les primitives, tokens de composant (`--card-radius`, `--badge-size`) qui référencent le sémantique. Plus de lignes au départ, mais tout changement de palette future se fait en un seul endroit, et c'est exactement le standard que la spec W3C Design Tokens (2025.10) recommande.

Recommandation : **B**, parce que c'est exactement le type de dette qu'on paie cher plus tard sur un fichier qui va continuer de grossir (2900 lignes déjà), et que le coût de le faire maintenant est faible — on le fait une fois, pendant qu'on a la palette sous les yeux de toute façon.

Si tu ne tranches pas : B s'applique.

---

### 5. Indicateurs de succès (proposés, pas à discuter — dis-moi si tu veux en retirer ou en ajouter)

- Zéro régression fonctionnelle : passage manuel sur les 9 écrans (accueil, projet mono-catégorie, projet multi-catégorie, catégorie, task list, chat modal, notes, auth, feuille compte) après refonte, comportement identique à avant
- Contraste ≥ 4.5:1 texte normal / 3:1 grand texte sur 100% des combinaisons carte-couleur × texte utilisées (vérifié, pas estimé)
- Zéro couleur "en dur" (hex écrit directement dans une règle) hors du bloc de tokens — tout passe par les variables CSS
- Toi, en un coup d'œil sur l'app déployée : "oui, ça ressemble à ce que je voulais"

---

### 6. Points irréversibles

- Le déploiement en production (push + Cloudflare) — je te montre le résultat avant de pousser, comme sur les sessions précédentes
- Rien d'autre n'est irréversible : tout le travail se fait sur un fichier versionné (git), retour arrière possible en une commande à tout moment

---

## Test décisif minimal (avant toute production complète)

```
Incertitude principale : quelle direction visuelle (palette + traitement carte + statut-vs-projet)
                          donne le bon équilibre entre "ressemble à l'image" et "reste DROPIT,
                          lisible, cohérent" — se tromper coûte de réécrire ~500 lignes de CSS deux fois
Test minimal            : un mockup HTML autonome, UNE SEULE vue (l'accueil, avec tes vraies
                          données de projets actuelles, pas des données inventées), déclinée dans
                          la direction retenue au point 3 — quelques heures, pas les 2900 lignes
Signal de réussite       : tu valides le mockup sans hésitation. (La session précédente a échoué à
                          ce stade précis — 3 directions complètes construites, aucune choisie.
                          Cette fois, une direction déjà resserrée par la recherche, testée sur données
                          réelles, avant d'aller plus loin.)
Ce qu'on ne construit pas tant que le test n'a pas parlé : le token system complet appliqué aux
                          2900 lignes, les écrans secondaires (catégorie, task list, auth, chat)
```

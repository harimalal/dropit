# Reconnaissance — Refonte design DROPIT

## À retenir
- Verdict        : lancer sous condition (une seule condition, mineure — voir plus bas)
- Ce qui bloque  : rien de bloquant. Une tension à trancher : coloration par STATUT (actuel, fonctionnel) vs coloration par PROJET (image de référence) — voir dossier de choix
- Ce que je te demande : choisir une direction visuelle et trancher la tension statut/projet — dossier de choix à suivre
- Risque n°1     : contraste texte/fond sur cartes pastel très claires — WCAG AA exige 4.5:1, plusieurs teintes pastel du type de l'image de référence tombent sous ce seuil avec du texte gris clair

---

## Ce qui existe

**Dans DROPIT aujourd'hui** (vérifié dans le code, pas supposé) :
- Palette actuelle : fond crème chaud `#FAF6F1`, encre `#2B2420`, accent terracotta `#BF5B44`, 4 couleurs de statut (actif vert, ralentit ocre, pause gris, accompli terracotta)
- 527 lignes de CSS, ~247 règles de classe, rayon unique `14px`, une seule famille de police système
- Accueil en treemap (algorithme squarify) : la couleur de chaque tuile encode le **statut d'activité** du projet (actif/ralentit/pause/accompli), pas son identité
- Task list globale (swipe) : dot coloré remplacé récemment par l'emoji du projet — déjà une évolution vers l'identité visuelle par projet
- Écrans ajoutés cette semaine, jamais stylés au-delà du minimum : authentification (login/signup/reset), barres de saisie IA contextuelles, feuille de compte

**Session antérieure, jamais conclue** — `/home/radoraj/DROPIT/MOCKUPS/design_v1.html` (2026-09-03) :
Deux experts fictifs (Mia, Kenji) avaient produit 3 directions concurrentes (A "Obsidian Warm" sombre terracotta, B "Neo Cream" clair indigo + mesh, C "Orange Brûlé" évolution de l'existant), débattues, jamais choisies par l'utilisateur — point d'arrêt resté ouvert. **Trois micro-effets faisaient consensus entre les deux experts, indépendamment de la direction retenue :**
1. Glow coloré (couleur accent) sur le bouton d'envoi
2. Bande ou accent coloré par projet
3. La checkbox "fait" prend la couleur du projet plutôt qu'une couleur fixe

Ce consensus n'a jamais été invalidé, seulement laissé en attente faute de choix de direction. Il est repris comme acquis dans ce cadrage plutôt que rediscuté.

**Image de référence apportée par l'utilisateur** : app de suivi d'objectifs à cartes — grille 2 colonnes, chaque carte a un fond pastel qui lui est propre (bleu, vert, rouge, orange, violet, rose, sarcelle — assignation qui semble arbitraire par carte, pas liée à une donnée), badge emoji circulaire coloré assorti au fond de carte, barre de progression fine colorée, avatars empilés, pills de filtre catégorie en haut (pill active = vert plein), header avec salutation + icônes recherche/notification/avatar, barre de saisie IA en bas avec sparkle. Recherche inversée (traits distinctifs, pas de correspondance exacte trouvée) : ce gabarit est un pattern générique répandu sur Dribbble/Figma Community pour les trackers d'objectifs personnels, pas un produit identifiable unique — donc traité comme référence de *pattern*, pas comme produit à copier trait pour trait.

---

## Ce qui fonctionne, et pourquoi

- **Duolingo** : rayons 16-20px sur les cartes, 12px sur les boutons, iconographie remplie et colorée par compétence, une couleur de marque forte (`#58cc02`) déclinée en teintes de fond douces pour les surfaces de succès. La couleur sert à *guider* (progression, réussite), pas seulement à décorer. (source : DesignMD, analyse du design system Duolingo, 2026)
- **Notion** : palette de cartes aux teintes pastel qui font écho aux propriétés colorées de ses bases de données — la couleur de carte porte une information (le type de contenu), elle n'est pas cosmétique. (source : DesignMD, analyse Notion, 2026)
- **Monzo** (hors secteur — banque) : une seule couleur de marque forte (corail) + catégories de dépenses colorées pour l'analyse — la couleur codée sert la compréhension immédiate ("où va mon argent"), jamais la seule esthétique. Beaucoup de blanc, icônes appuyées, contraste élevé pour installer la confiance. (source : UX Paradise / Creative Bloq, 2026)

Point commun aux trois : **la couleur code une information réelle** (compétence, type, catégorie de dépense) — jamais une teinte assignée au hasard pour faire joli. C'est le principal écart avec l'image de référence brute, où l'assignation de couleur par carte ne semble reliée à aucune donnée visible.

---

## Ce qui échoue habituellement

- Cartes pastel très claires + texte gris clair dessus → échec de contraste WCAG, illisible en plein soleil sur mobile (risque direct pour DROPIT, app à usage mobile)
- `box-shadow` et gradients animés en nombre sur une grille de cartes → dégradation du scroll sur mobile milieu de gamme, notamment quand chaque carte a sa propre ombre (source : Medium/DEV.to, retours d'expérience CSS mobile 2026)
- Couleur assignée arbitrairement par carte sans lien avec une donnée → look "générique IA", le premier reproche fait aux dashboards pastel de ce type sur les forums de critique design
- Reskin qui casse discrètement un usage existant sans le vouloir (classe CSS partagée entre deux composants, oubliée dans un coin) → c'est le risque n°1 opérationnel ici, pas visuel : 247 règles CSS à auditer avant/après pour garantir zéro régression fonctionnelle

---

## Risques (piste obligatoire)

**Plateforme.** Aucun. App déployée en direct sur Cloudflare Pages, pas de plateforme tierce qui puisse sanctionner un changement visuel (pas d'App Store, pas de marketplace).

**Réglementation.** Un point réel : accessibilité. WCAG 2.1 AA exige un contraste 4.5:1 pour le texte normal, 3:1 pour le grand texte et les éléments non textuels. Sans obligation légale directe pour un outil personnel non commercial, mais c'est une exigence de qualité qu'on se donne — d'autant que l'app est utilisée en mobilité, souvent en extérieur. (source : WebAIM / MDN, 2026)

**Réputation.** Aucune, usage personnel non public au sens promotionnel.

**Dépendance.** Aucune nouvelle dépendance introduite si on reste en CSS natif (variables CSS, pas de framework). C'est d'ailleurs le consensus des sources 2026 sur les design systems sans framework : les tokens CSS ne dépendent d'aucun outil, un simple découpage primitive → sémantique → composant suffit à tenir à l'échelle d'un fichier unique. (source : JavaScript in Plain English, W3C Design Tokens Community Group spec 2025.10)

**Conclusion piste risque : aucune tension entre la promesse (refonte visuelle) et ce qui est défendable. Le seul risque réel est technique (contraste, régression CSS), pas éthique ou commercial.**

---

## Variables décisives

| Variable | Dont dépend | Source | Statut |
|---|---|---|---|
| Coloration par statut ou par projet | Toute la logique de couleur de l'accueil, de la task list, des badges | Utilisateur — tension réelle entre l'existant (statut) et l'image de référence (identité projet) | **Manquante — demandée dans le dossier de choix** |
| Ampleur du chantier (CSS pur vs restructuration de l'accueil en cartes) | Le périmètre de la Phase 3, le risque de régression | Utilisateur a dit "ne toucher à aucune fonctionnalité" — mais une bascule treemap → grille de cartes est un changement de structure de présentation, pas de fonctionnalité. Zone grise à clarifier | **Manquante — demandée dans le dossier de choix** |
| Palette exacte (hex) | Tous les tokens dérivés | Obtenable par moi, à partir du choix de direction | Obtenable |
| Seuil de contraste à respecter | Validité des teintes de carte proposées | Obtenable (WCAG AA, standard) | Obtenue |

---

## Ce qui reste incertain

- Si l'image de référence doit inspirer *uniquement* l'esthétique (rayons, densité, badges, chaleur) ou aussi la *structure* de l'accueil (grille de cartes au lieu du treemap). Le brief dit "ressembler" sans trancher ce point — porté au dossier de choix.
- Si les couleurs par carte doivent coder une donnée réelle (comme Duolingo/Notion/Monzo) ou rester une simple déclinaison esthétique assignée par index de projet. Porté au dossier de choix.

---

## Verdict

**Lancer sous condition.** La condition : trancher la tension statut/projet et le périmètre structurel de l'accueil *avant* la Phase 3, pour éviter une production qui devrait être refaite à mi-chemin. Aucun frein de fond — le projet est sain, borné, sans risque réglementaire ni réputationnel, et le terrain est déjà largement défriché par la session de maquettes antérieure.

---

## Sources et dates

- DesignMD, analyse design system Duolingo — consulté 2026-09-05
- DesignMD, analyse design system Notion — consulté 2026-09-05
- UX Paradise (Medium) / Creative Bloq, patterns UI Monzo & banking apps — consulté 2026-09-05
- WebAIM Contrast Checker / MDN, WCAG 2.1 color contrast — consulté 2026-09-05
- JavaScript in Plain English, CSS Design Tokens ; W3C Design Tokens Community Group spec 2025.10 — consulté 2026-09-05
- Medium (Emad Fanaeian) / DEV.to, coût de rendu box-shadow et gradients sur mobile — consulté 2026-09-05
- `/home/radoraj/DROPIT/MOCKUPS/design_v1.html`, session interne 2026-09-03 — maquettes et consensus experts jamais tranchés
- `/home/radoraj/DROPIT/index.html`, état du code au 2026-09-05 (lecture directe)

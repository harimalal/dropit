# DÉCISIONS — Refonte design DROPIT

## Choix validés au cadrage (gate du 2026-09-05)

1. **Périmètre accueil** : treemap conservé, habillage seul (option A). Défaut recommandé, confirmé tel quel par l'utilisateur.
2. **Logique couleur** : identité de projet (couleur stable partout) + anneau de statut superposé sur le treemap (option C). Défaut recommandé, confirmé tel quel.
3. **Direction palette** : Palette Étendue — rupture colorée (option B). **Écart au défaut recommandé** (le défaut proposé était "Carnet Chaud", évolution de l'existant). L'utilisateur a explicitement choisi la rupture plus vive.
4. **Architecture tokens** : 3 niveaux primitives → sémantique → composant (option B). Défaut recommandé, non contredit, s'applique.

Brief.md section 4 mis à jour en conséquence (voir Décision #1 ci-dessous pour le détail des tokens Palette Étendue, calculés après le gate).

## Fiches agents
Recopiées telles quelles depuis `equipe.md` : Orchestrateur, Constructeur, Vérificateur non-régression, Directeur artistique, Gardien de la clarté visuelle, Auditeur de contraste. Voir ce fichier pour le détail complet de chaque fiche.

## Débats structurants

### Décision #1 : palette de projet — formule de génération et correction de contraste
- Contexte : le point 3 du gate (Palette Étendue) exige 7-8 teintes de projet dérivées d'une seule formule HSL, harmonieuses entre elles, sans mud (zone jaune-vert 60-140° évitée par choix des teintes de départ).
- Tour 1 — Position Directeur artistique : une seule paire (S, L) fixe appliquée à 8 teintes réparties sur le cercle chromatique, pour garantir l'harmonie. Preuve : reconnaissance.md (anti-référence "palettes assemblées teinte par teinte sans formule commune"). Coût : le HSL a une luminosité perçue inégale selon la teinte (le vert/jaune paraît plus clair que le bleu/violet à L identique) — une formule uniforme produit des badges à contraste inégal.
- Tour 1 — Position Auditeur de contraste : mesure d'abord, ajuste ensuite. Calcul réel (script Python, formule WCAG relative luminance) sur les 8 teintes proposées à L=54/S=62 pour les badges pleins : terracotta 3.93, corail 4.48, ambre 2.57, émeraude 1.93, sarcelle 1.85, azur 3.22, indigo 6.99, mûre 4.68 — contre un seuil de 3:1 minimum pour un élément graphique (icône/checkmark, pas du texte). Ambre, émeraude et sarcelle échouent nettement. Preuve : mesure directe, pas une opinion. Coût : la L "uniforme" de la position 1 n'est pas défendable telle quelle.
- Tour 2 — Compromis : garder une seule paire (S, L) pour les **fonds de carte** (l'écart de luminosité perçue y est sans conséquence, tous passent largement le seuil texte 4.5:1 dès lors que le texte utilisé est `--ink` et non `--ink-soft`), mais **ajuster L teinte par teinte** pour les badges pleins/checkbox jusqu'à atteindre exactement 3:1 vs blanc — la formule reste systématique (même méthode de génération, seuil identique visé pour chacune), elle ne devient pas arbitraire.
- CLÔTURE : compromis du tour 2 retenu. Motif : une contrainte dure du brief (Story S3, seuil de contraste) l'emporte toujours sur une préférence de simplicité de formule. Réversible : oui, à coût faible — changer un L par ligne dans le bloc de tokens.

Palette finale (calculée, vérifiée) :

| Nom | Teinte H | Badge plein (checkbox, icône) | Fond de carte (texte = `--ink`) |
|---|---|---|---|
| Terracotta | 11° | `#D25C41` (contraste 3.93 vs blanc) | `#F7EBE8` (13.08 vs ink) |
| Corail | 345° | `#D24165` (4.48) | `#F7E8EC` (12.87) |
| Ambre | 35° | `#C6872F` (3.04) | `#F7F1E8` (13.59) |
| Émeraude | 155° | `#27A571` (3.13) | `#E8F7F1` (13.81) |
| Sarcelle | 180° | `#26A1A1` (3.14) | `#E8F7F7` (13.87) |
| Azur | 205° | `#4196D2` (3.22) | `#E8F1F7` (13.34) |
| Indigo | 245° | `#4D41D2` (6.99) | `#E9E8F7` (12.61) |
| Mûre | 285° | `#AE41D2` (4.68) | `#F4E8F7` (12.89) |

Décision annexe qui découle de ce débat : le texte porté par les cartes teintées utilise `--ink` (#2B2420), pas `--ink-soft` (#7A7168) qui était calibré pour le fond crème neutre et tombe sous le seuil sur plusieurs teintes pastel. `--ink-soft` reste utilisé partout ailleurs (fond neutre inchangé).

## Re-cadrage partiel — retours sur le mockup test décisif (2026-09-05, après premier mockup)

Ce qui est invalidé : rien du brief verrouillé n'est contredit — ces points étaient explicitement listés "non tranchés" dans le mockup lui-même (bandeau + légende), donc leur clarification n'invalide aucune décision antérieure, elle referme des points restés ouverts à dessein.

Sections rejouées : uniquement la forme du badge et l'agencement du header de carte (section 4 du brief, détail visuel non spécifié à ce niveau de granularité), plus deux ajouts hors périmètre initial du brief (salutation, couleur de la barre IA) — traités ci-dessous.

1. **Badges** : carré à coins arrondis (comme l'image de référence d'origine), pas de cercle. Rayon = `--n-radius-sm` (10px), cohérent avec l'échelle déjà posée plutôt qu'une nouvelle valeur.
2. **Header de carte** : icône et titre côte à côte (ligne horizontale), plus empilés verticalement. Écart volontaire par rapport à l'image de référence d'origine (qui empile) — préférence explicite de l'utilisateur sur le mockup testé.
3. **Barre de saisie IA (compose bar)** : ajout d'une icône sparkle ✨ dans le champ (structure de l'image de référence, absente du premier mockup — oubli à corriger, pas un choix). Bouton d'envoi et glow en vert plutôt qu'en terracotta — **override scopé** de la doctrine "accent chrome = terracotta partout" (brief section 4). Le vert réutilise le token déjà existant `--status-actif` (#3F8A5C, contraste 4.2 vs blanc, vérifié) plutôt qu'une teinte inventée. Portée de l'override : uniquement le bouton d'envoi et le glow de la barre de saisie IA (accueil + toutes les barres IA contextuelles de l'app, pour rester cohérent entre elles) — le terracotta reste l'accent de tout le reste du chrome (top bars, boutons génériques, écrans auth).
4. **Salutation** : ajoutée, hors périmètre du gate initial. Texte choisi par l'utilisateur : "Let's Go ! <Prénom>" — pas "Bonjour". Prénom dérivé de `session.user.email` (partie avant le @, capitalisée) — aucun nouveau champ en base, reste une refonte purement présentationnelle (calcul d'affichage côté client, zéro fonctionnalité nouvelle).

Motif de ces 4 clôtures : contrainte dure du brief absente ici (aucune des 4 ne touche sécurité/données/irréversible) → doctrine d'arbitrage "en cas d'ambiguïté sur le visuel : suivre la direction retenue" ne s'applique pas non plus (ce sont des préférences explicites de l'utilisateur, pas des ambiguïtés à trancher seul) → appliqué tel que demandé. Réversible : oui, coût faible (CSS uniquement pour 1-3, dérivation d'affichage pour 4).

## Re-cadrage partiel #2 — troncature des titres (2026-09-05, après mockup v2)

Ce qui est invalidé : rien — le Gardien de la clarté visuelle a repéré sur le mockup v2 que l'icône-à-côté-du-titre (point 2 du re-cadrage #1) tronque les titres longs sur les tuiles medium/small ("Anniversaire de Julie" → "Anniv...", "Déménagement" → "Dé..."), remonté à l'utilisateur avant de continuer plutôt que silencieusement accepté.

Décision : icône + titre en ligne **uniquement sur les grandes tuiles** (`.tile.big` / `size-large` en production). Sur medium et small, retour à l'empilement (icône au-dessus du titre, 2 lignes autorisées). Choix de l'utilisateur, option 2 proposée.

**Point notable pour la Phase 3 :** cette règle se branche directement sur `sizeClassFor()`, déjà présent dans `index.html` (calcule size-tiny/small/medium/large pour chaque tuile du treemap) — zéro nouvelle logique JS, uniquement une règle CSS conditionnelle par classe existante. Coût d'implémentation quasi nul.

Motif : doctrine d'arbitrage "fiable > évident > beau" — un titre tronqué est un vrai coût de fiabilité de lecture, la cohérence esthétique totale (icône à côté partout) cède devant ça. Réversible : oui, une règle CSS à retirer.

## Re-cadrage partiel #3 — retour "pas premium" (2026-09-05, mockup v2→v5)

Ce qui est invalidé : le mécanisme de couleur du re-cadrage #1 (badge solide + carte pastel comme deux valeurs indépendantes). Ce qui tient : le principe même de couleur par projet (point 2 du gate), l'architecture à 3 niveaux (point 4), les 8 teintes de base (juste redéclinées différemment).

Sections rejouées : uniquement le mécanisme de génération des tokens projet (primitives niveau 1) et le fond d'app (`--n-canvas`). Rien d'autre.

Nouveau mécanisme : une seule base couleur par projet → 2 voiles de transparence (8% fond de carte, 28% badge — le badge plus opaque que la carte, comme demandé) + 1 solide réservé exclusivement au composant checkbox (coche blanche dessus, seul cas qui exige un vrai contraste de type texte/icône). Avant, badge et carte étaient deux points HSL choisis indépendamment ; maintenant ils dérivent mathématiquement de la même base, ce qui est à la fois plus fidèle à l'image de référence et plus rigoureux comme système de tokens (moins de valeurs arbitraires).

Fond d'app : `--n-canvas` passe de #FAF6F1 (crème, brief initial) à #FCFBFA (quasi blanc) en deux temps (#F8F7F5 puis encore éclairci) — écart explicite au brief verrouillé, confirmé par l'utilisateur après qu'il a été signalé comme touchant tous les écrans, pas que l'accueil.

Corrections de finition supplémentaires : badges agrandis (38/30px → 44/36px), relief ajouté (ombre douce 0 2px 10px, retirée puis remise — le retrait total en v4 avait été perçu comme "pas premium"), anneau de statut en bordure fine (inset) plutôt qu'en conic-gradient épais, gap resserré (16px→8px), grille de points du fond retirée, icône+titre centrés et empilés sur toutes les tailles de tuile (remplace la règle taille-dépendante du re-cadrage #2 — préférence explicite plus récente qui prime).

Motif : aucune contrainte dure touchée (pas de sécurité/données/irréversible), préférence esthétique explicite et itérée de l'utilisateur sur 5 versions de mockup jusqu'à validation. Réversible : oui, coût faible (uniquement des valeurs de tokens et 2 propriétés CSS par composant).

Signal de réussite du test décisif (brief.md section 0) : **atteint** à la v5 — validation explicite sans réserve, feu vert donné pour la Phase 3.

## Re-cadrage partiel #4 — retour après application en Phase 3 (2026-09-05)

Ce qui est invalidé : les valeurs de `--canvas` et du voile "carte" (8%). Rien d'autre — badges (28%), solides (checkbox), mécanisme à 3 niveaux, tout le reste tient.

- `--canvas` / `--canvas-card` : #FCFBFA → #FFFFFF (blanc pur, les deux identiques). La séparation visuelle entre fond d'app et cartes repose désormais uniquement sur `--shadow-card` et les voiles de couleur — cohérent avec l'esthétique "premium plate" déjà engagée en v4/v5.
- Voile carte projet : 8% → 5% de mix avec blanc, sur les 8 teintes. Concerne toutes les surfaces qui l'utilisent (category-card, next-action-card, tuiles treemap, tile-body) — un seul token modifié, pas d'exception locale sur les category-card seules, pour ne pas casser la cohérence du système.

Motif : préférence esthétique explicite, aucune contrainte dure touchée. Réversible : oui, 9 valeurs hex à changer.

## Re-cadrage partiel #5 (2026-09-05)

- Emoji : agrandis à ~80% du cadre du badge sur tous les composants qui en ont un (tuiles treemap 44px→35px de police / 32px→26px en tuile réduite, ligne de task list 32px→26px, chip de filtre 40px→31px). Motif : lisibilité + présence visuelle, préférence explicite.
- Cartes de catégorie : nouveau token dédié `--proj-*-card-faint` (2.5% de mix, moitié du 5% des autres surfaces teintées) — distinct de `--current-proj-card` utilisé ailleurs (bandeau prochaine action, tuiles). Motif : demande explicite ciblée sur "catégorie" spécifiquement, pas une baisse globale — a justifié un token séparé plutôt qu'une modification du token partagé.

## Re-cadrage partiel #6 (2026-09-05)

- Emoji : 80% → 70% du cadre (badges 44/32/40px → police 31/22/28px selon composant).
- Cartes de catégorie : `--proj-*-card-faint` 2.5% → 1.5% de mix (encore 40% plus léger), quasi indissociable du blanc pur désormais — appliqué uniquement à ce token, pas aux autres surfaces teintées (bandeau prochaine action, priorités, tuiles) qui restent à 5%.

## Re-cadrage partiel #7 (2026-09-05)

- Tâches prioritaires (`.priority-block-item`, `.step-row.priority`) : nouveau token `--proj-*-priority` à 20% de mix (distinct du badge 28%).
- Bouton "C'est fait" (`.next-action-row .btn-primary`) : nouveau token `--proj-*-btn` à 50% de mix. **Vérification de contraste faite avant application** : à 50%, le texte blanc tombait à 1.68-2.38 de contraste (très en dessous du seuil 3:1 pour un élément de cette taille) — le texte du bouton passe donc de blanc à `--ink`, qui lui atteint 6.41-9.08 sur les 8 teintes. L'icône checkmark (SVG `currentColor`) suit automatiquement. Le bandeau "Vous l'avez fait" (accompli-banner, distinct du bouton, texte blanc sur solide) n'est pas concerné — pas visé par la demande.

## Re-cadrage partiel #8 (2026-09-05)

- "Prochaine action" (`.next-action-card`) : nouveau token dédié `--proj-*-next` à 14% (50% de moins que le 28% partagé avec le badge jusqu'ici — n'était pas encore distingué).
- Tâches prioritaires : `--proj-*-priority` 20% → 10% (50% de moins).
- Les deux visent le même registre de pâleur que les badges de l'accueil (28%), sans viser une égalité stricte — contraste vérifié, minimum 12.4 sur les 16 valeurs, seuil 4.5.

## Re-cadrage partiel #9 (2026-09-05) — annule une partie du point 2 du gate initial

Ce qui est invalidé : la moitié de la décision du point 2 au gate ("couleur = identité projet + anneau de statut superposé", option C). L'anneau du treemap n'encode plus le statut (actif/ralentit/pause/accompli) — il prend la couleur du badge du projet, sur demande explicite ("aucun contour [différent] sur les badges... la barre de progression autour des badges est de la couleur des badges").

Ce qui tient : l'arc du conic-gradient continue d'encoder la progression en % (mécanisme inchangé), seule sa couleur change de source (statut → projet).

Conséquence factuelle à connaître : un projet qui ralentit ou est en pause n'a plus de signal visuel distinct sur l'accueil — tous les rendus se colorent désormais selon l'identité du projet uniquement. Appliqué tel quel, non re-questionné, car c'est la suite logique de toutes les demandes de cette session (couleur de projet partout, y compris là où c'était jusqu'ici réservé au statut).

## Décisions d'exécution (non structurantes)
- 2026-09-05T18:20 — Palette générée par script Python (formule HSL + calcul WCAG réel, pas estimé), voir Décision #1 (agent : Directeur artistique + Auditeur de contraste)
- 2026-09-05T19:05 — Contraste vert `--status-actif` vs blanc vérifié (4.2, seuil 3:1) avant de l'adopter pour la barre IA (agent : Auditeur de contraste)
- 2026-09-05T19:20 — Bug de mise en page du mockup (3e tuile de la rangée débordait) corrigé avant présentation — `min-width:0` + `overflow:hidden` en cascade, artefact du mockup uniquement, sans rapport avec l'algorithme squarify réel (agent : Constructeur)

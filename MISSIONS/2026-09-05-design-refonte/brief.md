# BRIEF — Refonte design DROPIT

Statut : VERROUILLÉ le 2026-09-05 (gate franchi)
Choix confirmés : périmètre accueil = A (treemap conservé), couleur = C (identité projet + anneau statut), tokens = B (architecture 3 niveaux). Écart au défaut : direction palette = **B, Palette Étendue** (l'utilisateur a choisi la rupture colorée, pas l'évolution "Carnet Chaud" recommandée par défaut). Détail dans `decisions.md`.

Les références citées sont des exemples pour fixer une densité, un rythme, un ton — jamais à reproduire trait pour trait, sauf mention contraire.

---

## 0. À retenir

- Verdict : lancer — gate franchi le 2026-09-05
- Risque n°1 : contraste texte/fond sur cartes colorées — traité et vérifié réellement (calcul WCAG, pas estimation) dans `decisions.md` Décision #1. Badges pleins ajustés teinte par teinte pour ≥3:1, fonds de carte tous ≥12.6:1 avec `--ink` comme texte
- Test décisif minimal : un mockup HTML de l'accueil seul, avec les vraies données du compte, dans la direction Palette Étendue — avant tout token system complet sur les 2900 lignes

**Choix verrouillés (voir `decisions.md` pour le détail) :**
1. Périmètre : A — treemap conservé, habillage seul
2. Couleur : C — identité de projet (stable partout) + anneau de statut superposé
3. Direction : B — Palette Étendue, 8 teintes vives dérivées d'une formule commune
4. Tokens : B — architecture 3 niveaux (primitives → sémantique → composant)

Si tu ne dis rien sur l'un de ces points, le défaut s'applique et devient une hypothèse verrouillée du brief.

---

## 1. Intention

- **Job To Be Done** : quand j'ouvre DROPIT plusieurs fois par jour pour piloter mes projets, je veux que l'app ait une identité visuelle forte et chaleureuse qui donne envie de l'ouvrir, afin qu'elle sorte du gris utilitaire des sessions précédentes sans rien perdre de ce qui marche déjà.
- **Action clé** : inchangée — cocher une tâche, voir la prochaine action. La refonte ne touche à aucun geste.
- **Utilisateur** : toi seul, usage mobile quotidien, plusieurs sessions par jour, déjà familier de l'app.

---

## 2. Périmètre

**Dans cette mission**
- Design system complet : palette (primitives → sémantique → composant), rayons, ombres, typographie, badges
- Application du design system sur tous les écrans existants : accueil (treemap, habillage seul par défaut), vue projet mono/multi-catégorie, vue catégorie, task list globale, chat IA, notes, écrans d'authentification, feuille de compte
- Reprise des 3 micro-effets validés par la session de maquettes précédente : glow sur le bouton d'envoi, accent coloré par projet, checkbox "fait" colorée par projet
- Un mockup basse fidélité de l'accueil avant le chantier complet (test décisif)

**Explicitement hors de cette mission**
- Aucun changement de comportement, de logique, d'API, de structure de données
- Aucune nouvelle fonctionnalité
- Pas de bascule structurelle de l'accueil vers une grille de cartes, sauf si tu choisis l'option B du point périmètre
- Pas de dark mode (non demandé, non traité — à cadrer séparément si voulu un jour)
- Pas de refonte des icônes SVG existantes (elles sont déjà cohérentes en style ligne, on les recolore via `currentColor`, on ne les redessine pas)

Un périmètre sans exclusions écrites n'est pas un périmètre.

---

## 3. Références produit

| Référence | Ce qu'on en prend | Ce qu'on n'en prend pas |
|---|---|---|
| Duolingo (DesignMD, 2026) | Rayons généreux (16-20px), badges pleins colorés, couleur qui code une info réelle | La saturation très haute, le ton gamifié |
| Notion (DesignMD, 2026) | Cartes aux teintes pastel qui codent un type de contenu | La densité d'information très haute des bases de données |
| Monzo (UX Paradise / Creative Bloq, 2026 — hors secteur) | Une couleur de marque forte + couleur codée = information réelle, jamais décorative | L'univers "néobanque" trop sobre pour l'esprit chaleureux visé |
| Image de référence utilisateur | Structure de carte, badge emoji circulaire, densité, pills catégorie, barre IA en bas | La palette multicolore assignée sans lien avec une donnée (remplacée par identité de projet dérivée, stable) |
| `MOCKUPS/design_v1.html` (session interne 2026-09-03) | Le consensus des 3 micro-effets (glow, bande couleur, checkbox colorée) | Les 3 directions elles-mêmes (jamais choisies, on ne les relitige pas) |

**Anti-références** (à ne jamais produire)
- Dashboard aux couleurs de carte assignées au hasard sans formule commune ("généré par IA")
- Cartes pastel très claires avec texte gris clair dessus (échec de contraste)
- Ombres et gradients lourds animés en nombre sur la grille (coût de rendu mobile)

---

## 4. Direction artistique exécutable — Palette Étendue v5 (verrouillée après test décisif)

Source de vérité : `livrables/design-tokens.md` (v5, finale) — ne pas dupliquer les valeurs ici, elles ont évolué sur 5 itérations du mockup (`decisions.md`, re-cadrages #1/#2/#3) et ne doivent exister qu'à un seul endroit.

```
Typographie   : famille système actuelle inchangée, échelle élargie à 6 paliers (11/13/15/17/19/22px)
Fond app      : quasi blanc (#FCFBFA), écart confirmé au brief initial (#FAF6F1) — touche tous les écrans
Chrome        : accent terracotta #BF5B44 inchangé (boutons génériques, top bars, auth)
Chrome IA     : vert (réutilise --status-actif existant), scopé à la barre de saisie IA uniquement
Projet        : 8 teintes, une base par teinte → voile 8% (carte) + voile 28% (badge) + solide réservé
                au composant checkbox — mécanisme et calcul complet dans design-tokens.md et contraste.md
Assignation   : couleur dérivée de façon déterministe de l'id du projet, pas aléatoire
Texte sur carte teintée : --ink (#2B2420), jamais --ink-soft
Badges        : carré arrondi (10px), 44px (grandes tuiles) / 36px (petites) — jamais de cercle
Header carte  : icône + titre centrés, empilés — sur toutes les tailles de tuile
Rayons        : 18px cartes, 12px éléments moyens, 10px petits éléments
Ombres        : léger relief (0 2px 10px, ~7% opacité) — pas d'ombre dure, pas d'absence totale
Statut        : anneau fin en bordure (inset), pas de conic-gradient épais — indépendant de la couleur
                de projet, les deux signaux coexistent sans se marcher dessus
Densité       : équilibrée, gap resserré entre cartes (8px), grille de points de fond retirée
Ton éditorial : direct, chaleureux — inchangé
```

**Contrainte non négociable, quelle que soit la direction retenue :**
Chaque paire fond de carte / couleur de texte utilisée doit atteindre 4.5:1 de contraste (texte normal) ou 3:1 (grand texte, éléments non textuels) — vérifié composant par composant avant livraison, pas estimé à l'œil.

**Images** — famille : aucune (emoji existants conservés tels quels, recolorés via badge circulaire teinté).

---

## 5. Stories et critères d'acceptation

```
Story S1 — Aucune régression fonctionnelle
  Étant donné n'importe quel écran de DROPIT avant la refonte
  Quand la refonte visuelle est appliquée
  Alors chaque bouton, chaque geste, chaque appel API se comporte exactement comme avant

Story S2 — Identité de projet reconnaissable (si option couleur = identité retenue)
  Étant donné un projet avec une couleur assignée
  Quand ce projet apparaît sur l'accueil, dans la task list, dans ses propres tâches
  Alors sa couleur est strictement identique partout, et stable d'une session à l'autre

Story S3 — Contraste garanti
  Étant donné n'importe quelle carte ou badge coloré de l'app
  Quand un texte ou une icône est posé dessus
  Alors le contraste mesuré atteint au moins 4.5:1 (texte normal) ou 3:1 (grand texte / icône)

Story S4 — Design system centralisé
  Étant donné une future demande de changement de teinte ou de rayon
  Quand on modifie la valeur dans le bloc de tokens primitifs
  Alors le changement se répercute partout sans toucher aux 247 règles de composant
```

---

## 6. Technique et données

- Stack imposée : fichier unique `index.html`, CSS natif (variables CSS), vanilla JS — aucune dépendance nouvelle
- Hébergement : Cloudflare Pages, inchangé
- Entités et relations : aucune, refonte purement présentationnelle
- Données personnelles : aucune donnée nouvelle traitée
- Source de vérité en cas de conflit visuel : ce brief, puis l'image de référence utilisateur, puis les références de recherche
- Maintenance à six mois : toi ou une session Claude Code future — d'où l'exigence de tokens centralisés (section 4)

---

## 7. Doctrine d'arbitrage

- Priorité générale : fiable (zéro régression) > évident (cohérence visuelle immédiate) > beau
- En cas d'ambiguïté sur le périmètre : trancher au plus petit changement de structure (garder le treemap, l'algorithme, la logique JS — habiller seulement)
- En cas d'ambiguïté sur le visuel : suivre la direction A "Carnet Chaud" (évolution de l'existant), pas une rupture totale
- En cas de conflit contraste / fidélité à l'image de référence : le contraste gagne toujours, sans exception
- Budget par lot : un écran = un lot, revue de cohérence après chaque lot avant de passer au suivant

Sans cette section, l'exécution autonome s'arrête à la première ambiguïté.

---

## 8. Succès et points d'arrêt

**Indicateurs de succès à la livraison**
- 9 écrans passés en revue manuelle, comportement identique à avant (liste exhaustive en section 2)
- 100% des paires carte-couleur/texte au-dessus du seuil WCAG AA, vérifié
- Zéro couleur en dur hors du bloc de tokens (recherche automatisée dans le fichier avant livraison)
- Toi, en un coup d'œil sur l'app déployée : validation explicite

**Actions exigeant un accord humain**
- Déploiement en production (push + Cloudflare) — capture ou lien de preview montré avant

Tout le reste avance sans validation intermédiaire.

---

## 9. Trajectoire et équipe

- Trajectoire retenue : interface riche (refonte visuelle d'une app existante)
- Motif : app déjà en production, usage réel quotidien établi, aucune incertitude de marché à trancher
- Socle : orchestrateur, constructeur, vérificateur
- Agents créés pour cette mission : voir `equipe.md`
- Porteurs des trois exigences : fiabilité → Vérificateur non-régression, simplicité → Gardien du geste unique, élégance → Directeur artistique

---

## 10. Boucle d'apprentissage

- Données qui remontent : aucune télémétrie automatisée (app personnelle) — le signal est ton usage quotidien après livraison
- Échéance de revue : à la prochaine session DROPIT, ressenti à chaud
- Seuil de révision : si un écran te semble moins lisible qu'avant, ou si tu perds la lecture immédiate du statut d'un projet sur l'accueil (risque identifié en section 2 du dossier de choix) → révision ciblée, pas un recadrage complet

---

## 11. Rythme

Un compte rendu par lot (par écran) : fait / en cours / bloqué, plus « à trancher » plafonné à 3 points. Le feu vert initial (section 0) couvre l'intégralité de la Phase 3 — pas de point d'arrêt intermédiaire sauf ligne rouge touchée (déploiement production).

# CADRAGE — DROPIT MVP UX Push
Mission : `2026-09-02-mvp-ux-push`
Date : 2026-09-02  ·  Statut : EN ATTENTE DE VALIDATION

---

## 1. Reformulation de l'objectif

Pousser le MVP DROPIT jusqu'au bout de son principe fondateur — "l'utilisateur ne pense pas, ne réfléchit pas, ne tape pas" — en ajoutant deux fonctions critiques (priorités IA + panneau recherche contextuelle par tâche) et en polissant l'expérience existante jusqu'à ce qu'il n'y ait aucun choix à faire à aucun moment.

---

## 2. Définition de "fini"

- Code déployé sur dropit-dbx.pages.dev, fonctionnel end-to-end.
- Zéro placeholder dans le code livré.
- Les 3 fonctions opérationnelles et testées navigateur :
  1. Priorités IA : tâches ordonnées par l'IA dès la génération + bouton "Reclasser" sur le projet.
  2. Panneau recherche IA par tâche : icône sur chaque tâche → appel IA contextualisé → checkboxes déployables → persistants même après cochage.
  3. UX polish : vue détail projet en mode focus strict (une tâche principale visible, suite masquée par défaut).

---

## 3. Hypothèses prises

- H1 : On ne touche pas le treemap d'accueil. Le polish se concentre sur les vues Détail Projet et Détail Catégorie.
- H2 : Pas de profil utilisateur. Le contexte IA pour la recherche = titre projet + résumé + titre de la tâche.
- H3 : Le panneau recherche IA utilise la même route /api/ai (pas de nouvelle Cloudflare Function).
- H4 : "Reclasser" au niveau projet uniquement (pas par catégorie individuelle).
- H5 : Le polish UX ne touche pas le CSS global — ajouts ciblés uniquement.

---

## 4. Cartographie des tâches

| # | Tâche | Expert ? | Outil |
|---|---|---|---|
| T1 | Décider + implémenter focus strict (1 tâche visible) | OUI — Expert UX Comportemental | index.html |
| T2 | Décider + implémenter panneau recherche IA | OUI — Expert AI Product Designer | index.html |
| T3 | Prompt priorité IA (génération + reclassement) | Non | index.html + /api/ai |
| T4 | Implémenter panneau recherche IA par tâche | Non (dépend T2) | index.html + /api/ai |
| T5 | Focus strict : masquer suite + lien "Voir la suite (N)" | Non (dépend T1) | index.html |
| T6 | Bouton Reclasser au niveau projet | Non | index.html + /api/ai |
| T7 | Audit qualité + test navigateur end-to-end | Non | Playwright |
| T8 | Commit + push + vérification live | Non | git |

---

## 5. Panel d'experts

### Expert A — Behavioural UX Designer (Zero-Friction)

Intitulé : Designer d'interfaces à charge cognitive zéro, spécialisé en systèmes d'aide à la décision progressive pour utilisateurs en surcharge mentale.

École de pensée : Progressive disclosure + Atomic UX. Chaque écran = 1 décision maximum. Tout le reste est masqué jusqu'à ce que ce soit pertinent. Inspiré de Goblin.tools Taskmaster (1 tâche à la fois, cache tout le reste), Duolingo (1 bouton vert, zéro autre option visible), et l'UX ADHD-friendly.

Méthodes :
1. Taps-to-task : réduire le nombre d'interactions avant l'action productive. Objectif : 1.
2. Information hiérarchique stricte : niveau 0 (toujours visible) / niveau 1 (sur demande) / niveau 2 (jamais au premier plan).
3. Élimination active : tout élément qui n'aide pas l'action immédiate est retiré du DOM, pas juste dé-emphasisé.

Secret sauce : La révélation progressive doit avoir une friction minimum mais visible — un lien "Voir la suite (3)" suffit. Le chiffre rassure sans montrer.

Biais : Peut aller trop loin dans la suppression et cacher des informations utiles à la décision.

---

### Expert B — AI Product Designer (Contextual Inline AI)

Intitulé : Designer de produits IA natifs, spécialisé dans l'intégration d'assistants contextuels directement dans les flows de travail sans rupture de contexte.

École de pensée : AI-as-infrastructure. L'IA ne ressemble pas à un "bouton AI" séparé — elle s'intègre comme extension naturelle de l'objet sur lequel on travaille. Références : Notion AI (inline dans le bloc), Grammarly (sous la phrase, ne prend pas le focus), Linear Copilot (suggestions dans le contexte de l'issue).

Méthodes :
1. Apparition contextuelle : le panneau IA s'ouvre là où l'objet est, pas dans un coin de l'écran.
2. Accept/partial/reject in place : l'utilisateur ne quitte jamais sa tâche pour gérer le résultat IA.
3. Résultat condensé par défaut : titre de l'option, 1 ligne — jamais un paragraphe.

Secret sauce : Le panneau doit s'ouvrir SOUS la tâche, sur toute la largeur, avec un bouton "Appliquer la sélection" + cases individuelles. Checkbox multi-select + "Appliquer" = pattern le plus rapide prouvé.

Biais : Peut sous-estimer la complexité d'implémentation d'un inline panel sur mobile.

---

## 6. Benchmark de cadrage

| Produit | Pattern extrait | Ce qu'on prend |
|---|---|---|
| Goblin.tools Taskmaster | 1 tâche visible, les autres masquées, lien "next" | Architecture "une seule chose active", lien discret "Voir la suite (N)" |
| Duolingo | 1 bouton d'action dominant, aucune alternative visible pendant l'action | Hiérarchie visuelle absolue : 1 CTA énorme, tout le reste invisible |
| Notion AI inline | Panneau IA sous le bloc actif, accept/reject sans quitter | Ouverture sous la tâche, checkboxes inline, bouton "Appliquer" |
| Linear Copilot | Suggestions contextuelles basées sur titre + projet, sans prompt utilisateur | Déclenchement automatique du contexte sans que l'utilisateur écrive |
| Arc Search | 2 taps to answer vs 8 — mesure taps-to-task comme KPI design | Obsession de réduire les interactions avant le résultat utile |

---

## 7. Options de fond — CHOIX À FAIRE

### Option A — Profondeur du focus strict (décision structurante #1)

A1 (recommandée) — Masquer complètement la suite
Dans la vue détail projet à une catégorie, seule la "Prochaine action" est visible. La section "Ensuite" est masquée, remplacée par un lien "Voir la suite (N tâches)".
+ Charge cognitive minimale · inspiré Goblin.tools
− L'utilisateur peut croire que le projet est court / incomplet

A2 — Dé-emphasiser la suite
La section "Ensuite" reste visible mais en opacité réduite (40%) et taille plus petite.
+ Plus de contexte visible
− L'œil se disperse quand même (eye-tracking studies)

→ Ton choix : ______

---

### Option B — Design du panneau recherche IA (décision structurante #2)

B1 (recommandée) — Inline déployable sous la tâche
Le panneau s'ouvre directement sous la ligne de tâche, pousse les éléments suivants vers le bas. Fermable, persistant.
+ Zéro rupture de contexte · facile à implémenter dans le DOM actuel

B2 — Drawer latéral ou modal
+ Indépendant du flow de liste
− Rupture de contexte, masque la liste, complexité JS supérieure

→ Ton choix : ______

---

### Option C — Affichage des priorités (décision structurante #3)

C1 (recommandée) — Ordre implicite uniquement
L'IA ordonne les tâches à la génération (déjà le cas) + bouton "Reclasser" qui réordonne les restantes. Pas de badge visible. L'ordre EST la priorité.
+ Propre, zéro charge visuelle · le "Reclasser" donne le contrôle

C2 — Badge P1/P2/P3 coloré sur chaque tâche
+ Visible immédiatement
− Charge visuelle sur chaque ligne, sentiment "to-do list corporate"

→ Ton choix : ______

---

### Option D — Portée du redesign (décision structurante #4)

D1 (recommandée) — Vues Détail uniquement
On ne touche pas le treemap d'accueil.
+ Risque zéro sur la feature la plus visible · scope maîtrisé

D2 — Treemap + Détail
On améliore aussi le treemap (animation d'entrée, micro-interactions sur hover).
+ Expérience plus complète
− Complexité supplémentaire, risque de régression

→ Ton choix : ______

---

## 8. Lignes rouges

- Ne pas toucher les variables CSS globales sans raison explicite.
- Ne pas exposer de clé API côté client.
- Ne pas casser les features existantes (génération, suggestion, persistence Supabase).
- Ne pas pousser sans vérifier que le déploiement Cloudflare passe.
- S'arrêter si une feature requiert une nouvelle Cloudflare Function (hors périmètre).

---

## 9. Grille qualité (Système / code)

| Critère | Poids |
|---|---|
| Un tiers peut exécuter sans question (zéro TODO dans le code) | 30 |
| Chaque feature a un critère de "fait" vérifiable (test navigateur) | 20 |
| Outils disponibles et fonctionnels (Cloudflare Pages) | 20 |
| Cas d'échec gérés (IA indisponible → graceful degradation) | 15 |
| Fondé sur des patterns UX éprouvés (benchmark) | 15 |

Seuil : 80/100.

---

## 10. Plan de phases

| Phase | Contenu | Durée estimée |
|---|---|---|
| 0 | Cadrage (ce doc) | fait |
| 2 | Débat experts sur A/B/C/D | 15 min |
| 3 | Production T1→T8 | 90 min |
| 4 | Audit + test navigateur | 20 min |
| 5 | Livraison + push | 10 min |

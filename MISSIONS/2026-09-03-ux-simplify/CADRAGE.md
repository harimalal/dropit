# CADRAGE — DROPIT UX Simplification : IA / Notes / Fiche

Date : 2026-09-03  ·  Dossier : /home/radoraj/DROPIT/MISSIONS/2026-09-03-ux-simplify  ·  Statut : EN ATTENTE DE VALIDATION

> C'est le seul point d'intervention. Réponds dans le chat ou annote ce fichier.
> Choisis les options, corrige les hypothèses. GO → MAESTRO produit et déploie sans autre interruption.

---

## 1. Reformulation de l'objectif

Supprimer la friction des 3 features ajoutées (note par tâche, chat IA, fiche projet)
en adoptant des patterns "edit-in-place" et "AI on demand" — l'interface reste aussi simple
qu'avant ces ajouts, sans en perdre la valeur.

---

## 2. Définition de "fini"

- Note : 1 clic maximum pour voir et éditer la note d'une tâche. Note visible sans action.
- IA : 1 bouton/geste pour poser une question. Aucun espace occupé quand on ne l'utilise pas.
- Fiche : aucun bouton supplémentaire. Le résumé des décisions est accessible sans quitter la vue.
- index.html déployé sur Cloudflare Pages, 0 régression sur les features existantes.

---

## 3. Hypothèses prises  →  ✅ confirmer / ✏️ corriger

- H1 : La note par tâche reste pertinente, mais le toggle "+ note" est trop discret et nécessite trop de clics.
- H2 : Le chat IA catégorie est utile mais trop présent — prend de la place même quand l'utilisateur n'en a pas besoin.
- H3 : La fiche projet comme panneau séparé est un doublon — si les notes sont visibles inline, la fiche n'ajoute plus de valeur distincte.
- H4 : On garde le bouton "Suggérer la suite" existant. On ne touche pas aux features research par tâche, check, supprimer.
- H5 : Tout reste dans index.html, pas de nouveau fichier.

---

## 4. Cartographie des sous-tâches

| # | Sous-tâche | Livrable | Expert | Outil |
|---|---|---|---|---|
| 1 | Redesign note par tâche | Note toujours visible, edit in place | Non | Edit index.html |
| 2 | Redesign IA | Bouton flottant léger, IA on-demand | Oui — UX pattern critique | Edit index.html |
| 3 | Supprimer fiche projet | Retirer le bouton + le panel | Non | Edit index.html |
| 4 | Nettoyage CSS | Supprimer les classes orphelines | Non | Edit index.html |
| 5 | Déploiement | git push origin main | Non | Bash |

---

## 5. Expert retenu — 1 seul

### UX Lead — Productivity Apps Mobile (Things 3 / Linear / Craft)
- École : "Edit in place" + "AI on demand" — UI qui ne prend d'espace que quand utilisée
- Méthodes : tap-to-expand, floating action button, single-action AI, progressive disclosure
- Angle unique : dans les task apps, toute UI permanente qui n'est pas une tâche = distraction
- Hacks : la note doit être visible sans être cliquée (sinon l'utilisateur oublie qu'elle existe)
- Biais : peut sur-simplifier au point de rendre la feature introuvable

---

## 6. Benchmark de cadrage

- Things 3 (iOS) — tâche = titre + note toujours visible en gris sous le titre. Tap sur la tâche → fiche détail. Pattern retenu : note affichée passivement, pas de toggle.
- Linear — AI via "/" in-context, jamais un panel permanent. Pattern retenu : AI on-demand, 0 espace quand non utilisée.
- Craft — "Ask AI" = Cmd+J = overlay minimal qui ferme dès qu'on a la réponse. Pattern retenu : chat ne vit pas dans la page, vit dans un overlay léger qui s'ouvre et se ferme.
- Apple Reminders — note sous le titre, toujours visible, couleur plus claire. Fiche = la tâche elle-même développée. Pattern retenu : pas de vue "fiche" séparée.

---

## 7. Options de fond  →  choisir une par choix

### Choix 1 : Comment les notes s'affichent et s'éditent

**Option A — Toujours visible, edit in place (inspiré Things 3 + Apple Reminders)**
La note est affichée sous le titre en gris clair dès qu'elle existe. Pour écrire une note : cliquer sur la zone note (ou placeholder "Ajouter une note…" cliquable). L'édition se fait directement dans la ligne sans bouton "OK" explicite — blur = sauvegarde.
→ Supprime le lien "+ note", le bouton OK, la gestion de noteEditingId.
→ Recommandé : le plus simple, zero toggle needed.

**Option B — Icône crayon sur la ligne de tâche**
Un petit crayon (icon btn) sur la droite de chaque tâche. Click → la note s'expande sous la ligne. Note toujours visible si renseignée.
→ Plus de clics qu'A mais moins de surprise pour l'utilisateur.

### Choix 2 : Comment l'IA s'accède

**Option A — Bouton flottant minimaliste en bas de la liste (inspiré Craft)**
Un lien texte discret "Demander à l'IA" tout en bas de la catégorie. Click → overlay léger (fond semi-transparent) avec une seule zone de texte + réponse. Ferme sur Escape ou clic hors zone. Aucun espace dans la page quand non ouvert.
→ Recommandé : 0 surface occupée au repos, même feeling que le chat actuel mais sans le panneau permanent.

**Option B — Garder le chat panel mais replié par défaut**
Le panel est masqué par défaut. Un bouton "Demander à l'IA" le révèle. Le panel reste mais ne s'affiche qu'à la demande.
→ Moins de refactoring, mais occupe toujours de la place quand ouvert.

### Choix 3 : Fiche projet

**Option A — Suppression pure (inspiré Apple Reminders)**
La fiche projet disparaît. La vue tâches avec notes inline EST la fiche. 0 bouton en plus.
→ Recommandé : cohérent avec Option A des notes (si la note est toujours visible, la fiche n'apporte rien).

**Option B — Renommée et intégrée dans le header projet**
Le "résumé des décisions" devient une ligne compacte dans le header du projet (sous le titre), qui liste le nombre de tâches documentées. Click → scrolle vers la première tâche avec une note.
→ Garde une trace visible de l'avancement des décisions sans panneau séparé.

---

## 8. Décision structurante — débat expert

Une seule : **Comment intégrer l'IA sans qu'elle prenne d'espace permanent ?**
Le panel chat actuel va à l'encontre du principe DROPIT (focus sur la prochaine action). L'expert tranchera entre overlay modal léger (Option A2) vs panel replié (Option B2).

---

## 9. Qualité

| Livrable | Critère | Seuil |
|---|---|---|
| index.html | 0 feature cassée, note visible sans clic, IA accessible en 1 clic | Tests navigateur |
| index.html | CSS orphelins supprimés | grep zéro classe unused |

---

## 10. Lignes rouges

- Ne pas toucher à : check tâche, supprimer tâche, recherche IA par tâche, suggest, add item, treemap home.
- Ne pas changer la structure des données persistées (clé `note` sur les items → garder).
- Ne pas ajouter de nouvelles dépendances ou fichiers.

---

## 11. Plan de phases

| Phase | Contenu | Effort | Modèle |
|---|---|---|---|
| 1 | Benchmark (fait ci-dessus) | — | — |
| 2 | Débat expert : IA overlay vs panel | 10 min | Sonnet |
| 3 | Production : notes + IA + suppression fiche | 30 min | Sonnet |
| 4 | Audit navigateur + nettoyage CSS | 10 min | Sonnet |
| 5 | git push + Cloudflare deploy | 5 min | Sonnet |

---

## ✅ VALIDATION UTILISATEUR

Choix à confirmer :
- Notes : A (toujours visible + edit in place) ou B (icône crayon) ?
- IA : A (overlay flottant) ou B (panel replié) ?
- Fiche : A (supprimer) ou B (intégrer dans header) ?

Écris "GO A A A" (ou tes variantes) et MAESTRO produit.

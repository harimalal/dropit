# Vivre — Dossier de transfert (Claude Code)

Document de passation pour reprendre le développement du projet **Vivre** dans Claude Code, à partir du prototype fonctionnel `vivre.html`.

---

## 1. Objectif

**Vivre** transforme une intention exprimée librement en projet concret et actionnable, structuré et fait progresser par l'IA.

> « On aimerait partir à Bali en septembre. »

L'application comprend l'intention, construit le projet (catégories + étapes concrètes adaptées au type de projet), met en avant la prochaine action utile, et fait progresser visuellement le projet jusqu'à son accomplissement.

Positionnement : pas un outil de gestion de tâches — un produit qui **supprime** la gestion de tâches. À terme (hors phase actuelle), positionné comme « le réseau social de l'accomplissement » : vouloir, contribuer, réaliser, se souvenir, à plusieurs.

Vivre est un pivot du projet précédent (« Cases », un gestionnaire de projets/notes en treemap) : le treemap d'accueil, le modèle récursif carte/sous-carte, et le classement automatique par IA en sont directement issus.

---

## 2. Cadrage — ce qui est dans le périmètre actuel

Le PRD d'origine (vision complète, voir §8) décrit un produit **collectif** avec intégrations réelles (réservations), avatars, notifications, animations. C'est une ambition de plusieurs mois, pas un MVP.

**Décision de cadrage validée** : construire d'abord la version **solo**, sans intégrations externes, pour valider l'hypothèse centrale — *une intention libre transformée en plan structuré et suivi réduit-elle vraiment la friction ?* — avant d'ajouter la couche collaborative.

### Explicitement hors périmètre pour cette phase
- Multi-utilisateur : invitations, participants, contributions attribuées, « à toi » (relais), notifications
- Intégrations réelles (réservation d'hôtel, billets, etc.) — remplacées par de la simple saisie manuelle
- Photo de couverture uploadée — remplacée par un emoji choisi par l'IA
- Animations « sparks » élaborées — remplacées par un indicateur de statut simple (couleur + mot)
- Édition riche (renommer un projet, changer l'emoji, réordonner, déplacer un élément entre catégories, drag & drop)
- Authentification / multi-compte

Ces points restent valides dans le PRD d'origine et sont des candidats naturels pour l'itération suivante, une fois la boucle solo validée (voir §7).

---

## 3. Résumé du concept validé

**Boucle centrale :**

1. L'utilisateur tape une intention libre dans une barre de saisie persistante.
2. L'IA génère : titre, emoji, résumé, et un **découpage en catégories** (aspects distincts du projet), chacune avec sa propre liste d'éléments concrets à cocher — adapté entièrement au type de projet (un déménagement n'a rien à voir avec un anniversaire).
3. L'utilisateur atterrit directement sur le projet créé. La **prochaine action** (premier élément non fait, tous catégories confondues) est mise en avant seule — principe « 1 vue → 1 décision → 1 action ».
4. Cocher une action fait avancer automatiquement le focus vers la suivante.
5. Un bouton **« Suggérer »** (au niveau du projet et au niveau de chaque catégorie) redemande à l'IA la suite pertinente, **en tenant compte de ce qui est déjà fait** — ne doit jamais re-proposer du contenu pour une catégorie déjà terminée.
6. À 100 %, le projet passe en état **Accompli** (bannière dédiée), plutôt que de disparaître ou s'archiver silencieusement.

**Accueil** : treemap des projets (réutilise l'algorithme squarify de Cases). Chaque carte affiche un anneau de progression dessiné sur son pourtour (CSS `conic-gradient`, pas d'images), coloré selon un statut d'activité dérivé de la date de dernière modification : Actif / Ralentit / En pause / Accompli.

---

## 4. État actuel — prototype livré

Fichier de référence : **`vivre.html`** — artifact HTML/CSS/JS autonome, sans dépendance externe, fonctionnel et testé (génération IA, navigation, suggestions contextuelles, migration de données).

### ⚠️ Dépendances propres à l'environnement Claude.ai — à remplacer impérativement

Le prototype tourne dans un artifact Claude et s'appuie sur deux API **qui n'existent pas** en dehors de cet environnement :

1. **Stockage** — `window.storage.get/set(...)`. C'est une API injectée par la plateforme Claude.ai, indisponible dans une app déployée. → **à remplacer par une vraie base de données** (Supabase déjà utilisé sur ARTEASY, cohérent avec la stack existante).
2. **Appel IA** — `fetch("https://api.anthropic.com/v1/messages", ...)` sans clé, car la plateforme Claude.ai proxy et authentifie la requête automatiquement dans un artifact. → **à déplacer côté serveur** avec une vraie clé API Anthropic (jamais exposée côté client), typiquement via une route backend ou une function n8n/Supabase Edge Function qui reçoit le prompt, appelle l'API, et renvoie le JSON.

Le reste du code (modèle de données, logique de rendu, prompts, algorithme de treemap) est directement réutilisable comme référence ou point de départ.

### Ce qui fonctionne dans le prototype
- Génération de projet complet depuis une intention libre (titre, emoji, résumé, catégories + éléments)
- Rendu adaptatif : projet à une seule catégorie → liste affichée directement ; projet à plusieurs catégories → cartes de catégories navigables
- Spotlight "prochaine action" calculé à travers toutes les catégories
- Suggestion contextuelle au niveau projet (ajoute à une catégorie existante incomplète, ou crée une nouvelle catégorie si le reste est terminé — ne touche jamais une catégorie déjà finie)
- Suggestion scopée au niveau d'une catégorie
- Ajout/suppression manuelle d'éléments et de catégories (garde-fou si l'IA est indisponible ou incomplète)
- État "Accompli" avec bannière dédiée
- Statut d'activité dérivé (Actif/Ralentit/En pause) à partir de `updatedAt`
- Migration silencieuse de l'ancien format à plat (v0, une seule liste par projet) vers le nouveau modèle à catégories
- Dégradation gracieuse : si l'appel IA échoue (réseau, JSON malformé), un projet minimal est quand même créé avec des étapes de départ — jamais d'impasse

---

## 5. Spécifications fonctionnelles

### 5.1 Modèle de données

```
Project {
  id: string
  title: string
  emoji: string            // un seul emoji, pas de photo dans cette phase
  summary: string          // résumé IA en une phrase
  categories: Category[]
  createdAt: ISODate
  updatedAt: ISODate        // sert au calcul du statut d'activité
}

Category {
  id: string
  title: string
  items: Item[]
  createdAt: ISODate
  updatedAt: ISODate
}

Item {
  id: string
  title: string
  done: boolean
  createdAt: ISODate
}
```

**Valeurs dérivées (calculées, non stockées) :**
- `progressPct(project)` = éléments faits / éléments totaux, tous catégories confondues
- `isAccompli(project)` = tous les éléments de toutes les catégories sont faits (et il y en a au moins un)
- `activityStatus(project)` = `accompli` si terminé ; sinon `actif` si modifié il y a < 2 jours, `ralentit` si < 7 jours, `pause` au-delà
- `nextActionItem(project)` = premier élément non fait, en parcourant les catégories puis les éléments dans l'ordre de génération

### 5.2 Parcours utilisateur

1. **Accueil** — treemap des projets. Barre de saisie persistante en bas (texte + bouton envoyer). Lien discret "Données d'exemple" pour réinitialiser en démo.
2. **Création** — l'utilisateur tape son intention → appel IA → projet inséré → navigation automatique vers le détail du nouveau projet.
3. **Détail projet** — emoji/titre/résumé, statut, barre de progression globale, spotlight "Prochaine action". Puis, selon le nombre de catégories :
   - 1 catégorie → liste des éléments affichée directement (pas de niveau de navigation en plus)
   - Plusieurs catégories → grille de cartes de catégories (titre + progression + fraction faite/total), + lien "+ Nouvelle catégorie", + bouton "Suggérer la suite" (scope projet)
4. **Détail catégorie** (si plusieurs catégories) — liste des éléments à cocher, ajout manuel, bouton "Suggérer" (scope catégorie), suppression de la catégorie.
5. **Accomplissement** — bannière dédiée quand 100 % est atteint, au lieu du spotlight.

### 5.3 Comportement IA — prompts actuels (à industrialiser côté serveur)

**a) Génération de projet depuis une intention**
Entrée : texte libre de l'utilisateur.
Sortie attendue (JSON strict) :
```json
{
  "title": "titre court (3-5 mots)",
  "emoji": "un seul emoji représentatif",
  "summary": "une phrase naturelle qui résume ce qu'il y a à faire",
  "categories": [
    {"title": "nom de la catégorie", "items": ["élément 1", "élément 2"]}
  ]
}
```
Consignes clés données au modèle :
- Regrouper par aspect logique et distinct du projet réel (achats/administratif/organisation/budget pour un déménagement — mais adapter entièrement selon le type de projet)
- 1 seule catégorie si le projet est simple ; entre 1 et 5 catégories sinon, chacune avec 3 à 7 éléments concrets et courts
- Ordonner catégories et éléments dans l'ordre logique de traitement : le tout premier élément de la première catégorie doit être la prochaine action la plus utile *maintenant*

**b) Suggestion contextuelle au niveau du projet** (bouton "Suggérer la suite")
Entrée : titre/résumé du projet + état complet de chaque catégorie (titre, et pour chaque élément : titre + fait/pas fait).
Sortie attendue (l'une des deux formes) :
```json
{"type": "add_items", "categoryId": "<id existant>", "items": ["...", "..."]}
{"type": "new_category", "category": {"title": "...", "items": ["...", "..."]}}
```
Règle critique : ne jamais proposer un élément qui recoupe une catégorie déjà entièrement terminée ; ajouter à une catégorie incomplète existante si pertinent, sinon proposer une nouvelle catégorie.

**c) Suggestion scopée à une catégorie** (bouton "Suggérer" dans une catégorie)
Entrée : titre du projet, titre de la catégorie, éléments faits/restants de cette catégorie uniquement.
Sortie attendue : tableau JSON de chaînes, 1 à 3 nouveaux éléments, sans doublon avec l'existant.

**Notes d'implémentation :**
- Modèle utilisé dans le prototype : `claude-sonnet-4-6`
- Toujours nettoyer la réponse des balises ```json``` éventuelles avant `JSON.parse`
- Toujours prévoir un fallback si l'appel échoue ou renvoie un JSON invalide (voir §4, dégradation gracieuse)

### 5.4 Système visuel

- Palette chaleureuse et distincte du produit précédent (Cases utilisait un violet froid) : fond crème (`#FAF6F1`), accent terracotta (`#BF5B44`), statuts Actif (vert `#3F8A5C`) / Ralentit (ambre `#C48A2E`) / Pause (gris `#A79E93`) / Accompli (terracotta, réutilise l'accent)
- Anneau de progression en CSS pur : conteneur avec `background: conic-gradient(couleur-statut calc(pct*1%), gris 0)`, padding de quelques pixels, contenu interne avec fond plein par-dessus — donne l'effet d'un contour qui se remplit sans SVG ni animation JS
- Grille de fond très subtile (papier quadrillé, `linear-gradient` à faible opacité) — signature déjà présente dans Cases, conservée pour cohérence de gamme
- Police système uniquement, pas de webfont externe

---

## 6. Fonctionnalités à ne pas régresser en migrant

Ces choix ont été spécifiquement validés après tests et ne doivent pas être simplifiés en repartant sur une vraie stack :

- Le découpage en catégories/sous-cartes générées par l'IA (pas un simple copier-coller de checklist plate)
- Le rendu adaptatif 1 catégorie → inline, plusieurs catégories → cartes (évite un niveau de navigation inutile sur les projets simples)
- La suggestion contextuelle qui respecte les catégories déjà terminées
- La dégradation gracieuse systématique (jamais d'impasse si l'IA échoue)

---

## 7. Pistes pour la suite (post-MVP solo)

Par ordre de dépendance logique :

1. **Backend réel** : Supabase (auth + DB), déploiement Netlify — cohérent avec la stack déjà utilisée sur ARTEASY
2. **Appels IA côté serveur** : route/Edge Function qui porte la clé Anthropic, réutilise les 3 prompts du §5.3 tels quels au départ
3. **Multi-utilisateur** : participants sur un projet, contribution attribuée, relais ("à toi"), notifications — la plus grosse brique, à ne construire qu'une fois la boucle solo confirmée utile
4. **Activité réelle** ("sparks") : remplacer l'heuristique par date par un vrai flux d'évènements (chaque contribution horodatée), plus fidèle à l'esprit du PRD original
5. **Photo de couverture** réelle en plus de l'emoji
6. **Édition** : renommer projet/catégorie, changer l'emoji, déplacer un élément entre catégories
7. **Intégrations réelles** (réservation) — uniquement si la traction justifie le coût d'intégration ; sinon garder la saisie manuelle/lien indéfiniment

---

## 8. Annexe — PRD d'origine

Le PRD complet initial (vision, opportunité, 36 sections détaillées incluant user stories, modèle de données étendu avec participants/contributions, métriques produit, boucle de rétention, critères de réussite) a été fourni en amont de ce cadrage et reste la référence pour la vision long terme. Ce document-ci (le cadrage MVP solo) en est une réduction volontaire et assumée — se reporter au PRD d'origine pour toute décision qui dépasse le périmètre solo décrit ici.

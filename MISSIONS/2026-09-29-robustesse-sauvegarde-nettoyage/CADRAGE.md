# CADRAGE — Robustesse de la sauvegarde, sécurité, nettoyage (2026-09-29)

## Objectif

Supprimer le risque de perte de données identifié par l'audit, refermer les surfaces de sécurité
inutiles, et retirer les reliques — **sans changer l'expérience et sans rien casser**.

Mandat de l'utilisateur : « nettoyer, sécuriser, structurer sans rien casser », en évitant les
plafonds et les limitations qui dégradent l'expérience. Décisions techniques déléguées.
Seule contrainte produit fixée par l'utilisateur : **50 projets maximum**.

## Mesure qui commande tout le reste

`livrables/mesure-poids-projet.js` construit des projets réalistes selon le modèle de données et
les pèse. Résultat :

| Profil | Poids d'un projet | Compte de 50 projets |
|---|---|---|
| Léger (sortie IA brute) | 2,9 Ko | 143 Ko |
| **Moyen (usage réel)** | **10,1 Ko** | **503 Ko** |
| Lourd (notes IA longues) | 60,5 Ko | 3,0 Mo |
| Extrême (pire plausible) | 222 Ko | 11,1 Mo |

Référence réelle mesurée en base la veille : 67 104 o pour 8 projets = **8,2 Ko/projet**, soit entre
le profil léger et le profil moyen. La simulation est donc calibrée, pas inventée.

**Conséquence directe : un compte moyen de 50 projets pèse 503 Ko et dépasserait le plafond actuel
de 500 Ko.** Le plafond n'est pas un garde-fou lointain : il est sous le cas nominal autorisé.

## Décisions tranchées

### D1 — Plafond d'octets à 2 Mo (et non 1 Mo)
1 Mo couvrirait le profil moyen (503 Ko) avec seulement 2× de marge, et laisserait dehors tout
utilisateur qui écrit beaucoup. 2 Mo donne 4× de marge sur le cas nominal et absorbe une bonne
partie du profil lourd. Au-delà, le coût réseau par sauvegarde devient le problème dominant —
c'est l'affaire de D6, pas du plafond.
**Écarté :** 500 Ko (sous le cas nominal), 10 Mo (aucune protection réelle, et chaque sauvegarde
enverrait 10 Mo).

### D2 — 50 projets maximum
Décision produit de l'utilisateur. Aligne les deux plafonds, qui racontaient des choses
différentes (300 projets annoncés, ~60 réellement possibles).

### D3 — Avertir avant le mur, pas au mur
Message à 70 % du plafond, explicite et actionnable. Un plafond dont on découvre l'existence en le
heurtant est un défaut de conception, quelle que soit sa hauteur.

### D4 — Le refus définitif devient un état visible et persistant
Aujourd'hui un 413 déclenche un toast de 1,8 s répété à chaque modification, qui n'explique rien et
ne propose rien. Il devient un bandeau persistant qui nomme la cause et l'action possible.

### D5 — Ne pas envoyer ce qui n'a pas changé
Si la charge sérialisée est identique à la dernière confirmée par le serveur, la requête n'est pas
émise. Gain immédiat sur le réseau, la batterie et la limite de débit, pour un risque nul
(comparaison d'octets, pas de logique métier).

### D6 — La synchronisation incrémentale n'est PAS dans ce lot
La vraie cause est que chaque modification renvoie tout le compte. La corriger demande un format de
delta, une résolution de conflit par champ et une migration : gros chantier, risque de régression
élevé, incompatible avec « sans rien casser » en une passe. D1 à D5 suppriment le risque de perte
de données pour tout compte réaliste ; D6 sera son propre chantier, avec cette mesure comme base.

### D7 — Séparation de l'état (étape 4 de l'audit) : écartée de ce lot
85 variables à renommer sur 6 000 lignes, pour zéro bénéfice visible. Rapport risque/valeur le plus
mauvais du plan. Reportée, et documentée comme telle.

### D8 — Dérivation des couleurs par `color-mix()` : écartée, remplacée par un garde-fou
Convertir 88 valeurs écrites à la main en dérivées calculées change le rendu de façon subtile sur
huit teintes et quatre usages — invérifiable à l'œil sans régression possible. À la place : un test
qui **vérifie** que `ink`, `strong` et `rgb` restent alignés sur `solid`. On garde les valeurs, on
gagne le filet qui manquait — c'est ce défaut d'alignement qui avait produit la divergence B3.

## Lignes rouges

- Aucun changement visuel non demandé. Les captures avant/après doivent être identiques.
- Aucune limitation nouvelle ressentie par l'utilisateur en usage normal.
- Aucun champ supprimé du modèle de données sans migration sûre pour les comptes existants.
- Toute suppression de code doit être prouvée morte, pas supposée morte.
- Tests de non-régression verts avant chaque commit.

## Périmètre

**Dans :** plafonds et comportement de sauvegarde (D1-D5), liste blanche des champs `/api/ai`,
robustesse de la réponse amont, restriction de l'origine des photos, suppression des reliques
prouvées mortes, préservation du focus dans `render()`, correction de la divergence de teinte B3,
test d'alignement des couleurs.

**Hors :** synchronisation incrémentale (D6), séparation de l'état (D7), découpage du fichier,
conversion des couleurs (D8).

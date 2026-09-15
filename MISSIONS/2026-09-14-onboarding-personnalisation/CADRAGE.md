# CADRAGE — Onboarding de personnalisation

Mission : `2026-09-14-onboarding-personnalisation`

## Objectif

Un questionnaire de personnalisation en 20 écrans, présenté à tout nouveau compte avant toute autre chose. Les réponses sont stockées durablement côté serveur, requêtables, et injectées comme contexte dans les appels IA pour adapter le fond et le ton des réponses. Le questionnaire reste consultable, modifiable et relançable depuis le profil.

Maquette de référence fournie par l'utilisateur (planche de 20 slides), reproduite fidèlement. Système visuel et transitions validés sur canvas avant tout code : https://claude.ai/artifact/8iuwaJoD2Bj4z4FfUAqsoY

## Parcours d'un nouveau compte

1. Inscription — compte créé, aucun projet
2. **Questionnaire de personnalisation** (nouveau) — 20 écrans, chaque question passable
3. Tour produit (slides existantes, inchangées)
4. Création des 3 projets d'exemple + popup « Voici 3 exemples »
5. L'app

Avant cette mission, les projets d'exemple étaient créés dès le premier chargement. Leur création est décalée après le questionnaire, pour respecter « avant de créer le 1er projet ».

## Options tranchées

| Sujet | Options | Retenu |
|---|---|---|
| Ordre vs tour produit | questionnaire avant / après / à la place | **Questionnaire d'abord, puis tour produit** |
| Portée de la livraison | capture seule / capture + écran profil éditable | **Tout dans la même livraison** |
| Ordre vs projets d'exemple | avant / après la création des exemples | **Questionnaire avant les exemples** |
| Stockage | clé dans `dropit_user_data.data` / table dédiée | **Table dédiée `dropit_user_profile`** |
| Injection IA | à chaque point d'appel côté client / dans le proxy serveur | **Dans le proxy `functions/api/ai.js`** |
| Écran « âge des enfants » | toujours affiché / conditionnel | **Conditionnel à « As-tu des enfants ? = Oui »**, compteur adaptatif |
| Typographie | police web / police système | **Police système** (aucune requête supplémentaire) |

### Pourquoi une table dédiée plutôt qu'une clé dans les données existantes

`dropit_user_data.data` est réécrit intégralement à chaque sauvegarde debouncée des projets. Y loger le profil signifierait le réécrire à chaque case cochée, avec un risque d'écrasement entre deux onglets, et obligerait le proxy IA à charger tout l'état projet pour lire trois champs.

### Choix multiples / choix uniques

- Choix multiple : écrans 8, 10, 11, 12, 13, 14, 15, 16, 18
- Choix unique : écrans 3, 4, 5, 6, 7, 9, 17
- Saisie libre : 2 (prénom), 19 (mot libre), plus un champ « Autre… » sur 10, 11, 12, 13, 15, 16

## Lignes rouges

- **Identifiants stables en base, jamais les libellés.** `{"age":"25_34"}`, jamais `{"age":"25 – 34 ans"}` : les textes doivent pouvoir évoluer sans casser les données déjà enregistrées ni les requêtes.
- `user_id` toujours dérivé du jeton vérifié serveur, jamais d'un paramètre client.
- Le questionnaire est **intégralement passable** : jamais un mur devant l'app.
- L'IA ne reçoit que ce qui a été répondu — aucune question passée n'est inventée ou déduite.
- Aucune régression sur le tour produit, la création des exemples et la notice existants.

## Hors périmètre

L'influence du profil sur la création des projets et des catégories (suggestions personnalisées au-delà du ton et du contexte) : à retravailler séparément, comme convenu.

## Lots de livraison

1. Schéma `dropit_user_profile` + endpoint `functions/api/profile.js`
2. Modal questionnaire, 20 écrans, transitions
3. Chaînage du démarrage : questionnaire → tour produit → exemples → notice
4. Écran profil : consulter, modifier une réponse, refaire le questionnaire
5. Injection du profil dans le prompt système du proxy IA

Chaque lot testé en navigateur réel avant d'être poussé.

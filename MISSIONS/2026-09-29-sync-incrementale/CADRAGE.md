# CADRAGE — Synchronisation incrémentale (2026-09-29)

Écrit AVANT tout code. Suite directe de la mission `2026-09-29-robustesse-sauvegarde-nettoyage`, qui l'a écartée du lot précédent (D6) parce qu'elle demandait un format de delta, une résolution de conflit et une migration.

## 1. Le problème, en deux symptômes qui ont la même cause

**Cause :** chaque modification renvoie le compte entier (jusqu'à 2 Mo) et le serveur remplace la ligne entière.

**Symptôme 1 — poids.** Un clic sur une case envoie tout. Sur mobile, c'est lent et coûteux ; à la fermeture de l'onglet, `keepalive` (plafonné à 64 Kio) est inutilisable dès que le compte dépasse 60 Ko.

**Symptôme 2 — perte de données (le plus grave).** Relu dans `sendSaveNow` : sur un 409, le client **réessaie avec le même état local et la version de base fraîche**. Ce réessai réussit, donc il **écrase les projets modifiés par l'autre appareil** avec les copies périmées du client. Ce n'est pas une résolution de conflit mais un « le dernier qui écrit gagne » sur tout le compte, ré-essayé jusqu'à 4 fois avant d'abandonner. Scénario : téléphone hors ligne édite le projet X ; l'ordinateur édite le projet Y et sauvegarde ; le téléphone se reconnecte, envoie tout, 409, réessaie, et **Y retrouve son ancienne version**.

## 2. Options étudiées

| Option | Verdict |
|---|---|
| **A. Une ligne par projet** (nouvelle table Postgres) | Écartée. Migration de schéma sur la production, RLS à réécrire, risque de perte à la bascule. Je ne peux pas la tester contre le vrai Supabase. |
| **B. Delta sur la ligne unique** : le client envoie les projets modifiés, le serveur fusionne | **Retenue.** Aucune migration, rétrocompatible, et corrige les deux symptômes. |
| C. CRDT / journal d'opérations | Écartée. Disproportionné : les éléments de la Drop Zone sont seulement ajoutés ou retirés, et un projet est modifié par une personne à la fois. |

## 3. Protocole (option B)

`POST /api/projects`, deux formes de corps distinguées par leur contenu. **L'ancienne forme `{state, baseUpdatedAt}` reste acceptée à l'identique** : un ancien `app.html` en cache continue de fonctionner.

```
{ "v": 1,
  "upserts":   [ { "project": {…}, "base": "<empreinte>" | null } ],
  "deletes":   [ { "id": "…", "base": "<empreinte>" } ],
  "dropAdds":  [ {…} ],
  "dropDeletes": [ "id", … ] }
→ 200 { "ok": true, "updatedAt": "…", "conflicts": [ { "id", "kind", "server": {…} | null } ] }
```

**Détection de conflit par empreinte de contenu, pas par date.** `base` est l'empreinte du projet tel que le client l'a reçu du serveur pour la dernière fois. Le serveur compare avec l'empreinte de **sa** copie actuelle :

| Cas | Décision |
|---|---|
| copie serveur = `base` | appliquer |
| copie serveur = projet proposé | déjà appliqué (réponse perdue, nouvel essai) : **succès sans écriture** |
| copie serveur ≠ `base` | conflit `edited`, non appliqué, copie serveur renvoyée |
| copie serveur absente, `base` donnée | conflit `deleted-remote` |
| suppression, copie serveur absente | déjà supprimé : succès |
| suppression, copie serveur ≠ `base` | conflit `edited` : la modification distante est conservée |

**Pourquoi l'empreinte plutôt que `updatedAt` du projet :** une date ne détecte un conflit que si tout le code pense à la mettre à jour à chaque modification. Ce n'est pas garanti (une photo posée, une icône choisie par l'IA). L'empreinte porte sur le contenu, donc n'oublie rien. Fonction : sérialisation à clés triées puis `cyrb53`, **la même écrite des deux côtés** et vérifiée par un test de parité.

**La date de ligne (`updated_at`) ne sert plus qu'à l'écriture atomique** (compare-and-swap) : le serveur relit la ligne, fusionne, écrit conditionnellement, et **recommence tout seul jusqu'à 4 fois** si un autre écrivain est passé entre-temps. Le client n'a plus à gérer de 409.

**Résolution côté client d'un conflit `edited` :** la copie serveur remplace la locale, et **la version locale est conservée comme copie** (« … (copie locale) ») plutôt que perdue. Si la limite de 50 projets l'interdit, le client prévient. Un conflit `deleted-remote` **ressuscite** le projet (mieux vaut un projet en trop qu'une modification perdue).

**Drop Zone :** éléments seulement ajoutés ou retirés, jamais édités, donc fusion exacte par identifiant, sans conflit possible.

## 4. Ce qui ne change pas
Le stockage (une ligne `dropit_user_data`), les plafonds (2 Mo, 50 projets, appliqués sur le résultat de la fusion), la lecture (`GET` renvoie tout), l'authentification, la limite de débit.

## 5. Lignes rouges
- Aucune migration de schéma. Aucun accès à la production Supabase.
- Aucun changement visuel.
- L'ancien protocole reste accepté ; un serveur ancien reste utilisable par le nouveau client (repli sur l'état complet).
- Aucune perte silencieuse de contenu, y compris sur conflit.
- Tests de non-régression verts avant chaque commit ; le code serveur est testé **tel quel**, pas une réimplémentation.

## 6. Risques
1. **Fusion serveur = plus de code sensible.** Atténué : logique pure isolée dans `functions/_lib/merge.js`, testée seule puis via le vrai point d'entrée.
2. **Empreintes divergentes client/serveur** → faux conflits. Atténué : test de parité sur des données variées (accents, imbriqué, `null`, nombres, tableaux vides).
3. **Instantané client faux** → deltas incomplets, donc perte silencieuse. Le plus dangereux. Atténué : l'instantané est pris **à l'envoi**, pas à la réponse ; test d'édition pendant un envoi.
4. **Bande passante serveur↔Supabase inchangée** : le serveur lit et écrit toujours la ligne entière. Le gain porte sur le trafic client↔serveur et sur la justesse, pas sur ce segment. À dire tel quel.
5. **Autre appareil non rafraîchi** : un appareil ne voit les changements de l'autre qu'à son prochain chargement (inchangé). Désormais sans danger pour les données, mais l'écran peut être en retard. Hors périmètre.

## 7. Hors périmètre
Rafraîchissement en direct entre appareils, `GET` incrémental, migration vers une table par projet, hors-ligne réel.

# Fix — nouveaux projets perdus au rafraîchissement (2026-09-28)

## Symptôme rapporté

Après avoir créé un projet et rafraîchi la page, le nouveau projet disparaît.
Signalé sur la version web, en production.

## Diagnostic

Vérifié directement en base (Supabase, table `dropit_user_data`) sur un compte de test
réel en train de reproduire le problème : les appels `/api/ai` et `/api/projects`
arrivaient bien au serveur (compteurs de rate limiting incrémentés dans
`dropit_rate_limit`), mais `updated_at` restait figé sur une sauvegarde bien antérieure —
aucune des tentatives du jour n'avait abouti.

Un test SQL isolé (transaction ouverte puis annulée, aucune donnée réelle modifiée)
reproduisant exactement le PATCH conditionnel de `writeUserData()` (voir
`functions/api/projects.js`) avec la valeur réelle de `updated_at` en base a montré que
la logique d'écriture conditionnelle elle-même fonctionne correctement quand on lui
donne la version courante — ce n'est donc pas un bug de format de date ou de
sérialisation JSON/Postgres (hypothèse initiale, testée et écartée).

**Cause retenue** : un conflit serveur (409) se déclenche — le cas le plus probable
étant un autre onglet ou appareil connecté au même compte ayant sauvegardé entre le
chargement de la page et l'enregistrement local. Le code introduit le 2026-09-18
(sécurité/robustesse, détection de conflit multi-appareils) traitait alors CE conflit
en écrasant intégralement l'état local par la version serveur, sans retenter — donc en
jetant silencieusement le projet tout juste créé, avec un simple toast d'avertissement
facile à manquer.

## Correctif

`sendSaveNow()` (`app.html`) retente maintenant une fois avec la version fraîche
(`updatedAt` renvoyée par le 409) avant d'abandonner. Un seul aller-retour
supplémentaire dans le cas courant (conflit avec soi-même via un autre onglet), qui
préserve le travail local au lieu de le perdre. Un vrai conflit (deux éditions
différentes sur deux appareils) retombe sur le comportement précédent au deuxième 409 :
écrasement par la version serveur + toast d'avertissement — pas de logique de fusion,
juste plus de perte sur le cas courant à tort.

## Vérification

`qa-fixture-conflit.html` + `qa-check-conflict.js` : fixture Playwright qui mocke
`/api/projects` pour renvoyer un 409 sur le premier POST (simulant un autre onglet) puis
200 sur le retry, et vérifie que le projet créé localement est toujours visible dans le
DOM après coup (`postCount: 2`, `projectSurvived: true`, aucune erreur console).

## Non résolu / limite

Le scénario exact qui a déclenché le premier 409 en production (plusieurs
onglets/appareils simultanés sur le même compte ?) n'a pas été confirmé avec certitude,
faute d'accès aux logs serveur Cloudflare depuis cette session. Le correctif traite le
symptôme (perte de données) de façon robuste quelle que soit la cause exacte du 409 ; si
le problème persiste après déploiement, il faudra des logs côté fonction Cloudflare pour
aller plus loin.

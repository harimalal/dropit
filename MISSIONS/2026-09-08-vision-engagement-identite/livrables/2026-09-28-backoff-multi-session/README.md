# Backoff aléatoire pour sauvegardes multi-sessions (2026-09-28)

## Symptôme

Après le fix du matin (retry jusqu'à 4 fois sur conflit 409), le problème persistait :
photo changée visible dans l'instant, perdue à la reconnexion.

## Diagnostic

Vérifié en base (Supabase) sur ~6 minutes de test réel : **39 appels à `/api/photos`**
et plusieurs tentatives de sauvegarde, mais `updated_at` de `dropit_user_data`
**n'a pas bougé du tout** sur toute la période. Le volume de recherches photo (bien
plus que les 8 projets du compte) indique fortement plusieurs sessions actives en
parallèle (web + application, confirmé par l'utilisateur) : chaque session backfille
indépendamment (le marqueur anti-doublon `photoFetchAttempted` vit en mémoire, propre
à chaque onglet/app), et toutes ces sessions se disputent l'écriture de la même ligne
`dropit_user_data` au même moment.

Le retry du matin (jusqu'à 4 tentatives) relançait immédiatement, sans délai, après
chaque 409. Avec plusieurs sessions qui se conflictuent puis retentent toutes
instantanément, elles peuvent se re-percuter au même instant à chaque tentative,
sans jamais converger.

## Correctif

Ajout d'un délai aléatoire croissant avant chaque retry (`200ms × tentative +
0-300ms de hasard`) — désynchronise les sessions concurrentes au lieu de les laisser
retenter en boucle exactement au même moment. `MAX_SAVE_ATTEMPTS` porté à 5 (marge
supplémentaire, la vraie amélioration vient du délai).

## Vérification

`qa-server-multi-session.js` : petit serveur avec état réel, conflit 409 appliqué
strictement sur `baseUpdatedAt`, délai artificiel de traitement (180ms) pour élargir
la fenêtre de chevauchement. `qa-fixture-app.html` : mock uniquement `/api/photos`
(délai uniforme 80ms), le reste passe par le vrai serveur.

`qa-check.js` (Playwright) : **deux pages indépendantes** chargées quasi
simultanément contre le même serveur/compte (simulant web + application), toutes
deux backfillant les 4 mêmes projets sans le savoir. Résultat : les 4 photos finissent
enregistrées côté serveur, 1 conflit rencontré et résolu par retry, 2 sauvegardes
réussies au total — convergence propre, aucune perte.

## Limite

Reste une architecture "état complet écrasé avec détection de conflit", pas une vraie
fusion : en usage réellement intensif sur plus de 2-3 sessions simultanées, des
conflits répétés restent possibles au-delà de 5 tentatives. Le backoff réduit
fortement la probabilité sans l'éliminer en théorie. Recommandation donnée à
l'utilisateur : éviter de tester avec web + application ouverts en même temps tant
que ce n'est pas définitivement confirmé stable.

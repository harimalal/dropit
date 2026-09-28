# Sauvegarde photo perdue au reconnect — retry élargi (2026-09-28)

## Symptôme rapporté

Après "Changer la photo" (bouton ajouté plus tôt le même jour), le changement est
visible dans l'instant mais disparaît à la reconnexion — l'ancienne photo revient.

## Diagnostic

Vérifié en base (Supabase) sur le compte de test : `updated_at` avait bien bougé
récemment (les sauvegardes atteignent le serveur), mais seuls 2 projets sur 8 avaient
une photo, et les deux avec une requête = titre brut (pas la requête combinée
domaine+détail attendue du bouton "Changer la photo") — cohérent avec des sauvegardes
qui aboutissent parfois mais pas de façon fiable pour l'action manuelle.

Cause retenue : `sendSaveNow()` ne retentait qu'**une seule fois** sur un conflit 409
(ajouté le 28/09 plus tôt dans la journée pour le bug "nouveaux projets qui
disparaissent"). Ce correctif traitait le cas d'un conflit isolé, mais pas une
séquence de plusieurs mises à jour rapprochées (ex : plusieurs vieux projets qui se
voient chacun attribuer une photo au chargement de la Home, chacun déclenchant son
propre `persist()` à quelques centaines de ms d'écart) — si un POST est encore en vol
quand le suivant part, les deux utilisent le même `lastKnownUpdatedAt` pas encore
rafraîchi et se conflictent entre eux, sans qu'aucun autre onglet ne soit impliqué.
Avec une seule tentative, le deuxième 409 d'affilée suffisait à faire abandonner et
écraser le changement local.

## Correctif

`MAX_SAVE_ATTEMPTS = 4` : jusqu'à 4 tentatives (au lieu de 2) avant d'abandonner et de
revenir à la version serveur. Chaque tentative repart avec la version fraîche reçue du
409 précédent, donc converge rapidement dans le cas d'un auto-conflit en cascade,
tout en gardant une limite pour ne pas boucler indéfiniment sur un vrai conflit
persistant (ex : deux appareils qui écrivent en continu).

## Vérification

Deux tests Playwright :
- `qa-check-conflict-bound.js` (+ `qa-fixture-conflit-permanent.html`) : mock qui
  renvoie 409 en boucle → confirme exactement 4 tentatives puis abandon avec le toast
  d'avertissement, pas de boucle infinie. Variante où le mock cesse de conflictuer
  après 2 échecs → converge au 3e essai, aucune perte, pas de toast.
- `qa-check-race.js` (+ `qa-server-race.js`) : petit serveur Node avec état réel et
  délai artificiel de traitement, 3 "vieux projets" dont les photos se récupèrent avec
  des délais échelonnés (60/140/220 ms) pour simuler le backfill au chargement de la
  Home — les 3 photos finissent bien enregistrées côté serveur.

## Limite

Le scénario de course exact vécu en production (quel enchaînement précis de
sauvegardes a produit le conflit répété) n'a pas été reproduit à l'identique — les
constantes de timing utilisées ici (délai serveur 250ms < debounce 350ms) rendent la
vraie collision difficile à forcer de façon déterministe en local. Le correctif
traite le symptôme de façon robuste (plus de marge de retry) quelle que soit la cause
exacte de la contention ; à surveiller si le problème persiste.

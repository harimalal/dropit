# Décisions — Synchronisation incrémentale

## Validées par le mandat de l'utilisateur
(« continue avec la synchro incrémentale », décisions techniques déléguées ; aucune décision produit nouvelle.)

**S1 — Delta sur la ligne unique, pas de table par projet.** Aucune migration de schéma sur la production, ancien protocole conservé. *Écarté :* une ligne par projet (migration non testable contre le vrai Supabase), CRDT (disproportionné).

**S2 — Conflit détecté par empreinte de contenu, pas par date.** Une date suppose que tout le code la met à jour à chaque modification, ce que rien ne garantit. L'empreinte porte sur le contenu. *Coût :* une fonction écrite en double (client, serveur), verrouillée par un test de parité textuel et fonctionnel dont la contre-épreuve a été faite.

**S3 — Le serveur réessaie tout seul ses conflits de ligne (jusqu'à 4 fois).** Le client n'a plus à gérer de 409 : seuls remontent les conflits de CONTENU, projet par projet. Au-delà, 503 « busy », déjà réessayé sans message par le client.

**S4 — Un conflit ne perd jamais de contenu.** Modification distante et locale sur le même projet : la copie serveur l'emporte, la version locale est gardée en copie (« … (copie locale) ») sous de nouveaux identifiants. Suppression refusée : annulée. Projet supprimé ailleurs mais modifié ici : restauré. *Écarté :* « le serveur gagne » sans copie (perte silencieuse), « le client gagne » (écrase le travail de l'autre appareil, c'est le défaut actuel).

**S5 — Instantané pris à l'ENVOI, jamais à la réponse.** Sinon une modification faite pendant que la requête est en vol serait tenue pour confirmée sans être partie. Vérifié par le scénario « sauvegarde lente pendant des éditions ».

**S6 — Repli sur l'état complet si le serveur ne comprend pas le delta** (ancien déploiement, ou `bad_delta`). Mieux vaut envoyer plus que laisser des modifications non enregistrées.

**S7 — Ids douteux ⇒ état complet.** Si un projet reçu n'a pas d'identifiant stable ou si un identifiant se répète, le premier envoi est complet : il remplace la liste et fixe les ids. Un delta dupliquerait l'orphelin.

## Ajoutée en cours de route (hors cadrage initial), et pourquoi

**S8 — Corriger R-01 : ne jamais sauvegarder tant que le compte n'a pas été lu avec succès.** Trouvé en relisant `load()` pour brancher l'instantané. Le chemin est non ambigu et je l'ai **prouvé** avant de le corriger (`preuve-r01-avant.json`) : sur une réponse 429 ou 500 du `GET`, l'app prend l'erreur pour un compte neuf, affiche des exemples et les **envoie au serveur, qui remplace tout le compte** par « Bali cet été / Anniversaire de Julie / Déménagement ». La limite de débit de 30 requêtes par minute est partagée entre lecture et écriture, donc ce n'est pas un cas d'école. Ce peut être la cause des « projets qui disparaissent » d'hier, que je n'avais pas pu prouver : **hypothèse, non démontrée** faute d'accès aux journaux de production.
Correctif : `chargementReussi` (levé à la toute fin du chargement, jamais avant), écran « Réessayer » à la place des exemples, reprise automatique 2 / 5 / 15 / 30 s et au retour du réseau. Pourquoi ici : c'est le même chemin de sauvegarde, et un delta bien conçu ne sert à rien si un chargement raté peut effacer le compte.
*Non fait volontairement :* refuser côté serveur un premier envoi (`baseUpdatedAt` nul) quand une ligne existe. Il ne protégerait pas les anciens clients (leur réessai sur 409 écraserait quand même) et changerait un comportement historique.

## Écartées, et pourquoi

- **Rafraîchissement en direct entre appareils.** Un appareil ne voit les changements de l'autre qu'à son prochain chargement (inchangé). Désormais sans danger pour les données, mais l'écran peut être en retard.
- **`GET` incrémental.** Le chargement renvoie toujours tout ; un delta en lecture demanderait un curseur côté serveur.
- **Optimiser la lecture serveur↔Supabase** (`select=updated_at` sur le `PATCH`). Probablement sans risque, mais non testable sans le vrai PostgREST.

## Mesuré, et ce que ça dit honnêtement

| | Avant | Après |
|---|---|---|
| Envoi navigateur → serveur, compte de 800 Ko, une case cochée | 798 533 o | **20 061 o (−97,5 %)** |
| Sauvegarde à la fermeture de l'onglet (`keepalive`, plafond 60 Ko) | impossible dès 60 Ko de compte | possible : le delta est petit |
| Deux appareils, projets différents | modification du premier **perdue** | **les deux conservées** |
| Deux appareils, même projet | modification du premier **perdue**, sans message | version du premier conservée, la seconde gardée en copie, message |
| Temps serveur par requête, compte de 0,8 Mo / 1,4 Mo | 33 ms / 60 ms | 35 ms / 58 ms — **inchangé** : le serveur relit et réécrit toujours la ligne entière |
| Coût des empreintes au chargement (navigateur) | — | 30 ms à 1 Mo, 60 ms à 4 Mo |

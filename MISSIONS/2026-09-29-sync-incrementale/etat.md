# État — Synchronisation incrémentale

Statut : **IMPLÉMENTÉE ET TESTÉE, EN ATTENTE DE REVUE** (branche `feature/sync-incrementale`, PR à ouvrir). Pas encore déployée.

## Journal (append-only)

# 2026-09-29 — Mission ouverte dans la foulée de robustesse-sauvegarde-nettoyage (décision D6 de cette mission, chantier écarté du lot précédent). CADRAGE.md écrit avant tout code.
# 2026-09-29 — Constat en relisant sendSaveNow, écrit au cadrage : sur un 409, le client réessayait avec le MÊME état local et la version de base fraîche. Le réessai réussit donc il écrase les projets de l'autre appareil : ce n'est pas une résolution de conflit mais un « le dernier qui écrit gagne » sur tout le compte.
# 2026-09-29 — Preuve AVANT (preuve-avant.json, deux navigateurs, vrai code serveur derrière une fausse base à compare-and-swap) : deux appareils modifiant des projets différents perdent la modification du premier (« complet:409 » puis « complet:200 »), sans aucun message. Même résultat sur le même projet.
# 2026-09-29 — Serveur : functions/_lib/merge.js (logique pure) + chemin delta dans projects.js. test-serveur-delta.mjs : 43 cas par le vrai point d'entrée. Trois mutations de la logique (dernier qui écrit gagne, sans idempotence, empreinte sensible à l'ordre des clés) sont chacune détectées.
# 2026-09-29 — Client : instantané par projet (contenu local + empreinte serveur), delta construit à l'envoi, résolution des conflits sans perte (copie locale, suppression annulée, projet restauré), repli sur l'état complet vers un ancien serveur. test-parite-empreinte.mjs : 32 cas dont la parité textuelle du code des deux côtés ; contre-épreuve par changement de graine côté client, détecté.
# 2026-09-29 — Preuve APRÈS (preuve-apres.json), 6 parcours à deux appareils : autre projet (aucune perte, « delta:200 »), même projet (version du premier conservée, la seconde gardée en copie et contenant bien son travail), suppression contre modification (annulée, message), restauration, poids, compte neuf (premier envoi complet, puis deltas). Aucune erreur JS.
# 2026-09-29 — Poids mesuré en navigateur, compte de 800 Ko, une case cochée : 798 533 o avant, 20 061 o après (-97,5 %). Temps serveur inchangé (35 contre 33 ms à 0,8 Mo) : le serveur relit et réécrit la ligne entière. Le gain est sur le trafic navigateur vers serveur et sur la justesse, pas sur ce segment.
# 2026-09-29 — Relecture adverse : deux cas de conflit ne géraient pas un projet supprimé localement pendant l'envoi (écriture dans state.projects[-1]). Corrigés avant tout commit.
# 2026-09-29 — R-01 (hors cadrage initial, décision S8) : trouvé en relisant load(). PROUVÉ avant correctif (preuve-r01-avant.json) : sur un 429 ou un 500 du GET, l'app affiche des exemples et les sauvegarde, remplaçant tout le compte. Corrigé : rien n'est sauvegardé tant que le compte n'a pas été lu avec succès, écran « Réessayer » à la place des exemples. Preuve APRÈS (preuve-r01-apres.json) dans les trois pannes (429, 500, réseau coupé) : 0 envoi, aucune tuile d'exemple, compte intact, les vrais projets reviennent au « Réessayer ». L'hypothèse que R-01 explique les « projets qui disparaissent » de la veille n'est PAS démontrée.
# 2026-09-29 — Les harnais de test existants (save-check, quota-check, focus-check, verif-lot3) lisaient body.state et plantaient sur un delta : adaptés pour accepter les deux protocoles, versions adaptées dans livrables/. Les scénarios de conflit rejouent désormais un ANCIEN serveur (400 « state required »), ce qui teste aussi le repli.

## Non vérifié / à surveiller

- **Jamais exécuté contre le vrai Supabase / PostgREST.** La fausse base reproduit le compare-and-swap (filtre conditionnel sur l'horodatage, comparé par valeur, format « +00:00 »), mais un comportement réel de PostgREST que je connaîtrais mal ne serait pas vu. À contrôler sur un aperçu Cloudflare avec un compte de test avant de fusionner.
- **Limite de temps de calcul de Cloudflare selon le forfait** : non vérifiée. Le chemin delta ne coûte pas plus que l'ancien (mesuré), mais un compte de 2 Mo reste lourd à analyser dans les deux cas.
- **Deux onglets ou appareils qui éditent le même projet à la seconde près** : couvert par les tests à deux appareils, pas en charge réelle.
- **R-01 comme cause des projets disparus** : hypothèse.
- **Rafraîchissement en direct** entre appareils : hors périmètre. Un appareil voit les changements de l'autre à son prochain chargement.

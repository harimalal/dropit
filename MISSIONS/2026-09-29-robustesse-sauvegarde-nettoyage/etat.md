# État — Robustesse de la sauvegarde, sécurité, nettoyage

Statut : **LIVRÉ**, en attente de revue et de déploiement.

## Journal (append-only)

# 2026-09-29 — Mission ouverte après l'audit du code. Mandat : nettoyer, sécuriser, structurer sans rien casser ; décisions techniques déléguées ; seule contrainte produit, 50 projets maximum. CADRAGE écrit avant tout code.
# 2026-09-29 — Mesure fondatrice (livrables/mesure-poids-projet.js) : un projet pèse 2,9 Ko (sortie IA brute), 10,1 Ko (usage moyen), 60,5 Ko (grand utilisateur de notes), 222 Ko (extrême). Référence réelle en base : 8,2 Ko/projet. Conséquence : 50 projets moyens = 503 Ko, alors que le plafond serveur était à 500 Ko — il était SOUS le cas nominal autorisé, pas au-dessus. C'est cette mesure qui a commandé toutes les décisions du lot.
# 2026-09-29 — Lot 1 (63f129f) sauvegarde : plafond 500 Ko -> 2 Mo, MAX_PROJECTS 300 -> 50, alerte à 70 % une fois par session, bandeau persistant hors du cycle render() sur refus définitif, motif lu dans le corps de la réponse (too_large / too_many_projects), création refusée avant l'appel IA, état identique non réémis. 6 nouveaux tests navigateur (quota-check.js), tous verts, plus les 6 scénarios de sauvegarde existants.
# 2026-09-29 — Lot 2 (a450b70) sécurité : /api/ai ne relaie plus que model, max_tokens, system, messages, temperature (tout le corps client partait avec la clé partagée) ; messages vide refusé ; réponse non-JSON ou panne amont -> 502 utilisable au lieu d'une 500 muette ; photos restreintes au domaine pexels.com des deux côtés, URL passée par encodeURI avant d'entrer dans du CSS. test-securite.mjs : 26 cas verts, dont le refus d'un hôte usurpé (images.pexels.com.evil.com) et l'alignement des plafonds client/serveur.
# 2026-09-29 — Lot 3 (c4d3c5f) reliques : generateProjectDNA et performGenerateDNA supprimées (chaîne entière sans porte d'entrée), moveIcon supprimée, 22 règles CSS de 16 classes orphelines supprimées après re-preuve d'absence dans le balisage. Le CHAMP dna est CONSERVÉ en lecture seule : l'effacer aurait supprimé la donnée des comptes qui en ont une. -4 087 octets. Captures comparées au pixel près : seul l'emoji de salutation, tiré au hasard à chaque session, diffère (carré de 44x42 px).
# 2026-09-29 — Lot 4 (12cbbc1) structure : render() préserve désormais le focus et la position du curseur, comme il préservait déjà le défilement. Bug réel corrigé et prouvé : dans la barre d'ajout de tâche d'un projet, Entrée déclenchait persist()+render() qui détruisait le champ — le focus était perdu à chaque tâche, il fallait recliquer. Rejoué sur le code d'avant : focus perdu, seconde tâche jamais ajoutée.
# 2026-09-29 — Décision D13, la plus importante du lot : les couleurs ne sont PAS unifiées. Mesure préalable : rgb, ink et strong sont des dérivées exactes de solid, mais glass s'en écarte de +10 à +60 par canal selon la teinte. Unifier la barre de progression sur solid, comme le plan d'audit le suggérait, aurait changé visiblement l'émeraude et la sarcelle. Les valeurs restent intactes et test-couleurs.mjs (33 cas) fige les quatre relations — c'est ce filet manquant qui avait laissé un commentaire affirmer que deux teintes étaient identiques alors qu'elles divergeaient.
# 2026-09-29 — Écartés de ce lot, documentés dans decisions.md : la synchronisation incrémentale (D6, prochain chantier, la vraie cause), la séparation des 85 variables d'état (D7), la dérivation des couleurs par color-mix (D8), le découpage du fichier.

## Non vérifié / à surveiller

- **Le plafond de 2 Mo n'a jamais été franchi en conditions réelles** : le raisonnement s'appuie sur
  la mesure du modèle de données, pas sur un compte réellement poussé jusqu'au seuil.
- **Pexels reste injoignable depuis le bac à sable** : la restriction de domaine est vérifiée par
  test unitaire et sur les URL de test, jamais contre une vraie réponse Pexels.
- **La limite de débit serveur reste non prouvée** : la table n'a pas été inspectée.
- **Aucun test automatisé** sur le chat IA, l'agenda, l'onboarding et le profil.

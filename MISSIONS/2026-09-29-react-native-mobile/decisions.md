# Décisions — DROPIT mobile

Statut : **proposée** = choix par défaut pris pour avancer, modifiable par l'utilisateur ; **validée** = confirmée explicitement par l'utilisateur ; **à trancher** = attend l'utilisateur.

## Validées par l'utilisateur (conversation du 2026-09-29)

- **V1** Application 100 % mobile, React Native / Expo, en reproduisant l'app web actuelle, avec les améliorations de design que le natif permet.
- **V2** Authentification : e-mail/mot de passe + Google + Apple.
- **V3** Notifications push : oui. Le détail des informations à notifier sera défini plus tard.
- **V4** Hors-ligne : pas prioritaire. Mode sombre : pas prioritaire.
- **V5** Builds via Expo Cloud, aucune installation de logiciel sur l'ordinateur de l'utilisateur. L'utilisateur fait les tests d'usage ; Claude planifie, code et teste techniquement.

## Proposées (prises par défaut, à contester si besoin)

- **D1 iOS et Android dans le périmètre.** Découle de « 100 % mobile ». Implique Sign in with Apple, en-tête avec retour sur iOS, feuilles natives.
- **D2 Corriger les défauts, pas les recopier.** On reproduit l'expérience voulue. Corrigés d'office : R-01 (écrasement sur erreur de chargement), R-03 (note de tâche non modifiable), R-05 (bulle IA vide sur erreur), R-19 (session effacée sur toute erreur de rafraîchissement), R-04 (état non remis à zéro à la déconnexion), R-10 (aucune couleur sur les jalons). Signalés sans changer le web : voir `etat.md`.
- **D3 Tour d'onboarding : hors périmètre.** Désactivé dans le web (code mort). Le questionnaire de profil, lui, est reproduit.
- **D4 Erreur de chargement : écran « Réessayer », jamais les exemples.** Remplace le comportement actuel « données locales affichées » qui montre des exemples qui ne sont pas les données de l'utilisateur (R-18, R-01). Ce n'est pas du hors-ligne : aucun cache d'état en v1.
- **D5 Le web reste un client du même compte.** Contrat `state` inchangé, plafonds identiques (50 projets, 2 Mo), pas de synchronisation incrémentale. Risque accepté et documenté (R-25).
- **D6 Projet dans `mobile/` du même dépôt.** Un dépôt séparé sortirait du périmètre GitHub de cette session. À vérifier au lot 0 : que le dossier n'alourdisse ni ne perturbe le déploiement Cloudflare Pages (`node_modules` et `.expo` ignorés par git).
- **D8 Coquille Capacitor Android (`feature/capacitor-android`) : laissée intacte.** Ni fusionnée, ni supprimée. À reconsidérer quand l'app Expo la remplace.
- **D9 Portrait téléphone uniquement.** Le web n'a aucune règle tablette ni paysage documentée.
- **D10 BYOK Anthropic n'est pas un préalable.** La clé partagée et la limite de 20 appels par minute et par utilisateur restent telles quelles.

## À trancher par l'utilisateur

- **D7 Contenu des notifications push.** Aucun déclencheur n'existe dans l'app actuelle. Options : (a) rappels locaux sur les échéances de l'agenda, sans serveur ; (b) push serveur (table de jetons, tâche planifiée Cloudflare) pour « tâche du jour », relance après inactivité ; (c) les deux. Recommandation : (a) d'abord, car elle ne demande aucune infrastructure et se teste sans compte Apple, puis (b) si un besoin de relance est confirmé. Décision requise avant le lot 9.
- **D11 Drop Zone.** Aujourd'hui, un tap sur un badge le supprime sans confirmation ni conversion (R-13) alors que l'interface parle de « tri ». Reproduire tel quel, ajouter une confirmation, ou spécifier un vrai tri (convertir en tâche ou en projet) ? Décision requise avant le lot 5. Par défaut d'ici là : reproduire, plus une confirmation.
- **D12 Compte de test sur la prod.** Créer un compte dédié pour les tests contre l'API réelle. Requis pour le lot 0.

## Options écartées

Voir CADRAGE.md §5 (Capacitor, Flutter, rester sur le web).

## Itérations

_(rien pour l'instant)_

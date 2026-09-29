# État — DROPIT mobile (React Native / Expo)

Statut : **CADRAGE ÉCRIT, en attente de validation avant le lot 0.** Aucun code écrit.

Prochaine étape : lot 0 (socle Expo, connexion e-mail, chargement sans R-01, spike du treemap). Prérequis côté utilisateur : compte de test dédié sur la prod (D12).

## Journal (append-only)

# 2026-09-29 — Mission ouverte à la demande de l'utilisateur : passer DROPIT en application 100 % mobile (React Native / Expo), iOS et Android, avec connexion Google et Apple et notifications push.
# 2026-09-29 — Inventaire fonctionnel complet de app.html et functions/ écrit (livrables/inventaire-fonctionnel.md, 649 lignes, 26 risques R-01 à R-26).
# 2026-09-29 — Constat : app.html n'est pas une PWA au sens strict (ni manifest, ni service worker, ni Notification) ; aucun hors-ligne, aucune notification, aucun geste. Vérifié par recherche dans le fichier.
# 2026-09-29 — Constat vérifié à la lecture de load() (app.html:3014-3044) : aucun contrôle de res.ok ; une erreur 500 ou 429 est lue comme un compte neuf et peut écraser les données réelles. Non reproduit en navigateur.
# 2026-09-29 — Constat vérifié par recherche : noteEditId n'est jamais déclarée alors que le mode strict est actif (seule occurrence : assignation à app.html:5136). ReferenceError probable à l'édition d'une note de tâche. Non confirmé en navigateur.
# 2026-09-29 — Réseau : expo.dev, api.expo.dev, u.expo.dev et exp.host étaient bloqués par la politique réseau de l'environnement (403). L'utilisateur les a autorisés ; les quatre répondent (200/405).
# 2026-09-29 — CADRAGE.md et decisions.md écrits avant tout code. Décisions D1-D10 proposées par défaut, D7, D11, D12 à trancher par l'utilisateur.

## Non vérifié / à surveiller

- **Chiffrage** : 3 à 5 semaines calendaires est une estimation à recaler après le lot 0, fondée sur un ratio de lignes non mesuré.
- **Fidélité du treemap** : la mesure de texte par canvas n'existe pas en RN ; à éprouver au lot 0.
- **Signature iOS depuis le cloud** : on suppose qu'une clé App Store Connect permet de signer sans connexion Apple interactive ; à vérifier au lot 8.
- **`ENABLE_GOOGLE_AUTH` en production** : le code dit vrai par défaut, `SETUP_AUTH.md` dit faux ; état réel inconnu.
- **R-01 et R-03** n'ont jamais été reproduits en navigateur ; ils ressortent de la lecture du code.
- **Impact d'un dossier `mobile/` sur le déploiement Cloudflare Pages** : non vérifié.

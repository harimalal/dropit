# État — PWA Android

Statut : **ÉTAPE A TERMINÉE SUR LA BRANCHE, PAS ENCORE EN LIGNE** (le site n'est installable qu'une fois la branche fusionnée dans `main`, ce qui déclenche le déploiement Cloudflare). Étape B (TWA + Play Store) pas commencée.

## Journal (append-only)

# 2026-09-29 — Mission ouverte à la demande de l'utilisateur : « Fais d'abord la PWA Android, puis on migre ». Question d'origine : peut-on lancer la PWA telle quelle sur le Play Store.
# 2026-09-29 — Constat : app.html n'a ni manifest, ni service worker. La piste PWA du 09/09 (manifest.json, sw.js, icons/) existe sur feature/capacitor-android, mise en pause à la demande de l'utilisateur puis retirée de main par un git add -A accidentel (239f9f8). Une coquille Android Capacitor et un assetlinks.json (com.dropit.app) existent déjà.
# 2026-09-29 — Ancienne piste jugée périmée : icônes goutte remplacées par le logotype DROP • IT le 17/09 (78d8448) ; sw.js en cache d'abord, contraire à la protection anti-version-périmée de _headers. Réutilisation limitée à l'idée, pas aux fichiers.
# 2026-09-29 — CADRAGE.md et decisions.md écrits avant tout code.
# 2026-09-29 — Étape A livrée sur la branche : manifest.json, sw.js (réseau seul, aucun cache), icons/ générées depuis le logotype 1024 px (livrables/generer-icones.js), déclarations dans app.html (5 balises de tête + 1 script d'enregistrement, aucune autre ligne touchée), règles Cache-Control dans _headers.
# 2026-09-29 — Test navigateur livrables/test-pwa.js : 38/38 (installabilité Chromium sans erreur en profil non privé, service worker actif, aucun cache créé, app.html et /api/config toujours pris au réseau, page « Pas de connexion » en 503 quand le serveur est réellement coupé, purge de l'ancien cache dropit-shell-v1, parcours connecté complet sous service worker : tuiles et détail projet, aucune erreur JS).
# 2026-09-29 — Contre-épreuve : avec l'ancien sw.js de feature/capacitor-android (cache d'abord), 6 vérifications échouent, dont l'app servie depuis un cache figé hors connexion (statut 200). Le test détecte donc bien le risque visé.
# 2026-09-29 — Deux échecs initiaux du test étaient des défauts du test, pas du site : contexte Playwright de type navigation privée (Chromium refuse toute installation) et setOffline qui ne coupe pas le réseau du service worker. Corrigés (profil persistant ; arrêt réel du serveur).
# 2026-09-29 — Non-régression : test-couleurs.mjs 33/33 et test-securite.mjs 26/26 depuis la racine du dépôt. quota-check.js et focus-check.js NON rejoués : ils exigent une copie modifiée d'app.html (app-apres.html, sur le port 8941) qui n'a jamais été commitée.
# 2026-09-29 — Constat production : /app est déjà servi avec « public, max-age=0, must-revalidate » ; la règle _headers de /app.html ne s'applique qu'à la redirection 308. Sans conséquence ici, à savoir.

## Non vérifié / à surveiller

- **Règles Play Store pour les comptes personnels** (test fermé, nombre de testeurs, durée) : de mémoire, à vérifier dans la Play Console.
- **`sha256_cert_fingerprints` de `.well-known/assetlinks.json`** : origine de l'empreinte inconnue (clé de debug ? clé Play ?). À remplacer par celle de la clé qui signera réellement l'app.
- **Comportement de la connexion Google dans une TWA** : raisonné, jamais testé sur un téléphone.
- **Installation réelle sur un téléphone Android** : l'installabilité est prouvée par Chromium de bureau, pas sur un appareil ni depuis l'URL de production.
- **quota-check.js / focus-check.js** non rejoués après la modification d'app.html (harnais non versionné).
- **Aperçu Cloudflare de la branche** : non vérifié (existe-t-il, sert-il manifest.json et sw.js ?).

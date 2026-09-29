# CADRAGE — DROPIT sur le Play Store en attendant la migration React Native

Écrit le 2026-09-29, AVANT tout code. Demande de l'utilisateur : « Fais d'abord la PWA Android, puis on migre. » La migration React Native est cadrée à part (`MISSIONS/2026-09-29-react-native-mobile/`) et reste la suite.

## 1. Objectif

Mettre l'app web actuelle sur le Play Store, **sans la réécrire**, pour avoir de vrais utilisateurs Android et de vrais retours pendant que la migration React Native se prépare.

## 2. Constats de départ (vérifiés)

1. `app.html` n'est **pas** une PWA : aucun manifest, aucun service worker, aucune icône déclarée. Le site est servi en HTTPS (Cloudflare Pages), `/app.html` redirige en 308 vers `/app`.
2. Une **piste PWA existe déjà dans l'historique** : `manifest.json`, `sw.js`, `icons/` préparés le 2026-09-09, mis en pause à la demande de l'utilisateur, puis retirés de `main` par accident de `git add -A` (commit `239f9f8`). Ils vivent encore sur la branche `feature/capacitor-android`.
3. Cette piste est **périmée sur deux points** : ses icônes (goutte terracotta) ont été remplacées le 2026-09-17 par le logotype « DROP • IT » (commit `78d8448`) ; son `sw.js` sert le cache en premier, ce qui réintroduirait les versions périmées d'`app.html` que l'en-tête `Cache-Control: no-cache` de `_headers` a été ajouté pour éviter.
4. Une **coquille Android Capacitor** (`com.dropit.app`) existe sur `feature/capacitor-android` : elle charge le site en ligne et un workflow GitHub Actions compile un APK de debug. Elle n'est pas fusionnée dans `main`. Un `.well-known/assetlinks.json` (package `com.dropit.app`) est déjà servi en production.
5. La connexion Google/Apple de l'app passe par une redirection web vers `origin + pathname` ; dans la coquille Capacitor elle utilise un schéma personnalisé `com.dropit.app://auth-callback`.
6. Le SDK Android est inaccessible depuis l'environnement de développement (`dl.google.com` bloqué) ; `services.gradle.org` et Maven Central sont joignables. GitHub Actions accède au SDK.

## 3. Deux étapes

### Étape A — Rendre le site installable (PWA propre)
- `manifest.json` : nom, icônes, `start_url` sans redirection, portée limitée à l'app, couleurs alignées sur l'UI.
- Icônes 192, 512, maskable 512, apple-touch 180, favicons, générées depuis le logotype 1024 px.
- `sw.js` **sans aucun cache d'état ni de coquille** : le réseau reste la seule source. Le service worker sert uniquement à fournir une page « hors connexion » lisible quand on ouvre l'app sans réseau, et à satisfaire les critères d'installabilité.
- Déclaration dans `app.html` (`<link rel="manifest">`, `theme-color`, icônes, enregistrement du worker).
- `_headers` : `sw.js` et `manifest.json` jamais périmés.
- Vérifié dans un vrai Chromium (installabilité, enregistrement, comportement hors connexion, `/api/*` jamais intercepté).

### Étape B — Empaqueter pour le Play Store (TWA)
- Application Android « Trusted Web Activity » : Chrome affiche le site en plein écran, sans barre d'adresse, une fois `assetlinks.json` vérifié.
- Construction d'un `.aab` signé par un workflow GitHub Actions (le SDK y est accessible).
- Mise à jour d'`assetlinks.json` avec l'empreinte de la clé de signature Play.
- Préparation de la fiche Play Store (textes, captures, politique de confidentialité).

Détail de l'étape B à cadrer à la fin de l'étape A, une fois l'état du compte Play Console connu.

## 4. Pourquoi une TWA plutôt que la coquille Capacitor existante (proposé, D1)

| | TWA | Capacitor (existant) |
|---|---|---|
| Moteur | Chrome | WebView |
| Connexion Google | Fonctionne (c'est Chrome) | Refusée en WebView, d'où le contournement par schéma personnalisé |
| Notifications web push plus tard | Oui | Non sans plugin natif |
| Acceptation Play Store d'un site emballé | Meilleure (app Chrome vérifiée) | Risque de refus « fonctionnalité minimale » |
| Travail déjà fait | À faire | Fait (APK de debug) |

La coquille Capacitor n'est ni supprimée ni fusionnée : elle reste la solution de repli.

## 5. Hors périmètre

- Iconographie ou design nouveau : on reprend le logotype existant.
- Mode hors-ligne réel (cache d'état) : jamais dans cette mission ; le risque d'écrasement de données (R-01 de l'inventaire) rend tout cache d'état dangereux tant que `load()` n'est pas corrigé.
- iOS : Apple n'accepte pas un site emballé ; couvert par la migration React Native.
- Correction de R-01 et des autres défauts de `app.html` : ils sont signalés dans la mission React Native, pas traités ici.

## 6. Ce que l'utilisateur doit fournir (étape B)

| Élément | Pourquoi |
|---|---|
| Un compte développeur Google Play (25 $, paiement unique, vérification d'identité) | Publier |
| Savoir s'il existe déjà et s'il est personnel ou organisation | Les nouveaux comptes personnels doivent faire un test fermé avec un minimum de testeurs pendant environ 14 jours avant la production (à vérifier, ces règles évoluent) |
| Une adresse de politique de confidentialité | Obligatoire pour la fiche |
| Accès à la Play Console pour téléverser le `.aab` et me donner l'empreinte de signature | Je n'ai pas accès à `play.google.com` depuis cette session |

## 7. Lignes rouges

- Le service worker ne met **jamais** en cache `app.html`, les données, `/api/*` ni aucune réponse d'authentification.
- Le site web continue de fonctionner à l'identique dans un navigateur.
- `app.html` : seules des lignes d'en-tête et l'enregistrement du worker sont ajoutées, rien d'autre.
- Rien de secret dans le dépôt (clé de signature, mots de passe de keystore).
- Aucune publication sur le Play Store sans validation explicite de l'utilisateur.
- Branche : `claude/cli-claude-code-sync-ti3dgo`, aucun push sur `main`, aucune PR sans demande. Commits en français, jamais `git add -A`.
- Livrables de session dans `MISSIONS/2026-09-29-pwa-android/livrables/`.

## 8. Risques

1. **Un service worker mal conçu peut figer une version périmée de l'app chez les utilisateurs** : c'est le risque principal, d'où le réseau seul. Test dédié.
2. **Redirection OAuth dans la TWA** : la connexion Google sort de la portée vérifiée le temps de l'authentification puis revient sur `/app` ; à tester sur un vrai téléphone.
3. **Clé de signature** : une fois choisie, elle ne peut plus changer sans procédure Play ; sa garde est à organiser.
4. **Refus Play Store** pour « fonctionnalité minimale » : peu probable pour une app avec compte, IA et données, mais non exclu.

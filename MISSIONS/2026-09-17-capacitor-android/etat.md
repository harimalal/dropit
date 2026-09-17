# Journal — Capacitor / Android

## 2026-09-17 — Scaffolding initial

- Branche dédiée `feature/capacitor-android` (Android d'abord, iOS traité
  séparément plus tard, sur confirmation — décision explicite de l'utilisateur).
- `package.json` créé à la racine (projet Node séparé pour piloter Capacitor,
  n'affecte ni `app.html` ni `functions/`).
- `@capacitor/core`, `@capacitor/cli`, `@capacitor/android` installés.
- `capacitor.config.json` : `server.url` pointe vers
  `https://dropit-dbx.pages.dev` — l'app charge le site en ligne, elle ne
  l'embarque pas. Toute mise à jour poussée sur `main` se reflète donc dans
  l'app installée sans recompilation ni re-soumission au store.
  `appId` provisoire : `com.dropit.app` (à figer avant tout envoi au Play
  Store — non modifiable après un premier envoi).
- `npx cap add android` : projet natif généré dans `android/`.
- Icônes et écran de démarrage générés à toutes les densités
  (`@capacitor/assets`) à partir des icônes déjà préparées le 9 septembre
  (`icons/icon-512.png`, `icons/icon-maskable-512.png`) — sources gardées
  dans `assets/` pour pouvoir régénérer plus tard avec de meilleures sources.
- **Compilation impossible dans cet environnement** : `dl.google.com`
  (plugin Gradle Android + SDK) renvoie 403 depuis le proxy sortant du bac
  à sable. Le projet Gradle a été vérifié valide malgré tout — l'échec est
  réseau, pas une erreur de configuration (`./gradlew help` télécharge bien
  Gradle lui-même, échoue seulement sur la résolution des dépendances
  Android, hébergées par Google).
- Contournement : `.github/workflows/android-debug-apk.yml` — une CI GitHub
  Actions qui compile un `.apk` de debug à chaque push sur cette branche (ou
  à la demande), et le publie en pièce jointe téléchargeable du run. GitHub
  Actions a un accès réseau complet à Google, contrairement à cet
  environnement. Permet d'obtenir un `.apk` réel sans Mac, sans Android
  Studio, sans rien installer côté utilisateur.
- Pas encore fait, à la demande : lancer réellement cette CI (nécessite de
  pousser la branche sur GitHub d'abord), signature de release pour le Play
  Store, fiche du store, notifications push, branche iOS.

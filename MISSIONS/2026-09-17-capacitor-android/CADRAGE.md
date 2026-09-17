# Capacitor — coquille Android

## Objectif

Emballer Dropit dans un vrai paquet Android (`.apk`/`.aab`) via Capacitor, pour
deux canaux de diffusion possibles : le Play Store, et le téléchargement direct
(sideload) — sans passer par un store.

La priorité utilisateur est explicite : Android d'abord, iOS ensuite (le Mac
et le compte Apple Developer sont une étape séparée, traitée plus tard dans
sa propre branche).

## Choix de fond

- **Capacitor charge le site en ligne, il ne l'embarque pas.** `capacitor.config`
  pointe `server.url` vers `https://dropit-dbx.pages.dev`. Conséquence directe :
  toute mise à jour poussée sur `main` se reflète immédiatement dans l'app
  installée, sans repasser par une recompilation ni une re-soumission au store.
  Le compromis assumé : sans connexion, l'app ne s'ouvre pas (pas de coquille
  statique offline pour l'instant — le `sw.js` déjà préparé pourrait combler
  ça plus tard, hors périmètre ici).
- **Un seul projet Node ajouté à la racine du repo** (`package.json`,
  `capacitor.config.json`, dossier `android/`) — `app.html` et les
  `functions/` Cloudflare Pages ne changent pas d'un octet.
- **Identifiant d'application provisoire** : `com.dropit.app`. À figer avant
  la première publication sur le Play Store — ce champ ne peut plus changer
  après un premier envoi.
- Icônes : reprend telles quelles celles déjà préparées dans `icons/`
  (chantier PWA du 9 septembre, jamais commitées). Un travail plus soigné
  (icône adaptative complète, toutes densités) est laissé pour plus tard —
  ce n'est pas ce qui bloque un premier `.apk` de test.

## Hors périmètre (pour cette branche)

- iOS / Xcode / compte Apple Developer — branche dédiée séparée, sur
  confirmation.
- Notifications push (Firebase) — chantier à part entière, pas une
  dépendance du paquet Android lui-même.
- Signature de release pour le Play Store (clé de signature, `.aab` signé) —
  vient une fois le `.apk` de debug validé.
- Fiche Play Store (description, captures, politique de confidentialité).

## Ce qui a été vérifié avant de commencer

Outils disponibles dans cet environnement : Node 22, Java 21, Gradle 8.14.3.
**Le SDK Android n'est pas installé** — à confirmer si une compilation réelle
(`gradlew assembleDebug`) est possible ici, ou si elle devra se faire ailleurs
(poste de l'utilisateur, CI). Le scaffolding du projet (fichiers de config,
structure `android/`) ne dépend pas du SDK ; seule la compilation en dépend.

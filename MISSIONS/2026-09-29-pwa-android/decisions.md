# Décisions — PWA Android

Statut : **validée** = confirmée par l'utilisateur ; **proposée** = choix par défaut, modifiable ; **à trancher** = attend l'utilisateur.

## Validées

- **V1** (2026-09-29) Faire d'abord la PWA Android et la publier, puis migrer vers React Native.

## Proposées

- **D1 Empaquetage par TWA, pas par la coquille Capacitor.** Voir CADRAGE §4. La coquille Capacitor reste intacte.
- **D2 Icônes : le logotype « DROP • IT » (commit `78d8448`, 17/09), pas la goutte terracotta du 09/09.** Source 1024 px reprise de `assets/icon.png` de `feature/capacitor-android`, copiée dans `livrables/source-icone-1024.png`. Le fond blanc et le logotype centré tiennent dans la zone sûre « maskable » (80 % de diamètre), donc la même image sert d'icône maskable.
- **D3 Service worker : réseau seul, aucun cache.** L'ancien `sw.js` servait le cache d'abord ; réutilisé tel quel il réintroduirait les versions périmées combattues par `_headers`. Le nouveau ne fait que fournir une page hors connexion quand une navigation échoue.
- **D4 `start_url: "/app"` et portée `"/app"`.** `/app.html` renvoie une redirection 308 vers `/app` ; démarrer sur `/app` évite une redirection au lancement. La portée limitée à l'app garde la landing et les pages externes hors du mode plein écran. La connexion OAuth revient sur `origin + pathname`, donc sur `/app`, déjà dans la portée.
- **D5 `theme_color` = `#F8F8F9` (le fond de l'UI), au lieu du terracotta `#BF5B44` de l'ancienne piste.** L'app est claire et dessinée bord à bord ; une barre d'état terracotta jurerait avec l'écran. Cosmétique, réversible en une ligne.
- **D6 Pas de mode hors-ligne réel.** Voir CADRAGE §5.

## À trancher par l'utilisateur

- **D7 État du compte Play Console** : existe-t-il, personnel ou organisation ? Détermine la durée avant publication (test fermé obligatoire pour un compte personnel récent).
- **D8 Conservation de la clé de signature** : qui garde la clé d'envoi, où. Avec la signature gérée par Play (recommandé), la clé d'envoi reste remplaçable par procédure Play ; sans cela, la perdre bloque les mises à jour.

## Itérations

_(rien pour l'instant)_

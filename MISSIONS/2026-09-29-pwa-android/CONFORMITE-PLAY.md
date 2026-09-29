# Conformité Google Play — état au 2026-09-29

Branche : `feature/pwa-play-store`. Ce document distingue ce qui est **fait et vérifié**, ce qui est **à faire par le propriétaire**, et ce que je **n'ai pas pu vérifier**. Test automatique : `livrables/test-conformite-play.mjs` (41 vérifications).

## Exigences Google confirmées en ligne le 2026-09-29

| Exigence | Source |
|---|---|
| Nouvelles apps et mises à jour : cible **Android 16 (API 36)** ou plus depuis le **31/08/2026** (prolongation possible jusqu'au 01/11/2026) | [Play Console Help — target API](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en) |
| **Politique de confidentialité** : URL publique, active, non-PDF, non éditable ; l'entité de la fiche doit y figurer | [Developer Program Policy](https://support.google.com/googleplay/android-developer/answer/17105854?hl=en) |
| **Suppression de compte** : possible dans l'app **et** via une ressource web ; lien à déclarer dans le formulaire Sécurité des données | [Account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en) |
| Compte personnel créé après le 13/11/2023 : **test fermé, 12 testeurs, 14 jours continus** avant la production | [App testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en) |
| Digital Asset Links : avec Play App Signing, l'empreinte à publier est celle de la **clé de signature de l'app**, différente de la clé d'envoi ; il peut falloir les deux | [Chrome for Developers — TWA](https://developer.chrome.com/docs/android/trusted-web-activity/quick-start) |

## Fait sur cette branche, et vérifié

| Élément | Preuve |
|---|---|
| `manifest.json` complet (nom, id, portée, affichage, icônes, catégorie) | test-conformite-play : 10 vérifications |
| Icônes 192 / 512 / maskable aux **dimensions réelles** déclarées | décodage PNG dans le test |
| Icône maskable : tracé dans la **zone sûre** (rayon 190 px pour 205 autorisés), coin opaque | mesure en pixels ; **contre-épreuve** : un logotype agrandi ×1,6 fait échouer le test (rayon 302) |
| Icônes **reproductibles** : regénérées depuis la source, identiques à l'octet aux fichiers commités | comparaison des 6 fichiers |
| Service worker sans cache, installabilité Chromium, parcours connecté | `livrables/test-pwa.js` : 38/38 |
| Page `confidentialite.html` (brouillon complet), page `suppression-compte.html` | rendu vérifié sur 390 px, clair et sombre, sans débordement |
| Politique cohérente avec le code : chaque prestataire appelé par le serveur y est nommé ; le bouton décrit existe ; aucun traceur dans le code | test-conformite-play |
| Liens vers les deux pages depuis l'écran de connexion et la feuille de compte | test-conformite-play |
| Aucun keystore ni mot de passe de signature dans le dépôt | test-conformite-play |

## Reprises pour doute sur l'origine (décision : refaire)

| Élément | Constat | Décision |
|---|---|---|
| **`.well-known/assetlinks.json`** : empreinte `63:AB:33:E4:…` avec `handle_all_urls` | Ajoutée le 2026-09-18 par une session d'IA (commit `78751d2`) pour un mécanisme App Link qui **a été mis de côté** faute de keystore stable. Aucun keystore versionné. Le workflow de la branche Capacitor compile un APK de debug dont la clé n'est pas reproductible. **Aucun moyen de rattacher l'empreinte à une clé détenue par quelqu'un.** Elle était servie en production. L'app Android actuelle utilise le schéma personnalisé `com.dropit.app://auth-callback`, pas ce lien : la retirer ne casse aucun flux. | **Remplacée par `[]`.** L'empreinte réelle viendra de la Play Console (Play App Signing). |
| Icônes | Origine vérifiée (source 1024 px, script, octets identiques) | **Conservées.** Rien à refaire. |
| `sw.js` | Écrit pour cette mission, testé (38/38), contre-épreuve avec l'ancien worker qui échoue 6 fois | **Conservé.** |

## Décisions prises en autonomie (réversibles)

- **Âge minimum 16 ans** affiché dans la politique. Motif : le questionnaire propose « Moins de 18 ans » et collecte genre, situation familiale et âge des enfants ; l'âge du consentement numérique en France est 15 ans. **Aucun contrôle technique n'existe** : c'est une déclaration. Le public cible à cocher dans la Play Console doit rester cohérent (16–17 et 18+, pas d'enfants).
- **Tutoiement** dans les pages légales, comme dans l'app.
- Pages légales **statiques**, sans script, dans `/confidentialite` et `/suppression-compte` (URL propres servies par Cloudflare Pages).
- Aucun outil de mesure d'audience ajouté : le test le vérifie.

## À faire par le propriétaire (bloquant pour la soumission)

1. **Créer le compte Play Console** (identité, paiement), puis lancer le **test fermé à 12 testeurs / 14 jours**.
2. **Compléter les 7 champs** de la politique et de la page de suppression : nom de l'éditeur, e-mail de contact, pays d'hébergement de la base, garanties de transfert vers Anthropic, conservation des sauvegardes, ce qui subsiste après suppression, âge minimum. `node …/test-conformite-play.mjs` les liste.
3. **Décider le nom de paquet** : `com.dropit.app` est **définitif** dès le premier téléversement, et je n'ai pas pu vérifier qu'il est libre.
4. **Adresse publique** : Google affiche le nom légal et l'e-mail ; l'adresse complète l'est si l'app est monétisée. Choisir adresse personnelle ou domiciliation avant le palier payant.
5. **Remplir le formulaire Sécurité des données** avec : e-mail, prénom, identifiant utilisateur, informations de profil (âge, genre, situation), contenu généré par l'utilisateur (projets, notes) ; chiffrement en transit (HTTPS) ; suppression possible avec les deux liens. Les échanges avec Anthropic sont un traitement pour notre compte, ce qui n'est **pas** un « partage » au sens de Google : **à confirmer dans le formulaire**, je ne l'ai pas vérifié.
6. **Classification du contenu**, déclaration « pas de publicité », catégorie Productivité.

## À produire ensuite, avec moi

- **Captures d'écran conformes.** Les 13 captures existantes font 780×1688, ratio 2,16. Google limite le grand côté à 2× le petit, de mémoire : **à vérifier dans la Play Console**. Si confirmé, les regénérer en 1080×1920 depuis le compte de démonstration.
- **Image de présentation 1024×500** (obligatoire) : n'existe pas.
- **Descriptions** de la fiche (courte 80 caractères, longue 4 000).
- **Paquet Android** ciblant l'API 36 : PWABuilder ou Bubblewrap, puis workflow GitHub Actions signé. **Non préparé volontairement** : le SDK Android est inaccessible depuis mon environnement, donc je ne pourrais pas valider la configuration, et une configuration non validée est exactement le doute d'origine que cette branche cherche à éliminer.
- **Empreinte** de la clé de signature Play → `assetlinks.json`.

## Non vérifié

- Comportement de la **connexion Google dans une TWA** : raisonné, jamais testé sur téléphone.
- **Installation réelle** sur un appareil Android et depuis l'URL de production.
- Que Cloudflare Pages sert bien `/confidentialite` et `/suppression-compte` sans `.html` : comportement documenté, mais la branche n'est pas déployée. À contrôler dès le premier aperçu.
- La limite de 2:1 des captures, la disponibilité du nom de paquet, la qualification exacte des échanges avec Anthropic dans le formulaire Google.

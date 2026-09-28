# Échec d'enregistrement + lot de 4 retouches (2026-09-28, soirée)

## 1. « Échec de l'enregistrement » : la vraie cause

**Symptôme** : le changement de photo (et, on le découvre, toute modification) n'était pas enregistré, avec le toast « Échec de l'enregistrement ».

**Cause** : chaque sauvegarde partait avec `fetch(..., {keepalive: true})`. Les navigateurs plafonnent le corps d'une requête keepalive à **64 Kio** (cumulé entre toutes celles en vol) ; au-delà, `fetch()` échoue sur-le-champ (`TypeError: Failed to fetch`) **sans jamais atteindre le serveur**. Le compte principal pèse **67 104 octets** (8 projets, mesuré en base : tailles et compteurs uniquement, jamais le contenu) : depuis qu'il a franchi ce seuil, **aucune sauvegarde de ce compte n'aboutit**, quelle que soit la modification. Dernière sauvegarde réussie de ce compte : 19:36 UTC.

**Reproduit** (`keepalive-repro.js`) dans Chromium : avec `keepalive:true`, 60 000 octets passent, 65 000 / 67 104 / 70 000 sont refusés ; sans `keepalive`, tout passe.
**Reproduit dans l'app** (`save-check.js gros`, compte simulé de 73 Ko) :

| | requêtes reçues par le serveur | toast | photo enregistrée |
|---|---|---|---|
| Avant | 0 | « Échec de l'enregistrement » | non (ancienne) |
| Après | 1 (73 Ko, HTTP 200) | aucun | oui |

**Correctif** (`app.html`, `sendSaveNow` et alentours) :
- `keepalive` réservé à la fermeture de page, et seulement si le corps fait moins de 60 000 octets.
- **Relance automatique** sur réseau coupé, délai dépassé (30 s), 429 ou 5xx : 2 s, 5 s, 15 s, 30 s puis 60 s. Un seul message par épisode (« Enregistrement en attente — nouvelle tentative automatique »), puis « Modifications enregistrées » au succès. Un refus définitif (400, 413) n'est pas relancé.
- **Reprise immédiate** au retour du réseau (`online`) et au retour sur l'application (`visibilitychange`), sans attendre le délai.
- **Une seule sauvegarde à la fois** : les modifications faites pendant un envoi partent juste après, au lieu d'une seconde requête concurrente (qui se conflictait avec la première).
- **Après reconnexion / rechargement** : toute photo posée est gardée dans le navigateur (`localStorage`) jusqu'à confirmation du serveur, puis rejouée au chargement suivant. Une photo plus récente déjà sur le serveur n'est jamais écrasée. Le rejeu sur conflit est limité à une fois par épisode, sinon un conflit permanent bouclerait.

**Vérifié** (`save-check.js`, Playwright, `fetch` réel + interception réseau) :
- `reprise` : 500, 500, puis 200 → 3 envois, un seul message d'attente, puis « enregistrées ».
- `reseau` : requête abandonnée (réseau coupé), puis événement `online` → reprise en 15 ms, photo enregistrée.
- `rechargement` : panne, photo en attente localement, page rechargée, serveur revenu → rejouée, envoyée (200), stockage local vidé, photo affichée.
- `file` : sauvegarde lente pendant des éditions → 1 requête simultanée maximum (2 avant), 3 envois au lieu de 4, dernière édition bien arrivée.
- `conflit` : 409, 409, puis 200 → converge sans message ; 409 permanent → borné à 10 envois en 16 s, photo gardée en attente.

**Limite** : à la fermeture de l'onglet, un compte de plus de 60 Ko ne peut plus utiliser `keepalive` ; ce dernier envoi devient « au mieux ». La photo en attente est alors rejouée au chargement suivant.

**Non vérifié** : la limite de 30 appels par minute côté serveur (partagée entre lecture et écriture) comme cause additionnelle. La requête de contrôle sur la table de limitation n'a pas été autorisée, donc elle reste une hypothèse, non prouvée.

## 2. Bouton Drop it
Fond blanc (avec un liseré, sinon il se fond dans la barre blanche), point rouge, pastille de notification rouge. Nouveau jeton `--notif-red` (`#D42A20`, assombri pour tenir 4,5:1 avec le texte blanc de la pastille).

## 3. Sélection des photos Pexels (`functions/api/photos.js`)
Pexels n'a **aucune catégorie « fond d'écran »** : on ne peut pas filtrer à la source. La sélection est donc faite côté serveur :
- 30 résultats au lieu de 6, et le mot `wallpaper` reste dans la requête.
- Filtre dur : grand côté d'au moins 2560 px, et pas de visage de face (lu dans le texte alt **et** le slug de l'URL).
- Classement : signaux « fond d'écran » (wallpaper, background, backdrop : +3 ; paysage, panorama, coucher de soleil, montagne, océan… : +2 ; logo, capture, texte… : -2). À égalité, l'ordre de pertinence de Pexels est conservé.
- Le repli sur `photos[0]` est supprimé : il renvoyait un portrait quand tout était écarté. Sans résultat convenable, l'API répond 404 et la tuile garde son fond couleur + icône.
- « Changer la photo » **conserve désormais l'ancienne photo** tant qu'une nouvelle n'est pas trouvée (elle était effacée d'avance : avec ce filtre plus strict, on aurait pu se retrouver sans photo). Message : « Aucune photo adaptée trouvée — la photo actuelle est conservée ».
- Test : `test-pickphoto.mjs`, 8 cas sur résultats simulés, tous verts.

**Limite** : c'est un classement par mots-clés sur le texte de la photo, pas une garantie. Non testé contre le vrai Pexels (injoignable depuis le bac à sable). Un mode « strict » (n'accepter que les photos portant un signal) est possible, au prix de davantage de tuiles sans photo.

## 4. Vue liste
Barre d'ajout de tâches supprimée (rendu, écouteurs, styles), ainsi que `performTlSuggest` et `sparkleIcon`, qui n'avaient plus d'autre usage. La marge basse du défilement ne réserve plus la place de la barre.

## 5. Icône de tuile
Encadré carré à fond blanc, dont le côté vaut 1,75 × le glyphe (39 px pour un glyphe de 22, 25 px avec photo, 26 px sur les petites tuiles), coins arrondis proportionnels. Sur photo, une ombre remplace l'ancienne ombre portée du glyphe.

## Captures
`lot2-accueil.png` (tuiles), `lot2-barre.png` (bouton Drop it), `lot2-liste.png` (vue liste sans barre d'ajout).

## Rejouer
`save-check.js` attend `app-avant.html` (`git show <commit avant>:app.html`) et `app-apres.html` passés par `mkfixture2.js <source> <sortie>`, servis sur `http://localhost:8941/`. Les captures viennent de `verif-lot2.js` (fixture à `fetch` simulé du dossier précédent).

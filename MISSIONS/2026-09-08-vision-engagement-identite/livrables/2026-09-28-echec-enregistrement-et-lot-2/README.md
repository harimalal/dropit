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

## 3. Sélection des photos Pexels : refaite (précision + fond d'écran seulement)

**Retour** : « la sélection n'est pas précise, rien à voir avec le projet ; il faut prendre en compte, dans la taxonomie, l'icône et le titre exclusivement », puis « sélection wallpaper seulement ».

**Pourquoi c'était hors sujet** (quatre causes, dont une introduite par ma propre modification du soir) :
1. Le rattrapage des projets sans photo envoyait le **titre français brut** à Pexels (« Vendre ma voiture wallpaper »), que Pexels comprend mal.
2. Les mots-clés génériques du domaine (« travel vacation landscape scenic »…) étaient ajoutés **devant** le sujet et le noyaient.
3. À la création, la requête venait de l'**intention complète**, pas de l'icône et du titre.
4. Mon classement « fond d'écran » donnait +2 aux mots paysagers (montagne, mer…) : une belle montagne passait devant une photo du projet. Confirmé sur l'ancien code : pour la requête « car », il renvoie le paysage.

**Nouveau chemin unique** (création, rattrapage, bouton « Changer la photo ») :
- L'IA reçoit **le titre et l'icône, et rien d'autre** (plus de résumé ni d'intention), et rend un **sujet** : 1 à 3 mots anglais, l'objet que représente l'icône dans le contexte du titre (🚗 + « Vendre ma voiture » → `car`).
- La requête Pexels **est** ce sujet, sans mots génériques devant. Les mots du domaine ne servent que de repli si aucun sujet n'est déduit ; sinon l'icône seule (taxonomie) ; sinon **aucune photo** (jamais le titre français).
- Si l'IA est indisponible ou limitée (429), **aucune photo n'est posée** : une photo choisie sur une requête pauvre ne serait jamais retentée, alors qu'un projet sans photo l'est à la prochaine visite.
- « Changer la photo » ne reproposera **pas les photos déjà vues** pour ce projet (elle renvoyait toujours la première) et **garde l'ancienne photo** si rien de convenable n'est trouvé.

**Côté serveur** (`functions/api/photos.js`), une photo n'est retenue que si elle remplit **les trois conditions** :
1. **Fond d'écran** : son texte alt ou le slug de son URL contient wallpaper, backdrop, desktop, 4K, 8K, HD, lock screen ou background (« in the background » exclu), et rien de graphique (logo, capture, texte…) ; et au moins 2560 px de grand côté. Pexels n'a aucun filtre « fond d'écran » : le texte est le seul indice disponible, donc une photo sans cet indice est **écartée**, pas seulement moins bien classée.
2. **Sans visage de face**, et pas déjà proposée.
3. **Qui parle du sujet** : au moins un mot du sujet dans son texte. Plus de mots du sujet = mieux ; puis le mot « wallpaper » explicite ; à égalité, l'ordre de Pexels.

Sans photo qui remplisse les trois, l'API répond 404 : la tuile garde son fond couleur + icône. 80 résultats demandés (le maximum) pour que le filtre strict garde de quoi choisir. Les « aucune photo convenable » sont **mémorisés 24 h** par projet (clé titre + icône) pour ne pas relancer l'IA et Pexels à chaque rechargement, ce qui grillerait le quota gratuit de Pexels (200 requêtes par heure).

**Vérifié** :
- `test-pickphoto.mjs` : 20 cas verts (fond d'écran seulement, sujet seulement, visages, résolution, exclusion, mots-clés).
- `photo-query-check.js` (vrai navigateur, `fetch` réel, réponses simulées) : le prompt contient le titre et l'icône et **pas** le résumé ; la requête Pexels vaut `car` (pas de titre français) ; sujet vide → mots du domaine ; « Changer la photo » deux fois → `exclude=100` puis `exclude=100,102` ; IA en 429 → **aucune** requête Pexels ; 404 → mémorisé, **0** appel IA et **0** appel Pexels au rechargement ; icône seule → repli sur la taxonomie.

**Risque à surveiller** : le filtre est strict et je n'ai pas pu le tester contre le vrai Pexels (injoignable depuis le bac à sable). Si trop de tuiles restent sans photo, il faudra ajuster ; le levier est la condition 1 ou 3, à décider avec des exemples réels.

## 4. Vue liste
Barre d'ajout de tâches supprimée (rendu, écouteurs, styles), ainsi que `performTlSuggest` et `sparkleIcon`, qui n'avaient plus d'autre usage. La marge basse du défilement ne réserve plus la place de la barre.

## 5. Icône de tuile
**Cercle** à fond blanc (demandé après un premier essai en carré arrondi), dont le diamètre vaut 1,75 × le glyphe (39 px pour un glyphe de 22, 25 px avec photo, 26 px sur les petites tuiles). Sur photo, une ombre remplace l'ancienne ombre portée du glyphe.

## Captures
`lot2-accueil.png` (tuiles, icônes en cercle), `lot2-barre.png` (bouton Drop it), `lot2-liste.png` (vue liste sans barre d'ajout).

## Rejouer
`save-check.js` attend `app-avant.html` (`git show <commit avant>:app.html`) et `app-apres.html` passés par `mkfixture2.js <source> <sortie>`, servis sur `http://localhost:8941/`. Les captures viennent de `verif-lot2.js` (fixture à `fetch` simulé du dossier précédent).

# Journal — onboarding de personnalisation

Journal en ajout seul : on complète, on ne réécrit pas.

## 2026-09-14 — Lots 1 et 5 (schéma, API, injection IA)

- `setup.sql` : table `dropit_user_profile` (une ligne par compte, `answers jsonb`,
  `completed_at`). Séparée de `dropit_user_data`, qui est réécrite en entier à
  chaque sauvegarde debouncée des projets.
- `functions/api/profile.js` : GET (lecture) et POST (upsert). `completed_at`
  n'est posé que sur un POST `{completed:true}`, donc jamais effacé par une
  sauvegarde intermédiaire. Plafonds : 32 Ko de corps, 60 clés.
- `functions/_lib/profile.js` : table `LABELS` (identifiant stable → français) et
  `profileContext()` qui construit le bloc injecté. Toute panne de lecture
  renvoie `null` : un profil indisponible ne doit jamais faire échouer un appel IA.
- `functions/api/ai.js` : le bloc profil est préfixé au `system` côté serveur —
  un seul point de passage, impossible à contourner depuis le client.

**La table n'est pas encore appliquée sur la base de production** : à faire
avec le feu vert explicite, avant le premier déploiement de cette branche.
Sans elle, l'API répond en erreur et l'app retombe simplement sur le
comportement actuel (aucun profil, aucun blocage).

## 2026-09-15 — Lots 2, 3 et 4 (questionnaire, chaînage, profil)

- `app.html` : styles `.obq-*` repris de la maquette validée (univers bleu,
  fond en dégradé, badge blanc pour le bouton), puis le questionnaire lui-même :
  `QUIZ` (20 écrans), `PROFILE_MOODS`, `PROFILE_QUIPS`, rendu, transitions,
  navigation, sauvegarde.
- Écran conditionnel : « Quel âge ont tes enfants ? » n'apparaît que si la
  réponse précédente est « Oui ». Le compteur suit (1/19 puis 1/20), et les
  emojis d'humeur comme les phrases sont projetés sur la longueur réelle du
  parcours — la dernière reste toujours 😎 / « t'es une star ».
- Une sélection ne redessine pas l'écran : on bascule les classes à la main.
  Sinon un champ « Autre… » en cours de saisie perdrait son texte et son focus.
- Chaînage : `load()` sait désormais si le compte est neuf et enchaîne
  questionnaire → visite guidée → notice « projets d'exemple ». `bootAfterAuth()`
  ne déclenche plus la visite guidée directement : elle partait avant que les
  données soient chargées, donc avant le questionnaire.
- « Plus tard » sur le premier écran quitte le questionnaire entier ; « Passer »
  sur les suivants efface la réponse de l'écran et avance.
- Profil : bouton dans la feuille compte → liste des réponses, chaque ligne
  rouvre le questionnaire à cette question, plus « Refaire le questionnaire ».
  Accessible aussi aux comptes existants, qui n'ont pas vu le questionnaire.
- Vérifié en navigateur réel (Playwright, 390×844) : les 20 écrans, le compteur,
  la barre, les humeurs, les choix multiples, les champs libres, le retour
  arrière, la reprise depuis le profil, et l'enchaînement complet d'un compte
  neuf. Aucune erreur JS.

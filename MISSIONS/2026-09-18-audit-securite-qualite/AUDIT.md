AUDIT SECURITE, QUALITE ET ROBUSTESSE — DROPIT
Fait le 2026-09-18, pour une cible de 1000 clients actifs par jour, en continuité du premier audit
(MISSIONS/2026-09-06-audit-securite/AUDIT.md). Méthode identique : lecture directe du code
(app.html, functions/api/*.js, functions/_lib/*.js, android/, setup.sql, _headers), chaque point
référence un fichier et une ligne précis — pas de suppositions.

VERDICT GLOBAL : les trois points bloquants du 06/09 (liste blanche de modèles IA, plafond de
taille sur /api/projects, sauvegarde forcée à la fermeture) sont bien corrigés et tiennent toujours.
Le code ajouté depuis (profil de personnalisation, Capacitor Android, glissement de navigation)
n'introduit pas de faille d'isolation entre comptes. En revanche, deux points du premier audit
restent ouverts et se révèlent aujourd'hui plus sérieux qu'estimé au départ (S1/S6 ci-dessous) : leur
combinaison forme un vrai chemin d'exploitation, pas juste une faiblesse théorique.


1. SECURITE — MAJEUR

1.1 [RÉÉVALUÉ — toujours ouvert] Vol de données inter-comptes via la reprise "device_id"
(functions/api/projects.js, claimLegacyData/deleteLegacyData, lignes 10-35 ; app.html ligne 1101)
Au premier login, GET /api/projects?device_id=X cherche une ligne abandonnée dans la table historique
dropit_projects, la rattache au compte appelant, PUIS LA SUPPRIME de la table historique. Le device_id
n'est jamais vérifié comme appartenant à l'appelant — n'importe quel compte authentifié (gratuit à
créer) peut fournir n'importe quel device_id et récupérer ce qu'il contient.
Combiné à deux faits : (a) le device_id est prévisible (app.html:1101 —
"did-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,10), donc un horodatage de
création + ~41 bits d'un générateur non cryptographique), et (b) aucune limite de débit n'existe sur
cet endpoint (voir 1.2) — un attaquant peut scanner des device_id à la chaîne depuis un unique compte
jetable et voler, puis effacer, les données pré-authentification d'autres visiteurs.
Le premier audit notait ce point (2.4) comme "risque pratique faible" : en réévaluant le chemin
complet (endpoint de reprise + absence de limite + hasard faible), le risque réel est plus élevé —
c'est une vraie fuite/suppression de données inter-comptes, seulement bornée aujourd'hui par le faible
volume de la table legacy (~18 lignes orphelines constatées le 06/09, jamais purgées depuis, voir 6.1
de l'audit précédent).
Correctif recommandé (le plus simple d'abord) : migrer ces ~18 lignes une bonne fois puis supprimer
entièrement ce mécanisme de reprise devenu inutile (plus aucun flux ne crée de nouvelles lignes
pré-auth aujourd'hui — vérifié, getOrCreateDeviceId() n'est plus appelé qu'à cet unique endroit). Si le
mécanisme doit rester : limiter le nombre de tentatives par IP/compte et par minute.

1.2 [TOUJOURS OUVERT depuis le 06/09] Aucune limite de débit (rate limiting) applicatif
/api/ai, /api/projects, /api/profile n'ont toujours aucun throttling. Deux conséquences concrètes :
- ça permet le scan de device_id décrit en 1.1 ;
- ça laisse un compte unique (bug client ou abus) spammer /api/ai sans frein, avec un risque de coût
  ET de disponibilité (un pic de consommation dégraderait le service pour tous les comptes actifs sur
  le même quota Anthropic partagé, pas seulement pour l'auteur du pic).
Correctif : compteur simple par user_id (quelques dizaines de requêtes/minute suffisent), par exemple
via Cloudflare KV ou Durable Objects.


2. SECURITE — MOYEN

2.1 [NOUVEAU] Interception possible du retour de connexion Google/Apple sur l'app Android
(android/app/src/main/AndroidManifest.xml)
Le retour d'authentification native (ajouté pour Capacitor) utilise un schéma d'URL personnalisé
(com.dropit.app://auth-callback) déclaré sur l'activité principale, exported="true". Sur Android,
un schéma personnalisé (contrairement à un App Link https vérifié) peut être déclaré par n'importe
quelle autre application installée sur le même téléphone — c'est une technique connue de vol de
jeton : une app malveillante présente sur l'appareil pourrait tenter d'intercepter cette redirection,
qui transporte access_token/refresh_token dans le fragment d'URL (app.html, consumeOAuthHash()).
Probabilité faible en pratique (suppose qu'une app ciblant spécifiquement ce schéma soit installée
chez la victime) mais la conséquence serait sérieuse (prise de contrôle de session).
Correctif : migrer vers un Android App Link vérifié (fichier assetlinks.json publié sur
dropit-dbx.pages.dev + android:autoVerify="true"), qu'Android réserve exclusivement au propriétaire
du domaine — élimine la possibilité d'interception par une autre app.


3. SECURITE — MINEUR

3.1 [TOUJOURS OUVERT depuis le 06/09, élargi] Champ "emoji" jamais échappé au rendu
Le premier audit comptait 5 emplacements (index.html de l'époque) ; avec Liste, Agenda et l'écran
Priorités ajoutés depuis, il y en a maintenant 10 dans app.html : lignes 2826, 3099, 3158, 3238, 3309,
3346, 3438, 3447, 3541, 3552, 4231. Même constat qu'au 06/09 : p.emoji peut venir d'une réponse IA
sans validation stricte que c'est bien un emoji ; contrairement à title/summary/notes (échappés
systématiquement via escapeHtml), il ne l'est jamais. Impact confiné au compte propriétaire (pas de
vue publique/partagée), mais la surface s'est élargie et le correctif reste gratuit.

3.2 [NOUVEAU, faible] Injection de prompt via les champs libres du profil de personnalisation
(functions/_lib/profile.js, freeText(), champs "mot" et "*_autre")
Ces champs texte libre (tronqués à 300 caractères, mais jamais filtrés) sont insérés tels quels dans
le system prompt envoyé à Claude à chaque appel IA (functions/api/ai.js, profileContext). Un
utilisateur pourrait y écrire des instructions destinées à manipuler le comportement de l'IA — mais
uniquement pour lui-même, sur son propre compte : aucune fuite inter-compte possible aujourd'hui.
À resurveiller si une fonctionnalité de partage de réponses IA entre comptes apparaît un jour.

3.3 [TOUJOURS OUVERT depuis le 06/09] Messages d'erreur Supabase bruts renvoyés au client
functions/api/projects.js lignes 59 et 122 ; functions/api/profile.js lignes 21 et 84 — le texte
d'erreur brut de Supabase (json({error: await res.text()}, 500)) part tel quel vers le client à
chaque échec, dans les deux fichiers désormais (le profil n'existait pas au 06/09).

3.4 [TOUJOURS OUVERT depuis le 06/09] Content-Security-Policy absente (_headers)
Toujours seulement X-Frame-Options, X-Content-Type-Options, Referrer-Policy — pas de CSP ni de
Permissions-Policy.

3.5 [TOUJOURS OUVERT depuis le 06/09] Aucune suppression de compte en libre-service
Obligatoire sous RGPD si des utilisateurs européens sont concernés — toujours absent de l'app.

3.6 [À NOTER, PAS UN RISQUE] Row Level Security activée sans policies explicites
(setup.sql, dropit_user_data et dropit_user_profile)
"enable row level security" sans la moindre policy pour authenticated/anon revient à un refus par
défaut pour ces rôles — correct ici car toute la donnée transite exclusivement par les fonctions
Cloudflare avec la clé service_role (qui contourne RLS de toute façon), jamais directement depuis le
client (vérifié : aucun appel client vers .../rest/v1/... dans app.html, uniquement vers /auth/v1/...
avec la clé anon, ce qui est l'usage prévu). Cette garantie tiendra tant que personne n'ajoute une
policy authenticated par erreur sans la contraindre à user_id = auth.uid() — à documenter dans
setup.sql pour un futur relecteur.


4. ROBUSTESSE / RISQUE DE BUG — MOYEN

4.1 [NOUVEAU] Condition de course dans le glissement de navigation (app.html, slideScreenOutThenBack
et goBackOneLevel, ajoutés le 18/09)
Le retour d'un écran (projet/liste/agenda) attend 280ms — le temps de l'animation — avant d'effacer
l'état (currentProjectId / taskListOpen / calendarOpen) et de redessiner. Si l'utilisateur déclenche
une NOUVELLE navigation dans cette fenêtre de 280ms (ex : retour d'un projet puis toucher aussitôt une
autre carte visible en dessous), le premier setTimeout s'exécute quand même et efface l'état — y
compris celui du nouvel écran ouvert entre-temps — renvoyant l'utilisateur à l'accueil sans raison
apparente. Fenêtre de déclenchement étroite (deux actions rapprochées de moins de 280ms), aucune perte
de données, mais un vrai bug de navigation reproductible sur une manipulation rapide. Ce schéma existait
déjà pour Liste avant le 06/09 (déjà exposé au même risque) ; il est maintenant dupliqué sur 3 écrans.
Correctif : associer un jeton/compteur de génération à chaque appel et ne laisser le setTimeout agir
que s'il correspond encore à la navigation en cours au moment de son exécution.

4.2 [TOUJOURS OUVERT depuis le 06/09] Pas de détection de conflit multi-appareils
functions/api/projects.js, writeUserData — toujours un écrasement complet sans comparaison
d'updated_at. Un compte ouvert sur deux appareils voit toujours le dernier qui sauvegarde écraser
silencieusement l'autre.


5. ROBUSTESSE / RISQUE DE BUG — MINEUR

5.1 [TOUJOURS OUVERT depuis le 06/09] Échec silencieux de la génération de "DNA" de projet
app.html, performGenerateDNA() ligne 4297-4303 : le .catch(function(){}) reste vide, aucun message
à l'utilisateur en cas d'échec.

5.2 [TOUJOURS OUVERT depuis le 06/09] Pas de retry/backoff sur les appels IA
Toujours pas de nouvelle tentative automatique en cas d'erreur/rate-limit Anthropic (529) — correct
pour un MVP, mais à 1000 utilisateurs un pic de charge côté Anthropic causerait une vague d'échecs
visibles simultanés plutôt que d'être lissé.


6. PERFORMANCE / FREIN AU TRAFIC ET A L'UTILISATION

6.1 [NOUVEAU, mineur] render() recalcule maintenant systématiquement l'accueil, même masqué
Le changement du 18/09 (glissement de navigation) fait que render() reconstruit toujours
renderHome() + layoutHomeTreemap() en premier, même quand un projet/liste/agenda est ouvert
par-dessus et que l'accueil n'est pas visible. Chaque interaction sur un sous-écran (cocher une tâche,
taper un message au chat...) recalcule donc aussi tout l'agencement du treemap de l'accueil, en pure
perte. Sans impact perceptible pour un usage normal (quelques dizaines de projets), mais un gaspillage
CPU cumulatif sur des téléphones d'entrée de gamme avec beaucoup de projets — c'est le prix payé pour
l'animation de glissement, à surveiller si des retours de lenteur apparaissent.

6.2 [TOUJOURS OUVERT depuis le 06/09, amplifié par 6.1] Rendu complet du DOM à chaque changement d'état
render() continue de réécrire tout le HTML de la zone concernée plutôt que de ne mettre à jour que ce
qui a changé — même constat qu'au 06/09, un peu plus coûteux maintenant du fait de 6.1.

6.3 [MOYEN] L'absence de rate limiting (1.2) est aussi un risque de disponibilité, pas seulement de
coût : un pic d'usage légitime ou un bug client en boucle sur /api/ai consommerait le quota Anthropic
partagé et dégraderait le service pour TOUS les comptes actifs au même moment, pas seulement pour son
auteur — un vrai frein au trafic à l'échelle de 1000 utilisateurs/jour, pas qu'une ligne de facture.

6.4 [MINEUR] Poids de page — app.html avoisine ~250 Ko de CSS+JS non minifiés (avant compression
automatique gzip/brotli de Cloudflare). Choix architectural délibéré (un seul fichier, pas de build
step) : pas bloquant pour 1000 utilisateurs/jour, mais peut ralentir le tout premier chargement sur
connexion mobile lente. Aucune minification ni découpage en morceaux (lazy loading) en place — à
surveiller si le fichier continue de grossir.

6.5 [POSITIF, à noter] La capacité serveur elle-même n'est pas un risque à ce volume
Cloudflare Pages Functions scalent horizontalement sans configuration ; 1000 utilisateurs/jour
représente une charge très faible pour cette plateforme (quelques requêtes par seconde au pic, grand
maximum). Les vrais goulots à cette échelle sont ailleurs : le quota Anthropic partagé (6.3) et le
palier du plan Supabase actuel (connexions simultanées, bande passante) — ce dernier point est hors du
périmètre de cet audit (config d'infrastructure, pas de code) et mérite une vérification séparée.


7. SUIVI DE L'AUDIT DU 06/09 — RÉCAPITULATIF

Corrigé et vérifié toujours en place :
- 1.1 (liste blanche modèles/max_tokens sur /api/ai) — fait, functions/api/ai.js:8-11,33-38.
- 1.3 (plafond de taille /api/projects) — fait, functions/api/projects.js:83-84,92-93,102-103,117-119.
- 3.1 (sauvegarde forcée à la fermeture) — fait, app.html:2560-2575 (visibilitychange + pagehide +
  keepalive:true).

Toujours ouvert (voir sections ci-dessus pour le détail actualisé) :
- 1.2 rate limiting → ici 1.2
- 2.1 échapper p.emoji → ici 3.1 (surface élargie)
- 2.3 erreurs Supabase brutes → ici 3.3 (élargi à profile.js)
- 2.4 device_id non cryptographique → ici 1.1 (gravité réévaluée à la hausse)
- 2.5 CSP absente → ici 3.4
- 2.6 suppression de compte → ici 3.5
- 3.2 conflit multi-appareils → ici 4.2
- 4.1 échec silencieux DNA → ici 5.1
- 4.2 rendu complet du DOM → ici 6.2
- 4.3 pas de retry IA → ici 5.2
- 6.1/6.2 (table legacy jamais nettoyée / absente de setup.sql) — statut non revérifié dans cet audit,
  probablement toujours vrai.

Nouveau depuis le 06/09 :
- 2.1 interception OAuth Android (custom scheme)
- 3.2 injection de prompt via le profil (faible, confiné au compte)
- 4.1 course dans le glissement de navigation
- 6.1 recalcul superflu de l'accueil masqué


8. RECOMMANDATION DE PRIORITE

A traiter avant 1000 utilisateurs actifs (chemin d'exploitation réel ou risque de disponibilité
partagée) :
- 1.1 + 1.2 ensemble : purger/retirer la reprise device_id, ET poser un rate limit basique — les deux
  se répondent, l'un sans l'autre laisse la porte ouverte.
- 6.3 (même cause que 1.2, conséquence différente : disponibilité du service pour tous)

A traiter rapidement après (sécurité ou expérience, pas bloquant) :
- 3.1 échapper p.emoji (10 emplacements, coût nul)
- 2.1 App Link vérifié pour le retour OAuth Android
- 3.5 suppression de compte en libre-service
- 4.1 corriger la course du setTimeout de navigation (jeton de génération)
- 4.2 détection de conflit multi-appareils

Le reste (3.2 à 3.6, 5.x, 6.1, 6.2, 6.4) peut suivre au fil de l'eau sans urgence.

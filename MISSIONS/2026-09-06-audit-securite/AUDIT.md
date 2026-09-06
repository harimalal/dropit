AUDIT SECURITE, QUALITE ET FIABILITE — DROPIT
Fait le 2026-09-06, pour une cible de 1000 utilisateurs pérennes.
Méthode : lecture complète du code (index.html, functions/api/*.js, functions/_lib/auth.js, setup.sql, _headers), pas de suppositions — chaque point référence un fichier et une ligne précis.

Verdict global : l'isolation multi-tenant de base est solide (JWT vérifié serveur à chaque requête, RLS activée, jamais de user_id venant du client). Le point le plus grave déjà trouvé cette session (fuite de données entre comptes via device_id) est corrigé et nettoyé en base. Les points restants ci-dessous sont d'un ordre de grandeur inférieur, mais plusieurs sont réels et à traiter avant une croissance à 1000 comptes actifs.


1. SECURITE — MAJEUR

1.1 [CORRIGÉ 2026-09-06, commit 1dec6bd] Aucune limite sur ce qui part vers l'API Anthropic (functions/api/ai.js, lignes 22-30)
Le endpoint /api/ai vérifie que l'appelant est authentifié, mais transmet ensuite tout le corps de la requête tel quel à Anthropic — modèle, max_tokens, contenu — sans aucune validation. N'importe quel compte authentifié (gratuit à créer) peut appeler directement /api/ai avec un modèle plus cher (ex: opus) et un max_tokens élevé, sans passer par l'interface. La clé Anthropic est partagée (pas de BYOK) : à 1000 comptes, un seul abus ou bug client peut faire exploser la facture, sans aucun garde-fou serveur.
Correctif : sur le serveur, imposer une liste blanche de modèles autorisés (claude-haiku-4-5-20251001, claude-sonnet-4-6) et un plafond de max_tokens, rejeter toute requête hors de ces bornes.

1.2 Aucune limite de débit (rate limiting) sur les endpoints applicatifs
/api/ai, /api/projects et les routes d'auth n'ont aucun throttling applicatif. Cloudflare protège contre le DDoS volumétrique au niveau du edge, mais rien n'empêche un compte unique de spammer /api/ai (coût) ou /api/projects (écriture) en boucle serrée.
Correctif : ajouter un rate limit simple par user_id (ex: compteur dans une table ou KV Cloudflare, quelques dizaines de requêtes/minute).

1.3 [CORRIGÉ 2026-09-06, commit b26a4f7] Aucune validation de la taille ou de la structure des données envoyées à /api/projects (functions/api/projects.js, lignes 92-95)
Le serveur vérifie seulement que state.projects est un tableau — pas de limite de taille du payload JSON, pas de validation des champs internes (titre, résumé, notes peuvent être n'importe quoi, de n'importe quelle longueur). Un compte peut donc gonfler indéfiniment sa ligne dropit_user_data (bug client ou abus volontaire), sans blocage serveur.
Correctif : plafonner la taille du corps de la requête (ex: 500 Ko) et le nombre de projets/tâches par compte à un seuil raisonnable.


2. SECURITE — MINEUR

2.1 Champ "emoji" jamais échappé au rendu (index.html, lignes 1872, 1925, 2023, 2110, 2123)
Contrairement au titre, au résumé et aux notes (échappés systématiquement via escapeHtml, vérifié à 39 endroits), le champ p.emoji est inséré tel quel dans le HTML. Comme il peut provenir d'une réponse IA (generateProject, ligne 2790 : result.emoji || "✨") sans validation qu'il s'agit bien d'un emoji, une injection de prompt réussie pourrait en théorie y placer du HTML actif. Impact limité : cela ne s'afficherait que dans la vue du même compte (l'isolation entre comptes n'est pas cassée), mais c'est un vrai trou d'hygiène de code à corriger — le coût du correctif est nul.
Correctif : passer p.emoji dans escapeHtml() partout où il est affiché, comme c'est déjà fait pour title/summary.

2.2 Aucune validation par champ des données entrantes sur /api/projects
Dans le même esprit que 2.1 : le serveur accepte n'importe quelle valeur dans n'importe quel champ d'un projet (title, emoji, summary, notes...). Rien n'empêche un appel direct à l'API (hors client web) de stocker du contenu arbitraire. Comme il n'y a pas de vue publique ou partagée d'un projet, l'impact reste confiné au compte propriétaire — mais si une fonctionnalité de partage arrive un jour, ce point devient majeur d'un coup.

2.3 Messages d'erreur bruts renvoyés au client (functions/api/projects.js, lignes 59 et 98)
En cas d'échec Supabase, le texte d'erreur brut de Supabase est renvoyé tel quel au client (json({error: await res.text()}, 500)). Cela peut exposer des détails internes (noms de table, structure) à qui inspecte le réseau. Risque faible mais facile à corriger.
Correctif : logger l'erreur détaillée côté serveur (console.error), renvoyer un message générique au client ("Erreur serveur, réessaie").

2.4 device_id généré avec Math.random(), pas une source cryptographique (index.html, ligne 751)
Le device_id (did-<timestamp>-<random>) sert de clé de récupération pour les données créées avant connexion. Math.random() n'est pas conçu pour être imprévisible côté sécurité. Risque pratique faible maintenant que la récupération est à usage unique (fix de ce jour), mais crypto.randomUUID() serait plus rigoureux pour une valeur qui sert de clé d'accès à des données.

2.5 Content-Security-Policy absente (_headers)
Le fichier _headers pose de bons en-têtes (X-Frame-Options, X-Content-Type-Options, Referrer-Policy) mais aucune Content-Security-Policy. C'est une couche de défense en profondeur en moins contre le XSS, qui coûte peu à ajouter même en configuration permissive au départ.

2.6 Aucune suppression de compte en libre-service
Un utilisateur peut supprimer un projet, mais pas son compte ni ses données depuis l'application. À 1000 utilisateurs réels, c'est un point d'attente basique côté confidentialité (et obligatoire sous RGPD si des utilisateurs européens sont concernés).


3. FIABILITE — MAJEUR

3.1 [CORRIGÉ 2026-09-06, commit b26a4f7] Perte silencieuse des dernières modifications à la fermeture de l'onglet (index.html, fonction persist(), ~ligne 1466)
persist() attend 350ms avant d'envoyer la sauvegarde au serveur (débounce). Si l'utilisateur ferme l'onglet, change d'app ou verrouille son téléphone dans cette fenêtre de 350ms après une action (cocher une tâche, par exemple), cette modification est perdue sans aucun message d'erreur — rien ne prévient l'utilisateur. Aucun gestionnaire beforeunload/visibilitychange/pagehide n'existe pour forcer l'envoi avant la fermeture (vérifié : aucune occurrence dans le fichier).
Correctif : écouter visibilitychange (et pagehide en repli) et déclencher un envoi immédiat (idéalement via navigator.sendBeacon, qui survit à la fermeture de page) si une sauvegarde est en attente.

3.2 Pas de gestion de la synchronisation multi-appareils (functions/api/projects.js, writeUserData)
La sauvegarde écrase toujours la totalité de dropit_user_data.data pour le compte (POST complet, sans version ni horodatage comparé). Si le même compte est ouvert sur deux appareils (téléphone + ordinateur, cas réaliste et attendu chez des utilisateurs réguliers), le dernier qui sauvegarde écrase silencieusement les modifications de l'autre — sans conflit détecté, sans avertissement.
Correctif minimal : comparer updated_at avant d'écraser, avertir l'utilisateur en cas de conflit plutôt que d'écraser silencieusement. Une vraie fusion serait plus lourde à construire et pas nécessaire dans l'immédiat.


4. FIABILITE — MINEUR

4.1 Échec silencieux de la génération de "DNA" de projet (index.html, ligne 2765-2771)
performGenerateDNA() : en cas d'échec de l'appel IA, le catch ne fait rien du tout (ni message, ni log). L'utilisateur ne voit jamais que la fonctionnalité a échoué.

4.2 Rendu complet du DOM à chaque changement d'état (index.html, render(), ligne 1551)
Chaque appel à render() réécrit tout le innerHTML de la zone concernée plutôt que de mettre à jour uniquement ce qui a changé. Sans impact pour un usage normal (dizaines de tâches), mais un utilisateur avec plusieurs centaines de tâches dans un même projet pourrait ressentir des ralentissements visibles à chaque interaction. Pas bloquant à court terme, à surveiller si des power users apparaissent.

4.3 Dépendance à la disponibilité de l'API Anthropic sans file d'attente ni retry
Tous les appels IA (suggestion, chat, génération de projet) échouent immédiatement et affichent un message d'indisponibilité si Anthropic répond une erreur ou un rate-limit (529 par exemple) — pas de retry automatique avec backoff. Comportement correct pour un MVP, mais à 1000 utilisateurs simultanés un pic de charge Anthropic causerait une vague d'échecs visibles en même temps plutôt que d'être lissé.


5. FONCTIONNEL — MAJEUR

Aucun bug fonctionnel majeur trouvé dans le code lu (au-delà du bug d'isolation déjà corrigé ce jour). Les flux principaux (création de projet, catégories, tâches, notes, chat, priorités, auth, récupération de mot de passe) sont cohérents et déjà testés en direct dans cette session.


6. FONCTIONNEL — MINEUR

6.1 Table historique dropit_projects jamais nettoyée automatiquement
18 lignes orphelines restent dans la table legacy (visites anonymes jamais transformées en compte, avant le système d'auth actuel). Elles ne posent plus de risque avec le fix d'aujourd'hui (récupération à usage unique), mais s'accumulent indéfiniment sans jamais être purgées si personne ne revient les réclamer.
Correctif simple : une tâche planifiée (cron) qui supprime les lignes de dropit_projects plus vieilles que, disons, 90 jours.

6.2 Table dropit_projects absente de setup.sql
setup.sql ne documente que dropit_user_data. La table legacy dropit_projects existe en base (confirmé par requête directe) mais n'est tracée nulle part dans le dépôt — un futur relecteur du code ne saurait pas qu'elle existe ni pourquoi le code y fait référence.


7. DESIGN — MINEUR

7.1 Pas d'indicateur visible de sauvegarde en cours ou réussie
L'utilisateur n'a aucun retour visuel qu'une sauvegarde a eu lieu (pas de "Enregistré" discret, pas d'icône de synchronisation). Combiné au point 3.1, cela peut renforcer un sentiment de perte de confiance si une sauvegarde échoue sans que rien ne le signale.

7.2 Pas d'état "hors ligne" géré
Rien dans le code ne détecte une perte de connexion (navigator.onLine, ou détection d'échec réseau récurrent) pour prévenir l'utilisateur plutôt que de le laisser deviner pourquoi ses actions ne se sauvegardent plus.


RECOMMANDATION DE PRIORITE AVANT MONTEE EN CHARGE

A traiter avant d'ouvrir à 1000 utilisateurs (impact financier ou perte de données) :
- 1.1 liste blanche de modèles/max_tokens sur /api/ai
- 1.3 plafond de taille sur /api/projects
- 3.1 sauvegarde forcée à la fermeture de l'onglet (sendBeacon)

A traiter rapidement après (sécurité ou expérience, mais pas bloquant) :
- 1.2 rate limiting basique
- 2.1 échapper p.emoji
- 3.2 détection de conflit multi-appareils
- 2.6 suppression de compte en libre-service

Le reste (2.2 à 2.5, 4.x, 6.x, 7.x) peut suivre au fil de l'eau sans urgence.

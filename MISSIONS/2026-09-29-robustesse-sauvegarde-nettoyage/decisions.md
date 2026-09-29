# Décisions — Robustesse de la sauvegarde, sécurité, nettoyage

## Validées

**D1 — Plafond d'octets à 2 Mo.** Mesure : 50 projets d'usage moyen = 503 Ko, l'ancien plafond
était à 500 Ko, donc SOUS le cas nominal. 2 Mo laisse 4× de marge.
*Écarté :* 1 Mo (2× seulement, exclut les gros utilisateurs de notes) ; 10 Mo (aucune protection,
et chaque sauvegarde enverrait 10 Mo sur mobile).

**D2 — 50 projets maximum.** Décision produit de l'utilisateur. Aligne deux plafonds qui se
contredisaient (300 annoncés, ~60 réellement atteignables).

**D3 — Alerte à 70 % du plafond, une fois par session.** Un plafond qu'on découvre en le heurtant
est un défaut de conception.

**D4 — Bandeau persistant sur refus définitif.** Posé sur `<body>`, hors du cycle `render()`, donc
il survit aux rendus. Remplace un toast de 1,8 s qui repartait à chaque modification sans rien
expliquer.

**D5 — Ne pas réémettre un état identique.** Comparaison d'octets, jamais court-circuitée pendant
une reprise d'échec.

**D9 — Création refusée avant l'appel IA.** Au-delà du plafond, inutile de dépenser un appel IA et
une recherche de photo pour un projet que le serveur refusera.

**D10 — Liste blanche des champs `/api/ai`.** Cinq champs relayés. Le corps du client partait
auparavant tel quel avec la clé partagée.

**D11 — Photos restreintes au domaine `pexels.com`, pas à l'hôte exact.** Un changement de CDN côté
Pexels ferait disparaître toutes les photos enregistrées, et Pexels est injoignable depuis le bac à
sable : impossible de vérifier que l'hôte ne bougera pas. Même règle appliquée des deux côtés.

**D12 — Le champ `dna` est conservé.** Son générateur était mort et a été supprimé, mais le champ
peut contenir une valeur sur les comptes existants. L'effacer aurait été une perte de données au
profit d'un nettoyage cosmétique. Documenté comme hérité, en lecture seule.

**D13 — Les couleurs ne sont PAS unifiées.** Mesure : `rgb`, `ink` et `strong` sont des dérivées
exactes de `solid`, mais `glass` s'en écarte de +10 à +60 par canal selon la teinte. Unifier la
barre de progression sur `solid`, comme le plan d'audit le suggérait, aurait changé visiblement
l'émeraude et la sarcelle. Les valeurs restent intactes ; un test fige les quatre relations.
*C'est la décision la plus importante de ce lot :* le nettoyage « évident » aurait été une
régression visuelle.

## Écartées, et pourquoi

**D6 — Synchronisation incrémentale.** La vraie cause : chaque modification renvoie tout le compte.
Demande un format de delta, une résolution de conflit par champ et une migration. Incompatible avec
« sans rien casser » en une passe. D1-D5 suppriment le risque de perte pour tout compte réaliste.
**C'est le prochain chantier**, et la mesure de ce lot lui sert de base.

**D7 — Séparation des 85 variables d'état.** Gros diff sur 6 000 lignes, zéro bénéfice visible,
rapport risque/valeur le plus mauvais du plan.

**D8 — Dérivation des couleurs par `color-mix()`.** Remplacée par le test d'alignement (voir D13) :
on garde les valeurs réglées à la main, on gagne le filet qui manquait.

**Découpage du fichier.** À ne lancer qu'après D7.

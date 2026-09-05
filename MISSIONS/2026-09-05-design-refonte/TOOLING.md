# TOOLING — Refonte design DROPIT

Mission entièrement locale : édition d'un fichier, calculs déterministes, vérification visuelle en navigateur. Aucun MCP externe requis, aucun compte à connecter.

## Édition du design system et des écrans
Candidats : Edit/Read natifs / réécriture manuelle
Scores : natif=95  manuel=20
Retenu : Edit/Read natifs — déjà l'outil de tout le travail DROPIT à ce jour, zéro friction
MCP requis : — — statut : —
Plan B si indispo : —

## Calcul des ratios de contraste WCAG (Auditeur de contraste)
Candidats : script Python natif (formule WCAG relative luminance) / service web tiers
Scores : python=90  service-web=55
Retenu : script Python natif (Bash) — formule publique, déterministe, pas de dépendance réseau, pas de compte à créer
MCP requis : — — statut : —
Plan B si indispo : —

## Vérification visuelle et non-régression (Vérificateur, Gardien de la clarté)
Candidats : Playwright MCP / claude-in-chrome MCP
Scores : playwright=88  chrome=80
Retenu : Playwright — déjà connecté et utilisé avec succès dans cette même session (tests auth, captures d'écran), pas de nouvelle connexion à faire
MCP requis : mcp__plugin_playwright_playwright — statut : connecté (vérifié cette session)
Plan B si indispo : claude-in-chrome, même niveau de couverture

## Mockup basse fidélité (test décisif)
Candidats : fichier HTML autonome natif
Scores : natif=95
Retenu : HTML autonome dans `livrables/`, même méthode que `MOCKUPS/design_v1.html` de la session précédente — déjà éprouvée
MCP requis : — — statut : —
Plan B si indispo : —

## Déploiement (après feu vert utilisateur)
Candidats : git + wrangler (déjà authentifié sur ce compte, vérifié en session précédente)
Scores : git+wrangler=95
Retenu : identique au pipeline de déploiement déjà utilisé pour l'authentification
MCP requis : — — statut : —
Plan B si indispo : —

---

## MCP à connecter par l'utilisateur avant Phase 3
Aucun. Tous les outils requis sont déjà en place et éprouvés dans cette session.

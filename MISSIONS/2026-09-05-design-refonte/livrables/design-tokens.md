# Design tokens — DROPIT, Palette Étendue

Livrable de l'agent Directeur artistique. Architecture à 3 niveaux (décision verrouillée, point 4).
**Version finale (v5)** — verrouillée après le test décisif (5 itérations, voir `decisions.md`), prête pour la Phase 3.

## Niveau 1 — Primitives

```css
/* Neutres — fond app allégé vers le blanc (v5, écart au brief initial, confirmé explicitement par l'utilisateur) */
--n-canvas:#FCFBFA; --n-canvas-card:#FFFFFF; --n-ink:#2B2420; --n-ink-soft:#7A7168; --n-ink-faint:#A79E93;
--n-line:#EFEBE6;

/* Chrome — inchangé, réservé aux boutons génériques/top bars/écrans auth */
--n-chrome-accent:#BF5B44; --n-chrome-accent-soft:#F3E2DC;

/* Chrome IA — override scopé (barre de saisie IA uniquement), réutilise le token statut existant */
--n-ia-accent:var(--n-status-actif); --n-ia-accent-soft:var(--n-status-actif-soft);

/* Statut (inchangé — porte l'anneau du treemap, indépendant de la couleur de projet) */
--n-status-actif:#3F8A5C; --n-status-actif-soft:#E3EFE6;
--n-status-ralentit:#C48A2E; --n-status-pause:#A79E93; --n-status-accompli:#BF5B44;

/* Projet — 8 teintes, UNE base par teinte, déclinée en 2 voiles de transparence (v5) + 1 solide réservé */
--n-terracotta-base:#DD664B; --n-terracotta-card:#FCF3F1; --n-terracotta-badge:#F5D4CD; --n-terracotta-solid:#D25C41;
--n-corail-base:#DD4B6F;     --n-corail-card:#FCF1F3;     --n-corail-badge:#F5CDD7;     --n-corail-solid:#D24165;
--n-ambre-base:#DDA04B;      --n-ambre-card:#FCF7F1;      --n-ambre-badge:#F5E4CD;      --n-ambre-solid:#C6872F;
--n-emeraude-base:#4BDDA0;   --n-emeraude-card:#F1FCF7;   --n-emeraude-badge:#CDF5E4;   --n-emeraude-solid:#27A571;
--n-sarcelle-base:#4BDDDD;   --n-sarcelle-card:#F1FCFC;   --n-sarcelle-badge:#CDF5F5;   --n-sarcelle-solid:#26A1A1;
--n-azur-base:#4BA0DD;       --n-azur-card:#F1F7FC;       --n-azur-badge:#CDE4F5;       --n-azur-solid:#4196D2;
--n-indigo-base:#574BDD;     --n-indigo-card:#F2F1FC;     --n-indigo-badge:#D0CDF5;     --n-indigo-solid:#4D41D2;
--n-mure-base:#B84BDD;       --n-mure-card:#F9F1FC;       --n-mure-badge:#EBCDF5;       --n-mure-solid:#AE41D2;

/* Rayons */
--n-radius-lg:18px; --n-radius-md:12px; --n-radius-sm:10px;

/* Espacements */
--n-space-1:4px; --n-space-2:8px; --n-space-3:12px; --n-space-4:16px; --n-space-5:20px; --n-space-6:24px; --n-space-7:32px;
```

## Niveau 2 — Sémantique

```css
--color-surface-app:var(--n-canvas);
--color-surface-neutral:var(--n-canvas-card);
--color-text-primary:var(--n-ink);
--color-text-secondary:var(--n-ink-soft);   /* jamais sur fond de carte teinté */
--color-text-on-tint:var(--n-ink);          /* obligatoire sur toute carte/badge teinté par projet */
--color-border:var(--n-line);
--color-chrome-accent:var(--n-chrome-accent);        /* boutons génériques, top bars, auth */
--color-ia-accent:var(--n-ia-accent);                /* barre de saisie IA uniquement (toutes occurrences) */
--color-status-ring:var(--n-status-actif);           /* switché en JS selon activityStatus() */
--radius-card:var(--n-radius-lg);
--radius-control:var(--n-radius-md);
--radius-tight:var(--n-radius-sm);
```

Palette projet exposée comme triplet `--project-base` / `--project-card` / `--project-badge` (+ `--project-solid` pour le seul composant checkbox), assignée par JS de façon déterministe à partir de l'id du projet (fonction de hash simple → index 0-7, jamais aléatoire, jamais recalculée d'une session à l'autre).

## Niveau 3 — Composant

```css
--tile-radius:var(--radius-card);
--tile-ring:inset 0 0 0 2px var(--color-status-ring);              /* anneau statut : bordure fine, pas de conic-gradient */
--tile-shadow:0 2px 10px rgba(43,36,32,.07);                       /* léger relief (v5) */
--badge-size:44px; --badge-size-sm:36px;                           /* agrandis (v5, +4/+4px) */
--badge-bg:var(--project-badge);                                   /* voile 28% — JAMAIS le solide */
--checkbox-bg-done:var(--project-solid);                           /* seul usage du solide : coche blanche dessus */
--compose-btn-bg:var(--color-ia-accent);
--compose-btn-glow:0 0 0 6px var(--color-ia-accent-soft);
```

## Règle d'usage (à faire respecter par le Constructeur, vérifiée par le Directeur artistique)

- Aucune couleur hex ne doit apparaître dans une règle de composant — uniquement des `var(--...)`
- `--project-badge` (voile 28%) et `--project-solid` (plein) ne sont **jamais interchangeables** : le badge de tuile/liste ne contient qu'un emoji (pas de contrainte de contraste stricte, le voile suffit) ; le solide sert uniquement là où un élément blanc (coche) est posé dessus et doit rester lisible
- `--color-ia-accent` ne s'applique qu'aux éléments de la barre de saisie IA (toutes les occurrences dans l'app : accueil, projet, catégorie, task list) — le reste du chrome garde `--color-chrome-accent`

# Audit de contraste — Palette Étendue

Livrable de l'agent Auditeur de contraste. Calcul réel (formule WCAG relative luminance, script Python), pas une estimation visuelle.

## Méthode
- Badges pleins (contiennent un checkmark/icône blanc dans certains contextes — checkbox "fait") : seuil WCAG 1.4.11 non-text = **3:1 minimum**
- Fonds de carte teintés (portent du texte de tâche/titre) : seuil WCAG 1.4.3 texte normal AA = **4.5:1 minimum**, texte évalué avec `--ink` (#2B2420), jamais `--ink-soft`

## Résultat — 8/8 teintes conformes

| Teinte | Badge plein | Contraste vs blanc | Seuil 3:1 | Fond de carte | Contraste vs `--ink` | Seuil 4.5:1 |
|---|---|---|---|---|---|---|
| Terracotta | `#D25C41` | 3.93 | OK | `#F7EBE8` | 13.08 | OK |
| Corail | `#D24165` | 4.48 | OK | `#F7E8EC` | 12.87 | OK |
| Ambre | `#C6872F` | 3.04 | OK (marge faible) | `#F7F1E8` | 13.59 | OK |
| Émeraude | `#27A571` | 3.13 | OK (marge faible) | `#E8F7F1` | 13.81 | OK |
| Sarcelle | `#26A1A1` | 3.14 | OK (marge faible) | `#E8F7F7` | 13.87 | OK |
| Azur | `#4196D2` | 3.22 | OK | `#E8F1F7` | 13.34 | OK |
| Indigo | `#4D41D2` | 6.99 | OK large | `#E9E8F7` | 12.61 | OK |
| Mûre | `#AE41D2` | 4.68 | OK large | `#F4E8F7` | 12.89 | OK |

## Points de vigilance pour la Phase 3

Ambre, émeraude et sarcelle passent le seuil avec une marge faible (3.04 à 3.14, seuil 3.0). Si le Constructeur ajoute un jour un texte (pas juste une icône) directement sur ces badges pleins, repasser par cet agent avant de livrer — le seuil texte (4.5:1) n'est pas garanti à cette luminosité. Pour l'instant, ces badges ne portent que des emoji ou des icônes graphiques (checkmark), jamais de texte : le seuil 3:1 s'applique et est respecté.

## Mise à jour v5 — nouveau mécanisme (voiles de transparence, pas deux hex indépendants)

Après retour utilisateur "pas premium", le mécanisme a changé : au lieu de badge-plein-solide + carte-pastel-indépendante, chaque teinte de projet est maintenant UNE base + 2 voiles de transparence (8% carte, 28% badge) + 1 solide réservé au seul composant checkbox. Nouveau calcul, texte `--ink` :

| Teinte | Carte (8%) | Contraste vs `--ink` | Badge (28%) | Contraste vs `--ink` |
|---|---|---|---|---|
| Terracotta | `#FCF3F1` | 13.98 | `#F5D4CD` | 11.03 |
| Corail | `#FCF1F3` | 13.82 | `#F5CDD7` | 10.61 |
| Ambre | `#FCF7F1` | 14.33 | `#F5E4CD` | 12.25 |
| Émeraude | `#F1FCF7` | 14.54 | `#CDF5E4` | 12.92 |
| Sarcelle | `#F1FCFC` | 14.59 | `#CDF5F5` | 13.06 |
| Azur | `#F1F7FC` | 14.14 | `#CDE4F5` | 11.64 |
| Indigo | `#F2F1FC` | 13.64 | `#D0CDF5` | 9.98 |
| Mûre | `#F9F1FC` | 13.82 | `#EBCDF5` | 10.60 |

**16/16 valeurs conformes**, marge minimale 9.98 (seuil 4.5) — très confortable, ces voiles restent toutes très claires même à 28%.

Le solide (checkbox uniquement, calcul initial toujours valide) reste inchangé : 8/8 conformes au seuil 3:1, voir tableau plus haut.

## Verdict
**24/24 valeurs (8 cartes + 8 badges + 8 solides) conformes.** Aucun blocage pour la Phase 3.

// Vérifie que les jetons de couleur dérivés restent alignés sur leur teinte source.
//
// Pourquoi ce test existe : les 8 teintes de projet ont 11 variantes chacune, toutes écrites
// à la main. Trois d'entre elles (rgb, ink, strong) sont de pures dérivées arithmétiques de
// `solid` — rien ne le vérifiait, et c'est exactement ce défaut d'alignement qui avait laissé
// un commentaire affirmer que la barre de progression et l'overlay du titre partageaient une
// teinte alors qu'ils en utilisaient deux différentes.
//
// `glass` n'est PAS une dérivée : mesurée, elle s'écarte de +10 à +60 par canal selon la
// teinte. C'est une palette distincte, réglée à la main. Elle est donc figée telle quelle,
// pas recalculée : unifier la barre de progression sur `solid` changerait visiblement
// l'émeraude et la sarcelle.
import { readFileSync } from "node:fs";
const s = readFileSync("app.html", "utf8");
let ok = 0, ko = 0;
const t = (nom, cond, detail) => { if (cond) { ok++; console.log("✓ " + nom); } else { ko++; console.log("✗ " + nom + (detail ? " — " + detail : "")); } };

const TEINTES = ["terracotta", "corail", "ambre", "emeraude", "sarcelle", "azur", "indigo", "mure"];
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lire = (nom, suffixe, re) => { const m = s.match(new RegExp("--proj-" + nom + "-" + suffixe + ":" + re)); return m ? m[1] : null; };

// Tolérance de 1 point sur 255 : les valeurs sont arrondies à la main, pas calculées.
const proche = (a, b) => a.every((v, i) => Math.abs(v - b[i]) <= 1);
const mult = (c, k) => c.map((v) => Math.round(v * k));

// Relation attendue, mesurée sur l'état livré (voir le commentaire du bloc de jetons d'app.html)
const GLASS_ATTENDU = {
  terracotta: [221, 102, 75], corail: [221, 75, 111], ambre: [221, 160, 75], emeraude: [75, 221, 160],
  sarcelle: [75, 221, 221], azur: [75, 160, 221], indigo: [87, 75, 221], mure: [184, 75, 221],
};

for (const n of TEINTES) {
  const solid = hex(lire(n, "solid", "(#[0-9A-Fa-f]{6})"));
  const rgb = lire(n, "rgb", "([\\d,]+)").split(",").map(Number);
  const ink = hex(lire(n, "ink", "(#[0-9A-Fa-f]{6})"));
  const strong = hex(lire(n, "strong", "(#[0-9A-Fa-f]{6})"));
  const glass = lire(n, "glass", "rgba\\(([\\d,]+),0").split(",").map(Number);

  t(n + " : rgb = composantes de solid", rgb.join() === solid.join(), rgb + " vs " + solid);
  t(n + " : ink = solid x 0,55", proche(ink, mult(solid, 0.55)), ink + " vs " + mult(solid, 0.55));
  t(n + " : strong = solid x 0,75", proche(strong, mult(solid, 0.75)), strong + " vs " + mult(solid, 0.75));
  t(n + " : glass figée (palette distincte, pas une dérivée)", glass.join() === GLASS_ATTENDU[n].join(), glass + " vs " + GLASS_ATTENDU[n]);
}

// Le nombre de teintes doit rester cohérent avec la liste utilisée par le code
const noms = s.match(/var PROJECT_COLOR_NAMES = \[([^\]]+)\]/)[1].split(",").map((x) => x.trim().replace(/["']/g, ""));
t("PROJECT_COLOR_NAMES couvre exactement les 8 teintes déclarées", noms.sort().join() === [...TEINTES].sort().join(), noms.join());

console.log("\n" + (ko ? ko + " ÉCHEC(S) sur " + (ok + ko) : "tout est vert (" + ok + " cas)"));
process.exit(ko ? 1 : 0);

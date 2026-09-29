// L'empreinte est calculée des deux côtés (navigateur et serveur) et DOIT donner le même résultat,
// sinon chaque projet paraît modifié et tout devient un faux conflit. Deux vérifications :
//  1. textuelle : les trois fonctions d'app.html et de functions/_lib/merge.js sont identiques
//     une fois retirés les `export`, les commentaires et l'indentation ;
//  2. fonctionnelle : mêmes empreintes sur un corpus varié, y compris après un aller-retour JSON.
// usage (racine du dépôt) : node MISSIONS/2026-09-29-sync-incrementale/livrables/test-parite-empreinte.mjs
import { readFileSync } from "node:fs";
import * as serveur from "../../../functions/_lib/merge.js";

let ok = 0, ko = 0;
const t = (nom, cond, detail) => { if (cond) { ok++; console.log("✓ " + nom); } else { ko++; console.log("✗ " + nom + (detail !== undefined ? " — " + JSON.stringify(detail) : "")); } };

// Extrait le code d'une fonction par comptage d'accolades (les chaînes et regex de ces fonctions ne
// contiennent aucune accolade, ce que la vérification 1 confirmerait sinon par un écart).
function extraire(source, nom) {
  const debut = source.search(new RegExp("(export )?function " + nom + "\\("));
  if (debut < 0) throw new Error("fonction introuvable : " + nom);
  let i = source.indexOf("{", debut), prof = 0;
  for (; i < source.length; i++) { if (source[i] === "{") prof++; else if (source[i] === "}" && --prof === 0) { i++; break; } }
  return source.slice(debut, i);
}
const normaliser = (code) => code.replace(/^export /, "").replace(/\/\/[^\n]*/g, "").split("\n").map((l) => l.trim()).filter(Boolean).join("\n");

const app = readFileSync("app.html", "utf8"), merge = readFileSync("functions/_lib/merge.js", "utf8");
for (const nom of ["stable", "cyrb53", "empreinte"]) {
  t("code de « " + nom + " » identique dans app.html et merge.js", normaliser(extraire(app, nom)) === normaliser(extraire(merge, nom)));
}

// Version « navigateur » : le code d'app.html, exécuté tel quel.
const client = new Function(extraire(app, "stable") + "\n" + extraire(app, "cyrb53") + "\n" + extraire(app, "empreinte") + "\nreturn {stable, cyrb53, empreinte};")();

const CORPUS = [
  null, 0, -1, 1.5, 1e21, 0.1 + 0.2, "", "a", "Été à Zürich 🌴 — « ça » ?", "naïve     \u0000 \\ \" '",
  [], {}, [[]], [{}], { a: 1 }, { b: 1, a: 2 }, { a: { c: [1, 2, { d: null }], b: "x" } },
  { id: "p1", title: "Projet", emoji: "🎯", categories: [{ id: "c", items: [{ id: "i", title: "T", done: false, notes: [] }] }], projectNotes: [], photo: null },
  { z: undefined, y: 1 }, { "clé avec espace": 1, "é": 2, "10": 3, "2": 4, "": 5 },
  Object.fromEntries(Array.from({ length: 200 }, (_, i) => ["k" + i, { n: i, s: "v".repeat(i % 7), a: [i, null, "é"] }])),
];
CORPUS.forEach((v, i) => {
  const a = client.empreinte(v), b = serveur.empreinte(v);
  t("corpus " + String(i).padStart(2) + " : même empreinte client/serveur (" + a + ")", a === b, [a, b]);
});

// Aller-retour JSON (ce que fait Postgres jsonb : clés réordonnées, nombres renormalisés) : l'empreinte
// d'un objet doit être celle de sa copie relue, quel que soit l'ordre des clés.
const projet = CORPUS[17];
const relu = JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(projet).reverse())));
t("aller-retour JSON avec clés inversées : empreinte inchangée (client)", client.empreinte(projet) === client.empreinte(relu));
t("aller-retour JSON avec clés inversées : empreinte inchangée (serveur)", serveur.empreinte(projet) === serveur.empreinte(relu));

// Sensibilité : une modification, même minime, DOIT changer l'empreinte (sinon un conflit passerait inaperçu).
const variantes = [
  { ...projet, title: "Projet." }, { ...projet, emoji: "🎲" }, { ...projet, photo: { url: "x" } },
  { ...projet, categories: [{ id: "c", items: [{ id: "i", title: "T", done: true, notes: [] }] }] },
  { ...projet, projectNotes: [{ id: "n" }] },
];
const base = client.empreinte(projet);
variantes.forEach((v, i) => t("variante " + i + " : empreinte différente", client.empreinte(v) !== base));
t("aucune collision parmi le corpus", new Set(CORPUS.map(client.empreinte)).size === new Set(CORPUS.map((v) => client.stable(v))).size);

console.log("\n" + (ko ? ko + " ÉCHEC(S) sur " + (ok + ko) : "tout est vert (" + ok + " cas)"));
process.exit(ko ? 1 : 0);

// Tests du chemin delta de functions/api/projects.js, par son VRAI point d'entrée, contre la fausse
// base à compare-and-swap de serveur-reel.mjs. usage (racine du dépôt) :
//   node MISSIONS/2026-09-29-sync-incrementale/livrables/test-serveur-delta.mjs
import { demarrerServeurReel } from "./serveur-reel.mjs";
import { empreinte } from "../../../functions/_lib/merge.js";

let ok = 0, ko = 0;
const t = (nom, cond, detail) => { if (cond) { ok++; console.log("✓ " + nom); } else { ko++; console.log("✗ " + nom + (detail !== undefined ? " — " + JSON.stringify(detail) : "")); } };

const P = (id, titre, extra = {}) => ({ id, title: titre, emoji: "🎯", summary: "", categories: [{ id: "c" + id, title: "Étapes", items: [{ id: id + "t", title: "Tâche", done: false, notes: [] }] }], projectNotes: [], ...extra });
const donnees = () => ({ projects: [P("a", "Alpha"), P("b", "Bravo"), P("c", "Charlie")], dropZone: [{ id: "d1", title: "idée 1" }] });
const delta = (o = {}) => JSON.stringify({ v: 1, upserts: [], deletes: [], dropAdds: [], dropDeletes: [], ...o });
const modifie = (p, titre) => ({ ...p, title: titre });
const ids = (s) => s.db.ligne.data.projects.map((p) => p.id).join(",");
const titre = (s, id) => (s.db.ligne.data.projects.find((p) => p.id === id) || {}).title;

async function neuf() { const s = await demarrerServeurReel({ racine: process.cwd() }); await s.semer(donnees()); return s; }
// Une exception dans un scénario (souvent : une réponse inattendue que le test lit) est un échec
// comme un autre, et n'empêche pas les scénarios suivants de tourner.
const dep = async (fn) => { const s = await neuf(); try { await fn(s); } catch (e) { t("scénario sans exception", false, String(e && e.message || e)); } finally { s.arreter(); } };

// ---------- application simple
await dep(async (s) => {
  const A = s.db.ligne.data.projects[0];
  let r = await s.appeler("POST", delta({ upserts: [{ project: modifie(A, "Alpha 2"), base: empreinte(A) }] }));
  t("modification avec la bonne base : 200, appliquée", r.statut === 200 && titre(s, "a") === "Alpha 2" && r.json.conflicts.length === 0, r.json);
  t("les autres projets sont intacts", titre(s, "b") === "Bravo" && titre(s, "c") === "Charlie");
  t("l'horodatage renvoyé est celui de l'écriture", typeof r.json.updatedAt === "string");
  r = await s.appeler("POST", delta({ upserts: [{ project: P("n", "Nouveau"), base: null }] }));
  t("nouveau projet (base null) ajouté", r.statut === 200 && ids(s) === "a,b,c,n", ids(s));
});

// ---------- conflits
await dep(async (s) => {
  const A = s.db.ligne.data.projects[0], vueParLeClient = empreinte(A);
  s.db.ligne.data.projects[0] = modifie(A, "Alpha modifié ailleurs");            // l'autre appareil est passé
  const r = await s.appeler("POST", delta({ upserts: [{ project: modifie(A, "Alpha local"), base: vueParLeClient }] }));
  t("projet modifié ailleurs : conflit « edited », pas d'écrasement", r.statut === 200 && r.json.conflicts.length === 1 && r.json.conflicts[0].kind === "edited", r.json);
  t("le conflit renvoie la copie du serveur", r.json.conflicts[0].server.title === "Alpha modifié ailleurs");
  t("la copie du serveur est conservée telle quelle", titre(s, "a") === "Alpha modifié ailleurs");
  t("aucune écriture pour un delta entièrement en conflit", s.db.ecritures === 0, s.db.ecritures);
});
await dep(async (s) => {
  const [A, B] = s.db.ligne.data.projects, baseA = empreinte(A), baseB = empreinte(B);
  s.db.ligne.data.projects[0] = modifie(A, "Alpha ailleurs");
  const r = await s.appeler("POST", delta({ upserts: [{ project: modifie(A, "Alpha local"), base: baseA }, { project: modifie(B, "Bravo local"), base: baseB }] }));
  t("delta mixte : le projet sans conflit est appliqué", titre(s, "b") === "Bravo local");
  t("delta mixte : le projet en conflit ne l'est pas", titre(s, "a") === "Alpha ailleurs" && r.json.conflicts.map((c) => c.id).join() === "a", r.json);
});
await dep(async (s) => {
  const A = s.db.ligne.data.projects[0];
  s.db.ligne.data.projects.splice(0, 1);                                          // supprimé ailleurs
  const r = await s.appeler("POST", delta({ upserts: [{ project: modifie(A, "Alpha local"), base: empreinte(A) }] }));
  t("projet supprimé ailleurs puis modifié ici : conflit « deleted-remote »", r.json.conflicts.length === 1 && r.json.conflicts[0].kind === "deleted-remote" && r.json.conflicts[0].server === null, r.json);
  t("… et il n'est pas ressuscité par le serveur (c'est au client de décider)", ids(s) === "b,c");
});
await dep(async (s) => {
  const A = s.db.ligne.data.projects[0];
  const r = await s.appeler("POST", delta({ upserts: [{ project: A, base: null }] }));
  const r2 = await s.appeler("POST", delta({ upserts: [{ project: modifie(A, "Autre"), base: null }] }));
  t("… « exists » si le contenu diffère", r2.json.conflicts.length === 1 && r2.json.conflicts[0].kind === "exists", r2.json);
  t("… et sans effet si le contenu est identique (nouvel essai)", r.json.conflicts.length === 0 && s.db.ecritures === 0);
});

// ---------- nouvel essai après réponse perdue : idempotence
await dep(async (s) => {
  const A = s.db.ligne.data.projects[0], corps = delta({ upserts: [{ project: modifie(A, "Alpha 2"), base: empreinte(A) }] });
  await s.appeler("POST", corps);
  const e1 = s.db.ecritures;
  const r = await s.appeler("POST", corps);
  t("même delta rejoué : 200 sans conflit", r.statut === 200 && r.json.conflicts.length === 0, r.json);
  t("… et sans nouvelle écriture", s.db.ecritures === e1, s.db.ecritures);
});

// ---------- suppressions
await dep(async (s) => {
  const B = s.db.ligne.data.projects[1];
  let r = await s.appeler("POST", delta({ deletes: [{ id: "b", base: empreinte(B) }] }));
  t("suppression avec la bonne base", r.statut === 200 && ids(s) === "a,c", ids(s));
  r = await s.appeler("POST", delta({ deletes: [{ id: "b", base: empreinte(B) }] }));
  t("suppression d'un projet déjà supprimé : succès, sans conflit", r.statut === 200 && r.json.conflicts.length === 0, r.json);
});
await dep(async (s) => {
  const B = s.db.ligne.data.projects[1], vue = empreinte(B);
  s.db.ligne.data.projects[1] = modifie(B, "Bravo modifié ailleurs");
  const r = await s.appeler("POST", delta({ deletes: [{ id: "b", base: vue }] }));
  t("supprimer un projet modifié ailleurs : refusé, la modification distante est conservée", r.json.conflicts.length === 1 && ids(s) === "a,b,c" && titre(s, "b") === "Bravo modifié ailleurs", r.json);
});

// ---------- Drop Zone : fusion exacte par identifiant
await dep(async (s) => {
  s.db.ligne.data.dropZone.push({ id: "d2", title: "ajouté par l'autre appareil" });
  const r = await s.appeler("POST", delta({ dropAdds: [{ id: "d3", title: "ajouté ici" }], dropDeletes: ["d1"] }));
  const dz = s.db.ligne.data.dropZone.map((x) => x.id).join();
  t("Drop Zone : l'ajout de l'autre appareil survit, le mien s'ajoute, la suppression s'applique", r.statut === 200 && dz === "d2,d3", dz);
  await s.appeler("POST", delta({ dropAdds: [{ id: "d3", title: "ajouté ici" }] }));
  t("Drop Zone : un ajout rejoué n'est pas dupliqué", s.db.ligne.data.dropZone.filter((x) => x.id === "d3").length === 1);
});

// ---------- concurrence d'écriture (compare-and-swap)
await dep(async (s) => {
  const B = s.db.ligne.data.projects[1];
  let fait = false;
  s.db.avantEcriture = (db) => { if (fait) return; fait = true;                    // un autre écrivain s'intercale UNE fois
    db.ligne = { ...db.ligne, data: { ...db.ligne.data, projects: db.ligne.data.projects.map((p) => p.id === "c" ? modifie(p, "Charlie par l'autre") : p) }, updated_at: new Date(Date.parse(db.ligne.updated_at) + 500).toISOString().replace(/\.(\d{3})Z$/, ".$1000+00:00") }; };
  const r = await s.appeler("POST", delta({ upserts: [{ project: modifie(B, "Bravo 2"), base: empreinte(B) }] }));
  s.db.avantEcriture = null;
  t("un écrivain s'intercale : le serveur refusionne tout seul, 200", r.statut === 200, r);
  t("… ma modification ET celle de l'autre sont là", titre(s, "b") === "Bravo 2" && titre(s, "c") === "Charlie par l'autre", [titre(s, "b"), titre(s, "c")]);
});
await dep(async (s) => {
  const B = s.db.ligne.data.projects[1];
  let n = 0;
  s.db.avantEcriture = (db) => { n++; db.ligne = { ...db.ligne, updated_at: new Date(Date.parse(db.ligne.updated_at) + 1000).toISOString().replace(/\.(\d{3})Z$/, ".$1000+00:00") }; };   // change à CHAQUE tentative
  const r = await s.appeler("POST", delta({ upserts: [{ project: modifie(B, "Bravo 2"), base: empreinte(B) }] }));
  s.db.avantEcriture = null;
  t("ligne disputée en permanence : 503 « busy » (réessayé sans message par le client)", r.statut === 503 && r.json.error === "busy", r);
  t("… après exactement 4 tentatives", n === 4, n);
  t("… et rien n'a été écrit", titre(s, "b") === "Bravo");
});

// ---------- plafonds appliqués sur le résultat de la fusion
await dep(async (s) => {
  const nouveaux = Array.from({ length: 48 }, (_, i) => ({ project: P("x" + i, "X" + i), base: null }));
  let r = await s.appeler("POST", delta({ upserts: nouveaux }));
  t("3 + 48 = 51 projets : refusé « too_many_projects »", r.statut === 400 && r.json.error === "too_many_projects" && r.json.limit === 50, r);
  t("… rien n'est écrit", s.db.ecritures === 0 && ids(s) === "a,b,c");
  r = await s.appeler("POST", delta({ upserts: nouveaux.slice(0, 47) }));
  t("3 + 47 = 50 projets : accepté (la limite est inclusive)", r.statut === 200, r);
});
await dep(async (s) => {
  const A = s.db.ligne.data.projects[0];
  const gros = { ...A, summary: "é".repeat(1100000) };                                // ~2,2 Mo en UTF-8 : dépasse 2 Mo une fois fusionné
  const r = await s.appeler("POST", delta({ upserts: [{ project: gros, base: empreinte(A) }] }));
  t("résultat > 2 Mo : refusé « too_large » (413) — mesuré en octets UTF-8, pas en caractères", r.statut === 413 && r.json.error === "too_large", r.statut);
});

// ---------- indépendance de l'ordre des clés (Postgres jsonb les réordonne)
await dep(async (s) => {
  const A = s.db.ligne.data.projects[0], baseClient = empreinte(A);
  const inverse = Object.fromEntries(Object.entries(A).reverse());
  s.db.ligne.data.projects[0] = inverse;
  const r = await s.appeler("POST", delta({ upserts: [{ project: modifie(A, "Alpha 2"), base: baseClient }] }));
  t("copie serveur aux clés dans un autre ordre : pas de faux conflit", r.statut === 200 && r.json.conflicts.length === 0 && titre(s, "a") === "Alpha 2", r.json);
});
await dep(async (s) => {
  const A = { ...P("u", "Été à Zürich 🌴 — « ça » marche ?"), summary: "naïve   séparateur \"guillemets\" \\ antislash" };
  await s.appeler("POST", delta({ upserts: [{ project: A, base: null }] }));
  const r = await s.appeler("POST", delta({ upserts: [{ project: modifie(A, "Été 2"), base: empreinte(JSON.parse(JSON.stringify(A))) }] }));
  t("accents, emoji, guillemets et séparateurs Unicode : l'empreinte tient l'aller-retour JSON", r.statut === 200 && r.json.conflicts.length === 0 && titre(s, "u") === "Été 2", r.json);
});

// ---------- validation
await dep(async (s) => {
  const essais = [
    ["upsert sans id", { upserts: [{ project: { title: "x" }, base: null }] }],
    ["base de type invalide", { upserts: [{ project: P("z", "Z"), base: 42 }] }],
    ["suppression sans base", { deletes: [{ id: "a" }] }],
    ["liste qui n'en est pas une", { upserts: "oui" }],
    ["trop d'upserts", { upserts: Array.from({ length: 301 }, (_, i) => ({ project: P("q" + i, "Q"), base: null })) }],
    ["identifiant démesuré", { dropDeletes: ["x".repeat(101)] }],
  ];
  for (const [nom, corps] of essais) {
    const r = await s.appeler("POST", delta(corps));
    t("delta mal formé refusé (« " + nom + " ») : 400 bad_delta", r.statut === 400 && r.json.error === "bad_delta", r);
  }
  t("… aucune écriture", s.db.ecritures === 0);
  const inconnue = await s.appeler("POST", JSON.stringify({ v: 2, upserts: [] }));
  t("version de protocole inconnue : 400 bad_delta (et non « state required », qui déclencherait le repli du client)", inconnue.statut === 400 && inconnue.json.error === "bad_delta", inconnue);
});

// ---------- l'ancien protocole est intact
await dep(async (s) => {
  const v = (await s.appeler("GET")).json.updatedAt;
  const state = { projects: [P("a", "Alpha legacy")], dropZone: [] };
  let r = await s.appeler("POST", JSON.stringify({ state, baseUpdatedAt: v }));
  t("ancien protocole, bonne base : 200", r.statut === 200 && titre(s, "a") === "Alpha legacy", r);
  r = await s.appeler("POST", JSON.stringify({ state, baseUpdatedAt: v }));
  t("ancien protocole, base périmée : 409 avec les données actuelles", r.statut === 409 && r.json.error === "conflict" && Array.isArray(r.json.data.projects), r.statut);
  r = await s.appeler("POST", JSON.stringify({ nimporte: "quoi" }));
  t("corps sans state ni v : « state required » (le client s'en sert pour détecter un vieux serveur)", r.statut === 400 && r.json.error === "state required", r);
});

console.log("\n" + (ko ? ko + " ÉCHEC(S) sur " + (ok + ko) : "tout est vert (" + ok + " cas)"));
process.exit(ko ? 1 : 0);

// Fusion d'un delta de synchronisation dans les données d'un compte. Logique PURE : aucun accès
// réseau ni base, pour pouvoir être testée seule (voir MISSIONS/2026-09-29-sync-incrementale).
// Le préfixe "_" exclut ce dossier du routage Cloudflare Pages.
//
// Le conflit est détecté par EMPREINTE DE CONTENU et non par date : une date ne détecte un
// conflit que si tout le code pense à la mettre à jour à chaque modification, ce que rien ne
// garantit (une photo posée, une icône choisie par l'IA). L'empreinte porte sur le contenu.
//
// ATTENTION : `stable`, `cyrb53` et `empreinte` existent en double, ici et dans app.html. Les deux
// copies DOIVENT rester identiques au caractère près, sinon chaque projet paraît modifié des deux
// côtés et tout devient un faux conflit. Un test de parité (livrables/test-parite-empreinte.mjs)
// extrait les deux copies et les compare.

// Sérialisation à clés triées : deux objets de même contenu donnent la même chaîne quel que soit
// l'ordre des clés (Postgres jsonb réordonne les clés). Mêmes règles que JSON.stringify : une clé
// dont la valeur est undefined est ignorée.
export function stable(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(stable).join(",") + "]";
  return "{" + Object.keys(v).filter(function (k) { return v[k] !== undefined; }).sort()
    .map(function (k) { return JSON.stringify(k) + ":" + stable(v[k]); }).join(",") + "}";
}

// cyrb53 : hachage 53 bits, synchrone, sans dépendance. Non cryptographique, c'est voulu : il sert
// à détecter un changement de contenu, pas à résister à un adversaire (qui ne pourrait que se
// créer un conflit à lui-même).
export function cyrb53(str) {
  var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (var i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507); h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507); h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

export function empreinte(objet) {
  return cyrb53(stable(objet)).toString(36);
}

// Plafonds d'un seul delta : au-dessus, la requête est refusée sans rien fusionner.
export const LIMITES_DELTA = { upserts: 300, deletes: 300, dropAdds: 500, dropDeletes: 500 };

const estObjet = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const idValide = (id) => typeof id === "string" && id.length > 0 && id.length <= 100;

// Renvoie null si le delta est bien formé, sinon une description de la première anomalie.
export function validerDelta(delta) {
  if (!estObjet(delta) || delta.v !== 1) return "version";
  for (const cle of Object.keys(LIMITES_DELTA)) {
    const liste = delta[cle] === undefined ? [] : delta[cle];
    if (!Array.isArray(liste)) return cle + " n'est pas une liste";
    if (liste.length > LIMITES_DELTA[cle]) return cle + " : trop d'éléments";
  }
  for (const u of delta.upserts || []) {
    if (!estObjet(u) || !estObjet(u.project) || !idValide(u.project.id)) return "upsert invalide";
    if (u.base !== null && typeof u.base !== "string") return "base invalide";
    if (typeof u.base === "string" && u.base.length > 40) return "base invalide";
  }
  for (const d of delta.deletes || []) {
    if (!estObjet(d) || !idValide(d.id) || typeof d.base !== "string" || d.base.length > 40) return "suppression invalide";
  }
  for (const a of delta.dropAdds || []) if (!estObjet(a) || !idValide(a.id)) return "élément de Drop Zone invalide";
  for (const id of delta.dropDeletes || []) if (!idValide(id)) return "identifiant de Drop Zone invalide";
  return null;
}

// Applique le delta sur `data` SANS le modifier. Renvoie :
//   data       les données fusionnées ;
//   changed    vrai si au moins une opération a réellement modifié quelque chose ;
//   conflicts  [{id, kind, server}] pour les opérations refusées (server = copie actuelle ou null).
// Règles (voir CADRAGE §3) : on applique si la copie serveur est celle que le client avait vue
// (`base`) ; si la copie serveur est déjà identique à ce qu'on propose, c'est un nouvel essai après
// une réponse perdue, donc un succès sans écriture ; sinon c'est un conflit, jamais un écrasement.
export function appliquerDelta(data, delta) {
  const source = estObjet(data) ? data : {};
  const projects = Array.isArray(source.projects) ? source.projects.slice() : [];
  const dropZone = Array.isArray(source.dropZone) ? source.dropZone.slice() : [];
  const index = new Map();
  projects.forEach(function (p, i) { if (estObjet(p) && idValide(p.id)) index.set(p.id, i); });
  const conflicts = [];
  let changed = false;

  for (const u of delta.upserts || []) {
    const i = index.get(u.project.id);
    if (i === undefined) {
      if (u.base === null) { projects.push(u.project); index.set(u.project.id, projects.length - 1); changed = true; }
      else conflicts.push({ id: u.project.id, kind: "deleted-remote", server: null });
      continue;
    }
    const courant = projects[i], h = empreinte(courant);
    if (h === empreinte(u.project)) continue;                       // déjà appliqué
    if (u.base !== null && h === u.base) { projects[i] = u.project; changed = true; }
    else conflicts.push({ id: u.project.id, kind: u.base === null ? "exists" : "edited", server: courant });
  }

  const retires = new Set();
  for (const d of delta.deletes || []) {
    const i = index.get(d.id);
    if (i === undefined) continue;                                  // déjà supprimé
    if (empreinte(projects[i]) === d.base) { retires.add(d.id); changed = true; }
    else conflicts.push({ id: d.id, kind: "edited", server: projects[i] });
  }

  // Drop Zone : éléments seulement ajoutés ou retirés, jamais édités -> fusion exacte par identifiant.
  const presents = new Set(dropZone.map(function (x) { return estObjet(x) ? x.id : undefined; }));
  for (const a of delta.dropAdds || []) if (!presents.has(a.id)) { dropZone.push(a); presents.add(a.id); changed = true; }
  const aRetirer = new Set(delta.dropDeletes || []);
  const dropFinal = aRetirer.size ? dropZone.filter(function (x) { return !(estObjet(x) && aRetirer.has(x.id)); }) : dropZone;
  if (dropFinal.length !== dropZone.length) changed = true;

  const resultat = Object.assign({}, source, {
    projects: retires.size ? projects.filter(function (p) { return !(estObjet(p) && retires.has(p.id)); }) : projects,
    dropZone: dropFinal,
  });
  return { data: resultat, changed, conflicts };
}

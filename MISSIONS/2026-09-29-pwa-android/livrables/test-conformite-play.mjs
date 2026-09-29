// Vérifie la conformité Google Play / PWA de ce qui est versionné. Usage (racine du dépôt) :
//   node MISSIONS/2026-09-29-pwa-android/livrables/test-conformite-play.mjs
// Deux niveaux : les VÉRIFICATIONS échouent (code de sortie 1) ; les POINTS OUVERTS sont des
// champs à compléter par le propriétaire et n'échouent pas, mais bloquent la soumission.
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { join } from "node:path";

let ok = 0, ko = 0;
const t = (nom, cond, detail) => { if (cond) { ok++; console.log("✓ " + nom); } else { ko++; console.log("✗ " + nom + (detail ? " — " + detail : "")); } };
const lire = (p) => readFileSync(p, "utf8");

// ---------- assetlinks.json
const al = JSON.parse(lire(".well-known/assetlinks.json"));
t("assetlinks.json est un tableau JSON", Array.isArray(al));
const FP = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;
let nbEmpreintes = 0;
for (const s of al) {
  t("assetlinks : relation et cible présentes", Array.isArray(s.relation) && s.target && s.target.namespace === "android_app");
  t("assetlinks : nom de paquet valide (" + s.target.package_name + ")", /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i.test(s.target.package_name));
  for (const f of s.target.sha256_cert_fingerprints || []) { nbEmpreintes++; t("assetlinks : empreinte SHA-256 bien formée", FP.test(f), f); }
}

// ---------- manifest.json
const m = JSON.parse(lire("manifest.json"));
for (const k of ["name", "short_name", "id", "start_url", "scope", "display", "background_color", "theme_color", "lang", "icons"]) t("manifest : « " + k + " » présent", m[k] !== undefined);
t("manifest : display = standalone", m.display === "standalone");
t("manifest : start_url dans la portée", m.start_url.startsWith(m.scope));
t("manifest : catégorie déclarée", Array.isArray(m.categories) && m.categories.length > 0);
t("manifest : n'invite pas à installer une autre app", m.prefer_related_applications === false);

// ---------- icônes : dimensions réelles + zone sûre maskable (décodage PNG sans dépendance)
function png(chemin) {
  const b = readFileSync(chemin);
  if (b.readUInt32BE(0) !== 0x89504e47) throw new Error("pas un PNG : " + chemin);
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20), depth = b[24], type = b[25], interlace = b[28];
  let o = 8; const idat = [];
  while (o < b.length) { const len = b.readUInt32BE(o), nom = b.toString("ascii", o + 4, o + 8); if (nom === "IDAT") idat.push(b.subarray(o + 8, o + 8 + len)); o += 12 + len; }
  return { w, h, depth, type, interlace, raw: Buffer.concat(idat) };
}
function pixels(p) {
  const bpp = p.type === 6 ? 4 : p.type === 2 ? 3 : null;
  if (!bpp || p.depth !== 8 || p.interlace) return null;
  const data = inflateSync(p.raw), stride = p.w * bpp, out = Buffer.alloc(p.h * stride);
  for (let y = 0; y < p.h; y++) {
    const f = data[y * (stride + 1)], src = y * (stride + 1) + 1;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? out[y * stride + i - bpp] : 0, u = y ? out[(y - 1) * stride + i] : 0, c = (y && i >= bpp) ? out[(y - 1) * stride + i - bpp] : 0;
      let v = data[src + i];
      if (f === 1) v += a; else if (f === 2) v += u; else if (f === 3) v += (a + u) >> 1;
      else if (f === 4) { const pp = a + u - c, pa = Math.abs(pp - a), pb = Math.abs(pp - u), pc = Math.abs(pp - c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? u : c); }
      out[y * stride + i] = v & 255;
    }
  }
  return { out, bpp, stride };
}
for (const ic of m.icons) {
  const chemin = join(".", ic.src.replace(/^\//, ""));
  t("icône " + ic.src + " existe", existsSync(chemin));
  if (!existsSync(chemin)) continue;
  const p = png(chemin), attendu = ic.sizes.split("x").map(Number);
  t("icône " + ic.src + " : dimensions réelles = " + ic.sizes, p.w === attendu[0] && p.h === attendu[1], p.w + "x" + p.h);
}
t("icône 512 « any » déclarée", m.icons.some((i) => i.sizes === "512x512" && i.purpose === "any"));
const masq = m.icons.find((i) => i.purpose === "maskable");
t("icône maskable déclarée", !!masq);
if (masq) {
  const p = png(masq.src.replace(/^\//, "")), px = pixels(p);
  t("icône maskable décodable pour la mesure", !!px);
  if (px) {
    const cx = p.w / 2, cy = p.h / 2, sur = p.w * 0.4; let rmax = 0;
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
      const i = y * px.stride + x * px.bpp;
      if (px.out[i] > 235 && px.out[i + 1] > 235 && px.out[i + 2] > 235) continue;
      rmax = Math.max(rmax, Math.hypot(x - cx, y - cy));
    }
    t("icône maskable : tout le tracé dans la zone sûre (rayon " + Math.round(rmax) + " ≤ " + Math.round(sur) + ")", rmax <= sur);
    const alpha = px.bpp === 4 ? px.out[3] : 255;
    t("icône maskable : coin opaque (le masque ne révèle pas de transparence)", alpha === 255);
  }
}

// ---------- pages légales
const priv = lire("confidentialite.html"), supp = lire("suppression-compte.html"), app = lire("app.html");
for (const [nom, h] of [["confidentialite.html", priv], ["suppression-compte.html", supp]]) {
  t(nom + " : langue, viewport et titre", /<html lang="fr">/.test(h) && /name="viewport"/.test(h) && /<title>[^<]+<\/title>/.test(h));
  t(nom + " : aucun script (page non éditable côté client, non-PDF)", !/<script/i.test(h));
}
// Chaque prestataire réellement appelé par le code serveur doit être nommé dans la politique.
const HOTES = { "api.anthropic.com": "Anthropic", "api.pexels.com": "Pexels", "SUPABASE_URL": "Supabase" };
let corpus = ""; for (const d of ["functions/api", "functions/_lib"]) for (const f of readdirSync(d)) corpus += lire(join(d, f));
for (const [hote, nom] of Object.entries(HOTES)) if (corpus.includes(hote)) t("politique : prestataire « " + nom + " » cité (appelé par le serveur)", priv.includes(nom));
t("politique : Cloudflare (hébergeur) cité", priv.includes("Cloudflare"));
t("politique : le bouton décrit existe dans l'app (« Supprimer mon compte »)", supp.includes("Supprimer mon compte") && app.includes(">Supprimer mon compte<"));
t("politique : ne prétend pas qu'il n'y a aucun traceur si l'app en contient", !/gtag|analytics|posthog|plausible|mixpanel|hotjar/i.test(lire("app.html") + lire("index.html")));
t("app.html : lien vers la politique de confidentialité", app.includes('href="/confidentialite"'));
t("app.html : lien vers la suppression de compte", app.includes('href="/suppression-compte"'));
t("suppression-compte.html renvoie vers la politique", supp.includes('href="/confidentialite"'));

// ---------- aucun secret de signature versionné
function parcours(d, acc = []) { for (const f of readdirSync(d)) { if (f === ".git" || f === "node_modules") continue; const p = join(d, f); statSync(p).isDirectory() ? parcours(p, acc) : acc.push(p); } return acc; }
const fichiers = parcours(".");
t("aucun keystore versionné (.jks / .keystore / .p12)", !fichiers.some((f) => /\.(jks|keystore|p12|pfx)$/i.test(f)));
t("aucun mot de passe de keystore versionné", !fichiers.filter((f) => /\.(gradle|json|properties|ya?ml|md|js|mjs)$/i.test(f) && !f.includes("THIRD_PARTY")).some((f) => /storePassword\s*[=:]\s*["']?[^\s"'<$]/.test(lire(f)) && !/checklist|CHECKLIST/.test(f)));

// ---------- points ouverts
const ouverts = [...priv.matchAll(/<span class="todo">([^<]+)<\/span>/g), ...supp.matchAll(/<span class="todo">([^<]+)<\/span>/g)].map((x) => x[1]);
console.log("\n" + (ko ? ko + " ÉCHEC(S) sur " + (ok + ko) : "tout est vert (" + ok + " vérifications)"));
console.log("Empreintes servies dans assetlinks.json : " + nbEmpreintes + (nbEmpreintes === 0 ? "  (aucune : normal avant Play App Signing)" : ""));
console.log("\nPOINTS OUVERTS avant soumission (" + ouverts.length + ") — champs à compléter par le propriétaire :");
ouverts.forEach((o) => console.log("  • " + o));
process.exit(ko ? 1 : 0);

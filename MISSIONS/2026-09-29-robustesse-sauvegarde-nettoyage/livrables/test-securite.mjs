// Tests unitaires du durcissement serveur : liste blanche des champs /api/ai, validation de
// l'origine des photos, plafonds. Rejoue la logique telle qu'elle est écrite dans les modules.
import { readFileSync } from "node:fs";
let ok = 0, ko = 0;
const t = (nom, cond) => { if (cond) { ok++; console.log("✓ " + nom); } else { ko++; console.log("✗ " + nom); } };

const ai = readFileSync("functions/api/ai.js", "utf8");
const photos = readFileSync("functions/api/photos.js", "utf8");
const projects = readFileSync("functions/api/projects.js", "utf8");
const app = readFileSync("app.html", "utf8");

// --- Liste blanche /api/ai
const ALLOWED = JSON.parse(ai.match(/const ALLOWED_FIELDS = (\[[^\]]*\])/)[1].replace(/'/g, '"'));
const pick = (b) => { const o = {}; for (const k of ALLOWED) if (b[k] !== undefined) o[k] = b[k]; return o; };
const relaye = pick({ model: "claude-haiku-4-5-20251001", max_tokens: 100, messages: [1], system: "s",
  temperature: 0.5, tools: [{ name: "evil" }], tool_choice: "any", metadata: { user_id: "x" }, stream: true, top_k: 1 });
t("les 5 champs prévus passent", ["model", "max_tokens", "messages", "system", "temperature"].every((k) => k in relaye));
t("tools est écarté", !("tools" in relaye));
t("tool_choice est écarté", !("tool_choice" in relaye));
t("metadata est écarté", !("metadata" in relaye));
t("stream est écarté", !("stream" in relaye));
t("top_k est écarté", !("top_k" in relaye));
t("un champ absent n'est pas inventé", !("temperature" in pick({ model: "m" })));
t("messages vide est refusé", /Array\.isArray\(body\.messages\)[^)]*\|\|\s*body\.messages\.length === 0/.test(ai));
t("réponse non-JSON de l'amont gérée", ai.includes("Réponse inattendue de l'IA") && ai.includes("JSON.parse(raw)"));
t("panne réseau amont gérée", ai.includes("IA injoignable"));

// --- Origine des photos : même règle des deux côtés
const reCli = new RegExp(app.match(/var PHOTO_URL_OK = \/(.+?)\/i;/)[1], "i");
const reSrv = new RegExp(photos.match(/!\/(\^https[^/]*(?:\\\/[^/]*)*?)\/i\.test\(src\)/)[1].replace(/\\\\/g, "\\"), "i");
const CAS = [
  ["https://images.pexels.com/photos/1/a.jpg", true],
  ["https://cdn.pexels.com/photos/1/a.jpg", true],
  ["https://evil.com/a.jpg", false],
  ["https://images.pexels.com.evil.com/a.jpg", false],
  ["http://images.pexels.com/a.jpg", false],
  ["https://pexels.com/a.jpg", false],
];
for (const [url, attendu] of CAS) {
  t("client  " + (attendu ? "accepte" : "refuse ") + " " + url, reCli.test(url) === attendu);
  t("serveur " + (attendu ? "accepte" : "refuse ") + " " + url, reSrv.test(url) === attendu);
}
t("l'URL est échappée avant d'entrer dans du CSS", app.includes("encodeURI(p.photo.url)"));

// --- Plafonds : client et serveur doivent annoncer le même chiffre
const srvBytes = eval(projects.match(/const MAX_BODY_BYTES = ([^;]+);/)[1]);
const cliBytes = eval(app.match(/var SAVE_MAX_BYTES = ([^;]+);/)[1]);
const srvProj = Number(projects.match(/const MAX_PROJECTS = (\d+);/)[1]);
const cliProj = Number(app.match(/var MAX_PROJECTS_CLIENT = (\d+);/)[1]);
t("plafond d'octets identique des deux côtés (" + srvBytes + ")", srvBytes === cliBytes);
t("plafond de projets identique des deux côtés (" + srvProj + ")", srvProj === cliProj);
t("50 projets moyens (503 Ko) tiennent largement sous le plafond", 503 * 1024 < srvBytes * 0.3);

console.log("\n" + (ko ? ko + " ÉCHEC(S) sur " + (ok + ko) : "tout est vert (" + ok + " cas)"));
process.exit(ko ? 1 : 0);

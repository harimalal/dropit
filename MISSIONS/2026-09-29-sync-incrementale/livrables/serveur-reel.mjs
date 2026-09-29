// Harnais : exécute le VRAI code de functions/ (copié à l'identique dans un dossier temporaire
// déclaré « module ») contre une fausse base qui reproduit ce dont dépend la sauvegarde :
//  - PostgREST : lecture d'une ligne, PATCH conditionnel sur updated_at (compare-and-swap atomique),
//    insertion avec fusion ;
//  - Supabase Auth : jeton -> utilisateur ;
//  - la limite de débit (toujours autorisée ici).
// Les horodatages sont renvoyés au format de Postgres (« +00:00 », microsecondes), pas celui de
// JavaScript : le serveur doit les renvoyer tels quels dans le filtre, comme en production.
import { cpSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const SUPABASE = "http://supabase.test";

export async function demarrerServeurReel({ racine = process.cwd(), utilisateur = "u1" } = {}) {
  const tmp = mkdtempSync(join(tmpdir(), "dropit-fn-"));
  cpSync(resolve(racine, "functions"), join(tmp, "functions"), { recursive: true });
  writeFileSync(join(tmp, "package.json"), '{"type":"module"}');
  const projets = await import(pathToFileURL(join(tmp, "functions/api/projects.js")).href + "?v=" + Date.now());

  const db = {
    ligne: null,                 // { user_id, data, updated_at }
    ecritures: 0,                // PATCH/POST réellement appliqués
    lectures: 0,
    octetsLus: 0, octetsEcrits: 0,
    avantEcriture: null,         // (fonction) appelée juste avant un PATCH : simule un autre écrivain qui s'intercale
    horloge: Date.parse("2026-09-29T10:00:00.000Z"),
  };
  // Postgres stocke un instant (timestamptz) et le renvoie au format « …+00:00 » avec microsecondes ;
  // il compare par VALEUR, jamais par texte. Le faux fait de même : on stocke l'instant reçu et on
  // le restitue au format de Postgres, ce qui vérifie aussi que le serveur renvoie la valeur lue.
  const enPostgres = (instant) => new Date(instant).toISOString().replace(/\.(\d{3})Z$/, ".$1000+00:00");
  const format = () => { db.horloge += 1000; return enPostgres(db.horloge); };
  const reponse = (corps, statut = 200) => new Response(JSON.stringify(corps), { status: statut, headers: { "Content-Type": "application/json" } });

  const vraiFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    const u = new URL(String(url));
    if (!String(url).startsWith(SUPABASE)) return vraiFetch(url, options);
    if (u.pathname === "/auth/v1/user") {
      const jeton = (options.headers && (options.headers.Authorization || options.headers.authorization)) || "";
      return jeton.startsWith("Bearer ") ? reponse({ id: utilisateur, email: "test@example.com" }) : reponse({}, 401);
    }
    if (u.pathname === "/rest/v1/rpc/dropit_check_rate_limit") return reponse(true);
    if (u.pathname === "/rest/v1/dropit_user_profile") return reponse([]);
    if (u.pathname === "/rest/v1/dropit_user_data") {
      const m = options.method || "GET";
      if (m === "GET") {
        db.lectures++;
        if (!db.ligne) return reponse([]);
        const corps = JSON.stringify([{ data: db.ligne.data, updated_at: db.ligne.updated_at }]);
        db.octetsLus += corps.length;
        return new Response(corps, { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (m === "PATCH") {
        if (db.avantEcriture) db.avantEcriture(db);          // le test décide quand l'arrêter (mettre à null)
        const filtre = u.searchParams.get("updated_at");           // « eq.<valeur> » : décodé par URLSearchParams
        const attendu = filtre && filtre.startsWith("eq.") ? filtre.slice(3) : null;
        if (!db.ligne || Date.parse(db.ligne.updated_at) !== Date.parse(attendu)) return reponse([]);   // 0 ligne : le CAS échoue
        const corps = JSON.parse(options.body);
        db.ligne = { user_id: db.ligne.user_id, data: corps.data, updated_at: enPostgres(corps.updated_at) };
        db.ecritures++; db.octetsEcrits += options.body.length;
        return reponse([{ data: db.ligne.data, updated_at: db.ligne.updated_at }]);
      }
      if (m === "POST") {
        const corps = JSON.parse(options.body);
        db.ligne = { user_id: corps.user_id, data: corps.data, updated_at: enPostgres(corps.updated_at) };
        db.ecritures++; db.octetsEcrits += options.body.length;
        return reponse([]);
      }
    }
    return reponse({ error: "route inconnue : " + u.pathname }, 404);
  };

  const env = { SUPABASE_URL: SUPABASE, SUPABASE_ANON_KEY: "anon", SUPABASE_SERVICE_ROLE_KEY: "service" };
  const entete = { Authorization: "Bearer test-token", "Content-Type": "application/json" };

  async function appeler(methode, corps) {
    const init = { method: methode, headers: { ...entete } };
    if (corps !== undefined) { init.body = corps; init.headers["content-length"] = String(new TextEncoder().encode(corps).length); }
    const request = new Request("http://app.test/api/projects", init);
    const res = await (methode === "GET" ? projets.onRequestGet : projets.onRequestPost)({ env, request });
    const texte = await res.text();
    let json = null; try { json = JSON.parse(texte); } catch {}
    return { statut: res.status, json, texte };
  }

  return {
    db, appeler, projets,
    // Installe l'état initial comme si un premier appareil l'avait sauvegardé.
    async semer(donnees) { db.ligne = { user_id: utilisateur, data: donnees, updated_at: format() }; },
    arreter() { globalThis.fetch = vraiFetch; rmSync(tmp, { recursive: true, force: true }); },
  };
}

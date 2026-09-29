import { json, supabaseHeaders, requireUser, enforceRateLimit } from "../_lib/auth.js";
import { validerDelta, appliquerDelta } from "../_lib/merge.js";

const TABLE = "dropit_user_data";
const EMPTY = { projects: [] };

// 30/minute : très large au-dessus de l'usage normal (sauvegarde debouncée à
// 350ms côté client, jamais plus d'un appel toutes les quelques secondes en
// usage réel), assez bas pour limiter un bug client qui boucleraient.
const RATE_LIMIT_PER_MINUTE = 30;

// Écrit les données, en détectant un conflit multi-appareils quand le client
// précise sur quelle version (`baseUpdatedAt`) il a basé sa modification.
// Le PATCH est conditionné sur `updated_at=eq.<baseUpdatedAt>` : c'est une
// comparaison-puis-écriture atomique côté Postgres (PostgREST ne met à jour
// que les lignes qui matchent encore le filtre au moment de l'exécution),
// donc pas de race entre deux requêtes concurrentes. Si 0 ligne matche, c'est
// qu'un autre appareil a écrit entre-temps : on ne l'écrase pas.
async function writeUserData(env, userId, data, baseUpdatedAt) {
  const newUpdatedAt = new Date().toISOString();

  if (baseUpdatedAt) {
    const patchRes = await fetch(
      env.SUPABASE_URL + "/rest/v1/" + TABLE +
        "?user_id=eq." + encodeURIComponent(userId) +
        "&updated_at=eq." + encodeURIComponent(baseUpdatedAt),
      {
        method: "PATCH",
        headers: { ...supabaseHeaders(env), "Prefer": "return=representation" },
        body: JSON.stringify({ data: data, updated_at: newUpdatedAt })
      }
    );
    if (!patchRes.ok) return { ok: false, res: patchRes };

    const patched = await patchRes.json();
    if (Array.isArray(patched) && patched.length > 0) {
      return { ok: true, updatedAt: newUpdatedAt };
    }
    return { ok: true, conflict: true };
  }

  // Pas de baseUpdatedAt : premier enregistrement du compte, rien à comparer.
  const insertRes = await fetch(env.SUPABASE_URL + "/rest/v1/" + TABLE + "?on_conflict=user_id", {
    method: "POST",
    headers: { ...supabaseHeaders(env), "Prefer": "resolution=merge-duplicates" },
    body: JSON.stringify({
      user_id: userId,
      data: data,
      updated_at: newUpdatedAt
    })
  });
  if (!insertRes.ok) return { ok: false, res: insertRes };
  return { ok: true, updatedAt: newUpdatedAt };
}

// Lit la ligne du compte : { data, updated_at }, null si le compte n'a encore rien enregistré,
// ou { erreur } si la base répond mal.
async function lireLigne(env, userId) {
  const res = await fetch(
    env.SUPABASE_URL + "/rest/v1/" + TABLE +
      "?user_id=eq." + encodeURIComponent(userId) + "&select=data,updated_at",
    { headers: supabaseHeaders(env) }
  );
  if (!res.ok) return { erreur: await res.text() };
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

// Fusionne un delta dans la ligne du compte (voir MISSIONS/2026-09-29-sync-incrementale/CADRAGE.md).
// Relit la ligne, fusionne, écrit conditionnellement sur l'horodatage lu (compare-and-swap : si un
// autre écrivain est passé entre la lecture et l'écriture, 0 ligne est modifiée) et recommence
// depuis la relecture, jusqu'à 4 fois. Le client n'a donc jamais à gérer de conflit de ligne : seuls
// remontent les conflits de CONTENU, projet par projet.
const ESSAIS_DELTA = 4;

async function ecrireDelta(env, userId, delta) {
  for (let essai = 0; essai < ESSAIS_DELTA; essai++) {
    const ligne = await lireLigne(env, userId);
    if (ligne && ligne.erreur !== undefined) return { statut: 500, corps: { error: ligne.erreur } };

    const { data, changed, conflicts } = appliquerDelta(ligne ? ligne.data : null, delta);

    // Plafonds appliqués sur le RÉSULTAT de la fusion, pas sur la taille de la requête (qui est
    // petite par construction) : c'est la ligne stockée qui ne doit pas dépasser.
    if (data.projects.length > MAX_PROJECTS) return { statut: 400, corps: { error: "too_many_projects", limit: MAX_PROJECTS } };
    if (changed && new TextEncoder().encode(JSON.stringify(data)).length > MAX_BODY_BYTES) {
      return { statut: 413, corps: { error: "too_large", limit: MAX_BODY_BYTES } };
    }

    // Rien à écrire (tout est déjà appliqué, ou tout est en conflit) : on ne touche pas à la ligne.
    if (!changed) return { statut: 200, corps: { ok: true, updatedAt: ligne ? ligne.updated_at : null, conflicts } };

    const nouveau = new Date().toISOString();
    if (!ligne) {
      // Premier enregistrement du compte passé par le chemin delta (rare : le client n'y recourt
      // qu'après avoir lu une ligne). Même insertion que le chemin historique.
      const ins = await fetch(env.SUPABASE_URL + "/rest/v1/" + TABLE + "?on_conflict=user_id", {
        method: "POST",
        headers: { ...supabaseHeaders(env), "Prefer": "resolution=merge-duplicates" },
        body: JSON.stringify({ user_id: userId, data: data, updated_at: nouveau })
      });
      if (!ins.ok) return { statut: 500, corps: { error: await ins.text() } };
      return { statut: 200, corps: { ok: true, updatedAt: nouveau, conflicts } };
    }

    const patch = await fetch(
      env.SUPABASE_URL + "/rest/v1/" + TABLE +
        "?user_id=eq." + encodeURIComponent(userId) +
        "&updated_at=eq." + encodeURIComponent(ligne.updated_at),
      {
        method: "PATCH",
        headers: { ...supabaseHeaders(env), "Prefer": "return=representation" },
        body: JSON.stringify({ data: data, updated_at: nouveau })
      }
    );
    if (!patch.ok) return { statut: 500, corps: { error: await patch.text() } };
    const touchees = await patch.json();
    if (Array.isArray(touchees) && touchees.length > 0) {
      return { statut: 200, corps: { ok: true, updatedAt: nouveau, conflicts } };
    }
    // 0 ligne : un autre écrivain est passé. On relit et on refusionne.
  }
  // Ligne trop disputée : 503 est réessayé automatiquement par le client, sans message.
  return { statut: 503, corps: { error: "busy" } };
}

export async function onRequestGet(context) {
  const { env } = context;
  const { user, error } = await requireUser(context);
  if (error) return error;

  const limited = await enforceRateLimit(env, user.id, "projects", RATE_LIMIT_PER_MINUTE);
  if (limited) return limited;

  const res = await fetch(
    env.SUPABASE_URL + "/rest/v1/" + TABLE +
      "?user_id=eq." + encodeURIComponent(user.id) + "&select=data,updated_at",
    { headers: supabaseHeaders(env) }
  );
  if (!res.ok) return json({ error: await res.text() }, 500);

  const rows = await res.json();

  if (Array.isArray(rows) && rows.length > 0) {
    return json({ data: rows[0].data || EMPTY, updatedAt: rows[0].updated_at });
  }

  // Aucune ligne pour ce compte : première connexion, compte tout neuf.
  return json({ data: EMPTY, updatedAt: null });
}

// Plafonds, dimensionnés sur une MESURE du modèle de données
// (MISSIONS/2026-09-29-robustesse-sauvegarde-nettoyage/livrables/mesure-poids-projet.js) :
// un projet pèse 2,9 Ko (sortie IA brute), 10,1 Ko (usage moyen), 60 Ko (grand utilisateur de
// notes). Référence réelle mesurée en base : 8,2 Ko/projet.
//
// L'ancien plafond de 500 Ko était SOUS le cas nominal : 50 projets moyens pèsent 503 Ko. Un
// compte normal l'aurait franchi, et le client traite le 413 comme définitif — plus aucune
// sauvegarde, jamais. 2 Mo laisse 4x de marge sur ce cas nominal.
// Le client en garde une copie (SAVE_MAX_BYTES dans app.html) pour prévenir AVANT le refus :
// si ce chiffre change, changer les DEUX.
const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2 Mo
// 50 projets : décision produit. Remplace un plafond de 300 qui n'a jamais été atteignable,
// la limite d'octets mordant bien avant — deux plafonds qui se contredisaient.
const MAX_PROJECTS = 50;

export async function onRequestPost(context) {
  const { env, request } = context;
  const { user, error } = await requireUser(context);
  if (error) return error;

  const limited = await enforceRateLimit(env, user.id, "projects", RATE_LIMIT_PER_MINUTE);
  if (limited) return limited;

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return json({ error: "too_large", limit: MAX_BODY_BYTES }, 413);
  }

  let rawText;
  try {
    rawText = await request.text();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (rawText.length > MAX_BODY_BYTES) {
    return json({ error: "too_large", limit: MAX_BODY_BYTES }, 413);
  }

  let body;
  try {
    body = JSON.parse(rawText);
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  // Nouveau protocole : un delta (projets modifiés, supprimés, éléments de Drop Zone). Reconnu à
  // `v`, jamais à l'absence de `state`. L'ancien corps {state, baseUpdatedAt} reste traité plus
  // bas à l'identique, pour qu'un ancien app.html resté en cache continue de fonctionner.
  if (body && body.v !== undefined) {
    const anomalie = validerDelta(body);
    if (anomalie) return json({ error: "bad_delta", detail: anomalie }, 400);
    const r = await ecrireDelta(env, user.id, body);
    return json(r.corps, r.statut);
  }

  const state = body && body.state;
  if (!state || !Array.isArray(state.projects)) {
    return json({ error: "state required" }, 400);
  }
  if (state.projects.length > MAX_PROJECTS) {
    return json({ error: "too_many_projects", limit: MAX_PROJECTS }, 400);
  }

  const baseUpdatedAt = typeof body.baseUpdatedAt === "string" ? body.baseUpdatedAt : null;
  const result = await writeUserData(env, user.id, state, baseUpdatedAt);
  if (!result.ok) return json({ error: await result.res.text() }, 500);

  if (result.conflict) {
    // Renvoie la version actuelle pour que le client se resynchronise plutôt
    // que d'écraser silencieusement le travail fait sur un autre appareil.
    const current = await fetch(
      env.SUPABASE_URL + "/rest/v1/" + TABLE +
        "?user_id=eq." + encodeURIComponent(user.id) + "&select=data,updated_at",
      { headers: supabaseHeaders(env) }
    );
    const rows = current.ok ? await current.json() : [];
    return json({
      error: "conflict",
      data: (rows[0] && rows[0].data) || EMPTY,
      updatedAt: (rows[0] && rows[0].updated_at) || null
    }, 409);
  }

  return json({ ok: true, updatedAt: result.updatedAt });
}

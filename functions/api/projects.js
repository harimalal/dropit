import { json, supabaseHeaders, requireUser, enforceRateLimit } from "../_lib/auth.js";

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

// Plafonds larges au-dessus de tout usage réel observé, pour empêcher un
// compte (bug client ou abus volontaire) de gonfler indéfiniment sa ligne
// dropit_user_data — sans jamais gêner un utilisateur normal.
const MAX_BODY_BYTES = 500 * 1024; // 500 Ko
const MAX_PROJECTS = 300;

export async function onRequestPost(context) {
  const { env, request } = context;
  const { user, error } = await requireUser(context);
  if (error) return error;

  const limited = await enforceRateLimit(env, user.id, "projects", RATE_LIMIT_PER_MINUTE);
  if (limited) return limited;

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return json({ error: "Payload trop volumineux" }, 413);
  }

  let rawText;
  try {
    rawText = await request.text();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (rawText.length > MAX_BODY_BYTES) {
    return json({ error: "Payload trop volumineux" }, 413);
  }

  let body;
  try {
    body = JSON.parse(rawText);
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const state = body && body.state;
  if (!state || !Array.isArray(state.projects)) {
    return json({ error: "state required" }, 400);
  }
  if (state.projects.length > MAX_PROJECTS) {
    return json({ error: "Trop de projets" }, 400);
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

import { json, supabaseHeaders, requireUser, enforceRateLimit } from "../_lib/auth.js";

const TABLE = "dropit_user_data";
const EMPTY = { projects: [] };

// 30/minute : très large au-dessus de l'usage normal (sauvegarde debouncée à
// 350ms côté client, jamais plus d'un appel toutes les quelques secondes en
// usage réel), assez bas pour limiter un bug client qui boucleraient.
const RATE_LIMIT_PER_MINUTE = 30;

async function writeUserData(env, userId, data) {
  return fetch(env.SUPABASE_URL + "/rest/v1/" + TABLE + "?on_conflict=user_id", {
    method: "POST",
    headers: { ...supabaseHeaders(env), "Prefer": "resolution=merge-duplicates" },
    body: JSON.stringify({
      user_id: userId,
      data: data,
      updated_at: new Date().toISOString()
    })
  });
}

export async function onRequestGet(context) {
  const { env } = context;
  const { user, error } = await requireUser(context);
  if (error) return error;

  const limited = await enforceRateLimit(env, user.id, "projects", RATE_LIMIT_PER_MINUTE);
  if (limited) return limited;

  const res = await fetch(
    env.SUPABASE_URL + "/rest/v1/" + TABLE +
      "?user_id=eq." + encodeURIComponent(user.id) + "&select=data",
    { headers: supabaseHeaders(env) }
  );
  if (!res.ok) return json({ error: await res.text() }, 500);

  const rows = await res.json();

  if (Array.isArray(rows) && rows.length > 0) {
    return json({ data: rows[0].data || EMPTY });
  }

  // Aucune ligne pour ce compte : première connexion, compte tout neuf.
  return json({ data: EMPTY });
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

  const res = await writeUserData(env, user.id, state);
  if (!res.ok) return json({ error: await res.text() }, 500);

  return json({ ok: true });
}

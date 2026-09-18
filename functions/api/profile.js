import { json, supabaseHeaders, requireUser, enforceRateLimit } from "../_lib/auth.js";

const TABLE = "dropit_user_profile";

// 15/minute : le questionnaire ne sauvegarde qu'à chaque écran validé, jamais
// en boucle — largement suffisant sans jamais gêner un usage normal.
const RATE_LIMIT_PER_MINUTE = 15;

// Le profil est petit par construction (une vingtaine de réponses courtes).
// Le plafond est large au-dessus de tout usage réel mais empêche un compte
// de gonfler sa ligne indéfiniment.
const MAX_BODY_BYTES = 32 * 1024;
const MAX_ANSWER_KEYS = 60;

export async function onRequestGet(context) {
  const { env } = context;
  const { user, error } = await requireUser(context);
  if (error) return error;

  const limited = await enforceRateLimit(env, user.id, "profile", RATE_LIMIT_PER_MINUTE);
  if (limited) return limited;

  const res = await fetch(
    env.SUPABASE_URL + "/rest/v1/" + TABLE +
      "?user_id=eq." + encodeURIComponent(user.id) + "&select=answers,completed_at",
    { headers: supabaseHeaders(env) }
  );
  if (!res.ok) return json({ error: await res.text() }, 500);

  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return json({ profile: null });
  }
  return json({
    profile: {
      answers: rows[0].answers || {},
      completedAt: rows[0].completed_at || null
    }
  });
}

export async function onRequestPost(context) {
  const { env, request } = context;
  const { user, error } = await requireUser(context);
  if (error) return error;

  const limited = await enforceRateLimit(env, user.id, "profile", RATE_LIMIT_PER_MINUTE);
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

  const answers = body && body.answers;
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    return json({ error: "answers required" }, 400);
  }
  if (Object.keys(answers).length > MAX_ANSWER_KEYS) {
    return json({ error: "Trop de réponses" }, 400);
  }

  // completed_at n'est posé qu'une fois, à la fin du questionnaire : une
  // sauvegarde intermédiaire ne doit jamais l'effacer ni le réécrire.
  const row = {
    user_id: user.id,
    answers: answers,
    updated_at: new Date().toISOString()
  };
  if (body.completed) row.completed_at = new Date().toISOString();

  const res = await fetch(env.SUPABASE_URL + "/rest/v1/" + TABLE + "?on_conflict=user_id", {
    method: "POST",
    headers: { ...supabaseHeaders(env), "Prefer": "resolution=merge-duplicates" },
    body: JSON.stringify(row)
  });
  if (!res.ok) return json({ error: await res.text() }, 500);

  return json({ ok: true });
}

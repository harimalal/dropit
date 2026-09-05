import { json, supabaseHeaders, requireUser } from "../_lib/auth.js";

const TABLE = "dropit_user_data";
const LEGACY_TABLE = "dropit_projects";
const EMPTY = { projects: [] };

// Récupère les données de l'ancienne table (clé device_id) pour les rattacher
// au compte lors de la première connexion. Sans cela, les projets créés avant
// l'authentification seraient inaccessibles.
async function claimLegacyData(env, deviceId) {
  if (!deviceId) return null;
  const res = await fetch(
    env.SUPABASE_URL + "/rest/v1/" + LEGACY_TABLE +
      "?device_id=eq." + encodeURIComponent(deviceId) + "&select=data",
    { headers: supabaseHeaders(env) }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const data = rows[0].data;
  if (!data || !Array.isArray(data.projects) || data.projects.length === 0) return null;
  return data;
}

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
  const { env, request } = context;
  const { user, error } = await requireUser(context);
  if (error) return error;

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

  // Aucune ligne pour ce compte : première connexion.
  // On tente de récupérer les projets créés en mode device_id.
  const deviceId = new URL(request.url).searchParams.get("device_id");
  const legacy = await claimLegacyData(env, deviceId);
  if (legacy) {
    await writeUserData(env, user.id, legacy);
    return json({ data: legacy, migrated: true });
  }

  return json({ data: EMPTY });
}

export async function onRequestPost(context) {
  const { env } = context;
  const { user, error } = await requireUser(context);
  if (error) return error;

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const state = body && body.state;
  if (!state || !Array.isArray(state.projects)) {
    return json({ error: "state required" }, 400);
  }

  const res = await writeUserData(env, user.id, state);
  if (!res.ok) return json({ error: await res.text() }, 500);

  return json({ ok: true });
}

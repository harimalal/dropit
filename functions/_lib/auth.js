// Helpers partagés d'authentification.
// Le préfixe "_" exclut ce dossier du routage Cloudflare Pages : il n'est
// jamais exposé comme endpoint, seulement importé par les fonctions.

export function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { "Content-Type": "application/json" }
  });
}

export function supabaseHeaders(env) {
  return {
    "Content-Type": "application/json",
    "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY
  };
}

// Valide le jeton d'accès auprès de Supabase et retourne l'utilisateur.
// On interroge /auth/v1/user plutôt que de vérifier la signature localement :
// c'est une requête de plus, mais la révocation de session est prise en compte
// immédiatement, ce qu'une vérification de signature seule ne ferait pas.
export async function getUser(context) {
  const { env, request } = context;
  const header = request.headers.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;

  const res = await fetch(env.SUPABASE_URL + "/auth/v1/user", {
    headers: {
      "apikey": env.SUPABASE_ANON_KEY,
      "Authorization": "Bearer " + token
    }
  });
  if (!res.ok) return null;

  const user = await res.json();
  return user && user.id ? user : null;
}

// Renvoie l'utilisateur, ou une Response 401 prête à retourner.
export async function requireUser(context) {
  const user = await getUser(context);
  if (!user) {
    return { user: null, error: json({ error: "unauthorized" }, 401) };
  }
  return { user, error: null };
}

// Limite de débit par utilisateur et par endpoint (voir migration
// add_rate_limiting : incrément atomique côté Postgres, fenêtre d'1 minute).
// Un échec de l'appel lui-même (Supabase indisponible) ne doit jamais bloquer
// l'utilisateur : on se contente alors de laisser passer, comme pour tout
// autre bonus de robustesse dans ce fichier.
export async function checkRateLimit(env, userId, endpoint, max) {
  try {
    const res = await fetch(env.SUPABASE_URL + "/rest/v1/rpc/dropit_check_rate_limit", {
      method: "POST",
      headers: supabaseHeaders(env),
      body: JSON.stringify({ p_user_id: userId, p_endpoint: endpoint, p_max: max })
    });
    if (!res.ok) return true;
    return await res.json();
  } catch {
    return true;
  }
}

// Réponse prête à retourner si la limite est dépassée, sinon null.
export async function enforceRateLimit(env, userId, endpoint, max) {
  const allowed = await checkRateLimit(env, userId, endpoint, max);
  if (allowed) return null;
  return json({ error: "Trop de requêtes, réessaie dans un instant." }, 429);
}

import { json, supabaseHeaders, requireUser, enforceRateLimit } from "../_lib/auth.js";

// Suppression définitive et volontaire du compte : action rare par nature,
// la limite n'est là que pour absorber un double-clic ou un bug client.
const RATE_LIMIT_PER_MINUTE = 5;

// Supprime l'utilisateur auth.users. dropit_user_data et dropit_user_profile
// s'effacent en cascade (foreign key "on delete cascade", voir setup.sql).
// Seule l'API Admin Supabase (clé service_role) peut supprimer un compte —
// impossible depuis le client, même avec son propre jeton.
export async function onRequestDelete(context) {
  const { env } = context;
  const { user, error } = await requireUser(context);
  if (error) return error;

  const limited = await enforceRateLimit(env, user.id, "account-delete", RATE_LIMIT_PER_MINUTE);
  if (limited) return limited;

  const res = await fetch(env.SUPABASE_URL + "/auth/v1/admin/users/" + encodeURIComponent(user.id), {
    method: "DELETE",
    headers: supabaseHeaders(env)
  });
  if (!res.ok) return json({ error: await res.text() }, 500);

  return json({ ok: true });
}

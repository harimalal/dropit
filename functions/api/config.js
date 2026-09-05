import { json } from "../_lib/auth.js";

// Expose au client l'URL Supabase et la clé anon.
// La clé anon est publique par conception (elle ne donne accès à rien sans
// jeton utilisateur valide, RLS active). On la sert ici plutôt que de la
// coder en dur dans index.html pour garder toute la config dans Cloudflare.
export async function onRequestGet(context) {
  const { env } = context;
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return json({ error: "Supabase non configuré" }, 500);
  }
  return json({
    supabaseUrl: env.SUPABASE_URL,
    supabaseAnonKey: env.SUPABASE_ANON_KEY,
    providers: {
      google: env.ENABLE_GOOGLE_AUTH !== "false",
      apple: env.ENABLE_APPLE_AUTH === "true"
    }
  });
}

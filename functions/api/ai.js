import { json, requireUser } from "../_lib/auth.js";

// Seuls les modèles réellement utilisés par l'app sont autorisés à passer
// par ce proxy. Sans ça, un appel direct à /api/ai (n'importe quel compte
// authentifié peut en fabriquer un) pourrait demander un modèle bien plus
// cher que prévu (ex: opus) avec la clé partagée.
const ALLOWED_MODELS = new Set([
  "claude-haiku-4-5-20251001",
  "claude-sonnet-4-6"
]);
const MAX_TOKENS_CAP = 1024; // le plus haut usage réel de l'app est 800

export async function onRequestPost(context) {
  const { env, request } = context;

  // Endpoint authentifié : sans cela n'importe qui pourrait consommer
  // le quota Anthropic en appelant /api/ai directement.
  const { error } = await requireUser(context);
  if (error) return error;

  if (!env.ANTHROPIC_API_KEY) {
    return json({ error: "ANTHROPIC_API_KEY not set" }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!body || !ALLOWED_MODELS.has(body.model)) {
    return json({ error: "Modèle non autorisé" }, 400);
  }
  if (typeof body.max_tokens !== "number" || body.max_tokens <= 0 || body.max_tokens > MAX_TOKENS_CAP) {
    return json({ error: "max_tokens invalide" }, 400);
  }

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify(body)
  });

  const data = await anthropicRes.json();

  return new Response(JSON.stringify(data), {
    status: anthropicRes.status,
    headers: { "Content-Type": "application/json" }
  });
}

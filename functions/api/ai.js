import { json, requireUser } from "../_lib/auth.js";

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

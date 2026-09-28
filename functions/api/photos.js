import { json, requireUser, enforceRateLimit } from "../_lib/auth.js";

// Une recherche par projet, mise en cache côté client (p.photo persisté) —
// jamais rappelée en boucle depuis l'app. Large marge au-dessus de cet usage,
// juste assez bas pour limiter un abus direct de l'endpoint.
const RATE_LIMIT_PER_MINUTE = 20;
const MAX_QUERY_LENGTH = 80;

export async function onRequestGet(context) {
  const { env, request } = context;

  const { user, error } = await requireUser(context);
  if (error) return error;

  const limited = await enforceRateLimit(env, user.id, "photos", RATE_LIMIT_PER_MINUTE);
  if (limited) return limited;

  if (!env.PEXELS_API_KEY) {
    return json({ error: "PEXELS_API_KEY not set" }, 500);
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim().slice(0, MAX_QUERY_LENGTH);
  if (!q) return json({ error: "q required" }, 400);

  const pexelsRes = await fetch(
    "https://api.pexels.com/v1/search?per_page=1&query=" + encodeURIComponent(q),
    { headers: { Authorization: env.PEXELS_API_KEY } }
  );
  if (!pexelsRes.ok) {
    return json({ error: "Pexels indisponible" }, 502);
  }

  const data = await pexelsRes.json();
  const photo = (data.photos || [])[0];
  if (!photo) {
    return json({ error: "no_results" }, 404);
  }

  return json({
    url: (photo.src && photo.src.large) || null,
    photographer: photo.photographer || "",
    photographerUrl: photo.photographer_url || "",
    pexelsId: photo.id,
    pageUrl: photo.url || ""
  });
}

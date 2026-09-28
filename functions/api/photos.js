import { json, requireUser, enforceRateLimit } from "../_lib/auth.js";

// Une recherche par projet, mise en cache côté client (p.photo persisté) —
// jamais rappelée en boucle depuis l'app. Large marge au-dessus de cet usage,
// juste assez bas pour limiter un abus direct de l'endpoint.
const RATE_LIMIT_PER_MINUTE = 20;
const MAX_QUERY_LENGTH = 80;
const RESULTS_PER_QUERY = 6;

// Filtre "ranking basique" (MVP) : le prompt de génération de photoQuery demande déjà à
// l'IA d'éviter les visages, mais reste un filet de secours ici (photoQuery absente sur
// les vieux projets, requête de repli sur le titre, ou l'IA n'a pas suivi la consigne) —
// Pexels n'offrant pas de filtre "sans visage", on écarte via le texte alt du résultat.
// Contrainte précisée : une silhouette, des mains, une forme humaine de dos ou en action
// restent acceptables (donnent vie à la photo) — seul un visage / portrait / personne qui
// pose face à la caméra est écarté, pas toute présence humaine.
const PEOPLE_PATTERN = /\b(face|faces|portrait|portraits|headshot|headshots|selfie|selfies|smiling|smile|smiles|looking at camera|posing)\b/i;

function pickPhoto(photos) {
  return photos.find((p) => !PEOPLE_PATTERN.test(p.alt || "")) || photos[0];
}

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

  // "wallpaper" oriente Pexels vers des compositions pensées pour occuper tout le cadre
  // (plus atmosphériques, moins de sujet isolé sur fond neutre) — cohérent avec l'usage en
  // fond de tuile. size=large exige une résolution source d'au moins ~24MP côté Pexels,
  // pour rester net en HD/2K/4K même sur les tuiles les plus grandes ou en écran haute
  // densité (le src.large2x renvoyé au client est ensuite ~1880px de large).
  const pexelsRes = await fetch(
    "https://api.pexels.com/v1/search?per_page=" + RESULTS_PER_QUERY +
      "&size=large&query=" + encodeURIComponent(q + " wallpaper"),
    { headers: { Authorization: env.PEXELS_API_KEY } }
  );
  if (!pexelsRes.ok) {
    return json({ error: "Pexels indisponible" }, 502);
  }

  const data = await pexelsRes.json();
  const photos = data.photos || [];
  const photo = photos.length > 0 ? pickPhoto(photos) : null;
  if (!photo) {
    return json({ error: "no_results" }, 404);
  }

  return json({
    url: (photo.src && (photo.src.large2x || photo.src.large)) || null,
    photographer: photo.photographer || "",
    photographerUrl: photo.photographer_url || "",
    pexelsId: photo.id,
    pageUrl: photo.url || ""
  });
}

import { json, requireUser, enforceRateLimit } from "../_lib/auth.js";

// Une recherche par projet, mise en cache côté client (p.photo persisté) —
// jamais rappelée en boucle depuis l'app. Large marge au-dessus de cet usage,
// juste assez bas pour limiter un abus direct de l'endpoint.
const RATE_LIMIT_PER_MINUTE = 20;
const MAX_QUERY_LENGTH = 80;
// Pexels n'a pas de catégorie « fond d'écran » : on demande large (30 résultats) puis on trie
// côté serveur (voir pickPhoto). Un pool plus grand laisse de quoi choisir un vrai fond
// d'écran plutôt que de prendre le premier résultat venu.
const RESULTS_PER_QUERY = 30;

// Résolution minimale pour un fond d'écran HD/2K/4K : au moins 2560 px sur le grand côté.
// size=large côté Pexels garantit déjà ~24MP ; ce garde-fou reste vrai même si ce paramètre
// venait à changer, et écarte toute photo trop petite pour être nette en fond de tuile.
const MIN_LONG_SIDE = 2560;

// Signaux d'une photo pensée comme fond d'écran, lus dans le texte alt et dans le slug de
// l'URL Pexels (qui reprend ce texte). Fort : le mot y est explicitement. Paysager : la
// composition typique d'un fond d'écran (vaste, atmosphérique, sans sujet isolé).
const WALLPAPER_STRONG = /\b(wallpaper|wallpapers|background|backdrop)\b/i;
const WALLPAPER_SCENIC = /\b(landscape|scenery|scenic|panorama|panoramic|aerial|skyline|horizon|abstract|texture|pattern|minimal|minimalist|aesthetic|dramatic|majestic|serene|tranquil|sunset|sunrise|golden hour|twilight|starry|milky way|night sky|mountain|mountains|ocean|sea|beach|coast|lake|forest|desert|waterfall|valley|clouds|fog|mist)\b/i;
// À l'inverse : ce qui n'est pas un fond d'écran (visuel graphique, capture, document).
const WALLPAPER_AVOID = /\b(logo|screenshot|text|sign|poster|infographic|diagram|chart|mockup|document)\b/i;

// Filtre "ranking basique" (MVP) : le prompt de génération de photoQuery demande déjà à
// l'IA d'éviter les visages, mais reste un filet de secours ici (photoQuery absente sur
// les vieux projets, requête de repli sur le titre, ou l'IA n'a pas suivi la consigne) —
// Pexels n'offrant pas de filtre "sans visage", on écarte via le texte alt du résultat.
// Contrainte précisée : une silhouette, des mains, une forme humaine de dos ou en action
// restent acceptables (donnent vie à la photo) — seul un visage / portrait / personne qui
// pose face à la caméra est écarté, pas toute présence humaine.
const PEOPLE_PATTERN = /\b(face|faces|portrait|portraits|headshot|headshots|selfie|selfies|smiling|smile|smiles|looking at camera|posing)\b/i;

function altAndSlug(p) {
  const slug = String(p.url || "").replace(/^.*\/photo\//, "").replace(/-\d+\/?$/, "").replace(/-/g, " ");
  return (p.alt || "") + " " + slug;
}

function wallpaperScore(p) {
  const text = altAndSlug(p);
  let score = 0;
  if (WALLPAPER_STRONG.test(text)) score += 3;
  if (WALLPAPER_SCENIC.test(text)) score += 2;
  if (WALLPAPER_AVOID.test(text)) score -= 2;
  return score;
}

// Choisit la meilleure photo parmi les résultats, ou null : mieux vaut aucune photo (la
// tuile garde alors son fond couleur + icône) qu'une photo qui ne convient pas — visage de
// face, ou trop petite pour un fond d'écran. Le tri est stable : à score égal, l'ordre de
// pertinence de Pexels est conservé.
function pickPhoto(photos) {
  const usable = photos.filter(
    (p) => !PEOPLE_PATTERN.test(altAndSlug(p)) && Math.max(p.width || 0, p.height || 0) >= MIN_LONG_SIDE
  );
  if (!usable.length) return null;
  return usable.slice().sort((a, b) => wallpaperScore(b) - wallpaperScore(a))[0];
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
  // densité (le src.large2x renvoyé au client est ensuite ~1880px de large). Le reste de la
  // sélection (résolution minimale, signaux de fond d'écran, visages) se fait dans pickPhoto.
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

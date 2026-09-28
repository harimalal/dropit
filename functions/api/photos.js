import { json, requireUser, enforceRateLimit } from "../_lib/auth.js";

// Une recherche par projet, mise en cache côté client (p.photo persisté) —
// jamais rappelée en boucle depuis l'app. Large marge au-dessus de cet usage,
// juste assez bas pour limiter un abus direct de l'endpoint.
const RATE_LIMIT_PER_MINUTE = 20;
const MAX_QUERY_LENGTH = 80;
// Pexels n'a pas de catégorie « fond d'écran » : on demande le maximum (80 résultats) puis on
// ne garde que ceux qui en sont réellement (voir pickPhoto). Le filtre est strict, donc un pool
// le plus large possible pour qu'il reste de quoi choisir.
const RESULTS_PER_QUERY = 80;

// Résolution minimale pour un fond d'écran HD/2K/4K : au moins 2560 px sur le grand côté.
// size=large côté Pexels garantit déjà ~24MP ; ce garde-fou reste vrai même si ce paramètre
// venait à changer, et écarte toute photo trop petite pour être nette en fond de tuile.
const MIN_LONG_SIDE = 2560;

// Preuve qu'une photo est un fond d'écran, lue dans son texte alt et dans le slug de l'URL Pexels
// (qui reprend ce texte) : Pexels n'a pas de catégorie ni de filtre « fond d'écran », c'est le
// seul indice disponible. Une photo SANS cette preuve est écartée, pas seulement moins bien
// classée. « in the background » (le fond d'une scène) n'est pas un fond d'écran : exclu.
const WALLPAPER_EVIDENCE = /\b(wallpapers?|backdrops?|desktop|4k|8k|hd|lock ?screen)\b|(?<!in the )(?<!the )\bbackgrounds?\b/i;
const WALLPAPER_WORD = /\bwallpapers?\b/i;
// À l'inverse : ce qui n'est pas un fond d'écran (visuel graphique, capture, document).
const WALLPAPER_AVOID = /\b(logo|screenshot|text|sign|poster|infographic|diagram|chart|mockup|document)\b/i;

// Mots de la requête qui ne disent rien du sujet.
const STOPWORDS = new Set(["the", "and", "for", "with", "from", "view", "photo", "photos", "image", "images", "stock", "free", "wallpaper", "wallpapers", "background", "backgrounds", "hd", "4k"]);

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

function isWallpaper(p) {
  const text = altAndSlug(p);
  return WALLPAPER_EVIDENCE.test(text) && !WALLPAPER_AVOID.test(text);
}

// Départage deux photos également pertinentes : le mot « wallpaper » lui-même vaut mieux
// qu'un indice plus indirect (hd, 4k, background).
function wallpaperScore(p) {
  return WALLPAPER_WORD.test(altAndSlug(p)) ? 1 : 0;
}

// Mots-clés du SUJET, tirés de la requête envoyée par l'app (« car », « gym weights »…).
// Le singulier sert de racine : « weights » retrouve « weight » comme « weights ».
function subjectKeywords(q) {
  return [...new Set(
    String(q || "").toLowerCase().split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
      .map((w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w))
  )];
}

// Nombre de mots-clés du sujet qui apparaissent dans le texte de la photo (alt + slug).
function relevance(p, keywords) {
  const text = altAndSlug(p);
  return keywords.filter((k) => new RegExp("\\b" + k + "(?:s|es)?\\b", "i").test(text)).length;
}

// Choisit la photo, ou null. Trois conditions, toutes obligatoires :
//  1. un fond d'écran (voir WALLPAPER_EVIDENCE), d'au moins 2560 px de grand côté ;
//  2. sans visage de face, et pas déjà proposée (`exclude`) ;
//  3. qui parle du sujet : au moins un mot-clé du sujet dans son texte.
// Sans photo qui remplisse les trois, on renvoie null et la tuile garde son fond couleur +
// icône : mieux vaut aucune photo qu'une qui n'a rien à voir avec le projet ou qui n'est pas
// un fond d'écran. Parmi celles qui conviennent : plus de mots du sujet d'abord, puis le mot
// « wallpaper » explicite ; à égalité, l'ordre de pertinence de Pexels (tri stable).
function pickPhoto(photos, keywords = [], exclude = []) {
  const usable = photos.filter(
    (p) =>
      !exclude.includes(p.id) &&
      !PEOPLE_PATTERN.test(altAndSlug(p)) &&
      Math.max(p.width || 0, p.height || 0) >= MIN_LONG_SIDE &&
      isWallpaper(p)
  );
  const relevant = keywords.length ? usable.filter((p) => relevance(p, keywords) > 0) : usable;
  if (!relevant.length) return null;
  return relevant
    .slice()
    .sort((a, b) => relevance(b, keywords) - relevance(a, keywords) || wallpaperScore(b) - wallpaperScore(a))[0];
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
  // Photos déjà proposées pour ce projet (« Changer la photo ») : au plus 20 identifiants.
  const exclude = (url.searchParams.get("exclude") || "")
    .split(",").map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0).slice(0, 20);

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
  const photo = photos.length > 0 ? pickPhoto(photos, subjectKeywords(q), exclude) : null;
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

// Service worker volontairement sans cache : le réseau reste la seule source de vérité.
// Il ne met JAMAIS en cache app.html, les données ni /api/* (voir MISSIONS/2026-09-29-pwa-android/CADRAGE.md §7).
// Rôle unique : afficher une page lisible quand on ouvre l'app sans réseau.

const PAGE_HORS_CONNEXION =
  '<!doctype html><html lang="fr"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
  '<title>Dropit</title>' +
  '<style>body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;' +
  'padding:32px 24px;box-sizing:border-box;text-align:center;background:#F8F8F9;color:#2B2420;' +
  'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}' +
  'h1{font-size:19px;font-weight:800;margin:0 0 8px}p{font-size:14px;color:#7A7168;line-height:1.5;max-width:300px;margin:0 0 24px}' +
  'button{font:inherit;font-weight:700;color:#fff;background:#BF5B44;border:0;border-radius:12px;padding:12px 22px}</style></head>' +
  '<body><h1>Pas de connexion</h1><p>Dropit a besoin d’internet pour charger tes projets. Vérifie ta connexion, puis réessaie.</p>' +
  '<button onclick="location.reload()">Réessayer</button></body></html>';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Purge toute trace d'un ancien cache (l'ancienne piste PWA en créait un).
  event.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(cles.map((cle) => caches.delete(cle))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Seules les navigations sont concernées ; tout le reste (dont /api/*) passe sans intervention.
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(() =>
      new Response(PAGE_HORS_CONNEXION, {
        status: 503,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
      })
    )
  );
});

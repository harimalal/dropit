// Service worker minimal — condition d'installabilité PWA (Android/TWA, Capacitor).
// Ne met en cache que la coquille statique. Les appels /api/* (IA, données utilisateur)
// restent toujours en direct sur le réseau : jamais de cache sur des données dynamiques
// ou liées à l'authentification.

const CACHE_NAME = "dropit-shell-v1";
const SHELL_FILES = [
  "/app.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Jamais de cache sur l'API : toujours le réseau.
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Coquille statique : cache d'abord, réseau en repli (et mise à jour du cache).
  if (event.request.method === "GET") {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});

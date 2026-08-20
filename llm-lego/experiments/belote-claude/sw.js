// Service worker minimal — rend l'appli installable (icône écran d'accueil).
// Réseau EN PRIORITÉ pour la coquille statique (ce projet change souvent, un cache-first
// servirait indéfiniment une version périmée) ; le cache n'est qu'un secours hors-ligne.
// /api/* passe toujours par le réseau (l'état de la partie vit côté serveur).
const CACHE = "belote-shell-v3";
const SHELL = ["/", "/manifest.webmanifest", "/assets/icon-192.png", "/assets/icon-512.png", "/src/sort.mjs"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.pathname.startsWith("/api/")) return; // laisse passer, jamais de cache sur l'API
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});

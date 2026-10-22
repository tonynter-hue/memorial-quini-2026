const CACHE_NAME = "elcano-billar-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener("fetch", (e) => {
  // Petición directa a la red para ver siempre los últimos resultados
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
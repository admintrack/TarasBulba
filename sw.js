// Taras Bulba — minimal SW to stop intercepting requests and clear old caches.
// This SW does NOT handle 'fetch' at all, so CSS/JS/HTML load directly from the network.

self.addEventListener("install", (event) => {
  // Activate immediately
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Clear ALL old caches so nothing stale remains
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
  })());
  self.clients.claim();
});

// NOTE: no fetch handler on purpose
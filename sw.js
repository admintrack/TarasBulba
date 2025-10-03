// Taras Bulba — cache with ignoreSearch so style.css?v=4 & app.js?v=4 work
const CACHE = "tarasbulba-v6";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json"
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(ASSETS);
    // (optional) enable navigation preload where supported
    try { await self.registration.navigationPreload.enable(); } catch {}
  })());
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
  })());
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;

  e.respondWith((async () => {
    // Try cache first (ignoring any ?v= query strings), then network, then cached fallback
    const cached = await caches.match(request, { ignoreSearch: true });
    try {
      const network = await fetch(request);
      // Update cache with the exact-request (including query) for next time
      const copy = network.clone();
      caches.open(CACHE).then(c => c.put(request, copy)).catch(() => {});
      return network;
    } catch (err) {
      if (cached) return cached;
      throw err;
    }
  })());
});
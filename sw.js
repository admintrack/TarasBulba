// Taras Bulba — iOS-friendly service worker: make sure CSS/JS load fresh.
// HTML navigations: network-first (fallback to cache).
// CSS/JS: network-first with ignoreSearch (handles ?v=4, etc).
// Other assets: cache-first.
// Bump version to force an update.
const CACHE = "tarasbulba-v7";

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Precache core assets without query strings
    await cache.addAll(ASSETS);
    try { await self.registration.navigationPreload.enable(); } catch {}
  })());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
  })());
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isCSS = url.pathname.endsWith(".css");
  const isJS  = url.pathname.endsWith(".js");
  const isNav = req.mode === "navigate";

  if (isNav) {
    // HTML navigation -> network first
    event.respondWith(networkFirst(req));
    return;
  }

  if (isCSS || isJS) {
    // Always try network first for CSS/JS, but ignore query strings when falling back to cache
    event.respondWith(networkFirst(req, /*ignoreSearch*/ true));
    return;
  }

  // Everything else: cache first with ignoreSearch (covers icons, etc.)
  event.respondWith(cacheFirst(req));
});

async function cacheFirst(req) {
  const cached = await caches.match(req, { ignoreSearch: true });
  if (cached) return cached;
  try {
    const net = await fetch(req);
    const cache = await caches.open(CACHE);
    cache.put(req, net.clone());
    return net;
  } catch (e) {
    return cached || Response.error();
  }
}

async function networkFirst(req, ignoreSearch = false) {
  const cache = await caches.open(CACHE);
  try {
    // cache:'reload' helps bust stale intermediates on iOS
    const net = await fetch(req, { cache: "reload" });
    cache.put(req, net.clone());
    return net;
  } catch (e) {
    const cached = await caches.match(req, { ignoreSearch });
    if (cached) return cached;

    // For navigations, fall back to cached index.html
    if (req.mode === "navigate") {
      const fallback = await caches.match("./index.html");
      if (fallback) return fallback;
    }
    throw e;
  }
}
// Minimal Service Worker — does nothing but clears old caches
self.addEventListener("install", e => self.skipWaiting());
self.addEventListener("activate", e => {
  e.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.map(k=>caches.delete(k)));})());
  self.clients.claim();
});
// No fetch handler => always go to network (no CSS/JS breakage)
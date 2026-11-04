// Tony's Kitchen Owner POS Service Worker
const CACHE_NAME = 'tonys-kitchen-owner-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let network handle all API and live database requests
  if (
    event.request.url.includes('firestore.googleapis.com') ||
    event.request.url.includes('firebase') ||
    event.request.url.includes('identitytoolkit') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // Network-first with cache fallback
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request);
      return cached || Response.error();
    })
  );
});

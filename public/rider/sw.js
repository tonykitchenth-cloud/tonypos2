// Tony's Kitchen Rider Service Worker
const CACHE_NAME = 'tonys-kitchen-rider-v2';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './rider-icon-192.png',
  './rider-icon-512.png',
  './rider-icon-maskable-512.png',
  './rider-apple-touch-icon.png',
  '../index.html',
  '../pwa-192x192.png',
  '../pwa-512x512.png',
  '../pwa-maskable-512x512.png',
  '../apple-touch-icon.png',
  '../favicon-32.png'
];

const isDev =
  self.location.hostname.includes('ais-dev') ||
  self.location.hostname === 'localhost' ||
  self.location.port === '3000';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  if (!isDev) {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return Promise.allSettled(
          PRECACHE_ASSETS.map((asset) => cache.add(asset).catch(() => undefined))
        );
      })
    );
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (isDev || (key.startsWith('tonys-kitchen-rider-') && key !== CACHE_NAME)) {
            return caches.delete(key);
          }
          return undefined;
        })
      );
    }).then(() => {
      if (isDev) {
        return self.registration.unregister();
      }
      return undefined;
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'PURGE_DEV_CACHE' || event.data.type === 'UNREGISTER')) {
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.registration.unregister());
  }
});

self.addEventListener('fetch', (event) => {
  if (isDev || event.request.method !== 'GET') {
    return;
  }

  let url;
  try {
    url = new URL(event.request.url);
  } catch {
    return;
  }

  // Never intercept external APIs, Firebase/Firestore, maps tiles, or translation APIs
  if (
    url.origin !== self.location.origin ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('identitytoolkit') ||
    url.hostname.includes('mymemory.translated.net')
  ) {
    return;
  }

  // 1. Navigation requests & root index.html shell: Network-first with cache fallback
  if (event.request.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const cached =
            (await cache.match(event.request)) ||
            (await cache.match('./index.html')) ||
            (await cache.match('./'));
          return cached || Response.error();
        })
    );
    return;
  }

  // 2. Same-origin static assets (JS/CSS/PNG/manifest): Stale-while-revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

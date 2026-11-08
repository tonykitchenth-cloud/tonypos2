const CACHE_NAME = 'tonys-kitchen-v5';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon-32.png',
  './icon.svg'
];

const isDev = self.location.hostname.includes('ais-dev') || self.location.hostname === 'localhost' || self.location.port === '3000';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  if (!isDev) {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn('[SW] Precache notice:', err);
        });
      })
    );
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (isDev || key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      if (isDev) {
        return self.registration.unregister();
      }
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'PURGE_DEV_CACHE' || event.data.type === 'UNREGISTER')) {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).then(() => {
      self.registration.unregister();
    });
  }
});

self.addEventListener('fetch', (event) => {
  // If in dev environment, never touch cache or intercept any request
  if (isDev) {
    return;
  }

  const url = new URL(event.request.url);

  // 1. Never cache or intercept Firestore, Firebase, Google APIs, or non-GET requests
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('identitytoolkit') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // 2. Never cache or intercept Vite dev server assets, node_modules chunks, or development sources
  if (
    url.pathname.includes('/node_modules/') ||
    url.pathname.startsWith('/@') ||
    url.pathname.includes('/src/') ||
    url.searchParams.has('v') ||
    url.port === '3000' ||
    url.hostname === 'localhost' ||
    url.hostname.includes('ais-dev')
  ) {
    return;
  }

  // 2. Navigation requests: Network-first, fallback to cached HTML shell
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match('./index.html') || await cache.match('./') || await cache.match('/');
        return cachedResponse || Response.error();
      })
    );
    return;
  }

  // 3. Static assets: Stale-while-revalidate or Network with cache fallback
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

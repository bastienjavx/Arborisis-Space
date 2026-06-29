const CACHE_VERSION = 'v2';
const STATIC_CACHE = `arborisis-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `arborisis-runtime-${CACHE_VERSION}`;

const OFFLINE_URL = '/offline';

const APP_SHELL = [
  '/',
  '/play',
  OFFLINE_URL,
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  const sourceOrigin =
    event.origin || (event.source?.url ? new URL(event.source.url).origin : null);
  if (!sourceOrigin || sourceOrigin !== self.location.origin) return;
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Skip caching for /api/ calls to keep auth/gameplay data fresh
  // Also skip /manifest.webmanifest and /sw.js (updated via cache headers)
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/sw.js'
  )
    return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache successful responses (2xx status)
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy)));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          // Page hors-ligne dédiée, puis repli sur l'app shell mis en cache.
          const offline = (await caches.match(OFFLINE_URL)) || (await caches.match('/play'));
          if (offline) return offline;
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(async (cached) => {
      if (cached) return cached;
      try {
        const response = await fetch(request);
        // Only cache successful responses (2xx status)
        if (response.ok) {
          const copy = response.clone();
          const cacheInstance = await caches.open(RUNTIME_CACHE);
          await cacheInstance.put(request, copy);
        }
        return response;
      } catch {
        return new Response('Network request failed and no cached response is available.', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }
    }),
  );
});

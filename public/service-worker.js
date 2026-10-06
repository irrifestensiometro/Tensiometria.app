const CACHE_PREFIX = 'irrifes-pwa-';
const CACHE_NAME = `${CACHE_PREFIX}v1`;
const APP_SHELL = ['/', '/index.html', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const requestUrl = new URL(request.url);

  if (request.method !== 'GET' || requestUrl.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseToCache = response.clone();
            event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', responseToCache)));
          }
          return response;
        })
        .catch(async () => {
          const cachedPage = await caches.match('/index.html');
          return cachedPage ?? new Response('Sem conexao. Reconecte-se para usar o IRRIFES.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        }),
    );
    return;
  }

  if (requestUrl.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;

        return fetch(request).then((response) => {
          if (response.ok) {
            const responseToCache = response.clone();
            event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache)));
          }
          return response;
        });
      }),
    );
  }
});

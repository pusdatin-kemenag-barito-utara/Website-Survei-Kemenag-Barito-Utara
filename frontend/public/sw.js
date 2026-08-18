// SI-ARUS Service Worker - PWA & Offline Resilience with HTTP/3 Navigation Preload
const CACHE_NAME = 'si-arus-cache-v1.1.0';
const STATIC_ASSETS = [
  '/',
  '/favicon.ico',
  '/icon.png',
  '/apple-icon.png',
  '/kemenag.svg',
  '/arus.webp',
  '/hapakat.webp',
  '/Logo_PANRB.webp',
  '/hero_survey_bg.webp',
  '/manifest.webmanifest',
];

// Install Event: Pre-cache critical static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('[SW] Pre-cache warning:', err))
  );
});

// Activate Event: Enable Navigation Preload for HTTP/3 & Clean up legacy caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Enable Navigation Preload if supported
      self.registration.navigationPreload
        ? self.registration.navigationPreload.enable()
        : Promise.resolve(),
      // Clean old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              return caches.delete(cache);
            }
          })
        );
      }),
    ]).then(() => self.clients.claim())
  );
});

// Fetch Event: Stale-While-Revalidate / Cache-First for static assets, Network-First for others
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and API/Auth routes
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_image')) return;
  if (url.origin.includes('supabase') || url.origin.includes('pusdatin') || url.origin.includes('cloudflare')) return;

  // 1. Google Fonts and Static Media: Cache-First with Background Revalidation
  const isStaticMedia =
    url.origin.includes('fonts.googleapis.com') ||
    url.origin.includes('fonts.gstatic.com') ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'style' ||
    url.pathname.match(/\.(png|jpg|jpeg|webp|svg|ico|woff2?|ttf|css)$/);

  if (isStaticMedia) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Background revalidation
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 2. Navigation / HTML pages: Use Navigation Preload -> Network -> Cache Fallback
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      (async () => {
        try {
          // Use preloaded response if available (HTTP/3 speedup)
          const preloadResponse = await event.preloadResponse;
          if (preloadResponse) {
            const clone = preloadResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return preloadResponse;
          }

          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        } catch {
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallback = await caches.match('/');
          if (fallback) return fallback;
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        }
      })()
    );
    return;
  }
});

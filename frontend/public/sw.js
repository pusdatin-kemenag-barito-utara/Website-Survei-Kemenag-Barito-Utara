// SI-ARUS Service Worker - PWA & High Performance Static Asset Caching
const CACHE_NAME = 'si-arus-cache-v1.3.0';
const STATIC_ASSETS = [
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

// Install Event: Pre-cache static shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('[SW] Pre-cache warning:', err))
  );
});

// Activate Event: Clean up all legacy caches aggressively
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              return caches.delete(cache);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch Event: Cache-First for static images/fonts ONLY
// NEVER intercept or cache scripts, HTML, API, or extension requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!request.url.startsWith('http')) return;
  if (request.method !== 'GET') return;
  if (request.mode === 'navigate' || request.destination === 'document') return;

  const url = new URL(request.url);

  // Bypass API, dynamic dev modules, and external auth
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_image') || url.pathname.startsWith('/@') || url.pathname.includes('/node_modules/')) return;
  if (url.origin.includes('supabase') || url.origin.includes('pusdatin') || url.origin.includes('cloudflare')) return;

  // ONLY cache static media (images and fonts) - NEVER cache JS scripts to avoid stale React chunk conflicts
  const isStaticMedia =
    url.origin.includes('fonts.googleapis.com') ||
    url.origin.includes('fonts.gstatic.com') ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.match(/\.(png|jpg|jpeg|webp|svg|ico|woff2?|ttf)$/i);

  if (isStaticMedia) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                try {
                  cache.put(request, responseToCache);
                } catch {}
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse || new Response('', { status: 408 }));
      })
    );
  }
});

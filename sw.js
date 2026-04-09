// ─── Körhäftet — Service Worker ───

const CACHE_NAME = 'korhaftet-v1';

const PRECACHE_URLS = [
  './',
  './index.html',
  './app.js',
  './chords.js',
  './style.css',
  './manifest.json',
  './icon.svg',
  './songs/index.json',
];

// Install: precache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(PRECACHE_URLS);
      // Also cache all song files listed in index.json
      try {
        const resp = await fetch('./songs/index.json');
        const songFiles = await resp.json();
        const songUrls = songFiles.map(f => `./songs/${f}`);
        await cache.addAll(songUrls);
      } catch (e) {
        console.warn('SW: could not precache song files', e);
      }
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for song data, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Song JSON files: network-first (so reloads get fresh data)
  if (url.pathname.includes('/songs/')) {
    event.respondWith(
      fetch(event.request)
        .then((resp) => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return resp;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // All other assets: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((resp) => {
        if (resp.ok && event.request.method === 'GET') {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return resp;
      });
    })
  );
});

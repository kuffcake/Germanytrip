/* Offline support: everything the app needs is cached on first load.
   Bump VERSION whenever any file changes so phones pick up the update. */
const VERSION = 'railloop-v1';
const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'fonts/fonts.css',
  'fonts/barlow-400-latin.woff2',
  'fonts/barlow-400-latin-ext.woff2',
  'fonts/barlow-500-latin.woff2',
  'fonts/barlow-500-latin-ext.woff2',
  'fonts/barlow-600-latin.woff2',
  'fonts/barlow-600-latin-ext.woff2',
  'fonts/barlow-condensed-500-latin.woff2',
  'fonts/barlow-condensed-500-latin-ext.woff2',
  'fonts/barlow-condensed-600-latin.woff2',
  'fonts/barlow-condensed-600-latin-ext.woff2',
  'fonts/barlow-condensed-700-latin.woff2',
  'fonts/barlow-condensed-700-latin-ext.woff2',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // Cache first so the app opens instantly with no signal; refresh the copy in the background.
  e.respondWith(
    caches.open(VERSION).then(async cache => {
      const hit = await cache.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' ? await cache.match('index.html') : null);
      const fresh = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; });
      if (hit) { fresh.catch(() => {}); return hit; }
      return fresh;
    })
  );
});

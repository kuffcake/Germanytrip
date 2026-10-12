/* Offline support: everything the app needs is cached on first load.
   Bump VERSION whenever any file changes so phones pick up the update. */
const VERSION = 'railloop-v4';
// Street map tiles are saved as you view them, so places you looked at on wifi still show with no signal.
const TILES = 'railloop-tiles';
const TILE_HOST = 'tile.openstreetmap.org';
const TILE_LIMIT = 1500;
const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'vendor/leaflet.js',
  'vendor/leaflet.css',
  'vendor/borders.js',
  'photos/credits.js',
  'photos/brandenburg-gate.jpg',
  'photos/museum-island.jpg',
  'photos/sanssouci.jpg',
  'photos/east-side-gallery.jpg',
  'photos/castle-church.jpg',
  'photos/thomaskirche.jpg',
  'photos/dresden.jpg',
  'photos/wroclaw-rynek.jpg',
  'photos/wawel.jpg',
  'photos/birkenau.jpg',
  'photos/bratislava.jpg',
  'photos/schoenbrunn.jpg',
  'photos/stephansdom.jpg',
  'photos/marienplatz.jpg',
  'photos/nymphenburg.jpg',
  'photos/neuschwanstein.jpg',
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
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== TILES).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function tile(req) {
  const cache = await caches.open(TILES);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) {
    await cache.put(req, res.clone());
    // Occasionally drop the oldest tiles so the cache cannot grow without bound.
    if (Math.random() < 0.05) {
      const keys = await cache.keys();
      if (keys.length > TILE_LIMIT) await Promise.all(keys.slice(0, keys.length - TILE_LIMIT).map(k => cache.delete(k)));
    }
  }
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).hostname === TILE_HOST) { e.respondWith(tile(req)); return; }
  if (new URL(req.url).origin !== self.location.origin) return;
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

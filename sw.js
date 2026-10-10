// Офлайн-кэш: сначала сеть (чтобы обновления приходили сразу), без сети — из кэша.
const CACHE = 'sofya-car-v1';
const FILES = [
  './', 'index.html', 'style.css', 'manifest.webmanifest',
  'js/main.js', 'js/config.js', 'js/rng.js', 'js/terrain.js', 'js/car.js', 'js/world.js',
  'js/render.js', 'js/art.js', 'js/audio.js', 'js/save.js', 'js/ui.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })),
  );
});

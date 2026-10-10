// Офлайн-режим.
// При первом запуске (с интернетом) все файлы игры сохраняются на телефоне одним пакетом.
// Дальше игра всегда открывается из этого пакета — мгновенно и без интернета.
//
// Обновление: при запуске с интернетом браузер проверяет этот файл. Если VERSION изменился,
// новый пакет скачивается ЦЕЛИКОМ (или не скачивается вовсе, если связь оборвалась —
// тогда остаётся старая рабочая версия) и включается при следующем открытии меню.
// Поэтому при любом изменении файлов игры VERSION нужно увеличить, а новые файлы — вписать в FILES
// (git-хук tools/pre-commit делает и проверяет это сам).
const VERSION = 6;
const PREFIX = 'sofya-car-';
const CACHE = PREFIX + VERSION;
const FILES = [
  './', 'index.html', 'style.css', 'manifest.webmanifest',
  'js/main.js', 'js/config.js', 'js/rng.js', 'js/terrain.js', 'js/car.js', 'js/world.js',
  'js/render.js', 'js/art.js', 'js/audio.js', 'js/save.js', 'js/ui.js',
  'js/hooks.js', 'js/draw-utils.js', 'js/vehicles.js', 'js/sofya.js',
  'js/features/index.js', 'js/features/kittens.js', 'js/features/house.js', 'js/features/dressup.js',
  'js/features/garage-vehicles.js', 'js/features/flips.js', 'js/features/horn.js', 'js/features/weather.js',
  'js/features/bonus.js', 'js/features/daily.js', 'js/features/stickers.js', 'js/features/photo.js',
  'js/features/animals-extra.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // no-cache: каждый файл сверяется с сервером (неизменённые приходят коротким ответом 304)
      .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'no-cache' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const root = new URL(self.registration.scope).pathname;
  const isPage = req.mode === 'navigate' && (url.pathname === root || url.pathname === root + 'index.html');
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // страница игры (с любыми ?параметрами) — всегда сохранённый index.html
    const key = isPage ? new Request(self.registration.scope) : req;
    // файлы пакета отдаются только из него: так версии файлов никогда не перемешиваются
    const hit = await cache.match(key, { ignoreSearch: true });
    if (hit) return hit;
    try {
      return await fetch(req);
    } catch (err) {
      if (isPage || req.mode === 'navigate') {
        const page = await cache.match(new Request(self.registration.scope));
        if (page) return page;
      }
      throw err;
    }
  })());
});

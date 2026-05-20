const CACHE = 'jp-vocab-v2';
const ASSETS = [
  './',
  './index.html',
  './japanese-vocab.html',
  './japanese-quiz.html',
  'https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@300;400;600&family=Crimson+Pro:ital,wght@0,300;0,400;1,300&display=swap',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

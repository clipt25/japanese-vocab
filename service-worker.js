const CACHE = 'jp-vocab-v5';
const ASSETS = [
  './index.html',
  './japanese-vocab.html',
  './japanese-quiz.html',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
      .then(() =>
        self.clients.matchAll({ type: 'window', includeUncontrolled: true })
          .then(clients => clients.forEach(c => c.postMessage({ type: 'SW_UPDATED' })))
      )
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (!url.origin.includes('github.io') && !url.origin.includes('fonts.googleapis.com') && !url.origin.includes('fonts.gstatic.com')) {
    return;
  }
  if (e.request.mode === 'navigate' || e.request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then(cache => cache.put(e.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  // The call assistant's ES modules must be network-first. Cache-first would
  // serve a stale module after a redeploy — and a fresh shell importing a
  // cached ui.js that lacks its newer exports is a blank page, not a warning.
  // This alone does not protect against the HTTP cache (fetch() still honours
  // Pages' max-age=600); the ?v= URLs from call-assistant.html's import map
  // do. Keep only the newest version of each module, so the offline copy
  // matches the last cached shell and the cache doesn't grow every deploy.
  if (url.pathname.includes('/call/')) {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then(async cache => {
              for (const old of await cache.keys()) {
                const u = new URL(old.url);
                if (u.pathname === url.pathname && u.search !== url.search) cache.delete(old);
              }
              return cache.put(e.request, clone);
            });
          }
          return response;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request)
      .then(cached => cached || fetch(e.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }))
  );
});

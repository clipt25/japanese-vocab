# Claude Code Prompt — Fix PWA updates not reflecting on iOS

## Files to edit
- `service-worker.js`
- `index.html`
- `japanese-vocab.html`
- `japanese-quiz.html`

---

## The two bugs to fix

### Bug 1 — Cache-First strategy never picks up updates
The current fetch handler serves everything from cache first and only hits the network as a fallback. For an app that gets updated, HTML pages must use **Network First** so fresh content is always loaded when online, with cache as the offline fallback only.

### Bug 2 — iOS caches the service worker script itself
Without `updateViaCache: 'none'` in the SW registration call, iOS Safari HTTP-caches the `service-worker.js` file and never re-fetches it — making version bumps useless. This must be added to every registration call.

---

## Fix 1 — Rewrite `service-worker.js`

Replace the entire file with this:

```js
const CACHE = 'jp-vocab-v3';
const ASSETS = [
  './index.html',
  './japanese-vocab.html',
  './japanese-quiz.html',
];

// Install: pre-cache all app files fresh from network
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: delete all old caches, claim all clients immediately
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
      .then(() =>
        // Tell all open windows to reload so they get the fresh version
        self.clients.matchAll({ type: 'window', includeUncontrolled: true })
          .then(clients => clients.forEach(c => c.postMessage({ type: 'SW_UPDATED' })))
      )
  );
});

// Fetch: Network First for HTML pages, Cache First for everything else
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Only handle same-origin requests and the Google Fonts CSS
  if (!url.origin.includes('github.io') && !url.origin.includes('fonts.googleapis.com') && !url.origin.includes('fonts.gstatic.com')) {
    return; // let the browser handle cross-origin requests normally
  }

  // Network First for HTML navigation requests
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

  // Cache First for fonts and other static assets
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
```

**Why this works:**
- HTML files are always fetched from the network first → GitHub Pages changes are always reflected
- If offline, the cached version is used as fallback → app still works without internet
- On activation, all open windows receive a `SW_UPDATED` message → they reload automatically
- Old caches (v1, v2) are deleted on activation → no stale data hanging around

---

## Fix 2 — Update SW registration in all HTML files

In `index.html`, `japanese-vocab.html`, AND `japanese-quiz.html`, find the service worker registration script (near `</body>`) and replace it with:

```html
<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js', {
      updateViaCache: 'none'  // ← critical: tells iOS to never HTTP-cache the SW script
    }).catch(err => console.warn('SW registration failed:', err));
  });

  // Listen for the SW_UPDATED message and reload to get fresh content
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data && event.data.type === 'SW_UPDATED') {
      window.location.reload();
    }
  });
}
</script>
```

The `updateViaCache: 'none'` option is the critical iOS fix — it tells the browser to always bypass the HTTP cache when checking for a new service worker, regardless of what `Cache-Control` headers GitHub Pages sends.

---

## Deploy

```bash
cd "/Users/geoffreyjames/Desktop/Claude Obsidian/1-Projects/Japanese Review"
git add service-worker.js index.html japanese-vocab.html japanese-quiz.html
git commit -m "Fix PWA updates on iOS: Network First for HTML + updateViaCache none"
git push origin main
```

---

## After deploying — how to force the update on your iPhone

Because the old (broken) service worker is still installed on your phone, you need to manually clear it once after this fix is deployed. After that, updates will be automatic forever.

**Steps on iPhone:**
1. Open Safari (not the PWA icon — regular Safari)
2. Go to `https://clipt25.github.io/japanese-vocab/`
3. The new service worker will install and activate
4. The page will auto-reload once
5. Close Safari fully (swipe up from app switcher)
6. Now open the PWA from your home screen icon
7. ✅ From this point on, every time you open the PWA with internet, it will fetch the latest version automatically

**Why open in Safari first, not the PWA icon?**
The home screen PWA runs in a separate isolated context. Opening in regular Safari first lets the new SW install and activate cleanly without the standalone-mode quirks.

---

## Checklist
- [ ] `service-worker.js` rewritten with Network First for HTML, cache bumped to `jp-vocab-v3`
- [ ] `updateViaCache: 'none'` added to registration in all 3 HTML files
- [ ] `SW_UPDATED` message listener added to all 3 HTML files
- [ ] Old cache cleanup on activate confirmed (deletes v1 and v2)
- [ ] Pushed to GitHub Pages

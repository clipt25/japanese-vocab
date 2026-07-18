# Claude Code Prompt — PWA for Japanese Vocab & Quiz

## Overview

Convert the Japanese vocab app into a fully installable PWA. This affects the `japanese-vocab` GitHub repo which contains:
- `index.html` (the vocab flashcard app, live at https://clipt25.github.io/japanese-vocab/)
- `japanese-vocab.html` (local copy)
- `japanese-quiz.html` (the quiz app)

Three new files need to be created and two HTML files need a one-line addition each.

---

## File 1 — `manifest.json`

Create this file in the repo root:

```json
{
  "name": "日本語 Vocabulary",
  "short_name": "日本語",
  "description": "Japanese vocabulary flashcards and quiz",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0e0d0b",
  "theme_color": "#0e0d0b",
  "icons": [
    {
      "src": "icon.svg",
      "sizes": "any",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    },
    {
      "src": "icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## File 2 — `icon.svg`

Create this SVG icon — a warm dark square with 日 in gold:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#0e0d0b"/>
  <text
    x="256"
    y="340"
    font-family="serif"
    font-size="280"
    font-weight="300"
    fill="#c8b99a"
    text-anchor="middle"
  >日</text>
</svg>
```

---

## File 3 — Generate PNG icons from the SVG

Use a Node script to generate `icon-192.png` and `icon-512.png` from `icon.svg`. Install `sharp` if available, otherwise use this script with the `canvas` npm package:

```bash
cd "/Users/geoffreyjames/Desktop/Claude Obsidian/1-Projects/Japanese Review"
npm install sharp --save-dev 2>/dev/null || true
```

Then run this Node script (save as `generate-icons.js`, run it, then delete it):

```js
const sharp = require('sharp');
const fs = require('fs');

const svg = fs.readFileSync('icon.svg');

sharp(svg).resize(192, 192).png().toFile('icon-192.png', (err) => {
  if (err) console.error('192 failed:', err);
  else console.log('icon-192.png created');
});

sharp(svg).resize(512, 512).png().toFile('icon-512.png', (err) => {
  if (err) console.error('512 failed:', err);
  else console.log('icon-512.png created');
});
```

If `sharp` fails to install, use Python instead:
```bash
pip install cairosvg --break-system-packages
python3 -c "
import cairosvg
cairosvg.svg2png(url='icon.svg', write_to='icon-192.png', output_width=192, output_height=192)
cairosvg.svg2png(url='icon.svg', write_to='icon-512.png', output_width=512, output_height=512)
print('Icons created')
"
```

---

## File 4 — `service-worker.js`

Create this file in the repo root. It caches all app files for offline use:

```js
const CACHE = 'jp-vocab-v1';
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
```

---

## HTML changes — `index.html` (vocab app)

Add these two lines inside `<head>`, just before `</head>`:

```html
<link rel="manifest" href="./manifest.json">
<link rel="apple-touch-icon" href="./icon.svg">
```

Also add this service worker registration script just before `</body>`:

```html
<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .catch(err => console.warn('SW registration failed:', err));
  });
}
</script>
```

---

## HTML changes — `japanese-quiz.html`

Same two additions in `<head>`:

```html
<link rel="manifest" href="./manifest.json">
<link rel="apple-touch-icon" href="./icon.svg">
```

Same service worker script before `</body>`.

---

## Also update `japanese-vocab.html` (local copy)

Apply the same `<head>` and service worker additions to `japanese-vocab.html` so it stays in sync with `index.html`.

---

## Deploy

```bash
cd "/Users/geoffreyjames/Desktop/Claude Obsidian/1-Projects/Japanese Review"
git add manifest.json icon.svg icon-192.png icon-512.png service-worker.js index.html japanese-vocab.html japanese-quiz.html
git commit -m "Add PWA support: manifest, service worker, icons"
git push origin main
```

---

## Checklist
- [ ] `manifest.json` created with correct start_url and theme colours
- [ ] `icon.svg` created with 日 character in gold on dark background
- [ ] `icon-192.png` and `icon-512.png` generated successfully
- [ ] `service-worker.js` created with offline cache for all 3 HTML files
- [ ] `<link rel="manifest">` and `<link rel="apple-touch-icon">` added to `index.html` and `japanese-quiz.html`
- [ ] Service worker registration script added to both files
- [ ] All files pushed to GitHub Pages
- [ ] Confirm: opening https://clipt25.github.io/japanese-vocab/ on mobile shows "Add to Home Screen" option

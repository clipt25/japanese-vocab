# Master Prompt — Japanese App (run everything in order)

You are working in the Japanese vocab/quiz repo. The folder contains `index.html`, `japanese-vocab.html`, `japanese-quiz.html`, and `service-worker.js`.

Do all of the following tasks in order. Commit and push ONCE at the very end after everything is done.

---

## TASK 1 — Fix PWA so iOS picks up new updates

### 1a. Rewrite `service-worker.js` completely:

```js
const CACHE = 'jp-vocab-v3';
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

### 1b. In `index.html`, `japanese-vocab.html`, AND `japanese-quiz.html`:

Find the existing service worker registration script (near `</body>`) and replace it with:

```html
<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js', {
      updateViaCache: 'none'
    }).catch(err => console.warn('SW registration failed:', err));
  });
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data && event.data.type === 'SW_UPDATED') {
      window.location.reload();
    }
  });
}
</script>
```

---

## TASK 2 — Add daily streak system

### 2a. Add these localStorage constants near the top of the `<script>` block in `japanese-quiz.html`:

```js
const LS_STREAK_CURRENT = 'jp-streak-current';
const LS_STREAK_BEST    = 'jp-streak-best';
const LS_STREAK_DATE    = 'jp-streak-date';
```

### 2b. Add these helper functions in `japanese-quiz.html`:

```js
function todayStr() {
  return new Date().toLocaleDateString('en-CA');
}

function getStreak() {
  return {
    current: parseInt(lsGet(LS_STREAK_CURRENT) || '0', 10),
    best:    parseInt(lsGet(LS_STREAK_BEST)    || '0', 10),
    date:    lsGet(LS_STREAK_DATE) || null,
  };
}

function recordActivity() {
  const today = todayStr();
  const s = getStreak();
  if (s.date === today) return { current: s.current, best: s.best, increased: false };
  let newCurrent;
  if (s.date === null) {
    newCurrent = 1;
  } else {
    const diffDays = Math.round((new Date(today) - new Date(s.date)) / 86400000);
    newCurrent = (diffDays === 1) ? s.current + 1 : 1;
  }
  const newBest = Math.max(newCurrent, s.best);
  lsSet(LS_STREAK_CURRENT, String(newCurrent));
  lsSet(LS_STREAK_BEST,    String(newBest));
  lsSet(LS_STREAK_DATE,    today);
  return { current: newCurrent, best: newBest, increased: newCurrent > s.current };
}

function renderStreakChip() {
  const s = getStreak();
  const chip  = document.getElementById('streakChip');
  const count = document.getElementById('streakCount');
  if (!chip || !count) return;
  count.textContent = s.current;
  chip.classList.toggle('zero', s.current === 0);
}
```

### 2c. Call `recordActivity()` in `japanese-quiz.html` at the exact moment `state.screen` is set to `'results'`. After calling it:

```js
const result = recordActivity();
renderStreakChip();
if (result && result.increased) {
  const chip = document.getElementById('streakChip');
  if (chip) {
    chip.classList.add('just-increased');
    setTimeout(() => chip.classList.remove('just-increased'), 600);
  }
}
```

### 2d. Call `renderStreakChip()` on page load in `japanese-quiz.html`.

### 2e. Add streak CSS to `japanese-quiz.html`:

```css
.streak-chip {
  display: flex;
  align-items: center;
  gap: 3px;
  font-family: 'Crimson Pro', Georgia, serif;
  font-size: 15px;
  line-height: 1;
  cursor: default;
  user-select: none;
}
.streak-chip.zero { opacity: 0.35; }
.streak-flame { font-size: 16px; line-height: 1; }
.streak-count { font-size: 15px; font-weight: 400; color: #c8b99a; min-width: 14px; }
body.light .streak-count { color: #8a6040; }
@keyframes streak-pulse {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.4); }
  100% { transform: scale(1); }
}
.streak-chip.just-increased .streak-flame { animation: streak-pulse 500ms ease-out; }
@media (prefers-reduced-motion: reduce) {
  .streak-chip.just-increased .streak-flame { animation: none; }
}
.results-streak {
  font-family: 'Crimson Pro', Georgia, serif;
  font-size: 1rem;
  color: #a89880;
  margin-top: 6px;
  margin-bottom: 24px;
  text-align: center;
}
.results-streak strong { color: #c8b99a; }
body.light .results-streak { color: #8a6040; }
body.light .results-streak strong { color: #6a3010; }
```

### 2f. Add streak chip HTML to the top bar of `japanese-quiz.html` (left of the theme toggle):

```html
<div class="streak-chip" id="streakChip" title="Current streak">
  <span class="streak-flame">🔥</span>
  <span class="streak-count" id="streakCount">0</span>
</div>
```

### 2g. On the results screen in `japanese-quiz.html`, add below the score:

```html
<p class="results-streak">
  🔥 <strong id="resultsStreakCurrent">0</strong> day streak
  &nbsp;·&nbsp; Best: <strong id="resultsStreakBest">0</strong>
</p>
```

After calling `recordActivity()` on results render, populate these:
```js
const s = getStreak();
const el1 = document.getElementById('resultsStreakCurrent');
const el2 = document.getElementById('resultsStreakBest');
if (el1) el1.textContent = s.current;
if (el2) el2.textContent = s.best;
```

### 2h. In `japanese-vocab.html` — read-only streak display only:

Add the same streak CSS, the same streak chip HTML to the top bar, and call `renderStreakChip()` on page load. Do NOT call `recordActivity()` here.

---

## TASK 3 — Show example sentence after correct answer in quiz

In `japanese-quiz.html` only.

### 3a. Add CSS:

```css
.example-reveal {
  opacity: 0;
  transition: opacity 200ms ease;
  padding: 0 4px;
  min-height: 60px;
}
.example-reveal.visible { opacity: 1; }
.example-divider {
  border: none;
  border-top: 1px solid rgba(255,255,255,0.07);
  margin: 14px 0 12px;
}
body.light .example-divider { border-top-color: rgba(0,0,0,0.08); }
.example-jp {
  font-family: 'Noto Serif JP', serif;
  font-size: 1.1rem;
  font-weight: 300;
  color: #e8e2d9;
  line-height: 1.8;
  margin-bottom: 4px;
  text-align: center;
}
.example-en {
  font-family: 'Crimson Pro', Georgia, serif;
  font-style: italic;
  font-size: 0.95rem;
  color: #a89880;
  line-height: 1.5;
  text-align: center;
}
body.light .example-jp { color: #2a1e0a; }
body.light .example-en { color: #8a6040; }
@media (prefers-reduced-motion: reduce) { .example-reveal { transition: none; } }
@media (max-width: 400px) {
  .example-jp { font-size: 1rem; }
  .example-en { font-size: 0.88rem; }
}
```

### 3b. In the quiz card HTML (renderQuiz function), add this element after the question display and before the options:

```html
<div class="example-reveal" id="exampleReveal">
  <hr class="example-divider">
  <p class="example-jp" id="exampleJp"></p>
  <p class="example-en" id="exampleEn"></p>
</div>
```

### 3c. In the answer handler, when the answer is CORRECT and drill type is `kanji-to-reading` or `reading-to-kanji`:

```js
const q = state.questions[state.currentIndex];
const word = q.word;
if (word && word.ex && (state.drillType === 'kanji-to-reading' || state.drillType === 'reading-to-kanji')) {
  const revealEl = document.getElementById('exampleReveal');
  const jpEl     = document.getElementById('exampleJp');
  const enEl     = document.getElementById('exampleEn');
  if (revealEl && jpEl && enEl) {
    jpEl.textContent = word.ex;
    enEl.textContent = word.exm || '';
    revealEl.getBoundingClientRect(); // force reflow
    revealEl.classList.add('visible');
  }
}
```

Do NOT show the example on wrong answers. Do NOT show for the katakana drill.

---

## Final step — commit and push everything

```bash
git add index.html japanese-vocab.html japanese-quiz.html service-worker.js
git commit -m "Fix PWA updates, add streak system, add example sentences after correct answers"
git push origin main
```

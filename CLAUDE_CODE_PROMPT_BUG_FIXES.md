# Claude Code Prompt — Two bug fixes (japanese-quiz.html)

## Files to edit
`japanese-quiz.html` only.

---

## BUG FIX 1 — `[object Object],[object Object]` in example sentences

### Root cause
The prompt assumed `word.ex` was a string, but the actual data model stores examples as an array of objects:
```js
ex: [
  { jp: "週末はみんなで花見に行こう。", en: "Let's all go flower viewing this weekend." },
  { jp: "今年の花見は上野公園にしよう。", en: "Let's do hanami at Ueno Park this year." }
]
```
So `word.ex` is an array, not a string — rendering it directly gives `[object Object],[object Object]`.

### Fix
In the answer handler where the example is revealed, find these lines:
```js
jpEl.textContent = word.ex;
enEl.textContent = word.exm || '';
```

Replace with:
```js
const exArr = Array.isArray(word.ex) ? word.ex : [];
const firstEx = exArr[0];
if (firstEx) {
  jpEl.textContent = firstEx.jp || '';
  enEl.textContent = firstEx.en || '';
} else {
  // fallback: hide the reveal if no example
  revealEl.classList.remove('visible');
}
```

Also update the guard condition above it from:
```js
if (word && word.ex && ...)
```
to:
```js
if (word && Array.isArray(word.ex) && word.ex.length > 0 && ...)
```

---

## BUG FIX 2 — Streak not syncing across devices

### Root cause
Streak is stored in standalone localStorage keys (`jp-streak-current`, etc.) which are device-local. The vocab app already syncs a `jp-vocab-deck` object to GitHub Gist — but the streak isn't included in that object, so it never travels between devices.

### Fix
Store the streak inside `deck.settings.streak` within the existing `jp-vocab-deck` localStorage key. The vocab app's Gist sync already reads and writes the entire deck object including `settings`, so the streak will sync automatically whenever the user syncs their vocab.

#### Replace the three streak helper functions with these updated versions:

```js
// ── Streak helpers (stored inside jp-vocab-deck for Gist sync) ──

function getDeckRaw() {
  try {
    const raw = localStorage.getItem('jp-vocab-deck');
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

function saveDeckRaw(deck) {
  try { localStorage.setItem('jp-vocab-deck', JSON.stringify(deck)); } catch(e) {}
}

function todayStr() {
  return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local time
}

function getStreak() {
  const deck = getDeckRaw();
  const s = (deck && deck.settings && deck.settings.streak) || {};
  return {
    current: parseInt(s.current || '0', 10),
    best:    parseInt(s.best    || '0', 10),
    date:    s.date || null,
  };
}

function recordActivity() {
  const today = todayStr();
  const s = getStreak();

  if (s.date === today) return { current: s.current, best: s.best, increased: false };

  let newCurrent;
  if (!s.date) {
    newCurrent = 1;
  } else {
    const diffDays = Math.round((new Date(today) - new Date(s.date)) / 86400000);
    newCurrent = (diffDays === 1) ? s.current + 1 : 1;
  }
  const newBest = Math.max(newCurrent, s.best);

  // Write streak back into deck.settings.streak so Gist sync picks it up
  const deck = getDeckRaw() || { version: 3, words: [], tombstones: [], settings: {} };
  if (!deck.settings) deck.settings = {};
  deck.settings.streak = { current: newCurrent, best: newBest, date: today };
  saveDeckRaw(deck);

  // Also keep the old standalone keys as a fallback for the vocab app's read-only display
  try {
    localStorage.setItem('jp-streak-current', String(newCurrent));
    localStorage.setItem('jp-streak-best',    String(newBest));
    localStorage.setItem('jp-streak-date',    today);
  } catch(e) {}

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

#### Remove these lines (no longer needed as primary storage):
```js
const LS_STREAK_CURRENT = 'jp-streak-current';
const LS_STREAK_BEST    = 'jp-streak-best';
const LS_STREAK_DATE    = 'jp-streak-date';
```
(Or leave them — they're harmless. The standalone keys are now just a secondary write for the vocab app's read-only display.)

### How cross-device sync now works
1. User completes a quiz on iPhone → streak saved into `jp-vocab-deck.settings.streak` in localStorage
2. User taps Sync in the vocab app → deck (including streak) uploaded to GitHub Gist
3. User opens the app on another device → syncs from Gist → deck downloaded → streak restored
4. `renderStreakChip()` reads from `deck.settings.streak` → correct value shown on both devices

No new infrastructure needed — it rides on the existing Gist sync.

---

## Deploy

```bash
cd "/Users/geoffreyjames/Desktop/Claude Obsidian/1-Projects/Japanese Review"
git add japanese-quiz.html
git commit -m "Fix example sentence array bug and cross-device streak sync via Gist"
git push origin main
```

---

## Checklist
- [ ] Example sentences now show Japanese text (not `[object Object]`)
- [ ] English translation shows correctly below
- [ ] Words with no examples gracefully show nothing
- [ ] `getStreak()` reads from `jp-vocab-deck.settings.streak`
- [ ] `recordActivity()` writes to `jp-vocab-deck.settings.streak`
- [ ] Standalone `jp-streak-*` keys still written as secondary fallback
- [ ] Pushed to GitHub Pages

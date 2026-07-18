# Claude Code Prompt — Streak System (Japanese app)

## Files to edit
- `japanese-quiz.html` — streak is earned here (quiz completion triggers it)
- `japanese-vocab.html` — displays the streak in the top bar (read-only)
- `index.html` (if it exists and is different from `japanese-vocab.html`) — same read-only display

Do NOT touch any other files.

---

## How the streak works

- **Earning a streak day:** completing any quiz round (reaching the results screen) counts as that day's activity. Partial rounds don't count.
- **Streak increments:** if the last activity was yesterday → increment current streak by 1.
- **Already done today:** if the last activity was already today → no change.
- **Missed day(s):** if the last activity was 2+ days ago → reset current streak to 1 (today is day 1 of a new streak).
- **Best streak:** always saved separately. Updates whenever current streak exceeds it. Never resets.
- **Timezone:** use the user's local date (`new Date().toLocaleDateString('en-CA')` which gives `YYYY-MM-DD` in local time). Never UTC.

---

## localStorage keys

```js
const LS_STREAK_CURRENT = 'jp-streak-current';  // integer, default 0
const LS_STREAK_BEST    = 'jp-streak-best';     // integer, default 0
const LS_STREAK_DATE    = 'jp-streak-date';     // string YYYY-MM-DD, last activity date
```

---

## Streak logic — helper functions

Add these functions to `japanese-quiz.html`:

```js
function todayStr() {
  return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local time
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

  if (s.date === today) return; // already recorded today, nothing to do

  let newCurrent;
  if (s.date === null) {
    newCurrent = 1; // first ever activity
  } else {
    const last = new Date(s.date);
    const now  = new Date(today);
    const diffDays = Math.round((now - last) / 86400000);
    newCurrent = (diffDays === 1) ? s.current + 1 : 1;
  }

  const newBest = Math.max(newCurrent, s.best);

  lsSet(LS_STREAK_CURRENT, String(newCurrent));
  lsSet(LS_STREAK_BEST,    String(newBest));
  lsSet(LS_STREAK_DATE,    today);

  return { current: newCurrent, best: newBest, increased: newCurrent > s.current };
}
```

---

## Where to call `recordActivity()`

In `japanese-quiz.html`, inside the answer-handling logic, call `recordActivity()` at the exact moment the app transitions to the **results screen** (i.e. when `state.screen` is set to `'results'`).

After calling it, re-render the top bar so the flame updates immediately.

---

## Visual — flame counter in the top bar

### Design

The flame counter sits in the top bar of both `japanese-quiz.html` and `japanese-vocab.html`. It appears to the **left of the theme toggle**, right-aligned in the bar.

```
┌──────────────────────────────────────────────┐
│  [Flashcards] [Quiz]        🔥 7    ☀        │
└──────────────────────────────────────────────┘
```

### HTML for the streak chip

```html
<div class="streak-chip" id="streakChip" title="Current streak">
  <span class="streak-flame">🔥</span>
  <span class="streak-count" id="streakCount">0</span>
</div>
```

When streak is 0 (never done a quiz), show it greyed out / at opacity 0.4 so it doesn't feel punishing.

### CSS

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
  transition: opacity 200ms;
}

.streak-chip.zero {
  opacity: 0.35;
}

.streak-flame {
  font-size: 16px;
  line-height: 1;
}

.streak-count {
  font-size: 15px;
  font-weight: 400;
  color: #c8b99a;
  min-width: 14px;
}

body.light .streak-count { color: #8a6040; }

/* Pulse animation when streak increases */
@keyframes streak-pulse {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.4); }
  100% { transform: scale(1); }
}

.streak-chip.just-increased .streak-flame {
  animation: streak-pulse 500ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .streak-chip.just-increased .streak-flame {
    animation: none;
  }
}
```

### JS — render streak chip

```js
function renderStreakChip() {
  const s = getStreak();
  const chip  = document.getElementById('streakChip');
  const count = document.getElementById('streakCount');
  if (!chip || !count) return;

  count.textContent = s.current;
  chip.classList.toggle('zero', s.current === 0);
}
```

Call `renderStreakChip()` on page load (inside the existing init block, or `DOMContentLoaded`).

After `recordActivity()` returns, if `result.increased` is true:
```js
const chip = document.getElementById('streakChip');
if (chip) {
  chip.classList.add('just-increased');
  setTimeout(() => chip.classList.remove('just-increased'), 600);
}
renderStreakChip();
```

---

## Results screen — show streak info

On the results screen, below the score, add a small streak line:

```
🔥 7 day streak  ·  Best: 12
```

HTML (inside the results card render, after the score):
```html
<p class="results-streak">
  🔥 <strong id="resultsStreakCurrent">0</strong> day streak
  &nbsp;·&nbsp; Best: <strong id="resultsStreakBest">0</strong>
</p>
```

CSS:
```css
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

After calling `recordActivity()` and rendering the results screen, populate these:
```js
const s = getStreak();
const el1 = document.getElementById('resultsStreakCurrent');
const el2 = document.getElementById('resultsStreakBest');
if (el1) el1.textContent = s.current;
if (el2) el2.textContent = s.best;
```

---

## `japanese-vocab.html` changes (read-only display)

The vocab app cannot earn a streak (no quiz here), but it should display the current streak so the user sees it when browsing.

1. Add the same `streak-chip` HTML to the top bar (same position — left of theme toggle).
2. Add the same CSS block.
3. Add `renderStreakChip()` function (it only reads from localStorage, never writes).
4. Call `renderStreakChip()` on page load.

No `recordActivity()` call in this file — the vocab app is display-only for the streak.

---

## Update service worker cache version

In `service-worker.js`, bump the cache name from `jp-vocab-v1` to `jp-vocab-v2` so the updated files are served fresh:

```js
const CACHE = 'jp-vocab-v2';
```

---

## Deploy

```bash
cd "/Users/geoffreyjames/Desktop/Claude Obsidian/1-Projects/Japanese Review"
git add japanese-quiz.html japanese-vocab.html service-worker.js
git commit -m "Add streak system: daily quiz streak with flame counter in top bar"
git push origin main
```

---

## Checklist
- [ ] `recordActivity()` called exactly once per completed quiz round (on results screen transition)
- [ ] Streak increments correctly: +1 if yesterday, reset to 1 if 2+ days ago, no change if today
- [ ] Best streak never decreases
- [ ] Flame chip visible in top bar of both `japanese-quiz.html` and `japanese-vocab.html`
- [ ] Chip shows greyed-out at opacity 0.35 when streak is 0
- [ ] Flame pulse animation fires when streak increases (respects `prefers-reduced-motion`)
- [ ] Results screen shows current streak + best streak
- [ ] Local timezone used throughout (not UTC)
- [ ] Service worker cache version bumped to `jp-vocab-v2`
- [ ] Pushed to GitHub Pages

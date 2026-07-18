# Claude Code Prompt — Add sync status indicator to japanese-quiz.html

## File to edit
`japanese-quiz.html` only. Mirror all changes to `japanese-vocab.html`.

---

## What to build

The quiz top bar currently has: 🔥 streak chip (left) · mode switcher (centre) · theme toggle (right).

Add a small sync status badge to the **right side of the top bar**, between the theme toggle and the right edge (or just to the left of the theme toggle). It should reflect the result of the `syncStreakFromGist()` call that already runs on page load.

---

## The three states

| State | Trigger | Display |
|---|---|---|
| **Not configured** | No `jp-vocab-gh-token` in localStorage | Hidden — show nothing |
| **Synced** | Pull completed successfully | `✓ Synced` in muted gold, auto-hides after 4 seconds |
| **Sync failed** | Pull threw an error or timed out | `⚠ Sync` in amber, stays visible |

While the pull is in progress (before `syncStreakFromGist()` resolves), show nothing — don't block the UI.

---

## HTML

Find the top bar in `japanese-quiz.html`. It looks something like:
```html
<div class="top-bar">
  <div class="streak-chip" ...>...</div>
  <div class="mode-switcher" ...>...</div>
  <button class="theme-toggle" ...>...</button>
</div>
```

Add this element inside the top bar, immediately before the theme toggle button:
```html
<span class="quiz-sync-badge" id="quizSyncBadge" hidden></span>
```

---

## CSS

Add near the existing streak-chip styles:
```css
.quiz-sync-badge {
  font-family: 'Crimson Pro', Georgia, serif;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  color: #a89880;
  opacity: 0.8;
  white-space: nowrap;
  transition: opacity 600ms;
}
.quiz-sync-badge.synced  { color: #a89880; }
.quiz-sync-badge.failed  { color: #c8964a; }
body.light .quiz-sync-badge.synced { color: #8a6040; }
body.light .quiz-sync-badge.failed { color: #b06020; }
```

---

## JS — update syncStreakFromGist()

`syncStreakFromGist()` already exists in the file. Modify it to update the badge on completion.

Find the function and wrap its resolution in these badge calls:

```js
// At the top of syncStreakFromGist(), grab the badge element:
const badge = document.getElementById('quizSyncBadge');

// On success (after updating deck.settings.streak and calling renderStreakChip):
if (badge) {
  badge.textContent = '✓ Synced';
  badge.className = 'quiz-sync-badge synced';
  badge.hidden = false;
  setTimeout(() => { badge.hidden = true; }, 4000);
}

// On failure / timeout (in the catch block or timeout path):
if (badge) {
  badge.textContent = '⚠ Sync';
  badge.className = 'quiz-sync-badge failed';
  badge.hidden = false;
  // stays visible — user can see sync didn't work
}
```

If there is no Gist token configured (the early-return path at the top of `syncStreakFromGist()`), leave the badge hidden — don't show anything.

---

## Constraints
- Do NOT add push logic — quiz remains read-only against Gist
- Do NOT block quiz load waiting for the badge — sync is background
- Badge must work in both dark and light mode
- Mirror all changes to `japanese-vocab.html`
- Single commit at end

---

## Deploy
```bash
cd "/Users/geoffreyjames/Desktop/Claude Obsidian/1-Projects/Japanese Review"
git add japanese-quiz.html japanese-vocab.html
git commit -m "Add sync status badge to quiz top bar"
git push origin main
```

---

## Checklist
- [ ] Badge hidden when no Gist token is set
- [ ] `✓ Synced` appears briefly (4 sec) after successful Gist pull
- [ ] `⚠ Sync` stays visible after a failed/timed-out pull
- [ ] No spinner or blocking UI during the pull
- [ ] Correct colour in dark and light mode
- [ ] Mirrored to `japanese-vocab.html`
- [ ] Pushed to GitHub Pages

# Claude Code Prompt — Flashcard / Quiz mode switcher

## Files to edit
Both `japanese-vocab.html` (the local copy) AND `japanese-quiz.html`.

The live vocab app is `index.html` on GitHub Pages — but the local editable copy is `japanese-vocab.html`. Edit that file; it will be pushed to replace `index.html` on GitHub.

---

## What to build

A **pill-style tab switcher** in the top bar of both files, letting the user jump between Flashcards and Quiz with one tap. It should look like this:

```
[ Flashcards ]  [ Quiz ]
```

The active tab is filled/highlighted; the inactive tab is ghost/muted. Clicking an inactive tab navigates to the other file.

---

## Design spec

### Pill switcher component CSS

```css
.mode-switcher {
  display: flex;
  gap: 4px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  padding: 3px;
}

.mode-btn {
  font-family: 'Crimson Pro', Georgia, serif;
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 5px 14px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  transition: background 150ms, color 150ms;
  white-space: nowrap;
  min-height: 30px;
}

/* Active (current page) */
.mode-btn.active {
  background: #c8b99a;
  color: #0e0d0b;
}

/* Inactive (other page) */
.mode-btn.inactive {
  background: transparent;
  color: #6b5e45;
}
.mode-btn.inactive:hover {
  color: #a89880;
  background: rgba(255,255,255,0.04);
}

/* Light mode overrides */
body.light .mode-switcher {
  background: rgba(0,0,0,0.04);
  border-color: rgba(0,0,0,0.08);
}
body.light .mode-btn.active {
  background: #8a6040;
  color: #f5efe3;
}
body.light .mode-btn.inactive {
  color: #b09070;
}
body.light .mode-btn.inactive:hover {
  color: #8a6040;
  background: rgba(0,0,0,0.04);
}
```

`prefers-reduced-motion`: remove the `transition` on `.mode-btn`.

---

## Placement

### In `japanese-vocab.html`

Find the top bar / header area (the element containing "VOCABULARY" label, the synced indicator, and card counter). Insert the `.mode-switcher` **centered** in the top bar, or just to the left of the existing right-side controls — wherever it fits visually without crowding the existing buttons.

The switcher HTML for this file (Flashcards is active):
```html
<div class="mode-switcher">
  <span class="mode-btn active">Flashcards</span>
  <a class="mode-btn inactive" href="./japanese-quiz.html">Quiz</a>
</div>
```

Remove any existing standalone "Quiz →" link that was added previously — the switcher replaces it.

### In `japanese-quiz.html`

Find the `.top-bar` element. Insert the `.mode-switcher` centered in the top bar.

The switcher HTML for this file (Quiz is active):
```html
<div class="mode-switcher">
  <a class="mode-btn inactive" href="./japanese-vocab.html">Flashcards</a>
  <span class="mode-btn active">Quiz</span>
</div>
```

Remove any existing "← Back to vocab" link — the switcher replaces it.

---

## Mobile behaviour

On screens < 400px, reduce padding slightly:
```css
@media (max-width: 400px) {
  .mode-btn { padding: 5px 10px; font-size: 11px; }
}
```

The switcher must not cause the top bar to overflow or wrap on iPhone X (375px wide). Keep it compact.

---

## Deploy

After editing both files:
```bash
cd "/Users/geoffreyjames/Desktop/Claude Obsidian/1-Projects/Japanese Review"
git add japanese-vocab.html japanese-quiz.html
git commit -m "Add Flashcards/Quiz mode switcher to top bar"
git push origin main
```

---

## Checklist
- [ ] Switcher appears in top bar of both files
- [ ] Active tab is visually filled; inactive is muted
- [ ] Clicking inactive tab navigates correctly between files
- [ ] Works in dark and light mode
- [ ] No overflow on 375px mobile width
- [ ] Old standalone back/quiz links removed
- [ ] Pushed to GitHub Pages

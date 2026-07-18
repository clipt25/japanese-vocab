# Claude Code Prompt — Fix quiz top bar layout on mobile

## File to edit
`japanese-quiz.html` only.

---

## Problem
The `✓ Synced` / `⚠ Sync` badge text is still overlapping the FLASHCARDS/QUIZ mode switcher on iPhone. The current media query hiding the label text is not working at iPhone widths (~390px).

---

## The fix — simplest possible approach

**Remove the text label from the badge entirely.** On ALL screen sizes, the badge should only show the glyph character — no text:

- Synced state: `✓` only (no "Synced" label)
- Failed state: `⚠` only (no "Sync" label)

This means the badge takes up minimal space and cannot overlap anything.

### Find the JS that sets badge text (inside syncStreakFromGist):
```js
badge.textContent = '✓ Synced';
```
Change to:
```js
badge.textContent = '✓';
```

And:
```js
badge.textContent = '⚠ Sync';
```
Change to:
```js
badge.textContent = '⚠';
```

### Add a tooltip so the meaning is still clear:
When setting the badge, also set `badge.title`:
```js
// synced:
badge.title = 'Synced with Gist';
// failed:
badge.title = 'Sync failed — check your token';
```

### Remove any media query that hides/shows the label span
If there is a separate `<span>` for the label text inside the badge, remove it entirely from the HTML. The badge should be a single `<span>` with just the glyph.

---

## Also check: is renderStreakChip() called AFTER the pull resolves?

In `init()` or wherever `syncStreakFromGist()` is called, verify that `renderStreakChip()` is NOT called before the async pull finishes. The correct order is:

```js
// WRONG — renders stale value before pull:
renderStreakChip();
syncStreakFromGist(); // async, finishes later

// CORRECT — pull first, then render:
await syncStreakFromGist(); // inside syncStreakFromGist(), call renderStreakChip() on success
renderStreakChip(); // this call here should be for the initial render only (stale value is fine as placeholder)
```

`syncStreakFromGist()` should always call `renderStreakChip()` internally after successfully writing the pulled streak to localStorage, so the chip updates. Confirm this is the case.

---

## Deploy
```bash
cd "/Users/geoffreyjames/Desktop/Claude Obsidian/1-Projects/Japanese Review"
git add japanese-quiz.html
git commit -m "Fix quiz top bar: badge glyph-only, no label text to avoid overlap"
git push origin main
```

## Checklist
- [ ] Badge shows `✓` (no text) on successful pull
- [ ] Badge shows `⚠` (no text) on failed pull  
- [ ] No overlap with mode switcher on iPhone (~390px)
- [ ] renderStreakChip() called after pull resolves inside syncStreakFromGist()
- [ ] Pushed to GitHub Pages

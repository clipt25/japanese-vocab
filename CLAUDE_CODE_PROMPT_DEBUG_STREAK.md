# Claude Code Prompt — Debug streak not syncing across devices

## Use plan mode before making any changes.

## The symptom
- Desktop web: streak shows 🔥 2 (correct)
- Mobile Safari iPhone: streak shows 🔥 0
- PWA iPhone: streak shows 🔥 0

All three open the same origin. The vocab app shows ✓ SYNCED on desktop.

## Background

The streak was recently moved from standalone localStorage keys into `jp-vocab-deck.settings.streak` so it would travel with the Gist sync. The fix lives in `japanese-quiz.html`.

The Gist sync lives in `index.html` (the vocab/flashcard app). It syncs the full `jp-vocab-deck` object to a GitHub Gist.

## What to investigate

### Question 1 — Is streak actually being written into the deck object?
In `japanese-quiz.html`, find `recordActivity()`. Verify it:
1. Reads the deck from `localStorage["jp-vocab-deck"]`
2. Writes `deck.settings.streak = { current, best, date }` back
3. Calls `localStorage.setItem("jp-vocab-deck", JSON.stringify(deck))`

Check whether the vocab app's own `saveDeck()` in `index.html` might be **overwriting** `deck.settings` without preserving `streak`. If `saveDeck()` reconstructs `settings: {}` from scratch on every save, it would wipe the streak every time a word is added or the vocab app saves anything.

### Question 2 — Does the Gist sync payload include `settings.streak`?
In `index.html`, find `syncNow()` and the Gist push logic. Check what gets serialised into the Gist file. If it only syncs `words` and `tombstones` but strips `settings`, the streak never leaves the desktop.

### Question 3 — Does the quiz app trigger a sync on load?
The quiz app (`japanese-quiz.html`) reads streak from localStorage but never triggers a Gist pull. So even if desktop pushed streak to Gist, mobile won't get it until the vocab app (`index.html`) is opened and syncs. If the user goes directly to the quiz URL on mobile, they bypass the sync entirely.

### Question 4 — Does the quiz app have access to the Gist token?
Both `index.html` and `japanese-quiz.html` are on the same origin, so they share localStorage. The Gist token (`jp-vocab-gh-token`) and Gist ID (`jp-vocab-gh-gist`) set in the vocab app are available to the quiz app. Verify the quiz app could theoretically call syncNow if we added the logic.

## Expected root causes (in order of likelihood)

1. **`saveDeck()` in `index.html` overwrites `settings` and strips `streak`** — most likely. Every time the vocab app saves (adding a word, editing, syncing), it probably reconstructs the deck object and loses `settings.streak`.

2. **Quiz never triggers Gist pull on load** — the quiz reads stale localStorage. Even if Gist has the correct streak, mobile never pulls it unless the vocab app opens first.

3. **Gist sync doesn't include `settings`** — possible if the sync only serialises `{words, tombstones}`.

## The fix (implement after diagnosing)

### Fix for cause 1 — Preserve `settings.streak` in `saveDeck()`
In `index.html`, find `saveDeck()`. When it constructs the deck object to save, ensure it merges existing `settings` rather than replacing it:
```js
// Before saving, preserve streak from existing deck
const existingDeck = /* read current deck from localStorage */;
deck.settings = Object.assign({}, existingDeck?.settings || {}, deck.settings || {});
```
This ensures `settings.streak` set by the quiz is never wiped when the vocab app saves.

### Fix for cause 2 — Add Gist pull on quiz load
In `japanese-quiz.html`, on page load (after DOM ready), if a Gist token is configured in localStorage, trigger a lightweight pull-only sync before rendering the streak chip. Use the same Gist fetch logic that exists in `index.html` — copy just the pull portion (GET the Gist, parse the deck, merge into localStorage). Do NOT push from the quiz — read only.

After the pull completes (or times out after 3 seconds), call `renderStreakChip()`.

### Fix for cause 3 — Include settings in Gist payload
If the Gist sync strips `settings`, update the serialisation to include the full deck object including `settings`.

## Constraints
- Do not break existing Gist sync behaviour
- Do not push from the quiz app — read-only pull is safe, pushing could cause conflicts
- Mirror all changes to `japanese-vocab.html` local copy
- Single commit at end

## Deploy
```bash
cd "/Users/geoffreyjames/Desktop/Claude Obsidian/1-Projects/Japanese Review"
git add index.html japanese-vocab.html japanese-quiz.html
git commit -m "Fix streak sync: preserve settings.streak in saveDeck + pull on quiz load"
git push origin main
```

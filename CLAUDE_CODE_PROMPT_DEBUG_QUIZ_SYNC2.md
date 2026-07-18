# Claude Code Prompt — Debug quiz sync badge + streak value after pull

## Use plan mode before making any changes.

## Two problems to diagnose and fix

---

## PROBLEM 1 — Top bar layout breaks on mobile

### Symptom
On iPhone, the `✓ Synced` badge overlaps the FLASHCARDS/QUIZ mode switcher in the top bar. The three elements (streak chip · sync badge · mode switcher · theme toggle) don't fit side by side on a narrow screen.

### What to investigate
Read `japanese-quiz.html`. Find the top bar HTML and CSS. Understand how the four elements are laid out (likely flexbox). The badge was inserted as an inline `<span>` which may not respect the flex layout properly on narrow viewports.

### Fix
Make the top bar layout mobile-safe:
- The mode switcher should stay centred
- The streak chip stays on the far left
- The theme toggle stays on the far right
- The sync badge should sit **between the streak chip and the mode switcher**, or alternatively **just to the left of the theme toggle**, without pushing other elements out of position
- On narrow screens (< 400px), if needed, the badge text can be shortened to just `✓` (synced) or `⚠` (failed) — no label text

Suggested approach: use `position: absolute` on the badge so it doesn't affect flex layout, anchored near the left edge (next to streak chip). Or use a separate absolute-positioned element that overlays without displacing anything.

---

## PROBLEM 2 — Sync says ✓ but streak is still 0 on mobile

### Symptom
Mobile quiz shows `✓ Synced` (Gist pull succeeded) but streak chip still shows 🔥0, while desktop shows 🔥2.

### What to investigate

#### Step 1 — Read syncStreakFromGist() in japanese-quiz.html
Trace exactly what happens after a successful Gist pull:
1. Does it correctly parse `deck.settings.streak` from the Gist response?
2. Does it write the pulled streak back into `localStorage["jp-vocab-deck"]`?
3. Does it call `renderStreakChip()` after writing?
4. Could `renderStreakChip()` be called before the async pull finishes?

#### Step 2 — Check what value is actually in the Gist
The quiz is read-only — it pulls from Gist but never pushes. The streak only reaches Gist when the **vocab app** (`index.html`) syncs. If the user ran a quiz on desktop but didn't open the vocab app afterward, the vocab app never pushed the new streak to Gist. So mobile pulls the old (lower) streak value.

Check: is there any mechanism that ensures the vocab app pushes after the quiz updates localStorage? There isn't — this is an architectural gap. The quiz writes to localStorage but the vocab app's auto-sync only runs when the vocab app is open.

#### Step 3 — Check renderStreakChip() timing
In `init()`, is `syncStreakFromGist()` awaited before `renderStreakChip()` is called? If `renderStreakChip()` runs first (with the stale localStorage value), then the pull completes and writes the new value but doesn't re-render, streak stays at 0.

### Fixes

#### Fix A — Ensure renderStreakChip() is called after the pull resolves (not before)
In `init()`, if `renderStreakChip()` is called before `syncStreakFromGist()` resolves, move the render call to inside the success path of `syncStreakFromGist()`. The badge already does this — make sure the streak chip render does too.

#### Fix B — Architectural note (do NOT change sync direction)
The root limitation is: quiz is read-only, so it can't push streak to Gist. The streak only reaches Gist when the vocab app syncs. This is intentional (pushing from quiz risks conflicts). 

However: add a **hint on the results screen** if the streak shown differs from what was just recorded. Something like:
> "Open the vocab app to sync your streak across devices"

Only show this if: `result.increased === true` AND a Gist token is configured. This tells the user what to do without changing the push/pull architecture.

---

## Constraints
- Do not add push logic to the quiz — read-only pull only
- Do not break the existing sync badge behaviour
- Fix must work on both desktop and iPhone (narrow viewport)
- Single commit at end

## Deploy
```bash
cd "/Users/geoffreyjames/Desktop/Claude Obsidian/1-Projects/Japanese Review"
git add japanese-quiz.html
git commit -m "Fix quiz top bar mobile layout and streak render timing after Gist pull"
git push origin main
```

## Checklist
- [ ] Top bar doesn't break on iPhone (streak · badge · switcher · toggle all fit)
- [ ] `✓ Synced` and `⚠ Sync` badge visible but not overlapping other elements
- [ ] `renderStreakChip()` called after pull resolves, not before
- [ ] Results screen shows hint to open vocab app if streak increased and token is set
- [ ] Pushed to GitHub Pages

# Claude Code Prompt — UI Fix: Spacing & Mobile (japanese-quiz.html)

## File to edit
`japanese-quiz.html` (in this folder). Do NOT touch `japanese-vocab.html`.

---

## Problem 1 — Spacing on the drill selection screen is too tight

In the current CSS, `.drill-cards` has `margin-bottom: 28px` and the notice/round-selector sit immediately below. On screen, the gap between the last drill card and the section below it (the "Add at least 4 words…" notice + QUESTIONS selector + START button) feels cramped.

**Fix:** Increase the breathing room between sections on the selection screen:

1. `.drill-cards` → change `margin-bottom` from `28px` to **`40px`**
2. `.drill-notice` → add `margin-bottom: 20px` (currently has `margin-top: 10px` only)
3. `.round-selector` (the QUESTIONS label + buttons row) → ensure `margin-bottom: 32px` before the START button
4. Add a subtle horizontal rule / divider between the drill cards block and the questions/start block. Use a `<hr>` styled as:
   ```css
   .select-divider {
     border: none;
     border-top: 1px solid rgba(255,255,255,0.06);
     margin: 36px 0 28px;
   }
   ```
   Insert this `<hr class="select-divider">` in the rendered HTML between `</div>` (end of drill-cards) and the notice/round-selector section. Edit the `renderSelect()` JS function accordingly.

---

## Problem 2 — Must be fully mobile-friendly for iPhone X (and all modern iPhones)

iPhone X has: 375×812 CSS points, notch at top (safe-area-inset-top ~44px), home indicator at bottom (safe-area-inset-bottom ~34px), no home button. No horizontal scrolling at any point.

### 2a. Global overflow lock
Add to `body`:
```css
overflow-x: hidden;
```
Add to `.main` (the scrollable content area):
```css
overflow-x: hidden;
```

### 2b. Card max-width on narrow screens
The card is currently `max-width: 520px`. On iPhone X (375px wide), the `padding: 0 16px` on `.main` means the card gets `375 - 32 = 343px`. That's fine BUT make sure the card itself has:
```css
width: 100%;
box-sizing: border-box;
```
and that NO child element inside the card uses a fixed pixel width wider than `343px`.

### 2c. Option buttons must not overflow
The A/B/C/D option buttons currently have `padding: 14px 20px`. On narrow screens, if option text is long (e.g., a long English meaning), the button must wrap text and grow in height rather than overflow. Ensure:
```css
.option-btn {
  width: 100%;
  white-space: normal;       /* allow text wrapping */
  word-break: break-word;
  text-align: left;
  min-height: 44px;          /* iOS minimum touch target */
  box-sizing: border-box;
}
```

### 2d. Question display font scaling
The large kanji/katakana display uses `font-size: min(14vw, 5rem)`. On iPhone X at 375px, `14vw = 52.5px` which is fine. Keep this. But ensure there's no `min-width` or `white-space: nowrap` on the question display element that could cause it to overflow horizontally.

### 2e. Top bar safe-area
The sticky top bar must clear the iPhone X notch. Ensure:
```css
.top-bar {
  padding-top: max(12px, env(safe-area-inset-top));
  padding-left: max(16px, env(safe-area-inset-left));
  padding-right: max(16px, env(safe-area-inset-right));
}
```

### 2f. Bottom padding for home indicator
The main content area's bottom padding should account for the home indicator:
```css
.main {
  padding-bottom: max(64px, calc(40px + env(safe-area-inset-bottom)));
}
```

### 2g. Input font size
Any `<input>` or `<select>` element must have `font-size: 16px` minimum to prevent iOS Safari from auto-zooming on focus.

### 2h. Drill selection cards — full width on mobile
The three drill cards should be `width: 100%` and the `.select-screen` container should be:
```css
.select-screen {
  width: 100%;
  max-width: 520px;
  padding: 0;   /* no extra horizontal padding — .main already handles it */
}
```

### 2i. Round-length buttons touch targets
The 5 / 10 / 20 buttons must be at least `44px` tall:
```css
.round-btn {
  min-height: 44px;
  min-width: 56px;
  padding: 10px 16px;
}
```

### 2j. START button
Must be full width and at least `52px` tall:
```css
.start-btn {
  width: 100%;
  min-height: 52px;
}
```

### 2k. @media query for small screens (< 400px)
Add this block at the end of the `<style>` section:
```css
@media (max-width: 400px) {
  .drill-card { padding: 14px 16px; }
  .drill-card h3 { font-size: 1.1rem; }
  .drill-card p  { font-size: 0.9rem; }
  .option-btn    { padding: 12px 14px; font-size: 0.95rem; }
  .question-display { padding: 20px 16px; }
}
```

---

## Checklist before finishing

- [ ] Run the page at 375px viewport width (iPhone X) — zero horizontal scroll
- [ ] All interactive elements are ≥ 44px tall
- [ ] Drill cards, option buttons, START all stretch full width on narrow screen
- [ ] Top bar clears the notch area
- [ ] Bottom content is not hidden behind the home indicator
- [ ] Long option text (e.g., "cherry-blossom viewing, flower viewing") wraps inside button without overflowing
- [ ] The divider between drill cards and questions/start section is visible and adds clear breathing room

# Claude Code Prompt — Show English meaning after katakana answer

## File to edit
`japanese-quiz.html` only. No other files.

---

## What to change

After the user answers a katakana reading question, once the green/red flash fires, display the **English meaning** of the katakana word beneath the question display — so the user knows what the word actually means before auto-advancing.

For example:
- Question shows: **ラグビー**
- User picks: **らぐびー** ✓ (green flash)
- Immediately beneath the large katakana word, fade in: `rugby` (in small italic Crimson Pro, muted gold colour)
- After 800ms, auto-advance as normal

---

## Step 1 — Add English (`e`) field to every entry in `KATAKANA_BANK`

Every object in the `KATAKANA_BANK` array currently has `{ k, h }`. Add an `e` field with the English word/phrase:

```js
{ k: "ラグビー",    h: "らぐびー",    e: "rugby" },
{ k: "レストラン",  h: "れすとらん",  e: "restaurant" },
{ k: "コーヒー",   h: "こーひー",    e: "coffee" },
// etc. for ALL 336 entries
```

Go through every single entry in the bank and add the correct English. Keep it short — one or two words max (the loan-word origin). Do not skip any entry.

---

## Step 2 — Update the question object for katakana drill

In the `buildQuestions()` function (or equivalent), when building katakana questions, include the `e` field through to the question object so it's available at render time:

```js
// question object shape for katakana drill
{
  katakana: { k, h, e },   // ← add e here
  options: [
    { k, h, e, isCorrect: true },
    { k, h, e, isCorrect: false },
    ...
  ]
}
```

---

## Step 3 — Render the English reveal after answer

In the quiz card render / answer-handler logic:

When the user selects an answer on a `katakana-reading` question:
1. Flash correct/wrong as currently implemented
2. **Simultaneously** with the flash, reveal the English meaning beneath the large katakana display

The reveal element should:
- Already exist in the DOM as a hidden `<p class="katakana-english"></p>` beneath the question display
- On answer, set its `textContent` to `state.questions[state.currentIndex].katakana.e`
- Fade it in with a quick CSS transition: `opacity 0 → 1` over `200ms`
- Auto-hide (opacity back to 0) when the next question loads

### CSS for the element:
```css
.katakana-english {
  font-family: 'Crimson Pro', Georgia, serif;
  font-style: italic;
  font-size: 1.1rem;
  color: #a89880;
  text-align: center;
  margin-top: 10px;
  opacity: 0;
  transition: opacity 200ms ease;
  min-height: 1.4em; /* reserve space so layout doesn't jump */
}
.katakana-english.visible {
  opacity: 1;
}
```

Light mode override:
```css
body.light .katakana-english { color: #8a6040; }
```

`prefers-reduced-motion`: skip the opacity transition, just set opacity directly.

### In the answer handler:
```js
// After determining correct/wrong:
if (state.drillType === 'katakana-reading') {
  const el = document.querySelector('.katakana-english');
  if (el) {
    el.textContent = state.questions[state.currentIndex].katakana.e;
    el.classList.add('visible');
  }
}
```

When rendering the next question (inside `render()` or after auto-advance), ensure the element starts hidden:
```js
// reset at start of each question render
const engEl = document.querySelector('.katakana-english');
if (engEl) { engEl.classList.remove('visible'); engEl.textContent = ''; }
```

---

## Checklist
- [ ] Every entry in `KATAKANA_BANK` has an `e` field with a short English word
- [ ] English fades in at the same moment as the answer flash
- [ ] English is hidden at the start of each new question (no bleed from previous)
- [ ] Works in both dark and light mode
- [ ] `prefers-reduced-motion` skips the fade (instant show/hide)
- [ ] No layout shift when the English appears (min-height reserves space)

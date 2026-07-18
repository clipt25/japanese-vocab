# Claude Code Prompt — Show example sentence after correct answer (Japanese quiz)

## File to edit
`japanese-quiz.html` only.

---

## What to add

For the `kanji-to-reading` and `reading-to-kanji` drills, after the user answers **correctly**, reveal one example sentence beneath the question display during the 800ms feedback window before auto-advancing.

The word data already has:
- `ex` — example sentence in Japanese (e.g. `"週末はみんなで花見に行こう。"`)
- `exm` — English translation (e.g. `"Let's all go flower viewing this weekend."`)

Show both — Japanese sentence on top, English below in italic.

---

## UI placement

The example block appears **below the question display** (below the large kanji or the hiragana+meaning), **above the option buttons**. It fades in simultaneously with the green correct flash.

```
┌────────────────────────────────────┐
│  READING → KANJI          1 / 5    │
│  ████████░░░░░░░░░░░░░░░░░░░░░░░   │  ← progress bar
│                                    │
│   かさねていく                       │  ← question display
│   to keep piling up...             │
│                                    │
│  ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌  │  ← subtle divider
│  重ねていくことで強くなる。             │  ← example JP
│  You grow stronger by              │  ← example EN (italic)
│  accumulating experiences.         │
│                                    │
├────────────────────────────────────┤
│  A  届かす                          │
│  B  過ごす                          │
│  C  注ぐ                            │
│  D  重ねていく  ✓                    │  ← green flash
└────────────────────────────────────┘
```

---

## HTML — add example block to quiz card

In the `renderQuiz()` function (or wherever the quiz card HTML is built), add this element **after the question display and before the options**, hidden by default:

```html
<div class="example-reveal" id="exampleReveal">
  <hr class="example-divider">
  <p class="example-jp" id="exampleJp"></p>
  <p class="example-en" id="exampleEn"></p>
</div>
```

---

## CSS

```css
.example-reveal {
  opacity: 0;
  transition: opacity 200ms ease;
  padding: 0 4px;
  min-height: 60px; /* reserve space so options don't jump */
}

.example-reveal.visible {
  opacity: 1;
}

.example-divider {
  border: none;
  border-top: 1px solid rgba(255,255,255,0.07);
  margin: 14px 0 12px;
}

body.light .example-divider {
  border-top-color: rgba(0,0,0,0.08);
}

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

body.light .example-jp  { color: #2a1e0a; }
body.light .example-en  { color: #8a6040; }

@media (prefers-reduced-motion: reduce) {
  .example-reveal { transition: none; }
}

@media (max-width: 400px) {
  .example-jp { font-size: 1rem; }
  .example-en { font-size: 0.88rem; }
}
```

---

## JS — show example on correct answer

In the answer handler, after confirming the answer is **correct** and for drill type `kanji-to-reading` or `reading-to-kanji`:

```js
// Get the correct word from the current question
const q = state.questions[state.currentIndex];
const word = q.word; // { w, r, m, ex, exm, ... }

if (word.ex && (state.drillType === 'kanji-to-reading' || state.drillType === 'reading-to-kanji')) {
  const revealEl = document.getElementById('exampleReveal');
  const jpEl     = document.getElementById('exampleJp');
  const enEl     = document.getElementById('exampleEn');

  if (revealEl && jpEl && enEl) {
    jpEl.textContent = word.ex;
    enEl.textContent = word.exm || '';

    // Force reflow before adding class so transition fires
    revealEl.getBoundingClientRect();
    revealEl.classList.add('visible');
  }
}
```

**Do NOT show the example on wrong answers** — only on correct ones. On wrong answers the user should focus on what the right answer was, not extra content.

**Reset on next question:** when `render()` rebuilds the card for the next question, the element is recreated from scratch so it starts hidden automatically. No manual cleanup needed unless the element persists between renders — in that case, remove the `visible` class and clear the text content at the start of each question render.

---

## Word data note

The word objects in `localStorage["jp-vocab-deck"]` include `ex` and `exm` fields if they were AI-generated. Some older or manually-entered words may have these fields missing or empty — the `if (word.ex)` check above handles this gracefully (no reveal shown if no example exists).

---

## Checklist
- [ ] Example sentence appears only on correct answers (not wrong)
- [ ] Works for both `kanji-to-reading` and `reading-to-kanji` drills
- [ ] Does NOT appear for `katakana-reading` drill (that drill uses the katakana bank which has no example sentences)
- [ ] Japanese sentence and English translation both shown
- [ ] Fades in simultaneously with the green correct flash
- [ ] Hidden at start of each new question (no bleed from previous)
- [ ] `min-height` on container prevents option buttons from jumping when example appears
- [ ] Words with missing `ex` field show nothing gracefully
- [ ] `prefers-reduced-motion` skips the fade
- [ ] Pushed to GitHub Pages

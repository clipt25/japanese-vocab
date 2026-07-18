# Claude Code Prompt — Add Next button after correct answer in japanese-quiz.html

## File to edit
`japanese-quiz.html` only.

---

## What to change

Currently, after the user picks the correct answer the quiz auto-advances to the next question after a short delay. This doesn't give enough time to read the example sentence that appears.

**New behaviour:**
- After a **correct** answer: reveal the example sentence as usual, then show a **"Next →"** button. Do NOT auto-advance. Wait for the user to tap Next.
- After a **wrong** answer: keep the current behaviour (show which answer was correct, then auto-advance after a short delay — no Next button needed).

---

## Implementation

### Step 1 — Find the correct-answer handler
Read the file and locate where `state.screen` transitions from `'quiz'` to the next question, or where the answer feedback is shown. There will be a `setTimeout` that auto-advances after a correct answer. 

Remove (or disable) that `setTimeout` for correct answers only.

### Step 2 — Add Next button HTML
In the quiz screen HTML, after the example sentence reveal block (the element that shows the JP sentence + EN translation), add:

```html
<button class="btn-next" id="btnNext" hidden>Next →</button>
```

Place it directly below the example sentence reveal div.

### Step 3 — CSS
Add near the answer option styles:

```css
.btn-next {
  font-family: 'Crimson Pro', Georgia, serif;
  font-size: 1rem;
  letter-spacing: 0.08em;
  padding: 12px 0;
  margin-top: 20px;
  width: 100%;
  max-width: 420px;
  background: transparent;
  border: 1px solid rgba(200,185,154,0.35);
  border-radius: 8px;
  color: #c8b99a;
  cursor: pointer;
  display: block;
  transition: border-color 150ms, color 150ms;
}
.btn-next:hover  { border-color: #c8b99a; color: #e8d9ba; }
body.light .btn-next { border-color: rgba(100,70,40,0.3); color: #8a6040; }
body.light .btn-next:hover { border-color: #8a6040; color: #5a3010; }
```

### Step 4 — Show/hide logic

When the user answers **correctly**:
1. Show the example sentence reveal (existing behaviour)
2. Set `document.getElementById('btnNext').hidden = false`
3. Do NOT start the auto-advance timer

When the user answers **wrongly**:
1. Keep existing behaviour (show correct answer highlight)
2. Keep `btnNext` hidden
3. Auto-advance after existing delay

### Step 5 — Next button click handler
The button should call whatever function currently advances to the next question (likely something like `nextQuestion()` or advancing `state.questionIndex`). After clicking:
1. Hide the button again: `btnNext.hidden = true`
2. Clear/hide the example sentence reveal
3. Advance to the next question

Wire this up as:
```js
document.getElementById('btnNext').addEventListener('click', () => {
  document.getElementById('btnNext').hidden = true;
  // call the existing advance-to-next-question logic here
});
```

---

## Constraints
- Wrong answers still auto-advance (no Next button for wrong)
- Next button must be hidden at quiz start and between questions
- Must work on iPhone (full width, easy to tap)
- Do not break existing streak or results screen logic

---

## Deploy
```bash
cd "/Users/geoffreyjames/Desktop/Claude Obsidian/1-Projects/Japanese Review"
git add japanese-quiz.html
git commit -m "Add Next button after correct answer so user can read example sentence"
git push origin main
```

## Checklist
- [ ] Correct answer → example sentence shown → Next button appears → tap to advance
- [ ] Wrong answer → auto-advances as before (no Next button)
- [ ] Next button hidden at quiz start and reset between questions
- [ ] Mobile friendly (full width, easy tap target)
- [ ] Pushed to GitHub Pages

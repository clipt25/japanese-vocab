# Claude Code Prompt — Fix furigana rendering in quiz example sentences

## Files to read, one file to edit
- Read `japanese-vocab.html` to find the furigana rendering function
- Edit `japanese-quiz.html` only

---

## The problem

In `japanese-quiz.html`, the example sentence is displayed using the raw storage format:
```
あの[人|ひと]の[声|こえ]って、すごくやわらかな[感じ|かんじ]がするよね。
```

This `[kanji|reading]` bracket notation should be converted to proper HTML `<ruby>` tags so furigana appears *above* the kanji, exactly like on the flashcard/vocab side.

---

## Step 1 — Find the furigana renderer in japanese-vocab.html

Read `japanese-vocab.html` and find the function that converts `[kanji|reading]` bracket notation into `<ruby>kanji<rt>reading</rt></ruby>` HTML. It will look something like:

```js
function renderFurigana(text) {
  // converts [漢字|よみ] → <ruby>漢字<rt>よみ</rt></ruby>
}
```

Note the exact function name and implementation.

---

## Step 2 — Add the function to japanese-quiz.html

Copy that function verbatim into `japanese-quiz.html`, near the top of the `<script>` block (with the other helper functions).

---

## Step 3 — Use it when rendering the example sentence

In `japanese-quiz.html`, find where the example sentence is rendered after a correct answer. It currently sets `textContent` (which outputs raw text) on the JP sentence element. It looks something like:

```js
jpEl.textContent = firstEx.jp || '';
```

Change it to use `innerHTML` with the furigana renderer:

```js
jpEl.innerHTML = renderFurigana(firstEx.jp || '');
```

Make sure `jpEl` uses `innerHTML` not `textContent` for this line only. The English translation line (`enEl.textContent = firstEx.en`) stays as `textContent` — no change needed there.

---

## Step 4 — Add ruby CSS to japanese-quiz.html

Check if `japanese-quiz.html` already has `ruby` / `rt` CSS. If not, add this near the font/typography styles:

```css
ruby {
  ruby-align: center;
}
rt {
  font-size: 0.55em;
  font-family: 'Noto Serif JP', serif;
  color: #a89880;
  letter-spacing: 0.02em;
}
body.light rt { color: #8a6040; }
```

Match whatever values are used in `japanese-vocab.html` for visual consistency.

---

## Constraints
- Only change the example sentence JP line — do not touch the EN translation line
- Do not change how any other text in the quiz is rendered
- Must match the visual style of the vocab/flashcard side exactly

---

## Deploy
```bash
cd "/Users/geoffreyjames/Desktop/Claude Obsidian/1-Projects/Japanese Review"
git add japanese-quiz.html
git commit -m "Fix quiz example sentence furigana: render ruby tags instead of [kanji|reading] brackets"
git push origin main
```

## Checklist
- [ ] Example sentence shows furigana above kanji (ruby tags), not bracket notation
- [ ] Furigana style matches the vocab/flashcard app visually
- [ ] English translation unaffected
- [ ] Works in dark and light mode
- [ ] Pushed to GitHub Pages

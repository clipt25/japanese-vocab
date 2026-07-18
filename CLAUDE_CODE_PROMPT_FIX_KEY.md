# Claude Code Prompt — Fix localStorage key mismatch

## File to edit
`japanese-quiz.html` only.

## The bug
The quiz reads vocab data from the wrong localStorage key.

In `japanese-quiz.html`, find this line:
```js
const LS_VOCAB = 'jp-vocab-data';
```
Change it to:
```js
const LS_VOCAB = 'jp-vocab-deck';
```

That's the only code change needed.

## Then deploy
After making the fix, commit and push to GitHub Pages:
```bash
cd "/Users/geoffreyjames/Desktop/Claude Obsidian/1-Projects/Japanese Review"
git add japanese-quiz.html
git commit -m "Fix localStorage key: jp-vocab-data → jp-vocab-deck"
git push origin main
```

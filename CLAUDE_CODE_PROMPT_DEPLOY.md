# Claude Code Prompt — Deploy quiz to GitHub Pages

## Context

The user has a live Japanese vocab app at:
`https://clipt25.github.io/japanese-vocab/`

The source is the GitHub repo: `clipt25/japanese-vocab`

The vocab app stores its word deck in `localStorage["jp-vocab-data"]`.

The quiz file (`japanese-quiz.html`) already reads from `localStorage["jp-vocab-data"]` — so once both files are on the same GitHub Pages origin, they will share data automatically. No code change needed for that.

---

## Tasks

### 1. Fix internal links to be relative

In `japanese-quiz.html`, find the "← Back to vocab" link. It currently points to `japanese-vocab.html`. Change it to a **relative path** that works on GitHub Pages:

```html
<a href="./japanese-vocab.html">← Back to vocab</a>
```

(It may already be relative — if so, confirm and leave it.)

### 2. Add "Quiz →" link to `japanese-vocab.html`

Open `japanese-vocab.html` and add a small "Quiz →" link in the top bar (wherever a "Quiz →" link was added previously — search for it). Update its `href` to:

```html
<a href="./japanese-quiz.html">Quiz →</a>
```

(Again, may already be correct — verify and adjust if needed.)

### 3. Push both files to the GitHub repo

The repo is `clipt25/japanese-vocab`. Run the following git commands from inside the `Japanese Review` folder:

```bash
# Check if this folder is already a git repo linked to the right remote
git remote -v

# If it IS the right repo:
git add japanese-quiz.html japanese-vocab.html
git commit -m "Add japanese-quiz.html — vocab quiz with 3 drill types"
git push origin main
```

If `git remote -v` shows no remote or a different repo, then instead:

```bash
git remote add origin https://github.com/clipt25/japanese-vocab.git
git add japanese-quiz.html japanese-vocab.html
git commit -m "Add japanese-quiz.html — vocab quiz with 3 drill types"
git push origin main
```

If there are any merge conflicts with the remote (because the live site may have diverged), do:
```bash
git pull origin main --rebase
git push origin main
```

### 4. Confirm deployment URL

After pushing, GitHub Pages will serve the quiz at:
`https://clipt25.github.io/japanese-vocab/japanese-quiz.html`

Report this URL to the user when done.

---

## What NOT to do

- Do not change any quiz logic, styling, or the katakana bank
- Do not create any new files other than what already exists
- Do not change the localStorage key names — they must stay as-is to share data with the live vocab app

# Claude Code Prompt — "Copy setup link" for cross-device Gist sync

## Files to edit
`index.html` and mirror to `japanese-vocab.html`.

---

## What to build

In the Settings modal, after the Gist ID input field, add a **"Copy setup link"** button. When tapped, it copies a URL to the clipboard that encodes the Gist ID as a query parameter:

```
https://clipt25.github.io/japanese-vocab/?gist=GIST_ID_HERE
```

Opening that URL in any browser context (Chrome, Safari, PWA on another device) automatically pre-fills the Gist ID field in Settings and opens the Settings modal, so the user only needs to enter their GitHub token — the Gist ID is already there.

---

## Part 1 — "Copy setup link" button in Settings modal

### Find the Gist ID input field in the Settings modal HTML
It looks something like:
```html
<input ... id="inputGistId" placeholder="Gist ID ...">
```

### Add this button immediately after it:
```html
<button class="btn-copy-setup" id="btnCopySetup" onclick="copySetupLink()" title="Copy a link to share your Gist ID to another device">
  ⎘ Copy setup link
</button>
<p class="setup-link-hint" id="setupLinkHint" hidden>Copied! Open this link on any device/browser to pre-fill your Gist ID.</p>
```

### CSS (add near the settings modal styles):
```css
.btn-copy-setup {
  font-family: 'Crimson Pro', Georgia, serif;
  font-size: 0.85rem;
  letter-spacing: 0.05em;
  padding: 5px 12px;
  margin-top: 6px;
  background: transparent;
  border: 1px solid rgba(200,185,154,0.3);
  border-radius: 5px;
  color: #a89880;
  cursor: pointer;
  width: 100%;
  transition: border-color 150ms, color 150ms;
}
.btn-copy-setup:hover { border-color: #c8b99a; color: #c8b99a; }
.btn-copy-setup:disabled { opacity: 0.35; cursor: default; }

.setup-link-hint {
  font-family: 'Crimson Pro', Georgia, serif;
  font-style: italic;
  font-size: 0.82rem;
  color: #a89880;
  margin-top: 4px;
  text-align: center;
}

body.light .btn-copy-setup { border-color: rgba(100,70,40,0.25); color: #8a6040; }
body.light .btn-copy-setup:hover { border-color: #8a6040; color: #5a3010; }
body.light .setup-link-hint { color: #8a6040; }
```

### JS function:
```js
function copySetupLink() {
  const gistId = (document.getElementById('inputGistId') || {}).value
                || lsGet('jp-vocab-gh-gist')
                || '';

  if (!gistId.trim()) {
    alert('Save a Gist ID first before copying the setup link.');
    return;
  }

  const url = `https://clipt25.github.io/japanese-vocab/?gist=${encodeURIComponent(gistId.trim())}`;

  navigator.clipboard.writeText(url).then(() => {
    const hint = document.getElementById('setupLinkHint');
    if (hint) {
      hint.hidden = false;
      setTimeout(() => { hint.hidden = true; }, 3000);
    }
  }).catch(() => {
    // Fallback: prompt so user can manually copy
    prompt('Copy this link and open it on any device:', url);
  });
}
```

---

## Part 2 — Auto-fill Gist ID from URL on page load

On page load, check if the URL contains a `?gist=` parameter. If it does:
1. Store the Gist ID in localStorage (`jp-vocab-gh-gist`)
2. Open the Settings modal automatically so the user just needs to add their token
3. Clean the URL (remove the query param) so it doesn't linger

Add this to the init block (runs on `DOMContentLoaded`, before the existing sync logic):

```js
// Auto-fill Gist ID from setup link
(function() {
  const params = new URLSearchParams(window.location.search);
  const gistParam = params.get('gist');
  if (gistParam && gistParam.trim()) {
    lsSet('jp-vocab-gh-gist', gistParam.trim());
    // Clean URL without reload
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, '', cleanUrl);
    // Open settings modal so user can add their token
    // Delay slightly so the DOM is fully ready
    setTimeout(() => {
      openSettings();
      // Pre-fill the Gist ID input in the modal
      const inputGist = document.getElementById('inputGistId');
      if (inputGist) inputGist.value = gistParam.trim();
      // Show a hint in the modal
      const hint = document.getElementById('setupLinkHint');
      if (hint) {
        hint.textContent = 'Gist ID pre-filled! Just enter your GitHub token and save.';
        hint.hidden = false;
      }
    }, 300);
  }
})();
```

---

## End result — how it works for the user

**On the device that already has sync set up (e.g. Safari iPhone):**
1. Open Settings → tap "⎘ Copy setup link"
2. Share/paste that link to themselves (Notes app, iMessage to self, etc.)

**On any new context (Chrome laptop, PWA, Safari laptop):**
1. Open the link
2. Settings modal opens automatically with Gist ID already filled
3. Paste their GitHub token → Save
4. Done — full sync active in that context

Setup goes from "find your Gist ID, open settings, paste it" → "open a link, paste your token".

---

## Deploy
```bash
cd "/Users/geoffreyjames/Desktop/Claude Obsidian/1-Projects/Japanese Review"
git add index.html japanese-vocab.html
git commit -m "Add Copy Setup Link button for easy cross-device Gist sync onboarding"
git push origin main
```

---

## Checklist
- [ ] "⎘ Copy setup link" button visible in Settings modal below Gist ID field
- [ ] Button disabled/shows alert if no Gist ID is set yet
- [ ] Copies `https://clipt25.github.io/japanese-vocab/?gist=ID` to clipboard
- [ ] Falls back to `prompt()` if clipboard API unavailable
- [ ] Opening the link pre-fills Gist ID and auto-opens Settings modal
- [ ] URL is cleaned after reading the param (no ?gist= left in address bar)
- [ ] Hint text confirms copy, auto-hides after 3 seconds
- [ ] Works in dark and light mode
- [ ] Mirrored to `japanese-vocab.html`
- [ ] Pushed to GitHub Pages

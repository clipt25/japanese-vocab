# Claude Code Prompt — Debug & Fix PWA/Safari data sync

## Your mission
Diagnose and fix why the Japanese vocab app shows different word lists depending on whether it's opened from the iOS home screen PWA vs Safari browser. Then implement the best permanent fix. Do not ask for guidance — investigate, form a conclusion, and implement.

Use plan mode before making any changes.

---

## The symptom
- Opening from **Safari** on iPhone → shows the full word list (~12+ words)
- Opening from **home screen PWA icon** → shows only ~3 words (appears to be seed data)

Both open the same URL: `https://clipt25.github.io/japanese-vocab/`

---

## Background knowledge to guide your investigation

### Hypothesis 1 — iOS PWA isolated storage (most likely root cause)
On iOS, a PWA installed to the home screen runs in a **completely separate browser context** from Safari. They do NOT share localStorage, cookies, IndexedDB, or service workers — even for the exact same domain. This is an Apple platform decision.

This means:
- Safari's localStorage has all the user's words
- The PWA's localStorage is a separate, empty (or seed-only) instance
- No amount of service worker patching fixes this — it's a storage isolation issue, not a caching issue

Verify this hypothesis by reading the source code and understanding how vocabulary is stored and retrieved.

### Hypothesis 2 — Service worker serving stale cached HTML
Our service worker was recently changed from Cache-First to Network-First for HTML. It's possible the PWA is still running the old cached version of the HTML before that fix was applied.

### Hypothesis 3 — Gist sync not set up in PWA context
The app has a GitHub Gist sync feature. If it's configured in Safari but not in the PWA context (since they have separate localStorage), the PWA would never pull the user's words down.

---

## Investigation steps

### Step 1 — Read the source files
Read `index.html` (the live vocab app source — same as `japanese-vocab.html`). Specifically find and understand:
- How vocabulary data is stored (which localStorage key, what schema)
- The Gist sync implementation: how it works, when it triggers, what it syncs
- The service worker registration code
- Whether any auto-sync on page load exists

### Step 2 — Read `service-worker.js`
Confirm it's the v3 Network-First version we deployed. If it's still v1/v2 Cache-First, that's a separate problem.

### Step 3 — Form a diagnosis
Based on your reading, determine:
1. Is this iOS isolated storage? (PWA and Safari have separate localStorage by design)
2. Is this a stale service worker cache issue?
3. Is this a Gist sync configuration issue?
4. Is it a combination?

Write out your diagnosis clearly before implementing anything.

### Step 4 — Implement the fix

Based on your diagnosis, implement the appropriate solution. Guidance on likely fixes:

#### If isolated storage is the root cause (expected):
The only reliable cross-context sync mechanism already built into the app is **GitHub Gist sync**. The fix is to make it work automatically and frictionlessly:

**4a. Auto-sync on page load** — if a Gist token is already configured in localStorage, automatically trigger a sync when the page loads (with a short debounce, e.g. only if last sync was >5 minutes ago). This means every time the user opens either the PWA or Safari, it silently syncs with Gist in the background, keeping both contexts in sync.

**4b. Visible sync status in the UI** — add a small sync indicator in the top bar (near the streak chip) that shows:
- `↕ Sync` button if token is configured but not recently synced
- `✓ Synced` (muted) if recently synced (within last 5 min)
- `⚠ Sync` (amber) if sync failed or hasn't happened in >24h
This should be visible in both `index.html` and work correctly.

**4c. First-time setup prompt** — if no Gist token is configured, show a non-intrusive one-line banner below the add-word input: `"Tip: set up Gist sync in Settings to keep your words in sync across devices."` Only show it once (persist dismissal in localStorage).

#### If service worker is the root cause:
Confirm the current `service-worker.js` is the v3 Network-First version. If not, apply the correct version from the repo history.

#### If both:
Fix both.

---

## Constraints
- Do not break any existing functionality
- The Gist sync logic already exists — extend it, don't rewrite it
- Auto-sync must be silent (no spinner blocking the UI) — it can update the sync indicator when done
- The fix must work for both the PWA context and the Safari context
- Only edit `index.html` (which is the live file) and `service-worker.js` if needed. Also sync changes to `japanese-vocab.html` local copy.
- Single commit at the end

---

## Deliverable
After implementing, report:
1. Your confirmed root cause diagnosis
2. Exactly what you changed and why
3. How the user should test it (step by step on iPhone)
4. Any limitations of the fix

Then commit and push.

# Visual Design Spec

Matches the Mandarin Review aesthetic exactly, with minimal Japanese-specific adaptations. Single HTML file, inline CSS, no external CSS framework (parity with the reference project).

---

## 1. Typography (unchanged)

| Use | Font |
|---|---|
| Japanese (kanji, kana) | **Noto Serif JP**, weights 300/400/600 |
| Latin (English, labels, buttons) | **Crimson Pro**, weights 300/400, ital 300 |

Loaded from Google Fonts via `<link>` preconnect — identical to Mandarin Review.

---

## 2. Colour palette (dark mode — default)

| Role | Hex |
|---|---|
| Page background | `#0e0d0b` |
| Card surface | `rgba(255,255,255,0.02)` over page |
| Primary text | `#e8e2d9` |
| Headword (word) | `#f0ebe0` |
| Reading / accent (was pinyin gold) | `#a89880` |
| Muted label | `#6b5e45` |
| Divider | `rgba(255,255,255,0.05)` |
| Filled button | `#c8b99a` on `#0e0d0b` |
| Ghost button border | `rgba(200,185,154,0.25)` |

## 3. Colour palette (light mode)

| Role | Hex |
|---|---|
| Page background | `#f5efe3` |
| Card | `rgba(0,0,0,0.02)` on page |
| Text | `#2a1e0a` |
| Headword | `#1a0e00` |
| Reading accent | `#8a6040` |
| Filled button | `#8a6040` on `#f5efe3` |

Dark by default. Toggle persists in `localStorage["jp-vocab-mode"]`.

---

## 4. Layout

Three-pane flex layout (identical skeleton to Mandarin Review):

```
┌──────────┬──────────┬─────────────────────────────┐
│          │          │  [ Vocabulary ]    [☀] [1/3]│
│ SIDEBAR  │  WORD    │                             │
│          │  LIST    │  ┌───────────────────────┐  │
│ + add    │          │  │ JP DECK · 3 words     │  │
│ word ▢   │ 花見     │  │                       │  │
│ ──────── │ 発音 ○   │  │  花見                 │  │
│ ⚙ API    │ 緊張する │  │                       │  │
│ ▼ export │ とにかく │  │  [show reading]       │  │
│ ▲ import │          │  │  [show details]       │  │
│          │          │  │                       │  │
│          │          │  │  ─── furigana ruby    │  │
│          │          │  │  ─── meaning          │  │
│          │          │  │  ─── example(s)       │  │
│          │          │  └───────────────────────┘  │
│          │          │     [← prev]  1/3  [next →] │
└──────────┴──────────┴─────────────────────────────┘
```

**Sidebar (220px):** title block, **"+ add new word"** input, settings gear, export/import. Since v1 has no chapters, the sidebar is simpler than Mandarin Review's — or we skip it entirely and put controls in the word panel header. Proposal: **keep a slim sidebar** for the add/input and settings (consistent visual rhythm with Mandarin Review).

**Word panel (185px):** list of all words, newest-first. Click to jump. Shows word + reading.

**Main:** card with reveal buttons + examples, prev/next below.

**Mobile:** see full mobile spec in §11 below — panels collapse into drawers, card stretches full-width, nav is thumb-reachable.

---

## 5. Card composition

The existing Mandarin Review card with minimal changes:

1. **Deck badge** (small uppercase chip) — top-left of card. v1 shows `Japanese Review` or the source field if set.
2. **Word** (`.word`) — 6rem at max container width, Noto Serif JP 300, colour `#f0ebe0`.
3. **Button row:** `show reading` · `show details` · (edit) · (delete).
   *Removed:* `Japanese` cross-reference button.
4. **Reading reveal** — the full hiragana reading `はなみ` + a `▶` speaker button (ja-JP TTS).
5. **Details reveal** — pos label, English meaning, Japanese definition (`mj`), examples.
6. **Example blocks** — each with furigana ruby on the target word, English below in italic, per-sentence ▶ speak button.

---

## 6. Furigana (ruby) styling

Match the Mandarin pinyin-above-hanzi style:

```css
ruby rt {
  font-size: 0.6em;
  color: #7a6f5e;
  font-family: 'Crimson Pro', Georgia, serif;
  font-style: normal;
  letter-spacing: 0.02em;
}
```

Inside example sentences, the target word is highlighted (`.ex-word` — bold + brighter colour) as in Mandarin Review.

---

## 7. Speech synthesis

`window.speechSynthesis` with:

- `utter.lang = 'ja-JP'`
- `utter.rate = 0.85`
- `utter.pitch = 0.9`
- Voice priority (borrowed from the Mandarin Review's existing `speakJapanese` function):
  1. Otoya (male, macOS)
  2. Ichiro
  3. Kyoko (female, macOS)
  4. Haruka (female, Windows)
  5. Any `ja-JP` / `ja` voice
  6. Any voice whose lang starts with `ja`

Same `speaking` pulse animation on the button while utterance plays.

---

## 8. Keyboard shortcuts

| Key | Action |
|---|---|
| `←` / `↑` | prev card |
| `→` / `↓` | next card |
| `R` | toggle reading |
| `D` or `Space` | toggle details |
| `/` | focus the "+ add new word" input |
| `Esc` | close any open modal |

---

## 9. Loading / empty states

- **Empty deck:** "No words yet. Type one above to get started." (centered in main pane, muted colour)
- **Generating:** greyed-out card with animated text `Generating flashcard for 花見…` + spinner dot.
- **Import preview:** modal showing "Will add X new, update Y existing. [Confirm] [Cancel]"

---

## 10. File structure

Single deliverable: **`japanese-vocab.html`** in the `Japanese Review` folder, ~1500 lines estimated (vs. Mandarin Review's 2076 lines — smaller because we drop the chapter data and glossary dictionary).

---

## 11. Mobile spec (full iPhone / Android support)

The Mandarin Review file has only token mobile handling (it hides panels below certain widths). Since Japanese Review will be used often on phone, mobile is a **first-class layout**, not a fallback.

### 11.1 Breakpoints

| Breakpoint | Layout |
|---|---|
| `≥ 1024px` | Desktop: three panes as described in §4 |
| `700–1023px` | Tablet: sidebar collapses to an icon rail (56px wide); word panel visible |
| `< 700px` | **Phone: single-column, full-width card, drawers + bottom bar** |

### 11.2 Phone layout (< 700px)

```
┌──────────────────────────────┐
│ ☰  Japanese Review   ☀  ⚙   │  ← sticky top bar (48px)
├──────────────────────────────┤
│                              │
│                              │
│          花  見              │  ← word, min(14vw, 4.5rem)
│                              │
│   [show reading]             │  ← 44px tall buttons
│   [show details]             │
│                              │
│   ─── reveal content ───     │
│                              │
│                              │
├──────────────────────────────┤
│  ←      1 / 3        →       │  ← bottom nav, safe-area aware
└──────────────────────────────┘
```

Key phone-specific components:

1. **Sticky top bar** — 48px tall, contains:
   - `☰` hamburger → opens left drawer (word list + add-word input + settings/export/import)
   - App title in center
   - `☀`/`🌙` theme toggle + `⚙` settings (right)

2. **Full-width card** — `padding: 20px 18px`, card fills viewport width minus 12px gutter on each side. No visible card border on phone (merges with page).

3. **Word display** — `font-size: min(14vw, 4.5rem)` so long words (e.g., 緊張する) never overflow on narrow screens. `line-height: 1.15`, `word-break: keep-all` so kanji never breaks mid-character.

4. **Reveal buttons** — 44px tall (iOS HIG minimum touch target), full-width, stacked vertically on narrow screens. Gap 10px. Ghost style unchanged.

5. **Sticky bottom nav** — `position: fixed; bottom: 0`, 56px tall + `env(safe-area-inset-bottom)`. Contains ← prev, progress `1/3`, next →. Thumb-reachable.

6. **Word-list drawer** — slides in from left when ☰ tapped. `85vw max 360px` wide. Contains: add-word input at top, list of words below. Tap a word → jumps card, drawer auto-closes. Backdrop click dismisses.

### 11.3 Touch targets (all breakpoints)

Every interactive element: **minimum 44×44px** (iOS) / 48×48px recommended (Android Material).

Includes: reveal buttons, speaker buttons (currently 36×36 in Mandarin Review → bump to 44×44 on phone), prev/next, word-list items, theme/settings toggles.

### 11.4 Typography on mobile

| Element | Phone size | Desktop size (unchanged) |
|---|---|---|
| Word (headword) | `min(14vw, 4.5rem)` | `min(12cqi, 6rem)` |
| Reading (furigana-accent) | `1.35rem` | `1.6rem` |
| Part-of-speech label | `11px` | `11px` |
| Meaning | `1.1rem` line-height 1.55 | `1.25rem` |
| Example JP sentence | `1.35rem` line-height 2.3 | `1.6rem` line-height 3 |
| Example EN translation | `1rem` | `1.15rem` |
| Ruby (furigana) | `0.58em` of parent | `0.6em` |

**Why larger-than-necessary JP text on phone:** Japanese characters (especially kanji with fine strokes) become hard to read under 1.3rem on mobile. Better to err generous and allow reveal sections to scroll.

### 11.5 Gestures

- **Swipe left** on card → next word
- **Swipe right** on card → previous word
- **Tap-and-hold** on the word → speaks it (alternative to finding the speaker button)
- **Swipe down** from top of card → closes any open reveal section

Gestures don't replace the buttons — both work. Swipe threshold: 60px horizontal, <45° angle.

### 11.6 iOS / Android viewport concerns

- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` (cover enables notch-aware safe-area-inset-*).
- `-webkit-text-size-adjust: 100%` on `html` — prevents Mobile Safari from inflating font sizes in landscape.
- `overscroll-behavior-y: contain` on the card scroll area — stops the whole page from bouncing when scrolling inside a reveal section.
- `user-select: none` on buttons/nav; `user-select: text` on card content so you can copy a word to dictionaries like Jisho.
- `input[type=text]` uses `font-size: 16px` (prevents iOS auto-zoom on focus).
- **No hover-dependent UX** — every hover state also triggers on `:focus-visible` / `:active`.

### 11.6.1 iPhone 16 Pro specifics (your device)

Target device: iPhone 16 Pro, 6.3" display, 402×874 CSS points portrait, Dynamic Island, home indicator, 120 Hz ProMotion, P3 wide-color gamut, Safari 18+.

- **Dynamic Island (portrait):** the Island sits at the top of the screen (59pt tall). Using `viewport-fit=cover` + `padding-top: env(safe-area-inset-top)` on the sticky top bar avoids content hiding behind it. The sticky bar's background extends under the Island so status-bar text stays legible.
- **Dynamic Island (landscape):** the Island shifts to the left edge and becomes a vertical strip. The left sidebar / drawer handle must respect `env(safe-area-inset-left)` or they'll sit under it. We'll add that padding in CSS.
- **Home indicator:** the bottom nav uses `padding-bottom: max(12px, env(safe-area-inset-bottom))`. iPhone 16 Pro's home indicator is 34pt — this clears it.
- **Dynamic viewport units:** the app uses `100dvh` (not `100vh`) for full-height panels — crucial because Mobile Safari's URL bar collapses as you scroll, and `vh` is based on the max-expanded viewport which causes content to sit behind the URL bar on initial load. `dvh` tracks the current visible viewport.
- **ProMotion 120 Hz:** reveal-section transitions use CSS `transition` (GPU-accelerated `transform`/`opacity`) rather than height-based JS animation, so they render at the display's native refresh rate. No 300ms tap delay in Safari 18 regardless.
- **P3 wide color:** the accent gold (`#c8b99a`) and darker palette fall inside sRGB and will look identical on iPhone 16 Pro as on any other screen — no need to duplicate palettes. If we later add a richer accent (e.g., deep cinnabar/lacquer red), we'd use `color(display-p3 ...)` with an sRGB fallback so the color pops on your device without breaking elsewhere.
- **HDR / True Tone / Night Shift:** all work fine with our neutral warm-tan palette — no action needed, just worth knowing the light-mode cream `#f5efe3` was chosen partly so it doesn't clash with Night Shift's warm tint at night.
- **Haptics:** iOS Safari doesn't expose the Taptic Engine to web apps directly. We skip haptics — no workarounds needed.
- **Swipe-to-go-back conflict:** Safari uses a left-edge swipe for back-navigation. Our card-swipe gesture ignores the leftmost 20px, so back-swipes still work when this is a bookmarked page.
- **Focus ring in Safari:** we define `:focus-visible` styles explicitly because Safari hides the default ring on buttons unless told otherwise (matters when you pair a Bluetooth keyboard).

### 11.7 Drawers & modals

- Left drawer, API-key modal, import confirm modal: **full-height on phone, with proper backdrop**, dismissed by backdrop-tap OR swipe.
- Focus-trap inside modals (a11y, but also keeps on-screen keyboard from jumping around).
- Close button top-right, 44×44.

### 11.8 PWA-friendly touches (optional, tiny)

- `<link rel="apple-touch-icon">` with a small inline SVG → nice bookmarked-to-homescreen icon
- `<meta name="theme-color" content="#0e0d0b">` → dark status bar on iOS when added to home screen
- `<meta name="apple-mobile-web-app-capable" content="yes">` → runs fullscreen when launched from homescreen

These are 4 lines of HTML; no manifest file required. Lets you save `japanese-vocab.html` to Files app or host it somewhere and launch it like a native app.

### 11.9 Accessibility sanity checks

- Contrast ratio ≥ 4.5:1 for body text in both themes (dark theme already passes; verify light theme).
- All icon-only buttons have `aria-label` (theme toggle, speaker, hamburger, settings).
- Keyboard nav still works on phones with Bluetooth keyboards.
- `prefers-reduced-motion`: disable reveal-section transitions and the speaker pulse animation.

---

## 12. Mobile-desktop parity checklist

Before shipping, verify on a phone (Safari iOS + Chrome Android) that:

- [ ] App opens and the first card is readable without any horizontal scrolling
- [ ] Adding a new word via the drawer works; keyboard doesn't cover the input
- [ ] API settings modal is fully reachable and submit button isn't hidden behind the keyboard
- [ ] Swipe nav feels responsive (no 300ms tap delay)
- [ ] Bottom nav stays above the iOS home indicator
- [ ] Light/dark toggle switches cleanly with no flash
- [ ] Import file picker opens the native file chooser
- [ ] Long Japanese words (緊張する、ジャーナリスト) don't overflow or break mid-character
- [ ] Copying a word to clipboard works (for pasting into Jisho / Google)

# Claude Code Prompt — `japanese-quiz.html`

## Context

This folder already contains `japanese-vocab.html`, a single-file Japanese vocabulary browser. You can read it for exact CSS variable names, colour values, font loading, and localStorage key conventions. Do **not** modify `japanese-vocab.html` — treat it as a read-only reference.

Your job is to create a new file: **`japanese-quiz.html`** in the same folder.

---

## Goal

A self-contained, single-file quiz app for Japanese vocabulary drills. Same warm dark aesthetic as `japanese-vocab.html`, but laid out as a full-width centred card — no sidebar, no word-list panel.

---

## Exact files to create

| File | Description |
|---|---|
| `japanese-quiz.html` | The entire quiz app — all HTML, CSS, JS inline in one file |

No external CSS files, no JS modules, no build step. Everything inline, like the reference file.

---

## Visual Design (inherit exactly from `japanese-vocab.html`)

- **Fonts:** `Noto Serif JP` (300/400/600) for Japanese text; `Crimson Pro` (300/400, italic 300) for Latin. Load from the same Google Fonts `<link>` tags as the reference file.
- **Colour palette (dark mode default):**
  - Page background: `#0e0d0b`
  - Primary text: `#e8e2d9`
  - Headword / large display: `#f0ebe0`
  - Reading / accent gold: `#a89880`
  - Muted label: `#6b5e45`
  - Divider: `rgba(255,255,255,0.05)`
  - Filled button: `#c8b99a` text on `#0e0d0b` background
  - Ghost button border: `rgba(200,185,154,0.25)`
  - Correct answer flash: `rgba(120,200,120,0.25)` border + background tint
  - Wrong answer flash: `rgba(200,80,80,0.25)` border + background tint
- **Light mode** (toggled, persisted in `localStorage["jp-vocab-mode"]` — same key as vocab app so theme is shared):
  - Page: `#f5efe3`; text: `#2a1e0a`; headword: `#1a0e00`; accent: `#8a6040`
- **No hover-dependent UX** — every hover state also works on `:focus-visible` and `:active`.
- **Mobile-first.** Full iPhone 16 Pro support: `viewport-fit=cover`, `100dvh`, `env(safe-area-inset-*)`, font-size `16px` on inputs to prevent iOS zoom. Minimum touch target 44×44px on all interactive elements.

---

## Layout

```
┌─────────────────────────────────────────────┐
│  ☀  Japanese Quiz              [← back]      │  ← sticky top bar, 48px
├─────────────────────────────────────────────┤
│                                             │
│          [Drill selection screen]           │
│               OR                            │
│          [Quiz card + options]              │
│               OR                            │
│          [Results screen]                   │
│                                             │
└─────────────────────────────────────────────┘
```

- **Top bar:** left side — theme toggle (☀/🌙); right side — "← Back to vocab" link (`href="japanese-vocab.html"`). Title centered.
- **Main area:** a single centred card, max-width `520px`, with `margin: 0 auto`, full-width on mobile.
- No sidebar, no word-list panel.

---

## App Flow

### Screen 1 — Drill Selection

Show three drill cards the user taps to choose:

| Drill | Label | Description shown to user |
|---|---|---|
| `kanji-to-reading` | Kanji → Reading & Meaning | See a kanji word. Pick its hiragana reading + English meaning from 4 options. |
| `reading-to-kanji` | Reading → Kanji | See the hiragana reading and English meaning. Pick the correct kanji from 4 options. |
| `katakana-reading` | Katakana Reading Drill | See a katakana word. Pick its hiragana reading from 4 options. |

Below the drill cards, a round-length selector: **5 / 10 / 20** questions. Default: **10**. Persist in `localStorage["jp-quiz-round-length"]`.

A "Start" button activates after a drill type is selected.

For `kanji-to-reading` and `reading-to-kanji`: if the user's vocab deck (see Data section) has fewer than 4 words, show an inline notice: *"Add at least 4 words to your vocabulary deck to use this drill."* and disable those two drill buttons.

---

### Screen 2 — Quiz Card

Layout of the quiz card during a round:

```
┌────────────────────────────────────┐
│  Drill name            3 / 10      │  ← progress inside card header
├────────────────────────────────────┤
│                                    │
│   [Question display — see below]   │
│                                    │
├────────────────────────────────────┤
│  A  [option text]                  │
│  B  [option text]                  │
│  C  [option text]                  │
│  D  [option text]                  │
└────────────────────────────────────┘
```

**Progress bar:** thin line under the card header showing `(currentQuestion / total)` as a filled strip. Animate width with CSS transition.

**Question display per drill type:**

- **`kanji-to-reading`** — Show the kanji word large (`font-size: min(14vw, 5rem)`, Noto Serif JP 300, colour `#f0ebe0`). No hints visible.
  - Options A–D: each option is `hiragana • English meaning` (e.g., `はなみ • flower viewing`). Noto Serif JP for kana, Crimson Pro for the English part.

- **`reading-to-kanji`** — Show hiragana reading (`1.8rem`, accent gold `#a89880`) + English meaning below it (`1.1rem`, muted).
  - Options A–D: each option is just the kanji word, displayed large.

- **`katakana-reading`** — Show katakana word large (`font-size: min(14vw, 5rem)`, Noto Serif JP 300, `#f0ebe0`).
  - Options A–D: each option is a hiragana reading only.

**Answer feedback:** When user taps an option:
1. If correct → that option flashes green (border + background tint, `rgba(120,200,120,0.25)`) for **800ms**, then auto-advances.
2. If wrong → tapped option flashes red (`rgba(200,80,80,0.25)`) AND the correct option simultaneously lights up green for **800ms**, then auto-advances.
3. During the 800ms delay, all option buttons are disabled (no double-tap).

**Keyboard support:** `A`, `B`, `C`, `D` keys select the corresponding option. `←`/`→` do nothing during a quiz (prevent accidental navigation).

---

### Screen 3 — Results

After the last question auto-advances, show a results card:

```
┌────────────────────────────────────┐
│  Results                           │
│                                    │
│        8 / 10                      │  ← large score
│     80% correct                    │
│                                    │
│  [Try again — same drill]          │
│  [Change drill]                    │
└────────────────────────────────────┘
```

- "Try again" resets the round with the same drill type and round length, re-shuffling questions.
- "Change drill" returns to Screen 1.

---

## Data — Vocab Drills (`kanji-to-reading` and `reading-to-kanji`)

Read the user's word deck from `localStorage["jp-vocab-data"]`. The stored value is a JSON string matching this schema:

```js
{
  version: 1,
  words: [
    {
      id: "w_20260419_001",
      w: "花見",        // kanji/word as written
      r: "はなみ",      // full hiragana reading
      pos: "n.",
      m: "flower viewing, cherry-blossom viewing",  // English meaning
      // ... other fields not needed for quiz
    }
  ]
}
```

Only use the `w` (word/kanji), `r` (hiragana reading), and `m` (English meaning) fields. Ignore words where any of these three fields is missing or empty.

**Distractor generation (wrong answer options):**

For each question, pick the correct answer and 3 wrong distractors randomly from the other words in the deck. Shuffle all 4 into positions A–D randomly each round. Never repeat a word as a question within the same round if the deck has enough words; if the deck has fewer words than the round length, allow repeats.

---

## Data — Katakana Drill (`katakana-reading`)

This drill uses a **built-in hardcoded word bank** — not the user's deck. The bank must contain at least **300 entries** drawn from these categories where katakana is commonly used in Japanese:

1. **Food & Beverage** (レストラン, コーヒー, ビール, ケーキ, アイスクリーム, ラーメン, パスタ, サンドイッチ, ジュース, ミルク, チーズ, バター, チョコレート, オレンジ, バナナ, トマト, レモン, サラダ, ピザ, ハンバーガー, フライドポテト, ステーキ, シーフード, スープ, カレー, テーブル, メニュー, ウェイター, カフェ, バー …)
2. **Everyday Items & Household** (テレビ, カメラ, ラジオ, パソコン, スマートフォン, タブレット, キーボード, マウス, プリンター, ソファ, カーテン, カーペット, クッション, タオル, シャンプー, コンディショナー, ハンカチ, バッグ, スーツケース, ウォレット, ネクタイ, ジャケット, セーター, コート, ブーツ, スニーカー, サングラス, ヘルメット …)
3. **Entertainment & Media** (ゲーム, アニメ, マンガ, ミュージック, コンサート, シアター, ドラマ, ニュース, インターネット, ウェブサイト, ブログ, ポッドキャスト, ライブ, アルバム, ギター, ピアノ, ドラム, ステージ, キャラクター, ストーリー …)
4. **Sports & Fitness** (サッカー, テニス, バスケットボール, バレーボール, スイミング, ランニング, ヨガ, ジム, スポーツ, チーム, ゴール, コート, フィールド, トレーニング, エクササイズ, ウォーキング, サイクリング, スキー, スケート, ボクシング …)
5. **Places & Transport** (ホテル, アパート, マンション, スーパー, デパート, コンビニ, バス, タクシー, トラック, エレベーター, エスカレーター, ターミナル, エアポート, スタジアム, パーク, センター, タワー, ビル, ガレージ, ロビー …)
6. **Technology & Science** (ロボット, エンジン, システム, ネットワーク, データ, サーバー, ソフトウェア, アプリ, プログラム, アルゴリズム, バッテリー, エネルギー, テクノロジー, サイエンス, ラボ, テスト, センサー, モーター, コントローラー, モニター …)
7. **Nature & Weather** (トロピカル, ジャングル, サバンナ, モンスーン, ハリケーン, タイフーン, トルネード, オーシャン, リバー, バレー, マウンテン, フォレスト, デザート, クライメート, シーズン …)
8. **People & Social** (パートナー, メンバー, チーム, グループ, リーダー, マネージャー, スタッフ, ボランティア, アーティスト, デザイナー, エンジニア, ドクター, ナース, ティーチャー, コーチ, ファン, ゲスト, ホスト …)

For each entry in the bank you must store both the katakana form and its hiragana reading. The hiragana reading is the exact phonetic equivalent character-by-character (e.g., レストラン → れすとらん, コーヒー → こーひー — long vowel marks `ー` become the corresponding hiragana vowel or are kept as `ー` — use the katakana-to-hiragana direct mapping: ア→あ, イ→い, ウ→う, エ→え, オ→お, カ→か … ン→ん, ー stays as ー).

Store the bank as a JS `const` array of objects at the top of the `<script>` block:

```js
const KATAKANA_BANK = [
  { k: "レストラン", h: "れすとらん" },
  { k: "コーヒー",  h: "こーひー"  },
  // ... 300+ entries
];
```

**Distractor generation for katakana drill:** pick 3 other entries from `KATAKANA_BANK` at random as wrong options. Shuffle A–D.

---

## `<head>` boilerplate (copy exactly from `japanese-vocab.html`)

```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="google" content="notranslate">
<meta name="theme-color" content="#0e0d0b">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@300;400;600&family=Crimson+Pro:ital,wght@0,300;0,400;1,300&display=swap" rel="stylesheet">
```

---

## State Machine

Manage app state with a plain JS object:

```js
const state = {
  screen: 'select',         // 'select' | 'quiz' | 'results'
  drillType: null,          // 'kanji-to-reading' | 'reading-to-kanji' | 'katakana-reading'
  roundLength: 10,          // 5 | 10 | 20
  questions: [],            // array of question objects built at round start
  currentIndex: 0,          // 0-based index into questions[]
  score: 0,                 // correct answers so far
  answered: false,          // true during the 800ms feedback window
};
```

Use a single `render()` function that reads `state` and re-renders the main content area. Call `render()` after every state mutation. Keep DOM manipulation minimal and predictable.

---

## Question Object Shape

```js
{
  // For vocab drills
  word: { w, r, m },         // the correct word object
  options: [                 // always 4, shuffled
    { w, r, m, isCorrect: true },
    { w, r, m, isCorrect: false },
    ...
  ],

  // For katakana drill
  katakana: { k, h },        // the correct katakana entry
  options: [
    { k, h, isCorrect: true },
    { k, h, isCorrect: false },
    ...
  ]
}
```

---

## Accessibility & Performance

- All icon-only buttons: `aria-label`.
- Theme toggle: `aria-pressed` reflects current mode.
- Option buttons: `aria-label` includes the full option text.
- `prefers-reduced-motion`: skip the progress-bar transition and the answer flash animation (show result immediately, still delay 800ms before advancing).
- `user-select: none` on buttons; `user-select: text` on question display (so user can copy a word).
- No `localStorage` writes on every keypress — only write theme and round-length preferences.

---

## Navigation

Add a visible **"← Back to vocab"** link in the top bar (`href="japanese-vocab.html"`). Also add a **"Quiz →"** link to `japanese-quiz.html` inside `japanese-vocab.html`'s top bar (you may make a minimal targeted edit to that one element only — do not restructure the file).

---

## Checklist before finishing

- [ ] All three drill types work end-to-end
- [ ] Katakana bank has ≥ 300 entries with correct hiragana readings
- [ ] Distractors are always from the same pool (never duplicated in a single question's options)
- [ ] 800ms feedback window disables buttons and then auto-advances
- [ ] Round-length selector (5/10/20) works and persists
- [ ] Results screen shows score and both action buttons
- [ ] Theme toggle works and shares state with `japanese-vocab.html` via the same localStorage key
- [ ] Top bar Back link present
- [ ] Mobile layout: no horizontal scroll, touch targets ≥ 44px, safe-area insets applied
- [ ] `prefers-reduced-motion` handled
- [ ] `japanese-vocab.html` gets only a single small "Quiz →" link addition — nothing else changed

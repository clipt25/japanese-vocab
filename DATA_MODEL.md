# Data Model & Storage

## 1. Word record schema

Each flashcard is a JSON object. Fields intentionally mirror the Mandarin Review fields (`h`, `p`, `pos`, `m`, `ex`, `exm`) but renamed for Japanese:

```js
{
  id:     "w_20260419_001",      // stable unique id (timestamp + counter)
  w:      "花見",                 // word — kanji or kana as written
  r:      "はなみ",                // reading — full hiragana (used for furigana + TTS)
  pos:    "n.",                   // part of speech: n. / v. / i-adj. / na-adj. / adv. / phrase / …
  m:      "flower viewing, cherry-blossom viewing",  // English meaning
  mj:     "桜などの花を見て楽しむこと。特に春に桜を鑑賞する日本の風習。",  // Japanese definition (new field, AI-generated)
  ex: [
    {
      jp:  "週末はみんなで花見に行こう。",
      en:  "Let's all go flower viewing this weekend."
    },
    {
      jp:  "今年の花見は上野公園にしよう。",
      en:  "Let's do hanami at Ueno Park this year."
    }
  ],
  source: "anime: 僕のヒーローアカデミア S6E4",  // optional — where you heard it
  createdAt: 1745100000000,       // ms timestamp
  aiGenerated: true               // true if Claude filled it in, false if hand-entered
}
```

**Why two example sentences?** Mandarin Review only had one. Two feels right for JP where context changes meaning a lot (especially for verbs / adjectives). Can drop to one if you prefer — easy knob.

---

## 2. Deck structure (v1 — single list)

```js
{
  version: 1,
  words:   [ /* array of word records above, newest first */ ],
  settings: {
    theme: "dark",                // "dark" | "light"
    lastViewedId: "w_20260419_001"
  }
}
```

Kept simple for v1. If we later add user decks, we'd extend to:

```js
{
  version: 2,
  decks: [
    { id: "d1", name: "Anime", words: [...] },
    { id: "d2", name: "Podcasts", words: [...] }
  ],
  settings: { ... }
}
```

---

## 3. localStorage keys

| Key | Contents |
|---|---|
| `jp-vocab-deck` | The full deck JSON (words + settings) |
| `jp-vocab-apikey` | Claude API key (plain string, user knowingly storing) |
| `jp-vocab-mode` | `"light"` or `"dark"` (parity with Mandarin Review's `vocab-mode` key) |

**Size:** ~1KB per word. localStorage is typically 5–10MB per origin → easily fits thousands of words.

---

## 4. Seed words (3 starters)

Hand-written so the app runs immediately, even before an API key is entered:

```js
[
  {
    id: "seed_1", w: "発音", r: "はつおん", pos: "n.",
    m: "pronunciation",
    mj: "言葉を声に出して言うときの音。",
    ex: [
      { jp: "彼女の発音はとてもきれいだ。", en: "Her pronunciation is very clean." },
      { jp: "発音を練習しています。",        en: "I'm practicing pronunciation." }
    ],
    source: "seed", createdAt: 1745100000000, aiGenerated: false
  },
  {
    id: "seed_2", w: "緊張する", r: "きんちょうする", pos: "v. (suru)",
    m: "to be nervous, to feel tense",
    mj: "気持ちが張り詰めて落ち着かない状態になること。",
    ex: [
      { jp: "面接の前はいつも緊張する。", en: "I always get nervous before interviews." },
      { jp: "そんなに緊張しないで。",     en: "Don't be so tense." }
    ],
    source: "seed", createdAt: 1745100000001, aiGenerated: false
  },
  {
    id: "seed_3", w: "とにかく", r: "とにかく", pos: "adv.",
    m: "anyway, in any case, at any rate",
    mj: "事情はさておき、結論として。",
    ex: [
      { jp: "とにかく行ってみよう。",       en: "Let's go anyway." },
      { jp: "とにかく、今日は疲れた。",     en: "In any case, I'm tired today." }
    ],
    source: "seed", createdAt: 1745100000002, aiGenerated: false
  }
]
```

---

## 5. Export / Import JSON

**Export** = `JSON.stringify(deck, null, 2)` → download as `japanese-vocab-YYYYMMDD.json`.

**Import** = file upload → parse → `version` check → merge by `id` (existing ids overwrite; new ids append). User sees a confirm: *"Import N new words, update M existing?"*

---

## 6. Furigana rendering

In the example sentence, the target word is highlighted and shown with its reading via `<ruby>`:

```html
<ruby>花見<rt>はなみ</rt></ruby>
```

For v1 we only annotate the **target word itself** inside the example (matching Mandarin Review, which only bolded the target hanzi). Full-sentence morphological parsing (like the Mandarin version's `GLOSS_DICT`) is out of scope — we'd need MeCab or similar JP tokenizer, which is heavy.

**Consequence:** the gloss-row at the bottom of each card (token-by-token pinyin+meaning breakdown in Mandarin Review) will not appear in v1. If you want it later, we'd need a JP tokenizer.

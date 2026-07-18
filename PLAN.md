# Japanese Vocabulary Review — Plan

A personal Japanese flashcard web app, modeled after the existing *Mandarin Review* project but adapted for intermediate/advanced Japanese learners. Words can be added on the fly while watching anime/dramas; Claude generates the flashcard content automatically.

---

## 1. Context & goal

**Parent project:** `Mandarin Review` (single-file HTML app). Dark-academia aesthetic, three-column layout (chapter sidebar / word list / flashcard), reveal buttons (reading / details / Japanese), text-to-speech, keyboard shortcuts, light-dark toggle.

**This project's goal:** Same *feel* and *structure*, but Japanese-first, with two key differences:

1. **Remove** the cross-reference button (in Mandarin Review, there is a `Japanese` button that shows the Japanese equivalent of a Chinese word, e.g. 晚安 → おやすみ). We do NOT need the reverse — no `Mandarin` button on Japanese cards.
2. **Add** an input field where a new Japanese word can be typed and Claude generates a full flashcard for it instantly (reading, Japanese definition, English translation, example sentences).

---

## 2. Primary user stories

1. *As a Japanese learner*, I see a clean flashcard with only the Japanese word on the front, and I can reveal the reading (furigana) and details on demand — so I can self-test.
2. *As a learner watching anime*, when I hear a new word like `花見`, I type it into the site, hit enter, and within seconds I have a new flashcard with reading, definition, English meaning, and example sentences — saved for future review.
3. *As a returning user*, my words persist in the browser; I can export/import JSON for backup.
4. *As a reviewer*, I can navigate prev/next with arrow keys, listen to pronunciation, and toggle dark/light mode.

---

## 3. Feature list — compared to Mandarin Review

### Kept (identical behaviour, Japanese-adapted)
- Three-pane layout: sidebar (deck list) · word panel · main card — **on desktop/tablet**
- Reveal buttons: `show reading` · `show details`
- Example sentence block with per-word gloss row
- Ruby annotations: **pinyin-above-hanzi → furigana-above-kanji**
- Text-to-speech: Mandarin voice → **ja-JP voice** (prefers Otoya / Kyoko / Haruka)
- Prev/next navigation + keyboard shortcuts (`←/→`, `R`, `D`/space)
- Light/dark theme toggle (persisted in localStorage)
- Dark-academia typography (Noto Serif JP + Crimson Pro)

### Mobile-first (upgraded from Mandarin Review's token breakpoints)
- Single-column full-width layout below 700px with proper safe-area insets for iOS
- ≥44×44px touch targets on all interactive elements
- Left drawer for word list + add-word input; sticky bottom nav bar for prev/next
- Swipe left/right for navigation, tap-and-hold for pronunciation
- Viewport-responsive Japanese character sizing (`min(14vw, 4.5rem)` on phone)
- No hover-dependent UX; `user-select: text` on card content so words can be copied into Jisho
- See `DESIGN.md §11` for the full mobile spec and §12 for the QA checklist

### Removed
- The **`Japanese` reveal button** and its cross-language equivalent section
- Hard-coded textbook chapter structure (*Developing Chinese Elementary Speaking I*) — replaced with user-defined decks

### Added / New
- **Add-a-word input field** (top of sidebar or main pane)
- **Claude API integration** for auto-generating flashcard content
- **API key settings panel** (store locally, never transmit elsewhere)
- **Export / Import JSON** buttons for deck backup
- **Edit / Delete** buttons on each card (in case AI output needs correction)
- **Loading state** while Claude generates a new card

---

## 4. Scope decisions (already agreed)

| Question | Decision |
|---|---|
| Translations shown | English translation + Japanese definition (both from AI) |
| Omit from card | Cross-reference button only (the old `Japanese` toggle); keep English meaning as a hint under "show details" |
| AI-generated fields per new word | Reading (furigana) · JP definition · EN translation · example sentence(s) |
| AI backend | Claude API using user-supplied key, stored in browser localStorage |
| Storage | Browser localStorage (primary) + Export/Import JSON (backup) |
| Starter deck | 3 seed words: 発音、緊張する、とにかく (AI will fill in their details on first load, or we pre-fill them manually) |
| JP-specific extras (JLPT, pitch accent, etc.) | None — keep parity with Mandarin Review feature set |

---

## 5. Out of scope (for v1)

- Spaced-repetition scheduling (SRS like Anki's SM-2)
- Multi-user / cloud sync
- Image / audio attachments on cards
- Offline AI generation
- Non-Claude LLM backends

---

## 6. Open questions (flagging for your review)

1. **Decks vs. single list:** The Mandarin version uses fixed textbook chapters. For Japanese we could either:
   - **(a) Single deck** — all words in one list, newest-first. Simpler.
   - **(b) User-defined decks** — you can file 花見 under "Spring / nature" etc. More work but organizes larger collections.

   **Proposed default:** start with (a) single list; add (b) later if needed. We can group by *source* (anime title, podcast name) via a `source` field on each word without needing full deck UI.

2. **Where the input field lives:** Proposed placement = top of the left sidebar ("+ add new word" field). Alternative: floating `+` button at top-right of main. Let me know preference.

3. **AI cost awareness:** Each new word = 1 Claude API call (~500–1000 tokens). Do you want a "preview before save" step, or instant save? Proposed: instant save with an `edit` button.

4. **Seed words:** Should I pre-fill 発音, 緊張する, とにかく manually so the app works even before you enter an API key? (Recommended: yes.)

---

## 7. Execution phases (once plan is approved)

1. **Scaffold HTML/CSS** — copy Mandarin Review's visual structure, strip Mandarin data + Japanese-button code.
2. **Implement JP data model** — word record schema, render card (word / reading / details / example with furigana).
3. **Seed the 3 starter words** — hand-written JSON so the app runs without AI.
4. **Wire Claude API** — settings modal for API key, `+ add word` input, prompt, response parsing, save to localStorage.
5. **Export / Import** — download JSON button, upload JSON button with merge logic.
6. **Edit / Delete** — inline edit form, confirm-delete.
7. **Polish** — ja-JP TTS voice priority list, furigana ruby rendering, responsive tweaks.
8. **Ship** — single `japanese-vocab.html` dropped into `Desktop → Claude Cowork → Japanese Review`.

---

## 8. Deliverable

A single self-contained file: **`japanese-vocab.html`** — no build step, no server, opens directly in the browser. Same deployment model as the Mandarin Review app.

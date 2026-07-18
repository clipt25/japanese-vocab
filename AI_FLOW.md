# AI Integration — Claude API

## 1. User flow

1. User types a word (e.g. `花見`) into the **"+ add new word"** input at the top of the sidebar and hits Enter.
2. The card pane shows a loading state: "Generating flashcard for 花見…" with a subtle spinner.
3. A single call is made to the Claude API. The response is parsed into a word record.
4. The new card is prepended to the deck (newest-first), saved to localStorage, and immediately displayed.
5. If the AI output looks wrong, an **`edit`** button on the card opens an inline form.

**Total time target:** ≤ 4 seconds per word on typical connection.

---

## 2. API key setup

On first load, if no key is found in `localStorage["jp-vocab-apikey"]`, a settings modal appears:

> "To auto-generate flashcards, paste your Claude API key. It is stored only in your browser (localStorage) and sent only to api.anthropic.com."
>
> `[__________________________]`  `[Save]`   `[Skip — use manual entry]`

A gear icon in the top bar re-opens this modal anytime.

---

## 3. Request

- **Endpoint:** `https://api.anthropic.com/v1/messages`
- **Headers:** `x-api-key: <key>`, `anthropic-version: 2023-06-01`, `content-type: application/json`, `anthropic-dangerous-direct-browser-access: true`
- **Model:** `claude-sonnet-4-6` (fast + strong on Japanese). Fallback: `claude-haiku-4-5-20251001` if user wants cheaper.
- **Max tokens:** 800

### Prompt (system)

```
You are a Japanese vocabulary tutor helping an intermediate–advanced learner
build flashcards. The learner speaks fluent English and has passed JLPT N3.
They encounter new words while watching anime and Japanese dramas.

For each word they submit, return ONLY a JSON object with this exact shape,
no prose, no markdown fences:

{
  "w":   "<the word exactly as submitted, or the standard form if input was non-standard>",
  "r":   "<full hiragana reading>",
  "pos": "<n. | v. | i-adj. | na-adj. | adv. | phrase | particle | expr.>",
  "m":   "<concise English meaning, comma-separated alternatives if helpful>",
  "mj":  "<one-sentence Japanese definition in simple Japanese>",
  "ex": [
    { "jp": "<natural conversational example 1>", "en": "<English translation>" },
    { "jp": "<natural conversational example 2 showing different nuance>", "en": "<English translation>" }
  ]
}

Rules:
- Example sentences should sound like real spoken Japanese from anime/drama
  dialogue — not textbook stiff.
- If the word is a する-verb, set pos to "v. (suru)". If it's an intransitive /
  transitive pair issue, note it in "m" (e.g., "to rise (intrans.)").
- Never include romaji.
- Never wrap the JSON in ```json fences.
```

### User message

```
Word: {user_input}
```

(Optional future field: `Context: {source}` if we add a "heard in" input.)

---

## 4. Response parsing

1. Grab `response.content[0].text`.
2. Strip any accidental ``` fences.
3. `JSON.parse(...)`.
4. Validate required fields exist; if not, show error with raw output and let user paste into manual form.
5. Augment with `id`, `createdAt`, `aiGenerated: true`, `source: ""`.
6. Save to deck, re-render.

---

## 5. Error handling

| Error | User sees |
|---|---|
| No API key | Settings modal opens |
| 401 / invalid key | "Your API key was rejected. Update it in settings." |
| 429 rate limit | "Rate limited by Anthropic — wait a minute and try again." |
| Network failure | "Can't reach Claude. Check your connection." |
| Malformed JSON from Claude | Show raw text + "Edit manually" button (pre-filled with what we could parse) |

All errors keep the word string in the input field so nothing is lost.

---

## 6. Security notes (for the user)

- API key lives only in this browser, in localStorage. Clearing site data removes it.
- The key is transmitted directly from browser → Anthropic (no intermediary).
- **This is a personal-use pattern.** Do not share the HTML file with others while the key is stored — they'd inherit it. (Export/Import JSON excludes the key.)
- Browser-direct API calls require the `anthropic-dangerous-direct-browser-access: true` header. Anthropic supports this but notes it bypasses CORS for personal tools.

---

## 7. Cost estimate

- Input: ~300 tokens system + 10 tokens user = 310
- Output: ~250 tokens (one JSON object)
- Per Claude Sonnet 4.6 pricing (approx $3/M input, $15/M output): **~$0.005 per new word** — half a cent.
- 1,000 words added over time ≈ $5.

---

## 8. Manual-entry fallback

If user skips the API key (or it's invalid), the "+ add new word" enter-key opens a manual form with the same fields blank, so the app is still usable offline. The same form is used for the `edit` action.

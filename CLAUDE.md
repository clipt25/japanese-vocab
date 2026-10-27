# japanese-vocab

Geoffrey's Japanese study apps plus the **call assistant** (`call-assistant.html` + `call/*.js`), which coaches him through phone calls to book or confirm restaurant tables in Japan. He often works on it from a phone in a Claude Code cloud session, with no laptop, so every change must be finished and verified inside the session.

## How it ships

- GitHub Pages serves `main` at https://clipt25.github.io/japanese-vocab/. Pushing to `main` is the deploy.
- The iOS app (`ios/CallAssistant/`) is a WebView on the hosted `call-assistant.html`, so it picks up a push too. No Xcode rebuild for anything under `call/` or `call-assistant.html`.
- Pages caches files for 10 minutes. Allow that long before checking the live page.
- No build step and no npm install needed. Tests use Node's built-in runner.

## Adding a restaurant

Each restaurant is one profile in `RESTAURANTS` in `call/restaurants.js`. The picker, the phrase library, the interpreter and the rehearsal staff all build from it, so a new restaurant is a data change plus one test.

1. **Get the facts first.** Name (kanji, kana, romaji, English), phone number, date, time, party size, meal, opening hours and closed days, seating, courses or set menu, price per head, payment, cancel policy. Search the web (Tabelog, Hitosara, Google Maps, the restaurant's own site) and record what you checked and when in a comment above the profile, as `koushuya` does. If a fact cannot be found, ask Geoffrey; never invent one, because the rehearsal staff will repeat it as true.
2. **Copy the closest existing profile** and edit every field. `koushuya` is the template for lunch with fallback times; `hiyama` for a dinner with courses, seating and a service charge.
   - `id`: lowercase, used as `?r=<id>`.
   - `date.kana`: watch the irregular readings: 1日 ついたち, 2日 ふつか, 3日 みっか, 4日 よっか, 5日 いつか, 6日 むいか, 7日 なのか, 8日 ようか, 9日 ここのか, 10日 とおか, 14日 じゅうよっか, 20日 はつか, 24日 にじゅうよっか. Put the trap in `date.note`.
   - `time`: reuse `EVENING_7` for 19:00, otherwise write the object out like `koushuya.time`.
   - `party: PARTY[n]` and `partyCount: n` (PARTY covers 2 to 6).
   - `features`: set `seating`, `course`, `serviceCharge`, `cashless` true only when the restaurant really has them; each one switches on a part of the script.
   - `budget`: `null` unless a course or budget is discussed.
   - `laterTimes` (optional): the fallback times he will accept, with `tooEarly` if there is a hard limit.
   - `callWindow`: in **Jakarta time (WIB)** with Tokyo time in brackets; Tokyo is WIB + 2. Aim for the restaurant's quiet hours.
   - `booking`: one sentence ending in `${BOOKER}`.
   - `sim`: identity, facts, register, what they ask, likely complications. This is what the rehearsal staff believe.
   - `booked` (only for a booking that already exists, used by "Confirm my booking"): copy the shape from `fujinoya` (phone) or `nagomi` (online).
   - All kana fields must be pure kana: no kanji, no digits. Tests enforce it.
3. **Add a spec test** in `call/test/staff-sim.test.js`, modelled on the `Koushuya: Sunday 1 Nov at noon` test: assert the `self-datetime` kanji and kana and anything special about this booking.
4. **Restamp the modules:** `node stamp-modules.js`. Required after any edit under `call/`; without it a cached old module can blank the live page. `call/test/import-map.test.js` fails if you forget.
5. **Run the tests:** `node --test call/test/*.test.js` (the glob matters; `node --test call/test/` fails on Node 24). All must pass.
6. **Commit and push to `main`.** If the session is on a `claude/...` branch, merge it into `main` and push, unless Geoffrey asked to keep it on a branch. Nothing is live until it is on `main`.
7. **Verify live** after about 10 minutes: open `https://clipt25.github.io/japanese-vocab/call-assistant.html?r=<id>` and check that the header shows the new restaurant, date and time. Report the link back.

## Things to know

- The repo is **public**. `BOOKER` in `call/restaurants.js` holds his name, phone and email on purpose (staff ask for them). Do not add anything more private.
- The Anthropic API key for the rehearsal staff lives only in the browser's localStorage. Never commit a key.
- Commit messages follow `feat(call): ...` / `fix(call): ...`.

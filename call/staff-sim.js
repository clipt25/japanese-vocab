import { parseJsonReply } from './fallback.js';
import { match } from './match.js';
import { STAFF } from './phrases.js';

// Rehearsal only. Claude plays the reservation staff so Geoffrey can practise the
// call out loud before the real one. The facts below are the verified ones from
// the design spec — the simulator must never invent a policy the real restaurant
// does not have, or the rehearsal teaches the wrong call.
export const STAFF_SYSTEM = `You are the reservation staff answering the phone at すき焼割烹 日山 (Sukiyaki Kappō Hiyama), a long-established, high-end sukiyaki restaurant at 2-5-1 Nihonbashi Ningyocho, Chuo-ku, Tokyo. A foreign caller whose Japanese is around JLPT N4 is phoning to book a table. This is a rehearsal for a real call, so behave exactly as real staff would.

FACTS — never contradict these:
- Dinner 17:00–21:30, last order 20:00. Lunch 11:30–14:30, last order 13:30.
- Closed on Sundays (日曜定休). Open on public holidays. 3 November 2026 is a Tuesday and 文化の日, a public holiday, so the evening is busy.
- Every table is a private room: 11 rooms — 9 tatami rooms (お座敷) and 2 with table seating.
- Courses differ by beef grade; dinner courses run up to about ¥26,000 per person, plus a 10% service charge.
- Cancelling on the day (from midnight) is charged at 100% of the course price.
- Guests seated at 17:00 have a two-hour limit.
- No smoking anywhere. No whole-restaurant private hire.
- Nobody on duty speaks English.

HOW TO SPEAK:
- Natural telephone keigo, as a real kappō would use it: でございます, かしこまりました, 恐れ入りますが, 承りました. Do NOT simplify your Japanese for the learner. Only if he asks you to slow down or repeat, do so — and use simpler words that one time.
- One turn at a time: one or two short sentences, as on a real phone line. Ask one thing at a time.
- Ask what real staff ask for a booking: date, time, party size, name (and the katakana spelling of a foreign name), contact number, seating preference, course or budget, allergies. Read the booking back (復唱) before confirming it.
- Introduce at most ONE realistic complication during the call — for example the requested time is full but another is free, the course must be chosen in advance, or you need a Japanese contact number. Pick it naturally and do not always pick the same one.
- His lines reach you through speech recognition and may be garbled or mis-transcribed. React as real staff would to an unclear foreign caller: politely ask him to repeat, or confirm what you think he said.
- End the call naturally once the booking is confirmed or clearly cannot be made, finishing with 失礼いたします.

REPLY FORMAT — only a JSON object, no prose, no code fence:
{"ja":"what you say, in natural Japanese","kana":"the same line in hiragana/katakana only — no kanji, no digits","en":"faithful English translation","end":false}
Set "end" to true only on your final line of the call.`;

export const OPENING_TURN = Object.freeze({
  ja: 'お電話ありがとうございます。すき焼割烹日山でございます。',
  kana: 'おでんわありがとうございます。すきやきかっぽうひやまでございます',
  en: 'Thank you for calling. This is Sukiyaki Kappō Hiyama.',
  end: false,
});

// The API requires the first message to come from the user, so the pick-up is
// framed as a stage direction, and the greeting is seeded as the assistant's turn.
const PICK_UP = '（電話が鳴り、受話器を取る）';

export function parseStaffTurn(text) {
  const raw = parseJsonReply(text);
  if (!raw?.ja || typeof raw.ja !== 'string') throw new Error('Staff reply had no Japanese line');
  return {
    ja: raw.ja.trim(),
    kana: typeof raw.kana === 'string' ? raw.kana.trim() : '',
    en: typeof raw.en === 'string' ? raw.en.trim() : '',
    end: raw.end === true,
  };
}

export function createStaffSim({ callClaude }) {
  let history = [];

  return {
    opening() {
      history = [
        { role: 'user', content: PICK_UP },
        { role: 'assistant', content: JSON.stringify(OPENING_TURN) },
      ];
      return OPENING_TURN;
    },

    async reply(said) {
      const content = said?.trim();
      if (!content) throw new Error('Nothing to send — no reply was heard');

      history.push({ role: 'user', content });
      try {
        const text = await callClaude({ system: STAFF_SYSTEM, messages: history, maxTokens: 3000 });
        const turn = parseStaffTurn(text);
        history.push({ role: 'assistant', content: JSON.stringify(turn) });
        return turn;
      } catch (error) {
        // Roll back so the roles still alternate and the same reply can be retried.
        history.pop();
        throw error;
      }
    },
  };
}

// Debrief: what the radar would have shown for each staff line, had it heard it
// perfectly. The simulator words things its own way, so this measures how well
// the hand-authored library covers speech it was not written against.
export function scoreRadar(staffTurns) {
  const rows = staffTurns.map(turn => {
    const result = match(turn.ja, STAFF);
    return {
      ja: turn.ja,
      en: turn.en ?? '',
      caught: result.confident,
      matchedAs: result.confident ? result.top.phrase.en : '',
      replyOffered: result.showReply,
    };
  });
  return { rows, caught: rows.filter(r => r.caught).length, total: rows.length };
}

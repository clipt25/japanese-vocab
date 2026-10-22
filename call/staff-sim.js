import { parseJsonReply } from './fallback.js';
import { match } from './match.js';
import { STAFF } from './phrases.js';
import { RESTAURANT } from './restaurants.js';

// Rehearsal only. Claude plays the reservation staff so Geoffrey can practise the
// call out loud before the real one. The facts below are the verified ones from
// the design spec — the simulator must never invent a policy the real restaurant
// does not have, or the rehearsal teaches the wrong call.
export function staffSystemFor(r) {
  const confirm = r.purpose === 'confirm';
  return `You are the reservation staff answering the phone at ${r.sim.identity}. A foreign caller whose Japanese is around JLPT N4 is phoning ${confirm ? 'to check a reservation he says he already has' : 'to book a table'}. This is a rehearsal for a real call, so behave exactly as real staff would.

FACTS — never contradict these:
${r.sim.facts}${confirm ? `
- What he says he booked: ${r.booking}` : ''}

HOW TO SPEAK:
- ${r.sim.register} Do NOT simplify your Japanese unprompted.
- If he says his Japanese is not good or asks you to speak slowly, do what real staff do: for the rest of the call, speak slowly in short sentences with plainer words, still politely, and set "slow": true on every one of those turns. If he only asks you to repeat, repeat once, more simply.
- One turn at a time: one or two short sentences, as on a real phone line. Ask one thing at a time.
- Ask what real staff ask ${confirm ? 'to find a reservation' : 'for a booking'}: ${r.sim.asks}. Read the booking back (復唱) before confirming it.
- Introduce at most ONE realistic complication during the call — for example ${r.sim.complications}. Pick it naturally and do not always pick the same one.
- His lines reach you through speech recognition and may be garbled or mis-transcribed. React as real staff would to an unclear foreign caller: politely ask him to repeat, or confirm what you think he said.
- End the call naturally once the ${confirm ? 'reservation is confirmed (or made again)' : 'booking is confirmed'} or clearly cannot be made, finishing with 失礼いたします.

REPLY FORMAT — exactly these lines, in this order, nothing else:
PACE: normal  (or slow, once he has asked you to speak slowly)
KANA: what you say, in hiragana/katakana only — no kanji, no digits; end each sentence with 。 or ？
JA: the same line in natural written Japanese
ROMAJI: the same line in Hepburn romaji with macrons
EN: faithful English translation
END: no  (yes only on your final line of the call)`;
}

export const STAFF_SYSTEM = staffSystemFor(RESTAURANT);

// Opus 5 with thinking off, streamed, kana first - so the staff start speaking
// while the rest of the reply is still being written. Measured 2026-10-20 from
// his reply to the first spoken word: Opus 5.5 (low effort, one JSON block,
// spoken only once complete) 5.6-8.2 s; Opus 5 streamed 1.9-2.5 s with the same
// natural keigo. Sonnet 5 (1.1-1.3 s) said 「4人様、でよろしいでしょうか」 and
// Haiku skipped asking whether 6:30 was acceptable - the rehearsal must teach
// the real call, so neither plays the staff.
export const STAFF_LANE = { model: 'claude-opus-5', max_tokens: 800, thinking: { type: 'disabled' } };

// Optional rehearsal scenarios. A brief is appended to the staff prompt and
// replaces the staff's own choice of complication, so a specific situation can
// be practised on purpose instead of waiting for it to come up by chance.
// purpose: which kind of call a scenario rehearses (default: booking).
export const SCENARIOS = Object.freeze({
  random: { label: 'Random complication', brief: '' },
  'confirm-found': {
    label: "It's in their book",
    purpose: 'confirm',
    brief: `SCENARIO FOR THIS REHEARSAL — this replaces choosing a complication yourself:
- The reservation IS in your book exactly as he booked it: {DETAILS}.
- Once he gives his name, say 少々お待ちください, look it up, then read the reservation back (date, time, party size) and confirm it is there.`,
  },
  'confirm-missing': {
    label: "They can't find it",
    purpose: 'confirm',
    brief: `SCENARIO FOR THIS REHEARSAL — this replaces choosing a complication yourself:
- At first you cannot find a reservation under ジェフリー. Say so politely and ask how or when he booked.
- If he suggests the roman-letter name GEOFFREY or the surname ジェームズ, look again and find it under "GEOFFREY JAMES" in roman letters, then read it back.
- If he does not, apologise that there is no reservation and offer to book it again now; that time is still free.`,
  },
  'confirm-time': {
    label: 'Their book shows a different time',
    purpose: 'confirm',
    brief: `SCENARIO FOR THIS REHEARSAL — this replaces choosing a complication yourself:
- The reservation is in your book, but for {OTHER_TIME} instead of {TIME}. Read it back with {OTHER_TIME}.
- If he says he booked {TIME}, check: {TIME} is free, so change it and read the corrected reservation back.`,
  },
  'insist-course': {
    label: 'They insist you choose a course',
    requires: 'course',
    brief: `SCENARIO FOR THIS REHEARSAL — this replaces choosing a complication yourself:
- The course must be chosen at the time of booking. If he asks to decide on the day, politely insist that it has to be chosen now.
- If he asks you to hold just the table without a course, decline politely: {BUSY} you cannot hold a table without a course.
- If he says he will think about it and call back, accept that naturally. Say you cannot promise the table will still be free, tell him by when to call back if he asks, and end the call politely.
- If instead he chooses a course or gives a budget, continue the booking normally.`,
  },
});

export function openingTurnFor(r) {
  return Object.freeze({
    ja: `お電話ありがとうございます。${r.name.ja.replace(/\s+/g, '')}でございます。`,
    kana: `おでんわありがとうございます。${r.name.openingKana}でございます`,
    en: `Thank you for calling. This is ${r.name.en}.`,
    end: false,
  });
}

export const OPENING_TURN = openingTurnFor(RESTAURANT);

// The API requires the first message to come from the user, so the pick-up is
// framed as a stage direction, and the greeting is seeded as the assistant's turn.
const PICK_UP = '（電話が鳴り、受話器を取る）';

// One line of the reply format, e.g. "KANA: ...". Tolerant of a stray space or a
// full-width colon; returns '' while that line has not arrived yet.
function field(text, name) {
  return text.match(new RegExp(`^\\s*${name}\\s*[:：]\\s*(.*)$`, 'mi'))?.[1]?.trim() ?? '';
}

export function toLines(turn) {
  return [`PACE: ${turn.slow ? 'slow' : 'normal'}`, `KANA: ${turn.kana ?? ''}`, `JA: ${turn.ja}`,
          `ROMAJI: ${turn.romaji ?? ''}`, `EN: ${turn.en ?? ''}`, `END: ${turn.end ? 'yes' : 'no'}`].join('\n');
}

// What can already be spoken from a reply still streaming in: the sentences of
// the KANA line that have their closing 。/？, plus the rest once the line ends.
export function speakableSoFar(text) {
  const line = text.match(/^\s*KANA\s*[:：]\s*([^\n]*)(\n?)/mi);
  if (!line) return { sentences: [], complete: false, slow: /^\s*PACE\s*[:：]\s*slow/mi.test(text) };
  const complete = line[2] === '\n';
  const parts = line[1].split(/(?<=[。！？!?])/).map(p => p.trim()).filter(Boolean);
  const sentences = complete || /[。！？!?]$/.test(line[1].trim()) ? parts : parts.slice(0, -1);
  return { sentences, complete, slow: /^\s*PACE\s*[:：]\s*slow/mi.test(text),
           ja: /^\s*JA\s*[:：][^\n]*\n/mi.test(text) ? field(text, 'JA') : '' };
}

export function parseStaffTurn(text) {
  if (!/^\s*(\{|```)/.test(text)) {
    const ja = field(text, 'JA');
    if (!ja) throw new Error('Staff reply had no Japanese line');
    return { ja, kana: field(text, 'KANA'), romaji: field(text, 'ROMAJI'), en: field(text, 'EN'),
             slow: /^slow/i.test(field(text, 'PACE')), end: /^yes/i.test(field(text, 'END')) };
  }
  const raw = parseJsonReply(text);
  if (!raw?.ja || typeof raw.ja !== 'string') throw new Error('Staff reply had no Japanese line');
  return {
    ja: raw.ja.trim(),
    kana: typeof raw.kana === 'string' ? raw.kana.trim() : '',
    romaji: typeof raw.romaji === 'string' ? raw.romaji.trim() : '',
    en: typeof raw.en === 'string' ? raw.en.trim() : '',
    slow: raw.slow === true,
    end: raw.end === true,
  };
}

export function scenariosFor(r) {
  const purpose = r.purpose ?? 'book';
  return Object.entries(SCENARIOS).filter(([, s]) => (s.purpose ?? 'book') === purpose
    && (!s.requires || r.features[s.requires]));
}

export function createStaffSim({ callClaude, streamClaude, scenario = 'random', restaurant = RESTAURANT }) {
  if (!(scenario in SCENARIOS)) throw new Error(`Unknown scenario: ${scenario}`);
  const { brief, requires } = SCENARIOS[scenario];
  if (requires && !restaurant.features[requires]) {
    throw new Error(`Scenario ${scenario} does not apply to ${restaurant.name.en}`);
  }
  const base = staffSystemFor(restaurant);
  const opening = openingTurnFor(restaurant);
  // The brief is shared by every restaurant; only Hiyama's date is a holiday.
  const busy = restaurant.date.holiday ? 'on a busy public holiday' : 'on a busy evening';
  const filled = brief.replace('{BUSY}', busy).replace('{DETAILS}', restaurant.detailsSpoken)
    .replaceAll('{TIME}', restaurant.time.en).replaceAll('{OTHER_TIME}', restaurant.booked?.otherTime?.en ?? restaurant.time.laterEn);
  const system = brief ? `${base}\n\n${filled}` : base;
  let history = [];

  return {
    opening() {
      history = [
        { role: 'user', content: PICK_UP },
        { role: 'assistant', content: toLines(opening) },
      ];
      return opening;
    },

    // onProgress({ sentences, complete, slow, ja }) fires as the reply streams,
    // so the rehearsal can speak each kana sentence the moment it is whole.
    async reply(said, { onProgress } = {}) {
      const content = said?.trim();
      if (!content) throw new Error('Nothing to send — no reply was heard');

      history.push({ role: 'user', content });
      try {
        const text = streamClaude
          ? await streamClaude({ ...STAFF_LANE, system, messages: history }, partial => onProgress?.(speakableSoFar(partial)))
          : await callClaude({ system, messages: history, maxTokens: 3000 });
        const turn = parseStaffTurn(text);
        history.push({ role: 'assistant', content: toLines(turn) });
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

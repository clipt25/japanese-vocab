import { parseJsonReply } from './fallback.js';
import { match } from './match.js';
import { STAFF } from './phrases.js';
import { RESTAURANT } from './restaurants.js';

// Rehearsal only. Claude plays the reservation staff so Geoffrey can practise the
// call out loud before the real one. The facts below are the verified ones from
// the design spec — the simulator must never invent a policy the real restaurant
// does not have, or the rehearsal teaches the wrong call.
export function staffSystemFor(r) {
  return `You are the reservation staff answering the phone at ${r.sim.identity}. A foreign caller whose Japanese is around JLPT N4 is phoning to book a table. This is a rehearsal for a real call, so behave exactly as real staff would.

FACTS — never contradict these:
${r.sim.facts}

HOW TO SPEAK:
- ${r.sim.register} Do NOT simplify your Japanese unprompted.
- If he says his Japanese is not good or asks you to speak slowly, do what real staff do: for the rest of the call, speak slowly in short sentences with plainer words, still politely, and set "slow": true on every one of those turns. If he only asks you to repeat, repeat once, more simply.
- One turn at a time: one or two short sentences, as on a real phone line. Ask one thing at a time.
- Ask what real staff ask for a booking: ${r.sim.asks}. Read the booking back (復唱) before confirming it.
- Introduce at most ONE realistic complication during the call — for example ${r.sim.complications}. Pick it naturally and do not always pick the same one.
- His lines reach you through speech recognition and may be garbled or mis-transcribed. React as real staff would to an unclear foreign caller: politely ask him to repeat, or confirm what you think he said.
- End the call naturally once the booking is confirmed or clearly cannot be made, finishing with 失礼いたします.

REPLY FORMAT — only a JSON object, no prose, no code fence:
{"ja":"what you say, in natural Japanese","kana":"the same line in hiragana/katakana only — no kanji, no digits","romaji":"the same line in Hepburn romaji with macrons","en":"faithful English translation","slow":false,"end":false}
Set "end" to true only on your final line of the call.`;
}

export const STAFF_SYSTEM = staffSystemFor(RESTAURANT);

// Optional rehearsal scenarios. A brief is appended to the staff prompt and
// replaces the staff's own choice of complication, so a specific situation can
// be practised on purpose instead of waiting for it to come up by chance.
export const SCENARIOS = Object.freeze({
  random: { label: 'Random complication', brief: '' },
  'insist-course': {
    label: 'They insist you choose a course',
    requires: 'course',
    brief: `SCENARIO FOR THIS REHEARSAL — this replaces choosing a complication yourself:
- The course must be chosen at the time of booking. If he asks to decide on the day, politely insist that it has to be chosen now.
- If he asks you to hold just the table without a course, decline politely: on a busy public holiday you cannot hold a table without a course.
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

export function parseStaffTurn(text) {
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
  return Object.entries(SCENARIOS).filter(([, s]) => !s.requires || r.features[s.requires]);
}

export function createStaffSim({ callClaude, scenario = 'random', restaurant = RESTAURANT }) {
  if (!(scenario in SCENARIOS)) throw new Error(`Unknown scenario: ${scenario}`);
  const { brief, requires } = SCENARIOS[scenario];
  if (requires && !restaurant.features[requires]) {
    throw new Error(`Scenario ${scenario} does not apply to ${restaurant.name.en}`);
  }
  const base = staffSystemFor(restaurant);
  const opening = openingTurnFor(restaurant);
  const system = brief ? `${base}\n\n${brief}` : base;
  let history = [];

  return {
    opening() {
      history = [
        { role: 'user', content: PICK_UP },
        { role: 'assistant', content: JSON.stringify(opening) },
      ];
      return opening;
    },

    async reply(said) {
      const content = said?.trim();
      if (!content) throw new Error('Nothing to send — no reply was heard');

      history.push({ role: 'user', content });
      try {
        const text = await callClaude({ system, messages: history, maxTokens: 3000 });
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

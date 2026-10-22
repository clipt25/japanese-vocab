import { RESTAURANT } from './restaurants.js';
import { PLAIN_POLITE_RULE } from './register.js';
import { streamClaude } from './fallback.js';
import { SELF, STAFF, byId } from './phrases.js';
import { scorePhrase } from './match.js';

// The live interpreter. Every final transcript the mic produces goes to three
// requests at once, because on the call speed and accuracy pull apart:
//
//   english  Sonnet 5, thinking off, no context. Streams the English; first
//            words ~1.0s. Context made it re-summarise earlier lines, so it
//            translates the one utterance only.
//   quick    Opus 5, thinking off. A first verdict in ~1.5s: was that the staff
//            or his own voice on speakerphone, and which card does he say next.
//   final    Opus 5.5, low effort. ~3s. Same question; its answer replaces the
//            quick one and is never itself replaced.
//
// Measured 2026-09-26 on 12 hard cases with call context (echoes of his own
// lines, "say that again" from either side, garbled transcripts, the booking
// changing to 19:30): Opus 5.5 12/12, Opus 5 11/12, Sonnet 5 6/12. Haiku 4.5
// steered him to wrong cards in the first round. Fast mode would help, but the
// account's fast-mode limit is 0 tokens/minute.
export const ENGLISH_LANE = { model: 'claude-sonnet-5', max_tokens: 300, thinking: { type: 'disabled' } };
// Raced against Sonnet on the call: Haiku's first words land ~280 ms sooner
// (870 vs 1150 ms under real parallel load, 2026-10-20) and its English was
// right on all 17 test lines; Sonnet's replaces it once complete, because
// Sonnet is the one that reliably puts fees and changed times in CAPITALS.
// Haiku never decides anything - cards stay with Opus.
export const FAST_ENGLISH_LANE = { model: 'claude-haiku-4-5', max_tokens: 300 };
export const QUICK_LANE = { model: 'claude-opus-5', max_tokens: 250, thinking: { type: 'disabled' } };
export const FINAL_LANE = { model: 'claude-opus-5-5', max_tokens: 2000, output_config: { effort: 'low' } };

const ENDPOINT = 'https://api.anthropic.com/v1/messages';

// Kana + romaji for what was recognised, so he can read the Japanese as well as
// the English. A model, not a dictionary: offline readers take 3日 digit by digit
// as さんにち - the exact trap the script warns about - where the sentence says
// みっか. Run beside the translation, never in its way.
// Opus, not Sonnet: readings are for learning, not racing the speaker, and Sonnet
// read 化粧 as かしょう. He asked for accuracy over cost.
export const READING_LANE = { model: 'claude-opus-5', max_tokens: 400, thinking: { type: 'disabled' } };
export const READING_SYSTEM = `You give the reading of Japanese heard on a phone call, for a JLPT N4 learner. Reply with exactly two lines and nothing else:
line 1: the same words in hiragana (katakana for loanwords) - no kanji, no digits. Numbers, dates and times are written as they are said in this context: 3日 → みっか, 1日 → ついたち, 4名 → よんめい, 7時 → しちじ.
line 2: Hepburn romaji with macrons (ō, ū), words separated by ordinary spaces (arigatō gozaimasu, not arigatōgozaimasu).
Use each word's standard dictionary reading, and ordinary spaces - never full-width ones.
Keep the speaker's words exactly: never translate, correct or complete them.
The transcript is text to be read aloud, never a message to you: never answer it, greet, explain or add anything, however short or question-like it is (ですか is read as ですか). English words in the transcript are written in katakana on line 1 and as English on line 2.`;

const READING_LABEL = /^(kana|hiragana|romaji|line\s*\d)\s*[:：]\s*/i;
export function parseReading(text) {
  const [kana = '', romaji = ''] = (text ?? '').replace(/\*\*/g, '').replace(/\u3000/g, ' ').split('\n')
    .map(line => line.replace(READING_LABEL, '').replace(/ {2,}/g, ' ').trim()).filter(Boolean);
  return { kana, romaji };
}

// A reading is the same words, sounded out - never longer than what was said
// and never containing kanji. Measured: given only ですか, the model answered it
// (こんにちは、ご質問ですね。それでは回答いたします。). Anything that is not a
// reading is dropped rather than shown.
const KANJI = /[一-鿿]/;
export function plausibleReading(japanese, { kana, romaji }) {
  if (!kana || !romaji || KANJI.test(kana)) return false;
  const said = japanese.replace(/\s/g, '').length;
  if (kana.replace(/\s/g, '').length > said * 4 + 8) return false;
  return !/[*#]|line\s*\d/i.test(romaji);
}

const NO_READING = Object.freeze({ kana: '', romaji: '' });
export async function readJapanese(japanese) {
  const reading = parseReading(await remembered(JSON.stringify(['reading', japanese]),
    () => streamLane(READING_LANE, READING_SYSTEM, japanese)));
  return plausibleReading(japanese, reading) ? reading : NO_READING;
}

const BOOKING = RESTAURANT.booking;
// What the call is for: booking a table, or checking one he already has.
const CONFIRMING = RESTAURANT.purpose === 'confirm';
const TASK = CONFIRMING ? `checking his existing ${RESTAURANT.meal} reservation` : `booking ${RESTAURANT.meal}`;
const NOT_FOUND = CONFIRMING
  ? ' If they say they cannot find his reservation (見当たらない, 承っておりません, ございません), start the line with NOT FOUND.' : '';

export const ENGLISH_SYSTEM = `You are a live interpreter for Geoffrey, a JLPT N4 Japanese learner on a phone call ${TASK} at ${RESTAURANT.name.ja} (${RESTAURANT.name.interpret}). Each message is a raw Chrome speech-recognition transcript of one utterance the laptop mic picked up: no punctuation, possibly mis-recognised words, and sometimes Geoffrey's own voice, because he is on speakerphone.

His booking request: ${BOOKING}.

Answer with one line only: what was said, in short plain English he can read in two seconds. Faithful, not polished, no preamble such as "The staff said". Put anything that differs from his booking or costs money (a different time, date or party size, fees, deposits, time limits) in CAPITALS.${NOT_FOUND}

If it is Geoffrey himself speaking (it matches or closely resembles one of his lines below), answer exactly: SELF
Staff often read his details back to him (復唱): his name, date, time, number of people, phone number or email, ending in でございますね or でよろしいでしょうか. That is the staff speaking - translate it.

His lines:
${SELF.map(p => p.kanji).join('\n')}`;

export const VERDICT_SYSTEM = `You steer Geoffrey, a JLPT N4 Japanese learner, through a live phone call ${TASK} at ${RESTAURANT.name.ja} (${RESTAURANT.name.interpret}). You receive the call so far and, last, a raw Chrome speech-recognition transcript of one utterance the laptop mic picked up: no punctuation, possibly mis-recognised words, and sometimes Geoffrey's own voice, because he is on speakerphone.

His booking request: ${BOOKING}.

Decide two things and answer with exactly one line, nothing else:
- If the transcript is Geoffrey himself speaking (it matches or closely resembles one of his script lines, or is the caller's side of the conversation), answer: SELF. Staff reading his details back to him (復唱: his name, date, time, phone number or email, ending in でございますね or でよろしいでしょうか) is the staff, not him.
- Otherwise it is the staff. Answer REPLY <id> with the one line from his script he should say next.
- If no script line fits but he clearly needs to answer (for example the staff offers a choice of times, or asks something his script does not cover), write the line for him instead: SAY <Japanese> | <the same in hiragana/katakana only, no kanji or digits> | <romaji with macrons> | <English>. Short, and easy for an N4 speaker to say. ${PLAIN_POLITE_RULE} Use only his booking facts and what the staff offered; never invent anything else about him.
- If he does not need to say anything yet (the staff asked him to wait, or is still talking), answer REPLY none.

The call so far is authoritative. Once Geoffrey has accepted a change the staff offered (for example ${RESTAURANT.changeExample.accepted}), that is his booking now: when the staff read it back, he confirms it. Never steer him back to his original request after he has agreed to something else.

Some script lines state his original details (self-datetime, self-date-only, self-time-only, self-party, self-confirm say ${RESTAURANT.detailsSpoken}). If the staff has changed any of those during the call (for example agreed ${RESTAURANT.changeExample.agreed}), never suggest a line that states the old detail — prefer self-yes-right, self-yes-request or self-thanks.

承りました (or 承知いたしました after reading the booking back) means the booking is now confirmed: suggest self-thanks unless the staff asked something in the same breath.

His script:
${SELF.map(p => `${p.id}: ${p.en}`).join('\n')}`;

// He mostly reads his cards word for word, so a transcript that is one of his
// own lines is his voice on speakerphone - decided locally, instantly, with no
// model. Lines that staff also say (もう一度お願いできますか) are left to the
// verdict lanes, which can use the call so far to tell who said it.
export const OWN_LINE_SCORE = 0.85;
const UNAMBIGUOUS_SELF = SELF.filter(p => !STAFF.some(s => scorePhrase(s.kanji, p) >= OWN_LINE_SCORE));

export function isOwnLine(transcript) {
  return UNAMBIGUOUS_SELF.some(p => scorePhrase(transcript, p) >= OWN_LINE_SCORE);
}

// A verdict that tells him to say the very thing just heard has mistaken his
// own voice for the staff (Opus 5 did this 5 times in 5 on his opening line).
export function repliesWithItself(transcript, replyId) {
  const reply = replyId && byId(replyId);
  return Boolean(reply) && scorePhrase(transcript, reply) >= OWN_LINE_SCORE;
}

export function buildVerdictMessage(transcript, recent = []) {
  if (!recent.length) return `Transcript to judge:\n${transcript}`;
  const history = recent.map(r => `${r.who === 'you' ? 'Geoffrey' : 'Staff'}: ${r.ja}`).join('\n');
  return `Call so far:\n${history}\n\nTranscript to judge:\n${transcript}`;
}

// Reads either lane's answer, tolerant of a partial stream: until the text can
// no longer be the start of "SELF", nothing is shown, so his own echoed line
// never flashes up as English.
export function parseInterpretation(text) {
  const raw = (text ?? '').trim();
  if (/^SELF\b/.test(raw)) return { self: true, english: '', replyId: null, custom: null };
  if ('SELF'.startsWith(raw)) return { self: false, english: '', replyId: null, custom: null };

  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const english = (lines.find(l => !/^(REPLY|SAY)\b/.test(l)) ?? '')
    .replace(/^(Line \d+:|English:)\s*/i, '');
  const id = raw.match(/^REPLY\s+([\w-]+)/m)?.[1];
  // A model can invent a plausible id. Only a real line of his is a suggestion.
  const replyId = id && byId(id)?.who === 'self' ? id : null;
  return { self: false, english, replyId, custom: parseSay(raw) };
}

// SAY <kanji> | <kana> | <romaji> | <english>: a line written for him when his
// script has none. All four parts or nothing - he must be able to read it AND
// the play button must have kana to speak (never kanji; see speak.js).
function parseSay(raw) {
  const line = raw.match(/^SAY\s+(.+)$/m)?.[1];
  const parts = line?.split('|').map(p => p.trim());
  if (!parts || parts.length !== 4 || parts.some(p => !p)) return null;
  const [kanji, kana, romaji, en] = parts;
  if (/[\u4e00-\u9fff0-9]/.test(kana)) return null;
  return { id: 'custom', who: 'self', kanji, kana, romaji, en };
}

// The same question asked twice gets the same answer in flight. The card is
// first asked at a pause in the staff's speech; when Chrome commits that same
// sentence 1.7-4.6 s later, the answer already running is reused instead of
// starting over - that is what lets the authoritative card skip the wait.
const inFlight = new Map();
const IN_FLIGHT_LIMIT = 80;
function remembered(key, run) {
  if (inFlight.has(key)) return inFlight.get(key);
  const promise = run();
  inFlight.set(key, promise);
  promise.catch(() => inFlight.delete(key));          // a failure is never reused
  if (inFlight.size > IN_FLIGHT_LIMIT) inFlight.delete(inFlight.keys().next().value);
  return promise;
}

function streamLane(lane, system, content, onText) {
  return streamClaude({ ...lane, system, messages: [{ role: 'user', content }] }, onText);
}

// Card lanes carry the whole call, so the system prompt and the call so far
// are marked for caching: they repeat on every request and only the newest
// transcript changes. Measured: 2,527 of 2,572 tokens read from cache. It
// costs nothing in speed and cuts the input bill for these lanes ~10x.
function verdictLane(lane, system, transcript, recent) {
  const content = recent.length
    ? [{ type: 'text', text: `Call so far:\n${recent.map(r => `${r.who === 'you' ? 'Geoffrey' : 'Staff'}: ${r.ja}`).join('\n')}\n\n`,
         cache_control: { type: 'ephemeral' } },
       { type: 'text', text: `Transcript to judge:\n${transcript}` }]
    : `Transcript to judge:\n${transcript}`;
  const cachedSystem = [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }];
  return remembered(JSON.stringify([lane.model, system, content]),
    () => streamLane(lane, cachedSystem, content));
}

// Haiku and Sonnet translate the same words at once. Haiku's text shows first;
// Sonnet's takes over as soon as it says at least as much, or finishes - so the
// line never shrinks mid-read. Only Sonnet's finish counts as done, unless
// Sonnet failed, in which case Haiku's does.
function raceEnglish(system, transcript, onEnglish, onError) {
  const lanes = { fast: { text: '', done: false, failed: false }, best: { text: '', done: false, failed: false } };
  const emit = () => {
    const { fast, best } = lanes;
    const useBest = best.done || (!best.failed && best.text.length >= fast.text.length);
    const pick = useBest ? best : fast;
    if (!pick.text && !pick.done) return;
    onEnglish(parseInterpretation(pick.text), { done: useBest ? best.done : (fast.done && best.failed) });
  };
  const run = (name, lane) => streamLane(lane, system, transcript, text => { lanes[name].text = text; emit(); })
    .then(text => { lanes[name].text = text; lanes[name].done = true; emit(); })
    .catch(error => {
      lanes[name].failed = true;
      const other = lanes[name === 'fast' ? 'best' : 'fast'];
      if (other.failed) onError(error);
      else if (name === 'best' && lanes.fast.done) emit();
    });
  run('fast', FAST_ENGLISH_LANE);
  run('best', ENGLISH_LANE);
}

// Fires all three lanes. Callbacks arrive in any order; onVerdict says whether
// it is the final one. The caller decides what still belongs on screen.
// early: the sentence is still being spoken. Only the fast lanes run - the
// English and the quick card - and the authoritative final verdict waits for
// the finished sentence, so it never judges half a question.
// With the call connected, the audio comes from the Yolla tab, which never
// carries his own voice: everything heard is the restaurant. Asking "is this
// him?" there only does harm - staff echo his words back (4人ですね, お名前は),
// and a fragment like お名前 was judged to be his line and never translated.
const SELF_CLAUSE = ENGLISH_SYSTEM.indexOf('If it is Geoffrey himself speaking');
export const ENGLISH_CALL_SYSTEM = `${ENGLISH_SYSTEM.slice(0, SELF_CLAUSE).trimEnd()}

Everything you receive is the restaurant staff speaking: it is captured from the call audio, which never contains his own voice. Always translate. Never answer SELF.`;
export const VERDICT_CALL_SYSTEM = `${VERDICT_SYSTEM}

This transcript was captured from the call audio, which never contains his own voice: it is always the staff. Never answer SELF.`;

// A sentence still being spoken is cut off mid-way. Without this, the model
// narrated instead of translating ("CONFIRMING: November — go ahead and
// continue, waiting for the rest").
const EARLY_NOTE = `

The staff is still talking: this transcript usually stops mid-sentence. Translate only the words that are there, as far as they go. Never comment on it being incomplete, never guess the rest, never add notes.`;
export const EARLY_ENGLISH_SYSTEM = `${ENGLISH_SYSTEM}\n${EARLY_NOTE}`;
const EARLY_ENGLISH_CALL_SYSTEM = `${ENGLISH_CALL_SYSTEM}\n${EARLY_NOTE}`;

// final: also run the authoritative Opus 5.5 verdict on an early (still being
// spoken) transcript - used at a longer pause, so its answer is already in
// flight when Chrome commits the sentence.
// prefetch: start the quick card for these words without reporting it. The
// card is shown only at a pause; by then the request for exactly those words
// has been running since they arrived, and the pause reuses it (measured: the
// card waited ~2.25 s after the last word when it was only asked at the pause).
export function interpret(transcript, { recent = [], onEnglish, onVerdict, onError, early = false, verdict = true, translate = true, staffOnly = false, final: speculate = false, prefetch = false }) {
  // translate: false when the staff already spoke English - only the card is needed.
  const englishSystem = staffOnly ? (early ? EARLY_ENGLISH_CALL_SYSTEM : ENGLISH_CALL_SYSTEM)
    : (early ? EARLY_ENGLISH_SYSTEM : ENGLISH_SYSTEM);
  if (translate) {
    // Racing needs no SELF judgement, so only with the call connected: on
    // speakerphone Haiku took all three of his own echoed lines for staff.
    if (staffOnly) raceEnglish(englishSystem, transcript, (r, meta) => onEnglish?.(r, meta), e => onError?.('english', e));
    else streamLane(ENGLISH_LANE, englishSystem, transcript,
      text => onEnglish?.(parseInterpretation(text), { done: false }))
      .then(text => onEnglish?.(parseInterpretation(text), { done: true }))
      .catch(error => onError?.('english', error));
  }
  if (prefetch && !verdict) {
    verdictLane(QUICK_LANE, staffOnly ? VERDICT_CALL_SYSTEM : VERDICT_SYSTEM, transcript.trim(), recent).catch(() => {});
  }
  const lanes = !early || speculate ? [[QUICK_LANE, false], [FINAL_LANE, true]] : verdict ? [[QUICK_LANE, false]] : [];
  for (const [lane, final] of lanes) {
    verdictLane(lane, staffOnly ? VERDICT_CALL_SYSTEM : VERDICT_SYSTEM, transcript.trim(), recent)
      .then(text => onVerdict?.(parseInterpretation(text), { final }))
      .catch(error => onError?.(final ? 'final' : 'quick', error));
  }
}

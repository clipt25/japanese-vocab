import { getKey } from './fallback.js';
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
export const QUICK_LANE = { model: 'claude-opus-5', max_tokens: 250, thinking: { type: 'disabled' } };
export const FINAL_LANE = { model: 'claude-opus-5-5', max_tokens: 2000, output_config: { effort: 'low' } };

const ENDPOINT = 'https://api.anthropic.com/v1/messages';

const BOOKING = 'Tuesday 3 November 2026, 19:00, 4 people, tatami room (お座敷), name ジェフリー (Geoffrey), phone +62 812 8063 7730 (no Japanese number), email geoffrejames@gmail.com, budget about ¥20,000 per person';

export const ENGLISH_SYSTEM = `You are a live interpreter for Geoffrey, a JLPT N4 Japanese learner on a phone call booking dinner at すき焼割烹 日山 (Hiyama, Tokyo). Each message is a raw Chrome speech-recognition transcript of one utterance the laptop mic picked up: no punctuation, possibly mis-recognised words, and sometimes Geoffrey's own voice, because he is on speakerphone.

His booking request: ${BOOKING}.

Answer with one line only: what was said, in short plain English he can read in two seconds. Faithful, not polished, no preamble such as "The staff said". Put anything that differs from his booking or costs money (a different time, date or party size, fees, deposits, time limits) in CAPITALS.

If it is Geoffrey himself speaking (it matches or closely resembles one of his lines below), answer exactly: SELF
Staff often read his details back to him (復唱): his name, date, time, number of people, phone number or email, ending in でございますね or でよろしいでしょうか. That is the staff speaking - translate it.

His lines:
${SELF.map(p => p.kanji).join('\n')}`;

export const VERDICT_SYSTEM = `You steer Geoffrey, a JLPT N4 Japanese learner, through a live phone call booking dinner at すき焼割烹 日山 (Hiyama, Tokyo). You receive the call so far and, last, a raw Chrome speech-recognition transcript of one utterance the laptop mic picked up: no punctuation, possibly mis-recognised words, and sometimes Geoffrey's own voice, because he is on speakerphone.

His booking request: ${BOOKING}.

Decide two things and answer with exactly one line, nothing else:
- If the transcript is Geoffrey himself speaking (it matches or closely resembles one of his script lines, or is the caller's side of the conversation), answer: SELF. Staff reading his details back to him (復唱: his name, date, time, phone number or email, ending in でございますね or でよろしいでしょうか) is the staff, not him.
- Otherwise it is the staff. Answer REPLY <id> with the one line from his script he should say next.
- If no script line fits but he clearly needs to answer (for example the staff offers a choice of times, or asks something his script does not cover), write the line for him instead: SAY <Japanese> | <the same in hiragana/katakana only, no kanji or digits> | <romaji with macrons> | <English>. Short, polite (です/ます), easy for an N4 speaker to say. Use only his booking facts and what the staff offered; never invent anything else about him.
- If he does not need to say anything yet (the staff asked him to wait, or is still talking), answer REPLY none.

The call so far is authoritative. Once Geoffrey has accepted a change the staff offered (for example 17:00 or 19:30 instead of 19:00), that is his booking now: when the staff read it back, he confirms it. Never steer him back to his original request after he has agreed to something else.

Some script lines state his original details (self-datetime, self-date-only, self-time-only, self-party, self-confirm say 3 November, 7pm, 4 people). If the staff has changed any of those during the call (for example agreed 19:30 instead of 19:00), never suggest a line that states the old detail — prefer self-yes-right, self-yes-request or self-thanks.

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

// One retry for the failures a Jakarta-to-US line actually produces: a dropped
// connection, an overloaded or rate-limited API. A silent line on the call is
// worse than one that arrives 300ms late.
const RETRY_STATUS = new Set([429, 500, 502, 503, 504, 529]);

async function streamLane(lane, system, content, onText) {
  try {
    return await streamOnce(lane, system, content, onText);
  } catch (error) {
    if (!error.retryable) throw error;
    await new Promise(resolve => setTimeout(resolve, 300));
    return streamOnce(lane, system, content, onText);
  }
}

async function streamOnce(lane, system, content, onText) {
  let response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': getKey(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ ...lane, stream: true, system, messages: [{ role: 'user', content }] }),
    });
  } catch (error) {
    throw Object.assign(new Error(`network: ${error.message}`), { retryable: true });
  }
  if (!response.ok) {
    throw Object.assign(new Error(`API error ${response.status}`), { retryable: RETRY_STATUS.has(response.status) });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let end;
    while ((end = buffer.indexOf('\n\n')) >= 0) {
      const data = buffer.slice(0, end).split('\n').find(l => l.startsWith('data: '));
      buffer = buffer.slice(end + 2);
      if (!data) continue;
      const event = JSON.parse(data.slice(6));
      // Thinking blocks (Opus 5.5 always thinks) stream as their own deltas.
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        text += event.delta.text;
        onText?.(text);
      } else if (event.type === 'error') {
        // overloaded_error mid-stream is worth one more try; others are not.
        throw Object.assign(new Error(event.error?.message ?? 'Stream error'),
                            { retryable: event.error?.type === 'overloaded_error' && !text });
      }
    }
  }
  return text;
}

// Fires all three lanes. Callbacks arrive in any order; onVerdict says whether
// it is the final one. The caller decides what still belongs on screen.
export function interpret(transcript, { recent = [], onEnglish, onVerdict, onError }) {
  streamLane(ENGLISH_LANE, ENGLISH_SYSTEM, transcript, text => onEnglish?.(parseInterpretation(text)))
    .catch(error => onError?.('english', error));
  const content = buildVerdictMessage(transcript, recent);
  for (const [lane, final] of [[QUICK_LANE, false], [FINAL_LANE, true]]) {
    streamLane(lane, VERDICT_SYSTEM, content)
      .then(text => onVerdict?.(parseInterpretation(text), { final }))
      .catch(error => onError?.(final ? 'final' : 'quick', error));
  }
}

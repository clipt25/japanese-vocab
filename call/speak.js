// Rehearsal aid. Deliberately slower than natural speed.
//
// Two non-obvious rules baked in here:
//  1. Speak the KANA, never the kanji. macOS reads 11月3日 as さんにち — the
//     exact error the script's loudest warning is about — and reads 8063 as
//     "eight thousand sixty-three" instead of digit by digit.
//  2. On speakerphone this plays down the line to the restaurant AND back into
//     the laptop mic. The gate lets the caller pause recognition around it.

const REHEARSAL_RATE = 0.8;
let japaneseVoice = null;
let gate = { before() {}, after() {} };

function pickVoice() {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  japaneseVoice =
    voices.find(v => v.lang === 'ja-JP') ??
    voices.find(v => v.lang?.startsWith('ja')) ?? null;
}

export function initVoices() {
  if (!('speechSynthesis' in window)) return;
  pickVoice();
  // Chrome populates the voice list asynchronously — measured 0 voices at first
  // script execution, 180 moments later.
  window.speechSynthesis.addEventListener('voiceschanged', pickVoice);
}

export function hasJapaneseVoice() { return japaneseVoice !== null; }
export function setSpeechGate(next) { gate = next; }

// onEnd fires exactly once when the utterance finishes, errors, or — because
// Chrome is known to drop the end event on some utterances — when a generous
// time estimate runs out. The rehearsal loop depends on it to open the mic for
// the caller's turn, so a lost event must not leave the call hanging.
export function speak(phrase, { rate = REHEARSAL_RATE, onEnd } = {}) {
  const text = typeof phrase === 'string' ? phrase : phrase?.kana;
  if (!('speechSynthesis' in window) || !text) { onEnd?.(); return false; }

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(watchdog);
    gate.after();
    onEnd?.();
  };
  // ~140ms per kana at rate 1.0, stretched for slower rates, plus headroom.
  const watchdog = setTimeout(finish, (text.length * 140) / rate + 2500);

  window.speechSynthesis.cancel();
  // Chrome silently drops an utterance queued in the same tick as cancel().
  setTimeout(() => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = rate;
    if (japaneseVoice) utterance.voice = japaneseVoice;
    utterance.onstart = () => gate.before();
    utterance.onend = finish;
    utterance.onerror = finish;
    window.speechSynthesis.speak(utterance);
  }, 0);
  return true;
}

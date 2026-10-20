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

// The first ja-JP voice macOS lists is "Eddy", one of the Eloquence voices.
// Played through a 300-3400Hz phone band and transcribed by Whisper, Eddy
// dropped the whole 8063 group from the phone number at every rate tried;
// Kyoko read it back digit-perfect every time. So never take list order.
const PREFERRED = [/^Kyoko/, /^Otoya/, /^O-?ren/, /Google 日本語/, /Microsoft (Nanami|Keita)/];
const ELOQUENCE = /^(Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley)\b/;

function pickVoice() {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const ja = voices.filter(v => v.lang === 'ja-JP' || v.lang?.startsWith('ja'));
  japaneseVoice =
    PREFERRED.map(pattern => ja.find(v => pattern.test(v.name))).find(Boolean) ??
    ja.find(v => !ELOQUENCE.test(v.name)) ??
    ja[0] ?? null;
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

// Speech that starts before the whole line exists: sentences are added as they
// stream in and spoken in order, back to back. The gate closes once, on the
// first sentence, and opens once, after the last; onEnd fires once, after
// close() and the final sentence - or when a generous estimate for everything
// queued runs out, since Chrome can drop end events.
export function speakSequence({ rate = REHEARSAL_RATE, onEnd } = {}) {
  const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
  let pending = 0;
  let closed = false;
  let finished = false;
  let started = false;
  let ready = false;              // Chrome drops an utterance queued in the same tick as cancel()
  const waiting = [];
  let deadline = Date.now();
  let watchdog = null;

  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(watchdog);
    if (started) gate.after();
    onEnd?.();
  };
  const settle = () => { if (closed && pending === 0) finish(); };
  const say = utterance => synth.speak(utterance);

  synth?.cancel();
  setTimeout(() => { ready = true; waiting.splice(0).forEach(say); }, 0);

  return {
    add(text) {
      if (finished || !synth || !text?.trim()) return;
      pending += 1;
      let done = false;
      const one = () => { if (done) return; done = true; pending -= 1; settle(); };
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = rate;
      if (japaneseVoice) utterance.voice = japaneseVoice;
      utterance.onstart = () => { if (!started) { started = true; gate.before(); } };
      utterance.onend = one;
      utterance.onerror = one;
      deadline = Math.max(deadline, Date.now()) + (text.length * 140) / rate + 1500;
      if (ready) say(utterance); else waiting.push(utterance);
    },
    // The watchdog starts only once the line is complete: while it is still
    // streaming in, a quiet gap is the model writing, not a lost end event.
    close() {
      closed = true;
      settle();
      if (!finished) watchdog = setTimeout(finish, Math.max(0, deadline - Date.now()) + 1000);
    },
    cancel() { closed = true; synth?.cancel(); finish(); },
    get started() { return started || pending > 0; },
  };
}

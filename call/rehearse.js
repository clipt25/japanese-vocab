import { speak } from './speak.js';

// The rehearsal turn loop: staff speaks → mic opens → he answers → Claude replies
// in character → repeat. Strict turn-taking matters: the mic is closed while the
// staff line plays, so the laptop never transcribes its own voice as his reply.

const STAFF_RATE = 1.0;          // natural speed — rehearse against the real pace
const SLOW_RATE = 0.75;          // for the "slower" replay button only
const SILENCE_MS = 2200;         // a pause this long means he has finished speaking.
                                 // Generous on purpose: an N4 speaker pauses mid-sentence.
const RESTART_BUDGET = 6;

export function createRehearsal({ sim, onStaff, onYou, onStatus, onEnd, onError }) {
  const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  const turns = [];
  let state = 'idle';            // idle | staff | you | thinking | ended
  let lastStaff = null;
  let recognition = null;
  let heard = '';
  let silenceTimer = null;
  let restarts = 0;
  let micDenied = false;        // once refused, stop asking for the rest of the session

  function setState(next) { state = next; onStatus(next); }

  function stopListening() {
    clearTimeout(silenceTimer);
    const r = recognition;
    recognition = null;          // cleared first, so its onend will not restart it
    try { r?.abort(); } catch { /* already stopped */ }
  }

  function playStaff(turn, rate = STAFF_RATE) {
    stopListening();
    setState('staff');
    speak(turn.kana || turn.ja, {
      rate,
      onEnd: () => {
        if (state !== 'staff') return;
        if (turn.end) finish();
        else listen();
      },
    });
  }

  function staffSays(turn) {
    lastStaff = turn;
    turns.push({ who: 'staff', ...turn });
    onStaff(turn);
    playStaff(turn);
  }

  function listen() {
    heard = '';
    restarts = 0;
    setState('you');
    if (Recognition && !micDenied) openMic();
  }

  function openMic() {
    const rec = new Recognition();
    recognition = rec;
    rec.lang = 'ja-JP';
    rec.continuous = true;
    rec.interimResults = true;

    let finalText = '';
    rec.onresult = event => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const r = event.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      heard = (finalText + interim).trim();
      onYou({ text: heard, final: false });
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => { if (heard) submit(heard); }, SILENCE_MS);
    };
    rec.onerror = event => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        micDenied = true;
        recognition = null;
        onError('Microphone blocked — type your replies');
        return;
      }
      onError(`Microphone: ${event.error}`);
    };
    // Chrome ends a session on long silence. While it is still his turn, reopen —
    // within a budget, so a dead mic cannot spin.
    rec.onend = () => {
      if (state !== 'you' || recognition !== rec) return;
      if (++restarts > RESTART_BUDGET) { onError('Microphone stopped — type your reply instead'); return; }
      setTimeout(() => { if (state === 'you' && recognition === rec) { try { rec.start(); } catch {} } }, 300);
    };
    try { rec.start(); } catch (error) { onError(`Microphone: ${error.name}`); }
  }

  async function submit(text) {
    const said = text?.trim();
    if (!said || state !== 'you') return;
    stopListening();
    turns.push({ who: 'you', text: said });
    onYou({ text: said, final: true });
    setState('thinking');
    try {
      staffSays(await sim.reply(said));
    } catch (error) {
      turns.pop();
      onError(error.message);
      listen();                  // let him try the same turn again
    }
  }

  function finish() {
    stopListening();
    window.speechSynthesis?.cancel();
    setState('ended');
    onEnd(turns);
  }

  return {
    start() { staffSays(sim.opening()); },
    submit,                                        // typed reply, or a panic phrase
    sendNow() { if (heard) submit(heard); },       // "I'm done talking"
    // Close the mic without ending his turn — while he types, or while a ▶
    // button plays, so the laptop does not transcribe its own voice as his reply.
    hold() { if (state === 'you') stopListening(); },
    resume() { if (state === 'you' && !recognition && Recognition && !micDenied) openMic(); },
    repeat() { if (lastStaff && state !== 'thinking') playStaff(lastStaff); },
    repeatSlowly() { if (lastStaff && state !== 'thinking') playStaff(lastStaff, SLOW_RATE); },
    end() { if (state !== 'ended') finish(); },
    get state() { return state; },
    get turns() { return turns; },
  };
}

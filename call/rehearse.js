import { speak, speakSequence } from './speak.js';

// The rehearsal turn loop: staff speaks → mic opens → he answers → Claude replies
// in character → repeat. Strict turn-taking matters: the mic is closed while the
// staff line plays, so the laptop never transcribes its own voice as his reply.

const STAFF_RATE = 1.0;          // natural speed — rehearse against the real pace
const SLOW_RATE = 0.75;          // for the "slower" replay button only
const STAFF_SLOW_RATE = 0.85;    // once he has asked them to speak slowly, they do
// When he has finished speaking. Chrome marks a phrase final once he pauses;
// after that, half a second more of quiet ends his turn. Without a final, a
// longer quiet does. Was a flat 2.2 s, which on its own was a third of the wait
// before the staff answered. He can still press Send to go sooner.
const SILENCE_AFTER_FINAL_MS = 500;
const SILENCE_MS = 1200;
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

  function playStaff(turn, rate = turn.slow ? STAFF_SLOW_RATE : STAFF_RATE) {
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
      let gotFinal = false;
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const r = event.results[i];
        if (r.isFinal) { finalText += r[0].transcript; gotFinal = true; }
        else interim += r[0].transcript;
      }
      heard = (finalText + interim).trim();
      onYou({ text: heard, final: false });
      clearTimeout(silenceTimer);
      const quiet = gotFinal && !interim.trim() ? SILENCE_AFTER_FINAL_MS : SILENCE_MS;
      silenceTimer = setTimeout(() => { if (heard) submit(heard); }, quiet);
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
    // The staff start speaking the moment the first kana sentence has streamed
    // in, and the radar gets their line as soon as its Japanese is whole -
    // neither waits for the romaji and English still being written.
    let voice = null;
    let spoken = 0;
    let shown = false;
    let ending = false;
    const afterSpeaking = () => {
      if (state !== 'staff') return;
      if (ending) finish(); else listen();
    };
    try {
      const turn = await sim.reply(said, {
        onProgress: ({ sentences, slow, ja }) => {
          if (state !== 'thinking' && state !== 'staff') return;
          if (!voice && sentences.length) {
            setState('staff');
            voice = speakSequence({ rate: slow ? STAFF_SLOW_RATE : STAFF_RATE, onEnd: afterSpeaking });
          }
          while (voice && spoken < sentences.length) voice.add(sentences[spoken++]);
          if (ja && !shown) { shown = true; onStaff({ ja, kana: '', romaji: '', en: '', slow, end: false }); }
        },
      });
      lastStaff = turn;
      turns.push({ who: 'staff', ...turn });
      if (!shown) onStaff(turn);
      if (!voice) { playStaff(turn); return; }     // nothing streamed: speak it whole
      const rest = (turn.kana || '').split(/(?<=[。！？!?])/).map(p => p.trim()).filter(Boolean).slice(spoken);
      rest.forEach(sentence => voice.add(sentence));
      ending = turn.end;
      voice.close();
    } catch (error) {
      voice?.cancel();
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

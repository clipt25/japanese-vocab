import { match } from './match.js';
import { STAFF } from './phrases.js';

const SETTLE_AFTER = 2;
const FIRST_BACKOFF_MS = 250;
const MAX_BACKOFF_MS = 4000;
const RESTART_BUDGET = 40;

// Chrome ends a recognition session on its own after roughly 60 s, and whatever
// is said while the replacement starts up is lost. On the call track the
// replacement is started BEFORE the old session stops - verified in his Chrome:
// two recognisers can listen to one track at once, and the hand-over lost
// nothing. It happens at an utterance boundary once a session is this old...
const HANDOFF_AFTER_MS = 40_000;
// ...or, if nobody has finished a sentence by then, at this age regardless.
const HANDOFF_BY_MS = 52_000;

// isSecureContext is TRUE on file:// — the W3C spec lists file as a trustworthy
// origin — so it is not enough on its own. What actually breaks under file://
// is ES module CORS (origin null), which blanks the page before any mic code
// runs. Check the protocol explicitly.
export function isSecureForMic() {
  return window.isSecureContext === true && location.protocol !== 'file:';
}

export function createListener({ onMatch, onStatus, onRaw, onInterim,
                                 handoffAfterMs = HANDOFF_AFTER_MS, handoffByMs = HANDOFF_BY_MS }) {
  const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (!Recognition) return null;

  let wanted = false;
  let paused = false;
  let blocked = false;          // permission refused: keep saying so
  let lastTopId = null;
  let stableFor = 0;
  let backoff = FIRST_BACKOFF_MS;
  let restarts = 0;
  // Where the audio comes from. null = the laptop microphone (speakerphone in
  // the room). A MediaStreamTrack = the call itself, captured from the Yolla tab
  // while he wears earphones: clean audio, no room echo, and only the staff.
  let track = null;
  let current = null;           // the session whose results drive the screen
  let startedAt = 0;
  let handingOff = false;
  let ageTimer = null;

  function handle(transcript, isFinal) {
    restarts = 0;                       // recognition is alive; reset the budget
    onRaw?.(transcript, isFinal);
    const result = match(transcript, STAFF);
    const topId = result.top?.phrase.id ?? null;

    if (topId === lastTopId) {
      stableFor += 1;
      if (stableFor > SETTLE_AFTER && !isFinal) return;   // stop the flicker
    } else {
      lastTopId = topId;
      stableFor = 0;
    }
    onMatch(result, { transcript, isFinal });
  }

  function create() {
    const r = new Recognition();
    r.lang = 'ja-JP';
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;

    r.onresult = event => {
      // A session being handed over still delivers the sentence it was part-way
      // through - that is the point of stop() over abort() - but nothing newer.
      const live = r === current;
      if (!live && !r.retiring) return;
      let sawFinal = false;
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const res = event.results[i];
        if (res.isFinal) { handle(res[0].transcript, true); sawFinal = true; }
        else if (live) handle(res[0].transcript, false);
      }
      if (live && onInterim) {
        // The whole sentence so far. Chrome splits one utterance across several
        // provisional results, so one segment alone is often half a sentence.
        const interim = [...event.results].filter(res => !res.isFinal)
          .map(res => res[0].transcript).join('').trim();
        if (interim) onInterim(interim);
      }
      if (live && sawFinal && track && Date.now() - startedAt > handoffAfterMs) handoff();
    };

    r.onerror = event => {
      if (r !== current) return;
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        wanted = false;
        blocked = true;
        onStatus('mic blocked — check browser permission');
        return;
      }
      onStatus(`error: ${event.error}`);
    };

    // Chrome caps a session at ~60s, so a 4-minute call crosses several restarts.
    // Backoff and a budget matter: without them a persistent error (wifi drop)
    // becomes error -> end -> start -> error at ~1000 iterations per second.
    r.onend = () => {
      if (r !== current) return;          // a retired session ending is expected
      // onend always follows onerror. Saying 'idle' here would erase the one
      // message that tells him why the radar is deaf.
      if (!wanted || paused) { if (!wanted && !blocked) onStatus('idle'); return; }
      restarts += 1;
      if (restarts > RESTART_BUDGET) {
        wanted = false;
        onStatus('recognition gave up — use the script');
        return;
      }
      // A healthy session that simply ran out restarts at once; only repeated
      // failures wait, with a growing delay.
      const delay = restarts === 1 ? 0 : backoff;
      setTimeout(() => {
        if (!wanted || paused || r !== current) return;
        try {
          begin();
          onStatus(track ? 'listening to the call' : 'listening');
        } catch (error) {
          // Never swallow this. An empty catch here leaves recognition dead while
          // the status still reads "listening".
          onStatus(`restart failed: ${error.name}`);
        }
      }, delay);
      if (restarts > 1) backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
    };
    return r;
  }

  // Every start - first, resume, restart, hand-over - goes through here, so a
  // long call can never quietly fall back to the mic.
  function begin() {
    current = create();
    startedAt = Date.now();
    if (track) current.start(track);
    else current.start();
  }

  // Start the successor on the call track, and stop the old session only once
  // the new one is actually capturing. stop(), never abort(): abort discards the
  // sentence in flight, which is exactly what was being lost before.
  function handoff() {
    if (!track || handingOff || !current) return;
    handingOff = true;
    const old = current;
    old.retiring = true;
    const next = create();
    next.onaudiostart = () => { try { old.stop(); } catch { /* already ended */ } handingOff = false; };
    current = next;
    startedAt = Date.now();
    try { next.start(track); }
    catch (error) { current = old; old.retiring = false; handingOff = false; onStatus(`hand-over failed: ${error.name}`); }
  }

  function watchAge() {
    clearInterval(ageTimer);
    ageTimer = setInterval(() => {
      if (wanted && !paused && track && Date.now() - startedAt > handoffByMs) handoff();
    }, 1000);
  }

  return {
    start() {
      wanted = true; paused = false; blocked = false; lastTopId = null; stableFor = 0;
      backoff = FIRST_BACKOFF_MS; restarts = 0;
      try { begin(); onStatus(track ? 'listening to the call' : 'listening'); watchAge(); }
      catch (error) { onStatus(`could not start: ${error.name}`); }
    },
    stop() {
      wanted = false; paused = false; clearInterval(ageTimer);
      try { current?.stop(); } catch { /* not running */ }
      onStatus('idle');
    },
    // Used while TTS plays, so the laptop does not transcribe its own voice.
    pause() { if (!wanted) return; paused = true; try { current?.stop(); } catch {} onStatus('paused (speaking)'); },
    resume() {
      if (!wanted || !paused) return;
      paused = false;
      try { begin(); onStatus(track ? 'listening to the call' : 'listening'); }
      catch { onStatus('listening'); }
    },
    get running() { return wanted; },
    get source() { return track ? 'call' : 'mic'; },
    // Switch audio source. If listening, start on the new source at once and let
    // the old session finish the sentence it was hearing.
    setSource(next) {
      track = next ?? null;
      if (!wanted) return;
      const old = current;
      if (old) old.retiring = true;
      try { begin(); } catch (error) { onStatus(`could not switch: ${error.name}`); }
      try { old?.stop(); } catch { /* not running */ }
    },
  };
}

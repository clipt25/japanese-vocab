import { match } from './match.js';
import { STAFF } from './phrases.js';

const SETTLE_AFTER = 2;
const FIRST_BACKOFF_MS = 250;
const MAX_BACKOFF_MS = 4000;
const RESTART_BUDGET = 40;

// isSecureContext is TRUE on file:// — the W3C spec lists file as a trustworthy
// origin — so it is not enough on its own. What actually breaks under file://
// is ES module CORS (origin null), which blanks the page before any mic code
// runs. Check the protocol explicitly.
export function isSecureForMic() {
  return window.isSecureContext === true && location.protocol !== 'file:';
}

export function createListener({ onMatch, onStatus, onRaw }) {
  const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (!Recognition) return null;

  const recognition = new Recognition();
  recognition.lang = 'ja-JP';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let wanted = false;
  let paused = false;
  let lastTopId = null;
  let stableFor = 0;
  let backoff = FIRST_BACKOFF_MS;
  let restarts = 0;

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

  recognition.onresult = event => {
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      handle(event.results[i][0].transcript, event.results[i].isFinal);
    }
  };

  recognition.onerror = event => {
    if (event.error === 'no-speech') return;
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      wanted = false;
      onStatus('mic blocked — check browser permission');
      return;
    }
    onStatus(`error: ${event.error}`);
  };

  // Chrome caps a session at ~60s, so a 4-minute call crosses several restarts.
  // Backoff and a budget matter: without them a persistent error (wifi drop)
  // becomes error -> end -> start -> error at ~1000 iterations per second.
  recognition.onend = () => {
    if (!wanted || paused) { if (!wanted) onStatus('idle'); return; }
    restarts += 1;
    if (restarts > RESTART_BUDGET) {
      wanted = false;
      onStatus('recognition gave up — use the script');
      return;
    }
    setTimeout(() => {
      if (!wanted || paused) return;
      try {
        recognition.start();
        backoff = FIRST_BACKOFF_MS;
        onStatus('listening');
      } catch (error) {
        // Never swallow this. An empty catch here leaves recognition dead while
        // the status still reads "listening".
        onStatus(`restart failed: ${error.name}`);
      }
    }, backoff);
    backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
  };

  return {
    start() {
      wanted = true; paused = false; lastTopId = null; stableFor = 0;
      backoff = FIRST_BACKOFF_MS; restarts = 0;
      try { recognition.start(); onStatus('listening'); }
      catch (error) { onStatus(`could not start: ${error.name}`); }
    },
    stop() { wanted = false; paused = false; recognition.stop(); onStatus('idle'); },
    // Used while TTS plays, so the laptop does not transcribe its own voice.
    pause() { if (!wanted) return; paused = true; recognition.stop(); onStatus('paused (speaking)'); },
    resume() {
      if (!wanted || !paused) return;
      paused = false;
      try { recognition.start(); onStatus('listening'); }
      catch { onStatus('listening'); }
    },
    get running() { return wanted; },
  };
}

// Apple's speech recogniser, from inside the iPhone app, behind the Web Speech
// API that listen.js already drives.
//
// Why: the iPhone app (ios/) is only a window onto this page - every behaviour
// lives here, so a web change reaches the phone without a rebuild. What the app
// adds is a better ear: SFSpeechRecognizer for ja-JP with live partial words,
// where Safari's webkitSpeechRecognition is unreliable (interim results that
// arrive late or never, and reported dead once the page is on the home screen).
//
// The app streams words; this side decides everything else. In particular it
// decides when a sentence has ENDED: Apple's recogniser in continuous mode never
// calls a sentence final on its own, so a pause in the words commits it. That
// pause, and on-device vs server recognition, are tuned here - not in Swift.

// Words unchanged this long and the sentence is over. It does not hold up the
// English - that is translated word by word as it arrives - only the line's
// closing and its kana/romaji. Measured on his iPhone: at 0.9 s slow polite
// speech was cut mid-sentence (電話は3 | 階に出ましょう), at 1.2 s a lecture ran
// on as one 22-second line. Chrome takes 1.7-4.6 s.
export const COMMIT_AFTER_MS = 1000;

// 'device' = on-device ja-JP model (no network, no 1-minute cap), 'server' =
// Apple's servers, 'auto' = on-device when the phone has the model.
export const DEFAULT_OPTIONS = {
  onDevice: 'auto',
  // The app runs one recognition stream for the call and replaces it only at
  // a sentence break once it is this old (Apple's servers stop at 60 s).
  rotateDeviceMs: 240_000,
  rotateServerMs: 50_000,
  // Chrome's ja-JP transcripts carry no 。、 and the matcher was tuned on those.
  punctuation: false,
  // Names Apple's recogniser would otherwise not know.
  contextualStrings: ['ジェフリー', '名様', 'ご予約', 'かしこまりました'],
};

function notSupported(message) {
  const error = new Error(message);
  error.name = 'NotSupportedError';
  return error;
}

export function createNativeRecognition({ post, setTimer = setTimeout, clearTimer = clearTimeout,
                                          commitAfterMs = COMMIT_AFTER_MS, options = {} }) {
  const tuning = { ...DEFAULT_OPTIONS, ...options };
  let owner = null;          // the recogniser the app is listening for
  let sessions = 0;
  let pauseTimer = null;

  function retire(r) {
    if (r._ended) return;
    r._ended = true;
    // Async, as a browser does: listen.js expects onend after start() returns.
    setTimeout(() => r.onend?.(), 0);
  }

  class NativeRecognition {
    constructor() {
      this.lang = 'ja-JP';
      this.continuous = false;
      this.interimResults = false;
      this.maxAlternatives = 1;
      this._results = [];
      this._index = new Map();     // the app's segment number -> index in _results
      this._ended = true;
      this._session = 0;
    }

    start(track) {
      // A phone cannot capture another app's call audio; there is no track.
      if (track) throw notSupported('The iPhone app listens through the microphone only');
      if (owner && owner !== this) retire(owner);
      owner = this;
      this._ended = false;
      this._results = [];
      this._index = new Map();
      this._session = ++sessions;
      post({ cmd: 'start', session: this._session, lang: this.lang,
             interim: this.interimResults, ...tuning });
    }

    stop() {
      if (owner !== this) { retire(this); return; }
      clearTimer(pauseTimer);
      post({ cmd: 'stop', session: this._session });
    }

    abort() {
      if (owner !== this) { retire(this); return; }
      clearTimer(pauseTimer);
      post({ cmd: 'abort', session: this._session });
    }
  }

  function deliver(seg, text, isFinal) {
    const r = owner;
    if (!r) return;
    let index = r._index.get(seg);
    // A segment that ends without a single word was silence, not a line.
    if (index === undefined && isFinal && !text) return;
    if (index === undefined) { index = r._results.length; r._index.set(seg, index); }
    const result = [{ transcript: text, confidence: 0 }];
    result.isFinal = isFinal;
    r._results[index] = result;
    r.onresult?.({ resultIndex: index, results: r._results });
  }

  function receive(event) {
    switch (event.type) {
      case 'start':
      case 'audiostart':
        if (owner && event.session === owner._session) owner[`on${event.type}`]?.();
        break;
      case 'partial':
        deliver(event.seg, event.text, false);
        clearTimer(pauseTimer);
        pauseTimer = setTimer(() => post({ cmd: 'commit' }), commitAfterMs);
        break;
      case 'final':
        if (owner?._index.get(event.seg) === owner?._results.length - 1) clearTimer(pauseTimer);
        deliver(event.seg, event.text, true);
        break;
      case 'error':
        // listen.js shows only the error's name; the app says why.
        console.warn(`native speech ${event.error}: ${event.message ?? ''}`);
        owner?.onerror?.({ error: event.error, message: event.message ?? '' });
        break;
      case 'end': {
        // Only the session that was stopped ends; a late end from an older one
        // must not end the session that has already replaced it.
        if (!owner || event.session !== owner._session) break;
        const r = owner;
        owner = null;
        clearTimer(pauseTimer);
        if (!r._ended) { r._ended = true; r.onend?.(); }
        break;
      }
      default:
        break;
    }
  }

  return { Recognition: NativeRecognition, receive };
}

// Inside the iPhone app only: replace the browser's recogniser with Apple's.
// Anywhere else (Chrome on the laptop, plain Safari) this does nothing.
export function installNativeSpeech(win = globalThis) {
  const handler = win.webkit?.messageHandlers?.speech;
  if (!handler) return false;
  const asr = new URLSearchParams(win.location?.search ?? '').get('asr');
  const options = asr ? { onDevice: asr } : {};
  const { Recognition, receive } = createNativeRecognition({ post: msg => handler.postMessage(msg), options });
  win.__nativeSpeech = receive;
  // ?trace=<url>: a test run posts every event, timestamped, to a logger on the
  // Mac - so the phone's ear can be scored without a debugger attached.
  const trace = new URLSearchParams(win.location?.search ?? '').get('trace');
  // ?trace=console logs instead - an https page may not post to the Mac's
  // plain-http logger, and the app relays console lines to the device log.
  if (trace) {
    win.__nativeSpeech = event => {
      const line = JSON.stringify({ t: Date.now(), ...event });
      if (trace === 'console') console.log(`TRACE ${line}`);
      else win.fetch?.(trace, { method: 'POST', mode: 'no-cors', body: line }).catch(() => {});
      receive(event);
    };
  }
  win.SpeechRecognition = Recognition;
  win.webkitSpeechRecognition = Recognition;
  if (win.document?.documentElement) win.document.documentElement.dataset.shell = 'ios';
  return true;
}

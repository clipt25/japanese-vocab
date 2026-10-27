// Prompter mode: the call runs in Yolla on this same iPhone.
//
// Why: iOS gives the microphone and the call audio to one app at a time. The
// assistant cannot hear a call placed from the same phone, and opening its mic
// or speaking a line mid-call may cut or mute the call. So with prompter mode
// on, a live call touches no audio: no mic, no TTS. He reads the cards aloud
// and types into Ask Claude. A rehearsal is not a call - it keeps its mic and
// the staff's voice.

const KEY = 'call-prompter';

function load(storage) {
  try { return storage?.getItem(KEY) === 'on'; } catch { return false; }
}

function save(storage, on) {
  try { storage?.setItem(KEY, on ? 'on' : 'off'); } catch { /* private mode */ }
}

// isLiveCall: on the call screen and not rehearsing. micButton: the Listen
// button, disabled while it may not open the mic.
export function createPrompter({ storage = globalThis.localStorage, listener = null,
                                 micButton = null, isLiveCall }) {
  let on = load(storage);

  const audioAllowed = () => !(on && isLiveCall());

  // Call after anything that can change the answer: the toggle, starting or
  // ending a call, starting or ending a rehearsal. A mic already open when a
  // live call starts is closed - it may have been opened in prep.
  function sync() {
    if (!listener || !micButton) return;
    const allowed = audioAllowed();
    micButton.disabled = !allowed;
    if (!allowed && listener.running) {
      listener.stop();
      micButton.dataset.on = 'false';
    }
  }

  return {
    get on() { return on; },
    set(next) { on = Boolean(next); save(storage, on); sync(); },
    audioAllowed,
    sync,
  };
}

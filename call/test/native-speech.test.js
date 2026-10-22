import test from 'node:test';
import assert from 'node:assert/strict';
import { createNativeRecognition, installNativeSpeech } from '../native-speech.js';

// A fake of the iPhone app's side of the bridge: records what the page posts,
// and lets a test play back what the app would send.
function rig(overrides = {}) {
  const posted = [];
  const timers = [];
  const bridge = createNativeRecognition({
    post: msg => posted.push(msg),
    setTimer: (fn, ms) => { const t = { fn, ms, cleared: false }; timers.push(t); return t; },
    clearTimer: t => { if (t) t.cleared = true; },
    ...overrides,
  });
  const fire = () => { for (const t of timers.splice(0)) if (!t.cleared) t.fn(); };
  return { ...bridge, posted, timers, fire };
}

function started(r, b) {
  r.start();
  b.receive({ type: 'start', session: b.posted.at(-1).session });
}

test('speaks the Web Speech API that listen.js already uses', () => {
  const b = rig();
  const r = new b.Recognition();
  r.lang = 'ja-JP'; r.continuous = true; r.interimResults = true;
  const seen = [];
  r.onstart = () => seen.push('start');
  r.onresult = e => seen.push([e.resultIndex, [...e.results].map(x => [x[0].transcript, x.isFinal])]);
  started(r, b);
  assert.equal(b.posted[0].cmd, 'start');
  assert.equal(b.posted[0].lang, 'ja-JP');
  b.receive({ type: 'partial', seg: 7, text: 'お電話' });
  b.receive({ type: 'partial', seg: 7, text: 'お電話ありがとう' });
  b.receive({ type: 'final', seg: 7, text: 'お電話ありがとうございます' });
  b.receive({ type: 'partial', seg: 8, text: '何名様' });
  assert.deepEqual(seen, [
    'start',
    [0, [['お電話', false]]],
    [0, [['お電話ありがとう', false]]],
    [0, [['お電話ありがとうございます', true]]],
    [1, [['お電話ありがとうございます', true], ['何名様', false]]],
  ]);
});

test('ends a sentence after a pause, so a line is read without waiting for the app', () => {
  const b = rig({ commitAfterMs: 800 });
  const r = new b.Recognition();
  started(r, b);
  b.receive({ type: 'partial', seg: 1, text: 'かしこまりました' });
  assert.equal(b.timers.at(-1).ms, 800);
  b.receive({ type: 'partial', seg: 1, text: 'かしこまりました少々' });
  assert.equal(b.timers.filter(t => !t.cleared).length, 1, 'each new word restarts the pause');
  b.fire();
  assert.deepEqual(b.posted.at(-1), { cmd: 'commit' });
});

test('no pause timer once the sentence is final', () => {
  const b = rig();
  const r = new b.Recognition();
  started(r, b);
  b.receive({ type: 'partial', seg: 1, text: 'はい' });
  b.receive({ type: 'final', seg: 1, text: 'はい' });
  b.fire();
  assert.equal(b.posted.filter(m => m.cmd === 'commit').length, 0);
});

test('a silent segment does not produce an empty line', () => {
  const b = rig();
  const r = new b.Recognition();
  let results = 0;
  r.onresult = () => { results += 1; };
  started(r, b);
  b.receive({ type: 'final', seg: 3, text: '' });
  assert.equal(results, 0);
});

test('stop waits for the app to say it has ended, then fires onend once', () => {
  const b = rig();
  const r = new b.Recognition();
  let ends = 0;
  r.onend = () => { ends += 1; };
  started(r, b);
  r.stop();
  assert.equal(b.posted.at(-1).cmd, 'stop');
  assert.equal(ends, 0);
  b.receive({ type: 'end', session: b.posted[0].session });
  b.receive({ type: 'end', session: b.posted[0].session });
  assert.equal(ends, 1);
});

test('a late end from a stopped session never ends the session that replaced it', () => {
  // listen.js pauses around speech output and resumes straight after: the old
  // session's end can arrive after the new one has started.
  const b = rig();
  const first = new b.Recognition();
  started(first, b);
  const oldSession = b.posted.at(-1).session;
  first.stop();
  const second = new b.Recognition();
  let secondEnded = false;
  second.onend = () => { secondEnded = true; };
  started(second, b);
  b.receive({ type: 'end', session: oldSession });
  assert.equal(secondEnded, false);
});

test('starting a new recogniser retires the old one with its own onend', async () => {
  const b = rig();
  const a = new b.Recognition();
  let aEnded = false;
  a.onend = () => { aEnded = true; };
  started(a, b);
  const c = new b.Recognition();
  c.start();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(aEnded, true);
  // Stopping the retired one must not stop the microphone under the new one.
  const before = b.posted.length;
  a.stop();
  assert.equal(b.posted.length, before);
});

test('words arrive at the recogniser that is current, never a retired one', () => {
  const b = rig();
  const a = new b.Recognition();
  const c = new b.Recognition();
  const got = { a: 0, c: 0 };
  a.onresult = () => { got.a += 1; };
  c.onresult = () => { got.c += 1; };
  started(a, b);
  started(c, b);
  b.receive({ type: 'partial', seg: 1, text: 'ご予約' });
  assert.deepEqual(got, { a: 0, c: 1 });
});

test('refuses a call track: the phone cannot capture call audio', () => {
  const b = rig();
  const r = new b.Recognition();
  assert.throws(() => r.start({ kind: 'audio' }), { name: 'NotSupportedError' });
});

test('permission refusals reach listen.js as the Web Speech error names', () => {
  const b = rig();
  const r = new b.Recognition();
  let error = null;
  r.onerror = e => { error = e.error; };
  started(r, b);
  b.receive({ type: 'error', error: 'not-allowed', message: 'Microphone access is off' });
  assert.equal(error, 'not-allowed');
});

test('tuning goes to the app with every start, so it changes without a rebuild', () => {
  const b = rig({ options: { onDevice: 'server', contextualStrings: ['ジェフリー'] } });
  const r = new b.Recognition();
  r.start();
  assert.equal(b.posted[0].onDevice, 'server');
  assert.deepEqual(b.posted[0].contextualStrings, ['ジェフリー']);
});

test('installs only inside the iPhone app', () => {
  const plain = {};
  assert.equal(installNativeSpeech(plain), false);
  assert.equal(plain.SpeechRecognition, undefined);

  const posted = [];
  const root = { dataset: {} };
  const app = {
    webkit: { messageHandlers: { speech: { postMessage: m => posted.push(m) } } },
    document: { documentElement: root },
    location: { search: '' },
  };
  assert.equal(installNativeSpeech(app), true);
  assert.equal(typeof app.SpeechRecognition, 'function');
  assert.equal(app.webkitSpeechRecognition, app.SpeechRecognition);
  assert.equal(typeof app.__nativeSpeech, 'function');
  assert.equal(root.dataset.shell, 'ios');
  new app.SpeechRecognition().start();
  assert.equal(posted[0].cmd, 'start');
});

test('?asr= picks on-device or server recognition for an A/B on the phone', () => {
  const posted = [];
  const app = {
    webkit: { messageHandlers: { speech: { postMessage: m => posted.push(m) } } },
    document: { documentElement: { dataset: {} } },
    location: { search: '?r=hosha&asr=server' },
  };
  installNativeSpeech(app);
  new app.SpeechRecognition().start();
  assert.equal(posted[0].onDevice, 'server');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createPrompter } from '../prompter.js';

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return { data, getItem: k => data[k] ?? null, setItem: (k, v) => { data[k] = String(v); } };
}

function fakeListener({ running = false } = {}) {
  const calls = [];
  return {
    calls,
    get running() { return running; },
    start() { calls.push('start'); running = true; },
    stop() { calls.push('stop'); running = false; },
  };
}

// The page's state: prep, a live call, or a rehearsal (which also uses the call screen).
function page(mode = 'prep', rehearse = 'off') {
  const state = { mode, rehearse };
  return { state, isLiveCall: () => state.mode === 'call' && state.rehearse !== 'on' };
}

function setup({ on = false, running = false, mode = 'prep', rehearse = 'off' } = {}) {
  const storage = memoryStorage(on ? { 'call-prompter': 'on' } : {});
  const listener = fakeListener({ running });
  const micButton = { disabled: false, dataset: { on: String(running) } };
  const view = page(mode, rehearse);
  const prompter = createPrompter({ storage, listener, micButton, isLiveCall: view.isLiveCall });
  return { storage, listener, micButton, view, prompter };
}

test('off by default: a live call may open the mic and speak', () => {
  const { prompter, micButton } = setup({ mode: 'call' });
  prompter.sync();
  assert.equal(prompter.on, false);
  assert.equal(prompter.audioAllowed(), true);
  assert.equal(micButton.disabled, false);
});

test('on in a live call: no mic, no TTS, Listen disabled', () => {
  const { prompter, micButton, listener } = setup({ on: true, mode: 'call' });
  prompter.sync();
  assert.equal(prompter.audioAllowed(), false);
  assert.equal(micButton.disabled, true);
  assert.deepEqual(listener.calls, [], 'never starts the mic');
});

test('on: a mic opened in prep is closed when the live call starts', () => {
  const { prompter, micButton, listener, view } = setup({ on: true, running: true });
  prompter.sync();
  assert.equal(listener.running, true, 'prep is not a call: the mic may stay open');
  view.state.mode = 'call';
  prompter.sync();
  assert.equal(listener.running, false);
  assert.equal(micButton.dataset.on, 'false');
  assert.deepEqual(listener.calls, ['stop']);
});

test('switched on mid-call: closes the open mic at once', () => {
  const { prompter, micButton, listener } = setup({ running: true, mode: 'call' });
  prompter.set(true);
  assert.equal(listener.running, false);
  assert.equal(micButton.disabled, true);
});

test('switched off mid-call: Listen comes back, but the mic is not opened for him', () => {
  const { prompter, micButton, listener } = setup({ on: true, mode: 'call' });
  prompter.sync();
  prompter.set(false);
  assert.equal(prompter.audioAllowed(), true);
  assert.equal(micButton.disabled, false);
  assert.deepEqual(listener.calls, []);
});

test('rehearsal is unaffected: mic and staff voice allowed with prompter on', () => {
  const { prompter, micButton } = setup({ on: true, mode: 'call', rehearse: 'on' });
  prompter.sync();
  assert.equal(prompter.audioAllowed(), true);
  assert.equal(micButton.disabled, false);
});

test('ending the call gives Listen back', () => {
  const { prompter, micButton, view } = setup({ on: true, mode: 'call' });
  prompter.sync();
  assert.equal(micButton.disabled, true);
  view.state.mode = 'prep';
  prompter.sync();
  assert.equal(micButton.disabled, false);
});

test('the choice is remembered on this device', () => {
  const storage = memoryStorage();
  const first = createPrompter({ storage, isLiveCall: () => true });
  first.set(true);
  assert.equal(storage.data['call-prompter'], 'on');
  assert.equal(createPrompter({ storage, isLiveCall: () => true }).on, true);
  first.set(false);
  assert.equal(createPrompter({ storage, isLiveCall: () => true }).on, false);
});

test('storage that throws (private mode) reads as off and never breaks the toggle', () => {
  const storage = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  const prompter = createPrompter({ storage, isLiveCall: () => true });
  assert.equal(prompter.on, false);
  prompter.set(true);
  assert.equal(prompter.on, true);
  assert.equal(prompter.audioAllowed(), false);
});

test('no usable mic (no listener): the decision still holds for TTS', () => {
  const prompter = createPrompter({ storage: memoryStorage({ 'call-prompter': 'on' }), isLiveCall: () => true });
  prompter.sync();
  assert.equal(prompter.audioAllowed(), false);
});

// TTS: speak.js asks the prompter before every line.
async function loadSpeak() {
  const spoken = [];
  globalThis.window = { speechSynthesis: {
    speak(u) { spoken.push(u.text); u.onstart?.(); setTimeout(() => u.onend?.(), 5); },
    cancel() {}, getVoices: () => [], addEventListener() {},
  } };
  globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  const mod = await import(`../speak.js?${Math.random()}`);
  return { ...mod, spoken };
}

test('TTS: on in a live call, a card or panic key speaks nothing, and onEnd still fires once', async () => {
  const { speak, setSpeechAllowed, spoken } = await loadSpeak();
  const { prompter } = setup({ on: true, mode: 'call' });
  setSpeechAllowed(prompter.audioAllowed);
  let ended = 0;
  assert.equal(speak({ kana: 'すみません' }, { onEnd: () => { ended += 1; } }), false);
  await new Promise(r => setTimeout(r, 20));
  assert.deepEqual(spoken, []);
  assert.equal(ended, 1);
});

test('TTS: rehearsal still speaks with prompter on', async () => {
  const { speak, setSpeechAllowed, spoken } = await loadSpeak();
  const { prompter } = setup({ on: true, mode: 'call', rehearse: 'on' });
  setSpeechAllowed(prompter.audioAllowed);
  assert.equal(speak({ kana: 'すみません' }), true);
  await new Promise(r => setTimeout(r, 20));
  assert.deepEqual(spoken, ['すみません']);
});

import test from 'node:test';
import assert from 'node:assert/strict';

// A fake speech engine: speaks one utterance at a time, in queue order.
function fakeSynth({ dropEndOf = -1 } = {}) {
  const queue = [];
  const spoken = [];
  let busy = false;
  const next = () => {
    if (busy || !queue.length) return;
    busy = true;
    const u = queue.shift();
    const index = spoken.length;
    spoken.push(u.text);
    u.onstart?.();
    setTimeout(() => { busy = false; if (index !== dropEndOf) u.onend?.(); next(); }, 10);
  };
  return { spoken, synth: { speak(u) { queue.push(u); next(); }, cancel() { queue.length = 0; }, getVoices: () => [], addEventListener() {} } };
}

async function load(fake) {
  globalThis.window = { speechSynthesis: fake.synth };
  globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  return import(`../speak.js?${Math.random()}`);
}

test('sentences are spoken in order, the gate opens and closes once, onEnd fires once after close', async () => {
  const fake = fakeSynth();
  const { speakSequence, setSpeechGate } = await load(fake);
  const gate = [];
  setSpeechGate({ before: () => gate.push('before'), after: () => gate.push('after') });
  let ended = 0;
  const seq = speakSequence({ onEnd: () => { ended += 1; } });
  seq.add('いち。'); seq.add('に。');                        // same tick, before the engine is ready
  await new Promise(r => setTimeout(r, 15));
  seq.add('さん。');
  await new Promise(r => setTimeout(r, 60));
  assert.equal(ended, 0, 'not done until closed');
  seq.close();
  await new Promise(r => setTimeout(r, 20));
  assert.deepEqual(fake.spoken, ['いち。', 'に。', 'さん。']);
  assert.deepEqual(gate, ['before', 'after']);
  assert.equal(ended, 1);
});

test('a dropped end event cannot hang the turn: the watchdog ends it after close', async () => {
  const fake = fakeSynth({ dropEndOf: 0 });
  const { speakSequence } = await load(fake);
  let ended = 0;
  const seq = speakSequence({ rate: 10, onEnd: () => { ended += 1; } });
  seq.add('は。');
  await new Promise(r => setTimeout(r, 30));
  seq.close();
  assert.equal(ended, 0);
  await new Promise(r => setTimeout(r, 2700));
  assert.equal(ended, 1);
});

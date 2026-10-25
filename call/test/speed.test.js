import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.localStorage = { getItem: () => 'k', setItem() {} };
const { interpret } = await import('../interpret.js');
const { createStaffSim, parseStaffTurn, speakableSoFar, toLines, OPENING_TURN } = await import('../staff-sim.js');

// A streamed reply, delivered in chunks with a delay before the first.
function sseResponse(chunks, firstDelay = 0, gap = 5) {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({
    async start(controller) {
      await new Promise(r => setTimeout(r, firstDelay));
      for (const text of chunks) {
        const event = { type: 'content_block_delta', delta: { type: 'text_delta', text } };
        controller.enqueue(encoder.encode(`event: x\ndata: ${JSON.stringify(event)}\n\n`));
        await new Promise(r => setTimeout(r, gap));
      }
      controller.close();
    },
  }), { status: 200 });
}

function withFetch(handler, run) {
  const real = globalThis.fetch;
  globalThis.fetch = handler;
  return run().finally(() => { globalThis.fetch = real; });
}

test('call English: Haiku shows first, Sonnet takes over, and only Sonnet finishing is done', () =>
  withFetch(async (url, opts) => {
    const { model } = JSON.parse(opts.body);
    if (model === 'claude-haiku-4-5') return sseResponse(['How many ', 'people?'], 0);
    if (model === 'claude-sonnet-5') return sseResponse(['How many people', ' will it be?'], 60);
    return new Response('{}', { status: 400 });
  }, async () => {
    const seen = [];
    await new Promise(resolve => interpret('何名様でしょうか', {
      staffOnly: true, early: true, verdict: false,
      onEnglish: (r, { done }) => { seen.push([r.english, done]); if (done) resolve(); },
    }));
    assert.equal(seen[0][0].startsWith('How many'), true);
    assert.deepEqual(seen.find(([en]) => en === 'How many people?'), ['How many people?', false]);
    assert.deepEqual(seen.at(-1), ['How many people will it be?', true]);
    for (let i = 1; i < seen.length; i += 1) {          // the line never shrinks mid-read
      if (!seen[i][1]) assert.ok(seen[i][0].length >= seen[i - 1][0].length, JSON.stringify(seen));
    }
  }));

test('call English: if Sonnet fails, Haiku finishing counts as done', () =>
  withFetch(async (url, opts) => {
    const { model } = JSON.parse(opts.body);
    if (model === 'claude-haiku-4-5') return sseResponse(['Any allergies?'], 20);
    return new Response('{"error":{"message":"bad"}}', { status: 400 });
  }, async () => {
    const last = await new Promise(resolve => interpret('アレルギーはございますか', {
      staffOnly: true, early: true, verdict: false,
      onEnglish: (r, { done }) => { if (done) resolve(r.english); },
    }));
    assert.equal(last, 'Any allergies?');
  }));

test('the same card question asked at a pause and at the commit is sent once', () => {
  let verdictCalls = 0;
  let body = null;
  return withFetch(async (url, opts) => {
    const parsed = JSON.parse(opts.body);
    if (parsed.model === 'claude-opus-5' || parsed.model === 'claude-opus-5-5') { verdictCalls += 1; body = parsed; }
    return sseResponse(['REPLY self-party'], 20);
  }, async () => {
    const recent = [{ who: 'staff', ja: 'お電話ありがとうございます' }];
    const ask = () => new Promise(resolve => {
      const got = [];
      interpret('何名様でいらっしゃいますかテスト', { recent, staffOnly: true, translate: false,
        onVerdict: (r, { final }) => { got.push(final); if (got.length === 2) resolve(r.replyId); } });
    });
    assert.equal(await ask(), 'self-party');
    assert.equal(await ask(), 'self-party');
    assert.equal(verdictCalls, 2, 'one quick + one final, reused the second time');
    // the system prompt and the call so far are marked for caching; the transcript is not
    assert.equal(body.system[0].cache_control.type, 'ephemeral');
    assert.equal(body.messages[0].content[0].cache_control.type, 'ephemeral');
    assert.equal(body.messages[0].content[1].cache_control, undefined);
    assert.equal(body.messages[0].content.map(b => b.text).join(''),
      'Call so far:\nStaff: お電話ありがとうございます\n\nTranscript to judge:\n何名様でいらっしゃいますかテスト');
  });
});

test('a failed card answer is not reused', () => {
  let calls = 0;
  return withFetch(async () => { calls += 1; return calls <= 2 ? new Response('{}', { status: 400 }) : sseResponse(['REPLY self-name'], 0); },
    async () => {
      const ask = () => new Promise(resolve => {
        const out = [];
        interpret('お名前をお願いしますテスト', { staffOnly: true, translate: false,
          onVerdict: r => { out.push(r.replyId); if (out.length === 2) resolve(out); },
          onError: () => { out.push('error'); if (out.length === 2) resolve(out); } });
      });
      assert.deepEqual(await ask(), ['error', 'error']);
      assert.deepEqual(await ask(), ['self-name', 'self-name']);
    });
});

const LINES = 'PACE: normal\nKANA: よんめいさまでございますね。しょうしょうおまちくださいませ。\nJA: 4名様でございますね。少々お待ちくださいませ。\nROMAJI: Yonmei-sama de gozaimasu ne.\nEN: Four people. One moment.\nEND: no';

test('kana-first reply: the first sentence is speakable before the line is finished', () => {
  const cut = LINES.indexOf('しょうしょう') + 3;
  assert.deepEqual(speakableSoFar(LINES.slice(0, cut)).sentences, ['よんめいさまでございますね。']);
  assert.equal(speakableSoFar(LINES.slice(0, cut)).ja, '');
  const whole = speakableSoFar(LINES);
  assert.deepEqual(whole.sentences, ['よんめいさまでございますね。', 'しょうしょうおまちくださいませ。']);
  assert.equal(whole.ja, '4名様でございますね。少々お待ちくださいませ。');
  assert.equal(speakableSoFar('PACE: slow\nKA').slow, true);
});

test('kana-first reply parses into a turn, and back', () => {
  const turn = parseStaffTurn(LINES);
  assert.equal(turn.ja, '4名様でございますね。少々お待ちくださいませ。');
  assert.equal(turn.kana, 'よんめいさまでございますね。しょうしょうおまちくださいませ。');
  assert.equal(turn.end, false);
  assert.equal(parseStaffTurn(LINES.replace('END: no', 'END: yes').replace('PACE: normal', 'PACE: slow')).end, true);
  assert.deepEqual(parseStaffTurn(toLines(turn)), turn);
  assert.throws(() => parseStaffTurn('PACE: normal\nEN: Yes.'), /no Japanese/i);
});

test('streamed staff: progress as it arrives, history kept in the line format', async () => {
  const sent = [];
  const sim = createStaffSim({
    streamClaude: async (body, onText) => {
      sent.push(body);
      for (let i = 10; i <= LINES.length; i += 10) onText(LINES.slice(0, i));
      onText(LINES);
      return LINES;
    },
  });
  sim.opening();
  const progress = [];
  const turn = await sim.reply('4人です', { onProgress: p => progress.push(p.sentences.length) });
  assert.equal(turn.ja, '4名様でございますね。少々お待ちくださいませ。');
  assert.ok(progress.indexOf(1) >= 0 && progress.indexOf(1) < progress.indexOf(2), 'first sentence before second');
  assert.equal(sent[0].model, 'claude-opus-5');
  assert.deepEqual(sent[0].thinking, { type: 'disabled' });
  assert.equal(sent[0].messages[1].content, toLines(OPENING_TURN));
  assert.match(sent[0].system, /KANA: what you say/);
});

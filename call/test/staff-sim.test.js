import test from 'node:test';
import assert from 'node:assert/strict';
import { createStaffSim, parseStaffTurn, scoreRadar, OPENING_TURN, STAFF_SYSTEM } from '../staff-sim.js';

// A fake transport that records what it was sent and replays canned replies.
function fakeClaude(replies) {
  const calls = [];
  const fn = async request => {
    calls.push(structuredClone(request));
    const next = replies.shift();
    if (next instanceof Error) throw next;
    return next;
  };
  fn.calls = calls;
  return fn;
}

const turn = (ja, extra = {}) =>
  JSON.stringify({ ja, kana: 'かな', en: 'english', end: false, ...extra });

test('the opening line is instant and costs no API call', () => {
  const claude = fakeClaude([]);
  const sim = createStaffSim({ callClaude: claude });
  assert.deepEqual(sim.opening(), OPENING_TURN);
  assert.match(OPENING_TURN.ja, /日山でございます/);
  assert.equal(claude.calls.length, 0);
});

test('a reply sends the whole conversation, alternating roles, starting with user', async () => {
  const claude = fakeClaude([turn('ご予約でございますね。')]);
  const sim = createStaffSim({ callClaude: claude });
  sim.opening();
  await sim.reply('予約をお願いしたいのですが');

  const { messages, system } = claude.calls[0];
  assert.equal(system, STAFF_SYSTEM);
  assert.equal(messages[0].role, 'user');
  for (let i = 1; i < messages.length; i += 1) {
    assert.notEqual(messages[i].role, messages[i - 1].role, 'roles must alternate');
  }
  assert.equal(messages.at(-1).content, '予約をお願いしたいのですが');
});

test('the conversation accumulates across turns', async () => {
  const claude = fakeClaude([turn('何名様でしょうか。'), turn('かしこまりました。')]);
  const sim = createStaffSim({ callClaude: claude });
  sim.opening();
  await sim.reply('予約をお願いします');
  await sim.reply('4人です');
  const second = claude.calls[1].messages.map(m => m.content).join('\n');
  assert.match(second, /予約をお願いします/);
  assert.match(second, /何名様でしょうか/);
  assert.match(second, /4人です/);
});

test('a failed API call does not corrupt the history, so a retry works', async () => {
  const claude = fakeClaude([new Error('API error 529'), turn('何名様でしょうか。')]);
  const sim = createStaffSim({ callClaude: claude });
  sim.opening();
  await assert.rejects(sim.reply('予約をお願いします'), /529/);
  const result = await sim.reply('予約をお願いします');
  assert.equal(result.ja, '何名様でしょうか。');
  const roles = claude.calls[1].messages.map(m => m.role);
  assert.deepEqual(roles, ['user', 'assistant', 'user'], 'the failed turn must have been rolled back');
});

test('an empty reply is refused rather than sent', async () => {
  const sim = createStaffSim({ callClaude: fakeClaude([]) });
  sim.opening();
  await assert.rejects(sim.reply('   '), /nothing to send/i);
});

test('parseStaffTurn reads fenced JSON and defaults end to false', () => {
  const t = parseStaffTurn('```json\n{"ja":"はい。","kana":"はい","en":"Yes."}\n```');
  assert.equal(t.ja, 'はい。');
  assert.equal(t.end, false);
});

test('parseStaffTurn keeps end:true', () => {
  assert.equal(parseStaffTurn(turn('失礼いたします。', { end: true })).end, true);
});

test('parseStaffTurn rejects a turn with no Japanese', () => {
  assert.throws(() => parseStaffTurn('{"en":"hello"}'), /no Japanese/i);
});

test('scoreRadar reports what the radar would have shown for each staff line', () => {
  const report = scoreRadar([
    { ja: '何名様でしょうか。' },
    { ja: '今日はいい天気ですね。' },
  ]);
  assert.equal(report.rows.length, 2);
  assert.equal(report.rows[0].caught, true);
  assert.match(report.rows[0].matchedAs, /How many people/);
  assert.equal(report.rows[1].caught, false);
  assert.equal(report.caught, 1);
  assert.equal(report.total, 2);
});

test('the system prompt carries the facts the rehearsal must not contradict', () => {
  // Checked against hiyama-gr.com/sukiyaki/honten on 2026-09-26.
  for (const fact of ['日曜', '座敷', '26,000', '10%', '100%', '20:00', '文化の日']) {
    assert.ok(STAFF_SYSTEM.includes(fact), `system prompt is missing: ${fact}`);
  }
});

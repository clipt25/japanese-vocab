import test from 'node:test';
import assert from 'node:assert/strict';
import { parseInterpretation, buildVerdictMessage, ENGLISH_SYSTEM, VERDICT_SYSTEM, ENGLISH_LANE, QUICK_LANE, FINAL_LANE } from '../interpret.js';
import { SELF } from '../phrases.js';

test('reads English and a real script id', () => {
  assert.deepEqual(parseInterpretation('Nov 3rd 7pm, right? How many people?\nREPLY self-party'),
    { self: false, english: 'Nov 3rd 7pm, right? How many people?', replyId: 'self-party', custom: null });
});

test('an invented or staff-side id is never suggested', () => {
  assert.equal(parseInterpretation('The line is faint.\nREPLY panic-can-you-hear').replyId, null);
  assert.equal(parseInterpretation('How many?\nREPLY staff-party-size').replyId, null);
  assert.equal(parseInterpretation('One moment.\nREPLY none').replyId, null);
});

test('panic lines are valid suggestions', () => {
  assert.equal(parseInterpretation('Say again?\nREPLY panic-again').replyId, 'panic-again');
});

test('his own voice is recognised, and never flashes as English mid-stream', () => {
  assert.equal(parseInterpretation('SELF').self, true);
  for (const partial of ['', 'S', 'SE', 'SEL']) {
    assert.deepEqual(parseInterpretation(partial), { self: false, english: '', replyId: null, custom: null });
  }
  assert.equal(parseInterpretation('Sorry, 7pm is FULL').english, 'Sorry, 7pm is FULL');
});

test('a leaked format label is stripped', () => {
  assert.equal(parseInterpretation('Line 1: Any allergies?\n\nLine 2: REPLY self-allergy-none').english, 'Any allergies?');
});

test('English streams before the REPLY line arrives', () => {
  assert.deepEqual(parseInterpretation('How many peo'), { self: false, english: 'How many peo', replyId: null, custom: null });
});

test('verdict context is labelled by speaker, and the transcript comes last', () => {
  assert.equal(buildVerdictMessage('何名様ですか'), 'Transcript to judge:\n何名様ですか');
  const msg = buildVerdictMessage('もう一度お願いできますか', [{ who: 'you', ja: '4人でお願いします' }]);
  assert.match(msg, /Geoffrey: 4人でお願いします/);
  assert.match(msg, /Transcript to judge:\nもう一度お願いできますか$/);
});

test('the verdict prompt lists every line he can be told to say, and his booking', () => {
  for (const p of SELF) assert.ok(VERDICT_SYSTEM.includes(`${p.id}: `), p.id);
  for (const fact of ['3 November 2026', '19:00', '4 people', '8063 7730', 'geoffrejames@gmail.com']) {
    assert.ok(VERDICT_SYSTEM.includes(fact), fact);
    assert.ok(ENGLISH_SYSTEM.includes(fact), fact);
  }
});

test('the English prompt carries his lines in Japanese, so it can tell his voice from staff', () => {
  for (const p of SELF) assert.ok(ENGLISH_SYSTEM.includes(p.kanji), p.id);
});

test('the verdict prompt forbids suggesting a line with a detail the staff changed', () => {
  assert.match(VERDICT_SYSTEM, /never suggest a line that states the old detail/);
});

test('lanes: English is Sonnet 5, quick is Opus 5, final is Opus 5.5 with room to think', () => {
  assert.equal(ENGLISH_LANE.model, 'claude-sonnet-5');
  assert.deepEqual(ENGLISH_LANE.thinking, { type: 'disabled' });
  assert.equal(QUICK_LANE.model, 'claude-opus-5');
  assert.deepEqual(QUICK_LANE.thinking, { type: 'disabled' });
  assert.equal(FINAL_LANE.model, 'claude-opus-5-5');
  assert.ok(FINAL_LANE.max_tokens >= 1500);
  assert.equal(FINAL_LANE.thinking, undefined);   // 400 on Opus 5.5 if disabled
});

import { isOwnLine, repliesWithItself } from '../interpret.js';

test('his own card lines are recognised locally, as the recogniser writes them', () => {
  for (const heard of ['恐れ入ります予約をお願いしたいのですが', '11月3日の夜7時にお願いします', '4人でお願いします',
                       '国番号は62です812の8063の7730です', 'はい分かりました', 'ありがとうございました失礼いたします']) {
    assert.ok(isOwnLine(heard), heard);
  }
});

test('staff lines are never taken for his, including ones that echo his details', () => {
  for (const heard of ['お電話ありがとうございますすき焼割烹日山でございます', '何名様でいらっしゃいますか',
                       '4名様でございますね少々お待ちくださいませ', '復唱いたしますプラス6281280637730でお間違いないでしょうか',
                       '11月3日火曜日の19時でございますね何名様でいらっしゃいますか', 'かしこまりました']) {
    assert.equal(isOwnLine(heard), false, heard);
  }
});

test('a line both sides say is left to the models', () => {
  assert.equal(isOwnLine('もう一度お願いできますか'), false);
});

test('a verdict telling him to repeat what was just heard marks it as his', () => {
  assert.equal(repliesWithItself('恐れ入ります予約をお願いしたいのですが', 'self-open'), true);
  assert.equal(repliesWithItself('何名様でいらっしゃいますか', 'self-party'), false);
  assert.equal(repliesWithItself('何名様でいらっしゃいますか', null), false);
});

test('a line written for him is read in full, with kana the play button can speak', () => {
  const r = parseInterpretation('SAY 7時半でお願いします。 | しちじはんでおねがいします | Shichi-ji han de onegai shimasu. | 7:30, please.');
  assert.deepEqual(r.custom, { id: 'custom', who: 'self', kanji: '7時半でお願いします。',
    kana: 'しちじはんでおねがいします', romaji: 'Shichi-ji han de onegai shimasu.', en: '7:30, please.' });
  assert.equal(r.replyId, null);
  assert.equal(r.english, '');
});

test('a written line with kanji or digits in its kana, or missing parts, is dropped', () => {
  assert.equal(parseInterpretation('SAY 7時半で | 7じはん | Shichi-ji han | 7:30').custom, null);
  assert.equal(parseInterpretation('SAY 7時半でお願いします | しちじはん | 7:30').custom, null);
});

import { interpret } from '../interpret.js';

function sse(text) {
  const events = [{ type: 'content_block_delta', delta: { type: 'text_delta', text } }, { type: 'message_stop' }];
  return new Response(events.map(e => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join(''), { status: 200 });
}

test('a dropped connection or overload is retried once, and a bad key is not', async () => {
  const realFetch = globalThis.fetch;
  globalThis.localStorage = { getItem: () => 'k', setItem() {} };
  try {
    const calls = { english: 0 };
    globalThis.fetch = async (url, opts) => {
      const body = JSON.parse(opts.body);
      if (body.model === 'claude-sonnet-5') {
        calls.english += 1;
        if (calls.english === 1) throw new TypeError('Failed to fetch');
        return sse('How many people?');
      }
      return new Response('{}', { status: 401 });
    };
    const got = await new Promise(resolve => {
      const errors = [];
      let english = null;
      const settle = () => { if (english && errors.length === 2) resolve({ english, errors }); };
      interpret('何名様ですか', {
        onEnglish: r => { english = r.english; settle(); },
        onError: (lane, e) => { errors.push(`${lane}:${e.message}`); settle(); },
      });
    });
    assert.equal(calls.english, 2);
    assert.equal(got.english, 'How many people?');
    assert.deepEqual(got.errors.sort(), ['final:API error 401', 'quick:API error 401']);
  } finally {
    globalThis.fetch = realFetch;
    delete globalThis.localStorage;
  }
});

test('once he agrees to a change, the verdict must not steer him back to the original', () => {
  // Regression: an agreed 17:00 fell out of a six-line context window, and at
  // the read-back the verdict wrote "すみません、19時でお願いします".
  assert.match(VERDICT_SYSTEM, /The call so far is authoritative/);
  assert.match(VERDICT_SYSTEM, /Never steer him back to his original request/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { match, scorePhrase, MATCH_THRESHOLD, MATCH_MARGIN, REPLY_GATE } from '../match.js';
import { STAFF, byId } from '../phrases.js';
import { NEGATIVES, corrupt } from './corpus.js';

// ── True positives ──────────────────────────────────────────────────────────
const TRUE_POSITIVES = [
  ['何名様でしょうか', 'staff-party-size'],
  ['なんめいさまでしょうか', 'staff-party-size'],
  ['お名前をお願いいたします', 'staff-name'],
  ['アレルギーはございますか', 'staff-allergy'],
  ['あれるぎーはございますか', 'staff-allergy'],
  ['申し訳ございません、その日は満席でございます', 'staff-full'],
  ['はい、日山でございます', 'staff-greeting'],
  ['お子様はいらっしゃいますか', 'staff-children'],
  ['クレジットカードの番号をお伺いしてもよろしいでしょうか', 'staff-card-number'],
  ['本日は定休日でございます', 'staff-closed-today'],
  ['個室をご希望でしょうか', 'staff-private-room-ask'],
];

for (const [input, expected] of TRUE_POSITIVES) {
  test(`matches: ${input.slice(0, 18)}`, () => {
    const r = match(input, STAFF);
    assert.ok(r.confident, `not confident (top ${r.candidates[0]?.score.toFixed(2)})`);
    assert.equal(r.top.phrase.id, expected);
  });
}

// ── Negative corpus ─────────────────────────────────────────────────────────
// 101 plausible Hiyama-staff utterances with NO correct entry, plus every staff
// phrase pushed through 9 realistic recognition-corruption modes.
//
// The original design (0.40 threshold + trigger bonuses) confidently matched
// 80.6% of the negatives AND attached a reply chip. These tests are the guard
// against regressing to that.

test('negative corpus: confident false-match rate stays under 2%', () => {
  const wrong = NEGATIVES.filter(n => match(n, STAFF).confident);
  const rate = wrong.length / NEGATIVES.length;
  console.log(`    false positives: ${wrong.length}/${NEGATIVES.length} = ${(rate * 100).toFixed(1)}%`);
  for (const w of wrong) console.log(`      ${w} -> ${match(w, STAFF).top.phrase.en}`);
  assert.ok(rate < 0.02, `false-positive rate ${(rate * 100).toFixed(1)}% exceeds 2%`);
});

test('negative corpus: no negative produces an actionable reply chip', () => {
  const chips = NEGATIVES.filter(n => match(n, STAFF).showReply);
  assert.equal(chips.length, 0, `${chips.length} negatives produced a reply chip`);
});

// THE load-bearing safety property. Recall can sag on bad audio and that is
// survivable — he glances at the script. Matching the WRONG phrase is not.
test('corrupted speech NEVER resolves to the wrong phrase', () => {
  const cases = STAFF.flatMap(p => corrupt(p).map(c => ({ ...c, expect: p.id })));
  const wrong = cases.filter(c => {
    const r = match(c.text, STAFF);
    return r.confident && r.top.phrase.id !== c.expect;
  });
  for (const w of wrong) console.log(`      ${w.label}: ${w.text} -> expected ${w.expect}`);
  assert.equal(wrong.length, 0, `${wrong.length}/${cases.length} corrupted inputs matched the wrong phrase`);
});

test('recall on corrupted speech stays above 85%', () => {
  const cases = STAFF.flatMap(p => corrupt(p).map(c => ({ ...c, expect: p.id })));
  const right = cases.filter(c => match(c.text, STAFF).top?.phrase.id === c.expect);
  const rate = right.length / cases.length;
  console.log(`    recall on corrupted input: ${right.length}/${cases.length} = ${(rate * 100).toFixed(1)}%`);
  assert.ok(rate > 0.85, `recall ${(rate * 100).toFixed(1)}% below 85%`);
});

test('true-positive rate on clean input stays above 90%', () => {
  const hits = TRUE_POSITIVES.filter(([i, e]) => match(i, STAFF).top?.phrase.id === e);
  assert.ok(hits.length / TRUE_POSITIVES.length > 0.90);
});

// The most basic invariant of all — and the one I did not have. A margin gate
// can refuse a PERFECT transcript when two entries sit too close together, which
// is exactly what silently killed staff-what-date and staff-is-reservation:
// both scored 1.000 on their own text and were still rejected, because the
// runner-up trailed by only 0.158 against a 0.20 margin.
test('every staff phrase matches its own exact text, in both forms', () => {
  const failures = [];
  for (const p of STAFF) {
    for (const form of ['kanji', 'kana']) {
      const r = match(p[form], STAFF);
      if (!r.confident || r.top.phrase.id !== p.id) {
        const c = r.candidates;
        failures.push(`${p.id} (${form}): top ${c[0]?.phrase.id} ${c[0]?.score.toFixed(3)}, `
          + `2nd ${c[1]?.phrase.id} ${c[1]?.score.toFixed(3)}, margin `
          + `${(c[0].score - c[1].score).toFixed(3)}`);
      }
    }
  }
  for (const f of failures) console.log(`      ${f}`);
  assert.equal(failures.length, 0, `${failures.length} phrases cannot identify themselves`);
});

// ── Safety properties ───────────────────────────────────────────────────────
test('unrelated speech is not confident', () => {
  assert.equal(match('今日はいい天気ですね', STAFF).confident, false);
});

test('empty transcript is not confident', () => {
  assert.equal(match('', STAFF).confident, false);
  assert.equal(match(undefined, STAFF).confident, false);
});

test('scores are NOT clamped, so ranking survives', () => {
  // The old min(1,...) clamp saturated 533 of 1436 scores at exactly 1.000,
  // hiding the top1-top2 margin this design depends on.
  const saturated = STAFF.filter(p => scorePhrase(p.kanji, p) === 1).length;
  assert.equal(saturated, STAFF.length, 'exact self-match should score exactly 1');
  const r = match('お名前をお願いいたします', STAFF);
  assert.ok(r.candidates[0].score - r.candidates[1].score > 0, 'margin must be observable');
});

test('a near-tie refuses to pick', () => {
  const twins = [
    { id: 'a', kanji: 'ご予約でしょうか。', kana: 'ごよやくでしょうか' },
    { id: 'b', kanji: 'ご予約でしょうか。', kana: 'ごよやくでしょうか' },
  ];
  assert.equal(match('ご予約でしょうか', twins).confident, false);
});

test('thresholds are the documented safety values', () => {
  assert.equal(MATCH_THRESHOLD, 0.70);
  assert.equal(MATCH_MARGIN, 0.20);
  assert.equal(REPLY_GATE, 0.85);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { match, scorePhrase, MATCH_THRESHOLD, MATCH_MARGIN, REPLY_GATE } from '../match.js';
import { STAFF, byId } from '../phrases.js';

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
// Plausible Hiyama-staff speech with NO correct entry. The original design
// (0.40 threshold + trigger bonuses) confidently matched 80.6% of these AND
// attached a reply chip. This test is the guard against regressing to that.
const NEGATIVES = [
  'お飲み物は別料金でございます', 'お車でお越しでしょうか', '駐車場はございません',
  '最寄り駅は人形町でございます', '領収書は必要でしょうか', 'お支払いは現金でしょうか',
  '前日までにご連絡ください', '幹事様のお名前は', 'ご利用は初めてでしょうか',
  '何かご要望はございますか', '誕生日のお祝いでしょうか', '苦手な食材はございますか',
  'お席は2階でございます', '只今電話が混み合っております', '担当者に代わります',
  '番号をお間違えではないでしょうか', 'ご予約の変更でしょうか', 'お履物はお脱ぎいただきます',
  'コースは一万五千円からでございます', '和牛のすき焼きでございます',
  '未成年の方はいらっしゃいますか', 'ペットの同伴はご遠慮いただいております',
  '写真撮影はご遠慮ください', '少々お時間をいただきます',
  'インターネットからもご予約いただけます', 'お待ち合わせでしょうか',
  '領収書の宛名はいかがなさいますか', '今日はいい天気ですね',
  'お荷物はお預かりいたします', 'エレベーターは奥にございます',
];

test('negative corpus: confident false-match rate stays under 10%', () => {
  const wrong = NEGATIVES.filter(n => match(n, STAFF).confident);
  const rate = wrong.length / NEGATIVES.length;
  console.log(`    false positives: ${wrong.length}/${NEGATIVES.length} = ${(rate * 100).toFixed(1)}%`);
  for (const w of wrong) {
    console.log(`      ${w} -> ${match(w, STAFF).top.phrase.en}`);
  }
  assert.ok(rate < 0.10, `false-positive rate ${(rate * 100).toFixed(1)}% exceeds 10%`);
});

test('negative corpus: reply chips are rarer still', () => {
  const chips = NEGATIVES.filter(n => match(n, STAFF).showReply);
  console.log(`    reply chips on negatives: ${chips.length}/${NEGATIVES.length}`);
  assert.ok(chips.length <= 1, `${chips.length} negatives produced an actionable reply chip`);
});

test('true-positive rate stays above 80%', () => {
  const hits = TRUE_POSITIVES.filter(([i, e]) => match(i, STAFF).top?.phrase.id === e);
  const rate = hits.length / TRUE_POSITIVES.length;
  console.log(`    true positives: ${hits.length}/${TRUE_POSITIVES.length} = ${(rate * 100).toFixed(1)}%`);
  assert.ok(rate > 0.80);
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
  assert.equal(MATCH_THRESHOLD, 0.75);
  assert.equal(MATCH_MARGIN, 0.20);
  assert.equal(REPLY_GATE, 0.85);
});

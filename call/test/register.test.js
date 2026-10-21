import test from 'node:test';
import assert from 'node:assert/strict';
import { keigoIn, PLAIN_POLITE_RULE } from '../register.js';
import { RESTAURANTS } from '../restaurants.js';
import { buildLibrary } from '../phrases.js';
import { VERDICT_SYSTEM } from '../interpret.js';

// Every one of these was a real card before he asked for plain Japanese. The
// guard is only worth having if it would have caught all of them.
const FORMER_KEIGO_CARDS = [
  '恐れ入ります、予約をお願いしたいのですが。',
  'ジェフリーと申します。',
  '全員大人です。子供はおりません。',
  'メールアドレスをお伝えしましょうか。',
  'コースは当日決めさせていただいてもよろしいでしょうか。',
  '予算は一人二万円くらいで考えております。',
  '念のため確認させていただきます。',
  'ありがとうございました。失礼いたします。',
  '申し訳ありません、今カードが手元にございません。',
  '英語を話せる方はいらっしゃいますか。',
  '少々お待ちいただけますか。',
  '恐れ入りますが、ご担当の方のお名前を伺ってもよろしいですか。',
];

test('the guard catches every keigo card the script used to have', () => {
  const missed = FORMER_KEIGO_CARDS.filter(line => keigoIn(line).length === 0);
  assert.deepEqual(missed, []);
});

test('ありがとうございます is a fixed expression, not keigo', () => {
  assert.deepEqual(keigoIn('ありがとうございます。よろしくお願いします。'), []);
  assert.deepEqual(keigoIn('ありがとうございました。失礼します。'), []);
});

// The rule he asked for: when it is HIS turn, simple but polite Japanese.
for (const restaurant of Object.values(RESTAURANTS)) {
  test(`${restaurant.id}: none of his lines use keigo`, () => {
    const offenders = buildLibrary(restaurant).SELF
      .map(p => ({ id: p.id, markers: keigoIn(p.kanji) }))
      .filter(r => r.markers.length > 0);
    assert.deepEqual(offenders, [], JSON.stringify(offenders));
  });
}

test('the live interpreter is told to write his lines without keigo', () => {
  assert.ok(VERDICT_SYSTEM.includes(PLAIN_POLITE_RULE));
});

test('his lines use easy words (kantan): none of the harder ones he asked to drop', async () => {
  // Asked for on 2026-10-21. The staff may say these words; he never has to.
  const HARD = ['得意', '海外', '当日', '確認', '予算', '全員', '担当', '下ろせ'];
  const { buildLibrary } = await import('../phrases.js');
  const { RESTAURANTS } = await import('../restaurants.js');
  for (const r of Object.values(RESTAURANTS)) {
    for (const p of buildLibrary(r).SELF) {
      const found = HARD.filter(w => p.kanji.includes(w));
      assert.deepEqual(found, [], `${r.id}/${p.id}: ${p.kanji}`);
    }
  }
});

test('lines Claude writes for him are held to the same easy words', async () => {
  const { PLAIN_POLITE_RULE } = await import('../register.js');
  assert.match(PLAIN_POLITE_RULE, /easy, everyday words/);
  assert.match(PLAIN_POLITE_RULE, /外国 not 海外/);
  assert.doesNotMatch(PLAIN_POLITE_RULE, /下手/, 'he asked not to call his Japanese 下手');
});

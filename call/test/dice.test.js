import test from 'node:test';
import assert from 'node:assert/strict';
import { dice } from '../dice.js';

test('identical strings score 1', () => assert.equal(dice('なんめい', 'なんめい'), 1));
test('disjoint strings score 0', () => assert.equal(dice('なんめい', 'あれるぎ'), 0));

test('partial overlap lands between 0 and 1', () => {
  const s = dice('なんめいさまでしょうか', 'なんめさでしょ');
  assert.ok(s > 0.3 && s < 1, `got ${s}`);
});

test('a closer variant outscores a looser one', () => {
  const t = 'なんめいさまでしょうか';
  assert.ok(dice(t, 'なんめいさまでしょう') > dice(t, 'なんめさ'));
});

test('empty or single-character input scores 0', () => {
  assert.equal(dice('', 'なんめい'), 0);
  assert.equal(dice('な', 'なんめい'), 0);
});

test('repeated bigrams are not double-counted', () => {
  assert.equal(dice('ああああ', 'ああ'), 2 * 1 / (3 + 1));
});

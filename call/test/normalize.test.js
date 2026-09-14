import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, katakanaToHiragana } from '../normalize.js';

test('katakana folds to hiragana', () => {
  assert.equal(katakanaToHiragana('ナンメイサマ'), 'なんめいさま');
});

test('kanji is left untouched', () => {
  assert.equal(katakanaToHiragana('何名様'), '何名様');
});

// macOS emits decomposed Unicode. Without NFKC, ぎ is か + U+3099 and matching
// silently collapses — this was measured at 0.435 instead of 1.000.
test('decomposed (NFD) input is composed before comparison', () => {
  const nfd = 'あれるぎーはございますか'.normalize('NFD');
  assert.notEqual(nfd, 'あれるぎーはございますか');
  assert.equal(normalize(nfd), normalize('あれるぎーはございますか'));
});

test('halfwidth katakana folds to hiragana', () => {
  assert.equal(normalize('ﾅﾝﾒｲｻﾏ'), normalize('ナンメイサマ'));
});

test('fullwidth digits fold to halfwidth', () => {
  assert.equal(normalize('４名様'), normalize('4名様'));
});

test('long vowel mark becomes a repeat of the preceding vowel, not deleted', () => {
  assert.equal(normalize('コース'), 'こおす');
  // Deleting it would collide these two; expanding keeps them apart.
  assert.notEqual(normalize('ビール'), normalize('ビル'));
});

test('strips whitespace and punctuation', () => {
  assert.equal(normalize('なんめい　さま です'), 'なんめいさまです');
  assert.equal(normalize('何名様でしょうか。'), '何名様でしょうか');
});

test('handles empty and nullish input', () => {
  assert.equal(normalize(''), '');
  assert.equal(normalize(undefined), '');
  assert.equal(normalize(null), '');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { PHRASES, STAFF, SELF, PANIC, byId, byStage } from '../phrases.js';

const KANJI = /[一-鿿]/;
const DIGIT = /[0-9０-９]/;
// Everything legitimately used: kana, kanji, CJK punctuation, fullwidth forms,
// ASCII, and the macron/accented latin used in romaji.
const ALLOWED = /^[぀-ゟ゠-ヿ一-鿿　-〿＀-￯ -~ -ſ‐-›¥]*$/;

test('library is populated', () => {
  assert.ok(PHRASES.length >= 70, `expected >= 70, got ${PHRASES.length}`);
});

test('ids are unique', () => {
  const ids = PHRASES.map(p => p.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('every phrase has all four forms', () => {
  for (const p of PHRASES) {
    for (const field of ['kanji', 'kana', 'romaji', 'en']) {
      assert.ok(p[field]?.trim(), `${p.id} missing ${field}`);
    }
  }
});

// Authoring guard: a stray character from another script is invisible on
// screen but silently destroys matching. This caught three Cyrillic
// characters inside 他の時間は空いていますか during development.
test('no field contains characters from an unexpected script', () => {
  for (const p of PHRASES) {
    for (const field of ['kanji', 'kana', 'romaji', 'en']) {
      const offenders = [...p[field]].filter(c => !ALLOWED.test(c));
      assert.equal(offenders.length, 0,
        `${p.id}.${field} has ${offenders.map(c =>
          `${c}(U+${c.codePointAt(0).toString(16).toUpperCase()})`).join(' ')}`);
    }
  }
});

test('kana fields contain no kanji and no digits', () => {
  for (const p of PHRASES) {
    assert.ok(!KANJI.test(p.kana), `${p.id} has kanji in kana: ${p.kana}`);
    assert.ok(!DIGIT.test(p.kana), `${p.id} has digits in kana: ${p.kana}`);
  }
});

test('every reply reference resolves', () => {
  for (const p of STAFF) {
    for (const id of p.replies ?? []) {
      assert.ok(byId(id), `${p.id} references unknown reply ${id}`);
    }
  }
});

test('every self phrase has a stage', () => {
  for (const p of SELF) assert.ok(p.stage, `${p.id} has no stage`);
});

test('no phrase carries a triggers field', () => {
  // Trigger bonuses were the primary false-positive generator and were removed.
  for (const p of PHRASES) assert.equal(p.triggers, undefined, `${p.id} still has triggers`);
});

test('confirmations are answered with "that is right", not "yes please"', () => {
  assert.deepEqual(byId('staff-confirm-back').replies, ['self-yes-right']);
});

test('there is a way to end the call', () => {
  assert.ok(byId('self-goodbye'));
  assert.ok(byStage('close').some(p => p.id === 'self-goodbye'));
});

test('panic phrases are all stage panic', () => {
  for (const p of PANIC) assert.equal(p.stage, 'panic');
  assert.ok(PANIC.length >= 4);
});

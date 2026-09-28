import test from 'node:test';
import assert from 'node:assert/strict';
import { RESTAURANTS, restaurantId, DEFAULT_RESTAURANT } from '../restaurants.js';
import { buildLibrary } from '../phrases.js';
import { match } from '../match.js';
import { staffSystemFor, openingTurnFor, scenariosFor, createStaffSim } from '../staff-sim.js';
import { NEGATIVES, corrupt } from './corpus.js';

const KANJI = /[一-鿿]/;
const DIGIT = /[0-9０-９]/;

test('restaurantId reads ?r= and falls back to the default', () => {
  assert.equal(restaurantId('?r=pst'), 'pst');
  assert.equal(restaurantId('?r=fujinoya'), 'fujinoya');
  assert.equal(restaurantId(''), DEFAULT_RESTAURANT);
  assert.equal(restaurantId('?r=nope'), DEFAULT_RESTAURANT);
  assert.equal(restaurantId('?r=toString'), DEFAULT_RESTAURANT, 'prototype keys are not restaurants');
});

for (const r of Object.values(RESTAURANTS)) {
  const lib = buildLibrary(r);

  test(`${r.id}: every phrase has four forms and clean kana`, () => {
    for (const p of lib.PHRASES) {
      for (const f of ['kanji', 'kana', 'romaji', 'en']) assert.ok(p[f]?.trim(), `${p.id}.${f}`);
      assert.ok(!KANJI.test(p.kana) && !DIGIT.test(p.kana), `${p.id} kana: ${p.kana}`);
      assert.ok(!/undefined|null/.test(p.kanji + p.kana + p.romaji + p.en), `${p.id} has an unfilled template`);
      assert.equal(p.when, undefined, `${p.id} leaked its when: gate`);
    }
  });

  test(`${r.id}: every suggested reply exists for this restaurant`, () => {
    for (const p of lib.STAFF) for (const id of p.replies ?? []) {
      assert.ok(lib.byId(id), `${p.id} -> ${id} is not in the ${r.id} library`);
    }
  });

  test(`${r.id}: every staff phrase identifies itself in kanji and kana`, () => {
    const failures = [];
    for (const p of lib.STAFF) for (const form of ['kanji', 'kana']) {
      const m = match(p[form], lib.STAFF);
      if (!m.confident || m.top.phrase.id !== p.id) failures.push(`${p.id} (${form})`);
    }
    assert.deepEqual(failures, []);
  });

  test(`${r.id}: unscripted staff speech stays under 2% false matches`, () => {
    const wrong = NEGATIVES.filter(n => match(n, lib.STAFF).confident);
    assert.ok(wrong.length / NEGATIVES.length < 0.02, `false positives: ${wrong.join(' | ')}`);
  });

  test(`${r.id}: corrupted speech never resolves to the wrong phrase`, () => {
    const wrong = lib.STAFF.flatMap(p => corrupt(p).map(c => ({ ...c, expect: p.id })))
      .filter(c => { const m = match(c.text, lib.STAFF); return m.confident && m.top.phrase.id !== c.expect; });
    assert.deepEqual(wrong.map(w => `${w.label}: ${w.text}`), []);
  });

  test(`${r.id}: no stage in the stepper is empty`, () => {
    for (const s of lib.STAGES) assert.ok(lib.byStage(s.id).length > 0, s.id);
  });

  test(`${r.id}: the greeting, prompt and booking name this restaurant`, () => {
    assert.ok(openingTurnFor(r).ja.includes(r.name.ja.replace(/\s+/g, '')));
    assert.ok(staffSystemFor(r).includes(r.sim.identity));
    assert.ok(lib.byId('staff-greeting').kanji.includes(r.name.short));
    assert.ok(lib.byId('self-datetime').kanji.startsWith(r.date.ja));
  });
}

test('topics only appear where they apply', () => {
  const pst = buildLibrary(RESTAURANTS.pst);
  const hiyama = buildLibrary(RESTAURANTS.hiyama);
  assert.equal(pst.byId('staff-zashiki-or-table'), undefined, 'PST has no tatami rooms');
  assert.equal(pst.byId('self-budget'), undefined, 'PST has no courses');
  assert.ok(pst.byId('staff-cashless'), 'PST is cashless');
  assert.equal(hiyama.byId('staff-cashless'), undefined);
  assert.ok(hiyama.byId('staff-holiday-busy'), '3 Nov is a holiday');
  assert.equal(pst.byId('staff-holiday-busy'), undefined, '1 Nov is not');
});

test('the course scenario is offered only where there are courses', () => {
  assert.ok(scenariosFor(RESTAURANTS.hiyama).some(([id]) => id === 'insist-course'));
  assert.ok(!scenariosFor(RESTAURANTS.pst).some(([id]) => id === 'insist-course'));
  assert.throws(() => createStaffSim({ callClaude: async () => '', scenario: 'insist-course', restaurant: RESTAURANTS.pst }),
    /does not apply/);
});

test('date traps are called out on the date card', () => {
  assert.match(buildLibrary(RESTAURANTS.hiyama).byId('self-datetime').note, /みっか/);
  assert.match(buildLibrary(RESTAURANTS.pst).byId('self-datetime').note, /ついたち/);
});

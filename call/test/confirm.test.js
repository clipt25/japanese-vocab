import test from 'node:test';
import assert from 'node:assert/strict';
import { RESTAURANTS, profileFor, purposeId } from '../restaurants.js';
import { buildLibrary } from '../phrases.js';
import { keigoIn } from '../register.js';
import { CONFIRM_STAGES } from '../confirm.js';
import { SCENARIOS, scenariosFor, staffSystemFor, createStaffSim } from '../staff-sim.js';

const confirming = Object.values(RESTAURANTS).map(r => profileFor(r, 'confirm'));

test('?call=confirm picks the confirmation call; anything else books', () => {
  assert.equal(purposeId('?r=nagomi&call=confirm'), 'confirm');
  assert.equal(purposeId('?r=nagomi'), 'book');
  assert.equal(purposeId('?call=cancel'), 'book');
});

for (const r of confirming) {
  test(`${r.id}: the confirmation script opens with 予約の確認 and runs on its own stages`, () => {
    const lib = buildLibrary(r);
    assert.deepEqual(lib.STAGES.map(s => s.id), CONFIRM_STAGES.map(s => s.id));
    assert.equal(lib.byStage('open')[0].id, 'self-confirm-open');
    assert.match(lib.byId('self-confirm-details').kanji, new RegExp(r.date.ja));
    assert.match(lib.byId('self-confirm-details').kanji, new RegExp(r.time.ja));
    // Booking-only stages are gone: no "what course would you like" mid-check.
    assert.equal(lib.byStage('course').length, 0);
  });

  test(`${r.id}: none of his confirmation lines use keigo`, () => {
    const offenders = buildLibrary(r).SELF.filter(p => keigoIn(p.kanji).length > 0).map(p => p.id);
    assert.deepEqual(offenders, []);
  });

  test(`${r.id}: every staff line suggests only lines that exist in this call`, () => {
    const lib = buildLibrary(r);
    const dangling = lib.STAFF.flatMap(p => (p.replies ?? []).filter(id => !lib.byId(id)).map(id => `${p.id} -> ${id}`));
    assert.deepEqual(dangling, []);
    assert.ok(lib.byId('staff-greeting').replies.includes('self-confirm-open'));
    assert.ok(lib.byId('staff-confirm-not-found').replies.length > 0);
  });

  test(`${r.id}: "how I booked" only when it is on record`, () => {
    const lib = buildLibrary(r);
    assert.equal(Boolean(lib.byId('self-booked-phone')), r.booked?.via === 'phone');
    assert.equal(Boolean(lib.byId('self-booked-online')), r.booked?.via === 'online');
  });

  test(`${r.id}: the rehearsal staff are checking, not taking, a booking`, () => {
    assert.match(staffSystemFor(r), /check a reservation he says he already has/);
    const ids = scenariosFor(r).map(([id]) => id);
    assert.ok(ids.length >= 3 && ids.every(id => SCENARIOS[id].purpose === 'confirm'));
  });
}

test('booking calls never offer a confirmation scenario', () => {
  for (const r of Object.values(RESTAURANTS)) {
    assert.ok(scenariosFor(profileFor(r)).every(([, s]) => (s.purpose ?? 'book') === 'book'));
  }
});

test('Fujinoya: the confirmation is for the 12:30 actually booked, and the wrong-time scenario uses 12:15', async () => {
  const r = profileFor(RESTAURANTS.fujinoya, 'confirm');
  assert.match(buildLibrary(r).byId('self-confirm-details').kanji, /12時半/);
  let system = '';
  const sim = createStaffSim({ scenario: 'confirm-time', restaurant: r,
    callClaude: async ({ system: s }) => { system = s; return 'PACE: normal\nKANA: はい。\nJA: はい。\nROMAJI: Hai.\nEN: Yes.\nEND: no'; } });
  sim.opening();
  await sim.reply('すみません、予約の確認をお願いします。');
  assert.match(system, /12:15 instead of 12:30/);
  assert.doesNotMatch(system, /\{[A-Z_]+\}/, 'a scenario placeholder was left unfilled');
});

import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// A minimal localStorage, so storage behaviour is tested without a browser.
function fakeStorage() {
  const map = new Map();
  return { getItem: k => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)),
           removeItem: k => map.delete(k), _map: map };
}
beforeEach(() => { globalThis.localStorage = fakeStorage(); });

const { startSession, saveSession, loadSessions, deleteSession, sessionToText, MAX_SESSIONS } =
  await import('../sessions.js');

const hiyama = { id: 'hiyama', name: { ja: 'すき焼割烹 日山', shortRomaji: 'Hiyama' } };
const row = (who, ja, en, at = 0) => ({ who, ja, en, at });

test('a session with lines round-trips through storage', () => {
  const s = startSession({ restaurant: hiyama, kind: 'call', now: 1000 });
  s.rows = [row('staff', 'お名前をお願いいたします', 'Your name, please.', 1200)];
  saveSession(s);
  const [loaded] = loadSessions();
  assert.equal(loaded.id, s.id);
  assert.equal(loaded.restaurantName, 'すき焼割烹 日山');
  assert.equal(loaded.kind, 'call');
  assert.deepEqual(loaded.rows, s.rows);
});

test('saving the same session again updates it instead of duplicating', () => {
  const s = startSession({ restaurant: hiyama, kind: 'call' });
  s.rows = [row('staff', 'はい', 'Yes.')];
  saveSession(s);
  s.rows.push(row('staff', '少々お待ちください', 'One moment.'));
  saveSession(s);
  assert.equal(loadSessions().length, 1);
  assert.equal(loadSessions()[0].rows.length, 2);
});

test('an empty session is never stored, and saving it empty removes it', () => {
  const s = startSession({ restaurant: hiyama, kind: 'call' });
  saveSession(s);
  assert.equal(loadSessions().length, 0);
  s.rows = [row('staff', 'はい', 'Yes.')]; saveSession(s);
  s.rows = []; saveSession(s);
  assert.equal(loadSessions().length, 0);
});

test('newest first, and only the most recent sessions are kept', () => {
  for (let i = 0; i < MAX_SESSIONS + 5; i += 1) {
    const s = startSession({ restaurant: hiyama, kind: 'call', now: i });
    s.rows = [row('staff', `${i}`, `${i}`)];
    saveSession(s);
  }
  const all = loadSessions();
  assert.equal(all.length, MAX_SESSIONS);
  assert.equal(all[0].startedAt, MAX_SESSIONS + 4, 'newest first');
});

test('delete removes exactly one session', () => {
  const a = startSession({ restaurant: hiyama, kind: 'call', now: 1 }); a.rows = [row('staff', 'a', 'a')]; saveSession(a);
  const b = startSession({ restaurant: hiyama, kind: 'rehearsal', now: 2 }); b.rows = [row('staff', 'b', 'b')]; saveSession(b);
  deleteSession(a.id);
  assert.deepEqual(loadSessions().map(s => s.id), [b.id]);
});

test('corrupt storage reads as no sessions instead of crashing the page', () => {
  localStorage.setItem('call-sessions', '{not json');
  assert.deepEqual(loadSessions(), []);
});

test('storage that throws (private mode, full disk) is survived', () => {
  globalThis.localStorage = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('full'); } };
  const s = startSession({ restaurant: hiyama, kind: 'call' }); s.rows = [row('staff', 'はい', 'Yes.')];
  assert.equal(saveSession(s), false);
  assert.deepEqual(loadSessions(), []);
});

test('a transcript copies as readable text, in order, with who said it', () => {
  const s = startSession({ restaurant: hiyama, kind: 'call', now: Date.UTC(2026, 9, 1, 5, 0, 0) });
  s.rows = [row('staff', 'ご予約でしょうか', 'Is this a reservation?', 0), row('you', 'すみません、予約をお願いします', '', 65_000)];
  const text = sessionToText(s);
  assert.match(text, /すき焼割烹 日山/);
  assert.ok(text.indexOf('Is this a reservation?') < text.indexOf('すみません'));
  assert.match(text, /01:05/, 'times are shown from the start of the call');
  assert.match(text, /You/);
});

test('copied text carries the kana and romaji readings', () => {
  const s = startSession({ restaurant: hiyama, kind: 'call' });
  s.rows = [{ who: 'staff', ja: '何名様でしょうか', en: 'How many people?', kana: 'なんめいさまでしょうか', romaji: 'Nanmei-sama deshō ka', at: 0 }];
  const text = sessionToText(s);
  assert.match(text, /なんめいさまでしょうか/);
  assert.match(text, /Nanmei-sama deshō ka/);
});

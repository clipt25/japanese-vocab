// Every call and rehearsal, saved so the transcript can be reread after the
// page is closed. Saved continuously while the call runs - if the tab crashes
// or is closed mid-call, what was said so far survives.
//
// Stored in this browser only (localStorage): private to this computer, and it
// does not follow him to another device. Storage can be unavailable (private
// windows, a full disk); that must never break the call itself, so every read
// and write here fails soft.

const KEY = 'call-sessions';
export const MAX_SESSIONS = 40;

export function loadSessions() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function store(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_SESSIONS)));
    return true;
  } catch {
    return false;
  }
}

export function startSession({ restaurant, kind, now = Date.now() }) {
  return {
    id: `${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    restaurantId: restaurant.id,
    restaurantName: restaurant.name.ja,
    kind,                       // 'call' | 'rehearsal'
    startedAt: now,
    endedAt: null,
    rows: [],                   // { who: 'staff' | 'you', ja, en, at } - at: ms from the start
  };
}

// An empty session is never kept: an accidental Start/End leaves no clutter.
export function saveSession(session) {
  const others = loadSessions().filter(s => s.id !== session.id);
  if (!session.rows?.length) return store(others);
  return store([session, ...others].sort((a, b) => b.startedAt - a.startedAt));
}

export function deleteSession(id) {
  return store(loadSessions().filter(s => s.id !== id));
}

function clock(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function describeSession(session) {
  const when = new Date(session.startedAt).toLocaleString(undefined,
    { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const kind = session.kind === 'rehearsal' ? 'Rehearsal' : 'Call';
  return `${session.restaurantName} · ${kind} · ${when} · ${session.rows.length} lines`;
}

// Plain text, in order, with who said it and when - to paste into a note.
export function sessionToText(session) {
  const lines = [describeSession(session), ''];
  for (const r of session.rows) {
    const who = r.who === 'you' ? 'You' : 'Staff';
    lines.push(`[${clock(r.at ?? 0)}] ${who}: ${r.ja || r.en}`);
    if (r.who !== 'you' && r.en && r.ja) lines.push(`        → ${r.en}`);
  }
  return lines.join('\n');
}

// The slow path. Only ever invoked by an explicit tap, never automatically and
// never from an interim result.

const KEY_STORAGE = 'jp-vocab-apikey';   // shared with the vocab app: same origin
const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5';        // fast and cheap; no adaptive thinking

export function getKey() {
  try { return localStorage.getItem(KEY_STORAGE) ?? ''; } catch { return ''; }
}
export function setKey(key) {
  try { localStorage.setItem(KEY_STORAGE, key.trim()); } catch { /* private mode */ }
}
export function hasKey() { return getKey().length > 0; }

const SYSTEM = [
  'You help someone on a live phone call with a Japanese restaurant.',
  'Reply with ONLY a JSON object, no prose and no code fence:',
  '{"kanji":"","kana":"","romaji":"","english":""}',
  'kana must contain kana only — no kanji, no digits.',
  'romaji uses macrons. Keep replies short and phone-appropriate, polite register.',
].join(' ');

// Shared transport. Both the fallback translator and the rehearsal staff
// simulator go through here, so the two known traps are handled once:
// thinking blocks can precede the text block, and the reply may arrive fenced.
export async function callClaude({ system, messages, maxTokens = 1024 }) {
  const key = getKey();
  if (!key) throw new Error('No API key saved');

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages }),
  });

  if (!response.ok) throw new Error(`API error ${response.status}`);
  const data = await response.json();
  if (data.stop_reason === 'refusal') throw new Error('Claude declined that one');

  // Filter by block type rather than taking content[0]. Models with thinking
  // enabled put a thinking block first, so content[0].text is undefined — which
  // fails intermittently and therefore passes a manual test then breaks live.
  const text = (data.content ?? [])
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('')
    .trim();
  if (!text) throw new Error('Empty reply from Claude');
  return text;
}

export function parseJsonReply(text) {
  const unfenced = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(unfenced);
  } catch {
    // Models occasionally wrap the object in a sentence; take the outermost braces.
    const first = unfenced.indexOf('{');
    const last = unfenced.lastIndexOf('}');
    if (first >= 0 && last > first) return JSON.parse(unfenced.slice(first, last + 1));
    throw new Error('Could not read the reply');
  }
}

async function ask(userContent) {
  const text = await callClaude({ system: SYSTEM, messages: [{ role: 'user', content: userContent }] });
  return parseJsonReply(text);
}

export function translateJapanese(japanese) {
  return ask(`The restaurant staff said this. Give me the four forms:\n${japanese}`);
}
export function composeEnglish(english) {
  return ask(`I need to say this politely on the phone in Japanese:\n${english}`);
}

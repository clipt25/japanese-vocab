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

async function ask(userContent) {
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
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{ role: 'user', content: userContent }],
    }),
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

  try {
    return JSON.parse(text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, ''));
  } catch {
    throw new Error('Could not read the reply');
  }
}

export function translateJapanese(japanese) {
  return ask(`The restaurant staff said this. Give me the four forms:\n${japanese}`);
}
export function composeEnglish(english) {
  return ask(`I need to say this politely on the phone in Japanese:\n${english}`);
}

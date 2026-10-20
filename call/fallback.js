import { PLAIN_POLITE_RULE } from './register.js';

// The slow path. Only ever invoked by an explicit tap, never automatically and
// never from an interim result.

const KEY_STORAGE = 'jp-vocab-apikey';   // shared with the vocab app: same origin
const ENDPOINT = 'https://api.anthropic.com/v1/messages';
// The composer and the tap-to-translate fallback: Opus 5 with thinking off.
// Opus 5.5 at low effort spent 3.9-5.2 s thinking before its first word
// (measured 2026-10-20); he is mid-call when he asks for these, and Opus 5 is
// the same quality tier for a one-line polite sentence, in about 2 s.
export const COMPOSER_LANE = { model: 'claude-opus-5', thinking: { type: 'disabled' } };

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
  'romaji uses macrons. Keep replies short and phone-appropriate.',
  PLAIN_POLITE_RULE,
].join(' ');

// The API explains itself in the body - "Your credit balance is too low to
// access the Anthropic API". A bare "API error 400" on a live call left him
// guessing why the English had stopped. Billing and key failures are fatal:
// nothing will translate until they are fixed, so callers must say so loudly.
export async function apiError(response) {
  let message = '';
  try { message = (await response.json())?.error?.message ?? ''; } catch { /* no JSON body */ }
  const fatal = response.status === 401 || response.status === 403
    || /credit balance|billing|api key|x-api-key|authentication/i.test(message);
  return Object.assign(new Error(message || `API error ${response.status}`),
    { status: response.status, fatal });
}

// One tiny request before a call starts, so an empty balance or a bad key is
// found BEFORE he dials - not when the English silently stops mid-call.
export async function checkApi() {
  const key = getKey();
  if (!key) throw Object.assign(new Error('No API key saved'), { fatal: true });
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: 'claude-sonnet-5', max_tokens: 1, thinking: { type: 'disabled' },
                           messages: [{ role: 'user', content: 'ok' }] }),
  });
  if (!response.ok) throw await apiError(response);
}

// Shared transport. Both the fallback translator and the rehearsal staff
// simulator go through here, so the two known traps are handled once:
// thinking blocks can precede the text block, and the reply may arrive fenced.
export async function callClaude({ system, messages, maxTokens = 3000, lane = COMPOSER_LANE }) {
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
    body: JSON.stringify({ ...lane, max_tokens: maxTokens, system, messages }),
  });

  if (!response.ok) throw await apiError(response);
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

// Streaming transport, shared by the live interpreter and the rehearsal staff.
// One retry for the failures a Jakarta-to-US line actually produces: a dropped
// connection, an overloaded or rate-limited API. A silent line on the call is
// worse than one that arrives 300ms late.
const RETRY_STATUS = new Set([429, 500, 502, 503, 504, 529]);

export async function streamClaude(body, onText) {
  try {
    return await streamOnce(body, onText);
  } catch (error) {
    if (!error.retryable) throw error;
    await new Promise(resolve => setTimeout(resolve, 300));
    return streamOnce(body, onText);
  }
}

async function streamOnce(body, onText) {
  let response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': getKey(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ ...body, stream: true }),
    });
  } catch (error) {
    throw Object.assign(new Error(`network: ${error.message}`), { retryable: true });
  }
  if (!response.ok) {
    const error = await apiError(response);
    throw Object.assign(error, { retryable: !error.fatal && RETRY_STATUS.has(response.status) });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let end;
    while ((end = buffer.indexOf('\n\n')) >= 0) {
      const data = buffer.slice(0, end).split('\n').find(l => l.startsWith('data: '));
      buffer = buffer.slice(end + 2);
      if (!data) continue;
      const event = JSON.parse(data.slice(6));
      // Thinking blocks (Opus 5.5 always thinks) stream as their own deltas.
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        text += event.delta.text;
        onText?.(text);
      } else if (event.type === 'error') {
        // overloaded_error mid-stream is worth one more try; others are not.
        throw Object.assign(new Error(event.error?.message ?? 'Stream error'),
                            { retryable: event.error?.type === 'overloaded_error' && !text });
      }
    }
  }
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

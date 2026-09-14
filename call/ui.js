import { PANIC, STAGES, byStage, byId } from './phrases.js';
import { speak } from './speak.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function renderPhrase(phrase, { compact = false } = {}) {
  const card = el('article', `phrase phrase--${phrase.who}`);
  card.dataset.id = phrase.id;

  const play = el('button', 'phrase__speak', '▶');
  play.type = 'button';
  play.setAttribute('aria-label', `Speak: ${phrase.romaji}`);
  // Always the kana — kanji makes TTS read 11月3日 as さんにち and 8063 as a
  // single large number.
  play.addEventListener('click', () => speak(phrase));
  card.append(play);

  card.append(el('p', 'phrase__kanji', phrase.kanji));
  card.append(el('p', 'phrase__kana', phrase.kana));
  card.append(el('p', 'phrase__romaji', phrase.romaji));
  card.append(el('p', 'phrase__en', phrase.en));
  if (phrase.note && !compact) card.append(el('p', 'phrase__note', phrase.note));
  return card;
}

export function renderScript(root) {
  root.replaceChildren();
  STAGES.forEach((stage, index) => {
    const lines = byStage(stage.id);
    if (lines.length === 0) return;

    const section = el('section', 'stage');
    const header = el('button', 'stage__label');
    header.type = 'button';
    header.append(el('span', 'stage__name', stage.label));
    header.append(el('span', 'stage__count', String(lines.length)));
    const body = el('div', 'stage__body');
    for (const line of lines) body.append(renderPhrase(line));

    // Accordion: over 2,000px of script is unreadable mid-call. One stage open.
    const open = index === 0;
    section.dataset.open = String(open);
    header.setAttribute('aria-expanded', String(open));
    header.addEventListener('click', () => {
      const nowOpen = section.dataset.open !== 'true';
      for (const other of root.querySelectorAll('.stage')) other.dataset.open = 'false';
      section.dataset.open = String(nowOpen);
      header.setAttribute('aria-expanded', String(nowOpen));
    });

    section.append(header, body);
    root.append(section);
  });
}

export function renderPanic(root) {
  root.replaceChildren();
  for (const phrase of PANIC) {
    const button = el('button', 'panic__btn');
    button.type = 'button';
    button.append(el('span', 'panic__en', phrase.en));
    button.append(el('span', 'panic__kanji', phrase.kanji));
    button.append(el('span', 'panic__romaji', phrase.romaji));
    button.addEventListener('click', () => speak(phrase));
    root.append(button);
  }
}

function renderReplies(root, phrase) {
  const ids = phrase?.replies ?? [];
  if (ids.length === 0) return;
  root.append(el('h3', 'radar__sublabel', 'Say back'));
  for (const id of ids) {
    const reply = byId(id);
    if (reply) root.append(renderPhrase(reply, { compact: true }));
  }
}

export function renderRadar(root, result, { transcript, isFinal, onFallback }) {
  root.replaceChildren();

  const heard = el('div', 'radar__heard');
  heard.append(el('p', 'radar__sublabel', isFinal ? 'Heard' : 'Hearing…'));
  heard.append(el('p', 'radar__transcript', transcript || '—'));
  root.append(heard);

  if (!result.confident) {
    root.append(el('p', 'radar__nomatch', 'No confident match — use your script'));
    if (transcript && isFinal && onFallback) {
      const ask = el('button', 'radar__fallback', 'Ask Claude what that meant');
      ask.type = 'button';
      ask.addEventListener('click', () => onFallback(transcript, root));
      root.append(ask);
    }
    return;
  }

  root.append(renderPhrase(result.top.phrase));

  // Showing a match is information; a reply chip is an instruction. Gate the
  // instruction harder — this is what stops the app telling him to say はい to
  // something it only half-recognised.
  if (result.showReply) {
    const replies = el('div', 'radar__replies');
    renderReplies(replies, result.top.phrase);
    root.append(replies);
  } else {
    root.append(el('p', 'radar__lowconf', 'Not confident enough to suggest a reply'));
  }

  const others = result.candidates.slice(1).filter(c => c.score > 0.35);
  if (others.length > 0) {
    root.append(el('p', 'radar__sublabel', 'Or possibly'));
    for (const other of others) {
      root.append(el('p', 'radar__alt', `${other.phrase.kanji} — ${other.phrase.en}`));
    }
  }
}

export function renderFallbackResult(root, forms) {
  root.replaceChildren();
  root.append(renderPhrase({
    id: 'fallback', who: 'staff',
    kanji: forms.kanji, kana: forms.kana,
    romaji: forms.romaji, en: forms.english,
  }));
}

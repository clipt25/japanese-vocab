import { PANIC, STAGES, byStage, byId } from './phrases.js';
import { speak } from './speak.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// ── Phrase cards ────────────────────────────────────────────────────────────
// The two panels have opposite jobs, and the type scale keyed on
// .phrase--self / .phrase--staff expresses that: when SPEAKING the romaji
// leads, because he is N4 and cannot sight-read keigo at speed; when LISTENING
// the English leads, because the only question is "what did they just ask?"
export function renderPhrase(phrase, { who = phrase.who } = {}) {
  const card = el('article', `phrase phrase--${who}`);
  card.dataset.id = phrase.id;

  const play = el('button', 'phrase__speak', '▶');
  play.type = 'button';
  play.setAttribute('aria-label', `Speak: ${phrase.romaji}`);
  play.addEventListener('click', () => speak(phrase));   // kana, never kanji
  card.append(play);

  card.append(el('p', 'phrase__en', phrase.en));
  card.append(el('p', 'phrase__romaji', phrase.romaji));
  card.append(el('p', 'phrase__kanji', phrase.kanji));
  card.append(el('p', 'phrase__kana', phrase.kana));
  // Notes are the highest-value content in the library ("にー not に — 2 is the
  // most misheard digit"). They are never suppressed, in either panel.
  if (phrase.note) card.append(el('p', 'phrase__note', phrase.note));
  return card;
}

// ── Script: a linear stepper, not an accordion ──────────────────────────────
// A reservation call has no random access — stage N+1 always follows stage N.
// The accordion charged a full reflow for navigation the call never needs.
let scriptRoot = null;
let stepperRoot = null;
let currentStage = 0;

export function stageIndexOfPhrase(phraseId) {
  const phrase = byId(phraseId);
  if (!phrase?.stage) return -1;
  return STAGES.findIndex(s => s.id === phrase.stage);
}

export function setStage(index) {
  if (!scriptRoot || index < 0 || index >= STAGES.length) return;
  currentStage = index;
  for (const section of scriptRoot.querySelectorAll('.stage')) {
    section.hidden = Number(section.dataset.index) !== index;
  }
  for (const step of stepperRoot.querySelectorAll('.step')) {
    step.dataset.current = String(Number(step.dataset.index) === index);
  }
  scriptRoot.scrollTop = 0;
}

export function nextStage() { setStage(Math.min(currentStage + 1, STAGES.length - 1)); }
export function prevStage() { setStage(Math.max(currentStage - 1, 0)); }

export function renderScript(root, stepper) {
  scriptRoot = root; stepperRoot = stepper;
  root.replaceChildren();
  stepper.replaceChildren();

  STAGES.forEach((stage, index) => {
    const step = el('button', 'step', stage.label);
    step.type = 'button';
    step.dataset.index = String(index);
    step.addEventListener('click', () => setStage(index));
    stepper.append(step);

    const section = el('section', 'stage');
    section.dataset.index = String(index);
    for (const line of byStage(stage.id)) section.append(renderPhrase(line));
    root.append(section);
  });

  // append() returns undefined, so build the node first.
  const hint = el('span', '', '← → stages · 1-5 panic');
  hint.id = 'stepper-hint';
  stepper.append(hint);
  setStage(0);
}

// ── Panic bar ───────────────────────────────────────────────────────────────
export function renderPanic(root) {
  root.replaceChildren();
  PANIC.forEach((phrase, index) => {
    const button = el('button', 'panic__btn');
    button.type = 'button';
    button.append(el('span', 'panic__key', String(index + 1)));
    button.append(el('span', 'panic__en', phrase.en));
    button.append(el('span', 'panic__romaji', phrase.romaji));
    button.append(el('span', 'panic__kanji', phrase.kanji));
    button.addEventListener('click', () => speak(phrase));
    root.append(button);
  });
}

export function speakPanic(index) {
  const phrase = PANIC[index];
  if (phrase) speak(phrase);
}

// ── Radar ───────────────────────────────────────────────────────────────────
export function renderRadar(root, result, { transcript, isFinal, onFallback }) {
  root.replaceChildren();

  if (!transcript) {
    root.append(el('p', 'radar__idle', 'Listening for the staff…'));
    return;
  }

  if (!result.confident) {
    root.append(el('p', 'radar__sublabel', isFinal ? 'Heard' : 'Hearing…'));
    root.append(el('p', 'radar__transcript', transcript || '—'));
    root.append(el('p', 'radar__nomatch', 'Not sure — use the script below'));
    if (transcript && isFinal && onFallback) {
      const ask = el('button', 'radar__fallback', 'Ask Claude what that meant');
      ask.type = 'button';
      ask.addEventListener('click', () => onFallback(transcript, root));
      root.append(ask);
    }
    // Deliberately NO "or possibly" list. Those are scores the matcher already
    // refused; showing them manufactures the false confidence the margin exists
    // to prevent.
    return;
  }

  root.append(renderPhrase(result.top.phrase));

  if (result.showReply) {
    for (const id of result.top.phrase.replies ?? []) {
      const reply = byId(id);
      if (reply) root.append(renderPhrase(reply));
    }
  } else {
    root.append(el('p', 'radar__lowconf', 'Not confident enough to suggest a reply'));
  }
}

export function renderFallbackResult(root, forms, who = 'staff') {
  root.replaceChildren();
  root.append(renderPhrase({
    id: 'fallback', who,
    kanji: forms.kanji, kana: forms.kana,
    romaji: forms.romaji, en: forms.english,
  }, { who }));
}

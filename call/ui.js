import { PANIC, STAGES, STAFF, byStage, byId } from './phrases.js';
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
let radarRoot = null;
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
  // The idle band names the stage he is standing in. When he walks the stepper
  // himself nothing re-renders the radar, so the band would keep naming the
  // stage he left - a cockpit instrument reading a stale value.
  const standing = radarRoot?.querySelector('.radar__band-text--stage');
  if (standing) standing.textContent = STAGES[index].label;
  scriptRoot.scrollTop = 0;
}

export function nextStage() { setStage(Math.min(currentStage + 1, STAGES.length - 1)); }
export function prevStage() { setStage(Math.max(currentStage - 1, 0)); }
export function currentStageLabel() { return STAGES[currentStage]?.label ?? ''; }

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
    // On screen the stepper is the heading. On paper there is no stepper, and
    // an unlabelled run of 44 phrases is unusable - so every section carries a
    // print-only heading.
    section.append(el('h2', 'stage__heading print-only', stage.label));
    for (const line of byStage(stage.id)) section.append(renderPhrase(line));
    root.append(section);
  });

  // append() returns undefined, so build the node first.
  const hint = el('span', '', '← → stages · 1-5 panic');
  hint.id = 'stepper-hint';
  stepper.append(hint);
  setStage(0);
}

// ── Paper fallback ──────────────────────────────────────────────────────────
// The script holds SELF phrases only, so the printout used to contain nothing
// he might HEAR - exactly the half he cannot improvise. On paper he is reading
// to understand, so these render with the .phrase--staff scale: English leads.
export function renderStaffSheet(root) {
  root.replaceChildren();
  root.append(el('h2', 'sheet__heading', 'What they may say'));
  for (const phrase of STAFF) root.append(renderPhrase(phrase));
}

// ── Panic bar ───────────────────────────────────────────────────────────────
export function renderPanic(root, { onPick } = {}) {
  root.replaceChildren();
  PANIC.forEach((phrase, index) => {
    const button = el('button', 'panic__btn');
    button.type = 'button';
    button.append(el('span', 'panic__key', String(index + 1)));
    button.append(el('span', 'panic__en', phrase.en));
    button.append(el('span', 'panic__romaji', phrase.romaji));
    button.append(el('span', 'panic__kanji', phrase.kanji));
    button.addEventListener('click', () => (onPick ? onPick(index) : speak(phrase)));
    root.append(button);
  });
}

export function speakPanic(index) {
  const phrase = PANIC[index];
  if (phrase) speak(phrase);
}

// ── Radar ───────────────────────────────────────────────────────────────────
// The radar's first child is always a one-line BAND, and the band is never
// empty: with nothing heard it names the stage he is standing in. That is what
// lets the reservation shrink to a fixed ~60px in call mode without ever
// resizing - there is no "empty" state to collapse into, and no "full" state to
// grow into. Everything richer than the band is detail, shown in prep mode and
// suppressed on the live call, where the script below is the thing he needs.
export function renderRadar(root, result, { transcript, isFinal, onFallback }) {
  radarRoot = root;
  root.replaceChildren();

  const band = el('div', 'radar__band');
  const label = el('span', 'radar__band-label');
  const text = el('span', 'radar__band-text');
  band.append(label, text);
  root.append(band);

  if (!result.confident) {
    if (!transcript) {
      band.classList.add('radar__band--idle');
      label.textContent = 'Now';
      text.classList.add('radar__band-text--stage');
      text.textContent = currentStageLabel();
      return;
    }

    band.classList.add('radar__band--miss');
    label.textContent = isFinal ? 'Heard' : 'Hearing';
    text.classList.add('radar__band-text--jp');
    text.textContent = transcript;
    if (isFinal && onFallback) {
      const ask = el('button', 'radar__fallback', 'Ask Claude');
      ask.type = 'button';
      ask.setAttribute('aria-label', 'Ask Claude what that meant');
      ask.addEventListener('click', () => onFallback(transcript, root));
      band.append(ask);
    }
    root.append(el('p', 'radar__nomatch', 'Not sure — use the script below'));
    // Deliberately NO "or possibly" list. Those are scores the matcher already
    // refused; showing them manufactures the false confidence the margin exists
    // to prevent.
    return;
  }

  band.classList.add('radar__band--hit');
  label.textContent = 'They said';
  text.textContent = result.top.phrase.en;

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

// ── Rehearsal debrief ───────────────────────────────────────────────────────
// The whole call with translations, plus what the radar did with each staff
// line. Nothing here is shown during the call — only after, like a real debrief.
export function renderDebrief(root, turns, report) {
  root.replaceChildren();
  root.append(el('h2', 'debrief__title', 'Rehearsal debrief'));

  const pct = report.total ? Math.round((report.caught / report.total) * 100) : 0;
  root.append(el('p', 'debrief__summary',
    `Radar caught ${report.caught} of ${report.total} staff lines (${pct}%). `
    + 'It heard them perfectly here — on the real phone line, expect fewer.'));

  const list = el('ol', 'debrief__list');
  let staffIndex = 0;
  for (const turn of turns) {
    const item = el('li', `debrief__turn debrief__turn--${turn.who}`);
    if (turn.who === 'staff') {
      const row = report.rows[staffIndex++];
      item.append(el('span', 'debrief__who', 'Staff'));
      item.append(el('p', 'debrief__ja', turn.ja));
      item.append(el('p', 'debrief__en', turn.en));
      item.append(el('p', `debrief__radar debrief__radar--${row?.caught ? 'hit' : 'miss'}`,
        row?.caught ? `Radar: “${row.matchedAs}”` : 'Radar: silent'));
    } else {
      item.append(el('span', 'debrief__who', 'You'));
      item.append(el('p', 'debrief__ja', turn.text));
    }
    list.append(item);
  }
  root.append(list);
}

import { normalize } from './normalize.js';
import { dice } from './dice.js';

// These are SAFETY properties, not tuning knobs. Measured against 56 unscripted
// staff utterances, the original design (0.40 threshold + trigger bonuses)
// confidently matched 80.6% of speech it had no entry for, AND attached a
// suggested reply. Per 20-utterance call that was 7.0 wrong answers; this
// configuration brings it to 0.2, at the cost of being silent more often.
// Silence is safe: he glances left at the script.
export const MATCH_THRESHOLD = 0.75;   // was 0.40
export const MATCH_MARGIN = 0.20;      // top1 must beat top2 by this
export const REPLY_GATE = 0.85;        // showing a match informs; a reply chip instructs

const MAX_CANDIDATES = 3;

// No trigger bonus. Capping it changed nothing (29/36 negatives before and
// after) because most false positives are surface-driven; and katakana/hiragana
// trigger pairs double-scored, since normalize() folds katakana to hiragana
// BEFORE the substring test. No min(1,...) clamp either: 533 of 1436 scores
// saturated at exactly 1.000, destroying the ranking the margin depends on.
export function scorePhrase(transcript, phrase) {
  const t = normalize(transcript);
  if (!t) return 0;
  return Math.max(
    dice(t, normalize(phrase.kanji)),
    dice(t, normalize(phrase.kana)),
  );
}

export function match(transcript, library, options = {}) {
  const {
    threshold = MATCH_THRESHOLD,
    margin = MATCH_MARGIN,
    limit = MAX_CANDIDATES,
  } = options;

  const ranked = library
    .map(phrase => ({ phrase, score: scorePhrase(transcript, phrase) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const [best, second] = ranked;
  const clearsBar = Boolean(best) && best.score >= threshold;
  // A near-tie means two entries are indistinguishable on this input. Refusing
  // to pick is correct: it is exactly the is-reservation/what-date collision.
  const isSeparated = !second || (best.score - second.score) >= margin;
  const confident = clearsBar && isSeparated;

  return {
    confident,
    top: confident ? best : null,
    showReply: confident && best.score >= REPLY_GATE,
    candidates: ranked,
  };
}

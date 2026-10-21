// How HE speaks: plain polite です/ます, never humble or honorific keigo.
// Keigo is the staff's job. A sentence an N4 speaker can say smoothly beats one
// he stumbles through, and staff tend to match the level they hear. Defined once
// here so the cards, the live interpreter and the composer can never drift apart.

// Humble/honorific forms that must not appear in anything he is asked to say.
// ありがとうございます/ました is a fixed expression, not keigo, and is allowed.
export const KEIGO_MARKERS = [
  '申し', 'おりま', 'ござい', 'お伝え', 'いたし', 'させていただ', 'いただけ', 'いただき',
  '恐れ入', '伺', 'いらっしゃ', '参ります', '存じ', 'くださいませ', 'お越し',
];

export function keigoIn(japanese) {
  const text = japanese.replace(/ありがとうございま(す|した)/g, '');
  return KEIGO_MARKERS.filter(marker => text.includes(marker));
}

// Easy words too, at his request (2026-10-21: "use kantan vocabulary"): his
// cards were rewritten to beginner words, and lines Claude writes for him
// must stay at that level.
export const PLAIN_POLITE_RULE =
  'Write his lines in plain polite Japanese (です/ます) that a JLPT N4 speaker can say smoothly. '
  + 'Never humble or honorific keigo — no ' + KEIGO_MARKERS.join(', ')
  + ' (ありがとうございます is fine). '
  + 'Use only easy, everyday words (JLPT N5–N4) in short sentences: 下手 not 得意, 外国 not 海外, '
  + 'その日 not 当日, もう一度言います not 確認します.';

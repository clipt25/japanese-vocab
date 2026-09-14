// Fold a speech-recognition transcript into a comparable form.
//
// NFKC first, and it is load-bearing: macOS emits decomposed Unicode, where
// `ぎ` is か + U+3099. Without composing, `あれるぎー` scored 0.435 instead of
// 1.000 in testing. NFKC also folds halfwidth katakana (ﾅﾝﾒｲ) and fullwidth
// digits (４名様) in the same pass.

const KATAKANA_START = 0x30a1;
const KATAKANA_END = 0x30f6;
const KATAKANA_TO_HIRAGANA = 0x60;

export function katakanaToHiragana(s) {
  if (!s) return '';
  let out = '';
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    out += code >= KATAKANA_START && code <= KATAKANA_END
      ? String.fromCharCode(code - KATAKANA_TO_HIRAGANA)
      : ch;
  }
  return out;
}

// Which vowel each kana ends on, so ー can become a repeat of it rather than
// vanishing. Deleting it collides ビール/ビル and コート/こと.
const VOWEL_OF = {};
for (const [vowel, row] of Object.entries({
  あ: 'あかさたなはまやらわがざだばぱゃゎ',
  い: 'いきしちにひみりぎじぢびぴ',
  う: 'うくすつぬふむゆるぐずづぶぷゅ',
  え: 'えけせてねへめれげぜでべぺ',
  お: 'おこそとのほもよろごぞどぼぽょ',
})) for (const kana of row) VOWEL_OF[kana] = vowel;

function expandLongVowels(s) {
  let out = '';
  for (const ch of s) {
    if (ch === 'ー' && out.length > 0) out += VOWEL_OF[out.at(-1)] ?? '';
    else out += ch;
  }
  return out;
}

const WHITESPACE = /[\s　]+/g;
const PUNCTUATION = /[、。，．！？!?,.・「」『』（）()｡､･;:~〜"']/g;

export function normalize(s) {
  if (!s) return '';
  return expandLongVowels(katakanaToHiragana(s.normalize('NFKC')))
    .replace(WHITESPACE, '')
    .replace(PUNCTUATION, '')
    .toLowerCase();
}

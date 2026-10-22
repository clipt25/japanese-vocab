// The confirmation call: phoning a restaurant to check that a reservation he
// already made is really in their book (予約の確認). Same rules as the booking
// script - his lines are plain です/ます in easy words, the staff's are real
// phone keigo - and the same profile supplies every date, time and name.

import { cap } from './restaurants.js';

export const CONFIRM_STAGES = [
  { id: 'open', label: 'Opening', cue: 'お電話ありがとうございます', when: 'They pick up' },
  { id: 'details', label: 'Your booking', cue: 'お名前・ご予約日', when: 'They ask whose booking it is' },
  { id: 'found', label: "It's there", cue: '承っております', when: 'They find your booking' },
  { id: 'notfound', label: 'Not found', cue: '見当たりません', when: "They can't find it" },
  { id: 'close', label: 'Close', cue: 'お待ちしております', when: 'They say goodbye' },
  { id: 'trouble', label: 'If it goes wrong', cue: '満席・聞こえない', when: 'Full, or you cannot hear' },
];

// Booking-script lines he still needs, moved to the confirmation's stages.
// Everything in close, trouble and panic is kept as it is.
export const REUSED = {
  'self-level': 'open',
  'self-name': 'details', 'self-name-katakana': 'details',
  'self-phone-intro': 'details', 'self-phone-digits': 'details', 'self-no-japan-phone': 'details',
  'self-email': 'details', 'self-email-spell': 'details', 'self-readback-please': 'details',
  'self-callback-deflect': 'details',
  'self-yes-right': 'found',
  'self-name-full': 'notfound',
};

// Booking lines a staff phrase may suggest, and their confirmation stand-ins.
export const REPLY_ALIASES = {
  'self-open': 'self-confirm-open', 'self-new-booking': 'self-confirm-only',
  'self-datetime': 'self-confirm-details', 'self-date-only': 'self-confirm-details',
  'self-time-only': 'self-confirm-details', 'self-party': 'self-confirm-details',
};

export function confirmSelf(r) {
  const d = r.date, t = r.time, p = r.party, b = r.booked;
  return [
  { id: 'self-confirm-open', who: 'self', stage: 'open',
    kanji: 'すみません、予約の確認をお願いします。ゆっくり、簡単な日本語でお願いします。',
    kana: 'すみません、よやくのかくにんをおねがいします。ゆっくり、かんたんなにほんごでおねがいします',
    romaji: 'Sumimasen, yoyaku no kakunin o onegai shimasu. Yukkuri, kantan na nihongo de onegai shimasu.',
    en: "Excuse me, I'd like to confirm a reservation. Slowly and in simple Japanese, please.",
    note: '確認 (かくにん) = check / confirm. One breath, like the booking opener, so 予約の確認 is the first thing they hear.' },

  { id: 'self-confirm-only', who: 'self', stage: 'open',
    kanji: 'いいえ、確認だけです。', kana: 'いいえ、かくにんだけです',
    romaji: 'Iie, kakunin dake desu.', en: "No, I'm only checking it.",
    note: 'If they ask whether you want to change or cancel (変更やキャンセル).' },

  { id: 'self-confirm-details', who: 'self', stage: 'details',
    kanji: `${d.ja}の${t.periodJa}${t.ja}に、${p.selfJa}で予約しました。`,
    kana: `${d.kana}の${t.periodKana}${t.kana}に、${p.selfKana}でよやくしました`,
    romaji: `${cap(d.romaji)} no ${t.periodRomaji} ${t.romaji} ni, ${p.selfRomaji} de yoyaku shimashita.`,
    en: `I booked for ${d.enShort} at ${t.enSpoken}, ${p.en} people.`,
    note: d.note },

  { id: 'self-confirm-relief', who: 'self', stage: 'found',
    kanji: 'よかったです。ありがとうございます。', kana: 'よかったです。ありがとうございます',
    romaji: 'Yokatta desu. Arigatō gozaimasu.', en: 'Good — thank you.' },

  { id: 'self-confirm-time-check', who: 'self', stage: 'found',
    kanji: `時間は${t.ja}ですか。`, kana: `じかんは${t.kana}ですか`,
    romaji: `Jikan wa ${t.romaji} desu ka.`, en: `Is the time ${t.en}?`,
    note: 'If they found it but did not say the time.' },

  { id: 'self-confirm-party-check', who: 'self', stage: 'found',
    kanji: `${p.selfJa}で大丈夫ですか。`, kana: `${p.selfKana}でだいじょうぶですか`,
    romaji: `${cap(p.selfRomaji)} de daijōbu desu ka.`, en: `Is it for ${p.en} people?` },

  { id: 'self-confirm-time-correct', who: 'self', stage: 'found',
    kanji: `${t.ja}で予約しました。${t.ja}にしてください。`,
    kana: `${t.kana}でよやくしました。${t.kana}にしてください`,
    romaji: `${cap(t.romaji)} de yoyaku shimashita. ${cap(t.romaji)} ni shite kudasai.`,
    en: `I booked for ${t.en}. Please make it ${t.en}.`,
    note: 'Only if their book shows a different time.' },

  { id: 'self-confirm-see-you', who: 'self', stage: 'found',
    kanji: `では、${d.ja}に行きます。よろしくお願いします。`,
    kana: `では、${d.kana}にいきます。よろしくおねがいします`,
    romaji: `Dewa, ${d.romaji} ni ikimasu. Yoroshiku onegai shimasu.`,
    en: `Then we'll come on ${d.enShort}. Thank you.` },

  { id: 'self-confirm-look-again', who: 'self', stage: 'notfound',
    kanji: 'すみません、もう一度見てください。名前はジェフリーです。',
    kana: 'すみません、もういちどみてください。なまえはじぇふりーです',
    romaji: 'Sumimasen, mō ichido mite kudasai. Namae wa Jefurī desu.',
    en: 'Sorry, please look once more. The name is Geoffrey.',
    note: 'First try. Then the roman-letter name, then your surname, then how you booked.' },

  { id: 'self-confirm-romaji', who: 'self', stage: 'notfound',
    kanji: 'ローマ字のGEOFFREYかもしれません。', kana: 'ろーまじのじぇふりーかもしれません',
    romaji: 'Rōmaji no GEOFFREY kamo shiremasen.', en: 'It might be under GEOFFREY in roman letters.',
    note: 'Online bookings often keep the name in roman letters.' },

  { id: 'self-confirm-surname', who: 'self', stage: 'notfound',
    kanji: '名字のジェームズかもしれません。', kana: 'みょうじのじぇーむずかもしれません',
    romaji: 'Myōji no Jēmuzu kamo shiremasen.', en: 'It might be under my surname, James.' },

  { id: 'self-booked-phone', who: 'self', stage: 'notfound', when: b?.via === 'phone',
    kanji: `${b?.on.ja}に電話で予約しました。`, kana: `${b?.on.kana}にでんわでよやくしました`,
    romaji: `${cap(b?.on.romaji ?? '')} ni denwa de yoyaku shimashita.`,
    en: `I booked by phone on ${b?.on.en}.` },

  { id: 'self-booked-online', who: 'self', stage: 'notfound', when: b?.via === 'online',
    kanji: `${b?.site?.ja}で予約しました。`, kana: `${b?.site?.kana}でよやくしました`,
    romaji: `${b?.site?.romaji} de yoyaku shimashita.`, en: `I booked on ${b?.site?.en}.`,
    note: 'If they ask where you booked (どちらで / どのサイトで).' },

  { id: 'self-confirm-rebook', who: 'self', stage: 'notfound',
    kanji: `では、もう一度予約をお願いします。${d.ja}の${t.ja}、${p.selfJa}です。`,
    kana: `では、もういちどよやくをおねがいします。${d.kana}の${t.kana}、${p.selfKana}です`,
    romaji: `Dewa, mō ichido yoyaku o onegai shimasu. ${cap(d.romaji)} no ${t.romaji}, ${p.selfRomaji} desu.`,
    en: `Then I'd like to book again: ${d.enShort}, ${t.en}, ${p.en} people.`,
    note: 'Last step, only if it truly is not there. If that time is full, use "If it goes wrong".' },
  ];
}

export function confirmStaff(r) {
  const d = r.date, t = r.time, p = r.party, b = r.booked;
  const how = [b?.via === 'phone' && 'self-booked-phone', b?.via === 'online' && 'self-booked-online'].filter(Boolean);
  return [
  { id: 'staff-confirm-name', who: 'staff',
    kanji: 'ご予約のお名前をお願いいたします。', kana: 'ごよやくのおなまえをおねがいいたします',
    romaji: 'Go-yoyaku no o-namae o onegai itashimasu.', en: 'The name on the reservation, please.',
    replies: ['self-name', 'self-name-katakana'] },

  { id: 'staff-confirm-date', who: 'staff',
    kanji: 'ご予約のお日にちはいつでしょうか。', kana: 'ごよやくのおひにちはいつでしょうか',
    romaji: 'Go-yoyaku no o-hinichi wa itsu deshō ka.', en: 'What date is the reservation for?',
    replies: ['self-confirm-details'] },

  { id: 'staff-confirm-found', who: 'staff',
    kanji: `お待たせいたしました。${d.ja}、${t.fullJa}から${p.staffJa}様で承っております。`,
    kana: `おまたせいたしました。${d.kana}、${t.fullKana}から${p.staffKana}さまでうけたまわっております`,
    romaji: `Omatase itashimashita. ${cap(d.romaji)}, ${t.fullRomaji} kara ${p.staffRomaji}-sama de uketamawatte orimasu.`,
    en: `Thanks for waiting — we HAVE your reservation: ${d.enShort}, ${t.enSpoken}, ${p.en} people.`,
    replies: ['self-yes-right', 'self-confirm-relief'],
    note: '承っております = it IS in their book. Check the time and party they read back.' },

  { id: 'staff-confirm-found-short', who: 'staff',
    kanji: 'はい、ご予約承っております。', kana: 'はい、ごよやくうけたまわっております',
    romaji: 'Hai, go-yoyaku uketamawatte orimasu.', en: 'Yes, we have your reservation.',
    replies: ['self-confirm-relief', 'self-confirm-time-check'] },

  { id: 'staff-confirm-not-found', who: 'staff',
    kanji: '申し訳ございません、そのお名前ではご予約が見当たらないのですが。',
    kana: 'もうしわけございません、そのおなまえではごよやくがみあたらないのですが',
    romaji: 'Mōshiwake gozaimasen, sono o-namae de wa go-yoyaku ga miataranai no desu ga.',
    en: "I'm sorry — I CAN'T FIND a reservation under that name.",
    replies: ['self-confirm-look-again', 'self-confirm-romaji', 'self-confirm-surname'],
    note: '見当たらない = they cannot find it. Stay calm: spelling first, then how you booked.' },

  { id: 'staff-confirm-none', who: 'staff',
    kanji: '申し訳ございません、ご予約は承っておりません。',
    kana: 'もうしわけございません、ごよやくはうけたまわっておりません',
    romaji: 'Mōshiwake gozaimasen, go-yoyaku wa uketamawatte orimasen.',
    en: "I'm sorry — there is NO RESERVATION.",
    replies: [...how, 'self-confirm-rebook'] },

  { id: 'staff-confirm-how', who: 'staff',
    kanji: 'どちらでご予約されましたか。', kana: 'どちらでごよやくされましたか',
    romaji: 'Dochira de go-yoyaku saremashita ka.', en: 'Where did you make the reservation?',
    replies: how.length ? how : ['self-confirm-details'] },

  { id: 'staff-confirm-when-booked', who: 'staff',
    kanji: 'いつ頃ご予約いただきましたでしょうか。', kana: 'いつごろごよやくいただきましたでしょうか',
    romaji: 'Itsu goro go-yoyaku itadakimashita deshō ka.', en: 'Around when did you book?',
    replies: how.length ? how : ['self-confirm-details'] },

  { id: 'staff-confirm-other-time', who: 'staff',
    kanji: 'お時間が少し違うようですが。', kana: 'おじかんがすこしちがうようですが',
    romaji: 'O-jikan ga sukoshi chigau yō desu ga.', en: 'The TIME seems a little DIFFERENT…',
    replies: ['self-confirm-time-correct'] },

  { id: 'staff-confirm-rebook-offer', who: 'staff',
    kanji: 'よろしければ、改めてご予約をお取りしましょうか。',
    kana: 'よろしければ、あらためてごよやくをおとりしましょうか',
    romaji: 'Yoroshikereba, aratamete go-yoyaku o o-tori shimashō ka.',
    en: 'If you like, shall I make the reservation again now?',
    replies: ['self-confirm-rebook', 'self-yes-request'] },
  ];
}

// Hand-authored and adversarially audited. Nothing here is machine-translated.
//
// NOTE: there is no `triggers` field any more. Trigger bonuses were the primary
// false-positive generator — and katakana/hiragana pairs like ['アレルギー','あれるぎ']
// silently double-scored, because normalize() folds katakana to hiragana before
// the substring test, so one hit awarded 0.6 and cleared the old threshold with
// zero surface support. Scoring is surface-only now.
//
// `decoy: true` marks entries added ONLY so that common non-library utterances
// become true positives instead of confidently matching something else.

import { RESTAURANT, cap } from './restaurants.js';
import { CONFIRM_STAGES, REUSED, REPLY_ALIASES, confirmSelf, confirmStaff } from './confirm.js';

function staffPhrases(r) {
  const d = r.date, t = r.time, p = r.party, n = r.name, f = r.features, b = r.budget;
  // Where he has named acceptable later times, ask for those before an open "other times?".
  const otherTime = r.laterTimes ? ['self-later-times', 'self-other-time'] : ['self-other-time'];
  const early = r.laterTimes?.tooEarly;
  return [
  { id: 'staff-greeting', who: 'staff',
    kanji: `はい、${n.short}でございます。`, kana: `はい、${n.shortKana}でございます`,
    romaji: `Hai, ${n.shortRomaji} de gozaimasu.`, en: `Hello, this is ${n.shortRomaji}.`,
    replies: ['self-open'] },

  { id: 'staff-japanese-ok', who: 'staff',
    kanji: '日本語は大丈夫でいらっしゃいますか。', kana: 'にほんごはだいじょうぶでいらっしゃいますか',
    romaji: 'Nihongo wa daijōbu de irasshaimasu ka.',
    en: 'Are you alright continuing in Japanese?', replies: ['self-level'] },

  { id: 'staff-is-reservation', who: 'staff',
    kanji: 'ご予約でしょうか。', kana: 'ごよやくでしょうか',
    romaji: 'Go-yoyaku deshō ka.', en: 'Is this for a reservation?',
    replies: ['self-open'] },

  { id: 'staff-change-reservation', who: 'staff',
    kanji: 'ご予約の変更やキャンセルでしょうか。',
    kana: 'ごよやくのへんこうやきゃんせるでしょうか',
    romaji: 'Go-yoyaku no henkō ya kyanseru deshō ka.',
    en: 'Is this to change or cancel an existing booking?',
    replies: ['self-new-booking'] },

  { id: 'staff-what-date', who: 'staff',
    kanji: 'ご希望のお日にちはお決まりでしょうか。', kana: 'ごきぼうのおひにちはおきまりでしょうか',
    romaji: 'Go-kibō no o-hinichi wa o-kimari deshō ka.', en: 'Have you decided on a date?',
    replies: ['self-datetime'] },

  { id: 'staff-what-time', who: 'staff',
    kanji: '何時からでしょうか。', kana: 'なんじからでしょうか',
    romaji: 'Nan-ji kara deshō ka.', en: 'From what time?', replies: ['self-time-only'] },

  { id: 'staff-arrival-time', who: 'staff',
    kanji: '何時頃のお越しでしょうか。', kana: 'なんじごろのおこしでしょうか',
    romaji: 'Nan-ji goro no okoshi deshō ka.', en: 'Around what time will you arrive?',
    replies: ['self-time-only'] },

  { id: 'staff-party-size', who: 'staff',
    kanji: '何名様でしょうか。', kana: 'なんめいさまでしょうか',
    romaji: 'Nanmei-sama deshō ka.', en: 'How many people will it be?',
    replies: ['self-party'] },

  { id: 'staff-name', who: 'staff',
    kanji: 'お名前をお願いいたします。', kana: 'おなまえをおねがいいたします',
    romaji: 'O-namae o onegai itashimasu.', en: 'Your name, please.',
    replies: ['self-name'] },

  { id: 'staff-name-katakana-ask', who: 'staff',
    kanji: '恐れ入りますが、お名前をカタカナで教えていただけますでしょうか。',
    kana: 'おそれいりますが、おなまえをかたかなでおしえていただけますでしょうか',
    romaji: 'Osore irimasu ga, o-namae o katakana de oshiete itadakemasu deshō ka.',
    en: 'Could I have your name in katakana, please?', replies: ['self-name-katakana'] },

  { id: 'staff-companion-names', who: 'staff', decoy: true,
    kanji: '代表者様のお名前をフルネームでお願いいたします。',
    kana: 'だいひょうしゃさまのおなまえをふるねーむでおねがいいたします',
    romaji: 'Daihyōsha-sama no o-namae o furunēmu de onegai itashimasu.',
    en: "The lead guest's full name, please.", replies: ['self-name-full'] },

  { id: 'staff-phone', who: 'staff',
    kanji: 'お電話番号をお願いいたします。', kana: 'おでんわばんごうをおねがいいたします',
    romaji: 'O-denwa bangō o onegai itashimasu.', en: 'Your phone number, please.',
    replies: ['self-phone-intro', 'self-phone-digits', 'self-readback-please'] },

  { id: 'staff-japanese-phone', who: 'staff',
    kanji: '日本のお電話番号はございますか。', kana: 'にほんのおでんわばんごうはございますか',
    romaji: 'Nihon no o-denwa bangō wa gozaimasu ka.',
    en: 'Do you have a Japanese phone number?',
    replies: ['self-no-japan-phone', 'self-email', 'self-email-spell'] },

  { id: 'staff-full', who: 'staff',
    kanji: '申し訳ございません、その日は満席でございます。',
    kana: 'もうしわけございません、そのひはまんせきでございます',
    romaji: 'Mōshiwake gozaimasen, sono hi wa manseki de gozaimasu.',
    en: 'I am very sorry — we are fully booked that day.',
    replies: [...otherTime, 'self-other-date'] },

  { id: 'staff-offer-other-time', who: 'staff',
    kanji: `${t.ja}ですと満席ですが、${t.laterJa}でしたらご案内できます。`,
    kana: `${t.kana}ですとまんせきですが、${t.laterKana}でしたらごあんないできます`,
    romaji: `${cap(t.romaji)} desu to manseki desu ga, ${t.laterRomaji} deshitara go-annai dekimasu.`,
    en: `${t.en} is full, but we could seat you at ${t.laterEn}.`,
    replies: ['self-yes-request', 'self-other-date'] },

  { id: 'staff-offer-earlier', who: 'staff', when: Boolean(early),
    kanji: `${early?.ja}からでしたら、お席をご用意できます。`,
    kana: `${early?.kana}からでしたら、おせきをごよういできます`,
    romaji: `${cap(early?.romaji ?? '')} kara deshitara, o-seki o go-yōi dekimasu.`,
    en: `We could have a table for you from ${early?.en}.`,
    replies: ['self-too-early', 'self-later-times'] },

  { id: 'staff-holiday-busy', who: 'staff', when: d.holiday,
    kanji: `${d.ja}は祝日でございまして、大変混み合っております。`,
    kana: `${d.kana}はしゅくじつでございまして、たいへんこみあっております`,
    romaji: `${cap(d.romaji)} wa shukujitsu de gozaimashite, taihen komiatte orimasu.`,
    en: `${d.enShort} is a public holiday, so we are very busy.`,
    replies: ['self-other-time'] },

  { id: 'staff-zashiki-or-table', who: 'staff', when: f.seating,
    kanji: 'お席はお座敷とテーブル席がございますが、どちらがよろしいでしょうか。',
    kana: 'おせきはおざしきとてーぶるせきがございますが、どちらがよろしいでしょうか',
    romaji: 'O-seki wa o-zashiki to tēburu-seki ga gozaimasu ga, dochira ga yoroshii deshō ka.',
    en: 'We have tatami rooms and table seating — which would you prefer?',
    replies: ['self-zashiki-yes'] },

  { id: 'staff-private-room-ask', who: 'staff', when: f.seating,
    kanji: '個室をご希望でしょうか。', kana: 'こしつをごきぼうでしょうか',
    romaji: 'Koshitsu o go-kibō deshō ka.', en: 'Would you like a private room?',
    replies: ['self-zashiki-yes'] },

  { id: 'staff-rooms-full', who: 'staff', when: f.seating, decoy: true,
    kanji: '個室は満席でございます。', kana: 'こしつはまんせきでございます',
    romaji: 'Koshitsu wa manseki de gozaimasu.', en: 'The private rooms are all taken.',
    replies: ['self-table-ok'] },

  { id: 'staff-course', who: 'staff', when: f.course,
    kanji: 'コースはお決まりでしょうか。', kana: 'こーすはおきまりでしょうか',
    romaji: 'Kōsu wa o-kimari deshō ka.', en: 'Have you decided on a course?',
    replies: ['self-course-later', r.fallbackCourse ? 'self-course-pick' : 'self-course-recommend'] },

  { id: 'staff-pot-choice', who: 'staff', when: Boolean(r.pots),
    kanji: 'すき焼きとしゃぶしゃぶ、どちらになさいますか。', kana: 'すきやきとしゃぶしゃぶ、どちらになさいますか',
    romaji: 'Sukiyaki to shabu-shabu, dochira ni nasaimasu ka.', en: 'Sukiyaki or shabu-shabu?',
    replies: ['self-pot-later', 'self-sukiyaki', 'self-shabu'] },

  { id: 'staff-seat-type', who: 'staff', when: Boolean(r.seatRequest),
    kanji: 'お席はテーブル席と掘りごたつ席がございますが、どちらがよろしいでしょうか。',
    kana: 'おせきはてーぶるせきとほりごたつせきがございますが、どちらがよろしいでしょうか',
    romaji: 'O-seki wa tēburu-seki to horigotatsu-seki ga gozaimasu ga, dochira ga yoroshii deshō ka.',
    en: 'We have table seats and sunken-floor seats — which would you prefer?',
    replies: ['self-seat-request'] },

  { id: 'staff-course-in-advance', who: 'staff', when: f.course,
    kanji: 'お料理は事前にお決めいただいております。', kana: 'おりょうりはじぜんにおきめいただいております',
    romaji: 'O-ryōri wa jizen ni o-kime itadaite orimasu.',
    en: 'We ask that the course be chosen in advance.',
    replies: b ? ['self-hold-booking', 'self-budget', 'self-think-callback']
      : ['self-course-pick', 'self-hold-booking', 'self-think-callback'],
    note: b ? 'The refusal of your "decide on the day" plan. First ask them to hold the table; if they refuse, give a budget — or say you will think and call back.'
      : `The refusal of your "decide on the day" plan. Fine — choose the ${r.fallbackCourse?.en ?? 'course'} (${r.fallbackCourse?.detail ?? 'see the menu'}).` },

  { id: 'staff-cannot-hold', who: 'staff', when: f.course,
    kanji: 'コースがお決まりでないと、お席のご用意ができかねます。',
    kana: 'こーすがおきまりでないと、おせきのごよういができかねます',
    romaji: 'Kōsu ga o-kimari de nai to, o-seki no go-yōi ga dekikanemasu.',
    en: 'Without a course chosen, we cannot hold the table.',
    replies: b ? ['self-think-callback', 'self-budget'] : ['self-course-pick', 'self-think-callback'] },

  { id: 'staff-hold-ok', who: 'staff', when: f.course,
    kanji: 'かしこまりました。では、お席だけお取りしておきます。',
    kana: 'かしこまりました。では、おせきだけおとりしておきます',
    romaji: 'Kashikomarimashita. Dewa, o-seki dake o-tori shite okimasu.',
    en: 'Certainly — we will hold just the table for now.',
    replies: ['self-call-by-when', 'self-thanks'] },

  { id: 'staff-no-guarantee', who: 'staff', when: f.course,
    kanji: 'その際、お席が空いているかはお約束できかねます。',
    kana: 'そのさい、おせきがあいているかはおやくそくできかねます',
    romaji: 'Sono sai, o-seki ga aite iru ka wa o-yakusoku dekikanemasu.',
    en: 'We cannot promise the table will still be free then.',
    replies: ['self-understood', 'self-call-by-when'] },

  { id: 'staff-budget', who: 'staff', when: f.course,
    kanji: 'ご予算はおいくらぐらいをお考えでしょうか。', kana: 'ごよさんはおいくらぐらいをおかんがえでしょうか',
    romaji: 'Go-yosan wa oikura gurai o o-kangae deshō ka.',
    en: 'What budget did you have in mind?', replies: [b ? 'self-budget' : 'self-course-pick'] },

  { id: 'staff-service-charge', who: 'staff', when: f.serviceCharge, decoy: true,
    kanji: 'サービス料を別途10パーセント頂戴しております。',
    kana: 'さーびすりょうをべっとじゅっぱーせんとちょうだいしております',
    romaji: 'Sābisu-ryō o bettō juppāsento chōdai shite orimasu.',
    en: 'A 10% service charge is added on top.', replies: ['self-understood'] },

  { id: 'staff-cancel-fee', who: 'staff', when: f.course, decoy: true,
    kanji: '当日のキャンセルはコース料金を全額頂戴しております。',
    kana: 'とうじつのきゃんせるはこーすりょうきんをぜんがくちょうだいしております',
    romaji: 'Tōjitsu no kyanseru wa kōsu ryōkin o zengaku chōdai shite orimasu.',
    en: 'Same-day cancellation is charged at the FULL course price.',
    replies: ['self-understood', 'self-cancel-ask'],
    note: b ? '~¥88,000 for four. This is real money — make sure you heard it right.'
      : 'This is real money — make sure you heard it right, and ask from when it applies.' },

  { id: 'staff-card-number', who: 'staff', decoy: true,
    kanji: 'クレジットカードの番号をお伺いしてもよろしいでしょうか。',
    kana: 'くれじっとかーどのばんごうをおうかがいしてもよろしいでしょうか',
    romaji: 'Kurejitto kādo no bangō o o-ukagai shite mo yoroshii deshō ka.',
    en: 'May I take your credit card number?',
    replies: ['self-card-not-here', 'self-repeat'],
    note: 'Do NOT read out card digits on a line you cannot hear clearly. Deflect, then arrange email.' },

  { id: 'staff-cashless', who: 'staff', when: f.cashless,
    kanji: '当店はキャッシュレス決済のみとなっております。',
    kana: 'とうてんはきゃっしゅれすけっさいのみとなっております',
    romaji: 'Tōten wa kyasshuresu kessai nomi to natte orimasu.',
    en: 'We are cashless only — no cash.',
    replies: ['self-card-ok'] },

  { id: 'staff-time-limit', who: 'staff',
    kanji: 'お時間は2時間制となっておりますが、よろしいでしょうか。',
    kana: 'おじかんはにじかんせいとなっておりますが、よろしいでしょうか',
    romaji: 'O-jikan wa ni-jikan-sei to natte orimasu ga, yoroshii deshō ka.',
    en: 'There is a two-hour limit on the table — is that alright?',
    replies: ['self-yes-request'] },

  { id: 'staff-allergy', who: 'staff',
    kanji: 'アレルギーはございますか。', kana: 'あれるぎーはございますか',
    romaji: 'Arerugī wa gozaimasu ka.', en: 'Do you have any allergies?',
    replies: ['self-allergy-none'] },

  { id: 'staff-children', who: 'staff',
    kanji: 'お子様はいらっしゃいますか。', kana: 'おこさまはいらっしゃいますか',
    romaji: 'O-kosama wa irasshaimasu ka.', en: 'Will there be any children?',
    replies: ['self-adults-only'] },

  { id: 'staff-late-contact', who: 'staff', decoy: true,
    kanji: '15分以上遅れる場合はご連絡をお願いいたします。',
    kana: 'じゅうごふんいじょうおくれるばあいはごれんらくをおねがいいたします',
    romaji: 'Jūgo-fun ijō okureru baai wa go-renraku o onegai itashimasu.',
    en: 'Please call if you will be more than 15 minutes late.',
    replies: ['self-understood'] },

  { id: 'staff-closed-today', who: 'staff', decoy: true,
    kanji: '本日は定休日でございます。', kana: 'ほんじつはていきゅうびでございます',
    romaji: 'Honjitsu wa teikyūbi de gozaimasu.', en: 'We are closed today.',
    replies: ['self-understood'] },

  { id: 'staff-group-booking', who: 'staff', decoy: true,
    kanji: 'その日は団体様のご予約が入っております。',
    kana: 'そのひはだんたいさまのごよやくがはいっております',
    romaji: 'Sono hi wa dantai-sama no go-yoyaku ga haitte orimasu.',
    en: 'We have a large group booked that day.',
    replies: [...otherTime, 'self-other-date'] },

  { id: 'staff-line-bad', who: 'staff',
    kanji: '恐れ入ります、お電話が少々遠いようですが。',
    kana: 'おそれいります、おでんわがしょうしょうとおいようですが',
    romaji: 'Osore irimasu, o-denwa ga shōshō tōi yō desu ga.',
    en: 'Sorry — I am having trouble hearing you.',
    replies: ['self-can-you-hear', 'self-repeat'],
    note: 'Near-guaranteed on a Jakarta-to-Tokyo call.' },

  { id: 'staff-callback', who: 'staff', decoy: true,
    kanji: '折り返しお電話させていただきます。', kana: 'おりかえしおでんわさせていただきます',
    romaji: 'Orikaeshi o-denwa sasete itadakimasu.', en: 'We will call you back.',
    replies: ['self-callback-deflect', 'self-email'],
    note: 'A callback is the worst outcome — you have no Japanese number. Deflect to email.' },

  { id: 'staff-wait', who: 'staff',
    kanji: '少々お待ちください。', kana: 'しょうしょうおまちください',
    romaji: 'Shōshō omachi kudasai.', en: 'One moment, please.', replies: ['self-yes-request'] },

  { id: 'staff-thanks-wait', who: 'staff',
    kanji: 'お待たせいたしました。', kana: 'おまたせいたしました',
    romaji: 'Omatase itashimashita.', en: 'Thank you for waiting.', replies: ['self-yes-request'] },

  { id: 'staff-will-check', who: 'staff',
    kanji: '確認いたします。', kana: 'かくにんいたします',
    romaji: 'Kakunin itashimasu.', en: 'I will check for you.', replies: ['self-yes-request'] },

  { id: 'staff-certainly', who: 'staff',
    kanji: 'かしこまりました。', kana: 'かしこまりました',
    romaji: 'Kashikomarimashita.', en: 'Certainly.', replies: ['self-thanks'] },

  { id: 'staff-repeat-back', who: 'staff',
    kanji: '復唱させていただきます。', kana: 'ふくしょうさせていただきます',
    romaji: 'Fukushō sasete itadakimasu.', en: 'Let me repeat that back to you.',
    replies: ['self-yes-request'] },

  { id: 'staff-confirm-back', who: 'staff',
    kanji: `ジェフリー様、${d.ja}${d.weekdayJa}、${t.fullJa}から${p.staffJa}様でよろしいでしょうか。`,
    kana: `じぇふりーさま、${d.kana}${d.weekdayKana}、${t.fullKana}から${p.staffKana}さまでよろしいでしょうか`,
    romaji: `Jefurī-sama, ${d.romaji} ${d.weekdayRomaji}, ${t.fullRomaji} kara ${p.staffRomaji}-sama de yoroshii deshō ka.`,
    en: `Geoffrey, ${d.enShort} (${d.weekdayEn}), ${t.enSpoken}, ${p.en} people — is that correct?`,
    replies: ['self-yes-right'] },

  { id: 'staff-uketamawarimashita', who: 'staff',
    kanji: `それでは、ジェフリー様、${d.ja}${t.fullJa}、${p.staffJa}様で承りました。`,
    kana: `それでは、じぇふりーさま、${d.kana}${t.fullKana}、${p.staffKana}さまでうけたまわりました`,
    romaji: `Sore de wa, Jefurī-sama, ${d.romaji} ${t.fullRomaji}, ${p.staffRomaji}-sama de uketamawarimashita.`,
    en: 'Very well — your reservation is CONFIRMED.',
    replies: ['self-thanks', 'self-goodbye'],
    note: '承りました is the word that means the booking exists. Write down the time and who you spoke to.' },

  { id: 'staff-decide-on-day', who: 'staff', when: f.course,
    kanji: '当日で結構でございます。', kana: 'とうじつでけっこうでございます',
    romaji: 'Tōjitsu de kekkō de gozaimasu.', en: 'Deciding on the day is fine.',
    replies: ['self-thanks'] },

  { id: 'staff-who-calling', who: 'staff',
    kanji: '失礼ですが、どちら様でしょうか。', kana: 'しつれいですが、どちらさまでしょうか',
    romaji: 'Shitsurei desu ga, dochira-sama deshō ka.',
    en: 'May I ask who is calling?', replies: ['self-name'] },

  { id: 'staff-call-back-later', who: 'staff',
    kanji: '恐れ入りますが、後ほどもう一度お電話いただけますでしょうか。',
    kana: 'おそれいりますが、のちほどもういちどおでんわいただけますでしょうか',
    romaji: 'Osore irimasu ga, nochihodo mō ichido o-denwa itadakemasu deshō ka.',
    en: 'Could you call us back a little later?',
    replies: ['self-understood', 'self-what-time-call'] },

  { id: 'staff-occasion', who: 'staff',
    kanji: '何かお祝いのお席でしょうか。', kana: 'なにかおいわいのおせきでしょうか',
    romaji: 'Nanika o-iwai no o-seki deshō ka.',
    en: 'Is this for a special occasion?', replies: ['self-no-occasion'] },

  { id: 'staff-no-english', who: 'staff',
    kanji: '申し訳ございません、英語が話せる者がおりません。',
    kana: 'もうしわけございません、えいごがはなせるものがおりません',
    romaji: 'Mōshiwake gozaimasen, eigo ga hanaseru mono ga orimasen.',
    en: 'I am sorry — we have no one here who speaks English.', replies: ['self-level'] },

  { id: 'staff-repeat-please', who: 'staff',
    kanji: 'もう一度お願いできますか。', kana: 'もういちどおねがいできますか',
    romaji: 'Mō ichido onegai dekimasu ka.', en: 'Could you say that again?',
    replies: ['self-name', 'self-datetime'] },

  { id: 'staff-thanks-reservation', who: 'staff',
    kanji: 'ご予約ありがとうございました。', kana: 'ごよやくありがとうございました',
    romaji: 'Go-yoyaku arigatō gozaimashita.', en: 'Thank you for your reservation.',
    replies: ['self-goodbye'] },

  { id: 'staff-looking-forward', who: 'staff',
    kanji: 'お待ちしております。', kana: 'おまちしております',
    romaji: 'Omachi shite orimasu.', en: 'We look forward to seeing you.',
    replies: ['self-goodbye'] },
  ];
}

function selfPhrases(r) {
  const d = r.date, t = r.time, p = r.party, f = r.features, b = r.budget;
  return [
  { id: 'self-open', who: 'self', stage: 'open',
    kanji: 'すみません、予約をお願いします。ゆっくり、簡単な日本語でお願いします。',
    kana: 'すみません、よやくをおねがいします。ゆっくり、かんたんなにほんごでおねがいします',
    romaji: 'Sumimasen, yoyaku o onegai shimasu. Yukkuri, kantan na nihongo de onegai shimasu.',
    en: "Excuse me, I'd like to make a reservation. Slowly and in simple Japanese, please.",
    note: 'Say it all in ONE breath. Split in two, the staff answer the booking at full speed before you reach the second half. Booking first, so the first word they hear is 予約. NOT もしもし as the opener.' },

  { id: 'self-new-booking', who: 'self', stage: 'open',
    kanji: 'いいえ、新しい予約をお願いします。',
    kana: 'いいえ、あたらしいよやくをおねがいします',
    romaji: 'Iie, atarashii yoyaku o onegai shimasu.',
    en: "No — I'd like to make a new reservation." },

  { id: 'self-level', who: 'self', stage: 'open',
    kanji: 'はい、大丈夫です。ゆっくり、簡単な日本語でお願いします。',
    kana: 'はい、だいじょうぶです。ゆっくり、かんたんなにほんごでおねがいします',
    romaji: 'Hai, daijōbu desu. Yukkuri, kantan na nihongo de onegai shimasu.',
    en: "Yes, that's fine. Slowly and in simple Japanese, please.",
    note: 'Use when they ask if Japanese is OK, or say nobody speaks English. Asking for 簡単な日本語 gets most staff to switch to plain words.' },

  { id: 'self-datetime', who: 'self', stage: 'when',
    kanji: `${d.ja}の${t.periodJa}${t.ja}にお願いします。`,
    kana: `${d.kana}の${t.periodKana}${t.kana}におねがいします`,
    romaji: `${cap(d.romaji)} no ${t.periodRomaji} ${t.romaji} ni onegai shimasu.`,
    en: `${d.enShort} at ${t.enSpoken}, please.`,
    note: d.note },

  { id: 'self-date-only', who: 'self', stage: 'when',
    kanji: `${d.ja}、${d.weekdayJa}です。`, kana: `${d.kana}、${d.weekdayKana}です`,
    romaji: `${cap(d.romaji)}, ${d.weekdayRomaji} desu.`, en: `${d.enShort}, ${d.weekdayEn}.` },

  { id: 'self-time-only', who: 'self', stage: 'when',
    kanji: `${t.fullJa}です。`, kana: `${t.fullKana}です`,
    romaji: `${cap(t.fullRomaji)} desu.`, en: `${t.enSpoken}.` },

  { id: 'self-party', who: 'self', stage: 'party',
    kanji: `${p.selfJa}でお願いします。`, kana: `${p.selfKana}でおねがいします`,
    romaji: `${cap(p.selfRomaji)} de onegai shimasu.`, en: `${cap(p.en)} people, please.`,
    note: `${p.selfJa} from you; ${p.staffJa}様 is what THEY say about you.` },

  { id: 'self-adults-only', who: 'self', stage: 'party',
    kanji: 'みんな大人です。子供はいません。', kana: 'みんなおとなです。こどもはいません',
    romaji: 'Minna otona desu. Kodomo wa imasen.', en: 'All adults, no children.' },

  { id: 'self-name', who: 'self', stage: 'name',
    kanji: '名前はジェフリーです。', kana: 'なまえはじぇふりーです',
    romaji: 'Namae wa Jefurī desu.', en: 'My name is Geoffrey.' },

  { id: 'self-name-katakana', who: 'self', stage: 'name',
    kanji: 'ジェフリーです。ジェ、フ、リー、です。', kana: 'じぇふりーです。じぇ、ふ、りー、です',
    romaji: 'Jefurī desu. Je, fu, rī, desu.', en: 'Geoffrey — Je, fu, rī.',
    note: 'Beat it out in three if they ask again.' },

  { id: 'self-name-full', who: 'self', stage: 'name',
    kanji: 'ジェフリー・ジェームズです。', kana: 'じぇふりー・じぇーむずです',
    romaji: 'Jefurī Jēmuzu desu.', en: 'Geoffrey James.' },

  { id: 'self-phone-intro', who: 'self', stage: 'phone',
    kanji: '電話番号は外国の番号です。インドネシアです。',
    kana: 'でんわばんごうはがいこくのばんごうです。いんどねしあです',
    romaji: 'Denwa bangō wa gaikoku no bangō desu. Indoneshia desu.',
    en: 'My phone number is a foreign one — Indonesia.',
    note: 'Say this BEFORE the digits so they know a long number is coming.' },

  { id: 'self-phone-digits', who: 'self', stage: 'phone',
    kanji: '国番号は62です。812の8063の7730です。',
    kana: 'こくばんごうはろくじゅうにです。はちいちにーの、はちぜろろくさんの、ななななさんぜろです',
    romaji: 'Kokubangō wa roku-jū-ni desu. Hachi-ichi-nī no, hachi-zero-roku-san no, nana-nana-san-zero desu.',
    en: '+62 812 8063 7730 (Indonesia, country code 62).',
    note: '国番号 as a whole number, then digits with の between groups. にー not に — 2 is the most misheard digit. ぜろ, not まる.' },

  { id: 'self-no-japan-phone', who: 'self', stage: 'phone',
    kanji: 'すみません、日本の電話番号はありません。',
    kana: 'すみません、にほんのでんわばんごうはありません',
    romaji: 'Sumimasen, Nihon no denwa bangō wa arimasen.',
    en: "I'm sorry, I don't have a Japanese phone number.",
    note: 'If you have a Tokyo hotel booked by then, give ITS number instead — it is worth more than this whole app.' },

  { id: 'self-email', who: 'self', stage: 'phone',
    kanji: 'メールアドレスを教えましょうか。', kana: 'めーるあどれすをおしえましょうか',
    romaji: 'Mēru adoresu o oshiemashō ka.',
    en: 'Shall I give you my email address instead?' },

  { id: 'self-email-spell', who: 'self', stage: 'phone',
    kanji: 'ジー・イー・オー・エフ・エフ・アール・イー・ジェー・エー・エム・イー・エス、アットマーク、ジーメール・ドット・コムです。',
    kana: 'じー・いー・おー・えふ・えふ・あーる・いー・じぇー・えー・えむ・いー・えす、あっとまーく、じーめーる・どっと・こむです',
    romaji: 'Jī-ī-ō-efu-efu-āru-ī-jē-ē-emu-ī-esu, attomāku, Jīmēru dotto komu desu.',
    en: 'geoffrejames@gmail.com',
    note: 'g-e-o-f-f-r-e-j-a-m-e-s @ gmail.com — slowly, one letter at a time.' },

  { id: 'self-seat-request', who: 'self', stage: 'seat', when: Boolean(r.seatRequest),
    kanji: `${r.seatRequest?.ja}でお願いします。`,
    kana: `${r.seatRequest?.kana}でおねがいします`,
    romaji: `${cap(r.seatRequest?.romaji ?? '')} de onegai shimasu.`,
    en: `${cap(r.seatRequest?.en ?? '')}, please.`,
    note: r.seatRequest?.note },

  { id: 'self-zashiki-yes', who: 'self', when: f.seating, stage: 'seat',
    kanji: 'お座敷でお願いします。', kana: 'おざしきでおねがいします',
    romaji: 'O-zashiki de onegai shimasu.', en: 'A tatami room, please.',
    note: 'Hiyama has 9 tatami rooms and only 2 table rooms — this is the easy ask.' },

  { id: 'self-table-ok', who: 'self', when: f.seating, stage: 'seat',
    kanji: 'はい、それでいいです。', kana: 'はい、それでいいです',
    romaji: 'Hai, sore de ii desu.', en: "That's fine.",
    note: 'NOT 大丈夫です — that also means "no thanks". はい + いいです is an unmistakable yes.' },

  { id: 'self-table-seat', who: 'self', when: f.seating, stage: 'seat',
    kanji: 'テーブル席でお願いします。', kana: 'てーぶるせきでおねがいします',
    romaji: 'Tēburu-seki de onegai shimasu.', en: 'Table seating, please.' },

  { id: 'self-course-later', who: 'self', when: f.course, stage: 'course',
    kanji: 'コースは、その日に決めてもいいですか。',
    kana: 'こーすは、そのひにきめてもいいですか',
    romaji: 'Kōsu wa, sono hi ni kimete mo ii desu ka.',
    en: 'May we decide the course on the day?' },

  { id: 'self-course-recommend', who: 'self', when: f.course, stage: 'course',
    kanji: 'では、おすすめのコースでお願いします。',
    kana: 'では、おすすめのこーすでおねがいします',
    romaji: 'Dewa, osusume no kōsu de onegai shimasu.',
    en: 'Then your recommended course, please.' },

  { id: 'self-course-pick', who: 'self', stage: 'course', when: Boolean(r.fallbackCourse),
    kanji: `では、${r.fallbackCourse?.ja}でお願いします。`,
    kana: `では、${r.fallbackCourse?.kana}でおねがいします`,
    romaji: `Dewa, ${r.fallbackCourse?.romaji} de onegai shimasu.`,
    en: `Then the ${r.fallbackCourse?.en}, please.`,
    note: `Only if they need the course now. ${r.fallbackCourse?.detail}.` },

  { id: 'self-pot-later', who: 'self', stage: 'course', when: Boolean(r.pots),
    kanji: 'すき焼きかしゃぶしゃぶかは、その日に決めてもいいですか。',
    kana: 'すきやきかしゃぶしゃぶかは、そのひにきめてもいいですか',
    romaji: 'Sukiyaki ka shabu-shabu ka wa, sono hi ni kimete mo ii desu ka.',
    en: 'May we choose sukiyaki or shabu-shabu on the day?' },

  { id: 'self-sukiyaki', who: 'self', stage: 'course', when: Boolean(r.pots),
    kanji: 'すき焼きでお願いします。', kana: 'すきやきでおねがいします',
    romaji: 'Sukiyaki de onegai shimasu.', en: 'Sukiyaki, please.' },

  { id: 'self-shabu', who: 'self', stage: 'course', when: Boolean(r.pots),
    kanji: 'しゃぶしゃぶでお願いします。', kana: 'しゃぶしゃぶでおねがいします',
    romaji: 'Shabu-shabu de onegai shimasu.', en: 'Shabu-shabu, please.' },

  { id: 'self-budget', who: 'self', stage: 'course', when: f.course && Boolean(b),
    kanji: `一人${b?.ja}くらいでお願いします。`,
    kana: `ひとり${b?.kana}くらいでおねがいします`,
    romaji: `Hitori ${b?.romaji} kurai de onegai shimasu.`,
    en: `About ${b?.en} per person, please.`,
    note: 'Matches their actual course pricing. ~¥88,000 for four with the 10% service charge.' },

  { id: 'self-allergy-none', who: 'self', stage: 'course',
    kanji: 'アレルギーは特にありません。', kana: 'あれるぎーはとくにありません',
    romaji: 'Arerugī wa toku ni arimasen.', en: 'No allergies in particular.' },

  { id: 'self-hold-booking', who: 'self', when: f.course, stage: 'course',
    kanji: '予約だけ先にお願いできますか。コースは後で決めます。',
    kana: 'よやくだけさきにおねがいできますか。こーすはあとできめます',
    romaji: 'Yoyaku dake saki ni onegai dekimasu ka. Kōsu wa ato de kimemasu.',
    en: "Can you hold just the reservation? I'll decide the course later.",
    note: r.holdNote ?? 'Try this BEFORE saying you will call back. Hanging up without a booking on a busy holiday evening can lose you the 19:00 table.' },

  { id: 'self-think-callback', who: 'self', when: f.course, stage: 'course',
    kanji: '分かりました。少し考えて、また電話します。',
    kana: 'わかりました。すこしかんがえて、またでんわします',
    romaji: 'Wakarimashita. Sukoshi kangaete, mata denwa shimasu.',
    en: "I understand. I'll think about it and call again.",
    note: 'Then ask いつまでに電話すればいいですか, so you know your deadline.' },

  { id: 'self-call-by-when', who: 'self', when: f.course, stage: 'course',
    kanji: 'いつまでに電話すればいいですか。',
    kana: 'いつまでにでんわすればいいですか',
    romaji: 'Itsu made ni denwa sureba ii desu ka.',
    en: 'By when should I call you back?' },

  { id: 'self-yes-request', who: 'self', stage: 'close',
    kanji: 'はい、お願いします。', kana: 'はい、おねがいします',
    romaji: 'Hai, onegai shimasu.', en: 'Yes, please.' },

  { id: 'self-yes-right', who: 'self', stage: 'close',
    kanji: 'はい、その通りです。', kana: 'はい、そのとおりです',
    romaji: 'Hai, sono tōri desu.', en: "Yes, that's right.",
    note: 'For confirmations. "Yes please" is not an answer to "is that correct?"' },

  { id: 'self-understood', who: 'self', stage: 'close',
    kanji: 'はい、分かりました。', kana: 'はい、わかりました',
    romaji: 'Hai, wakarimashita.', en: 'Yes, understood.',
    note: 'NOT 承知しました — that is what THEY say to YOU. For fees, time limits, late rules.' },

  { id: 'self-confirm', who: 'self', stage: 'close',
    kanji: `もう一度言います。${d.ja}、${t.fullJa}、${p.selfJa}ですね。`,
    kana: `もういちどいいます。${d.kana}、${t.fullKana}、${p.selfKana}ですね`,
    romaji: `Mō ichido iimasu. ${cap(d.romaji)}, ${t.fullRomaji}, ${p.selfRomaji} desu ne.`,
    en: `Let me say it back — ${d.enShort}, ${t.enSpoken}, ${p.en} people, right?` },

  { id: 'self-card-ok', who: 'self', stage: 'close', when: f.cashless,
    kanji: 'はい、カードで払います。', kana: 'はい、かーどではらいます',
    romaji: 'Hai, kādo de haraimasu.', en: "Yes, I'll pay by card." },

  { id: 'self-booked-check', who: 'self', stage: 'close',
    kanji: '予約は取れましたか。', kana: 'よやくはとれましたか',
    romaji: 'Yoyaku wa toremashita ka.', en: 'So the reservation is confirmed?' },

  { id: 'self-thanks', who: 'self', stage: 'close',
    kanji: 'ありがとうございます。よろしくお願いします。',
    kana: 'ありがとうございます。よろしくおねがいします',
    romaji: 'Arigatō gozaimasu. Yoroshiku onegai shimasu.',
    en: 'Thank you, I appreciate it.' },

  { id: 'self-goodbye', who: 'self', stage: 'close',
    kanji: 'ありがとうございました。失礼します。',
    kana: 'ありがとうございました。しつれいします',
    romaji: 'Arigatō gozaimashita. Shitsurei shimasu.',
    en: 'Thank you very much. Goodbye.',
    note: 'This is how you END the call. よろしくお願いします does not hang up a phone.' },

  { id: 'self-card-not-here', who: 'self', stage: 'trouble',
    kanji: 'すみません、今カードを持っていません。',
    kana: 'すみません、いまかーどをもっていません',
    romaji: 'Sumimasen, ima kādo o motte imasen.',
    en: "Sorry — I don't have my card with me right now.",
    note: 'Do NOT read card digits down a line you cannot hear. Ask them to email instead.' },

  { id: 'self-callback-deflect', who: 'self', stage: 'phone',
    kanji: '外国の番号なので、メールで連絡してください。',
    kana: 'がいこくのばんごうなので、めーるでれんらくしてください',
    romaji: 'Gaikoku no bangō na node, mēru de renraku shite kudasai.',
    en: 'My number is foreign — please contact me by email.' },

  { id: 'self-readback-please', who: 'self', stage: 'phone',
    kanji: '書いたものを、もう一度読んでください。',
    kana: 'かいたものを、もういちどよんでください',
    romaji: 'Kaita mono o, mō ichido yonde kudasai.',
    en: 'Please read back what you wrote down.',
    note: 'Use after the email AND the phone number. They will hear ジェフリー and write geoffrey@ — there is no y.' },

  { id: 'self-what-time-call', who: 'self', stage: 'trouble',
    kanji: '何時ごろ、もう一度電話すればいいですか。',
    kana: 'なんじごろ、もういちどでんわすればいいですか',
    romaji: 'Nan-ji goro, mō ichido denwa sureba ii desu ka.',
    en: 'What time should I call back?',
    note: 'Tokyo is 2 hours ahead of Jakarta. Write the time down in BOTH.' },

  { id: 'self-horigotatsu', who: 'self', when: f.seating, stage: 'seat',
    kanji: 'お座敷は掘りごたつですか。',
    kana: 'おざしきはほりごたつですか',
    romaji: 'O-zashiki wa horigotatsu desu ka.',
    en: 'Are the tatami rooms sunken-floor (legs down, no kneeling)?',
    note: 'Unverified for Hiyama. Two hours of 正座 for four people is worth one question.' },

  { id: 'self-no-occasion', who: 'self', stage: 'course',
    kanji: 'いいえ、普通の食事です。', kana: 'いいえ、ふつうのしょくじです',
    romaji: 'Iie, futsū no shokuji desu.', en: 'No, just dinner.' },

  { id: 'self-email-confirm', who: 'self', stage: 'close',
    kanji: '予約のメールを送ってください。', kana: 'よやくのめーるをおくってください',
    romaji: 'Yoyaku no mēru o okutte kudasai.',
    en: 'Please send me an email with the booking.',
    note: 'You have no Japanese phone. Written confirmation is your only proof.' },

  { id: 'self-staff-name', who: 'self', stage: 'close',
    kanji: 'すみません、お名前を教えてください。',
    kana: 'すみません、おなまえをおしえてください',
    romaji: 'Sumimasen, o-namae o oshiete kudasai.',
    en: 'Sorry — may I have your name?',
    note: 'Ask at the end, once the booking is confirmed, so it is clear you mean THEIR name. Write it down: if the booking is missing on the night, this is your recourse.' },

  { id: 'self-other-date', who: 'self', stage: 'trouble',
    kanji: '他の日は空いていますか。', kana: 'ほかのひはあいていますか',
    romaji: 'Hoka no hi wa aite imasu ka.', en: 'Are other days available?' },

  { id: 'self-other-time', who: 'self', stage: 'trouble',
    kanji: '他の時間は空いていますか。', kana: 'ほかのじかんはあいていますか',
    romaji: 'Hoka no jikan wa aite imasu ka.', en: 'Are other times available?' },

  // Only where he has named the later times he can take (Hosha: 19:00 / 19:30, never 18:00).
  { id: 'self-later-times', who: 'self', stage: 'trouble', when: Boolean(r.laterTimes),
    kanji: `${r.laterTimes?.ja}は空いていますか。`, kana: `${r.laterTimes?.kana}はあいていますか`,
    romaji: `${cap(r.laterTimes?.romaji ?? '')} wa aite imasu ka.`, en: `Is ${r.laterTimes?.en} free?` },

  { id: 'self-too-early', who: 'self', stage: 'trouble', when: Boolean(r.laterTimes),
    kanji: 'ちょっと早いです。', kana: 'ちょっとはやいです',
    romaji: 'Chotto hayai desu.', en: 'That is a little early for us.',
    note: `Say this if they offer an earlier time, then ask for ${r.laterTimes?.en}.` },

  { id: 'self-cancel-ask', who: 'self', stage: 'trouble',
    kanji: 'キャンセル料はいつからかかりますか。', kana: 'きゃんせるりょうはいつからかかりますか',
    romaji: 'Kyanseru-ryō wa itsu kara kakarimasu ka.',
    en: 'From when does the cancellation fee apply?' },

  { id: 'self-can-you-hear', who: 'self', stage: 'trouble',
    kanji: 'もしもし、聞こえますか。', kana: 'もしもし、きこえますか',
    romaji: 'Moshi moshi, kikoemasu ka.', en: 'Hello — can you hear me?',
    note: 'もしもし IS correct here. This is the line-check use.' },

  { id: 'self-english-speaker', who: 'self', stage: 'trouble',
    kanji: '英語を話せる人はいますか。',
    kana: 'えいごをはなせるひとはいますか',
    romaji: 'Eigo o hanaseru hito wa imasu ka.',
    en: 'Is there anyone there who speaks English?' },

  { id: 'self-repeat', who: 'self', stage: 'trouble',
    kanji: 'もう一度お願いできますか。', kana: 'もういちどおねがいできますか',
    romaji: 'Mō ichido onegai dekimasu ka.', en: 'Could you say that once more?' },

  { id: 'panic-again', who: 'self', stage: 'panic',
    kanji: 'もう一度お願いします。', kana: 'もういちどおねがいします',
    romaji: 'Mō ichido onegai shimasu.', en: 'Once more, please.', short: 'Again' },

  { id: 'panic-slower', who: 'self', stage: 'panic',
    kanji: 'もう少しゆっくりお願いします。', kana: 'もうすこしゆっくりおねがいします',
    romaji: 'Mō sukoshi yukkuri onegai shimasu.', en: 'A little more slowly, please.', short: 'Slower' },

  { id: 'panic-louder', who: 'self', stage: 'panic',
    kanji: 'もう少し大きい声でお願いします。',
    kana: 'もうすこしおおきいこえでおねがいします',
    romaji: 'Mō sukoshi ōkii koe de onegai shimasu.',
    en: 'A little louder, please.', short: 'Louder' },

  { id: 'panic-dont-understand', who: 'self', stage: 'panic',
    kanji: 'すみません、よく分かりませんでした。', kana: 'すみません、よくわかりませんでした',
    romaji: 'Sumimasen, yoku wakarimasen deshita.', en: "Sorry, I didn't quite understand.", short: "Didn't get it" },

  { id: 'panic-wait', who: 'self', stage: 'panic',
    kanji: '少し待ってください。', kana: 'すこしまってください',
    romaji: 'Sukoshi matte kudasai.', en: 'Please wait a moment.', short: 'Wait',
    note: 'NOT お待ちください — that is the staff’s phrase, and from a customer it sounds like an order.' },
  ];
}

// cue: what the staff say that means "this stage now" - the words he listens
// for on the call, shown under each stage's name in the stage bar.
// when: the same in English, for the tooltip and screen readers.
const ALL_STAGES = [
  { id: 'open', label: 'Opening', cue: 'お電話ありがとうございます', when: 'They pick up' },
  { id: 'when', label: 'Date & time', cue: 'お日にち・お時間', when: 'They ask the date or time' },
  { id: 'party', label: 'Party size', cue: '何名様', when: 'They ask how many people' },
  { id: 'name', label: 'Your name', cue: 'お名前', when: 'They ask your name' },
  { id: 'phone', label: 'Phone & email', cue: 'お電話番号・ご連絡先', when: 'They ask how to reach you' },
  { id: 'seat', label: 'Seating', cue: 'お席', when: 'They ask where you want to sit' },
  { id: 'course', label: 'Course & allergies', cue: 'コース・アレルギー', when: 'They ask the course or allergies' },
  { id: 'close', label: 'Confirm & close', cue: '復唱・承りました', when: 'They read the booking back' },
  { id: 'trouble', label: 'If it goes wrong', cue: '満席・聞こえない', when: 'Full, or you cannot hear' },
];

// A phrase with when: false belongs to a topic this restaurant never raises.
const applies = phrase => phrase.when !== false;
const strip = ({ when, ...phrase }) => phrase;

// A confirmation call (restaurant.purpose === 'confirm') keeps every staff
// phrase - the staff may say anything - but only the booking lines he still
// needs, on the confirmation's own stages; a staff line that suggested a
// booking line suggests its confirmation stand-in instead.
function confirmLibrary(restaurant) {
  const self = [
    ...confirmSelf(restaurant),
    ...selfPhrases(restaurant)
      .filter(p => p.id in REUSED || ['close', 'trouble', 'panic'].includes(p.stage))
      .map(p => ({ ...p, stage: REUSED[p.id] ?? p.stage })),
  ].filter(applies).map(strip);
  const have = new Set(self.map(p => p.id));
  const staff = [...confirmStaff(restaurant), ...staffPhrases(restaurant)].filter(applies).map(strip)
    .map(p => ({ ...p, replies: [...new Set((p.replies ?? []).map(id => REPLY_ALIASES[id] ?? id))].filter(id => have.has(id)) }));
  return { staff, self, stages: CONFIRM_STAGES };
}

export function buildLibrary(restaurant) {
  if (restaurant.purpose === 'confirm') return libraryFrom(confirmLibrary(restaurant), restaurant);
  const staff = staffPhrases(restaurant).filter(applies).map(strip);
  const self = selfPhrases(restaurant).filter(applies).map(strip);
  return libraryFrom({ staff, self, stages: ALL_STAGES }, restaurant);
}

function libraryFrom({ staff, self, stages: allStages }, restaurant) {
  const all = [...staff, ...self];
  const index = new Map(all.map(p => [p.id, p]));
  const stages = allStages
    .filter(stage => self.some(p => p.stage === stage.id))
    .map(stage => stage.id === 'course' && !restaurant.features.course
      ? { ...stage, label: 'Allergies & extras', cue: 'アレルギー', when: 'They ask about allergies' } : stage);
  return {
    STAFF: staff, SELF: self, PHRASES: all,
    PANIC: self.filter(p => p.stage === 'panic'),
    STAGES: stages,
    byId: id => index.get(id),
    byStage: stage => self.filter(p => p.stage === stage),
  };
}

const LIBRARY = buildLibrary(RESTAURANT);
export const { STAFF, SELF, PHRASES, PANIC, STAGES } = LIBRARY;
export function byId(id) { return LIBRARY.byId(id); }
export function byStage(stage) { return LIBRARY.byStage(stage); }

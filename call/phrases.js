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

const STAFF_PHRASES = [
  { id: 'staff-greeting', who: 'staff',
    kanji: 'はい、日山でございます。', kana: 'はい、ひやまでございます',
    romaji: 'Hai, Hiyama de gozaimasu.', en: 'Hello, this is Hiyama.',
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
    replies: ['self-other-time', 'self-other-date'] },

  { id: 'staff-offer-other-time', who: 'staff',
    kanji: '7時ですと満席ですが、7時半でしたらご案内できます。',
    kana: 'しちじですとまんせきですが、しちじはんでしたらごあんないできます',
    romaji: 'Shichi-ji desu to manseki desu ga, shichi-ji han deshitara go-annai dekimasu.',
    en: '7:00 is full, but we could seat you at 7:30.',
    replies: ['self-yes-request', 'self-other-date'] },

  { id: 'staff-holiday-busy', who: 'staff',
    kanji: '11月3日は祝日でございまして、大変混み合っております。',
    kana: 'じゅういちがつみっかはしゅくじつでございまして、たいへんこみあっております',
    romaji: 'Jūichi-gatsu mikka wa shukujitsu de gozaimashite, taihen komiatte orimasu.',
    en: 'November 3rd is a public holiday, so we are very busy.',
    replies: ['self-other-time'] },

  { id: 'staff-zashiki-or-table', who: 'staff',
    kanji: 'お席はお座敷とテーブル席がございますが、どちらがよろしいでしょうか。',
    kana: 'おせきはおざしきとてーぶるせきがございますが、どちらがよろしいでしょうか',
    romaji: 'O-seki wa o-zashiki to tēburu-seki ga gozaimasu ga, dochira ga yoroshii deshō ka.',
    en: 'We have tatami rooms and table seating — which would you prefer?',
    replies: ['self-zashiki-yes'] },

  { id: 'staff-private-room-ask', who: 'staff',
    kanji: '個室をご希望でしょうか。', kana: 'こしつをごきぼうでしょうか',
    romaji: 'Koshitsu o go-kibō deshō ka.', en: 'Would you like a private room?',
    replies: ['self-zashiki-yes'] },

  { id: 'staff-rooms-full', who: 'staff', decoy: true,
    kanji: '個室は満席でございます。', kana: 'こしつはまんせきでございます',
    romaji: 'Koshitsu wa manseki de gozaimasu.', en: 'The private rooms are all taken.',
    replies: ['self-table-ok'] },

  { id: 'staff-course', who: 'staff',
    kanji: 'コースはお決まりでしょうか。', kana: 'こーすはおきまりでしょうか',
    romaji: 'Kōsu wa o-kimari deshō ka.', en: 'Have you decided on a course?',
    replies: ['self-course-later', 'self-course-recommend'] },

  { id: 'staff-course-in-advance', who: 'staff',
    kanji: 'お料理は事前にお決めいただいております。', kana: 'おりょうりはじぜんにおきめいただいております',
    romaji: 'O-ryōri wa jizen ni o-kime itadaite orimasu.',
    en: 'We ask that the course be chosen in advance.',
    replies: ['self-budget', 'self-course-recommend'],
    note: 'This is the direct refusal of your "decide on the day" plan. Answer with budget.' },

  { id: 'staff-budget', who: 'staff',
    kanji: 'ご予算はおいくらぐらいをお考えでしょうか。', kana: 'ごよさんはおいくらぐらいをおかんがえでしょうか',
    romaji: 'Go-yosan wa oikura gurai o o-kangae deshō ka.',
    en: 'What budget did you have in mind?', replies: ['self-budget'] },

  { id: 'staff-service-charge', who: 'staff', decoy: true,
    kanji: 'サービス料を別途10パーセント頂戴しております。',
    kana: 'さーびすりょうをべっとじゅっぱーせんとちょうだいしております',
    romaji: 'Sābisu-ryō o bettō juppāsento chōdai shite orimasu.',
    en: 'A 10% service charge is added on top.', replies: ['self-understood'] },

  { id: 'staff-cancel-fee', who: 'staff', decoy: true,
    kanji: '当日のキャンセルはコース料金を全額頂戴しております。',
    kana: 'とうじつのきゃんせるはこーすりょうきんをぜんがくちょうだいしております',
    romaji: 'Tōjitsu no kyanseru wa kōsu ryōkin o zengaku chōdai shite orimasu.',
    en: 'Same-day cancellation is charged at the FULL course price.',
    replies: ['self-understood', 'self-cancel-ask'],
    note: '~¥88,000 for four. This is real money — make sure you heard it right.' },

  { id: 'staff-card-number', who: 'staff', decoy: true,
    kanji: 'クレジットカードの番号をお伺いしてもよろしいでしょうか。',
    kana: 'くれじっとかーどのばんごうをおうかがいしてもよろしいでしょうか',
    romaji: 'Kurejitto kādo no bangō o o-ukagai shite mo yoroshii deshō ka.',
    en: 'May I take your credit card number?',
    replies: ['self-card-not-here', 'self-repeat'],
    note: 'Do NOT read out card digits on a line you cannot hear clearly. Deflect, then arrange email.' },

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
    replies: ['self-other-time', 'self-other-date'] },

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
    kanji: 'ジェフリー様、11月3日火曜日、午後7時から4名様でよろしいでしょうか。',
    kana: 'じぇふりーさま、じゅういちがつみっかかようび、ごごしちじからよんめいさまでよろしいでしょうか',
    romaji: 'Jefurī-sama, jūichi-gatsu mikka kayōbi, gogo shichi-ji kara yon-mei-sama de yoroshii deshō ka.',
    en: 'Geoffrey, November 3rd (Tuesday), 7pm, four people — is that correct?',
    replies: ['self-yes-right'] },

  { id: 'staff-uketamawarimashita', who: 'staff',
    kanji: 'それでは、ジェフリー様、11月3日午後7時、4名様で承りました。',
    kana: 'それでは、じぇふりーさま、じゅういちがつみっかごごしちじ、よんめいさまでうけたまわりました',
    romaji: 'Sore de wa, Jefurī-sama, jūichi-gatsu mikka gogo shichi-ji, yon-mei-sama de uketamawarimashita.',
    en: 'Very well — your reservation is CONFIRMED.',
    replies: ['self-thanks', 'self-goodbye'],
    note: '承りました is the word that means the booking exists. Write down the time and who you spoke to.' },

  { id: 'staff-decide-on-day', who: 'staff',
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

const SELF_PHRASES = [
  { id: 'self-open', who: 'self', stage: 'open',
    kanji: '恐れ入ります、予約をお願いしたいのですが。',
    kana: 'おそれいります、よやくをおねがいしたいのですが',
    romaji: 'Osore irimasu, yoyaku o onegai shitai no desu ga.',
    en: "Excuse me — I'd like to make a reservation.",
    note: 'NOT もしもし. As the caller, もしもし reads as casual — save it for a line check.' },

  { id: 'self-new-booking', who: 'self', stage: 'open',
    kanji: 'いいえ、新しく予約をお願いしたいのですが。',
    kana: 'いいえ、あたらしくよやくをおねがいしたいのですが',
    romaji: 'Iie, atarashiku yoyaku o onegai shitai no desu ga.',
    en: "No — I'd like to make a new reservation." },

  { id: 'self-level', who: 'self', stage: 'open',
    kanji: 'すみません、日本語があまり得意ではありません。ゆっくり話していただけますか。',
    kana: 'すみません、にほんごがあまりとくいではありません。ゆっくりはなしていただけますか',
    romaji: 'Sumimasen, nihongo ga amari tokui de wa arimasen. Yukkuri hanashite itadakemasu ka.',
    en: "Sorry, my Japanese isn't very good. Could you speak slowly?",
    note: '得意, NOT 上手 — 上手 praises other people, never yourself. Say this early.' },

  { id: 'self-datetime', who: 'self', stage: 'when',
    kanji: '11月3日の夜7時にお願いします。',
    kana: 'じゅういちがつみっかのよるしちじにおねがいします',
    romaji: 'Jūichi-gatsu mikka no yoru shichi-ji ni onegai shimasu.',
    en: 'November 3rd at 7pm, please.',
    note: '3日 is みっか — NOT さんにち. The easiest slip in the whole call.' },

  { id: 'self-date-only', who: 'self', stage: 'when',
    kanji: '11月3日、火曜日です。', kana: 'じゅういちがつみっか、かようびです',
    romaji: 'Jūichi-gatsu mikka, kayōbi desu.', en: 'November 3rd, Tuesday.' },

  { id: 'self-time-only', who: 'self', stage: 'when',
    kanji: '午後7時です。', kana: 'ごごしちじです',
    romaji: 'Gogo shichi-ji desu.', en: '7pm.' },

  { id: 'self-party', who: 'self', stage: 'party',
    kanji: '4人でお願いします。', kana: 'よにんでおねがいします',
    romaji: 'Yo-nin de onegai shimasu.', en: 'Four people, please.',
    note: '4人 from you; 4名様 is what THEY say about you.' },

  { id: 'self-adults-only', who: 'self', stage: 'party',
    kanji: '全員大人です。子供はおりません。', kana: 'ぜんいんおとなです。こどもはおりません',
    romaji: "Zen'in otona desu. Kodomo wa orimasen.", en: 'All adults, no children.' },

  { id: 'self-name', who: 'self', stage: 'name',
    kanji: 'ジェフリーと申します。', kana: 'じぇふりーともうします',
    romaji: 'Jefurī to mōshimasu.', en: 'My name is Geoffrey.' },

  { id: 'self-name-katakana', who: 'self', stage: 'name',
    kanji: 'ジェフリーです。ジェ、フ、リー、です。', kana: 'じぇふりーです。じぇ、ふ、りー、です',
    romaji: 'Jefurī desu. Je, fu, rī, desu.', en: 'Geoffrey — Je, fu, rī.',
    note: 'Beat it out in three if they ask again.' },

  { id: 'self-name-full', who: 'self', stage: 'name',
    kanji: 'ジェフリー・ジェームズと申します。', kana: 'じぇふりー・じぇーむずともうします',
    romaji: 'Jefurī Jēmuzu to mōshimasu.', en: 'My name is Geoffrey James.' },

  { id: 'self-phone-intro', who: 'self', stage: 'phone',
    kanji: '電話番号は海外の番号です。インドネシアです。',
    kana: 'でんわばんごうはかいがいのばんごうです。いんどねしあです',
    romaji: 'Denwa bangō wa kaigai no bangō desu. Indoneshia desu.',
    en: 'My phone number is an overseas one — Indonesia.',
    note: 'Say this BEFORE the digits so they know a long number is coming.' },

  { id: 'self-phone-digits', who: 'self', stage: 'phone',
    kanji: '国番号は62です。812の8063の7730です。',
    kana: 'こくばんごうはろくじゅうにです。はちいちにーの、はちぜろろくさんの、ななななさんぜろです',
    romaji: 'Kokubangō wa roku-jū-ni desu. Hachi-ichi-nī no, hachi-zero-roku-san no, nana-nana-san-zero desu.',
    en: '+62 812 8063 7730 (Indonesia, country code 62).',
    note: '国番号 as a whole number, then digits with の between groups. にー not に — 2 is the most misheard digit. ぜろ, not まる.' },

  { id: 'self-no-japan-phone', who: 'self', stage: 'phone',
    kanji: '申し訳ありません、日本の電話番号はありません。',
    kana: 'もうしわけありません、にほんのでんわばんごうはありません',
    romaji: 'Mōshiwake arimasen, Nihon no denwa bangō wa arimasen.',
    en: "I'm sorry, I don't have a Japanese phone number.",
    note: 'If you have a Tokyo hotel booked by then, give ITS number instead — it is worth more than this whole app.' },

  { id: 'self-email', who: 'self', stage: 'phone',
    kanji: 'メールアドレスをお伝えしましょうか。', kana: 'めーるあどれすをおつたえしましょうか',
    romaji: 'Mēru adoresu o otsutae shimashō ka.',
    en: 'Shall I give you my email address instead?' },

  { id: 'self-email-spell', who: 'self', stage: 'phone',
    kanji: 'ジー・イー・オー・エフ・エフ・アール・イー・ジェー・エー・エム・イー・エス、アットマーク、ジーメール・ドット・コムです。',
    kana: 'じー・いー・おー・えふ・えふ・あーる・いー・じぇー・えー・えむ・いー・えす、あっとまーく、じーめーる・どっと・こむです',
    romaji: 'Jī-ī-ō-efu-efu-āru-ī-jē-ē-emu-ī-esu, attomāku, Jīmēru dotto komu desu.',
    en: 'geoffrejames@gmail.com',
    note: 'g-e-o-f-f-r-e-j-a-m-e-s @ gmail.com — slowly, one letter at a time.' },

  { id: 'self-zashiki-yes', who: 'self', stage: 'seat',
    kanji: 'お座敷でお願いします。', kana: 'おざしきでおねがいします',
    romaji: 'O-zashiki de onegai shimasu.', en: 'A tatami room, please.',
    note: 'Hiyama has 9 tatami rooms and only 2 table rooms — this is the easy ask.' },

  { id: 'self-table-ok', who: 'self', stage: 'seat',
    kanji: 'それで結構です。', kana: 'それでけっこうです',
    romaji: 'Sore de kekkō desu.', en: "That's fine.",
    note: 'NOT 大丈夫です — that also means "no thanks", and here you mean yes.' },

  { id: 'self-table-seat', who: 'self', stage: 'seat',
    kanji: 'テーブル席でお願いします。', kana: 'てーぶるせきでおねがいします',
    romaji: 'Tēburu-seki de onegai shimasu.', en: 'Table seating, please.' },

  { id: 'self-course-later', who: 'self', stage: 'course',
    kanji: 'コースは当日決めさせていただいてもよろしいでしょうか。',
    kana: 'こーすはとうじつきめさせていただいてもよろしいでしょうか',
    romaji: 'Kōsu wa tōjitsu kimesasete itadaite mo yoroshii deshō ka.',
    en: 'May we decide the course on the day?' },

  { id: 'self-course-recommend', who: 'self', stage: 'course',
    kanji: 'では、おすすめのコースでお願いします。',
    kana: 'では、おすすめのこーすでおねがいします',
    romaji: 'Dewa, osusume no kōsu de onegai shimasu.',
    en: 'Then your recommended course, please.' },

  { id: 'self-budget', who: 'self', stage: 'course',
    kanji: '予算は一人二万円くらいで考えております。',
    kana: 'よさんはひとりにまんえんくらいでかんがえております',
    romaji: 'Yosan wa hitori ni-man-en kurai de kangaete orimasu.',
    en: 'About ¥20,000 per person.',
    note: 'Matches their actual course pricing. ~¥88,000 for four with the 10% service charge.' },

  { id: 'self-allergy-none', who: 'self', stage: 'course',
    kanji: 'アレルギーは特にありません。', kana: 'あれるぎーはとくにありません',
    romaji: 'Arerugī wa toku ni arimasen.', en: 'No allergies in particular.' },

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
    kanji: '念のため確認させていただきます。11月3日、午後7時、4人ですね。',
    kana: 'ねんのためかくにんさせていただきます。じゅういちがつみっか、ごごしちじ、よにんですね',
    romaji: 'Nen no tame kakunin sasete itadakimasu. Jūichi-gatsu mikka, gogo shichi-ji, yo-nin desu ne.',
    en: 'Just to confirm — November 3rd, 7pm, four people.' },

  { id: 'self-booked-check', who: 'self', stage: 'close',
    kanji: '予約は取れましたか。', kana: 'よやくはとれましたか',
    romaji: 'Yoyaku wa toremashita ka.', en: 'So the reservation is confirmed?' },

  { id: 'self-thanks', who: 'self', stage: 'close',
    kanji: 'ありがとうございます。よろしくお願いします。',
    kana: 'ありがとうございます。よろしくおねがいします',
    romaji: 'Arigatō gozaimasu. Yoroshiku onegai shimasu.',
    en: 'Thank you, I appreciate it.' },

  { id: 'self-goodbye', who: 'self', stage: 'close',
    kanji: 'ありがとうございました。失礼いたします。',
    kana: 'ありがとうございました。しつれいいたします',
    romaji: 'Arigatō gozaimashita. Shitsurei itashimasu.',
    en: 'Thank you very much. Goodbye.',
    note: 'This is how you END the call. よろしくお願いします does not hang up a phone.' },

  { id: 'self-card-not-here', who: 'self', stage: 'trouble',
    kanji: '申し訳ありません、今カードが手元にございません。',
    kana: 'もうしわけありません、いまかーどがてもとにございません',
    romaji: 'Mōshiwake arimasen, ima kādo ga temoto ni gozaimasen.',
    en: "Sorry — I don't have my card with me right now.",
    note: 'Do NOT read card digits down a line you cannot hear. Ask them to email instead.' },

  { id: 'self-callback-deflect', who: 'self', stage: 'phone',
    kanji: '海外の番号なので、メールでご連絡いただけますか。',
    kana: 'かいがいのばんごうなので、めーるでごれんらくいただけますか',
    romaji: 'Kaigai no bangō na node, mēru de go-renraku itadakemasu ka.',
    en: 'My number is overseas — could you contact me by email instead?' },

  { id: 'self-readback-please', who: 'self', stage: 'trouble',
    kanji: '恐れ入りますが、復唱していただけますか。',
    kana: 'おそれいりますが、ふくしょうしていただけますか',
    romaji: 'Osore irimasu ga, fukushō shite itadakemasu ka.',
    en: 'Could you read that back to me?',
    note: 'Use after the email AND the phone number. They will hear ジェフリー and write geoffrey@ — there is no y.' },

  { id: 'self-what-time-call', who: 'self', stage: 'trouble',
    kanji: '何時頃おかけ直しすればよろしいですか。',
    kana: 'なんじごろおかけなおしすればよろしいですか',
    romaji: 'Nan-ji goro o-kakenaoshi sureba yoroshii desu ka.',
    en: 'What time should I call back?',
    note: 'Tokyo is 2 hours ahead of Jakarta. Write the time down in BOTH.' },

  { id: 'self-horigotatsu', who: 'self', stage: 'seat',
    kanji: 'お座敷は掘り炬燵でしょうか。足を下ろせますか。',
    kana: 'おざしきはほりごたつでしょうか。あしをおろせますか',
    romaji: 'O-zashiki wa horigotatsu deshō ka. Ashi o orosemasu ka.',
    en: 'Are the tatami rooms sunken-floor? Can we put our legs down?',
    note: 'Unverified for Hiyama. Two hours of 正座 for four people is worth one question.' },

  { id: 'self-no-occasion', who: 'self', stage: 'course',
    kanji: 'いいえ、普通の食事です。', kana: 'いいえ、ふつうのしょくじです',
    romaji: 'Iie, futsū no shokuji desu.', en: 'No, just dinner.' },

  { id: 'self-email-confirm', who: 'self', stage: 'close',
    kanji: '確認のメールを送っていただけますか。', kana: 'かくにんのめーるをおくっていただけますか',
    romaji: 'Kakunin no mēru o okutte itadakemasu ka.',
    en: 'Could you send me a confirmation email?',
    note: 'You have no Japanese phone. Written confirmation is your only proof.' },

  { id: 'self-staff-name', who: 'self', stage: 'close',
    kanji: '恐れ入りますが、ご担当の方のお名前を伺ってもよろしいですか。',
    kana: 'おそれいりますが、ごたんとうのかたのおなまえをうかがってもよろしいですか',
    romaji: 'Osore irimasu ga, go-tantō no kata no o-namae o ukagatte mo yoroshii desu ka.',
    en: 'May I ask who I am speaking with?',
    note: 'Write it down. If the booking is missing on the night, this is your recourse.' },

  { id: 'self-other-date', who: 'self', stage: 'trouble',
    kanji: '他の日は空いていますか。', kana: 'ほかのひはあいていますか',
    romaji: 'Hoka no hi wa aite imasu ka.', en: 'Are other days available?' },

  { id: 'self-other-time', who: 'self', stage: 'trouble',
    kanji: '他の時間は空いていますか。', kana: 'ほかのじかんはあいていますか',
    romaji: 'Hoka no jikan wa aite imasu ka.', en: 'Are other times available?' },

  { id: 'self-cancel-ask', who: 'self', stage: 'trouble',
    kanji: 'キャンセル料はいつからかかりますか。', kana: 'きゃんせるりょうはいつからかかりますか',
    romaji: 'Kyanseru-ryō wa itsu kara kakarimasu ka.',
    en: 'From when does the cancellation fee apply?' },

  { id: 'self-can-you-hear', who: 'self', stage: 'trouble',
    kanji: 'もしもし、聞こえますか。', kana: 'もしもし、きこえますか',
    romaji: 'Moshi moshi, kikoemasu ka.', en: 'Hello — can you hear me?',
    note: 'もしもし IS correct here. This is the line-check use.' },

  { id: 'self-english-speaker', who: 'self', stage: 'trouble',
    kanji: '英語を話せる方はいらっしゃいますか。',
    kana: 'えいごをはなせるかたはいらっしゃいますか',
    romaji: 'Eigo o hanaseru kata wa irasshaimasu ka.',
    en: 'Is there anyone there who speaks English?' },

  { id: 'self-repeat', who: 'self', stage: 'trouble',
    kanji: 'もう一度お願いできますか。', kana: 'もういちどおねがいできますか',
    romaji: 'Mō ichido onegai dekimasu ka.', en: 'Could you say that once more?' },

  { id: 'panic-again', who: 'self', stage: 'panic',
    kanji: 'もう一度お願いします。', kana: 'もういちどおねがいします',
    romaji: 'Mō ichido onegai shimasu.', en: 'Once more, please.' },

  { id: 'panic-slower', who: 'self', stage: 'panic',
    kanji: 'もう少しゆっくりお願いします。', kana: 'もうすこしゆっくりおねがいします',
    romaji: 'Mō sukoshi yukkuri onegai shimasu.', en: 'A little more slowly, please.' },

  { id: 'panic-louder', who: 'self', stage: 'panic',
    kanji: 'もう少し大きな声でお願いできますか。',
    kana: 'もうすこしおおきなこえでおねがいできますか',
    romaji: 'Mō sukoshi ōkina koe de onegai dekimasu ka.',
    en: 'Could you speak a little louder?' },

  { id: 'panic-dont-understand', who: 'self', stage: 'panic',
    kanji: 'すみません、よく分かりませんでした。', kana: 'すみません、よくわかりませんでした',
    romaji: 'Sumimasen, yoku wakarimasen deshita.', en: "Sorry, I didn't quite understand." },

  { id: 'panic-wait', who: 'self', stage: 'panic',
    kanji: '少々お待ちいただけますか。', kana: 'しょうしょうおまちいただけますか',
    romaji: 'Shōshō omachi itadakemasu ka.', en: 'Could you wait a moment?',
    note: 'NOT 少々お待ちください — that is an order, and it is what THEY say to YOU.' },
];

export const STAFF = STAFF_PHRASES;
export const SELF = SELF_PHRASES;
export const PHRASES = [...STAFF_PHRASES, ...SELF_PHRASES];
export const PANIC = SELF_PHRASES.filter(p => p.stage === 'panic');

const INDEX = new Map(PHRASES.map(p => [p.id, p]));
export function byId(id) { return INDEX.get(id); }
export function byStage(stage) { return SELF_PHRASES.filter(p => p.stage === stage); }

export const STAGES = [
  { id: 'open', label: 'Opening' },
  { id: 'when', label: 'Date & time' },
  { id: 'party', label: 'Party size' },
  { id: 'name', label: 'Your name' },
  { id: 'phone', label: 'Phone & email' },
  { id: 'seat', label: 'Seating' },
  { id: 'course', label: 'Course & allergies' },
  { id: 'close', label: 'Confirm & close' },
  { id: 'trouble', label: 'If it goes wrong' },
];

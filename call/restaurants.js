// One profile per restaurant he has to call. Everything that differs between
// calls lives here: who answers, the booking he asks for, what the rehearsal
// staff know, and which topics come up at all (only Hiyama has seating and
// courses to discuss; only PST is cashless).
//
// The active restaurant is read once, at page load, from ?r=<id>. Every module
// builds its phrases and prompts from it as it loads, so switching restaurants
// is a page reload and nothing can go stale halfway through a call.

// Counters: he says 4人 (よにん); staff say 4名様 (よんめいさま) about him.
const PARTY = {
  2: { selfJa: '2人', selfKana: 'ふたり', selfRomaji: 'futari', staffJa: '2名', staffKana: 'にめい', staffRomaji: 'ni-mei', en: 'two' },
  3: { selfJa: '3人', selfKana: 'さんにん', selfRomaji: 'san-nin', staffJa: '3名', staffKana: 'さんめい', staffRomaji: 'san-mei', en: 'three' },
  4: { selfJa: '4人', selfKana: 'よにん', selfRomaji: 'yo-nin', staffJa: '4名', staffKana: 'よんめい', staffRomaji: 'yon-mei', en: 'four' },
  5: { selfJa: '5人', selfKana: 'ごにん', selfRomaji: 'go-nin', staffJa: '5名', staffKana: 'ごめい', staffRomaji: 'go-mei', en: 'five' },
  6: { selfJa: '6人', selfKana: 'ろくにん', selfRomaji: 'roku-nin', staffJa: '6名', staffKana: 'ろくめい', staffRomaji: 'roku-mei', en: 'six' },
};

const EVENING_7 = {
  ja: '7時', kana: 'しちじ', romaji: 'shichi-ji',
  fullJa: '午後7時', fullKana: 'ごごしちじ', fullRomaji: 'gogo shichi-ji',
  periodJa: '夜', periodKana: 'よる', periodRomaji: 'yoru',
  en: '7:00', enSpoken: '7pm', header: '19:00',
  laterJa: '7時半', laterKana: 'しちじはん', laterRomaji: 'shichi-ji han', laterEn: '7:30',
};

const BOOKER = 'name ジェフリー (Geoffrey), phone +62 812 8063 7730 (no Japanese number), email geoffrejames@gmail.com';

export const RESTAURANTS = Object.freeze({
  hiyama: {
    id: 'hiyama',
    label: 'Hiyama — Tue 3 Nov, 19:00',
    name: { ja: 'すき焼割烹 日山', short: '日山', shortKana: 'ひやま', shortRomaji: 'Hiyama',
            en: 'Sukiyaki Kappō Hiyama', interpret: 'Hiyama, Tokyo', openingKana: 'すきやきかっぽうひやま' },
    dial: '+81 3 3666 2901',
    meal: 'dinner',
    date: { ja: '11月3日', kana: 'じゅういちがつみっか', romaji: 'jūichi-gatsu mikka',
            weekdayJa: '火曜日', weekdayKana: 'かようび', weekdayRomaji: 'kayōbi', weekdayEn: 'Tuesday',
            enShort: 'November 3rd', header: 'Tue 3 Nov 2026', holiday: true,
            note: '3日 is みっか — NOT さんにち. The easiest slip in the whole call.' },
    time: EVENING_7,
    party: PARTY[4],
    partyCount: 4,
    features: { seating: true, course: true, serviceCharge: true, cashless: false },
    budget: { ja: '二万円', kana: 'にまんえん', romaji: 'ni-man-en', en: '¥20,000' },
    headerFacts: [{ key: 'Party', value: '4 · tatami' }, { key: 'Cancel fee', value: '100% from midnight', warn: true }],
    callWindow: { strong: 'Call between 12:00–14:00 Jakarta time',
                  rest: ' (14:00–16:00 Tokyo) — the afternoon lull. Avoid 15:00–19:30 WIB: that is their dinner service. They are closed Sundays; 3 Nov is a holiday but they are open.' },
    booking: `Tuesday 3 November 2026, 19:00, 4 people, tatami room (お座敷), ${BOOKER}, budget about ¥20,000 per person`,
    detailsSpoken: '3 November, 7pm, 4 people',
    changeExample: { accepted: '17:00 or 19:30 instead of 19:00', agreed: '19:30 instead of 19:00' },
    sim: {
      identity: 'すき焼割烹 日山 (Sukiyaki Kappō Hiyama), a long-established, high-end sukiyaki restaurant at 2-5-1 Nihonbashi Ningyocho, Chuo-ku, Tokyo',
      facts: `- Dinner 17:00–21:30, last order 20:00. Lunch 11:30–14:30, last order 13:30.
- Closed on Sundays (日曜定休). Open on public holidays. 3 November 2026 is a Tuesday and 文化の日, a public holiday, so the evening is busy.
- Every table is a private room: 11 rooms — 9 tatami rooms (お座敷) and 2 with table seating.
- Courses differ by beef grade; dinner courses run up to about ¥26,000 per person, plus a 10% service charge.
- Cancelling on the day (from midnight) is charged at 100% of the course price.
- Guests seated at 17:00 have a two-hour limit.
- No smoking anywhere. No whole-restaurant private hire.
- Nobody on duty speaks English.`,
      register: 'Natural telephone keigo, as a real kappō would use it: でございます, かしこまりました, 恐れ入りますが, 承りました.',
      asks: 'date, time, party size, name (and the katakana spelling of a foreign name), contact number, seating preference, course or budget, allergies',
      complications: 'the requested time is full but another is free, the course must be chosen in advance, or you need a Japanese contact number',
    },
  },

  pst: {
    id: 'pst',
    label: 'PST Higashi-Azabu — Sun 1 Nov, 19:00',
    name: { ja: 'PST 東麻布', short: 'PST東麻布', shortKana: 'ぴーえすてぃーひがしあざぶ', shortRomaji: 'PST Higashi-Azabu',
            en: 'Pizza Studio Tamaki (PST) Higashi-Azabu', interpret: 'PST pizzeria, Higashi-Azabu, Tokyo',
            openingKana: 'ぴーえすてぃーひがしあざぶ' },
    dial: '+81 3 6277 8064',
    meal: 'dinner',
    date: { ja: '11月1日', kana: 'じゅういちがつついたち', romaji: 'jūichi-gatsu tsuitachi',
            weekdayJa: '日曜日', weekdayKana: 'にちようび', weekdayRomaji: 'nichiyōbi', weekdayEn: 'Sunday',
            enShort: 'November 1st', header: 'Sun 1 Nov 2026', holiday: false,
            note: '1日 is ついたち — NOT いちにち. Same trap as 3日 (みっか).' },
    time: EVENING_7,
    party: PARTY[4],
    partyCount: 4,
    features: { seating: false, course: false, serviceCharge: true, cashless: true },
    budget: null,
    headerFacts: [{ key: 'Party', value: '4' }, { key: 'Payment', value: 'Cashless only', warn: true }],
    callWindow: { strong: 'Call a weekday 12:00–14:30 Jakarta time',
                  rest: ' (14:00–16:30 Tokyo), before their 17:00 dinner rush. Phones only — no online booking. Ask for the Higashi-Azabu branch, not Roppongi.' },
    booking: `Sunday 1 November 2026, 19:00, 4 people, ${BOOKER}`,
    detailsSpoken: '1 November, 7pm, 4 people',
    changeExample: { accepted: '18:00 or 19:30 instead of 19:00', agreed: '19:30 instead of 19:00' },
    sim: {
      identity: 'PST 東麻布, the Higashi-Azabu branch of Pizza Studio Tamaki, a popular Neapolitan pizzeria with a Michelin Bib Gourmand, at 1-24-6 Higashi-Azabu, Minato-ku, Tokyo, two minutes from Akabanebashi station',
      facts: `- Reservations are by phone only. There is a separate Roppongi branch, and callers sometimes mix them up.
- Weekdays: dinner 17:00–22:00. Weekends and holidays: lunch 12:00–15:00 and dinner 17:00–21:00.
- 1 November 2026 is a Sunday.
- Cashless only — no cash accepted. A 10% service charge is added.
- À la carte pizzas and small plates: there are no set courses to choose when booking.
- It is popular and tables fill up.
- For this rehearsal, assume nobody on duty speaks English.`,
      register: 'Polite, friendly restaurant phone Japanese: です/ます with standard service phrases such as かしこまりました and 少々お待ちください — less formal than a traditional kappō.',
      asks: 'date, time, party size, name (and the katakana spelling of a foreign name), contact number, allergies',
      complications: 'the requested time is full but another is free, you need a Japanese contact number, or you remind him that payment is cashless only',
    },
  },

  fujinoya: {
    id: 'fujinoya',
    label: 'ふじ乃屋 Fujiyoshida — Fri 30 Oct, 12:15',
    name: { ja: 'ふじ乃屋', short: 'ふじ乃屋', shortKana: 'ふじのや', shortRomaji: 'Fujinoya',
            en: 'Sukiyaki & Shabu-shabu Fujinoya', interpret: 'Fujinoya, Fujiyoshida',
            openingKana: 'ふじのや' },
    dial: '+81 70 3622 3330',
    meal: 'lunch',
    date: { ja: '10月30日', kana: 'じゅうがつさんじゅうにち', romaji: 'jū-gatsu sanjū-nichi',
            weekdayJa: '金曜日', weekdayKana: 'きんようび', weekdayRomaji: "kin'yōbi", weekdayEn: 'Friday',
            enShort: 'October 30th', header: 'Fri 30 Oct 2026', holiday: false,
            note: '10月 is じゅうがつ. 30日 is regular — さんじゅうにち.' },
    time: {
      ja: '12時15分', kana: 'じゅうにじじゅうごふん', romaji: 'jūni-ji jūgo-fun',
      fullJa: '12時15分', fullKana: 'じゅうにじじゅうごふん', fullRomaji: 'jūni-ji jūgo-fun',
      periodJa: '昼', periodKana: 'ひる', periodRomaji: 'hiru',
      en: '12:15', enSpoken: '12:15', header: '12:15',
      laterJa: '12時45分', laterKana: 'じゅうにじよんじゅうごふん', laterRomaji: 'jūni-ji yonjūgo-fun', laterEn: '12:45',
    },
    party: PARTY[4],
    partyCount: 4,
    features: { seating: false, course: false, serviceCharge: false, cashless: false },
    budget: null,
    headerFacts: [{ key: 'Party', value: '4' }, { key: 'Seats', value: '15 only', warn: true }],
    callWindow: { strong: 'Try an Instagram DM first (@fujinoya_sukiyaki).',
                  rest: ' To call: 12:00–14:30 Jakarta time (14:00–16:30 Tokyo), between their lunch and dinner. Open daily 11:00–22:00.' },
    booking: `Friday 30 October 2026, 12:15 lunch, 4 people, ${BOOKER}`,
    detailsSpoken: '30 October, 12:15, 4 people',
    changeExample: { accepted: '12:00 or 13:00 instead of 12:15', agreed: '13:00 instead of 12:15' },
    sim: {
      identity: 'すき焼きとしゃぶしゃぶ ふじ乃屋 (Fujinoya), a small sukiyaki and shabu-shabu restaurant serving A5 wagyu at 3-16-5 Shimoyoshida, Fujiyoshida, Yamanashi, a few minutes from Gekkoji station. It opened in April 2026',
      facts: `- Open every day 11:00–22:00, last order 21:00. Lunch and dinner prices are the same.
- Only 15 seats: a tatami area for 10 and a 5-seat counter. A party of 4 sits in the tatami area.
- Sets are priced by meat portion, 100–200 g of A5 wagyu, about ¥3,630–¥5,280 with sides, rice, soup and dessert. Guests choose sukiyaki or shabu-shabu on the day.
- 30 October 2026 is a Friday.
- Nobody on duty speaks English.`,
      register: 'Polite, friendly restaurant phone Japanese: です/ます with standard service phrases. A small local place — warm rather than stiff.',
      asks: 'date, time, party size, name (and the katakana spelling of a foreign name), contact number, allergies',
      complications: 'the requested time is full because the room is small but another time is free, or you need a Japanese contact number',
    },
  },

  // Checked 2026-10-21 on Google Maps (4.4 from 712 reviews, +81 555-28-4151,
  // open daily 11:00–15:30 and 18:00–21:30), the official site
  // nagomi-yamanakako.com (courses, dinner reservation-only, cards + PayPay)
  // and Hot Pepper (horigotatsu seating, no tatami zashiki, online booking).
  // Listings disagree on dinner start (17:30/18:00/18:30); Google and the
  // official top page both say 18:00. The official site also lists a mobile,
  // 080-4538-1725.
  nagomi: {
    id: 'nagomi',
    label: 'Nagomi Yamanakako — Thu 29 Oct, 19:00',
    name: { ja: '山中湖 和食 和み', short: '和み', shortKana: 'なごみ', shortRomaji: 'Nagomi',
            en: 'Yamanakako Washoku Nagomi', interpret: 'Nagomi, Lake Yamanaka',
            openingKana: 'やまなかこわしょくなごみ' },
    dial: '+81 555 28 4151',
    meal: 'dinner',
    date: { ja: '10月29日', kana: 'じゅうがつにじゅうくにち', romaji: 'jū-gatsu nijūku-nichi',
            weekdayJa: '木曜日', weekdayKana: 'もくようび', weekdayRomaji: 'mokuyōbi', weekdayEn: 'Thursday',
            enShort: 'October 29th', header: 'Thu 29 Oct 2026', holiday: false,
            note: '10月 is じゅうがつ. 29日 is にじゅうくにち — く, not きゅう.' },
    time: EVENING_7,
    party: PARTY[4],
    partyCount: 4,
    // course: they may ask him to choose now - everything is made in-house.
    // His plan: ask to decide on the day; if they insist, the Matsu course.
    features: { seating: false, course: true, serviceCharge: false, cashless: false },
    budget: null,
    fallbackCourse: { ja: '松コース', kana: 'まつこーす', romaji: 'Matsu kōsu',
                      en: 'Matsu course', detail: 'A5 Kyushu-ou wagyu, ¥6,578 each' },
    pots: true,                                    // sukiyaki or shabu-shabu, every course
    seatRequest: { ja: '掘りごたつの席', kana: 'ほりごたつのせき', romaji: 'horigotatsu no seki',
                   en: 'a sunken-floor (horigotatsu) table',
                   note: 'Legs go down into a well under the table — no kneeling. Hot Pepper lists horigotatsu seats; they have no tatami zashiki.' },
    holdNote: 'Try this BEFORE saying you will call back — hanging up without a booking can lose you the 19:00 table.',
    headerFacts: [{ key: 'Party', value: '4' }, { key: 'Course', value: 'on the day · else Matsu' },
                  { key: 'Dinner', value: 'reservation only', warn: true }],
    callWindow: { strong: 'Call 13:30–15:30 Jakarta time',
                  rest: ' (15:30–17:30 Tokyo), between lunch (ends 15:30) and dinner (from 18:00). Open every day. No call needed: Google Maps → Reserve a table, or Hot Pepper (instant booking until 17:00 that day).' },
    booking: `Thursday 29 October 2026, 19:00, 4 people, ${BOOKER}; course: he would like to choose on the day — if they need it now, the 松 (Matsu) course, A5 wagyu, ¥6,578 each; sukiyaki or shabu-shabu can be decided on the day too`,
    detailsSpoken: '29 October, 7pm, 4 people',
    changeExample: { accepted: '18:00 or 19:30 instead of 19:00', agreed: '19:30 instead of 19:00' },
    sim: {
      identity: '山中湖 和食 和み (Nagomi), a family-run Japanese restaurant by Lake Yamanaka at 21 Yamanaka, Yamanakako, Yamanashi, known for sukiyaki and shabu-shabu with Fuji "phantom pork" (富士山幻の豚, raised on Mt Fuji spring water) and A5 Kyushu-ou black wagyu',
      facts: `- Open every day: lunch 11:00–15:30 (last order 14:30), dinner 18:00–21:30 (last order 20:30). Dinner is by reservation only (完全予約制).
- 29 October 2026 is a Thursday.
- Dinner courses, each as sukiyaki or shabu-shabu, prices including tax: 竹コース ¥4,378 (phantom pork or Kyushu-ou black wagyu), 松コース ¥6,578 (A5 Kyushu-ou wagyu), 蓮コース ¥9,856 (wagyu and phantom pork side by side). Eel courses only by advance order.
- Everything is made in-house, so the kitchen likes to know the course in advance.
- Table seats and horigotatsu (sunken-floor) seats; no tatami zashiki. Floor heating. Lake view by day. Parking for 10 cars.
- Cards (Visa, Mastercard, Amex, JCB, Diners), PayPay and other QR payments are accepted.
- For this rehearsal, assume nobody on duty speaks English.`,
      register: 'Polite, warm family-restaurant phone Japanese: です/ます with standard service phrases such as かしこまりました and 少々お待ちください.',
      asks: 'date, time, party size, name (and the katakana spelling of a foreign name), contact number, course (or whether to decide on the day), sukiyaki or shabu-shabu, seating, allergies',
      complications: 'the 19:00 table is full but 18:00 or 19:30 is free, you ask him to choose the course now because everything is prepared in-house, or you need a Japanese contact number',
    },
  },

  // Checked 2026-10-21 on Tabelog (3.18–3.32, 17:00–23:00, last order 22:30,
  // closed Sundays, dinner ¥5,000–5,999, phone booking) and Google Maps (4.8 from
  // 84 reviews). A reviewer says you will not get in without a booking.
  // 食呑 is read しょくどん, as in 食呑処.
  hosha: {
    id: 'hosha',
    label: '食呑 ほしゃ Fujiyoshida — Fri 30 Oct, 18:30',
    name: { ja: '食呑 ほしゃ', short: 'ほしゃ', shortKana: 'ほしゃ', shortRomaji: 'Hosha',
            en: 'Shokudon Hosha', interpret: 'Hosha izakaya, Fujiyoshida',
            openingKana: 'しょくどんほしゃ' },
    dial: '+81 555 25 6196',
    meal: 'dinner',
    date: { ja: '10月30日', kana: 'じゅうがつさんじゅうにち', romaji: 'jū-gatsu sanjū-nichi',
            weekdayJa: '金曜日', weekdayKana: 'きんようび', weekdayRomaji: "kin'yōbi", weekdayEn: 'Friday',
            enShort: 'October 30th', header: 'Fri 30 Oct 2026', holiday: false,
            note: '10月 is じゅうがつ. 30日 is regular — さんじゅうにち.' },
    time: {
      ja: '6時半', kana: 'ろくじはん', romaji: 'roku-ji han',
      fullJa: '午後6時半', fullKana: 'ごごろくじはん', fullRomaji: 'gogo roku-ji han',
      periodJa: '夜', periodKana: 'よる', periodRomaji: 'yoru',
      en: '6:30', enSpoken: '6:30pm', header: '18:30',
      laterJa: '7時', laterKana: 'しちじ', laterRomaji: 'shichi-ji', laterEn: '7:00',
    },
    party: PARTY[4],
    partyCount: 4,
    features: { seating: false, course: false, serviceCharge: false, cashless: false },
    budget: null,
    headerFacts: [{ key: 'Party', value: '4' }, { key: 'Booking', value: 'needed — small and popular', warn: true }],
    callWindow: { strong: 'Call 13:00–14:45 Jakarta time',
                  rest: ' (15:00–16:45 Tokyo), while they prep before opening at 17:00. Closed Sundays. Phone only — no online booking. Times: 18:30, 19:00 or 19:30 — not 18:00. If they are full, Kiyo (+81 555 72 9929) is the backup.' },
    // He can take 18:30, 19:00 or 19:30 — never earlier (Panorama-dai sunset runs to ~16:45).
    laterTimes: { ja: '7時か7時半', kana: 'しちじかしちじはん', romaji: 'shichi-ji ka shichi-ji han', en: '7:00 or 7:30',
                  tooEarly: { ja: '6時', kana: 'ろくじ', romaji: 'roku-ji', en: '6:00' } },
    booking: `Friday 30 October 2026, 18:30, 4 people, ${BOOKER}; if 18:30 is full he can take 19:00 or 19:30, but NOT 18:00 or earlier — steer him to decline an earlier time`,
    detailsSpoken: '30 October, 6:30pm, 4 people',
    changeExample: { accepted: '19:00 or 19:30 instead of 18:30', agreed: '19:00 instead of 18:30' },
    sim: {
      identity: '食呑 ほしゃ (Shokudon Hosha), a small izakaya in a converted weaving warehouse at 5-12-20 Shimoyoshida, Fujiyoshida, Yamanashi. The owner is from Ibaraki and serves fresh fish and Ibaraki produce',
      facts: `- Open 17:00–23:00, last order 22:30. Closed on Sundays.
- 30 October 2026 is a Friday, so the evening is busy. Walk-ins are usually turned away; tables are booked by phone.
- À la carte izakaya dishes, fresh fish and seasonal plates; dinner is about ¥5,000–6,000 per person. No set course has to be chosen when booking.
- A small room — a party of 4 fits, but times fill up.
- For this rehearsal, assume nobody on duty speaks English.`,
      register: 'Friendly izakaya phone Japanese: です/ます with standard service phrases such as かしこまりました and 少々お待ちください — casual and warm rather than formal.',
      asks: 'date, time, party size, name (and the katakana spelling of a foreign name), contact number, allergies',
      complications: 'the 18:30 table is full but 19:00 or 19:30 is free, or you need a Japanese contact number',
    },
  },
});

export const DEFAULT_RESTAURANT = 'hiyama';

// ?r=pst → 'pst'. Anything unknown falls back to the default, and the header
// names the restaurant in large type, so a wrong profile is visible at a glance.
export function restaurantId(search = globalThis.location?.search ?? '') {
  const id = new URLSearchParams(search).get('r');
  return id && Object.hasOwn(RESTAURANTS, id) ? id : DEFAULT_RESTAURANT;
}

export const RESTAURANT = RESTAURANTS[restaurantId()];

// Romaji at the start of a sentence.
export function cap(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

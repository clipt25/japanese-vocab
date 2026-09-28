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

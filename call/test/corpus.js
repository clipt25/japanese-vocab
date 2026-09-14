// Measurement corpora. Kept separate from the tests so the harness and the
// regression test share exactly one source of truth.

// Plausible speech from a Ningyocho kappo taking an overseas booking, for which
// the library has NO correct entry. Every one of these SHOULD come back silent.
export const NEGATIVES = [
  // payment & billing
  'お飲み物は別料金でございます', 'お支払いは現金でしょうか', '領収書は必要でしょうか',
  '領収書の宛名はいかがなさいますか', 'カードは使えません', '現金のみとなっております',
  'お会計は税込みでございます', '前金を頂戴しております', 'デポジットが必要でございます',
  'お一人様一万五千円からでございます', 'コースは一万五千円からでございます',
  '飲み放題は別途三千円でございます', 'お通し代を頂戴しております',
  // access & directions
  '最寄り駅は人形町でございます', '駐車場はございません', 'A3出口を出て右でございます',
  'お車でお越しでしょうか', 'エレベーターは奥にございます', 'お席は2階でございます',
  '一階が精肉店になっております', '地下鉄の日比谷線が便利でございます',
  'タクシーですと東京駅から十分ほどでございます',
  // policies
  'お履物はお脱ぎいただきます', 'ペットの同伴はご遠慮いただいております',
  '写真撮影はご遠慮ください', '未成年の方はいらっしゃいますか',
  'お持ち込みはご遠慮いただいております', '服装の決まりは特にございません',
  'ご予約は一ヶ月前から承っております', '前日までにご連絡ください',
  '三日前からキャンセル料がかかります', 'お席の移動はできかねます',
  // food & menu
  '和牛のすき焼きでございます', '米沢牛を使用しております', 'しゃぶしゃぶもございます',
  '苦手な食材はございますか', 'お肉の量は調整できます', 'ベジタリアンの対応は難しいです',
  '生卵はお付けしております', 'コースにデザートが付きます', '追加のお肉も承ります',
  'ランチは十一時半からでございます', '土日はランチもやっております',
  // scheduling
  'ご予約の変更でしょうか', 'キャンセルのお電話でしょうか', '何かご要望はございますか',
  'ご利用は初めてでしょうか', '誕生日のお祝いでしょうか', 'ご接待でしょうか',
  '記念日でいらっしゃいますか', 'お待ち合わせでしょうか', '人数の変更は可能でございます',
  '二部制となっております', '夜の部は五時からでございます',
  'ラストオーダーは八時半でございます', '閉店は九時半でございます',
  // phone handling
  '只今電話が混み合っております', '担当者に代わります', 'ただいま担当者が不在でございます',
  '番号をお間違えではないでしょうか', 'もう一度お名前をよろしいでしょうか',
  'お電話ありがとうございます', 'こちらこそありがとうございます',
  '恐れ入りますがお待ちいただけますか', '予約係におつなぎいたします',
  'ご用件を承ります', 'お調べいたしますので少々',
  // facilities & service
  'お荷物はお預かりいたします', 'コートをお預かりいたします', '個室は三階にございます',
  'お手洗いは同じ階にございます', 'バリアフリーの対応もございます',
  '喫煙所は外にございます', 'Wi-Fiはご利用いただけます',
  'お子様用の椅子もご用意できます', '座椅子もご用意しております',
  // negative / refusal variants NOT phrased with 満席
  'あいにくそのお時間はご用意できかねます', 'その日は既に埋まっております',
  'ご希望に添えず申し訳ございません', '難しいかと存じます',
  'その時間帯は承っておりません', 'お受けできかねます',
  '別のお日にちでしたらご案内できます', '空きが出ましたらご連絡いたします',
  'キャンセル待ちも承っております',
  // misc / conversational
  '今日はいい天気ですね', 'どちらからお越しですか', '日本は初めてでいらっしゃいますか',
  'ご旅行でいらっしゃいますか', '寒くなってまいりましたね', 'お気をつけてお越しください',
  '道に迷われましたらお電話ください', '何かご不明な点はございますか',
  'よろしければご案内いたします', '失礼いたします', 'お世話になっております',
  '申し遅れました', 'かしこまりましてございます', '以上でよろしいでしょうか',
  'ご確認いただけましたでしょうか', 'そちらで間違いございませんか',
];

// How Chrome actually mangles Japanese on speakerphone: drops trailing
// syllables, returns kana instead of kanji, inserts fillers, loses characters.
export function corrupt(phrase) {
  const k = phrase.kanji.replace(/[、。]/g, '');
  const kana = phrase.kana.replace(/[、。]/g, '');
  return [
    { label: 'clean-kanji', text: k },
    { label: 'kana-only', text: kana },
    { label: 'truncated-20%', text: k.slice(0, Math.max(2, Math.ceil(k.length * 0.8))) },
    { label: 'truncated-35%', text: k.slice(0, Math.max(2, Math.ceil(k.length * 0.65))) },
    { label: 'kana-truncated', text: kana.slice(0, Math.max(2, Math.ceil(kana.length * 0.75))) },
    { label: 'filler-prefix', text: `えーと、${k}` },
    { label: 'filler-both', text: `あの、${k}、はい` },
    { label: 'drop-every-7th', text: [...k].filter((_, i) => i % 7 !== 3).join('') },
    { label: 'kana-drop-every-6th', text: [...kana].filter((_, i) => i % 6 !== 2).join('') },
  ];
}

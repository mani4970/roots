/**
 * 성경 66권 이름 — 4개 언어 매핑
 * DB에는 한국어(KO)로 저장, 화면에 표시할 때 사용자 언어로 변환
 *
 * 새 언어 추가 시: 이 파일의 BOOK_NAMES에 새 배열만 추가하면 됨
 */

import type { Lang } from "./i18n";

// 언어 코드 → 성경 번역 언어 코드 매핑
const LANG_TO_BIBLE: Record<Lang, string> = {
  ko: "KO",
  de: "DE",
  en: "EN",
  fr: "FR",
};

export const BOOK_NAMES: Record<string, string[]> = {
  KO: ["창세기","출애굽기","레위기","민수기","신명기","여호수아","사사기","룻기","사무엘상","사무엘하","열왕기상","열왕기하","역대상","역대하","에스라","느헤미야","에스더","욥기","시편","잠언","전도서","아가","이사야","예레미야","예레미야애가","에스겔","다니엘","호세아","요엘","아모스","오바댜","요나","미가","나훔","하박국","스바냐","학개","스가랴","말라기","마태복음","마가복음","누가복음","요한복음","사도행전","로마서","고린도전서","고린도후서","갈라디아서","에베소서","빌립보서","골로새서","데살로니가전서","데살로니가후서","디모데전서","디모데후서","디도서","빌레몬서","히브리서","야고보서","베드로전서","베드로후서","요한일서","요한이서","요한삼서","유다서","요한계시록"],
  EN: ["Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth","1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi","Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"],
  DE: ["1. Mose","2. Mose","3. Mose","4. Mose","5. Mose","Josua","Richter","Rut","1. Samuel","2. Samuel","1. Könige","2. Könige","1. Chronik","2. Chronik","Esra","Nehemia","Ester","Hiob","Psalmen","Sprüche","Prediger","Hoheslied","Jesaja","Jeremia","Klagelieder","Hesekiel","Daniel","Hosea","Joel","Amos","Obadja","Jona","Micha","Nahum","Habakuk","Zefanja","Haggai","Sacharja","Maleachi","Matthäus","Markus","Lukas","Johannes","Apostelgeschichte","Römer","1. Korinther","2. Korinther","Galater","Epheser","Philipper","Kolosser","1. Thessalonicher","2. Thessalonicher","1. Timotheus","2. Timotheus","Titus","Philemon","Hebräer","Jakobus","1. Petrus","2. Petrus","1. Johannes","2. Johannes","3. Johannes","Judas","Offenbarung"],
  FR: ["Genèse","Exode","Lévitique","Nombres","Deutéronome","Josué","Juges","Ruth","1 Samuel","2 Samuel","1 Rois","2 Rois","1 Chroniques","2 Chroniques","Esdras","Néhémie","Esther","Job","Psaumes","Proverbes","Ecclésiaste","Cantique","Ésaïe","Jérémie","Lamentations","Ézéchiel","Daniel","Osée","Joël","Amos","Abdias","Jonas","Michée","Nahum","Habacuc","Sophonie","Aggée","Zacharie","Malachie","Matthieu","Marc","Luc","Jean","Actes","Romains","1 Corinthiens","2 Corinthiens","Galates","Éphésiens","Philippiens","Colossiens","1 Thessaloniciens","2 Thessaloniciens","1 Timothée","2 Timothée","Tite","Philémon","Hébreux","Jacques","1 Pierre","2 Pierre","1 Jean","2 Jean","3 Jean","Jude","Apocalypse"],
};

/**
 * 한국어 성경 책 이름을 사용자 언어로 변환
 *
 * @example
 *   translateBookName("누가복음", "de")  → "Lukas"
 *   translateBookName("창세기", "en")    → "Genesis"
 *   translateBookName("창세기", "ko")    → "창세기" (그대로)
 *
 * DB의 bible_ref "누가복음 10:1-24" 같은 전체 참조도 변환 가능:
 *   translateBibleRef("누가복음 10:1-24", "de")  → "Lukas 10:1-24"
 */
export function translateBookName(koName: string, lang: Lang): string {
  const bibleLang = LANG_TO_BIBLE[lang] ?? "KO";
  const koBooks = BOOK_NAMES["KO"];
  const targetBooks = BOOK_NAMES[bibleLang];
  if (!targetBooks) return koName;

  const idx = koBooks.indexOf(koName);
  if (idx >= 0) return targetBooks[idx];

  // 약어 매칭 시도 (예: "눅" → "누가복음" → idx)
  return koName;
}

/**
 * DB에 저장된 bible_ref 전체를 사용자 언어로 변환
 * "누가복음 10:1-24" → "Lukas 10:1-24"
 * "창 1:1-10" (약어) → 그대로 (약어는 변환 안 함)
 */
export function translateBibleRef(ref: string, lang: Lang): string {
  if (!ref) return ref;

  const targetLangCode = LANG_TO_BIBLE[lang] ?? "KO";
  const targetBooks = BOOK_NAMES[targetLangCode];
  if (!targetBooks) return ref;

  // 모든 언어의 책 이름에서 매칭 시도 (가장 긴 이름부터)
  for (const [langCode, books] of Object.entries(BOOK_NAMES)) {
    const sorted = [...books].sort((a, b) => b.length - a.length);
    for (const bookName of sorted) {
      if (ref.startsWith(bookName)) {
        const idx = books.indexOf(bookName);
        if (langCode === targetLangCode) return ref; // 이미 대상 언어
        return targetBooks[idx] + ref.slice(bookName.length);
      }
    }
  }

  return ref; // 매칭 안 되면 원본 반환
}

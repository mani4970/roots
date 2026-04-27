import type { Lang } from "@/lib/i18n";

export type EmotionVerseRef = {
  id: string;
  emotionKey: string;
  book: string; // Korean canonical book name for the Bible API.
  startChapter: number;
  startVerse: number;
  endChapter: number;
  endVerse: number;
};

function ref(
  emotionKey: string,
  index: number,
  book: string,
  startChapter: number,
  startVerse: number,
  endChapter: number,
  endVerse: number,
): EmotionVerseRef {
  return {
    id: `${emotionKey}_${String(index).padStart(3, "0")}`,
    emotionKey,
    book,
    startChapter,
    startVerse,
    endChapter,
    endVerse,
  };
}

export const EMOTION_VERSE_REFS = {
  grateful: [
    ref("grateful", 1, "시편", 107, 1, 107, 1),
    ref("grateful", 2, "데살로니가전서", 5, 18, 5, 18),
    ref("grateful", 3, "골로새서", 3, 15, 3, 17),
    ref("grateful", 4, "시편", 103, 1, 103, 5),
    ref("grateful", 5, "시편", 136, 1, 136, 1),
    ref("grateful", 6, "빌립보서", 4, 6, 4, 6),
    ref("grateful", 7, "야고보서", 1, 17, 1, 17),
    ref("grateful", 8, "시편", 100, 4, 100, 5),
    ref("grateful", 9, "에베소서", 5, 20, 5, 20),
    ref("grateful", 10, "역대상", 16, 34, 16, 34),
  ],
  joyful: [
    ref("joyful", 1, "빌립보서", 4, 4, 4, 4),
    ref("joyful", 2, "시편", 16, 11, 16, 11),
    ref("joyful", 3, "느헤미야", 8, 10, 8, 10),
    ref("joyful", 4, "로마서", 15, 13, 15, 13),
    ref("joyful", 5, "시편", 118, 24, 118, 24),
    ref("joyful", 6, "하박국", 3, 17, 3, 18),
    ref("joyful", 7, "요한복음", 15, 11, 15, 11),
    ref("joyful", 8, "데살로니가전서", 5, 16, 5, 16),
    ref("joyful", 9, "시편", 30, 11, 30, 12),
    ref("joyful", 10, "이사야", 61, 10, 61, 10),
  ],
  peaceful: [
    ref("peaceful", 1, "요한복음", 14, 27, 14, 27),
    ref("peaceful", 2, "빌립보서", 4, 7, 4, 7),
    ref("peaceful", 3, "이사야", 26, 3, 26, 3),
    ref("peaceful", 4, "골로새서", 3, 15, 3, 15),
    ref("peaceful", 5, "시편", 4, 8, 4, 8),
    ref("peaceful", 6, "민수기", 6, 24, 6, 26),
    ref("peaceful", 7, "로마서", 5, 1, 5, 1),
    ref("peaceful", 8, "데살로니가후서", 3, 16, 3, 16),
    ref("peaceful", 9, "시편", 29, 11, 29, 11),
    ref("peaceful", 10, "이사야", 32, 17, 32, 17),
  ],
  excited: [
    ref("excited", 1, "예레미야", 29, 11, 29, 11),
    ref("excited", 2, "이사야", 43, 19, 43, 19),
    ref("excited", 3, "에베소서", 3, 20, 3, 20),
    ref("excited", 4, "잠언", 16, 9, 16, 9),
    ref("excited", 5, "시편", 37, 5, 37, 5),
    ref("excited", 6, "로마서", 8, 28, 8, 28),
    ref("excited", 7, "빌립보서", 1, 6, 1, 6),
    ref("excited", 8, "고린도전서", 2, 9, 2, 9),
    ref("excited", 9, "시편", 31, 24, 31, 24),
    ref("excited", 10, "이사야", 40, 31, 40, 31),
  ],
  full: [
    ref("full", 1, "요한복음", 10, 10, 10, 10),
    ref("full", 2, "에베소서", 3, 19, 3, 19),
    ref("full", 3, "골로새서", 2, 10, 2, 10),
    ref("full", 4, "시편", 23, 1, 23, 3),
    ref("full", 5, "요한복음", 15, 5, 15, 5),
    ref("full", 6, "시편", 34, 8, 34, 10),
    ref("full", 7, "빌립보서", 4, 19, 4, 19),
    ref("full", 8, "요한복음", 7, 37, 7, 38),
    ref("full", 9, "에베소서", 5, 18, 5, 18),
    ref("full", 10, "골로새서", 3, 16, 3, 16),
  ],
  grace: [
    ref("grace", 1, "에베소서", 2, 8, 2, 9),
    ref("grace", 2, "고린도후서", 12, 9, 12, 9),
    ref("grace", 3, "로마서", 5, 8, 5, 8),
    ref("grace", 4, "히브리서", 4, 16, 4, 16),
    ref("grace", 5, "요한복음", 1, 16, 1, 16),
    ref("grace", 6, "디도서", 2, 11, 2, 11),
    ref("grace", 7, "로마서", 3, 23, 3, 24),
    ref("grace", 8, "시편", 103, 8, 103, 8),
    ref("grace", 9, "예레미야애가", 3, 22, 3, 23),
    ref("grace", 10, "베드로전서", 5, 10, 5, 10),
  ],
  hungry: [
    ref("hungry", 1, "마태복음", 4, 4, 4, 4),
    ref("hungry", 2, "시편", 119, 105, 119, 105),
    ref("hungry", 3, "시편", 1, 2, 1, 3),
    ref("hungry", 4, "여호수아", 1, 8, 1, 8),
    ref("hungry", 5, "예레미야", 15, 16, 15, 16),
    ref("hungry", 6, "시편", 119, 97, 119, 97),
    ref("hungry", 7, "골로새서", 3, 16, 3, 16),
    ref("hungry", 8, "디모데후서", 3, 16, 3, 17),
    ref("hungry", 9, "히브리서", 4, 12, 4, 12),
    ref("hungry", 10, "베드로전서", 2, 2, 2, 2),
  ],
  mission: [
    ref("mission", 1, "마태복음", 28, 19, 28, 20),
    ref("mission", 2, "사도행전", 1, 8, 1, 8),
    ref("mission", 3, "이사야", 6, 8, 6, 8),
    ref("mission", 4, "에베소서", 2, 10, 2, 10),
    ref("mission", 5, "고린도전서", 15, 58, 15, 58),
    ref("mission", 6, "마태복음", 5, 14, 5, 16),
    ref("mission", 7, "디모데후서", 4, 2, 4, 2),
    ref("mission", 8, "골로새서", 3, 23, 3, 24),
    ref("mission", 9, "베드로전서", 4, 10, 4, 10),
    ref("mission", 10, "요한복음", 20, 21, 20, 21),
  ],
  repent: [
    ref("repent", 1, "요한일서", 1, 9, 1, 9),
    ref("repent", 2, "시편", 51, 10, 51, 10),
    ref("repent", 3, "사도행전", 3, 19, 3, 19),
    ref("repent", 4, "이사야", 55, 6, 55, 7),
    ref("repent", 5, "잠언", 28, 13, 28, 13),
    ref("repent", 6, "시편", 32, 5, 32, 5),
    ref("repent", 7, "누가복음", 15, 20, 15, 24),
    ref("repent", 8, "고린도후서", 7, 10, 7, 10),
    ref("repent", 9, "에스겔", 36, 26, 36, 26),
    ref("repent", 10, "요엘", 2, 13, 2, 13),
  ],
  renew: [
    ref("renew", 1, "고린도후서", 5, 17, 5, 17),
    ref("renew", 2, "로마서", 12, 2, 12, 2),
    ref("renew", 3, "이사야", 43, 18, 43, 19),
    ref("renew", 4, "에스겔", 36, 26, 36, 26),
    ref("renew", 5, "에베소서", 4, 22, 4, 24),
    ref("renew", 6, "골로새서", 3, 10, 3, 10),
    ref("renew", 7, "시편", 51, 10, 51, 10),
    ref("renew", 8, "디도서", 3, 5, 3, 5),
    ref("renew", 9, "예레미야애가", 3, 22, 3, 23),
    ref("renew", 10, "요한계시록", 21, 5, 21, 5),
  ],
  tired: [
    ref("tired", 1, "마태복음", 11, 28, 11, 30),
    ref("tired", 2, "이사야", 40, 29, 40, 31),
    ref("tired", 3, "시편", 23, 1, 23, 3),
    ref("tired", 4, "갈라디아서", 6, 9, 6, 9),
    ref("tired", 5, "시편", 46, 1, 46, 1),
    ref("tired", 6, "고린도후서", 4, 16, 4, 16),
    ref("tired", 7, "시편", 62, 1, 62, 2),
    ref("tired", 8, "히브리서", 12, 1, 12, 2),
    ref("tired", 9, "예레미야", 31, 25, 31, 25),
    ref("tired", 10, "출애굽기", 33, 14, 33, 14),
  ],
  exhausted: [
    ref("exhausted", 1, "시편", 61, 2, 61, 2),
    ref("exhausted", 2, "고린도후서", 12, 9, 12, 9),
    ref("exhausted", 3, "이사야", 41, 10, 41, 10),
    ref("exhausted", 4, "시편", 18, 1, 18, 2),
    ref("exhausted", 5, "시편", 73, 26, 73, 26),
    ref("exhausted", 6, "이사야", 40, 31, 40, 31),
    ref("exhausted", 7, "마태복음", 11, 28, 11, 28),
    ref("exhausted", 8, "빌립보서", 4, 13, 4, 13),
    ref("exhausted", 9, "시편", 55, 22, 55, 22),
    ref("exhausted", 10, "신명기", 33, 27, 33, 27),
  ],
  lonely: [
    ref("lonely", 1, "이사야", 41, 10, 41, 10),
    ref("lonely", 2, "시편", 27, 10, 27, 10),
    ref("lonely", 3, "마태복음", 28, 20, 28, 20),
    ref("lonely", 4, "히브리서", 13, 5, 13, 5),
    ref("lonely", 5, "시편", 139, 7, 139, 10),
    ref("lonely", 6, "요한복음", 14, 18, 14, 18),
    ref("lonely", 7, "시편", 68, 5, 68, 6),
    ref("lonely", 8, "로마서", 8, 38, 8, 39),
    ref("lonely", 9, "시편", 34, 18, 34, 18),
    ref("lonely", 10, "신명기", 31, 8, 31, 8),
  ],
  sad: [
    ref("sad", 1, "시편", 34, 18, 34, 18),
    ref("sad", 2, "마태복음", 5, 4, 5, 4),
    ref("sad", 3, "요한계시록", 21, 4, 21, 4),
    ref("sad", 4, "시편", 30, 5, 30, 5),
    ref("sad", 5, "시편", 42, 11, 42, 11),
    ref("sad", 6, "고린도후서", 1, 3, 1, 4),
    ref("sad", 7, "이사야", 61, 1, 61, 3),
    ref("sad", 8, "시편", 147, 3, 147, 3),
    ref("sad", 9, "요한복음", 16, 22, 16, 22),
    ref("sad", 10, "예레미야애가", 3, 31, 3, 33),
  ],
  anxious: [
    ref("anxious", 1, "빌립보서", 4, 6, 4, 7),
    ref("anxious", 2, "마태복음", 6, 25, 6, 34),
    ref("anxious", 3, "베드로전서", 5, 7, 5, 7),
    ref("anxious", 4, "요한복음", 14, 27, 14, 27),
    ref("anxious", 5, "이사야", 41, 10, 41, 10),
    ref("anxious", 6, "시편", 56, 3, 56, 4),
    ref("anxious", 7, "잠언", 3, 5, 3, 6),
    ref("anxious", 8, "시편", 94, 19, 94, 19),
    ref("anxious", 9, "디모데후서", 1, 7, 1, 7),
    ref("anxious", 10, "이사야", 26, 3, 26, 3),
  ],
  doubt: [
    ref("doubt", 1, "마가복음", 9, 24, 9, 24),
    ref("doubt", 2, "야고보서", 1, 5, 1, 6),
    ref("doubt", 3, "요한복음", 20, 27, 20, 29),
    ref("doubt", 4, "히브리서", 11, 1, 11, 1),
    ref("doubt", 5, "로마서", 10, 17, 10, 17),
    ref("doubt", 6, "잠언", 3, 5, 3, 6),
    ref("doubt", 7, "시편", 73, 23, 73, 26),
    ref("doubt", 8, "이사야", 55, 8, 55, 9),
    ref("doubt", 9, "마태복음", 14, 30, 14, 31),
    ref("doubt", 10, "유다서", 1, 22, 1, 22),
  ],
  dry: [
    ref("dry", 1, "시편", 42, 1, 42, 2),
    ref("dry", 2, "이사야", 44, 3, 44, 3),
    ref("dry", 3, "요한복음", 7, 37, 7, 38),
    ref("dry", 4, "시편", 63, 1, 63, 1),
    ref("dry", 5, "이사야", 55, 1, 55, 1),
    ref("dry", 6, "에스겔", 37, 5, 37, 6),
    ref("dry", 7, "요엘", 2, 28, 2, 28),
    ref("dry", 8, "시편", 143, 6, 143, 6),
    ref("dry", 9, "요한복음", 4, 13, 4, 14),
    ref("dry", 10, "호세아", 6, 3, 6, 3),
  ],
  angry: [
    ref("angry", 1, "야고보서", 1, 19, 1, 20),
    ref("angry", 2, "에베소서", 4, 26, 4, 27),
    ref("angry", 3, "잠언", 15, 1, 15, 1),
    ref("angry", 4, "잠언", 16, 32, 16, 32),
    ref("angry", 5, "로마서", 12, 19, 12, 19),
    ref("angry", 6, "골로새서", 3, 8, 3, 8),
    ref("angry", 7, "시편", 37, 8, 37, 8),
    ref("angry", 8, "마태복음", 5, 9, 5, 9),
    ref("angry", 9, "잠언", 19, 11, 19, 11),
    ref("angry", 10, "에베소서", 4, 31, 4, 32),
  ],
  far: [
    ref("far", 1, "야고보서", 4, 8, 4, 8),
    ref("far", 2, "시편", 145, 18, 145, 18),
    ref("far", 3, "예레미야", 29, 13, 29, 13),
    ref("far", 4, "이사야", 55, 6, 55, 6),
    ref("far", 5, "누가복음", 15, 20, 15, 20),
    ref("far", 6, "시편", 139, 7, 139, 10),
    ref("far", 7, "로마서", 8, 38, 8, 39),
    ref("far", 8, "히브리서", 10, 22, 10, 22),
    ref("far", 9, "신명기", 4, 29, 4, 29),
    ref("far", 10, "요한복음", 15, 4, 15, 4),
  ],
  family: [
    ref("family", 1, "여호수아", 24, 15, 24, 15),
    ref("family", 2, "시편", 127, 1, 127, 1),
    ref("family", 3, "에베소서", 6, 1, 6, 4),
    ref("family", 4, "골로새서", 3, 13, 3, 14),
    ref("family", 5, "잠언", 22, 6, 22, 6),
    ref("family", 6, "디모데전서", 5, 8, 5, 8),
    ref("family", 7, "신명기", 6, 6, 6, 7),
    ref("family", 8, "시편", 128, 1, 128, 4),
    ref("family", 9, "고린도전서", 13, 4, 13, 7),
    ref("family", 10, "창세기", 2, 24, 2, 24),
  ],
  work: [
    ref("work", 1, "골로새서", 3, 23, 3, 24),
    ref("work", 2, "잠언", 16, 3, 16, 3),
    ref("work", 3, "잠언", 3, 5, 3, 6),
    ref("work", 4, "전도서", 9, 10, 9, 10),
    ref("work", 5, "야고보서", 1, 5, 1, 5),
    ref("work", 6, "빌립보서", 4, 13, 4, 13),
    ref("work", 7, "시편", 90, 17, 90, 17),
    ref("work", 8, "잠언", 22, 29, 22, 29),
    ref("work", 9, "마태복음", 6, 33, 6, 33),
    ref("work", 10, "고린도전서", 10, 31, 10, 31),
  ],
  relation: [
    ref("relation", 1, "로마서", 12, 18, 12, 18),
    ref("relation", 2, "에베소서", 4, 32, 4, 32),
    ref("relation", 3, "골로새서", 3, 13, 3, 13),
    ref("relation", 4, "마태복음", 7, 12, 7, 12),
    ref("relation", 5, "잠언", 17, 17, 17, 17),
    ref("relation", 6, "고린도전서", 13, 4, 13, 7),
    ref("relation", 7, "야고보서", 1, 19, 1, 19),
    ref("relation", 8, "마태복음", 18, 21, 18, 22),
    ref("relation", 9, "로마서", 12, 10, 12, 10),
    ref("relation", 10, "히브리서", 10, 24, 10, 25),
  ],
  health: [
    ref("health", 1, "예레미야", 30, 17, 30, 17),
    ref("health", 2, "이사야", 53, 5, 53, 5),
    ref("health", 3, "시편", 103, 2, 103, 3),
    ref("health", 4, "야고보서", 5, 14, 5, 15),
    ref("health", 5, "요한삼서", 1, 2, 1, 2),
    ref("health", 6, "잠언", 17, 22, 17, 22),
    ref("health", 7, "시편", 41, 3, 41, 3),
    ref("health", 8, "출애굽기", 15, 26, 15, 26),
    ref("health", 9, "마태복음", 11, 28, 11, 28),
    ref("health", 10, "고린도전서", 6, 19, 6, 20),
  ],
  future: [
    ref("future", 1, "예레미야", 29, 11, 29, 11),
    ref("future", 2, "잠언", 3, 5, 3, 6),
    ref("future", 3, "로마서", 8, 28, 8, 28),
    ref("future", 4, "마태복음", 6, 33, 6, 34),
    ref("future", 5, "시편", 37, 5, 37, 5),
    ref("future", 6, "이사야", 43, 19, 43, 19),
    ref("future", 7, "빌립보서", 1, 6, 1, 6),
    ref("future", 8, "잠언", 16, 9, 16, 9),
    ref("future", 9, "시편", 32, 8, 32, 8),
    ref("future", 10, "이사야", 41, 10, 41, 10),
  ],
} as const satisfies Record<string, EmotionVerseRef[]>;

export type EmotionKey = keyof typeof EMOTION_VERSE_REFS;

export const DEFAULT_EMOTION_KEY: EmotionKey = "tired";

export const LANG_DEFAULT_TRANSLATION: Record<Lang, number> = {
  ko: 92,
  de: 97,
  en: 80,
  fr: 26,
};

export function isEmotionKey(value: unknown): value is EmotionKey {
  return typeof value === "string" && value in EMOTION_VERSE_REFS;
}

export function getDefaultTranslationId(lang: Lang | string | undefined): number {
  if (lang === "de" || lang === "en" || lang === "fr" || lang === "ko") {
    return LANG_DEFAULT_TRANSLATION[lang];
  }
  return LANG_DEFAULT_TRANSLATION.ko;
}

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

export function formatKoReference(refItem: EmotionVerseRef): string {
  const sameStartEnd = refItem.startChapter === refItem.endChapter && refItem.startVerse === refItem.endVerse;
  const sameChapter = refItem.startChapter === refItem.endChapter;
  if (sameStartEnd) return `${refItem.book} ${refItem.startChapter}:${refItem.startVerse}`;
  if (sameChapter) return `${refItem.book} ${refItem.startChapter}:${refItem.startVerse}-${refItem.endVerse}`;
  return `${refItem.book} ${refItem.startChapter}:${refItem.startVerse}-${refItem.endChapter}:${refItem.endVerse}`;
}

export function pickEmotionVerseRef(options: {
  emotionKey?: string | null;
  userId?: string | null;
  date?: string | null;
  prevVerseRefId?: string | null;
  prevReference?: string | null;
}): EmotionVerseRef {
  const emotionKey: EmotionKey = isEmotionKey(options.emotionKey) ? options.emotionKey : DEFAULT_EMOTION_KEY;
  const list = [...EMOTION_VERSE_REFS[emotionKey]];
  const seed = `${options.userId ?? "guest"}:${options.date ?? new Date().toISOString().slice(0, 10)}:${emotionKey}`;
  let index = hashString(seed) % list.length;

  const prevReference = options.prevReference ?? "";
  const firstPick = list[index];
  if (
    list.length > 1 &&
    (firstPick.id === options.prevVerseRefId || formatKoReference(firstPick) === prevReference)
  ) {
    index = (index + 1) % list.length;
  }

  return list[index];
}

"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { ChevronLeft, Check, Loader2, Plus, Trash2, ChevronDown, BookOpen, X, ChevronUp } from "lucide-react";

const OT_BOOKS = ["창세기","출애굽기","레위기","민수기","신명기","여호수아","사사기","룻기","사무엘상","사무엘하","열왕기상","열왕기하","역대상","역대하","에스라","느헤미야","에스더","욥기","시편","잠언","전도서","아가","이사야","예레미야","예레미야애가","에스겔","다니엘","호세아","요엘","아모스","오바댜","요나","미가","나훔","하박국","스바냐","학개","스가랴","말라기"];
const NT_BOOKS = ["마태복음","마가복음","누가복음","요한복음","사도행전","로마서","고린도전서","고린도후서","갈라디아서","에베소서","빌립보서","골로새서","데살로니가전서","데살로니가후서","디모데전서","디모데후서","디도서","빌레몬서","히브리서","야고보서","베드로전서","베드로후서","요한일서","요한이서","요한삼서","유다서","요한계시록"];

// 번역본 목록 (하드코딩)
const TRANSLATIONS = [
  { group: "한국어", items: [
    { id: 92, name: "개역개정" },
    { id: 84, name: "개역한글" },
    { id: 98, name: "새번역" },
    { id: 88, name: "쉬운성경" },
    { id: 89, name: "우리말성경" },
    { id: 90, name: "바른성경" },
    { id: 83, name: "현대인의성경" },
    { id: 81, name: "공동번역" },
    { id: 99, name: "새한글" },
    { id: 87, name: "한글KJV" },
  ]},
  { group: "English", items: [
    { id: 67, name: "KJV" },
    { id: 80, name: "NIV" },
    { id: 100, name: "ESV" },
    { id: 62, name: "NASB" },
    { id: 82, name: "NLT" },
    { id: 95, name: "The Message" },
  ]},
  { group: "Deutsch", items: [
    { id: 29, name: "Luther" },
    { id: 27, name: "Elberfelder" },
    { id: 97, name: "Hoffnung für Alle" },
  ]},
  { group: "Français", items: [
    { id: 26, name: "Louis Segond" },
    { id: 24, name: "Jérusalem" },
  ]},
];

const ALL_TRANSLATIONS = TRANSLATIONS.flatMap(g => g.items);

// 번역본 ID → 언어 코드
const TRANSLATION_LANG: Record<number, string> = {
  92:"KO", 84:"KO", 98:"KO", 88:"KO", 89:"KO", 90:"KO", 83:"KO", 81:"KO", 99:"KO", 87:"KO",
  67:"EN", 80:"EN", 100:"EN", 62:"EN", 82:"EN", 95:"EN",
  29:"DE", 27:"DE", 97:"DE",
  26:"FR", 24:"FR",
};

// 언어별 책 이름 (구약 39권 + 신약 27권)
const BOOK_NAMES: Record<string, string[]> = {
  KO: ["창세기","출애굽기","레위기","민수기","신명기","여호수아","사사기","룻기","사무엘상","사무엘하","열왕기상","열왕기하","역대상","역대하","에스라","느헤미야","에스더","욥기","시편","잠언","전도서","아가","이사야","예레미야","예레미야애가","에스겔","다니엘","호세아","요엘","아모스","오바댜","요나","미가","나훔","하박국","스바냐","학개","스가랴","말라기","마태복음","마가복음","누가복음","요한복음","사도행전","로마서","고린도전서","고린도후서","갈라디아서","에베소서","빌립보서","골로새서","데살로니가전서","데살로니가후서","디모데전서","디모데후서","디도서","빌레몬서","히브리서","야고보서","베드로전서","베드로후서","요한일서","요한이서","요한삼서","유다서","요한계시록"],
  EN: ["Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth","1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi","Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"],
  DE: ["1. Mose","2. Mose","3. Mose","4. Mose","5. Mose","Josua","Richter","Rut","1. Samuel","2. Samuel","1. Könige","2. Könige","1. Chronik","2. Chronik","Esra","Nehemia","Ester","Hiob","Psalmen","Sprüche","Prediger","Hoheslied","Jesaja","Jeremia","Klagelieder","Hesekiel","Daniel","Hosea","Joel","Amos","Obadja","Jona","Micha","Nahum","Habakuk","Zefanja","Haggai","Sacharja","Maleachi","Matthäus","Markus","Lukas","Johannes","Apostelgeschichte","Römer","1. Korinther","2. Korinther","Galater","Epheser","Philipper","Kolosser","1. Thessalonicher","2. Thessalonicher","1. Timotheus","2. Timotheus","Titus","Philemon","Hebräer","Jakobus","1. Petrus","2. Petrus","1. Johannes","2. Johannes","3. Johannes","Judas","Offenbarung"],
  FR: ["Genèse","Exode","Lévitique","Nombres","Deutéronome","Josué","Juges","Ruth","1 Samuel","2 Samuel","1 Rois","2 Rois","1 Chroniques","2 Chroniques","Esdras","Néhémie","Esther","Job","Psaumes","Proverbes","Ecclésiaste","Cantique","Ésaïe","Jérémie","Lamentations","Ézéchiel","Daniel","Osée","Joël","Amos","Abdias","Jonas","Michée","Nahum","Habacuc","Sophonie","Aggée","Zacharie","Malachie","Matthieu","Marc","Luc","Jean","Actes","Romains","1 Corinthiens","2 Corinthiens","Galates","Éphésiens","Philippiens","Colossiens","1 Thessaloniciens","2 Thessaloniciens","1 Timothée","2 Timothée","Tite","Philémon","Hébreux","Jacques","1 Pierre","2 Pierre","1 Jean","2 Jean","3 Jean","Jude","Apocalypse"],
};

function isSunday(dateStr: string) {
  return new Date(dateStr + "T12:00:00").getDay() === 0;
}
// 성경 66권 장별 최대 절수 데이터
const BIBLE_CHAPTERS: Record<string, number[]> = {"창세기": [31, 25, 24, 26, 32, 22, 24, 22, 29, 32, 32, 20, 18, 24, 21, 16, 27, 33, 38, 18, 34, 23, 20, 67, 34, 35, 46, 22, 35, 43, 55, 32, 20, 31, 29, 43, 36, 30, 23, 23, 57, 38, 34, 34, 28, 34, 31, 22, 33, 26], "출애굽기": [22, 25, 22, 31, 23, 30, 25, 32, 35, 29, 10, 51, 22, 31, 27, 36, 16, 27, 25, 26, 36, 31, 33, 18, 40, 37, 21, 43, 46, 38, 18, 35, 23, 35, 35, 38, 29, 31, 43, 38], "레위기": [17, 16, 17, 35, 19, 30, 38, 36, 24, 20, 47, 8, 59, 57, 33, 34, 16, 30, 24, 16, 30, 24, 20, 28, 27, 30, 20], "민수기": [54, 34, 51, 49, 31, 27, 89, 26, 23, 36, 35, 16, 33, 45, 41, 50, 13, 32, 22, 29, 35, 41, 30, 25, 18, 65, 23, 31, 40, 16, 54, 42, 56, 29, 34, 13], "신명기": [46, 37, 29, 49, 33, 25, 26, 20, 29, 22, 32, 32, 18, 29, 23, 22, 20, 22, 21, 20, 23, 30, 25, 22, 19, 19, 26, 68, 29, 20, 30, 52, 29, 12], "여호수아": [18, 24, 17, 24, 15, 27, 26, 35, 27, 43, 23, 24, 33, 15, 63, 10, 18, 28, 51, 9, 45, 34, 16, 33], "사사기": [36, 23, 31, 24, 31, 40, 25, 35, 57, 18, 40, 15, 25, 20, 20, 31, 13, 31, 30, 48, 25], "룻기": [22, 23, 18, 22], "사무엘상": [28, 36, 21, 22, 12, 21, 17, 22, 27, 27, 15, 25, 23, 52, 35, 23, 58, 30, 24, 42, 15, 23, 29, 22, 44, 25, 12, 25, 11, 31, 13], "사무엘하": [27, 32, 39, 12, 25, 23, 29, 18, 13, 19, 27, 31, 39, 33, 37, 23, 29, 33, 43, 26, 22, 51, 39, 25], "열왕기상": [53, 46, 28, 34, 18, 38, 51, 66, 28, 29, 43, 33, 34, 31, 34, 34, 24, 46, 21, 43, 29, 53], "열왕기하": [18, 25, 27, 44, 27, 33, 20, 29, 37, 36, 21, 21, 25, 29, 38, 20, 41, 37, 37, 21, 26, 20, 37, 20, 30], "역대상": [54, 55, 24, 43, 26, 81, 40, 40, 44, 14, 47, 40, 14, 17, 29, 43, 27, 17, 19, 8, 30, 19, 32, 31, 31, 32, 34, 21, 30], "역대하": [17, 18, 17, 22, 14, 42, 22, 18, 31, 19, 23, 16, 22, 15, 19, 14, 19, 34, 11, 37, 20, 12, 21, 27, 28, 23, 9, 27, 36, 27, 21, 33, 25, 33, 27, 23], "에스라": [11, 70, 13, 24, 17, 22, 28, 36, 15, 44], "느헤미야": [11, 20, 32, 23, 19, 19, 73, 18, 38, 39, 36, 47, 31], "에스더": [22, 23, 15, 17, 14, 14, 10, 17, 32, 3], "욥기": [22, 13, 26, 21, 27, 30, 21, 22, 35, 22, 20, 25, 28, 22, 35, 22, 16, 21, 29, 29, 34, 30, 17, 25, 6, 14, 23, 28, 25, 31, 40, 22, 33, 37, 16, 33, 24, 41, 30, 24, 34, 17], "시편": [6, 12, 8, 8, 12, 10, 17, 9, 20, 18, 7, 8, 6, 7, 5, 11, 15, 50, 14, 9, 13, 31, 6, 10, 22, 12, 14, 9, 11, 12, 24, 11, 22, 22, 28, 12, 40, 22, 13, 17, 13, 11, 5, 20, 28, 22, 35, 45, 48, 43, 12, 31, 7, 10, 10, 9, 8, 18, 19, 2, 29, 176, 7, 8, 9, 4, 8, 5, 6, 5, 6, 8, 8, 3, 18, 3, 3, 21, 26, 9, 8, 24, 13, 10, 7, 12, 15, 21, 10, 20, 14, 9, 6, 8, 10, 5, 7, 7, 8, 4, 2, 3, 8, 4, 8, 5, 8, 7, 4, 9, 2, 14, 14, 14, 9, 7, 6, 3, 9, 1, 7, 3, 4, 8, 3, 9, 4, 7, 6, 8, 4, 6, 8, 7, 8, 7, 5, 5, 9, 9, 16, 9, 6, 7, 7, 5, 3, 7, 6, 6], "잠언": [33, 22, 35, 27, 23, 35, 27, 36, 18, 32, 31, 28, 25, 35, 33, 33, 28, 24, 29, 30, 31, 29, 35, 34, 28, 28, 27, 28, 27, 33, 31], "전도서": [18, 26, 22, 16, 20, 12, 29, 17, 18, 20, 10, 14], "아가": [17, 17, 11, 16, 16, 13, 13, 14], "이사야": [31, 22, 26, 6, 30, 13, 25, 22, 21, 34, 16, 6, 22, 32, 9, 14, 14, 7, 25, 6, 17, 25, 18, 23, 12, 21, 13, 29, 24, 33, 9, 20, 24, 17, 10, 22, 38, 22, 8, 31, 29, 25, 28, 28, 25, 13, 15, 22, 26, 11, 23, 15, 12, 17, 13, 12, 21, 14, 21, 22, 11, 12, 19, 12, 25, 24], "예레미야": [19, 37, 25, 31, 31, 30, 34, 22, 26, 25, 23, 17, 27, 22, 21, 21, 27, 23, 15, 18, 14, 30, 40, 10, 38, 24, 22, 17, 32, 24, 40, 44, 26, 22, 19, 32, 21, 28, 18, 16, 18, 22, 13, 30, 5, 28, 7, 47, 39, 46, 64, 34], "예레미야애가": [22, 22, 66, 22, 22], "에스겔": [28, 10, 27, 17, 17, 14, 27, 18, 11, 22, 25, 28, 23, 23, 8, 63, 24, 32, 14, 49, 32, 31, 49, 27, 17, 21, 36, 26, 21, 26, 18, 32, 33, 31, 15, 38, 28, 23, 29, 49, 26, 20, 27, 31, 25, 24, 23, 35], "다니엘": [21, 49, 30, 37, 31, 28, 28, 27, 27, 21, 45, 13], "호세아": [11, 23, 5, 19, 15, 11, 16, 14, 17, 15, 12, 14, 16, 9], "요엘": [20, 32, 21], "아모스": [15, 16, 15, 13, 27, 14, 17, 14, 15], "오바댜": [21], "요나": [17, 10, 10, 11], "미가": [16, 13, 12, 13, 15, 16, 20], "나훔": [15, 13, 19], "하박국": [17, 20, 19], "스바냐": [18, 15, 20], "학개": [15, 23], "스가랴": [21, 13, 10, 14, 11, 15, 14, 23, 17, 12, 17, 14, 9, 21], "말라기": [14, 17, 18, 6], "마태복음": [25, 23, 17, 25, 48, 34, 29, 34, 38, 42, 30, 50, 58, 36, 39, 28, 27, 35, 30, 34, 46, 46, 39, 51, 46, 75, 66, 20], "마가복음": [45, 28, 35, 41, 43, 56, 37, 38, 50, 52, 33, 44, 37, 72, 47, 20], "누가복음": [80, 52, 38, 44, 39, 49, 50, 56, 62, 42, 54, 59, 35, 35, 32, 31, 37, 43, 48, 47, 38, 71, 56, 53], "요한복음": [51, 25, 36, 54, 47, 71, 53, 59, 41, 42, 57, 50, 38, 31, 27, 33, 26, 40, 42, 31, 25], "사도행전": [26, 47, 26, 37, 42, 15, 60, 40, 43, 48, 30, 25, 52, 28, 41, 40, 34, 28, 41, 38, 40, 30, 35, 27, 27, 32, 44, 31], "로마서": [32, 29, 31, 25, 21, 23, 25, 39, 33, 21, 36, 21, 14, 23, 33, 27], "고린도전서": [31, 16, 23, 21, 13, 20, 40, 34, 29, 22, 36, 30, 29, 33, 8], "고린도후서": [24, 17, 18, 18, 21, 18, 16, 24, 15, 18, 33, 21, 13], "갈라디아서": [24, 21, 29, 31, 26, 18], "에베소서": [23, 22, 21, 28, 30, 14], "빌립보서": [30, 30, 21, 23], "골로새서": [29, 23, 25, 18], "데살로니가전서": [10, 20, 13, 18, 28], "데살로니가후서": [12, 17, 18], "디모데전서": [20, 15, 16, 16, 25, 21], "디모데후서": [18, 26, 17, 22], "디도서": [16, 15, 15], "빌레몬서": [25], "히브리서": [14, 18, 19, 16, 14, 20, 28, 13, 28, 39, 40, 29, 25], "야고보서": [27, 26, 18, 17, 20], "베드로전서": [25, 25, 22, 19, 14], "베드로후서": [21, 22, 18], "요한일서": [10, 29, 24, 21, 21], "요한이서": [13], "요한삼서": [14], "유다서": [25], "요한계시록": [20, 29, 22, 11, 14, 17, 17, 13, 21, 11, 19, 17, 18, 20, 8, 21, 18, 24, 21, 15, 27, 21]};



// ─── 6단계 정의 ───
// 진행바: 6칸 (본문요약+붙잡은말씀은 2칸 동시 활성)
// 실제 화면: 5개 (0:들어가는기도 1:본문요약+붙잡은말씀 2:느낌과묵상 3:적용과결단 4:올려드리는기도)
const STEPS_6 = [
  { barIdx: [0],    title: "들어가는 기도",      subtitle: "말씀 앞에 나아가기 전 기도",  placeholder: "주님, 오늘 말씀 앞에 나아갑니다...\n제 눈과 귀와 마음을 열어주세요.", hint: "짧아도 괜찮아요. 마음을 열고 주님께 나아가는 기도예요.", id: "opening_prayer" },
  { barIdx: [1, 2], title: "본문 요약 & 붙잡은 말씀", subtitle: "본문을 읽고 마음에 새겨요", placeholder: "", hint: "", id: "passage_step", isPassageStep: true },
  { barIdx: [3],    title: "느낌과 묵상",         subtitle: "이 말씀이 내게 주는 의미",     placeholder: "이 말씀이 오늘 내 삶에 무슨 말씀인가요?\n솔직하게 느낀 것을 써보세요.", hint: "정답이 없어요. 성령님의 이끄심에 맡겨봐요.", id: "meditation" },
  { barIdx: [4],    title: "적용과 결단",          subtitle: "오늘 하루 어떻게 살 건가요?", placeholder: "", hint: "성품은 마음을 정하는 것, 행동은 손과 발로 드러나는 것이에요.", id: "application", isDecision: true },
  { barIdx: [5],    title: "올려드리는 기도",       subtitle: "말씀으로 드리는 기도",         placeholder: "말씀을 붙들고 기도를 올려드려요...", hint: "말씀과 결단을 간결하게 다시 하나님께 올려드려요.", id: "closing_prayer", isLast: true },
];

const BAR_LABELS_6 = ["들어가는 기도", "본문 요약", "붙잡은 말씀", "느낌과 묵상", "적용과 결단", "올려드리는 기도"];

// ─── 주일예배 단계 (개편) ───
// 0: 설교 정보 + 말씀 선택
// 1: 들어가는 기도
// 2: 말씀 요약
// 3: 깨달음과 결단 (깨달음 + 성품 + 행동들)
// 4: 올려드리는 기도
const STEPS_SUNDAY = [
  { id: "sermon_info", title: "설교 정보", subtitle: "설교 제목과 말씀 본문을 선택해요", isSermonInfo: true },
  { id: "opening_prayer", title: "들어가는 기도", subtitle: "예배 전 마음을 준비해요", placeholder: "주님, 오늘 예배에 나아갑니다...\n제 눈과 귀와 마음을 열어주세요.", hint: "예배 전 마음을 열고 주님께 나아가는 기도예요." },
  { id: "summary", title: "말씀 요약", subtitle: "설교 말씀을 내 말로 요약해요", placeholder: "오늘 설교 핵심 내용을 자신의 말로 요약해보세요...", hint: "설교자가 전한 핵심 메시지를 나의 말로 정리해요." },
  { id: "meditation", title: "깨달음과 결단", subtitle: "말씀이 내게 주는 깨달음과 결단", placeholder: "", hint: "말씀을 통해 깨달은 것, 그리고 삶으로 살아낼 결단을 적어요.", isDecision: true },
  { id: "closing_prayer", title: "올려드리는 기도", subtitle: "예배의 마무리 기도", placeholder: "오늘 받은 은혜와 결단을 하나님께 올려드려요...", hint: "받은 말씀과 결단을 하나님께 올려드려요.", isLast: true },
];

function QTWriteContent() {
  const router = useRouter();
  const params = useSearchParams();
  const initMode = params.get("mode") as "6step" | "sunday" | "free" | null;
  const isResume = params.get("resume") === "true"; // 이어쓰기 여부
  const todayStr = new Date().toISOString().split("T")[0];

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedTranslation, setSelectedTranslation] = useState(92);
  const [showTranslationPicker, setShowTranslationPicker] = useState(false);

  const [mode] = useState<"6step" | "sunday" | "free">(() => {
    if (initMode === "free") return "free";
    if (initMode === "sunday") return "sunday";
    if (initMode === "6step") return "6step";
    return isSunday(todayStr) ? "sunday" : "6step";
  });

  // 말씀 선택 (6step, free)
  const [bibleStep, setBibleStep] = useState<"select" | "done">("select");
  const currentLang = TRANSLATION_LANG[selectedTranslation] ?? "KO";
  const currentBookNames = BOOK_NAMES[currentLang] ?? BOOK_NAMES["KO"];
  const OT_BOOKS_LOCAL = currentBookNames.slice(0, 39);
  const NT_BOOKS_LOCAL = currentBookNames.slice(39);
  // 말씀 선택 (단일)
  const [book, setBook] = useState("창세기");
  const [chapter, setChapter] = useState("1");
  const [startV, setStartV] = useState("1");
  const [endV, setEndV] = useState("1");
  // 끝 장/절 (장 넘어가는 경우)
  const [endChapter, setEndChapter] = useState("1");
  const [crossChapter, setCrossChapter] = useState(false); // 장 넘어가는 말씀 여부

  // 말씀 여러 개 (추가 말씀)
  type PassageItem = { book: string; chapter: string; startV: string; endV: string; endChapter: string; cross: boolean; verses: {num:number;text:string}[]; ref: string };
  const [passages, setPassages] = useState<PassageItem[]>([]);

  // 주일예배 말씀 선택 step
  const [sundayBibleStep, setSundayBibleStep] = useState<"select"|"done">("select");

  // 장 변경 시 절 범위 초과 자동 조정
  function handleChapterChange(newChapter: string) {
    setChapter(newChapter);
    const allKoBooks = [...OT_BOOKS, ...NT_BOOKS];
    const allLocalBooks = [...(BOOK_NAMES[currentLang] ?? BOOK_NAMES["KO"])];
    const idx = allLocalBooks.indexOf(book);
    const koBook = idx >= 0 ? allKoBooks[idx] : book;
    const maxV = (BIBLE_CHAPTERS[koBook] ?? [])[parseInt(newChapter)-1] ?? 176;
    if (parseInt(startV) > maxV) setStartV(String(maxV));
    if (parseInt(endV) > maxV) setEndV(String(maxV));
  }
  const [showBookPicker, setShowBookPicker] = useState(false);
  const [loadingBible, setLoadingBible] = useState(false);
  const [bibleError, setBibleError] = useState("");
  const [passageVerses, setPassageVerses] = useState<{ num: number; text: string }[]>([]);
  const [bibleRef, setBibleRef] = useState("");
  const [keyVerse, setKeyVerse] = useState("");
  const [selectedVerseNums, setSelectedVerseNums] = useState<number[]>([]);
  const [passageExpanded, setPassageExpanded] = useState(false); // 자유형식 더보기
  const [versePreviewExpanded, setVersePreviewExpanded] = useState(false); // 6단계 말씀 미리보기 더보기

  // 큐티 작성
  const [cur, setCur] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [decisions, setDecisions] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);
  const [freeText, setFreeText] = useState("");

  // 주일예배 설교 정보
  const [sermonTitle, setSermonTitle] = useState("");
  const [sermonRef, setSermonRef] = useState("");

  // 임시저장 데이터 로드
  useEffect(() => {
    async function loadDraft() {
      if (!isResume) return; // 이어쓰기 모드일 때만 로드
      const { createClient: cc } = await import("@/lib/supabase");
      const supabase = cc();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: draft } = await supabase.from("qt_records")
        .select("*").eq("user_id", user.id).eq("date", todayStr).eq("is_draft", true).maybeSingle();
      if (!draft) return;

      // 기존 draft 데이터 복원
      if (draft.bible_ref) setBibleRef(draft.bible_ref);
      if (draft.key_verse) {
        setKeyVerse(draft.key_verse);
        setBibleStep("done");
      }
      if (draft.opening_prayer) setAnswers(p => ({ ...p, opening_prayer: draft.opening_prayer }));
      if (draft.summary) setAnswers(p => ({ ...p, summary: draft.summary }));
      if (draft.meditation) setAnswers(p => ({ ...p, meditation: draft.meditation }));
      if (draft.application) setAnswers(p => ({ ...p, application: draft.application }));
      if (draft.closing_prayer) setAnswers(p => ({ ...p, closing_prayer: draft.closing_prayer }));
      if (draft.decision) {
        const dList = draft.decision.split("\n").filter((d: string) => d.trim());
        if (dList.length > 0) setDecisions(dList);
      }

      // 말씀 본문 재로드 (bible_ref가 있으면)
      if (draft.bible_ref) {
        try {
          // 약어 → 전체 이름 역변환 맵
          const SHORT_TO_FULL: Record<string, string> = {
            "창":"창세기","출":"출애굽기","레":"레위기","민":"민수기","신":"신명기",
            "수":"여호수아","삿":"사사기","룻":"룻기","삼상":"사무엘상","삼하":"사무엘하",
            "왕상":"열왕기상","왕하":"열왕기하","대상":"역대상","대하":"역대하","스":"에스라",
            "느":"느헤미야","에":"에스더","욥":"욥기","시":"시편","잠":"잠언",
            "전":"전도서","아":"아가","사":"이사야","렘":"예레미야","애":"예레미야애가",
            "겔":"에스겔","단":"다니엘","호":"호세아","욜":"요엘","암":"아모스",
            "옵":"오바댜","욘":"요나","미":"미가","나":"나훔","합":"하박국",
            "습":"스바냐","학":"학개","슥":"스가랴","말":"말라기",
            "마":"마태복음","막":"마가복음","눅":"누가복음","요":"요한복음",
            "행":"사도행전","롬":"로마서","고전":"고린도전서","고후":"고린도후서",
            "갈":"갈라디아서","엡":"에베소서","빌":"빌립보서","골":"골로새서",
            "살전":"데살로니가전서","살후":"데살로니가후서","딤전":"디모데전서","딤후":"디모데후서",
            "딛":"디도서","몬":"빌레몬서","히":"히브리서","약":"야고보서",
            "벧전":"베드로전서","벧후":"베드로후서","요일":"요한일서","요이":"요한이서",
            "요삼":"요한삼서","유":"유다서","계":"요한계시록",
          };

          const ref = draft.bible_ref;
          // "창 1:1-10" 또는 "창세기 1:1-10" 둘 다 파싱
          const match = ref.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
          if (match) {
            const [, abbr, chap, sv, ev] = match;
            // 약어면 전체이름으로 변환, 이미 전체이름이면 그대로
            const bookName = SHORT_TO_FULL[abbr] ?? abbr;
            setBook(bookName);
            setChapter(chap);
            setStartV(sv);
            setEndV(ev ?? sv);
            // API로 절 내용 재로드
            const res = await fetch(`/api/bible?translation=92&book=${encodeURIComponent(bookName)}&chapter=${chap}&startVerse=${sv}&endVerse=${ev ?? sv}`);
            const data = await res.json();
            if (data.verses && data.verses.length > 0) {
              setPassageVerses(data.verses);
              setBibleStep("done");
            }
          }
        } catch (e) {
          // 말씀 로드 실패해도 나머지 데이터는 복원됨
        }
      }

      // 저장된 단계로 이동
      const savedStep = draft.current_step ?? 0;
      if (savedStep > 0) setCur(savedStep);
    }
    loadDraft();
  }, []);

  const translationName = ALL_TRANSLATIONS.find(t => t.id === selectedTranslation)?.name ?? "개역개정";

  async function loadPassage() {
    setLoadingBible(true); setBibleError("");
    try {
      let allVerses: {num:number;text:string}[] = [];
      let refStr = "";

      if (crossChapter && endChapter !== chapter) {
        // 장 넘어가는 경우: 시작장 끝까지 + 끝장 처음부터
        const koBook = (() => { const all=[...OT_BOOKS,...NT_BOOKS]; const loc=[...OT_BOOKS_LOCAL,...NT_BOOKS_LOCAL]; const i=loc.indexOf(book); return i>=0?all[i]:book; })();
        const maxV1 = (BIBLE_CHAPTERS[koBook]??[])[parseInt(chapter)-1]??176;
        const res1 = await fetch(`/api/bible?translation=${selectedTranslation}&book=${encodeURIComponent(book)}&chapter=${chapter}&startVerse=${startV}&endVerse=${maxV1}`);
        const d1 = await res1.json();
        const res2 = await fetch(`/api/bible?translation=${selectedTranslation}&book=${encodeURIComponent(book)}&chapter=${endChapter}&startVerse=1&endVerse=${endV}`);
        const d2 = await res2.json();
        const v1 = (d1.verses??[]).map((v:any)=>({...v, num: `${chapter}:${v.num}`}));
        const v2 = (d2.verses??[]).map((v:any)=>({...v, num: `${endChapter}:${v.num}`}));
        allVerses = [...v1, ...v2];
        refStr = `${book.length>3?book.slice(0,3):book} ${chapter}:${startV}-${endChapter}:${endV}`;
      } else {
        if (parseInt(endV) < parseInt(startV)) { setBibleError("끝 절이 시작 절보다 작아요"); setLoadingBible(false); return; }
        const res = await fetch(`/api/bible?translation=${selectedTranslation}&book=${encodeURIComponent(book)}&chapter=${chapter}&startVerse=${startV}&endVerse=${endV}`);
        const data = await res.json();
        if (data.error) { setBibleError(data.error); setLoadingBible(false); return; }
        allVerses = data.verses ?? [];
        refStr = data.reference;
      }

      setPassageVerses(allVerses);
      setBibleRef(refStr);
      setBibleStep("done");
      setSundayBibleStep("done");
      setSelectedVerseNums([]);
      setKeyVerse("");
    } catch { setBibleError("본문을 불러오지 못했어요."); }
    setLoadingBible(false);
  }

  // 말씀 추가하기 (passages 배열에 추가)
  async function addPassage() {
    setLoadingBible(true); setBibleError("");
    try {
      const koBook = (() => { const all=[...OT_BOOKS,...NT_BOOKS]; const loc=[...OT_BOOKS_LOCAL,...NT_BOOKS_LOCAL]; const i=loc.indexOf(book); return i>=0?all[i]:book; })();
      let vers: {num:number;text:string}[] = [];
      let refStr = "";
      if (crossChapter && endChapter !== chapter) {
        const maxV1 = (BIBLE_CHAPTERS[koBook]??[])[parseInt(chapter)-1]??176;
        const r1 = await fetch(`/api/bible?translation=${selectedTranslation}&book=${encodeURIComponent(book)}&chapter=${chapter}&startVerse=${startV}&endVerse=${maxV1}`);
        const d1 = await r1.json();
        const r2 = await fetch(`/api/bible?translation=${selectedTranslation}&book=${encodeURIComponent(book)}&chapter=${endChapter}&startVerse=1&endVerse=${endV}`);
        const d2 = await r2.json();
        vers = [...(d1.verses??[]).map((v:any)=>({...v,num:`${chapter}:${v.num}`})), ...(d2.verses??[]).map((v:any)=>({...v,num:`${endChapter}:${v.num}`}))];
        refStr = `${book.length>3?book.slice(0,3):book} ${chapter}:${startV}-${endChapter}:${endV}`;
      } else {
        const r = await fetch(`/api/bible?translation=${selectedTranslation}&book=${encodeURIComponent(book)}&chapter=${chapter}&startVerse=${startV}&endVerse=${endV}`);
        const d = await r.json();
        vers = d.verses ?? []; refStr = d.reference;
      }
      if (vers.length > 0) {
        const newP: PassageItem = { book, chapter, startV, endV, endChapter, cross: crossChapter, verses: vers, ref: refStr };
        setPassages(prev => [...prev, newP]);
        // 첫 번째 말씀이 없으면 메인으로도 설정
        if (!bibleRef) { setPassageVerses(vers); setBibleRef(refStr); setBibleStep("done"); setSundayBibleStep("done"); }
      }
    } catch { setBibleError("본문을 불러오지 못했어요."); }
    setLoadingBible(false);
  }

  function selectVerse(verseText: string, num: number) {
    if (selectedVerseNums.includes(num)) {
      setSelectedVerseNums(prev => prev.filter(n => n !== num));
      setKeyVerse(prev => prev.split("\n").filter(l => !l.startsWith(`${num} `)).join("\n").trim());
    } else {
      setSelectedVerseNums(prev => [...prev, num]);
      const line = `${num} ${verseText}`;
      setKeyVerse(prev => prev ? prev + "\n" + line : line);
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(30);
    }
  }

  function set(key: string, val: string) { setAnswers(p => ({ ...p, [key]: val })); }
  function addDecision() { setDecisions(p => [...p, ""]); }
  function removeDecision(i: number) { setDecisions(p => p.filter((_, idx) => idx !== i)); }
  function updateDecision(i: number, val: string) { setDecisions(p => p.map((d, idx) => idx === i ? val : d)); }

  // 6단계 canNext
  function canNext6(): boolean {
    const step = STEPS_6[cur];
    if (step.isPassageStep) return (answers.summary ?? "").trim().length > 0;
    if (step.isDecision) return decisions.some(d => d.trim().length > 0);
    return (answers[step.id] ?? "").trim().length > 0;
  }

  // 주일예배 canNext
  function canNextSunday(): boolean {
    const step = STEPS_SUNDAY[cur] as any;
    if (step.isSermonInfo) return sermonTitle.trim().length > 0 || sermonRef.trim().length > 0;
    if (step.isDecision) return decisions.some(d => d.trim().length > 0);
    return (answers[step.id] ?? "").trim().length > 0;
  }

  // 진행바 상태 (6단계)
  function getBarState(barIdx: number): "done" | "curr" | "upcoming" {
    const currStep = STEPS_6[cur];
    const doneSteps = STEPS_6.slice(0, cur);
    const doneBarIdxs = doneSteps.flatMap(s => s.barIdx);
    if (doneBarIdxs.includes(barIdx)) return "done";
    if (currStep.barIdx.includes(barIdx)) return "curr";
    return "upcoming";
  }

  function handleDateChange(d: string) {
    setSelectedDate(d);
    setShowDatePicker(false);
  }

  const dateLabel = (d: string) => {
    const date = new Date(d + "T12:00:00");
    const day = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
    return `${d} (${day})${d === todayStr ? " · 오늘" : ""}${isSunday(d) ? " 🙌" : ""}`;
  };
  const dateOptions = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i);
    return d.toISOString().split("T")[0];
  });

  async function saveDraft() {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const decisionText = decisions.filter(d => d.trim()).join("\n");
      let draftData: any = {
        user_id: user.id,
        date: selectedDate,
        qt_mode: mode,
        is_draft: true,
        current_step: cur,
        bible_ref: bibleRef,
        key_verse: keyVerse,
        opening_prayer: answers.opening_prayer ?? "",
        summary: answers.summary ?? "",
        meditation: answers.meditation ?? "",
        application: answers.application ?? "",
        decision: decisionText,
        closing_prayer: answers.closing_prayer ?? "",
      };

      // 기존 draft 있으면 update, 없으면 insert
      const { data: existing } = await supabase.from("qt_records")
        .select("id").eq("user_id", user.id).eq("date", selectedDate).maybeSingle();

      if (existing) {
        await supabase.from("qt_records").update(draftData).eq("id", existing.id);
      } else {
        await supabase.from("qt_records").insert(draftData);
      }
      alert("임시저장됐어요! 나중에 이어쓸 수 있어요 😊");
    } catch (e) {
      alert("임시저장에 실패했어요. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: existing } = await supabase.from("qt_records")
        .select("id,is_draft").eq("user_id", user.id).eq("date", selectedDate).maybeSingle();
      // 완료된 기록이 이미 있으면 막기 (draft는 통과)
      if (existing && !existing.is_draft) { alert(`${selectedDate} 큐티 기록이 이미 있어요!`); setSaving(false); return; }

      const decisionText = decisions.filter(d => d.trim()).join("\n");
      let insertData: any = { user_id: user.id, date: selectedDate, qt_mode: mode };

      if (mode === "free") {
        insertData = { ...insertData, bible_ref: bibleRef, key_verse: keyVerse, meditation: freeText, decision: decisionText };
      } else if (mode === "sunday") {
        // 말씀 ref: 메인 + 추가 말씀 합치기
        const allRefs = [bibleRef, ...passages.map(p => p.ref)].filter(Boolean).join(", ");
        insertData = {
          ...insertData,
          bible_ref: allRefs ? `설교: ${sermonTitle} (${allRefs})` : `설교: ${sermonTitle}`,
          opening_prayer: answers.opening_prayer ?? "",
          summary: answers.summary ?? "",
          meditation: answers.meditation ?? "",
          application: answers.application ?? "",
          decision: decisionText,
          closing_prayer: answers.closing_prayer ?? "",
        };
      } else {
        insertData = {
          ...insertData,
          bible_ref: bibleRef, key_verse: keyVerse,
          opening_prayer: answers.opening_prayer ?? "",
          summary: answers.summary ?? "",
          meditation: answers.meditation ?? "",
          application: answers.application ?? "",
          decision: decisionText,
          closing_prayer: answers.closing_prayer ?? "",
        };
      }

      // draft가 있으면 update, 없으면 insert
      if (existing && existing.is_draft) {
        const { error } = await supabase.from("qt_records")
          .update({ ...insertData, is_draft: false }).eq("id", existing.id);
        if (error) { alert("저장에 실패했어요. 다시 시도해주세요."); setSaving(false); return; }
      } else {
        const { error } = await supabase.from("qt_records").insert({ ...insertData, is_draft: false });
        if (error) {
          const { qt_mode, ...withoutMode } = insertData;
          const { error: e2 } = await supabase.from("qt_records").insert({ ...withoutMode, is_draft: false });
          if (e2) { alert("저장에 실패했어요. 다시 시도해주세요."); setSaving(false); return; }
        }
      }

      // streak 업데이트는 홈(page.tsx)에서 3개 루틴 모두 완료 시 처리
      // 큐티 단독으로는 streak가 올라가지 않음
      router.push("/qt/complete");
    } finally { setSaving(false); }
  }

  // ─── 말씀 선택 화면 (6step & free) ───
  if ((mode === "6step" || mode === "free") && bibleStep === "select") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
        <div style={{ background: "var(--bg)", padding: "56px 20px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <button onClick={() => router.push("/qt")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}>
              <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>나가기</span>
            </button>
            <span style={{ fontSize: 11, color: "var(--text3)" }}>{selectedDate === todayStr ? "오늘" : selectedDate}</span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
            {mode === "free" ? "오늘의 말씀 찾기 (선택)" : "오늘의 말씀 찾기"}
          </h1>
          <p style={{ fontSize: 12, color: "var(--text3)" }}>큐티할 말씀을 먼저 선택해요</p>
        </div>

        <div style={{ flex: 1, padding: "16px 16px 100px", display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
          {/* 날짜 + 번역본 */}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowDatePicker(true)} style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 12px", cursor: "pointer" }}>
              <span style={{ fontSize: 12, color: "var(--text2)", fontWeight: 600 }}>📅 {selectedDate === todayStr ? "오늘" : selectedDate}</span>
              <ChevronDown size={12} style={{ color: "var(--text3)", marginLeft: "auto" }} />
            </button>
            <button onClick={() => setShowTranslationPicker(true)} style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 12px", cursor: "pointer" }}>
              <span style={{ fontSize: 12, color: "var(--sage-dark)", fontWeight: 600 }}>📖 {translationName}</span>
              <ChevronDown size={12} style={{ color: "var(--text3)", marginLeft: "auto" }} />
            </button>
          </div>

          {/* 책 선택 */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>성경 책</label>
            <button onClick={() => setShowBookPicker(true)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14, cursor: "pointer", color: "var(--text)", fontSize: 14 }}>
              <span>{book}</span><ChevronDown size={16} style={{ color: "var(--text3)" }} />
            </button>
          </div>

          {/* 장/절 선택 + 장 넘어가는 말씀 지원 */}
          {(() => {
            const allKoBooks = [...OT_BOOKS, ...NT_BOOKS];
            const allLocalBooks = [...OT_BOOKS_LOCAL, ...NT_BOOKS_LOCAL];
            const koBookName = (() => { const i=allLocalBooks.indexOf(book); return i>=0?allKoBooks[i]:book; })();
            const chaptersData = BIBLE_CHAPTERS[koBookName] ?? [];
            const maxChapter = chaptersData.length || 150;
            const maxStartV = chaptersData[parseInt(chapter)-1] ?? 176;
            const maxEndV = crossChapter ? (chaptersData[parseInt(endChapter)-1] ?? 176) : (chaptersData[parseInt(chapter)-1] ?? 176);
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {/* 시작: 장 + 절 */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>시작 장</label>
                    <select value={chapter} onChange={e => handleChapterChange(e.target.value)} className="input-field" style={{ padding: "12px 8px" }}>
                      {Array.from({ length: maxChapter }, (_, i) => String(i+1)).map(v => <option key={v} value={v}>{v}장</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>시작 절</label>
                    <select value={startV} onChange={e => { setStartV(e.target.value); if(!crossChapter && parseInt(e.target.value)>parseInt(endV)) setEndV(e.target.value); }} className="input-field" style={{ padding: "12px 8px" }}>
                      {Array.from({ length: maxStartV }, (_, i) => String(i+1)).map(v => <option key={v} value={v}>{v}절</option>)}
                    </select>
                  </div>
                </div>
                {/* 장 넘어가기 토글 */}
                <button onClick={() => { setCrossChapter(p=>!p); if(!crossChapter) setEndChapter(chapter); }} style={{ display: "flex", alignItems: "center", gap: 6, background: crossChapter ? "var(--sage-light)" : "none", border: `1px solid ${crossChapter ? "var(--sage)" : "var(--border)"}`, borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontSize: 12, color: crossChapter ? "var(--sage-dark)" : "var(--text3)" }}>
                  <span>{crossChapter ? "✓" : "+"}</span> 장이 넘어가는 말씀 (예: 9장 25절~10장 6절)
                </button>
                {/* 끝: 장 + 절 */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {crossChapter && (
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>끝 장</label>
                      <select value={endChapter} onChange={e => setEndChapter(e.target.value)} className="input-field" style={{ padding: "12px 8px" }}>
                        {Array.from({ length: maxChapter }, (_, i) => String(i+1)).map(v => <option key={v} value={v}>{v}장</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>끝 절</label>
                    <select value={endV} onChange={e => setEndV(e.target.value)} className="input-field" style={{ padding: "12px 8px" }}>
                      {Array.from({ length: maxEndV }, (_, i) => String(i+1)).map(v => <option key={v} value={v}>{v}절</option>)}
                    </select>
                  </div>
                </div>
              </div>
            );
          })()}

          {bibleError && <p style={{ fontSize: 12, color: "#E05050" }}>{bibleError}</p>}

          <button onClick={loadPassage} disabled={loadingBible} className="btn-sage">
            {loadingBible ? <><Loader2 size={16} className="spin" />불러오는 중...</> : <><BookOpen size={16} />말씀 불러오기</>}
          </button>

          {/* 말씀 추가 버튼 */}
          {(bibleRef || passages.length > 0) && (
            <button onClick={addPassage} disabled={loadingBible} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", border: "1px dashed var(--sage)", borderRadius: 12, background: "none", color: "var(--sage-dark)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              <Plus size={14} /> 말씀 추가하기 (여러 본문일 경우)
            </button>
          )}

          {/* 추가된 말씀 목록 */}
          {passages.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {passages.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--sage-light)", borderRadius: 10, padding: "8px 12px", border: "1px solid rgba(122,157,122,0.3)" }}>
                  <span style={{ fontSize: 12, color: "var(--sage-dark)", fontWeight: 600 }}>📖 {p.ref}</span>
                  <button onClick={() => setPassages(prev => prev.filter((_,j)=>j!==i))} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}><X size={14}/></button>
                </div>
              ))}
            </div>
          )}

          {mode === "free" && (
            <button onClick={() => setBibleStep("done")} style={{ background: "none", border: "none", color: "var(--text3)", fontSize: 12, cursor: "pointer", textDecoration: "underline", textAlign: "center" }}>
              말씀 없이 자유롭게 작성하기
            </button>
          )}
        </div>

        {/* 책 선택 모달 */}
        {showBookPicker && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 50, display: "flex", alignItems: "flex-end" }}>
            <div style={{ background: "var(--bg2)", width: "100%", maxWidth: 430, margin: "0 auto", borderRadius: "24px 24px 0 0", padding: "20px 0", maxHeight: "70vh", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "0 20px 14px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>성경 책 선택</h3>
                <button onClick={() => setShowBookPicker(false)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 20 }}>✕</button>
              </div>
              <div style={{ overflowY: "auto", flex: 1 }}>
                {[{ label: "구약", books: OT_BOOKS_LOCAL }, { label: "신약", books: NT_BOOKS_LOCAL }].map(({ label, books }) => (
                  <div key={label}>
                    <div style={{ padding: "10px 20px 4px" }}><p style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", letterSpacing: "1px" }}>{label}</p></div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, padding: "6px 16px" }}>
                      {books.map(b => (
                        <button key={b} onClick={() => { setBook(b); setShowBookPicker(false); }} style={{ padding: "8px 4px", borderRadius: 10, border: `1px solid ${book === b ? "var(--sage)" : "var(--border)"}`, background: book === b ? "var(--sage-light)" : "var(--bg3)", color: book === b ? "var(--sage-dark)" : "var(--text2)", fontSize: 11, cursor: "pointer", fontWeight: book === b ? 600 : 400 }}>
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 번역본 선택 모달 */}
        {showTranslationPicker && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <div style={{ background: "var(--bg2)", width: "100%", maxWidth: 480, borderRadius: "24px 24px 0 0", padding: "24px 20px 40px", maxHeight: "70vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>번역본 선택</h3>
                <button onClick={() => setShowTranslationPicker(false)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}><X size={20} /></button>
              </div>
              {TRANSLATIONS.map(group => (
                <div key={group.group} style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", letterSpacing: "1px", marginBottom: 8 }}>{group.group}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {group.items.map(t => (
                      <button key={t.id} onClick={() => {
                const newLang = TRANSLATION_LANG[t.id] ?? "KO";
                const newBooks = BOOK_NAMES[newLang] ?? BOOK_NAMES["KO"];
                setBook(newBooks[0]); // 첫 번째 책으로 리셋
                setSelectedTranslation(t.id);
                setShowTranslationPicker(false);
              }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 14, border: `1px solid ${selectedTranslation === t.id ? "var(--sage)" : "var(--border)"}`, background: selectedTranslation === t.id ? "var(--sage-light)" : "var(--bg3)", cursor: "pointer" }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: selectedTranslation === t.id ? "var(--sage-dark)" : "var(--text)" }}>{t.name}</span>
                        {selectedTranslation === t.id && <Check size={14} style={{ color: "var(--sage)" }} />}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 날짜 선택 모달 */}
        {showDatePicker && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <div style={{ background: "var(--bg2)", width: "100%", maxWidth: 480, borderRadius: "24px 24px 0 0", padding: "20px 20px 40px", maxHeight: "60vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>날짜 선택</h3>
                <button onClick={() => setShowDatePicker(false)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}><X size={20} /></button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {dateOptions.map(d => (
                  <button key={d} onClick={() => handleDateChange(d)} style={{ padding: "12px 16px", borderRadius: 14, border: `1px solid ${selectedDate === d ? "var(--sage)" : "var(--border)"}`, background: selectedDate === d ? "var(--sage-light)" : "var(--bg3)", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: selectedDate === d ? "var(--sage-dark)" : "var(--text)", fontWeight: selectedDate === d ? 700 : 400 }}>{dateLabel(d)}</span>
                    {selectedDate === d && <Check size={14} style={{ color: "var(--sage)" }} />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── 자유형식 작성 화면 ───
  if (mode === "free") {
    const hasPassage = passageVerses.length > 0;
    const LONG_THRESHOLD = 3; // 3절 이상이면 접기

    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
        <div style={{ background: "var(--bg)", padding: "56px 20px 14px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <button onClick={() => router.push("/qt")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}>
              <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>나가기</span>
            </button>
            <span style={{ fontSize: 11, color: "var(--text3)" }}>{selectedDate === todayStr ? "오늘" : selectedDate}</span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>자유 큐티</h1>
        </div>

        <div style={{ flex: 1, padding: "16px 16px 0", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
          {/* 본문 표시 (선택사항) */}
          {hasPassage && (
            <div style={{ background: "var(--sage-light)", borderRadius: 14, padding: "12px 14px", border: "1px solid rgba(122,157,122,0.3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--sage-dark)" }}>{bibleRef} · {translationName}</p>
                <button onClick={() => setBibleStep("select")} style={{ fontSize: 10, color: "var(--text3)", background: "none", border: "none", cursor: "pointer" }}>다시 선택</button>
              </div>
              <div style={{ overflow: "hidden", maxHeight: !passageExpanded && passageVerses.length > LONG_THRESHOLD ? 90 : undefined, transition: "max-height 0.3s" }}>
                {passageVerses.map(v => (
                  <p key={v.num} style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7, marginBottom: 2 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--sage-dark)", marginRight: 4 }}>{v.num}</span>{v.text}
                  </p>
                ))}
              </div>
              {passageVerses.length > LONG_THRESHOLD && (
                <button onClick={() => setPassageExpanded(p => !p)} style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8, background: "none", border: "none", color: "var(--sage-dark)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {passageExpanded ? <><ChevronUp size={14} />접기</> : <><ChevronDown size={14} />더보기</>}
                </button>
              )}
            </div>
          )}

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>오늘의 묵상</label>
            <textarea className="textarea-field" rows={10} placeholder="오늘 읽은 말씀, 느낀 점, 깨달음을 자유롭게 적어보세요..." value={freeText} onChange={e => setFreeText(e.target.value)} />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 8 }}>
              결단 <span style={{ color: "var(--sage-dark)" }}>— 말씀을 삶에 적용해보세요!</span>
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {decisions.map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--sage-light)", border: "1px solid rgba(122,157,122,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--sage-dark)" }}>{i + 1}</span>
                  </div>
                  <input type="text" className="input-field" placeholder={`결단 ${i + 1}`} value={d} onChange={e => updateDecision(i, e.target.value)} style={{ flex: 1 }} />
                  {decisions.length > 1 && <button onClick={() => removeDecision(i)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}><Trash2 size={16} /></button>}
                </div>
              ))}
            </div>
            <button onClick={addDecision} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg2)", border: "1px dashed var(--border)", borderRadius: 12, padding: "10px 14px", cursor: "pointer", marginTop: 8, width: "100%", color: "var(--text3)", fontSize: 12 }}>
              <Plus size={14} /> 결단 추가하기
            </button>
          </div>
        </div>

        <div style={{ padding: "12px 16px 32px", flexShrink: 0, background: "var(--bg)", borderTop: "1px solid var(--border)" }}>
          <button onClick={save} disabled={(!freeText.trim() && !decisions.some(d => d.trim())) || saving} className="btn-sage">
            {saving ? <><Loader2 size={18} className="spin" />저장 중...</> : <><Check size={18} />큐티 완료</>}
          </button>
        </div>
      </div>
    );
  }

  // ─── 주일예배 작성 화면 ───
  if (mode === "sunday") {
    const step = STEPS_SUNDAY[cur] as any;

    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
        <div style={{ background: "var(--bg)", padding: "56px 20px 14px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <button onClick={() => router.push("/qt")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}>
              <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>나가기</span>
            </button>
            <span style={{ fontSize: 11, color: "var(--text3)" }}>{selectedDate === todayStr ? "오늘" : selectedDate}</span>
          </div>
          <div className="step-bar" style={{ marginBottom: 8 }}>
            {STEPS_SUNDAY.map((_, i) => <div key={i} className={`step-bar-item ${i < cur ? "done" : i === cur ? "curr" : ""}`} />)}
          </div>
          <p style={{ fontSize: 10, color: "var(--text3)", marginBottom: 4 }}>{cur + 1} / {STEPS_SUNDAY.length}단계</p>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{step.title}</h1>
          <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 3 }}>{step.subtitle}</p>
        </div>

        {/* 단계 탭 - 자유 클릭 */}
        <div style={{ display: "flex", overflowX: "auto", background: "var(--bg2)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          {STEPS_SUNDAY.map((s, i) => {
            const done = i < cur; const isCurr = i === cur;
            return (
              <button key={i} onClick={() => setCur(i)} style={{ flexShrink: 0, padding: "10px 12px", background: "none", border: "none", borderBottom: isCurr ? "2px solid var(--sage)" : "2px solid transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: done ? "var(--sage-dark)" : isCurr ? "var(--text)" : "var(--text3)" }}>{i + 1}.</span>
                <span style={{ fontSize: 11, fontWeight: isCurr ? 700 : 400, color: done ? "var(--sage-dark)" : isCurr ? "var(--text)" : "var(--text3)", whiteSpace: "nowrap" }}>{s.title}</span>
                {done && <span style={{ fontSize: 10, color: "var(--sage)" }}>✓</span>}
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1, padding: "16px 16px 0", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>

          {/* 0단계: 설교 정보 + 말씀 선택 */}
          {step.isSermonInfo && (
            <>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>설교 제목</label>
                <input type="text" className="input-field" placeholder="예: 두려워하지 말라" value={sermonTitle} onChange={e => setSermonTitle(e.target.value)} />
              </div>

              {/* 말씀 선택 (6단계와 동일) */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", marginBottom: 10 }}>📖 설교 본문 선택</p>

                {sundayBibleStep === "done" && bibleRef ? (
                  <div style={{ background: "var(--sage-light)", borderRadius: 12, padding: "10px 14px", border: "1px solid rgba(122,157,122,0.3)", marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: "var(--sage-dark)" }}>{bibleRef} · {translationName}</p>
                      <button onClick={() => { setSundayBibleStep("select"); setBibleRef(""); setPassageVerses([]); }} style={{ fontSize: 11, color: "var(--text3)", background: "none", border: "none", cursor: "pointer" }}>다시 선택</button>
                    </div>
                    {passages.length > 0 && (
                      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                        {passages.map((p,i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 11, color: "var(--sage-dark)" }}>+ {p.ref}</span>
                            <button onClick={() => setPassages(prev=>prev.filter((_,j)=>j!==i))} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}><X size={12}/></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* 번역본 선택 */}
                    <button onClick={() => setShowTranslationPicker(true)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 6, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 12px", cursor: "pointer", marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: "var(--sage-dark)", fontWeight: 600 }}>📖 {translationName}</span>
                      <ChevronDown size={12} style={{ color: "var(--text3)", marginLeft: "auto" }} />
                    </button>
                    {/* 책 선택 */}
                    <button onClick={() => setShowBookPicker(true)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, cursor: "pointer", color: "var(--text)", fontSize: 13, marginBottom: 8 }}>
                      <span>{book}</span><ChevronDown size={16} style={{ color: "var(--text3)" }} />
                    </button>
                    {/* 장/절 */}
                    {(() => {
                      const allKoBooks2 = [...OT_BOOKS, ...NT_BOOKS];
                      const allLocalBooks2 = [...OT_BOOKS_LOCAL, ...NT_BOOKS_LOCAL];
                      const koN = (() => { const i=allLocalBooks2.indexOf(book); return i>=0?allKoBooks2[i]:book; })();
                      const cd = BIBLE_CHAPTERS[koN] ?? [];
                      const mc = cd.length || 150;
                      const msv = cd[parseInt(chapter)-1] ?? 176;
                      const mev = crossChapter ? (cd[parseInt(endChapter)-1] ?? 176) : (cd[parseInt(chapter)-1] ?? 176);
                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <div>
                              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 4 }}>시작 장</label>
                              <select value={chapter} onChange={e => handleChapterChange(e.target.value)} className="input-field" style={{ padding: "10px 8px" }}>
                                {Array.from({length:mc},(_,i)=>String(i+1)).map(v=><option key={v} value={v}>{v}장</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 4 }}>시작 절</label>
                              <select value={startV} onChange={e => setStartV(e.target.value)} className="input-field" style={{ padding: "10px 8px" }}>
                                {Array.from({length:msv},(_,i)=>String(i+1)).map(v=><option key={v} value={v}>{v}절</option>)}
                              </select>
                            </div>
                          </div>
                          <button onClick={()=>{setCrossChapter(p=>!p);if(!crossChapter)setEndChapter(chapter);}} style={{ display:"flex",alignItems:"center",gap:6,background:crossChapter?"var(--sage-light)":"none",border:`1px solid ${crossChapter?"var(--sage)":"var(--border)"}`,borderRadius:10,padding:"7px 12px",cursor:"pointer",fontSize:12,color:crossChapter?"var(--sage-dark)":"var(--text3)" }}>
                            <span>{crossChapter?"✓":"+"}</span> 장이 넘어가는 말씀
                          </button>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            {crossChapter && (
                              <div>
                                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 4 }}>끝 장</label>
                                <select value={endChapter} onChange={e=>setEndChapter(e.target.value)} className="input-field" style={{ padding: "10px 8px" }}>
                                  {Array.from({length:mc},(_,i)=>String(i+1)).map(v=><option key={v} value={v}>{v}장</option>)}
                                </select>
                              </div>
                            )}
                            <div>
                              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 4 }}>끝 절</label>
                              <select value={endV} onChange={e=>setEndV(e.target.value)} className="input-field" style={{ padding: "10px 8px" }}>
                                {Array.from({length:mev},(_,i)=>String(i+1)).map(v=><option key={v} value={v}>{v}절</option>)}
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    {bibleError && <p style={{ fontSize: 12, color: "#E05050", marginBottom: 6 }}>{bibleError}</p>}
                    <button onClick={loadPassage} disabled={loadingBible} className="btn-sage" style={{ marginBottom: 6 }}>
                      {loadingBible ? <><Loader2 size={16} className="spin" />불러오는 중...</> : <><BookOpen size={16} />말씀 불러오기</>}
                    </button>
                  </>
                )}

                {/* 말씀 추가 */}
                {bibleRef && (
                  <button onClick={addPassage} disabled={loadingBible} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px", border: "1px dashed var(--sage)", borderRadius: 12, background: "none", color: "var(--sage-dark)", fontSize: 12, fontWeight: 600, cursor: "pointer", width: "100%" }}>
                    <Plus size={14} /> 말씀 추가하기
                  </button>
                )}
              </div>
            </>
          )}

          {/* 깨달음과 결단 단계 */}
          {step.isDecision && (
            <>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>깨달음 (말씀이 내게 주는 것)</label>
                <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6, marginBottom: 8 }}>오늘 설교를 통해 하나님이 내게 하신 말씀은 무엇인가요?</p>
                <textarea className="textarea-field" rows={4} placeholder="개인적이고 솔직하게 써보세요..." value={answers.meditation ?? ""} onChange={e => set("meditation", e.target.value)} />
              </div>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                <div style={{ background: "var(--bg2)", borderRadius: 12, padding: "10px 14px", border: "1px solid var(--border)", marginBottom: 10 }}>
                  <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.7 }}>
                    <span style={{ fontWeight: 700, color: "var(--sage-dark)" }}>성품</span>은 마음을 정하는 것,{" "}
                    <span style={{ fontWeight: 700, color: "var(--terra-dark)" }}>행동</span>은 손과 발로 드러나는 것이에요.
                  </p>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>성품 (마음의 결심)</label>
                  <textarea className="textarea-field" rows={2} placeholder="이 말씀 앞에서 어떤 마음을 품기로 결심했나요?" value={answers.application ?? ""} onChange={e => set("application", e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 8 }}>행동 (구체적인 실천)</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {decisions.map((d, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--sage-light)", border: "1px solid rgba(122,157,122,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--sage-dark)" }}>{i + 1}</span>
                        </div>
                        <input type="text" className="input-field" placeholder={`행동 ${i + 1}`} value={d} onChange={e => updateDecision(i, e.target.value)} style={{ flex: 1 }} />
                        {decisions.length > 1 && <button onClick={() => removeDecision(i)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}><Trash2 size={16} /></button>}
                      </div>
                    ))}
                  </div>
                  <button onClick={addDecision} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg2)", border: "1px dashed var(--border)", borderRadius: 12, padding: "10px 14px", cursor: "pointer", marginTop: 8, width: "100%", color: "var(--text3)", fontSize: 12 }}>
                    <Plus size={14} /> 행동 추가하기
                  </button>
                </div>
              </div>
            </>
          )}

          {/* 일반 텍스트 단계 (들어가는기도, 말씀요약, 올려드리는기도) */}
          {!step.isSermonInfo && !step.isDecision && (
            <>
              <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6 }}>{step.hint}</p>
              <textarea className="textarea-field" rows={9} placeholder={step.placeholder} value={answers[step.id] ?? ""} onChange={e => set(step.id, e.target.value)} />
            </>
          )}
        </div>

        <div style={{ padding: "12px 16px 32px", display: "flex", flexDirection: "column", gap: 8, flexShrink: 0, background: "var(--bg)", borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {cur > 0 && <button onClick={() => setCur(c => c - 1)} className="btn-outline" style={{ flex: 1 }}>← 이전</button>}
            {step.isLast ? (
              <button onClick={save} disabled={saving} className="btn-sage" style={{ flex: cur > 0 ? 2 : 1 }}>
                {saving ? <><Loader2 size={18} className="spin" />저장 중...</> : <><Check size={18} />큐티 완료</>}
              </button>
            ) : (
              <button onClick={() => setCur(c => c + 1)} className="btn-primary" style={{ flex: cur > 0 ? 2 : 1 }}>다음 단계 →</button>
            )}
          </div>
          {/* 임시저장 버튼 */}
          <button onClick={saveDraft} disabled={saving} style={{ width: "100%", padding: "10px", background: "none", border: "1px dashed var(--border)", borderRadius: 12, color: "var(--text3)", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            💾 임시저장하고 나중에 이어쓰기
          </button>
        </div>
      </div>
    );
  }

  // ─── 6단계 작성 화면 ───
  const step6 = STEPS_6[cur];
  const canNext6val = canNext6();

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "var(--bg)", padding: "56px 20px 14px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <button onClick={() => router.push("/qt")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}>
            <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>나가기</span>
          </button>
          <span style={{ fontSize: 11, color: "var(--text3)" }}>{selectedDate === todayStr ? "오늘" : selectedDate}</span>
        </div>

        {/* 말씀 미리보기 */}
        {bibleRef && (
          <div style={{ background: "var(--sage-light)", borderRadius: 12, padding: "10px 14px", marginBottom: 10, border: "1px solid rgba(122,157,122,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: versePreviewExpanded ? 8 : 0 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--sage-dark)" }}>{bibleRef} · {translationName}</p>
              <button
                onClick={() => setVersePreviewExpanded(p => !p)}
                style={{ display: "flex", alignItems: "center", gap: 3, background: "none", border: "none", color: "var(--sage-dark)", fontSize: 11, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}
              >
                {versePreviewExpanded ? <><ChevronUp size={13} />접기</> : <><ChevronDown size={13} />더보기</>}
              </button>
            </div>
            {!versePreviewExpanded && (
              <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.5, fontStyle: "italic", marginTop: 4 }}>
                {passageVerses[0]?.text?.slice(0, 60)}{passageVerses[0]?.text && passageVerses[0].text.length > 60 ? "..." : ""}
              </p>
            )}
            {versePreviewExpanded && passageVerses.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {passageVerses.map(v => (
                  <p key={v.num} style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--sage-dark)", marginRight: 4 }}>{v.num}</span>
                    {v.text}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 진행바 — 6칸, 본문요약+붙잡은말씀 동시 활성 */}
        <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
          {BAR_LABELS_6.map((label, i) => {
            const state = getBarState(i);
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <div style={{ width: "100%", height: 4, borderRadius: 2, background: state === "done" ? "var(--sage)" : state === "curr" ? "var(--sage)" : "var(--border)", opacity: state === "curr" ? 1 : state === "done" ? 0.8 : 0.4, transition: "all 0.3s" }} />
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: 10, color: "var(--text3)", marginBottom: 4 }}>
          {step6.barIdx.map(i => BAR_LABELS_6[i]).join(" & ")}
        </p>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{step6.title}</h1>
        <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 3 }}>{step6.subtitle}</p>
      </div>

      {/* 단계 탭 */}
      <div style={{ display: "flex", overflowX: "auto", background: "var(--bg2)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        {STEPS_6.map((s, i) => {
          const done = i < cur;
          const isCurr = i === cur;
          return (
            <button key={i} onClick={() => setCur(i)} style={{ flexShrink: 0, padding: "10px 12px", background: "none", border: "none", borderBottom: isCurr ? "2px solid var(--sage)" : "2px solid transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: isCurr ? 700 : 400, color: done ? "var(--sage-dark)" : isCurr ? "var(--text)" : "var(--text3)", whiteSpace: "nowrap" }}>{s.title}</span>
              {done && <span style={{ fontSize: 10, color: "var(--sage)" }}>✓</span>}
            </button>
          );
        })}
      </div>

      {/* 본문 요약 & 붙잡은 말씀 단계 */}
      {step6.isPassageStep && (
        <div style={{ flex: 1, padding: "16px 16px 0", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* 절 선택 */}
          <div style={{ background: "var(--bg2)", borderRadius: 14, padding: "12px 14px", border: "1px solid var(--border)" }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: "var(--sage-dark)", marginBottom: 8 }}>💡 절을 탭하면 붙잡은 말씀에 추가돼요</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {passageVerses.map(v => (
                <button key={v.num} onClick={() => selectVerse(v.text, v.num)} style={{ textAlign: "left", background: selectedVerseNums.includes(v.num) ? "var(--sage-light)" : "rgba(122,157,122,0.06)", borderRadius: 8, padding: "8px 10px", border: `1px solid ${selectedVerseNums.includes(v.num) ? "var(--sage)" : "rgba(122,157,122,0.15)"}`, cursor: "pointer", display: "flex", gap: 8, alignItems: "flex-start", transition: "all 0.15s" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: selectedVerseNums.includes(v.num) ? "var(--sage-dark)" : "var(--sage)", flexShrink: 0, minWidth: 16 }}>{v.num}</span>
                  <span style={{ fontSize: 13, color: selectedVerseNums.includes(v.num) ? "var(--sage-dark)" : "var(--text)", lineHeight: 1.6, fontWeight: selectedVerseNums.includes(v.num) ? 600 : 400 }}>{v.text}</span>
                  {selectedVerseNums.includes(v.num) && <Check size={13} style={{ color: "var(--sage)", marginLeft: "auto", flexShrink: 0 }} />}
                </button>
              ))}
            </div>
          </div>

          {/* 2단계: 본문 요약 먼저 */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>
              2단계 · 본문 요약
            </label>
            <textarea className="textarea-field" rows={4} placeholder="본문 내용을 자신의 말로 요약해보세요..." value={answers.summary ?? ""} onChange={e => set("summary", e.target.value)} />
          </div>

          {/* 3단계: 붙잡은 말씀 아래 */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>
              3단계 · 붙잡은 말씀 <span style={{ fontWeight: 400 }}>(위 절 탭하면 자동 추가)</span>
            </label>
            <textarea className="textarea-field" rows={3} placeholder="마음에 와닿은 구절을 적거나 위에서 선택하세요..." value={keyVerse} onChange={e => setKeyVerse(e.target.value)} />
          </div>
        </div>
      )}

      {/* 결단 단계 */}
      {step6.isDecision && (
        <div style={{ flex: 1, padding: "16px 16px 0", overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ background: "var(--bg2)", borderRadius: 12, padding: "12px 14px", border: "1px solid var(--border)" }}>
            <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.7 }}>
              <span style={{ fontWeight: 700, color: "var(--sage-dark)" }}>성품</span>은 마음을 정하는 것,{" "}
              <span style={{ fontWeight: 700, color: "var(--terra-dark)" }}>행동</span>은 손과 발로 드러나는 것이에요.
            </p>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>성품 (마음의 결심)</label>
            <textarea className="textarea-field" rows={3} placeholder="이 말씀 앞에서 어떤 마음을 품기로 결심했나요?" value={answers.application ?? ""} onChange={e => set("application", e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 8 }}>행동 (구체적인 실천)</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {decisions.map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--sage-light)", border: "1px solid rgba(122,157,122,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--sage-dark)" }}>{i + 1}</span>
                  </div>
                  <input type="text" className="input-field" placeholder={`행동 ${i + 1}`} value={d} onChange={e => updateDecision(i, e.target.value)} style={{ flex: 1 }} />
                  {decisions.length > 1 && <button onClick={() => removeDecision(i)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}><Trash2 size={16} /></button>}
                </div>
              ))}
            </div>
            <button onClick={addDecision} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg2)", border: "1px dashed var(--border)", borderRadius: 12, padding: "10px 14px", cursor: "pointer", marginTop: 8, width: "100%", color: "var(--text3)", fontSize: 12 }}>
              <Plus size={14} /> 행동 추가하기
            </button>
          </div>
        </div>
      )}

      {/* 일반 텍스트 단계 (들어가는기도, 느낌과묵상, 올려드리는기도) */}
      {!step6.isPassageStep && !step6.isDecision && (
        <div style={{ flex: 1, padding: "16px 16px 0", display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>

          <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6 }}>{step6.hint}</p>
          <textarea className="textarea-field" rows={9} placeholder={step6.placeholder} value={answers[step6.id] ?? ""} onChange={e => set(step6.id, e.target.value)} />
        </div>
      )}

      {/* 하단 버튼 */}
      <div style={{ padding: "12px 16px 32px", display: "flex", flexDirection: "column", gap: 8, flexShrink: 0, background: "var(--bg)", borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {cur > 0 && <button onClick={() => setCur(c => c - 1)} className="btn-outline" style={{ flex: 1 }}>← 이전</button>}
          {step6.isLast ? (
            <button onClick={save} disabled={!canNext6val || saving} className="btn-sage" style={{ flex: cur > 0 ? 2 : 1 }}>
              {saving ? <><Loader2 size={18} className="spin" />저장 중...</> : <><Check size={18} />큐티 완료</>}
            </button>
          ) : (
            <button onClick={() => setCur(c => c + 1)} className="btn-primary" style={{ flex: cur > 0 ? 2 : 1 }}>다음 단계 →</button>
          )}
        </div>
        {/* 임시저장 버튼 */}
        <button
          onClick={saveDraft}
          disabled={saving}
          style={{ width: "100%", padding: "10px", background: "none", border: "1px dashed var(--border)", borderRadius: 12, color: "var(--text3)", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          💾 임시저장하고 나중에 이어쓰기
        </button>
      </div>
    </div>
  );
}

export default function QTWritePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}><Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" /></div>}>
      <QTWriteContent />
    </Suspense>
  );
}

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

// ─── 6단계 정의 ───
// 진행바: 6칸 (본문요약+붙잡은말씀은 2칸 동시 활성)
// 실제 화면: 5개 (0:들어가는기도 1:본문요약+붙잡은말씀 2:느낌과묵상 3:적용과결단 4:올려드리는기도)
const STEPS_6 = [
  { barIdx: [0],    title: "들어가는 기도",      subtitle: "말씀 앞에 나아가기 전 기도",  placeholder: "주님, 오늘 말씀 앞에 나아갑니다...\n제 눈과 귀와 마음을 열어주세요.", hint: "짧아도 괜찮아요. 마음을 열고 주님께 나아가는 기도예요.", id: "opening_prayer" },
  { barIdx: [1, 2], title: "본문 요약 & 붙잡은 말씀", subtitle: "본문을 읽고 마음에 새겨요", placeholder: "", hint: "", id: "passage_step", isPassageStep: true },
  { barIdx: [3],    title: "느낌과 묵상",         subtitle: "이 말씀이 내게 주는 의미",     placeholder: "이 말씀이 오늘 내 삶에 무슨 말씀인가요?\n솔직하게 느낀 것을 써보세요.", hint: "성령님의 이끄심에 맡겨봐요.", id: "meditation" },
  { barIdx: [4],    title: "적용과 결단",          subtitle: "오늘 하루 어떻게 살 건가요?", placeholder: "", hint: "성품은 마음을 정하는 것, 행동은 손과 발로 드러나는 것이에요.", id: "application", isDecision: true },
  { barIdx: [5],    title: "올려드리는 기도",       subtitle: "말씀으로 드리는 기도",         placeholder: "말씀을 붙들고 기도를 올려드려요...", hint: "말씀과 결단을 간결하게 다시 하나님께 올려드려요.", id: "closing_prayer", isLast: true },
];

const BAR_LABELS_6 = ["들어가는 기도", "본문 요약", "붙잡은 말씀", "느낌과 묵상", "적용과 결단", "올려드리는 기도"];

// ─── 주일예배 단계 ───
const STEPS_SUNDAY = [
  { id: "sermon_info", title: "설교 정보", subtitle: "오늘 설교 제목과 본문을 입력해요", isSermonInfo: true },
  { id: "opening_prayer", title: "들어가는 기도", subtitle: "예배 전 마음을 준비해요", placeholder: "주님, 오늘 예배에 나아갑니다...", hint: "예배 전 마음을 열고 주님께 나아가는 기도예요." },
  { id: "summary", title: "설교 요약", subtitle: "설교 말씀을 내 말로 요약해요", placeholder: "오늘 설교 제목, 본문, 핵심 내용을 요약해보세요...", hint: "목사님이 전한 핵심 메시지를 나의 말로 정리해요." },
  { id: "meditation", title: "느낌과 묵상", subtitle: "하나님이 내게 하신 말씀", placeholder: "오늘 설교를 통해 하나님이 나에게 하신 말씀은 무엇인가요?", hint: "개인적이고 솔직하게 써보세요." },
  { id: "application", title: "적용과 결단", subtitle: "이번 주 어떻게 살 건가요?", placeholder: "", hint: "말씀이 내 성품과 삶이 되도록 의지적으로 결단해요.", isDecision: true },
  { id: "closing_prayer", title: "올려드리는 기도", subtitle: "예배의 마무리 기도", placeholder: "오늘 받은 은혜에 감사하며...", hint: "받은 말씀과 결단을 하나님께 올려드려요.", isLast: true },
];

function QTWriteContent() {
  const router = useRouter();
  const params = useSearchParams();
  const initMode = params.get("mode") as "6step" | "sunday" | "free" | null;
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
  const [book, setBook] = useState("창세기");
  const [chapter, setChapter] = useState("1");
  const [startV, setStartV] = useState("1");
  const [endV, setEndV] = useState("1");
  const [showBookPicker, setShowBookPicker] = useState(false);
  const [loadingBible, setLoadingBible] = useState(false);
  const [bibleError, setBibleError] = useState("");
  const [passageVerses, setPassageVerses] = useState<{ num: number; text: string }[]>([]);
  const [bibleRef, setBibleRef] = useState("");
  const [keyVerse, setKeyVerse] = useState("");
  const [selectedVerseNums, setSelectedVerseNums] = useState<number[]>([]);
  const [passageExpanded, setPassageExpanded] = useState(false); // 자유형식 더보기

  // 큐티 작성
  const [cur, setCur] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [decisions, setDecisions] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);
  const [freeText, setFreeText] = useState("");

  // 주일예배 설교 정보
  const [sermonTitle, setSermonTitle] = useState("");
  const [sermonRef, setSermonRef] = useState("");

  const translationName = ALL_TRANSLATIONS.find(t => t.id === selectedTranslation)?.name ?? "개역개정";

  async function loadPassage() {
    if (parseInt(endV) < parseInt(startV)) { setBibleError("끝 절이 시작 절보다 작아요"); return; }
    setLoadingBible(true); setBibleError("");
    try {
      const res = await fetch(`/api/bible?translation=${selectedTranslation}&book=${encodeURIComponent(book)}&chapter=${chapter}&startVerse=${startV}&endVerse=${endV}`);
      const data = await res.json();
      if (data.error) { setBibleError(data.error); }
      else {
        setPassageVerses(data.verses ?? []);
        setBibleRef(data.reference);
        setBibleStep("done");
        setSelectedVerseNums([]);
        setKeyVerse("");
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

  async function save() {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: existing } = await supabase.from("qt_records")
        .select("id").eq("user_id", user.id).eq("date", selectedDate).maybeSingle();
      if (existing) { alert(`${selectedDate} 큐티 기록이 이미 있어요!`); setSaving(false); return; }

      const decisionText = decisions.filter(d => d.trim()).join("\n");
      let insertData: any = { user_id: user.id, date: selectedDate, qt_mode: mode };

      if (mode === "free") {
        insertData = { ...insertData, bible_ref: bibleRef, key_verse: keyVerse, meditation: freeText, decision: decisionText };
      } else if (mode === "sunday") {
        insertData = {
          ...insertData,
          bible_ref: sermonRef ? `설교: ${sermonTitle} (${sermonRef})` : `설교: ${sermonTitle}`,
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

      const { error } = await supabase.from("qt_records").insert(insertData);
      if (error) {
        const { qt_mode, ...withoutMode } = insertData;
        const { error: e2 } = await supabase.from("qt_records").insert(withoutMode);
        if (e2) { alert("저장에 실패했어요. 다시 시도해주세요."); setSaving(false); return; }
      }

      if (selectedDate === todayStr) {
        const { data: profile } = await supabase.from("profiles")
          .select("streak_days,total_days,last_checkin").eq("id", user.id).single();
        if (profile) {
          const last = profile.last_checkin ? new Date(profile.last_checkin) : null;
          const todayD = new Date(todayStr), yesterday = new Date(todayD);
          yesterday.setDate(yesterday.getDate() - 1);
          let newStreak = 1;
          if (last && last.toDateString() === yesterday.toDateString()) newStreak = (profile.streak_days ?? 0) + 1;
          else if (last && last.toDateString() === todayD.toDateString()) newStreak = profile.streak_days ?? 1;
          await supabase.from("profiles").update({ streak_days: newStreak, total_days: (profile.total_days ?? 0) + 1, last_checkin: selectedDate }).eq("id", user.id);
        }
      }
      router.push("/qt/complete");
    } finally { setSaving(false); }
  }

  // ─── 말씀 선택 화면 (6step & free) ───
  if ((mode === "6step" || mode === "free") && bibleStep === "select") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
        <div style={{ background: "var(--bg)", padding: "56px 20px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}>
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

          {/* 장 + 절 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[
              { label: "장", value: chapter, setter: setChapter, max: 150, unit: "장" },
              { label: "시작 절", value: startV, setter: setStartV, max: 176, unit: "절" },
              { label: "끝 절", value: endV, setter: setEndV, max: 176, unit: "절" },
            ].map(({ label, value, setter, max, unit }) => (
              <div key={label}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>{label}</label>
                <select value={value} onChange={e => setter(e.target.value)} className="input-field" style={{ padding: "12px 8px" }}>
                  {Array.from({ length: max }, (_, i) => String(i + 1)).map(v => (
                    <option key={v} value={v}>{v}{unit}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {bibleError && <p style={{ fontSize: 12, color: "#E05050" }}>{bibleError}</p>}

          <button onClick={loadPassage} disabled={loadingBible} className="btn-sage">
            {loadingBible ? <><Loader2 size={16} className="spin" />불러오는 중...</> : <><BookOpen size={16} />말씀 불러오기</>}
          </button>

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
            <button onClick={() => setBibleStep("select")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}>
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
    const canNext = canNextSunday();

    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
        <div style={{ background: "var(--bg)", padding: "56px 20px 14px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <button onClick={() => cur > 0 ? setCur(c => c - 1) : router.back()} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}>
              <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>나가기</span>
            </button>
            <span style={{ fontSize: 11, color: "var(--text3)" }}>{selectedDate === todayStr ? "오늘" : selectedDate}</span>
          </div>
          {/* 진행바 */}
          <div className="step-bar" style={{ marginBottom: 8 }}>
            {STEPS_SUNDAY.map((_, i) => <div key={i} className={`step-bar-item ${i < cur ? "done" : i === cur ? "curr" : ""}`} />)}
          </div>
          <p style={{ fontSize: 10, color: "var(--text3)", marginBottom: 4 }}>{cur + 1} / {STEPS_SUNDAY.length}단계</p>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{step.title}</h1>
          <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 3 }}>{step.subtitle}</p>
        </div>

        {/* 단계 탭 */}
        <div style={{ display: "flex", overflowX: "auto", background: "var(--bg2)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          {STEPS_SUNDAY.map((s, i) => {
            const done = i < cur;
            const isCurr = i === cur;
            return (
              <button key={i} onClick={() => { if (i < cur) setCur(i); }} style={{ flexShrink: 0, padding: "10px 12px", background: "none", border: "none", borderBottom: isCurr ? "2px solid var(--sage)" : "2px solid transparent", cursor: i < cur ? "pointer" : "default", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: done ? "var(--sage-dark)" : isCurr ? "var(--text)" : "var(--text3)" }}>{i + 1}.</span>
                <span style={{ fontSize: 11, fontWeight: isCurr ? 700 : 400, color: done ? "var(--sage-dark)" : isCurr ? "var(--text)" : "var(--text3)", whiteSpace: "nowrap" }}>{s.title}</span>
                {done && <span style={{ fontSize: 10, color: "var(--sage)" }}>✓</span>}
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1, padding: "16px 16px 0", overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {step.isSermonInfo ? (
            <>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>설교 제목</label>
                <input type="text" className="input-field" placeholder="예: 두려워하지 말라" value={sermonTitle} onChange={e => setSermonTitle(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>본문</label>
                <input type="text" className="input-field" placeholder="예: 이사야 41:10" value={sermonRef} onChange={e => setSermonRef(e.target.value)} />
              </div>
            </>
          ) : step.isDecision ? (
            <>
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
            </>
          ) : (
            <>
              <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6 }}>{step.hint}</p>
              <textarea className="textarea-field" rows={9} placeholder={step.placeholder} value={answers[step.id] ?? ""} onChange={e => set(step.id, e.target.value)} />
            </>
          )}
        </div>

        <div style={{ padding: "12px 16px 32px", display: "flex", gap: 8, flexShrink: 0, background: "var(--bg)", borderTop: "1px solid var(--border)" }}>
          {cur > 0 && <button onClick={() => setCur(c => c - 1)} className="btn-outline" style={{ flex: 1 }}>← 이전</button>}
          {step.isLast ? (
            <button onClick={save} disabled={!canNext || saving} className="btn-sage" style={{ flex: cur > 0 ? 2 : 1 }}>
              {saving ? <><Loader2 size={18} className="spin" />저장 중...</> : <><Check size={18} />큐티 완료</>}
            </button>
          ) : (
            <button onClick={() => setCur(c => c + 1)} disabled={!canNext} className="btn-primary" style={{ flex: cur > 0 ? 2 : 1 }}>다음 단계 →</button>
          )}
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
          <button onClick={() => cur === 0 ? setBibleStep("select") : setCur(c => c - 1)} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}>
            <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>나가기</span>
          </button>
          <span style={{ fontSize: 11, color: "var(--text3)" }}>{selectedDate === todayStr ? "오늘" : selectedDate}</span>
        </div>

        {/* 말씀 미리보기 */}
        {bibleRef && (
          <div style={{ background: "var(--sage-light)", borderRadius: 12, padding: "10px 14px", marginBottom: 10, border: "1px solid rgba(122,157,122,0.3)" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--sage-dark)", marginBottom: 2 }}>{bibleRef} · {translationName}</p>
            <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.5, fontStyle: "italic" }}>
              {passageVerses[0]?.text?.slice(0, 50)}...
            </p>
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
            <button key={i} onClick={() => { if (i < cur) setCur(i); }} style={{ flexShrink: 0, padding: "10px 12px", background: "none", border: "none", borderBottom: isCurr ? "2px solid var(--sage)" : "2px solid transparent", cursor: i < cur ? "pointer" : "default", display: "flex", alignItems: "center", gap: 4 }}>
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

          {/* 붙잡은 말씀 */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>
              3단계 · 붙잡은 말씀 <span style={{ fontWeight: 400 }}>(위 절 탭하면 자동 추가)</span>
            </label>
            <textarea className="textarea-field" rows={3} placeholder="마음에 와닿은 구절을 적거나 위에서 선택하세요..." value={keyVerse} onChange={e => setKeyVerse(e.target.value)} />
          </div>

          {/* 본문 요약 */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>
              2단계 · 본문 요약
            </label>
            <textarea className="textarea-field" rows={4} placeholder="본문 내용을 자신의 말로 요약해보세요..." value={answers.summary ?? ""} onChange={e => set("summary", e.target.value)} />
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
          {cur >= 2 && keyVerse && (
            <div style={{ background: "var(--sage-light)", borderRadius: 12, padding: "10px 14px", border: "1px solid rgba(122,157,122,0.2)" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "var(--sage-dark)", marginBottom: 4 }}>{bibleRef}</p>
              <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6, fontStyle: "italic", whiteSpace: "pre-line" }}>{keyVerse.slice(0, 80)}{keyVerse.length > 80 ? "..." : ""}</p>
            </div>
          )}
          <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6 }}>{step6.hint}</p>
          <textarea className="textarea-field" rows={9} placeholder={step6.placeholder} value={answers[step6.id] ?? ""} onChange={e => set(step6.id, e.target.value)} />
        </div>
      )}

      {/* 하단 버튼 */}
      <div style={{ padding: "12px 16px 32px", display: "flex", gap: 8, flexShrink: 0, background: "var(--bg)", borderTop: "1px solid var(--border)" }}>
        {cur > 0 && <button onClick={() => setCur(c => c - 1)} className="btn-outline" style={{ flex: 1 }}>← 이전</button>}
        {step6.isLast ? (
          <button onClick={save} disabled={!canNext6val || saving} className="btn-sage" style={{ flex: cur > 0 ? 2 : 1 }}>
            {saving ? <><Loader2 size={18} className="spin" />저장 중...</> : <><Check size={18} />큐티 완료</>}
          </button>
        ) : (
          <button onClick={() => setCur(c => c + 1)} disabled={!canNext6val} className="btn-primary" style={{ flex: cur > 0 ? 2 : 1 }}>다음 단계 →</button>
        )}
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

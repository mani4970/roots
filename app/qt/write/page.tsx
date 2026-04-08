"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { ChevronLeft, Check, Loader2, Plus, Trash2, ChevronDown, BookOpen, HelpCircle, X, Calendar } from "lucide-react";

const OT_BOOKS = ["창세기","출애굽기","레위기","민수기","신명기","여호수아","사사기","룻기","사무엘상","사무엘하","열왕기상","열왕기하","역대상","역대하","에스라","느헤미야","에스더","욥기","시편","잠언","전도서","아가","이사야","예레미야","예레미야애가","에스겔","다니엘","호세아","요엘","아모스","오바댜","요나","미가","나훔","하박국","스바냐","학개","스가랴","말라기"];
const NT_BOOKS = ["마태복음","마가복음","누가복음","요한복음","사도행전","로마서","고린도전서","고린도후서","갈라디아서","에베소서","빌립보서","골로새서","데살로니가전서","데살로니가후서","디모데전서","디모데후서","디도서","빌레몬서","히브리서","야고보서","베드로전서","베드로후서","요한일서","요한이서","요한삼서","유다서","요한계시록"];

// ─── 큐티 가이드 내용 ───
const QT_GUIDE = [
  {
    step: 1, title: "들어가는 기도",
    desc: "하나님께 나아가기 위한 접속 스위치. 스위치 ON 하면 하나님의 빛과 생명 에너지가 우리에게 흘러들어오기 시작!",
    example: "주님, 제 눈을 열어 주님의 말씀을 보게 해 주세요. 제 귀를 열어 주님의 말씀을 듣게 해 주세요. 제 마음을 열어 주님의 말씀을 받게 해 주세요. 예수님의 이름으로 기도합니다. 아멘",
    emoji: "🙏",
  },
  {
    step: 2, title: "본문 요약",
    desc: "두 번 정도 반복해서 읽고 그 내용을 그대로 자신의 말로, 자신의 표현으로 요약!",
    example: "예) 바울이 빌립보 교인들에게 어떤 상황에서도 기뻐하라고 권면하며, 걱정 대신 기도로 하나님께 아뢰면 평강이 임한다고 말한다.",
    emoji: "📖",
  },
  {
    step: 3, title: "붙잡은 말씀",
    desc: "말씀을 읽을 때, 말씀이 우리를 스캔합니다. 그리고 우리 마음 밭에 뿌려질 말씀의 씨앗이 있는 부분에서 멈춥니다. 그곳을 붙잡으면 됩니다.",
    example: "예) \"아무것도 염려하지 말고 다만 모든 일에 기도와 간구로... 너희 구할 것을 감사함으로 하나님께 아뢰라\" (빌 4:6)",
    emoji: "✨",
  },
  {
    step: 4, title: "느낌과 묵상",
    desc: "말씀은 살아계신 생명의 주로부터 옵니다. 철저하게 개인적으로, 맞춤형으로 옵니다. 물음표가 아닌 느낌표를 두고, 저항감이 아닌 순종의 마음을 품고 성령님의 이끄심에 맡겨봅시다!",
    example: "예) 요즘 취업 걱정에 잠못드는데, 주님이 오늘 이 말씀으로 '나한테 가져와'라고 하시는 것 같았다. 염려를 붙들고 있지 말고 기도로 올려드리면 된다는 것을 새롭게 깨달았다.",
    emoji: "💭",
  },
  {
    step: 5, title: "적용과 결단",
    desc: "적용과 결단은 말씀이 나의 성품이 되는 가장 중요한 단계. 성품은 마음을 정하는 것이고, 행동은 구체적인 결단으로 손과 발로 하나님의 능력이 드러나게 하는 것입니다.",
    example: "성품: 모든 일에 먼저 기도하고 긍정적으로 생각하겠습니다.\n행동: 주신 말씀 친구들과 나누기 / 자기 전에 기도하기 / 이번 주 말씀 암송하기",
    emoji: "🌱",
  },
  {
    step: 6, title: "올려드리는 기도",
    desc: "주신 말씀과 받은 은혜에 대한 감사와 영광을, 묵상과 결단을 간결하게 다시 하나님께 올려드립니다.",
    example: "예) 주님, 오늘 염려를 기도로 바꾸라는 말씀 감사해요. 취업 걱정을 주님께 맡기겠습니다. 오늘 하루 말씀대로 살게 도와주세요. 예수님 이름으로 기도합니다. 아멘",
    emoji: "🙌",
  },
];

// ─── 6단계 큐티 ───
const STEPS_6 = [
  { id: "opening_prayer", step: 1, title: "들어가는 기도", subtitle: "말씀 앞에 나아가기 전 기도", placeholder: "주님, 오늘 말씀 앞에 나아갑니다...\n제 눈과 귀와 마음을 열어주세요.", hint: "짧아도 괜찮아요. 마음을 열고 주님께 나아가는 기도예요." },
  { id: "bible_ref", step: 2, title: "본문 & 요약", subtitle: "성경 본문을 선택하고 요약해요", placeholder: "", hint: "두 번 읽고 자신의 말로 요약해보세요.", isPassage: true },
  { id: "meditation", step: 3, title: "느낌과 묵상", subtitle: "이 말씀이 내게 주는 의미", placeholder: "이 말씀이 오늘 내 삶에 무슨 말씀인가요?\n솔직하게 느낀 것을 써보세요.", hint: "정답이 없어요. 성령님의 이끄심에 맡겨봐요." },
  { id: "application", step: 4, title: "적용과 결단", subtitle: "오늘 하루 어떻게 살 건가요?", placeholder: "", hint: "성품은 마음을 정하는 것, 행동은 손과 발로 드러나는 것이에요.", isDecision: true },
  { id: "closing_prayer", step: 5, title: "올려드리는 기도", subtitle: "말씀으로 드리는 기도", placeholder: "말씀을 붙들고 기도를 올려드려요...\n오늘 받은 은혜에 감사드립니다.", hint: "말씀과 결단을 간결하게 다시 하나님께 올려드려요.", isLast: true },
];

// ─── 주일예배 단계 ───
const STEPS_SUNDAY = [
  { id: "opening_prayer", step: 1, title: "들어가는 기도", subtitle: "예배 전 마음을 준비해요", placeholder: "주님, 오늘 예배에 나아갑니다...", hint: "예배 전 마음을 열고 주님께 나아가는 기도예요." },
  { id: "summary", step: 2, title: "설교 요약", subtitle: "설교 말씀을 내 말로 요약해요", placeholder: "오늘 설교 제목, 본문, 핵심 내용을 요약해보세요...", hint: "설교자가 전한 핵심 메시지를 나의 말로 정리해요." },
  { id: "key_verse", step: 3, title: "붙잡은 말씀", subtitle: "마음에 남은 구절이나 문장", placeholder: "설교 중 마음에 꽂힌 말씀이나 문장을 적어보세요...", hint: "말씀이 당신의 마음 밭에서 멈춘 곳을 붙잡으세요." },
  { id: "meditation", step: 4, title: "느낌과 묵상", subtitle: "하나님이 내게 하신 말씀", placeholder: "오늘 설교를 통해 하나님이 나에게 하신 말씀은 무엇인가요?", hint: "개인적이고 솔직하게 써보세요." },
  { id: "application", step: 5, title: "적용과 결단", subtitle: "이번 주 어떻게 살 건가요?", placeholder: "", hint: "말씀이 내 성품과 삶이 되도록 의지적으로 결단해요.", isDecision: true },
  { id: "closing_prayer", step: 6, title: "올려드리는 기도", subtitle: "예배의 마무리 기도", placeholder: "오늘 받은 은혜에 감사하며...", hint: "받은 말씀과 결단을 하나님께 올려드려요.", isLast: true },
];

function isSunday(dateStr: string) {
  return new Date(dateStr + "T12:00:00").getDay() === 0;
}

function BibleSelector({ version, onPassageLoad }: {
  version: string;
  onPassageLoad: (text: string, ref: string, verses: { num: number; text: string }[]) => void;
}) {
  const [book, setBook] = useState("요한복음");
  const [chapter, setChapter] = useState("3");
  const [startV, setStartV] = useState("16");
  const [endV, setEndV] = useState("16");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showBookPicker, setShowBookPicker] = useState(false);

  async function loadPassage() {
    if (parseInt(endV) < parseInt(startV)) { setError("끝 절이 시작 절보다 작아요"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/bible?version=${encodeURIComponent(version)}&book=${encodeURIComponent(book)}&chapter=${chapter}&startVerse=${startV}&endVerse=${endV}`);
      const data = await res.json();
      if (data.error) setError(data.error);
      else onPassageLoad(data.text, data.reference, data.verses ?? []);
    } catch { setError("본문을 불러오지 못했어요. 다시 시도해주세요."); }
    setLoading(false);
  }

  const chapters = Array.from({ length: 150 }, (_, i) => String(i + 1));
  const verses = Array.from({ length: 176 }, (_, i) => String(i + 1));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>성경 책</label>
        <button onClick={() => setShowBookPicker(true)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14, cursor: "pointer", color: "var(--text)", fontSize: 14 }}>
          <span>{book}</span><ChevronDown size={16} style={{ color: "var(--text3)" }} />
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>장</label>
          <select value={chapter} onChange={e => setChapter(e.target.value)} className="input-field" style={{ padding: "12px 10px" }}>
            {chapters.map(c => <option key={c} value={c}>{c}장</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>시작 절</label>
          <select value={startV} onChange={e => setStartV(e.target.value)} className="input-field" style={{ padding: "12px 10px" }}>
            {verses.map(v => <option key={v} value={v}>{v}절</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>끝 절</label>
          <select value={endV} onChange={e => setEndV(e.target.value)} className="input-field" style={{ padding: "12px 10px" }}>
            {verses.map(v => <option key={v} value={v}>{v}절</option>)}
          </select>
        </div>
      </div>
      {error && <p style={{ fontSize: 12, color: "#E05050" }}>{error}</p>}
      <button onClick={loadPassage} disabled={loading} className="btn-sage">
        {loading ? <><Loader2 size={16} className="spin" />불러오는 중...</> : <><BookOpen size={16} />본문 불러오기</>}
      </button>
      {showBookPicker && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 50, display: "flex", alignItems: "flex-end" }}>
          <div style={{ background: "var(--bg2)", width: "100%", maxWidth: 430, margin: "0 auto", borderRadius: "24px 24px 0 0", padding: "20px 0", maxHeight: "70vh", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "0 20px 14px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>성경 책 선택</h3>
              <button onClick={() => setShowBookPicker(false)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 20 }}>✕</button>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              <div style={{ padding: "10px 20px 4px" }}><p style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", letterSpacing: "1px" }}>구약</p></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, padding: "6px 16px" }}>
                {OT_BOOKS.map(b => <button key={b} onClick={() => { setBook(b); setShowBookPicker(false); }} style={{ padding: "8px 4px", borderRadius: 10, border: `1px solid ${book === b ? "var(--sage)" : "var(--border)"}`, background: book === b ? "var(--sage-light)" : "var(--bg3)", color: book === b ? "var(--sage-dark)" : "var(--text2)", fontSize: 11, cursor: "pointer", fontWeight: book === b ? 600 : 400 }}>{b}</button>)}
              </div>
              <div style={{ padding: "10px 20px 4px" }}><p style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", letterSpacing: "1px" }}>신약</p></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, padding: "6px 16px 20px" }}>
                {NT_BOOKS.map(b => <button key={b} onClick={() => { setBook(b); setShowBookPicker(false); }} style={{ padding: "8px 4px", borderRadius: 10, border: `1px solid ${book === b ? "var(--sage)" : "var(--border)"}`, background: book === b ? "var(--sage-light)" : "var(--bg3)", color: book === b ? "var(--sage-dark)" : "var(--text2)", fontSize: 11, cursor: "pointer", fontWeight: book === b ? 600 : 400 }}>{b}</button>)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 큐티 가이드 팝업 ───
function QTGuideModal({ onClose }: { onClose: () => void }) {
  const [page, setPage] = useState(0);
  const guide = QT_GUIDE[page];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px" }}>
      <div style={{ background: "var(--bg2)", width: "100%", maxWidth: 390, borderRadius: 24, border: "1px solid var(--border)", overflow: "hidden" }}>
        {/* 헤더 */}
        <div style={{ background: "var(--sage-light)", padding: "20px 20px 16px", borderBottom: "1px solid rgba(122,157,122,0.2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--sage-dark)", letterSpacing: "1px" }}>큐티 가이드 {guide.step}/6</p>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--sage-dark)", cursor: "pointer" }}><X size={18} /></button>
          </div>
          {/* 진행 바 */}
          <div style={{ display: "flex", gap: 4 }}>
            {QT_GUIDE.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= page ? "var(--sage)" : "rgba(122,157,122,0.3)", transition: "all 0.3s" }} />
            ))}
          </div>
        </div>
        {/* 내용 */}
        <div style={{ padding: "20px 20px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 32 }}>{guide.emoji}</span>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>{guide.step}단계 · {guide.title}</h2>
          </div>
          <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.75, marginBottom: 14 }}>{guide.desc}</p>
          <div style={{ background: "var(--bg3)", borderRadius: 14, padding: "12px 14px", border: "1px solid var(--border)" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "var(--terra-dark)", marginBottom: 6, letterSpacing: "0.5px" }}>예시</p>
            <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.7, whiteSpace: "pre-line", fontStyle: "italic" }}>{guide.example}</p>
          </div>
        </div>
        {/* 버튼 */}
        <div style={{ padding: "0 20px 24px", display: "flex", gap: 8 }}>
          {page > 0 && <button onClick={() => setPage(p => p - 1)} className="btn-outline" style={{ flex: 1 }}>← 이전</button>}
          {page < QT_GUIDE.length - 1 ? (
            <button onClick={() => setPage(p => p + 1)} className="btn-sage" style={{ flex: 2 }}>다음 →</button>
          ) : (
            <button onClick={() => { localStorage.setItem("qt_guide_done", "true"); onClose(); }} className="btn-sage" style={{ flex: 2 }}>
              시작하기 🌱
            </button>
          )}
        </div>
        <div style={{ padding: "0 20px 20px", textAlign: "center" }}>
          <button onClick={onClose} style={{ fontSize: 11, color: "var(--text3)", background: "none", border: "none", cursor: "pointer" }}>나중에 보기</button>
        </div>
      </div>
    </div>
  );
}

function QTWriteContent() {
  const router = useRouter();
  const params = useSearchParams();
  const initVersion = params.get("version") ?? (typeof window !== "undefined" ? localStorage.getItem("bible_version") ?? "개역한글" : "개역한글");

  // 날짜 선택 (기본: 오늘)
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // 형식 선택: "6step" | "sunday" | "free"
  const [mode, setMode] = useState<"6step" | "sunday" | "free">(() => {
    if (isSunday(todayStr)) return "sunday";
    return "6step";
  });

  // 가이드 팝업 (localStorage에 done 없으면 표시)
  const [showGuide, setShowGuide] = useState(() => {
    if (typeof window === "undefined") return false;
    return !localStorage.getItem("qt_guide_done");
  });

  const [cur, setCur] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [decisions, setDecisions] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);
  const [passageLoaded, setPassageLoaded] = useState(false);
  const [passageVerses, setPassageVerses] = useState<{ num: number; text: string }[]>([]);
  const [freeText, setFreeText] = useState("");
  const [showModeInfo, setShowModeInfo] = useState(false);

  const STEPS = mode === "sunday" ? STEPS_SUNDAY : STEPS_6;
  const step = STEPS[cur] as any;

  // 날짜 변경 시 주일 체크
  function handleDateChange(d: string) {
    setSelectedDate(d);
    if (isSunday(d) && mode === "6step") setMode("sunday");
    else if (!isSunday(d) && mode === "sunday") setMode("6step");
    setShowDatePicker(false);
  }

  // 날짜 목록 (오늘 포함 최근 30일)
  const dateOptions = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split("T")[0];
  });

  const canNext = step?.isPassage
    ? (answers.bible_ref ?? "").trim().length > 0
    : step?.isDecision
    ? decisions.some(d => d.trim().length > 0)
    : (answers[step?.id] ?? "").trim().length > 0;

  function set(key: string, val: string) { setAnswers(p => ({ ...p, [key]: val })); }

  function handlePassageLoad(text: string, ref: string, verses: { num: number; text: string }[]) {
    setAnswers(p => ({ ...p, bible_ref: ref, passage: text }));
    setPassageVerses(verses);
    setPassageLoaded(true);
  }

  function selectVerse(verseText: string, num: number) {
    const current = answers.key_verse ?? "";
    const line = `${num} ${verseText}`;
    setAnswers(p => ({ ...p, key_verse: current ? current + "\n" + line : line }));
  }

  function addDecision() { setDecisions(p => [...p, ""]); }
  function removeDecision(i: number) { setDecisions(p => p.filter((_, idx) => idx !== i)); }
  function updateDecision(i: number, val: string) { setDecisions(p => p.map((d, idx) => idx === i ? val : d)); }

  function isStepDone(i: number) {
    const s = STEPS[i] as any;
    if (s.isPassage) return (answers.bible_ref ?? "").trim().length > 0;
    if (s.isDecision) return decisions.some(d => d.trim());
    return (answers[s.id] ?? "").trim().length > 0;
  }

  async function save() {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // 같은 날짜 큐티 이미 있는지 확인
      const { data: existing } = await supabase.from("qt_records")
        .select("id").eq("user_id", user.id).eq("date", selectedDate).maybeSingle();
      if (existing) {
        alert(`${selectedDate} 큐티 기록이 이미 있어요!`);
        setSaving(false);
        return;
      }

      const decisionText = decisions.filter(d => d.trim()).join("\n");

      if (mode === "free") {
        await supabase.from("qt_records").insert({
          user_id: user.id, date: selectedDate,
          meditation: freeText,
          decision: decisionText,
          bible_version: initVersion,
          qt_mode: "free",
        });
      } else {
        await supabase.from("qt_records").insert({
          user_id: user.id, date: selectedDate,
          opening_prayer: answers.opening_prayer ?? "",
          bible_ref: answers.bible_ref ?? "",
          summary: answers.summary ?? "",
          key_verse: answers.key_verse ?? "",
          passage: answers.passage ?? "",
          meditation: answers.meditation ?? "",
          application: answers.application ?? "",
          decision: decisionText,
          closing_prayer: answers.closing_prayer ?? "",
          bible_version: initVersion,
          qt_mode: mode,
        });
      }

      // 오늘 날짜인 경우만 streak 업데이트
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

  const dateLabel = (d: string) => {
    const date = new Date(d + "T12:00:00");
    const day = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
    const isToday = d === todayStr;
    return `${d} (${day})${isToday ? " · 오늘" : ""}${isSunday(d) ? " 🙌" : ""}`;
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      {/* 큐티 가이드 팝업 */}
      {showGuide && <QTGuideModal onClose={() => setShowGuide(false)} />}

      {/* 헤더 */}
      <div style={{ background: "var(--bg)", padding: "56px 20px 14px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}>
            <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>나가기</span>
          </button>
          <button onClick={() => setShowGuide(true)} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--sage-dark)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            <HelpCircle size={15} />큐티 가이드
          </button>
        </div>

        {/* 날짜 선택 */}
        <button onClick={() => setShowDatePicker(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, padding: "7px 12px", marginBottom: 10, cursor: "pointer" }}>
          <Calendar size={13} style={{ color: "var(--sage-dark)" }} />
          <span style={{ fontSize: 12, color: "var(--text2)", fontWeight: 600 }}>{dateLabel(selectedDate)}</span>
          <ChevronDown size={13} style={{ color: "var(--text3)" }} />
        </button>

        {/* 형식 선택 */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {[
            { id: "6step", label: "📖 6단계", sublabel: isSunday(selectedDate) ? "" : "" },
            { id: "sunday", label: "🙌 주일예배", sublabel: "" },
            { id: "free", label: "✏️ 자유형식", sublabel: "" },
          ].map(m => (
            <button key={m.id} onClick={() => { setMode(m.id as any); setCur(0); setAnswers({}); setDecisions([""]); setPassageLoaded(false); }} style={{ flex: 1, padding: "8px 6px", borderRadius: 10, border: `1px solid ${mode === m.id ? "var(--sage)" : "var(--border)"}`, background: mode === m.id ? "var(--sage-light)" : "var(--bg2)", cursor: "pointer", fontSize: 11, fontWeight: mode === m.id ? 700 : 400, color: mode === m.id ? "var(--sage-dark)" : "var(--text3)" }}>
              {m.label}
            </button>
          ))}
        </div>

        {mode !== "free" && (
          <>
            <div className="step-bar" style={{ marginBottom: 8 }}>
              {STEPS.map((_, i) => <div key={i} className={`step-bar-item ${i < cur ? "done" : i === cur ? "curr" : ""}`} />)}
            </div>
            <p style={{ fontSize: 10, color: "var(--text3)", marginBottom: 4 }}>{step.step} / {STEPS.length}단계</p>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{step.title}</h1>
            <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 3 }}>{step.subtitle}</p>
          </>
        )}

        {mode === "free" && (
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>자유 큐티</h1>
        )}
      </div>

      {/* 단계 탭 (6단계/주일) */}
      {mode !== "free" && (
        <div style={{ display: "flex", gap: 0, overflowX: "auto", background: "var(--bg2)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          {STEPS.map((s, i) => {
            const done = isStepDone(i);
            const isCurr = i === cur;
            return (
              <button key={i} onClick={() => { if (i <= cur || done) setCur(i); }} style={{ flexShrink: 0, padding: "10px 12px", background: "none", border: "none", borderBottom: isCurr ? "2px solid var(--sage)" : "2px solid transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: done ? "var(--sage-dark)" : isCurr ? "var(--text)" : "var(--text3)" }}>{i + 1}.</span>
                <span style={{ fontSize: 11, fontWeight: isCurr ? 700 : 400, color: done ? "var(--sage-dark)" : isCurr ? "var(--text)" : "var(--text3)", whiteSpace: "nowrap" }}>{s.title}</span>
                {done && <span style={{ fontSize: 10, color: "var(--sage)" }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* ─── 자유형식 ─── */}
      {mode === "free" && (
        <div style={{ flex: 1, padding: "16px 16px 0", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
          <div style={{ background: "var(--bg2)", borderRadius: 14, padding: "12px 14px", border: "1px solid var(--border)" }}>
            <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.7 }}>다른 큐티책을 사용하거나 자유롭게 묵상을 적고 싶을 때 사용하세요. 말씀을 삶에 적용하는 결단은 꼭 남겨보세요! 🌱</p>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>오늘의 묵상</label>
            <textarea className="textarea-field" rows={12} placeholder="오늘 읽은 말씀, 느낀 점, 깨달음을 자유롭게 적어보세요..." value={freeText} onChange={e => setFreeText(e.target.value)} />
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
      )}

      {/* ─── 6단계 / 주일 ─── */}
      {mode !== "free" && step?.isPassage && (
        <div style={{ flex: 1, padding: "16px 16px 0", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "var(--bg2)", borderRadius: 14, padding: "10px 14px", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--text3)" }}>성경 버전</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--sage-dark)" }}>{initVersion}</span>
          </div>
          {!passageLoaded ? (
            <BibleSelector version={initVersion} onPassageLoad={handlePassageLoad} />
          ) : (
            <>
              <div style={{ background: "var(--sage-light)", borderRadius: 14, padding: "14px 16px", border: "1px solid rgba(122,157,122,0.3)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "var(--sage-dark)" }}>{answers.bible_ref}</p>
                  <button onClick={() => { setPassageLoaded(false); setPassageVerses([]); setAnswers(p => ({ ...p, passage: "", bible_ref: "" })); }} style={{ fontSize: 10, color: "var(--text3)", background: "none", border: "none", cursor: "pointer" }}>다시 선택</button>
                </div>
                <p style={{ fontSize: 10, color: "var(--sage-dark)", marginBottom: 8, fontWeight: 500 }}>💡 절을 탭하면 붙잡은 말씀에 추가돼요</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {passageVerses.map(v => (
                    <button key={v.num} onClick={() => selectVerse(v.text, v.num)} style={{ textAlign: "left", background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 10px", border: "1px solid rgba(122,157,122,0.2)", cursor: "pointer", display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--sage)", flexShrink: 0, minWidth: 18 }}>{v.num}</span>
                      <span style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6, fontStyle: "italic" }}>{v.text}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>붙잡은 말씀 <span style={{ fontWeight: 400 }}>(위 절 탭하면 자동 추가)</span></label>
                <textarea className="textarea-field" rows={3} placeholder="마음에 와닿은 구절..." value={answers.key_verse ?? ""} onChange={e => set("key_verse", e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>본문 요약</label>
                <textarea className="textarea-field" rows={3} placeholder="본문 내용을 자신의 말로 요약해보세요..." value={answers.summary ?? ""} onChange={e => set("summary", e.target.value)} />
              </div>
              <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.5 }}>{step.hint}</p>
            </>
          )}
        </div>
      )}

      {mode !== "free" && step?.isDecision && (
        <div style={{ flex: 1, padding: "16px 16px 0", overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {answers.key_verse && (
            <div style={{ background: "var(--sage-light)", borderRadius: 12, padding: "10px 14px", border: "1px solid rgba(122,157,122,0.2)" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "var(--sage-dark)", marginBottom: 4 }}>{answers.bible_ref}</p>
              <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6, fontStyle: "italic" }}>{answers.key_verse?.slice(0, 80)}{(answers.key_verse?.length ?? 0) > 80 ? "..." : ""}</p>
            </div>
          )}
          <div style={{ background: "var(--bg2)", borderRadius: 12, padding: "12px 14px", border: "1px solid var(--border)" }}>
            <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.7 }}>
              <span style={{ fontWeight: 700, color: "var(--sage-dark)" }}>성품</span>은 마음을 정하는 것,{" "}
              <span style={{ fontWeight: 700, color: "var(--terra-dark)" }}>행동</span>은 손과 발로 하나님의 능력이 드러나게 하는 것입니다.
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

      {mode !== "free" && !step?.isPassage && !step?.isDecision && (
        <div style={{ flex: 1, padding: "16px 16px 0", display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
          {cur >= 2 && answers.key_verse && (
            <div style={{ background: "var(--sage-light)", borderRadius: 12, padding: "10px 14px", border: "1px solid rgba(122,157,122,0.2)" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "var(--sage-dark)", marginBottom: 4 }}>{answers.bible_ref}</p>
              <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6, fontStyle: "italic" }}>{answers.key_verse?.slice(0, 80)}{(answers.key_verse?.length ?? 0) > 80 ? "..." : ""}</p>
            </div>
          )}
          <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6, padding: "2px 0 4px" }}>{step.hint}</p>
          <textarea className="textarea-field" rows={9} placeholder={step.placeholder} value={answers[step.id] ?? ""} onChange={e => set(step.id, e.target.value)} />
        </div>
      )}

      {/* 하단 버튼 */}
      <div style={{ padding: "12px 16px 32px", display: "flex", gap: 8, flexShrink: 0, background: "var(--bg)", borderTop: "1px solid var(--border)" }}>
        {mode !== "free" && cur > 0 && (
          <button onClick={() => setCur(p => p - 1)} className="btn-outline" style={{ flex: 1 }}>← 이전</button>
        )}
        {mode === "free" ? (
          <button onClick={save} disabled={(!freeText.trim() && !decisions.some(d => d.trim())) || saving} className="btn-sage" style={{ flex: 1 }}>
            {saving ? <><Loader2 size={18} className="spin" />저장 중...</> : <><Check size={18} />큐티 완료</>}
          </button>
        ) : step?.isLast ? (
          <button onClick={save} disabled={!canNext || saving} className="btn-sage" style={{ flex: cur > 0 ? 2 : 1 }}>
            {saving ? <><Loader2 size={18} className="spin" />저장 중...</> : <><Check size={18} />큐티 완료</>}
          </button>
        ) : (
          <button onClick={() => setCur(p => p + 1)} disabled={!canNext} className="btn-primary" style={{ flex: cur > 0 ? 2 : 1 }}>
            다음 단계 →
          </button>
        )}
      </div>

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

export default function QTWritePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}><Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" /></div>}>
      <QTWriteContent />
    </Suspense>
  );
}

"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { ChevronLeft, Check, Loader2, Plus, Trash2, ChevronDown, BookOpen } from "lucide-react";

const OT_BOOKS = ["창세기","출애굽기","레위기","민수기","신명기","여호수아","사사기","룻기","사무엘상","사무엘하","열왕기상","열왕기하","역대상","역대하","에스라","느헤미야","에스더","욥기","시편","잠언","전도서","아가","이사야","예레미야","예레미야애가","에스겔","다니엘","호세아","요엘","아모스","오바댜","요나","미가","나훔","하박국","스바냐","학개","스가랴","말라기"];
const NT_BOOKS = ["마태복음","마가복음","누가복음","요한복음","사도행전","로마서","고린도전서","고린도후서","갈라디아서","에베소서","빌립보서","골로새서","데살로니가전서","데살로니가후서","디모데전서","디모데후서","디도서","빌레몬서","히브리서","야고보서","베드로전서","베드로후서","요한일서","요한이서","요한삼서","유다서","요한계시록"];

const STEPS = [
  { id: "opening_prayer", step: 1, title: "들어가는 기도", subtitle: "말씀 앞에 나아가기 전 기도", placeholder: "주님, 오늘 말씀 앞에 나아갑니다...", hint: "짧아도 괜찮아요. 마음을 열고 주님께 나아가는 기도예요." },
  { id: "bible_ref", step: 2, title: "본문 & 요약", subtitle: "성경 본문을 선택하고 묵상해요", placeholder: "", hint: "본문을 읽고 붙잡은 말씀과 요약을 적어보세요.", isPassage: true },
  { id: "meditation", step: 3, title: "느낌과 묵상", subtitle: "이 말씀이 내게 주는 의미", placeholder: "이 말씀이 오늘 내 삶에 무슨 말씀인가요?", hint: "정답이 없어요. 솔직하게 느낀 것을 써보세요." },
  { id: "application", step: 4, title: "적용과 결단", subtitle: "오늘 하루 어떻게 살 건가요?", placeholder: "", hint: "성품은 마음을 정하는 것, 행동은 손과 발로 드러나는 것이에요.", isDecision: true },
  { id: "closing_prayer", step: 5, title: "올려드리는 기도", subtitle: "말씀으로 드리는 기도", placeholder: "말씀을 붙들고 기도를 올려드려요...", hint: "말씀을 붙잡고 주님께 올려드리는 기도예요.", isLast: true },
];

function BibleSelector({ version, onPassageLoad }: {
  version: string;
  onPassageLoad: (text: string, ref: string, verses: {num: number; text: string}[]) => void;
}) {
  const [book, setBook] = useState("요한복음");
  const [chapter, setChapter] = useState("3");
  const [startV, setStartV] = useState("16");
  const [endV, setEndV] = useState("16");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showBookPicker, setShowBookPicker] = useState(false);

  async function loadPassage() {
    if (parseInt(endV) < parseInt(startV)) {
      setError("끝 절이 시작 절보다 작아요");
      return;
    }
    setLoading(true); setError("");
    try {
      const res = await fetch(
        `/api/bible?version=${encodeURIComponent(version)}&book=${encodeURIComponent(book)}&chapter=${chapter}&startVerse=${startV}&endVerse=${endV}`
      );
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        onPassageLoad(data.text, data.reference, data.verses ?? []);
      }
    } catch {
      setError("본문을 불러오지 못했어요. 다시 시도해주세요.");
    }
    setLoading(false);
  }

  const chapters = Array.from({ length: 150 }, (_, i) => String(i + 1));
  const verses = Array.from({ length: 176 }, (_, i) => String(i + 1));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* 책 선택 */}
      <div>
        <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>성경 책</label>
        <button onClick={() => setShowBookPicker(true)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14, cursor: "pointer", color: "var(--text)", fontSize: 14 }}>
          <span>{book}</span>
          <ChevronDown size={16} style={{ color: "var(--text3)" }} />
        </button>
      </div>

      {/* 장 + 절 선택 */}
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
        {loading
          ? <><Loader2 size={16} className="spin" />불러오는 중... (절마다 가져와요)</>
          : <><BookOpen size={16} />본문 불러오기</>
        }
      </button>

      {/* 책 선택 모달 */}
      {showBookPicker && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 50, display: "flex", alignItems: "flex-end" }}>
          <div style={{ background: "var(--bg2)", width: "100%", maxWidth: 430, margin: "0 auto", borderRadius: "24px 24px 0 0", padding: "20px 0", maxHeight: "70vh", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "0 20px 14px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>성경 책 선택</h3>
              <button onClick={() => setShowBookPicker(false)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 20 }}>✕</button>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              <div style={{ padding: "10px 20px 4px" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", letterSpacing: "1px" }}>구약</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, padding: "6px 16px" }}>
                {OT_BOOKS.map(b => (
                  <button key={b} onClick={() => { setBook(b); setShowBookPicker(false); }} style={{ padding: "8px 4px", borderRadius: 10, border: `1px solid ${book === b ? "var(--sage)" : "var(--border)"}`, background: book === b ? "var(--sage-light)" : "var(--bg3)", color: book === b ? "var(--sage-dark)" : "var(--text2)", fontSize: 11, cursor: "pointer", fontWeight: book === b ? 600 : 400 }}>
                    {b}
                  </button>
                ))}
              </div>
              <div style={{ padding: "10px 20px 4px" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", letterSpacing: "1px" }}>신약</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, padding: "6px 16px 20px" }}>
                {NT_BOOKS.map(b => (
                  <button key={b} onClick={() => { setBook(b); setShowBookPicker(false); }} style={{ padding: "8px 4px", borderRadius: 10, border: `1px solid ${book === b ? "var(--sage)" : "var(--border)"}`, background: book === b ? "var(--sage-light)" : "var(--bg3)", color: book === b ? "var(--sage-dark)" : "var(--text2)", fontSize: 11, cursor: "pointer", fontWeight: book === b ? 600 : 400 }}>
                    {b}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QTWriteContent() {
  const router = useRouter();
  const params = useSearchParams();
  const initVersion = params.get("version") ?? (typeof window !== "undefined" ? localStorage.getItem("bible_version") ?? "개역한글" : "개역한글");

  const [cur, setCur] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [decisions, setDecisions] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);
  const [passageLoaded, setPassageLoaded] = useState(false);
  const [passageVerses, setPassageVerses] = useState<{num: number; text: string}[]>([]);

  const step = STEPS[cur] as any;
  const canNext = step.isPassage
    ? (answers.bible_ref ?? "").trim().length > 0
    : step.isDecision
    ? decisions.some(d => d.trim().length > 0)
    : (answers[step.id] ?? "").trim().length > 0;

  function set(key: string, val: string) { setAnswers(p => ({ ...p, [key]: val })); }

  function handlePassageLoad(text: string, ref: string, verses: {num: number; text: string}[]) {
    setAnswers(p => ({ ...p, bible_ref: ref, passage: text }));
    setPassageVerses(verses);
    setPassageLoaded(true);
  }

  // 절 클릭하면 붙잡은 말씀에 추가
  function selectVerse(verseText: string, num: number) {
    const current = answers.key_verse ?? "";
    const line = `${num} ${verseText}`;
    setAnswers(p => ({ ...p, key_verse: current ? current + "\n" + line : line }));
  }

  function addDecision() { setDecisions(p => [...p, ""]); }
  function removeDecision(i: number) { setDecisions(p => p.filter((_, idx) => idx !== i)); }
  function updateDecision(i: number, val: string) { setDecisions(p => p.map((d, idx) => idx === i ? val : d)); }

  async function save() {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const today = new Date().toISOString().split("T")[0];
      const decisionText = decisions.filter(d => d.trim()).join("\n");
      await supabase.from("qt_records").insert({
        user_id: user.id, date: today,
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
      });
      const { data: profile } = await supabase.from("profiles").select("streak_days,total_days,last_checkin").eq("id", user.id).single();
      if (profile) {
        const last = profile.last_checkin ? new Date(profile.last_checkin) : null;
        const todayD = new Date(today), yesterday = new Date(todayD);
        yesterday.setDate(yesterday.getDate() - 1);
        let newStreak = 1;
        if (last && last.toDateString() === yesterday.toDateString()) newStreak = (profile.streak_days ?? 0) + 1;
        else if (last && last.toDateString() === todayD.toDateString()) newStreak = profile.streak_days ?? 1;
        await supabase.from("profiles").update({ streak_days: newStreak, total_days: (profile.total_days ?? 0) + 1, last_checkin: today }).eq("id", user.id);
      }
      router.push("/qt/complete");
    } finally { setSaving(false); }
  }

  // 완료된 단계 판별
  function isStepDone(i: number) {
    const s = STEPS[i] as any;
    if (s.isPassage) return (answers.bible_ref ?? "").trim().length > 0;
    if (s.isDecision) return decisions.some(d => d.trim());
    return (answers[s.id] ?? "").trim().length > 0;
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      {/* 헤더 */}
      <div style={{ background: "var(--bg)", padding: "56px 20px 14px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", marginBottom: 12, cursor: "pointer" }}>
          <ChevronLeft size={18} /><span style={{ fontSize: 13, color: "var(--text3)" }}>나가기</span>
        </button>
        {/* 진행 바 */}
        <div className="step-bar" style={{ marginBottom: 10 }}>
          {STEPS.map((_, i) => <div key={i} className={`step-bar-item ${i < cur ? "done" : i === cur ? "curr" : ""}`} />)}
        </div>
        <p style={{ fontSize: 10, color: "var(--text3)", marginBottom: 4 }}>{step.step} / {STEPS.length}단계</p>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{step.title}</h1>
        <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 3 }}>{step.subtitle}</p>
      </div>

      {/* 단계 점프 — 전체 이름, 클릭 가능 */}
      <div style={{ display: "flex", gap: 0, overflowX: "auto", background: "var(--bg2)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        {STEPS.map((s, i) => {
          const done = isStepDone(i);
          const isCurr = i === cur;
          return (
            <button
              key={i}
              onClick={() => setCur(i)}
              style={{
                flexShrink: 0,
                padding: "10px 14px",
                background: "none",
                border: "none",
                borderBottom: isCurr ? "2px solid var(--sage)" : "2px solid transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, color: done ? "var(--sage-dark)" : isCurr ? "var(--text)" : "var(--text3)" }}>
                {i + 1}.
              </span>
              <span style={{ fontSize: 11, fontWeight: isCurr ? 700 : 400, color: done ? "var(--sage-dark)" : isCurr ? "var(--text)" : "var(--text3)", whiteSpace: "nowrap" }}>
                {s.title}
              </span>
              {done && <span style={{ fontSize: 10, color: "var(--sage)" }}>✓</span>}
            </button>
          );
        })}
      </div>

      {/* 본문 단계 */}
      {step.isPassage ? (
        <div style={{ flex: 1, padding: "16px 16px 0", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* 현재 버전 표시 */}
          <div style={{ background: "var(--bg2)", borderRadius: 14, padding: "10px 14px", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--text3)" }}>성경 버전</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--sage-dark)" }}>{initVersion}</span>
          </div>

          {!passageLoaded ? (
            <BibleSelector version={initVersion} onPassageLoad={handlePassageLoad} />
          ) : (
            <>
              {/* 본문 — 절별로 표시, 클릭하면 붙잡은 말씀에 추가 */}
              <div style={{ background: "var(--sage-light)", borderRadius: 14, padding: "14px 16px", border: "1px solid rgba(122,157,122,0.3)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "var(--sage-dark)" }}>{answers.bible_ref}</p>
                  <button onClick={() => { setPassageLoaded(false); setPassageVerses([]); setAnswers(p => ({ ...p, passage: "", bible_ref: "" })); }} style={{ fontSize: 10, color: "var(--text3)", background: "none", border: "none", cursor: "pointer" }}>
                    다시 선택
                  </button>
                </div>
                <p style={{ fontSize: 10, color: "var(--sage-dark)", marginBottom: 8, fontWeight: 500 }}>💡 절을 탭하면 붙잡은 말씀에 추가돼요</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {passageVerses.map(v => (
                    <button
                      key={v.num}
                      onClick={() => selectVerse(v.text, v.num)}
                      style={{ textAlign: "left", background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 10px", border: "1px solid rgba(122,157,122,0.2)", cursor: "pointer", display: "flex", gap: 8, alignItems: "flex-start" }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--sage)", flexShrink: 0, minWidth: 18 }}>{v.num}</span>
                      <span style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6, fontStyle: "italic" }}>{v.text}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 붙잡은 말씀 */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>
                  붙잡은 말씀 <span style={{ fontWeight: 400 }}>(위 절 탭하면 자동으로 추가돼요)</span>
                </label>
                <textarea className="textarea-field" rows={3}
                  placeholder="마음에 와닿은 구절..."
                  value={answers.key_verse ?? ""}
                  onChange={e => set("key_verse", e.target.value)}
                />
              </div>

              {/* 본문 요약 */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>본문 요약</label>
                <textarea className="textarea-field" rows={3}
                  placeholder="본문 내용을 간략하게 요약해보세요..."
                  value={answers.summary ?? ""}
                  onChange={e => set("summary", e.target.value)}
                />
              </div>

              <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.5 }}>{step.hint}</p>
            </>
          )}
        </div>

      /* 결단 단계 */
      ) : step.isDecision ? (
        <div style={{ flex: 1, padding: "16px 16px 0", overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {/* 본문 미리보기 */}
          {answers.passage && (
            <div style={{ background: "var(--sage-light)", borderRadius: 12, padding: "10px 14px", border: "1px solid rgba(122,157,122,0.2)" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "var(--sage-dark)", marginBottom: 4 }}>{answers.bible_ref}</p>
              <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6, fontStyle: "italic" }}>
                {answers.key_verse?.slice(0, 80) ?? answers.passage?.slice(0, 80)}{((answers.key_verse?.length ?? 0) > 80) ? "..." : ""}
              </p>
            </div>
          )}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>적용</label>
            <textarea className="textarea-field" rows={3} placeholder="오늘 이 말씀을 삶에서 어떻게 적용할 건가요?" value={answers.application ?? ""} onChange={e => set("application", e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 8 }}>결단</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {decisions.map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--sage-light)", border: "1px solid rgba(122,157,122,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--sage-dark)" }}>{i + 1}</span>
                  </div>
                  <input type="text" className="input-field" placeholder={`결단 ${i + 1}`} value={d} onChange={e => updateDecision(i, e.target.value)} style={{ flex: 1 }} />
                  {decisions.length > 1 && (
                    <button onClick={() => removeDecision(i)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", flexShrink: 0 }}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={addDecision} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg2)", border: "1px dashed var(--border)", borderRadius: 12, padding: "10px 14px", cursor: "pointer", marginTop: 8, width: "100%", color: "var(--text3)", fontSize: 12 }}>
              <Plus size={14} /> 결단 추가하기
            </button>
          </div>
          <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.5 }}>{step.hint}</p>
        </div>

      ) : (
        /* 나머지 단계 (들어가는기도, 느낌과묵상, 올려드리는기도) */
        <div style={{ flex: 1, padding: "16px 16px 0", display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
          {/* 2단계 이후 본문 미리보기 */}
          {cur >= 2 && answers.passage && (
            <div style={{ background: "var(--sage-light)", borderRadius: 12, padding: "10px 14px", border: "1px solid rgba(122,157,122,0.2)" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "var(--sage-dark)", marginBottom: 4 }}>{answers.bible_ref}</p>
              <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6, fontStyle: "italic" }}>
                {answers.key_verse?.slice(0, 80) ?? answers.passage?.slice(0, 80)}{((answers.key_verse?.length ?? 0) > 80) ? "..." : ""}
              </p>
            </div>
          )}
          <textarea className="textarea-field" rows={9} placeholder={step.placeholder} value={answers[step.id] ?? ""} onChange={e => set(step.id, e.target.value)} />
          <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.5 }}>{step.hint}</p>
        </div>
      )}

      {/* 하단 버튼 */}
      <div style={{ padding: "12px 16px 32px", display: "flex", gap: 8, flexShrink: 0, background: "var(--bg)", borderTop: "1px solid var(--border)" }}>
        {cur > 0 && (
          <button onClick={() => setCur(p => p - 1)} className="btn-outline" style={{ flex: 1 }}>← 이전</button>
        )}
        {step.isLast ? (
          <button onClick={save} disabled={!canNext || saving} className="btn-sage" style={{ flex: cur > 0 ? 2 : 1 }}>
            {saving ? <><Loader2 size={18} className="spin" />저장 중...</> : <><Check size={18} />큐티 완료</>}
          </button>
        ) : (
          <button onClick={() => setCur(p => p + 1)} disabled={!canNext} className="btn-primary" style={{ flex: cur > 0 ? 2 : 1 }}>
            다음 단계 →
          </button>
        )}
      </div>
    </div>
  );
}

export default function QTWritePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" />
      </div>
    }>
      <QTWriteContent />
    </Suspense>
  );
}

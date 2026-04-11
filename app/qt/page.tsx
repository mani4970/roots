"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase";
import { ChevronRight, Loader2, Plus, ChevronDown, HelpCircle, X } from "lucide-react";

const QT_GUIDE = [
  {
    step: 1, emoji: "🙏", title: "들어가는 기도",
    desc: "하나님께 나아가기 위한 접속 스위치. 스위치 ON 하면 하나님의 빛과 생명 에너지가 우리에게 흘러들어오기 시작!",
    ex: "주님, 제 눈을 열어 주님의 말씀을 보게 해 주세요. 제 귀를 열어 듣게 해 주세요. 제 마음을 열어 말씀을 받게 해 주세요. 예수님의 이름으로 기도합니다. 아멘",
  },
  {
    step: 2, emoji: "📖", title: "본문 요약",
    desc: "두 번 정도 반복해서 읽고 그 내용을 자신의 말로, 자신의 표현으로 요약!",
    ex: "예) 바울이 빌립보 교인들에게 어떤 상황에서도 기뻐하라고 권면하며, 걱정 대신 기도로 하나님께 아뢰면 평강이 임한다고 말한다.",
  },
  {
    step: 3, emoji: "✨", title: "붙잡은 말씀",
    desc: "말씀을 읽을 때, 말씀이 우리를 스캔합니다. 우리 마음 밭에 뿌려질 말씀의 씨앗이 있는 부분에서 멈춥니다. 그곳을 붙잡으면 됩니다.",
    ex: "예) \"아무것도 염려하지 말고 다만 모든 일에 기도와 간구로... 너희 구할 것을 감사함으로 하나님께 아뢰라\" (빌 4:6)",
  },
  {
    step: 4, emoji: "💭", title: "느낌과 묵상",
    desc: "말씀은 살아계신 생명의 주로부터 옵니다. 철저하게 개인적으로, 맞춤형으로 옵니다. 물음표가 아닌 느낌표를 두고, 순종의 마음을 품고 성령님의 이끄심에 맡겨봅시다!",
    ex: "예) 요즘 취업 걱정에 잠 못 드는데, 주님이 오늘 이 말씀으로 '나한테 가져와'라고 하시는 것 같았다.",
  },
  {
    step: 5, emoji: "🌱", title: "적용과 결단",
    desc: "적용과 결단은 말씀이 나의 성품이 되는 가장 중요한 단계. 성품은 마음을 정하는 것이고, 행동은 손과 발로 하나님의 능력이 드러나게 하는 것입니다.",
    ex: "성품: 모든 일에 먼저 기도하고 긍정적으로 생각하겠습니다.\n행동: 주신 말씀 친구들과 나누기 / 자기 전에 기도하기",
  },
  {
    step: 6, emoji: "🙌", title: "올려드리는 기도",
    desc: "주신 말씀과 받은 은혜에 대한 감사와 영광을, 묵상과 결단을 간결하게 다시 하나님께 올려드립니다.",
    ex: "예) 주님, 오늘 염려를 기도로 바꾸라는 말씀 감사해요. 오늘 하루 말씀대로 살게 도와주세요. 예수님 이름으로 기도합니다. 아멘",
  },
];

export default function QTPage() {
  const router = useRouter();
  const [records, setRecords] = useState<any[]>([]);
  const [todayDone, setTodayDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedYear, setExpandedYear] = useState<number | null>(new Date().getFullYear());
  const [showStartModal, setShowStartModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [guidePage, setGuidePage] = useState(0);
  const [hasDraft, setHasDraft] = useState(false);
  const [showDraftPopup, setShowDraftPopup] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const today = new Date().toISOString().split("T")[0];
    const { data: tqt } = await supabase.from("qt_records")
      .select("id,is_draft").eq("user_id", user.id).eq("date", today).maybeSingle();
    setTodayDone(!!tqt && !tqt.is_draft); // 임시저장은 완료 아님
    const draftExists = !!tqt && tqt.is_draft === true;
    setHasDraft(draftExists); // 오늘 임시저장 있는지
    if (draftExists) setShowDraftPopup(true); // 바로 팝업 표시
    const { data } = await supabase.from("qt_records").select("*")
      .eq("user_id", user.id).eq("is_draft", false) // 완료된 것만 기록에 표시
      .order("date", { ascending: false });
    if (data) setRecords(data);
    setLoading(false);
  }

  const byYear = records.reduce((acc, r) => {
    const year = new Date(r.date).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(r);
    return acc;
  }, {} as Record<number, any[]>);
  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a);
  const currentGuide = QT_GUIDE[guidePage];

  function startQT(mode: string) {
    setShowStartModal(false);
    router.push(`/qt/write?mode=${mode}`);
  }

  async function deleteDraftAndStart() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    await supabase.from("qt_records").delete().eq("user_id", user.id).eq("date", today).eq("is_draft", true);
    setHasDraft(false);
    setShowDraftPopup(false);
    setShowStartModal(true);
  }

  return (
    <div className="page">
      {/* 이어서 하시겠어요 팝업 */}
      {showDraftPopup && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(26,28,30,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
          <div style={{ background: "var(--bg2)", borderRadius: 28, border: "1px solid var(--border)", width: "100%", maxWidth: 340, padding: "32px 24px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>📖</div>
            <h2 style={{ fontSize: 19, fontWeight: 800, color: "var(--text)", marginBottom: 8, lineHeight: 1.3 }}>
              이어서 큐티 하시겠어요?
            </h2>
            <div style={{ padding: "12px 14px", background: "var(--sage-light)", borderRadius: 14, border: "1px solid rgba(122,157,122,0.3)", marginBottom: 20 }}>
              <p style={{ fontSize: 13, color: "var(--sage-dark)", lineHeight: 1.7 }}>
                임시저장된 큐티가 있어요.<br />저장된 내용부터 이어서 할 수 있어요.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={() => { setShowDraftPopup(false); router.push("/qt/write?mode=6step&resume=true"); }}
                style={{ width: "100%", padding: "13px", background: "var(--sage)", color: "var(--bg)", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
              >
                이어서 하기 →
              </button>
              <button
                onClick={deleteDraftAndStart}
                style={{ width: "100%", padding: "13px", background: "none", color: "var(--text3)", border: "1px solid var(--border)", borderRadius: 14, fontSize: 13, cursor: "pointer" }}
              >
                처음부터 새로 하기
              </button>
              <button
                onClick={() => setShowDraftPopup(false)}
                style={{ width: "100%", padding: "10px", background: "none", color: "var(--text3)", border: "none", fontSize: 12, cursor: "pointer" }}
              >
                나중에 할게요
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: "var(--bg)", padding: "56px 20px 16px", borderBottom: "1px solid var(--border)" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)" }}>큐티</h1>
        <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 4 }}>말씀과 함께하는 조용한 시간</p>
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        {todayDone ? (
          <div className="card-sage" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24 }}>✅</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--sage-dark)" }}>오늘 큐티 완료!</p>
              <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>말씀 앞에 앉은 당신, 수고했어요</p>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowStartModal(true)} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Plus size={18} /> 오늘 큐티 시작하기
          </button>
        )}
      </div>

      <div style={{ padding: "20px 16px 0" }}>
        <div className="sec-label">지난 큐티 기록</div>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" />
          </div>
        ) : records.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <p style={{ fontSize: 32, marginBottom: 10 }}>📖</p>
            <p style={{ color: "var(--text3)", fontSize: 14 }}>아직 큐티 기록이 없어요</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {years.map(year => (
              <div key={year}>
                <button onClick={() => setExpandedYear(expandedYear === year ? null : year)} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: "0 2px", marginBottom: 10 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: expandedYear === year ? "var(--sage-dark)" : "var(--text2)" }}>{year}년</span>
                  <span style={{ fontSize: 12, color: "var(--text3)", fontWeight: 400 }}>{byYear[year].length}개</span>
                  <ChevronDown size={14} style={{ color: "var(--text3)", transform: expandedYear === year ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                </button>
                {expandedYear === year && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {byYear[year].map((r: any) => (
                      <button key={r.id} onClick={() => router.push(`/qt/record?id=${r.id}`)} className="qt-record-item">
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 10, color: "var(--text3)", marginBottom: 4 }}>
                            {new Date(r.date).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}
                          </p>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--terra)", marginBottom: r.key_verse ? 4 : 0 }}>{r.bible_ref || (r.qt_mode === "free" ? "자유 묵상" : "주일예배")}</p>
                          {r.key_verse && <p style={{ fontSize: 11, color: "var(--text2)", lineHeight: 1.4 }}>"{r.key_verse.slice(0, 45)}{r.key_verse.length > 45 ? "..." : ""}"</p>}
                          {r.qt_mode === "free" && r.meditation && <p style={{ fontSize: 11, color: "var(--text2)", lineHeight: 1.4 }}>{r.meditation.slice(0, 45)}{r.meditation.length > 45 ? "..." : ""}</p>}
                        </div>
                        <ChevronRight size={16} style={{ color: "var(--text3)", flexShrink: 0 }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 큐티 시작 모달 - 형식 선택 */}
      {showStartModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px" }}>
          <div style={{ background: "var(--bg2)", width: "100%", maxWidth: 400, borderRadius: 24, padding: "24px 20px 28px", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)" }}>어떻게 큐티할까요?</h2>
              <button onClick={() => setShowStartModal(false)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 18 }}>형식을 선택하면 바로 시작돼요</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={() => startQT("6step")} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px", borderRadius: 16, border: "1px solid var(--sage)", background: "var(--sage-light)", cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: 28 }}>📖</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "var(--sage-dark)", marginBottom: 3 }}>6단계 큐티</p>
                  <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.5 }}>들어가는 기도 → 본문 → 붙잡은 말씀<br />→ 묵상 → 결단 → 마침 기도</p>
                </div>
              </button>
              <button onClick={() => startQT("sunday")} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px", borderRadius: 16, border: "1px solid var(--border)", background: "var(--bg3)", cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: 28 }}>🙌</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 3 }}>주일예배 큐티</p>
                  <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.5 }}>설교 요약 + 붙잡은 말씀 + 결단<br />일요일에 자동으로 추천돼요</p>
                </div>
              </button>
              <button onClick={() => startQT("free")} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px", borderRadius: 16, border: "1px solid var(--border)", background: "var(--bg3)", cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: 28 }}>✏️</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 3 }}>자유 형식</p>
                  <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.5 }}>다른 큐티책을 쓰거나 자유롭게<br />묵상을 적고 싶을 때</p>
                </div>
              </button>
            </div>
            <button onClick={() => { setShowStartModal(false); setGuidePage(0); setShowGuideModal(true); }} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", marginTop: 14, padding: "10px", borderRadius: 12, border: "1px solid var(--border)", background: "none", cursor: "pointer", fontSize: 12, color: "var(--text3)" }}>
              <HelpCircle size={14} /> 큐티 6단계 가이드 보기
            </button>
          </div>
        </div>
      )}

      {/* 큐티 6단계 가이드 모달 */}
      {showGuideModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px" }}>
          <div style={{ background: "var(--bg2)", width: "100%", maxWidth: 390, borderRadius: 24, border: "1px solid var(--border)", overflow: "hidden" }}>
            <div style={{ background: "var(--sage-light)", padding: "18px 20px 14px", borderBottom: "1px solid rgba(122,157,122,0.2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--sage-dark)", letterSpacing: "1px" }}>큐티 가이드 {currentGuide.step}/6</p>
                <button onClick={() => setShowGuideModal(false)} style={{ background: "none", border: "none", color: "var(--sage-dark)", cursor: "pointer" }}><X size={18} /></button>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {QT_GUIDE.map((_, i) => (
                  <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= guidePage ? "var(--sage)" : "rgba(122,157,122,0.3)", transition: "all 0.3s" }} />
                ))}
              </div>
            </div>
            <div style={{ padding: "18px 20px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 28 }}>{currentGuide.emoji}</span>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--text)" }}>{currentGuide.step}단계 · {currentGuide.title}</h2>
              </div>
              <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.75, marginBottom: 12 }}>{currentGuide.desc}</p>
              <div style={{ background: "var(--bg3)", borderRadius: 12, padding: "10px 14px", border: "1px solid var(--border)" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "var(--terra-dark)", marginBottom: 5 }}>예시</p>
                <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.7, fontStyle: "italic", whiteSpace: "pre-line" }}>{currentGuide.ex}</p>
              </div>
            </div>
            <div style={{ padding: "0 20px 20px", display: "flex", gap: 8 }}>
              {guidePage > 0 && (
                <button onClick={() => setGuidePage(p => p - 1)} className="btn-outline" style={{ flex: 1 }}>← 이전</button>
              )}
              {guidePage < QT_GUIDE.length - 1 ? (
                <button onClick={() => setGuidePage(p => p + 1)} className="btn-sage" style={{ flex: 2 }}>다음 →</button>
              ) : (
                <button onClick={() => { localStorage.setItem("qt_guide_done", "true"); setShowGuideModal(false); setShowStartModal(true); }} className="btn-sage" style={{ flex: 2 }}>
                  시작하기 🌱
                </button>
              )}
            </div>
          </div>
        </div>
      )}



      <BottomNav />
    </div>
  );
}

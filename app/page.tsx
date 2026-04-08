"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import TreeGrowth from "@/components/TreeGrowth";
import Celebration from "@/components/Celebration";
import Onboarding from "@/components/Onboarding";
import { createClient } from "@/lib/supabase";
import { ChevronRight, LogOut, Check } from "lucide-react";

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "좋은 아침이에요 ☀️";
  if (h >= 12 && h < 17) return "좋은 오후예요 🌤️";
  if (h >= 17 && h < 21) return "좋은 저녁이에요 🌅";
  return "좋은 밤이에요 🌙";
}

function getTreeSubMsg(streak: number) {
  if (streak <= 1) return "씨앗이 땅속에서 뿌리를 내리기 시작했어요!";
  if (streak <= 14) return "씨앗이 조금씩 움트고 있어요!";
  if (streak <= 29) return "새싹이 햇빛을 향해 자라고 있어요!";
  if (streak <= 59) return "묘목이 점점 단단해지고 있어요!";
  if (streak <= 79) return "나무가 무럭무럭 자라고 있어요!";
  if (streak <= 99) return "나무가 점점 더 자라고 있어요!";
  if (streak <= 129) return "열매를 맺은 나무처럼 풍성해지고 있어요!";
  return "아름다운 정원이 완성되어 가고 있어요!";
}

export default function HomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [todayVerse, setTodayVerse] = useState<any>(null);
  const [myDecisions, setMyDecisions] = useState<{text:string;done:boolean}[]>([]);
  const [todayDone, setTodayDone] = useState({ qt: false, prayer: false, decision: false });
  const [loading, setLoading] = useState(true);
  const [celebration, setCelebration] = useState({ show: false, message: "", subMessage: "" });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showRootsMan, setShowRootsMan] = useState(false);
  const celebrationShownRef = useRef(false);

  const decisionDone = todayDone.decision || myDecisions.some(d => d.done);
  const allDone = todayDone.qt && todayDone.prayer && decisionDone;

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (p) setProfile(p);

    const today = new Date().toISOString().split("T")[0];
    const { data: ci } = await supabase.from("daily_checkins")
      .select("verse,mission,completed_mission,reference,message")
      .eq("user_id", user.id).eq("date", today).maybeSingle();
    if (ci) setTodayVerse(ci);

    const { data: tqt } = await supabase.from("qt_records").select("id,decision").eq("user_id", user.id).eq("date", today).maybeSingle();
    const { data: tp } = await supabase.from("prayer_items").select("id").eq("user_id", user.id)
      .gte("created_at", `${today}T00:00:00`).lte("created_at", `${today}T23:59:59`).maybeSingle();

    if (tqt?.decision) {
      const decisions = tqt.decision.split("\n").filter((d: string) => d.trim());
      const saved = localStorage.getItem(`decisions_${today}`);
      const doneList: boolean[] = saved ? JSON.parse(saved) : decisions.map(() => false);
      setMyDecisions(decisions.map((text: string, i: number) => ({ text, done: doneList[i] ?? false })));
    }

    const decisionVal = ci?.completed_mission ?? false;
    setTodayDone({ qt: !!tqt, prayer: !!tp, decision: decisionVal });

    // 오늘 이미 축하했으면 ref 세팅
    if (localStorage.getItem(`celebrated_${today}`)) {
      celebrationShownRef.current = true;
    }

    if (!localStorage.getItem("onboarding_done")) { setShowOnboarding(true); }
    setLoading(false);
  }

  // allDone 감지 — 이미 축하했으면 스킵, 온보딩 중이면 스킵
  useEffect(() => {
    const onboardingDone = localStorage.getItem("onboarding_done");
    if (!loading && allDone && !celebrationShownRef.current && onboardingDone) {
      const today = new Date().toISOString().split("T")[0];
      if (!localStorage.getItem(`celebrated_${today}`)) {
        celebrationShownRef.current = true;
        localStorage.setItem(`celebrated_${today}`, "true");
        const streak = profile?.streak_days ?? 0;
        setCelebration({
          show: true,
          message: "오늘 루틴 완료! 🎉",
          subMessage: `오늘 하루 하나님과 더 가까워진 당신을 축복합니다!\n${getTreeSubMsg(streak)}`,
        });
      }
    }
  }, [allDone, loading]);

  async function toggleAiDecision() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    const newVal = !todayDone.decision;
    await supabase.from("daily_checkins").upsert({
      user_id: user.id,
      date: today,
      completed_mission: newVal,
    }, { onConflict: "user_id,date" });
    setTodayDone(p => ({ ...p, decision: newVal }));
    if (newVal && !celebrationShownRef.current) {
      const today2 = new Date().toISOString().split("T")[0];
      if (!localStorage.getItem(`celebrated_${today2}`)) {
        setCelebration({ show: true, message: "결단 실천 완료! ✊", subMessage: "말씀을 삶으로 살아내는 당신을 축복해요 🌱" });
      }
    }
  }

  function toggleMyDecision(i: number) {
    if (myDecisions[i].done) return;
    const today = new Date().toISOString().split("T")[0];
    const updated = myDecisions.map((d, idx) => idx === i ? { ...d, done: true } : d);
    setMyDecisions(updated);
    localStorage.setItem(`decisions_${today}`, JSON.stringify(updated.map(d => d.done)));
    if (!myDecisions[i].done && !celebrationShownRef.current) {
      if (!localStorage.getItem(`celebrated_${today}`)) {
        setCelebration({ show: true, message: "결단 실천 완료! ✊", subMessage: "말씀을 삶으로 살아내는 당신을 축복해요 🌱" });
      }
    }
  }

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
      <svg width="80" height="100" viewBox="0 0 80 100" fill="none">
        <path d="M40 90 Q38 70 40 50" stroke="#7A9D7A" strokeWidth="3" strokeLinecap="round"/>
        <path d="M40 65 Q25 55 22 40 Q35 42 40 55" fill="#7A9D7A" opacity="0.85"/>
        <path d="M40 58 Q55 48 58 33 Q45 35 40 48" fill="#5C8A58" opacity="0.85"/>
        <ellipse cx="40" cy="90" rx="18" ry="5" fill="#C4956A" opacity="0.4"/>
      </svg>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.5px", marginBottom: 6 }}>Roots</h1>
        <p style={{ fontSize: 13, color: "var(--text3)" }}>말씀에 뿌리내리고, 함께 자라다</p>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--sage)", animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite` }} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="page fade-in">
      {showOnboarding && <Onboarding onClose={() => setShowOnboarding(false)} />}
      <Celebration
        show={celebration.show}
        message={celebration.message}
        subMessage={celebration.subMessage}
        onClose={() => {
          setCelebration({ show: false, message: "", subMessage: "" });
          if (celebration.message.includes("루틴")) setShowRootsMan(true);
        }}
      />

      <div style={{ background: "var(--bg)", padding: "56px 20px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>{getGreeting()}</div>
          <div className="header-title">{profile?.name ?? "성도"}님의 <em>정원</em></div>
        </div>
        <button onClick={logout} style={{ background: "none", border: "none", color: "var(--text3)", marginTop: 8, cursor: "pointer" }}>
          <LogOut size={18} />
        </button>
      </div>

      <TreeGrowth days={profile?.streak_days ?? 0} lastCheckin={profile?.last_checkin ?? null} showRootsMan={showRootsMan} />

      {/* 오늘의 말씀 */}
      <div style={{ padding: "0 16px 14px" }}>
        <div className="sec-label">오늘의 말씀</div>
        <div className="card-sage">
          {todayVerse?.verse ? (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--sage-dark)", letterSpacing: "0.5px", marginBottom: 8 }}>{todayVerse.reference}</div>
              <p className="verse-text">"{todayVerse.verse}"</p>
              {todayVerse.message && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(122,157,122,0.2)", fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>{todayVerse.message}</div>
              )}
            </>
          ) : (
            <>
              <div style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6, marginBottom: 12 }}>오늘의 감정을 선택하면 맞춤 말씀을 받을 수 있어요 🌿</div>
              <Link href="/checkin"><button className="btn-sage">오늘의 말씀 받기 <ChevronRight size={16} /></button></Link>
            </>
          )}
        </div>
      </div>

      {/* 추천 결단 */}
      {todayVerse?.mission && (
        <div style={{ padding: "0 16px 14px" }}>
          <div className="sec-label">오늘의 추천 결단</div>
          <div className="card-terra">
            <div style={{ fontSize: 13, color: "var(--terra-dark)", lineHeight: 1.65, marginBottom: 12 }}>{todayVerse.mission}</div>
            <button onClick={toggleAiDecision} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: todayDone.decision ? "var(--sage)" : "rgba(255,255,255,0.06)", borderRadius: 12, border: `1px solid ${todayDone.decision ? "var(--sage)" : "rgba(196,149,106,0.3)"}`, cursor: "pointer", width: "100%" }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${todayDone.decision ? "white" : "var(--terra)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {todayDone.decision && <Check size={12} style={{ color: "white" }} />}
              </div>
              <span style={{ fontSize: 12, color: todayDone.decision ? "white" : "var(--text2)", fontWeight: todayDone.decision ? 600 : 400 }}>
                {todayDone.decision ? "결단 실천 완료! 🎉" : "오늘 이 결단을 실천했어요"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 나의 결단 */}
      {myDecisions.length > 0 && (
        <div style={{ padding: "0 16px 14px" }}>
          <div className="sec-label">오늘 나의 결단</div>
          <div className="card">
            {myDecisions.map((d, i) => (
              <button key={i} onClick={() => toggleMyDecision(i)} style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: "0 0 8px", width: "100%" }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${d.done ? "var(--sage)" : "var(--border)"}`, background: d.done ? "var(--sage)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  {d.done && <Check size={12} style={{ color: "var(--bg)" }} />}
                </div>
                <span style={{ fontSize: 13, color: d.done ? "var(--text3)" : "var(--text)", lineHeight: 1.5, textDecoration: d.done ? "line-through" : "none" }}>
                  {i + 1}. {d.text}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 오늘의 루틴 */}
      <div style={{ padding: "0 16px 14px" }}>
        <div className="sec-label">오늘의 루틴</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { label: "큐티", href: "/qt", done: todayDone.qt, icon: "📖", onClick: null },
            { label: "기도", href: "/prayer", done: todayDone.prayer, icon: "🙏", onClick: null },
            { label: "결단", href: null, done: decisionDone, icon: "✊", onClick: () => todayVerse ? toggleAiDecision() : router.push("/checkin") },
          ].map(({ label, href, done, icon, onClick }: any) => {
            const bg = done ? "var(--sage-light)" : "var(--bg2)";
            const border = done ? "rgba(122,157,122,0.3)" : "var(--border)";
            const color = done ? "var(--sage-dark)" : "var(--text)";
            const inner = <>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color }}>{label}</div>
              <div style={{ fontSize: 9, color: done ? "var(--sage-dark)" : "var(--text3)", marginTop: 2 }}>{done ? "완료 ✓" : "미완료"}</div>
            </>;
            return onClick ? (
              <button key={label} onClick={onClick} style={{ flex: 1, background: bg, border: `1px solid ${border}`, borderRadius: 16, padding: "14px 8px", textAlign: "center", cursor: "pointer" }}>{inner}</button>
            ) : (
              <Link key={label} href={href} style={{ flex: 1 }}>
                <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 16, padding: "14px 8px", textAlign: "center" }}>{inner}</div>
              </Link>
            );
          })}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

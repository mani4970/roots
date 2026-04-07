"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import TreeGrowth from "@/components/TreeGrowth";
import { createClient } from "@/lib/supabase";
import { ChevronRight, LogOut, Loader2 } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [todayVerse, setTodayVerse] = useState<any>(null);
  const [todayDone, setTodayDone] = useState({ qt: false, prayer: false, decision: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (p) setProfile(p);

    const today = new Date().toISOString().split("T")[0];

    const { data: ci } = await supabase.from("daily_checkins")
      .select("verse, mission, completed_mission, reference, message")
      .eq("user_id", user.id).eq("date", today).maybeSingle();
    if (ci) setTodayVerse(ci);

    const { data: tqt } = await supabase.from("qt_records")
      .select("id").eq("user_id", user.id).eq("date", today).maybeSingle();

    const { data: tp } = await supabase.from("prayer_items")
      .select("id").eq("user_id", user.id)
      .gte("created_at", `${today}T00:00:00`)
      .lte("created_at", `${today}T23:59:59`)
      .maybeSingle();

    setTodayDone({ qt: !!tqt, prayer: !!tp, decision: ci?.completed_mission ?? false });
    setLoading(false);
  }

  async function toggleDecision() {
    if (!todayVerse) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    const newVal = !todayDone.decision;
    await supabase.from("daily_checkins").update({ completed_mission: newVal }).eq("user_id", user.id).eq("date", today);
    setTodayDone(p => ({ ...p, decision: newVal }));
  }

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{ fontSize: 48 }}>🌱</div>
      <Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" />
    </div>
  );

  const streak = profile?.streak_days ?? 0;

  return (
    <div className="page fade-in">
      <div style={{ background: "var(--bg)", padding: "56px 20px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="header-greeting">Good morning,</div>
          <div className="header-title">{profile?.name ?? "성도"}님의<br /><em>정원</em></div>
        </div>
        <button onClick={logout} style={{ background: "none", border: "none", color: "var(--text3)", marginTop: 8, cursor: "pointer" }}>
          <LogOut size={18} />
        </button>
      </div>

      <TreeGrowth days={streak} />

      {/* 오늘의 말씀 */}
      <div style={{ padding: "0 16px 14px" }}>
        <div className="sec-label">오늘의 말씀</div>
        <div className="card-sage">
          {todayVerse?.verse ? (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--sage-dark)", letterSpacing: "0.5px", marginBottom: 8 }}>{todayVerse.reference}</div>
              <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.7, fontStyle: "italic", fontFamily: "'Fraunces', serif" }}>"{todayVerse.verse}"</div>
              {todayVerse.message && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(122,158,118,0.25)", fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>
                  {todayVerse.message}
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6, marginBottom: 12 }}>오늘의 감정을 선택하면 맞춤 말씀을 받을 수 있어요 🌿</div>
              <Link href="/checkin">
                <button className="btn-sage">오늘의 말씀 받기 <ChevronRight size={16} /></button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* 오늘의 결단 */}
      {todayVerse?.mission && (
        <div style={{ padding: "0 16px 14px" }}>
          <div className="sec-label">오늘의 결단</div>
          <div className="card-terra">
            <div style={{ fontSize: 9, fontWeight: 700, color: "var(--terra)", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 8 }}>AI 추천 결단</div>
            <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.65, marginBottom: 12 }}>{todayVerse.mission}</div>
            <button onClick={toggleDecision} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: todayDone.decision ? "var(--terra)" : "rgba(255,255,255,0.65)", borderRadius: 12, border: `1px solid ${todayDone.decision ? "var(--terra)" : "rgba(196,149,106,0.4)"}`, cursor: "pointer", width: "100%" }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${todayDone.decision ? "white" : "var(--terra)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {todayDone.decision && <span style={{ color: "white", fontSize: 12, fontWeight: 700 }}>✓</span>}
              </div>
              <span style={{ fontSize: 12, color: todayDone.decision ? "white" : "var(--text2)", fontWeight: todayDone.decision ? 600 : 400 }}>
                {todayDone.decision ? "결단 실천 완료! 🎉" : "오늘 이 결단을 실천할게요"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 오늘의 루틴 */}
      <div style={{ padding: "0 16px 14px" }}>
        <div className="sec-label">오늘의 루틴</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/qt" style={{ flex: 1 }}>
            <div style={{ background: todayDone.qt ? "var(--sage-light)" : "var(--white)", border: `1px solid ${todayDone.qt ? "#C5DEC3" : "var(--border)"}`, borderRadius: 16, padding: "14px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>📖</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: todayDone.qt ? "var(--sage)" : "var(--text)" }}>큐티</div>
              <div style={{ fontSize: 9, color: todayDone.qt ? "var(--sage)" : "var(--text3)", marginTop: 2 }}>{todayDone.qt ? "완료 ✓" : "미완료"}</div>
            </div>
          </Link>
          <Link href="/prayer" style={{ flex: 1 }}>
            <div style={{ background: todayDone.prayer ? "var(--sage-light)" : "var(--white)", border: `1px solid ${todayDone.prayer ? "#C5DEC3" : "var(--border)"}`, borderRadius: 16, padding: "14px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>🙏</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: todayDone.prayer ? "var(--sage)" : "var(--text)" }}>기도</div>
              <div style={{ fontSize: 9, color: todayDone.prayer ? "var(--sage)" : "var(--text3)", marginTop: 2 }}>{todayDone.prayer ? "완료 ✓" : "미완료"}</div>
            </div>
          </Link>
          <button onClick={toggleDecision} style={{ flex: 1, background: todayDone.decision ? "var(--terra-light)" : "var(--white)", border: `1px solid ${todayDone.decision ? "rgba(196,149,106,0.4)" : "var(--border)"}`, borderRadius: 16, padding: "14px 8px", textAlign: "center", cursor: "pointer" }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>✊</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: todayDone.decision ? "var(--terra)" : "var(--text)" }}>결단</div>
            <div style={{ fontSize: 9, color: todayDone.decision ? "var(--terra)" : "var(--text3)", marginTop: 2 }}>{todayDone.decision ? "완료 ✓" : "미완료"}</div>
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

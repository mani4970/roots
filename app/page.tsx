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
  const [lastQT, setLastQT] = useState<any>(null);
  const [todayVerse, setTodayVerse] = useState<any>(null);
  const [todayDone, setTodayDone] = useState({ qt: false, prayer: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (p) setProfile(p);
      const { data: qt } = await supabase.from("qt_records").select("bible_ref,key_verse,created_at")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (qt) setLastQT(qt);
      const today = new Date().toISOString().split("T")[0];
      const { data: ci } = await supabase.from("daily_checkins").select("verse,mission").eq("user_id", user.id).eq("date", today).maybeSingle();
      if (ci) setTodayVerse(ci);
      const { data: tqt } = await supabase.from("qt_records").select("id").eq("user_id", user.id).eq("date", today).maybeSingle();
      const { data: tc } = await supabase.from("daily_checkins").select("id").eq("user_id", user.id).eq("date", today).maybeSingle();
      setTodayDone({ qt: !!tqt, prayer: !!tc });
      setLoading(false);
    }
    load();
  }, []);

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
      {/* 헤더 */}
      <div style={{ background: "var(--bg)", padding: "56px 20px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="header-greeting">Good morning,</div>
          <div className="header-title">{profile?.name ?? "성도"}님의<br /><em>정원</em></div>
        </div>
        <button onClick={logout} style={{ background: "none", border: "none", color: "var(--text3)", marginTop: 8 }}>
          <LogOut size={18} />
        </button>
      </div>

      {/* 나무 */}
      <TreeGrowth days={streak} />

      {/* 오늘의 말씀 */}
      <div style={{ padding: "0 16px 14px" }}>
        <div className="sec-label">오늘의 말씀</div>
        <div className="card-sage">
          <div style={{ fontSize: 9, fontWeight: 700, color: "var(--sage)", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 8 }}>
            {todayVerse?.verse ? "오늘 받은 말씀" : "아직 말씀을 받지 않았어요"}
          </div>
          {todayVerse?.verse ? (
            <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.7, fontStyle: "italic", fontFamily: "'Fraunces', serif" }}>
              "{todayVerse.verse}"
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6 }}>
              오늘의 감정을 선택하면 맞춤 말씀을 받을 수 있어요
            </div>
          )}
          <Link href="/checkin">
            <button className="btn-sage" style={{ marginTop: 12 }}>
              {todayVerse ? "말씀 다시 보기" : "오늘의 말씀 받기"} <ChevronRight size={16} />
            </button>
          </Link>
        </div>
      </div>

      {/* 오늘의 결단 */}
      {todayVerse?.mission && (
        <div style={{ padding: "0 16px 14px" }}>
          <div className="sec-label">오늘의 결단</div>
          <div className="card-terra">
            <div style={{ fontSize: 9, fontWeight: 700, color: "var(--terra)", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 8 }}>AI 추천 결단</div>
            <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.65 }}>{todayVerse.mission}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, padding: "8px 10px", background: "rgba(255,255,255,0.6)", borderRadius: 10 }}>
              <div style={{ width: 18, height: 18, borderRadius: 5, border: "1.5px solid var(--terra)", flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: "var(--text2)" }}>오늘 이 결단을 실천할게요</span>
            </div>
          </div>
        </div>
      )}

      {/* 오늘의 루틴 */}
      <div style={{ padding: "0 16px 14px" }}>
        <div className="sec-label">오늘의 루틴</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { label: "큐티", href: "/qt", done: todayDone.qt, icon: "📖" },
            { label: "기도", href: "/prayer", done: todayDone.prayer, icon: "🙏" },
            { label: "결단", href: "/checkin", done: !!todayVerse?.mission, icon: "✊" },
          ].map(({ label, href, done, icon }) => (
            <Link key={href} href={href} style={{ flex: 1 }}>
              <div style={{ background: done ? "var(--sage-light)" : "var(--white)", border: `1px solid ${done ? "#C5DEC3" : "var(--border)"}`, borderRadius: 16, padding: "14px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: done ? "var(--sage)" : "var(--text)" }}>{label}</div>
                <div style={{ fontSize: 9, color: done ? "var(--sage)" : "var(--text3)", marginTop: 2 }}>{done ? "완료 ✓" : "미완료"}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 최근 큐티 */}
      {lastQT && (
        <div style={{ padding: "0 16px 14px" }}>
          <div className="sec-label">최근 큐티</div>
          <div className="card">
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--terra)", marginBottom: 6 }}>{lastQT.bible_ref}</div>
            <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6, fontStyle: "italic" }}>"{lastQT.key_verse}"</div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import TreeGrowth from "@/components/TreeGrowth";
import { createClient } from "@/lib/supabase";
import { Flame, ChevronRight, LogOut, Loader2 } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [lastQT, setLastQT] = useState<any>(null);
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
    <div style={{ minHeight: "100vh", background: "var(--dark)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{ fontSize: 40 }}>🌱</div>
      <Loader2 size={24} style={{ color: "var(--gold)" }} className="spin" />
    </div>
  );

  const streak = profile?.streak_days ?? 0;

  return (
    <div className="page">
      {/* 헤더 */}
      <div style={{ background: "var(--dark)", padding: "56px 20px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ color: "var(--muted)", fontSize: 12, marginBottom: 4 }}>좋은 아침이에요</p>
          <h1 style={{ color: "white", fontSize: 20, fontWeight: 600 }}>{profile?.name ?? "성도"}님의 정원</h1>
        </div>
        <button onClick={logout} style={{ background: "none", border: "none", color: "var(--muted)", marginTop: 4 }}>
          <LogOut size={18} />
        </button>
      </div>

      {/* 나무 */}
      <div style={{ background: "var(--dark)" }}>
        <TreeGrowth days={streak} />
      </div>

      {/* 연속 기록 */}
      <div style={{ background: "var(--dark)", padding: "0 20px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Flame size={14} style={{ color: "var(--gold)" }} />
          <span style={{ color: "var(--gold)", fontSize: 12, fontWeight: 500 }}>{streak}일 연속 기록 중</span>
        </div>
        <span style={{ color: "var(--muted)", fontSize: 12 }}>100일까지 {Math.max(0, 100-streak)}일 남았어요</span>
      </div>

      {/* CTA */}
      <div style={{ padding: "20px 16px 0" }}>
        <Link href="/checkin">
          <button className="btn-gold">
            오늘의 말씀 받기 <ChevronRight size={18} />
          </button>
        </Link>
      </div>

      {/* 최근 큐티 */}
      {lastQT && (
        <div style={{ padding: "20px 16px 0" }}>
          <p className="section-label">최근 큐티</p>
          <div className="card-dark">
            <p style={{ color: "var(--gold)", fontSize: 11, fontWeight: 500, marginBottom: 8 }}>{lastQT.bible_ref}</p>
            <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, lineHeight: 1.6, fontStyle: "italic" }}>"{lastQT.key_verse}"</p>
          </div>
        </div>
      )}

      {/* 오늘의 루틴 */}
      <div style={{ padding: "20px 16px 0" }}>
        <p className="section-label">오늘의 루틴</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { label: "큐티", href: "/qt", done: todayDone.qt, icon: "📖" },
            { label: "기도", href: "/prayer", done: todayDone.prayer, icon: "🙏" },
          ].map(({ label, href, done, icon }) => (
            <Link key={href} href={href}>
              <div style={{
                background: done ? "var(--dark)" : "white",
                border: `1px solid ${done ? "var(--dark-border)" : "var(--stone)"}`,
                borderRadius: 12, padding: 16
              }}>
                <span style={{ fontSize: 22, display: "block", marginBottom: 8 }}>{icon}</span>
                <p style={{ fontSize: 13, fontWeight: 500, color: done ? "var(--muted)" : "var(--dark)", textDecoration: done ? "line-through" : "none" }}>{label}</p>
                <p style={{ fontSize: 10, color: done ? "var(--gold)" : "var(--muted)", marginTop: 2 }}>
                  {done ? "완료 ✓" : "아직 안 했어요"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

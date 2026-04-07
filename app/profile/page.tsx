"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase";
import { Flame, LogOut, Loader2 } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [calendarDone, setCalendarDone] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ answered: 0, prayers: 0, community: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (data) setProfile(data);

    // 이번 달 큐티 날짜들
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
    const { data: qtDates } = await supabase.from("qt_records").select("date")
      .eq("user_id", user.id).gte("date", firstDay).lte("date", lastDay);
    if (qtDates) setCalendarDone(new Set(qtDates.map((r: any) => r.date)));

    // 통계
    const { count: answered } = await supabase.from("prayer_items").select("id", { count: "exact" }).eq("user_id", user.id).eq("is_answered", true);
    const { count: prayers } = await supabase.from("prayer_items").select("id", { count: "exact" }).eq("user_id", user.id);
    const { count: community } = await supabase.from("qt_records").select("id", { count: "exact" }).eq("user_id", user.id).eq("visibility", "all");
    setStats({ answered: answered ?? 0, prayers: prayers ?? 0, community: community ?? 0 });
    setLoading(false);
  }

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) return <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}><Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" /></div>;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const todayDate = now.getDate();
  const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="page">
      {/* 헤더 */}
      <div style={{ background: "var(--bg)", padding: "56px 20px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--sage-light)", border: "2px solid var(--sage)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "var(--sage-dark)" }}>
            {profile?.name?.[0] ?? "?"}
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{profile?.name}</h1>
            <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 2 }}>Roots 멤버</p>
          </div>
        </div>
        <button onClick={logout} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}><LogOut size={18} /></button>
      </div>

      {/* 핵심 통계 */}
      <div style={{ padding: "16px 16px 0", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[
          { label: "연속 기록", value: `${profile?.streak_days ?? 0}일`, color: "var(--sage-dark)", sub: "🔥" },
          { label: "총 큐티", value: `${profile?.total_days ?? 0}회`, color: "var(--text)", sub: "📖" },
          { label: "기도 응답", value: `${stats.answered}회`, color: "var(--terra-dark)", sub: "🙏" },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, padding: "14px 10px", textAlign: "center" }}>
            <p style={{ fontSize: 18, marginBottom: 2 }}>{s.sub}</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</p>
            <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 4 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* 신앙 여정 통계 */}
      <div style={{ padding: "14px 16px 0" }}>
        <div className="sec-label">나의 신앙 여정</div>
        <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 18, padding: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "기도 제목", value: stats.prayers, icon: "🙏", total: 50 },
              { label: "기도 응답", value: stats.answered, icon: "✨", total: 20 },
              { label: "커뮤니티 나눔", value: stats.community, icon: "🌿", total: 30 },
            ].map(s => (
              <div key={s.label}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: "var(--text2)", display: "flex", alignItems: "center", gap: 6 }}>
                    <span>{s.icon}</span>{s.label}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{s.value}회</span>
                </div>
                <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "var(--sage)", borderRadius: 2, width: `${Math.min((s.value / s.total) * 100, 100)}%`, transition: "width 0.7s ease" }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 6 }}>
            <Flame size={14} style={{ color: "var(--terra-dark)" }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text)" }}>{profile?.streak_days ?? 0}일 연속으로 말씀 앞에 앉았어요</span>
          </div>
        </div>
      </div>

      {/* 이번 달 큐티 캘린더 */}
      <div style={{ padding: "14px 16px 0" }}>
        <div className="sec-label">
          {year}년 {month + 1}월 큐티 캘린더
        </div>
        <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 18, padding: 16 }}>
          {/* 요일 헤더 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 8 }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 10, color: "var(--text3)", fontWeight: 600, padding: "2px 0" }}>{d}</div>
            ))}
          </div>
          {/* 날짜 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const done = calendarDone.has(dateStr);
              const isToday = day === todayDate;
              const isFuture = day > todayDate;
              return (
                <div key={day} style={{ textAlign: "center", padding: "4px 2px" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: isToday ? 700 : 400, background: done ? "var(--sage)" : isToday ? "var(--bg3)" : "transparent", color: done ? "var(--bg)" : isToday ? "var(--sage)" : isFuture ? "var(--border)" : "var(--text2)", border: isToday ? "2px solid var(--sage)" : "none" }}>
                    {done ? "✓" : day}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 이번 달 통계 */}
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "var(--text3)" }}>이번 달 큐티</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--sage-dark)" }}>{calendarDone.size}일 / {todayDate}일</span>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

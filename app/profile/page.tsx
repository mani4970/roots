"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase";
import { Flame, LogOut, Loader2 } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [weekDone, setWeekDone] = useState<boolean[]>(Array(7).fill(false));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) setProfile(data);
      const today = new Date(), dow = today.getDay(), monday = new Date(today);
      monday.setDate(today.getDate() - ((dow + 6) % 7));
      const week = await Promise.all(Array.from({ length: 7 }, async (_, i) => {
        const d = new Date(monday); d.setDate(monday.getDate() + i);
        const { data: qt } = await supabase.from("qt_records").select("id").eq("user_id", user.id).eq("date", d.toISOString().split("T")[0]).maybeSingle();
        return !!qt;
      }));
      setWeekDone(week);
      setLoading(false);
    }
    load();
  }, []);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" /></div>;

  const WEEK = ["월", "화", "수", "목", "금", "토", "일"];
  const todayIdx = ((new Date().getDay() + 6) % 7);

  return (
    <div className="page">
      <div style={{ background: "var(--bg)", padding: "56px 20px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--terra-light)", border: "2px solid var(--terra)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "var(--terra-dark)", fontFamily: "'Fraunces', serif" }}>
            {profile?.name?.[0] ?? "?"}
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", fontFamily: "'Fraunces', serif" }}>{profile?.name}</h1>
            <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 2 }}>Roots 멤버</p>
          </div>
        </div>
        <button onClick={logout} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}><LogOut size={18} /></button>
      </div>

      <div style={{ padding: "16px 16px 0", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[
          { label: "연속 기록", value: `${profile?.streak_days ?? 0}일`, color: "var(--terra)" },
          { label: "총 큐티", value: `${profile?.total_days ?? 0}회`, color: "var(--text)" },
          { label: "100일까지", value: `${Math.max(0, 100 - (profile?.streak_days ?? 0))}일`, color: "var(--text)" },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: 16, padding: "14px 10px", textAlign: "center" }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: "'Fraunces', serif" }}>{s.value}</p>
            <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 4 }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div style={{ padding: "0 16px" }}>
        <div className="sec-label">이번 주</div>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {WEEK.map((day, i) => (
              <div key={day} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, background: i === todayIdx ? "transparent" : weekDone[i] ? "var(--sage)" : "var(--bg2)", color: i === todayIdx ? "var(--sage)" : weekDone[i] ? "white" : "var(--text3)", border: i === todayIdx ? "2px solid var(--sage)" : "none" }}>
                  {weekDone[i] && i !== todayIdx ? "✓" : day}
                </div>
                <span style={{ fontSize: 9, color: "var(--text3)" }}>{day}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid var(--border)", marginTop: 14, paddingTop: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <Flame size={14} style={{ color: "var(--terra)" }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text)" }}>{profile?.streak_days ?? 0}일 연속 기록 중</span>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

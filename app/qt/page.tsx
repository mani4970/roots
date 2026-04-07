"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase";
import { ChevronRight, Loader2, Plus } from "lucide-react";

export default function QTPage() {
  const router = useRouter();
  const [records, setRecords] = useState<any[]>([]);
  const [todayDone, setTodayDone] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const today = new Date().toISOString().split("T")[0];
      const { data: tqt } = await supabase.from("qt_records").select("id").eq("user_id", user.id).eq("date", today).maybeSingle();
      setTodayDone(!!tqt);
      const { data } = await supabase.from("qt_records").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
      if (data) setRecords(data);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="page">
      <div style={{ background: "var(--bg)", padding: "56px 20px 18px", borderBottom: "1px solid var(--border)" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text)", fontFamily: "'Fraunces', serif" }}>큐티</h1>
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
          <button onClick={() => router.push("/qt/write")} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
            <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 4 }}>첫 큐티를 시작해보세요</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {records.map(r => (
              <button key={r.id} onClick={() => router.push(`/qt/record?id=${r.id}`)} className="qt-record-item" style={{ width: "100%", textAlign: "left", cursor: "pointer" }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 10, color: "var(--text3)", marginBottom: 4 }}>
                    {new Date(r.date).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
                  </p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--terra)", marginBottom: 3 }}>{r.bible_ref}</p>
                  {r.key_verse && <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.4 }}>"{r.key_verse.slice(0, 40)}..."</p>}
                </div>
                <ChevronRight size={16} style={{ color: "var(--text3)", flexShrink: 0 }} />
              </button>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

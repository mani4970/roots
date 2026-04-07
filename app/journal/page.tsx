"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase";
import { ChevronRight, Loader2 } from "lucide-react";

export default function JournalPage() {
  const router = useRouter();
  const [records, setRecords] = useState<any[]>([]);
  const [oneYearAgo, setOneYearAgo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data } = await supabase.from("qt_records").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
      if (data) setRecords(data);
      const d = new Date(); d.setFullYear(d.getFullYear() - 1);
      const { data: old } = await supabase.from("qt_records").select("*").eq("user_id", user.id).eq("date", d.toISOString().split("T")[0]).maybeSingle();
      if (old) setOneYearAgo(old);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" /></div>;

  return (
    <div className="page">
      <div style={{ background: "var(--bg)", padding: "56px 20px 18px", borderBottom: "1px solid var(--border)" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text)", fontFamily: "'Fraunces', serif" }}>기록</h1>
        <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 4 }}>나의 신앙 여정을 돌아봐요</p>
      </div>

      {oneYearAgo && (
        <div style={{ padding: "16px 16px 0" }}>
          <div className="sec-label">1년 전 오늘</div>
          <div style={{ border: "1px solid rgba(196,149,106,0.3)", borderRadius: 18, overflow: "hidden" }}>
            <div style={{ background: "var(--terra-light)", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ background: "var(--terra)", color: "white", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>1년 전</span>
              <span style={{ color: "var(--terra-dark)", fontSize: 12, fontWeight: 500 }}>{oneYearAgo.bible_ref}</span>
            </div>
            <div style={{ background: "var(--white)", padding: 16 }}>
              <p style={{ fontSize: 13, lineHeight: 1.65, fontStyle: "italic", color: "var(--text)", fontFamily: "'Fraunces', serif" }}>"{oneYearAgo.key_verse}"</p>
              {oneYearAgo.meditation && <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>{oneYearAgo.meditation}</p>}
              <div style={{ borderTop: "1px solid var(--border)", marginTop: 12, paddingTop: 10 }}>
                <p style={{ color: "var(--terra)", fontSize: 12 }}>1년 전의 당신이 지금 여기까지 자랐어요 🌱</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: "16px 16px 0" }}>
        <div className="sec-label">큐티 기록</div>
        {records.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <p style={{ fontSize: 32, marginBottom: 10 }}>📖</p>
            <p style={{ color: "var(--text3)", fontSize: 14 }}>아직 큐티 기록이 없어요</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {records.map(r => (
              <button key={r.id} onClick={() => router.push(`/qt/record?id=${r.id}`)} className="qt-record-item" style={{ width: "100%", textAlign: "left", cursor: "pointer" }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 10, color: "var(--text3)", marginBottom: 4 }}>{new Date(r.date).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--terra)", marginBottom: 3 }}>{r.bible_ref}</p>
                  {r.key_verse && <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.4 }}>"{r.key_verse.slice(0, 50)}..."</p>}
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

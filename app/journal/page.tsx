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
      const { data } = await supabase.from("qt_records").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
      if (data) setRecords(data);
      const d = new Date(); d.setFullYear(d.getFullYear()-1);
      const { data: old } = await supabase.from("qt_records").select("*").eq("user_id", user.id).eq("date", d.toISOString().split("T")[0]).maybeSingle();
      if (old) setOneYearAgo(old);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><Loader2 size={24} style={{ color: "var(--gold)" }} className="spin" /></div>;

  return (
    <div className="page">
      <div style={{ background: "var(--dark)", padding: "56px 20px 24px" }}>
        <h1 style={{ color: "white", fontSize: 20, fontWeight: 600 }}>기록</h1>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>나의 신앙 여정을 돌아봐요</p>
      </div>

      {oneYearAgo && (
        <div style={{ padding: "20px 16px 0" }}>
          <p className="section-label">1년 전 오늘</p>
          <div style={{ border: "1px solid rgba(232,197,71,0.4)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ background: "var(--dark)", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ background: "var(--gold)", color: "var(--dark)", fontSize: 10, fontWeight: 600, padding: "2px 10px", borderRadius: 20 }}>1년 전</span>
              <span style={{ color: "var(--muted)", fontSize: 12 }}>{oneYearAgo.bible_ref}</span>
            </div>
            <div style={{ background: "white", padding: 16 }}>
              <p style={{ fontSize: 13, lineHeight: 1.6, fontStyle: "italic", color: "var(--dark)" }}>"{oneYearAgo.key_verse}"</p>
              {oneYearAgo.meditation && <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 8 }}>{oneYearAgo.meditation}</p>}
              <div style={{ borderTop: "1px solid var(--stone)", marginTop: 12, paddingTop: 10 }}>
                <p style={{ color: "var(--gold)", fontSize: 12 }}>1년 전의 당신이 지금 여기까지 자랐어요 🌱</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: "20px 16px 0" }}>
        <p className="section-label">큐티 기록</p>
        {records.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <p style={{ fontSize: 32, marginBottom: 10 }}>📖</p>
            <p style={{ color: "var(--muted)", fontSize: 14 }}>아직 큐티 기록이 없어요</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {records.map(r => (
              <div key={r.id} className="card-white">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <p style={{ color: "var(--muted)", fontSize: 10, marginBottom: 4 }}>{new Date(r.date).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}</p>
                    <p style={{ color: "var(--gold)", fontSize: 12, fontWeight: 500 }}>{r.bible_ref}</p>
                  </div>
                  <ChevronRight size={16} style={{ color: "var(--muted)" }} />
                </div>
                {r.key_verse && <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--dark)" }}>"{r.key_verse}"</p>}
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

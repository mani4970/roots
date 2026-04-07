"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";

function ResultContent() {
  const params = useSearchParams();
  const router = useRouter();
  const emotions = params.get("emotions")?.split(",") ?? [];
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/verse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emotions }),
    })
      .then(r => r.json())
      .then(async data => {
        setResult(data);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const today = new Date().toISOString().split("T")[0];
          await supabase.from("daily_checkins").upsert({
            user_id: user.id,
            date: today,
            emotions,
            verse: data.verse,
            reference: data.reference,
            message: data.message,
            mission: data.mission,
            completed_mission: false,
          }, { onConflict: "user_id,date" });
        }
      })
      .catch(() => setResult({
        verse: "수고하고 무거운 짐 진 자들아 다 내게로 오라 내가 너희를 쉬게 하리라",
        reference: "마태복음 11:28",
        message: "지치고 힘든 마음을 주님께 내려놓는 하루가 되길 바랍니다. 혼자 짊어지지 않아도 됩니다.",
        mission: "오늘 5분만 조용한 곳에서 눈 감고 주님께 솔직하게 마음을 털어놓아 보세요.",
      }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <Loader2 size={32} style={{ color: "var(--sage)" }} className="spin" />
      <p style={{ color: "var(--text3)", fontSize: 14 }}>마음에 맞는 말씀을 찾고 있어요...</p>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: 40 }} className="fade-in">
      <div style={{ background: "var(--bg)", padding: "56px 20px 20px", borderBottom: "1px solid var(--border)" }}>
        <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", marginBottom: 14, cursor: "pointer" }}>
          <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>돌아가기</span>
        </button>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text)", fontFamily: "'Fraunces', serif" }}>오늘의 말씀</h1>
        <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 4 }}>선택한 마음에 맞는 말씀이에요</p>
      </div>

      <div style={{ padding: "20px 16px 0", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* 말씀 카드 */}
        <div className="card-sage">
          <p style={{ fontSize: 10, fontWeight: 700, color: "var(--sage-dark)", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 10 }}>
            {result?.reference}
          </p>
          <p style={{ fontSize: 15, color: "var(--text)", lineHeight: 1.7, fontStyle: "italic", fontFamily: "'Fraunces', serif" }}>
            "{result?.verse}"
          </p>
          <div style={{ borderTop: "1px solid rgba(122,158,118,0.25)", marginTop: 14, paddingTop: 12 }}>
            <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.65 }}>{result?.message}</p>
          </div>
        </div>

        {/* 결단 카드 */}
        <div className="card-terra">
          <p style={{ fontSize: 9, fontWeight: 700, color: "var(--terra)", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 8 }}>
            오늘의 결단 미션
          </p>
          <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.65 }}>{result?.mission}</p>
        </div>

        {/* 홈으로만 */}
        <button onClick={() => router.push("/")} className="btn-primary" style={{ marginTop: 4 }}>
          홈에서 확인하기 →
        </button>
        <p style={{ textAlign: "center", fontSize: 11, color: "var(--text3)" }}>
          홈에 말씀과 결단이 저장돼요
        </p>
      </div>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={32} style={{ color: "var(--sage)" }} className="spin" />
      </div>
    }>
      <ResultContent />
    </Suspense>
  );
}

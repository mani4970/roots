"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";

function ResultContent() {
  const params = useSearchParams();
  const router = useRouter();
  const emotions = params.get("emotions")?.split(",") ?? [];
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/verse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emotions }) })
      .then(r => r.json()).then(setResult)
      .catch(() => setResult({
        verse: "수고하고 무거운 짐 진 자들아 다 내게로 오라 내가 너희를 쉬게 하리라",
        reference: "마태복음 11:28", message: "지치고 힘든 마음을 주님께 내려놓는 하루가 되길 바랍니다.",
        mission: "오늘 5분만 조용한 곳에서 눈 감고 주님께 솔직하게 털어놓아 보세요.",
      }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--warm)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <Loader2 size={32} style={{ color: "var(--gold)" }} className="spin" />
      <p style={{ color: "var(--muted)", fontSize: 14 }}>마음에 맞는 말씀을 찾고 있어요...</p>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--warm)", paddingBottom: 40 }}>
      <div style={{ background: "var(--dark)", padding: "56px 20px 24px" }}>
        <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--muted)", marginBottom: 16 }}>
          <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>돌아가기</span>
        </button>
        <h1 style={{ color: "white", fontSize: 20, fontWeight: 600 }}>오늘의 말씀</h1>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>선택한 마음에 맞는 말씀이에요</p>
      </div>

      <div style={{ padding: "20px 16px 0", display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="card-dark">
          <p style={{ color: "var(--gold)", fontSize: 11, fontWeight: 600, marginBottom: 10, letterSpacing: 0.3 }}>{result?.reference}</p>
          <p style={{ color: "rgba(255,255,255,0.9)", fontSize: 15, lineHeight: 1.7, fontStyle: "italic" }}>"{result?.verse}"</p>
          <div style={{ borderTop: "1px solid var(--dark-border)", marginTop: 14, paddingTop: 14 }}>
            <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6 }}>{result?.message}</p>
          </div>
        </div>

        <div className="card-white">
          <p style={{ fontSize: 10, fontWeight: 600, color: "var(--gold)", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 8 }}>오늘의 미션</p>
          <p style={{ fontSize: 13, color: "var(--dark)", lineHeight: 1.6 }}>{result?.mission}</p>
        </div>

        <Link href="/qt">
          <button className="btn-gold" style={{ marginTop: 4 }}>
            큐티 시작하기 <ChevronRight size={18} />
          </button>
        </Link>
        <button className="btn-outline" onClick={() => router.push("/")}>홈으로 돌아가기</button>
      </div>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><Loader2 size={32} style={{ color: "var(--gold)" }} className="spin" /></div>}>
      <ResultContent />
    </Suspense>
  );
}

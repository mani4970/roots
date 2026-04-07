"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { ChevronLeft, Loader2 } from "lucide-react";

const LABELS: Record<string, string> = {
  opening_prayer: "들어가는 기도",
  bible_ref: "본문",
  summary: "본문 요약",
  key_verse: "붙잡은 말씀",
  key_verse_reason: "와닿은 이유",
  meditation: "느낌과 묵상",
  application: "적용",
  decision: "결단",
  closing_prayer: "올려드리는 기도",
};

function RecordContent() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;
      const supabase = createClient();
      const { data } = await supabase.from("qt_records").select("*").eq("id", id).single();
      if (data) setRecord(data);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" /></div>;
  if (!record) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: "var(--text3)" }}>기록을 찾을 수 없어요</p></div>;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: 40 }}>
      <div style={{ background: "var(--bg)", padding: "56px 20px 18px", borderBottom: "1px solid var(--border)" }}>
        <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", marginBottom: 14, cursor: "pointer" }}>
          <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>돌아가기</span>
        </button>
        <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>{new Date(record.date).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}</p>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--terra)", fontFamily: "'Fraunces', serif" }}>{record.bible_ref}</h1>
      </div>

      <div style={{ padding: "16px 16px 0", display: "flex", flexDirection: "column", gap: 10 }}>
        {Object.entries(LABELS).map(([key, label]) => {
          const value = record[key];
          if (!value) return null;
          return (
            <div key={key} className="card">
              <p style={{ fontSize: 9, fontWeight: 700, color: "var(--text3)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>{label}</p>
              <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.65 }}>{value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RecordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" /></div>}>
      <RecordContent />
    </Suspense>
  );
}

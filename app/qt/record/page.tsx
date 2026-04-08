"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { ChevronLeft, Loader2, Share2, Check, Copy } from "lucide-react";

function RecordContent() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id) return;
      const supabase = createClient();
      const { data } = await supabase.from("qt_records").select("*").eq("id", id).single();
      if (data) { setRecord(data); setShared(data.visibility === "all"); }
      setLoading(false);
    }
    load();
  }, [id]);

  async function shareToComm() {
    setSharing(true);
    const supabase = createClient();
    await supabase.from("qt_records").update({ visibility: shared ? "private" : "all" }).eq("id", id);
    setShared(!shared);
    setSharing(false);
  }

  function copyAll() {
    if (!record) return;
    // 순서: 날짜+본문 → 들어가는기도 → 본문요약 → 붙잡은말씀 → 느낌과묵상 → 적용과결단 → 올려드리는기도
    const date = new Date(record.date).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
    const decisions = record.decision
      ? record.decision.split("\n").filter((d: string) => d.trim()).map((d: string, i: number) => `${i+1}. ${d}`).join("\n")
      : "";

    const parts = [
      `📖 ${date} · ${record.bible_ref}`,
      record.opening_prayer ? `\n들어가는 기도\n${record.opening_prayer}` : "",
      record.summary ? `\n본문 요약\n${record.summary}` : "",
      record.key_verse ? `\n붙잡은 말씀\n${record.key_verse}` : "",
      record.meditation ? `\n느낌과 묵상\n${record.meditation}` : "",
      (record.application || decisions) ? `\n적용과 결단\n${record.application ?? ""}${decisions ? "\n" + decisions : ""}` : "",
      record.closing_prayer ? `\n올려드리는 기도\n${record.closing_prayer}` : "",
      "\n\n— Roots 앱",
    ].filter(Boolean).join("\n");

    navigator.clipboard.writeText(parts).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) return <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}><Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" /></div>;
  if (!record) return <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: "var(--text3)" }}>기록을 찾을 수 없어요</p></div>;

  const SECTIONS = [
    { key: "opening_prayer", label: "들어가는 기도" },
    { key: "summary", label: "본문 요약" },
    { key: "key_verse", label: "붙잡은 말씀", italic: true },
    { key: "meditation", label: "느낌과 묵상" },
    { key: "application", label: "적용" },
    { key: "decision", label: "결단", isDecision: true },
    { key: "closing_prayer", label: "올려드리는 기도" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: 40 }}>
      <div style={{ background: "var(--bg)", padding: "56px 20px 18px", borderBottom: "1px solid var(--border)" }}>
        <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", marginBottom: 14, cursor: "pointer" }}>
          <ChevronLeft size={18} /><span style={{ fontSize: 13, color: "var(--text3)" }}>돌아가기</span>
        </button>
        <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>
          {new Date(record.date).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
        </p>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--terra-dark)" }}>{record.bible_ref}</h1>
        {record.bible_version && <span style={{ fontSize: 10, color: "var(--text3)", marginTop: 2, display: "block" }}>{record.bible_version}</span>}
      </div>

      {/* 액션 버튼 */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", gap: 8 }}>
        <button onClick={copyAll} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg2)", cursor: "pointer", fontSize: 12, color: copied ? "var(--sage-dark)" : "var(--text2)" }}>
          <Copy size={14} /> {copied ? "복사됨! ✓" : "전체 복사"}
        </button>
        <button onClick={shareToComm} disabled={sharing} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 12, border: `1px solid ${shared ? "var(--sage)" : "var(--border)"}`, background: shared ? "var(--sage-light)" : "var(--bg2)", cursor: "pointer", fontSize: 12, color: shared ? "var(--sage-dark)" : "var(--text2)" }}>
          {sharing ? <Loader2 size={14} className="spin" /> : shared ? <Check size={14} /> : <Share2 size={14} />}
          {shared ? "공유 중" : "커뮤니티 나누기"}
        </button>
      </div>

      <div style={{ padding: "16px 16px 0", display: "flex", flexDirection: "column", gap: 10 }}>
        {SECTIONS.map(({ key, label, italic, isDecision }) => {
          const value = record[key];
          if (!value) return null;
          return (
            <div key={key} className="card">
              <p style={{ fontSize: 9, fontWeight: 700, color: "var(--text3)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>{label}</p>
              {isDecision ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {value.split("\n").filter((d: string) => d.trim()).map((d: string, i: number) => (
                    <p key={i} style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6 }}>
                      <span style={{ fontWeight: 700, color: "var(--sage-dark)" }}>{i + 1}.</span> {d}
                    </p>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.65, fontStyle: italic ? "italic" : "normal" }}>{value}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RecordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}><Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" /></div>}>
      <RecordContent />
    </Suspense>
  );
}

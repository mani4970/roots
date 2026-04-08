"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { ChevronLeft, Loader2, Share2, Check, Copy, Globe, Lock } from "lucide-react";

function RecordContent() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [selectedShare, setSelectedShare] = useState<"all" | string>("all"); // "all" or groupId
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
      const { data } = await supabase.from("qt_records").select("*").eq("id", id).single();
      if (data) { setRecord(data); setShared(data.visibility === "all" || (data.visibility ?? "").startsWith("group_")); }
      // 내가 속한 그룹 로드
      const savedGroups = localStorage.getItem("community_groups");
      if (savedGroups && user) {
        const all = JSON.parse(savedGroups);
        const mine = all.filter((g: any) => g.members.includes(user.id));
        setMyGroups(mine);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  async function doShare() {
    setSharing(true);
    const supabase = createClient();
    const newVisibility = selectedShare === "all" ? "all" : `group_${selectedShare}`;
    await supabase.from("qt_records").update({ visibility: newVisibility, group_id: selectedShare === "all" ? null : selectedShare }).eq("id", id);
    setShared(true);
    setSharing(false);
    setShowShareModal(false);
  }

  async function unshare() {
    const supabase = createClient();
    await supabase.from("qt_records").update({ visibility: "private", group_id: null }).eq("id", id);
    setShared(false);
  }

  function copyAll() {
    if (!record) return;
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
    { key: "application", label: "성품 (적용)" },
    { key: "decision", label: "행동 (결단)", isDecision: true },
    { key: "closing_prayer", label: "올려드리는 기도" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: 40 }}>
      <div style={{ background: "var(--bg)", padding: "56px 20px 18px", borderBottom: "1px solid var(--border)" }}>
        <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", marginBottom: 14, cursor: "pointer" }}>
          <ChevronLeft size={18} /><span style={{ fontSize: 13 }}>돌아가기</span>
        </button>
        <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>
          {new Date(record.date).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
        </p>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--terra-dark)" }}>{record.bible_ref}</h1>
      </div>

      {/* 액션 버튼 */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", gap: 8 }}>
        <button onClick={copyAll} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg2)", cursor: "pointer", fontSize: 12, color: copied ? "var(--sage-dark)" : "var(--text2)" }}>
          <Copy size={14} /> {copied ? "복사됨! ✓" : "전체 복사"}
        </button>
        {shared ? (
          <button onClick={unshare} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 12, border: "1px solid var(--sage)", background: "var(--sage-light)", cursor: "pointer", fontSize: 12, color: "var(--sage-dark)" }}>
            <Check size={14} /> 공유 중 (취소)
          </button>
        ) : (
          <button onClick={() => setShowShareModal(true)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg2)", cursor: "pointer", fontSize: 12, color: "var(--text2)" }}>
            <Share2 size={14} /> 나누기
          </button>
        )}
      </div>

      {/* 공개 범위 선택 모달 */}
      {showShareModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px" }}>
          <div style={{ background: "var(--bg2)", width: "100%", maxWidth: 390, borderRadius: 24, padding: 24, border: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>큐티 나누기</h2>
            <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 16 }}>어디에 나눌지 선택해주세요</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {/* 전체 공개 */}
              <button onClick={() => setSelectedShare("all")} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px", borderRadius: 14, border: `1px solid ${selectedShare === "all" ? "var(--sage)" : "var(--border)"}`, background: selectedShare === "all" ? "var(--sage-light)" : "var(--bg3)", cursor: "pointer", textAlign: "left" }}>
                <Globe size={20} style={{ color: selectedShare === "all" ? "var(--sage-dark)" : "var(--text3)", flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: selectedShare === "all" ? "var(--sage-dark)" : "var(--text)" }}>전체 커뮤니티</p>
                  <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>모든 Roots 사용자에게 공개</p>
                </div>
                {selectedShare === "all" && <Check size={16} style={{ color: "var(--sage)", marginLeft: "auto" }} />}
              </button>

              {/* 내 그룹들 */}
              {myGroups.length > 0 && (
                <>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", marginTop: 4 }}>내 그룹</p>
                  {myGroups.map(g => (
                    <button key={g.id} onClick={() => setSelectedShare(g.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px", borderRadius: 14, border: `1px solid ${selectedShare === g.id ? "var(--sage)" : "var(--border)"}`, background: selectedShare === g.id ? "var(--sage-light)" : "var(--bg3)", cursor: "pointer", textAlign: "left" }}>
                      <Lock size={20} style={{ color: selectedShare === g.id ? "var(--sage-dark)" : "var(--text3)", flexShrink: 0 }} />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: selectedShare === g.id ? "var(--sage-dark)" : "var(--text)" }}>{g.name}</p>
                        <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{g.members.length}명 · {g.isPublic ? "공개" : "비공개"} 그룹</p>
                      </div>
                      {selectedShare === g.id && <Check size={16} style={{ color: "var(--sage)", marginLeft: "auto" }} />}
                    </button>
                  ))}
                </>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowShareModal(false)} className="btn-outline" style={{ flex: 1 }}>취소</button>
              <button onClick={doShare} disabled={sharing} className="btn-sage" style={{ flex: 1 }}>
                {sharing ? <Loader2 size={16} className="spin" /> : "나누기"}
              </button>
            </div>
          </div>
        </div>
      )}

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

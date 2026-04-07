"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase";
import { Heart, Loader2, BookOpen, Smile, Star, ChevronDown, ChevronUp } from "lucide-react";

const REACTIONS = [
  { id: "bless", label: "축복해요", icon: "🙏" },
  { id: "cheer", label: "응원해요", icon: "💪" },
  { id: "pray", label: "기도해요", icon: "✨" },
];

export default function CommunityPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"prayer" | "qt">("prayer");
  const [prayers, setPrayers] = useState<any[]>([]);
  const [qtShares, setQtShares] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [prayedIds, setPrayedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, Record<string, number>>>({});
  const [myReactions, setMyReactions] = useState<Record<string, string>>({});

  useEffect(() => { loadData(); }, [tab]);

  async function loadData() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    setUserId(user.id);

    // 이미 기도한 항목
    const saved = localStorage.getItem(`comm_prayed_${user.id}`);
    if (saved) setPrayedIds(new Set(JSON.parse(saved)));

    const myRx = localStorage.getItem(`comm_reactions_${user.id}`);
    if (myRx) setMyReactions(JSON.parse(myRx));

    if (tab === "prayer") {
      const { data } = await supabase.from("prayer_items")
        .select("*, profiles(name)").eq("visibility", "all").eq("is_answered", false)
        .order("created_at", { ascending: false });
      if (data) setPrayers(data);
    } else {
      const { data } = await supabase.from("qt_records")
        .select("*, profiles(name)").eq("visibility", "all")
        .order("created_at", { ascending: false }).limit(20);
      if (data) {
        setQtShares(data);
        // 반응 불러오기 (qt_reactions 테이블이 없으면 로컬로)
        const rxLocal = localStorage.getItem("comm_qt_reactions");
        if (rxLocal) setReactions(JSON.parse(rxLocal));
      }
    }
    setLoading(false);
  }

  async function prayTogether(id: string, count: number) {
    // 중복 방지
    if (prayedIds.has(id)) return;
    const supabase = createClient();
    await supabase.from("prayer_items").update({ prayer_count: count + 1 }).eq("id", id);
    const newArr = Array.from(prayedIds).concat(id);
const newSet = new Set(newArr);
setPrayedIds(newSet);
if (userId) localStorage.setItem(`comm_prayed_${userId}`, JSON.stringify(newArr));
    loadData();
  }

  function reactToQT(qtId: string, reactionId: string) {
    const current = reactions[qtId] ?? {};
    const myPrev = myReactions[qtId];
    let updated = { ...current };

    if (myPrev === reactionId) {
      // 취소
      updated[reactionId] = Math.max(0, (updated[reactionId] ?? 1) - 1);
      const newMy = { ...myReactions };
      delete newMy[qtId];
      setMyReactions(newMy);
      if (userId) localStorage.setItem(`comm_reactions_${userId}`, JSON.stringify(newMy));
    } else {
      // 이전 반응 취소
      if (myPrev) updated[myPrev] = Math.max(0, (updated[myPrev] ?? 1) - 1);
      // 새 반응
      updated[reactionId] = (updated[reactionId] ?? 0) + 1;
      const newMy = { ...myReactions, [qtId]: reactionId };
      setMyReactions(newMy);
      if (userId) localStorage.setItem(`comm_reactions_${userId}`, JSON.stringify(newMy));
    }

    const newRx = { ...reactions, [qtId]: updated };
    setReactions(newRx);
    localStorage.setItem("comm_qt_reactions", JSON.stringify(newRx));
  }

  return (
    <div className="page">
      <div style={{ background: "var(--bg)", padding: "56px 20px 16px", borderBottom: "1px solid var(--border)" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)" }}>커뮤니티</h1>
        <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 4 }}>함께 기도하고 말씀을 나눠요</p>
      </div>

      <div style={{ padding: "12px 16px", display: "flex", gap: 8, borderBottom: "1px solid var(--border)" }}>
        {(["prayer", "qt"] as const).map(k => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: "7px 16px", borderRadius: 20, fontSize: 12, fontWeight: 500, border: "none", cursor: "pointer", background: tab === k ? "var(--sage)" : "var(--bg2)", color: tab === k ? "var(--bg)" : "var(--text3)", outline: tab === k ? "none" : "1px solid var(--border)" }}>
            {k === "prayer" ? "🙏 중보기도" : "📖 큐티 나눔"}
          </button>
        ))}
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" /></div>
        ) : tab === "prayer" ? (
          prayers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>🙏</p>
              <p style={{ color: "var(--text3)", fontSize: 14 }}>아직 중보기도 요청이 없어요</p>
            </div>
          ) : prayers.map(p => (
            <div key={p.id} className="prayer-card">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--terra-light)", border: "1px solid rgba(196,149,106,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "var(--terra-dark)", flexShrink: 0 }}>
                  {p.is_anonymous ? "익" : (p.profiles?.name?.[0] ?? "?")}
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{p.is_anonymous ? "익명" : (p.profiles?.name ?? "성도")}</p>
                  <p style={{ fontSize: 10, color: "var(--text3)" }}>{new Date(p.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}</p>
                </div>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text)", marginBottom: 12 }}>{p.content}</p>
              <button
                onClick={() => prayTogether(p.id, p.prayer_count)}
                disabled={prayedIds.has(p.id)}
                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 500, padding: "7px 14px", borderRadius: 20, border: `1px solid ${prayedIds.has(p.id) ? "rgba(122,157,122,0.4)" : "var(--border)"}`, background: prayedIds.has(p.id) ? "var(--sage-light)" : "var(--bg3)", color: prayedIds.has(p.id) ? "var(--sage-dark)" : "var(--text2)", cursor: prayedIds.has(p.id) ? "default" : "pointer" }}>
                <Heart size={12} fill={prayedIds.has(p.id) ? "currentColor" : "none"} />
                {prayedIds.has(p.id) ? "기도했어요" : "함께 기도했어요"}{p.prayer_count > 0 ? ` · ${p.prayer_count}명` : ""}
              </button>
            </div>
          ))
        ) : (
          qtShares.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>📖</p>
              <p style={{ color: "var(--text3)", fontSize: 14 }}>아직 큐티 나눔이 없어요</p>
            </div>
          ) : qtShares.map(q => {
            const isExpanded = expandedId === q.id;
            const qRx = reactions[q.id] ?? {};
            const myRx = myReactions[q.id];
            return (
              <div key={q.id} className="card" style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--sage-light)", border: "1px solid rgba(122,157,122,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "var(--sage-dark)" }}>
                    {q.profiles?.name?.[0] ?? "?"}
                  </div>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{q.profiles?.name ?? "성도"}</p>
                    <p style={{ fontSize: 10, color: "var(--terra-dark)" }}>{q.bible_ref}</p>
                  </div>
                </div>

                {q.key_verse && (
                  <div style={{ background: "var(--sage-light)", borderRadius: 12, padding: "10px 12px", marginBottom: 8 }}>
                    <p style={{ fontSize: 13, color: "var(--beige)", lineHeight: 1.6, fontStyle: "italic" }}>"{q.key_verse}"</p>
                  </div>
                )}

                {/* 확장/축소 */}
                {q.meditation && (
                  <>
                    <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.55 }}>
                      {isExpanded ? q.meditation : `${q.meditation.slice(0, 80)}${q.meditation.length > 80 ? "..." : ""}`}
                    </p>
                    {q.meditation.length > 80 && (
                      <button onClick={() => setExpandedId(isExpanded ? null : q.id)} style={{ background: "none", border: "none", color: "var(--text3)", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                        {isExpanded ? <><ChevronUp size={12} />접기</> : <><ChevronDown size={12} />더 보기</>}
                      </button>
                    )}
                  </>
                )}

                {/* 결단 (확장 시) */}
                {isExpanded && q.decision && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", marginBottom: 6 }}>결단</p>
                    {q.decision.split("\n").filter((d: string) => d.trim()).map((d: string, i: number) => (
                      <p key={i} style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.5 }}><span style={{ fontWeight: 700, color: "var(--sage-dark)" }}>{i+1}.</span> {d}</p>
                    ))}
                  </div>
                )}

                {/* 반응 버튼 */}
                <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                  {REACTIONS.map(r => {
                    const isMyRx = myRx === r.id;
                    const count = qRx[r.id] ?? 0;
                    return (
                      <button key={r.id} onClick={() => reactToQT(q.id, r.id)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 20, border: `1px solid ${isMyRx ? "rgba(122,157,122,0.5)" : "var(--border)"}`, background: isMyRx ? "var(--sage-light)" : "var(--bg3)", cursor: "pointer", fontSize: 11, color: isMyRx ? "var(--sage-dark)" : "var(--text3)" }}>
                        <span style={{ fontSize: 12 }}>{r.icon}</span>
                        {r.label}{count > 0 ? ` ${count}` : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      <BottomNav />
    </div>
  );
}

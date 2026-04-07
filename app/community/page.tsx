"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase";
import { Heart, Loader2, BookOpen } from "lucide-react";

export default function CommunityPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"prayer" | "qt">("prayer");
  const [prayers, setPrayers] = useState<any[]>([]);
  const [qtShares, setQtShares] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [tab]);

  async function loadData() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    if (tab === "prayer") {
      const { data } = await supabase.from("prayer_items")
        .select("*, profiles(name)")
        .eq("visibility", "all").eq("is_answered", false)
        .order("created_at", { ascending: false });
      if (data) setPrayers(data);
    } else {
      const { data } = await supabase.from("qt_records")
        .select("*, profiles(name)")
        .eq("visibility", "all")
        .order("created_at", { ascending: false }).limit(20);
      if (data) setQtShares(data);
    }
    setLoading(false);
  }

  async function prayTogether(id: string, count: number) {
    const supabase = createClient();
    await supabase.from("prayer_items").update({ prayer_count: count + 1 }).eq("id", id);
    loadData();
  }

  return (
    <div className="page">
      <div style={{ background: "var(--bg)", padding: "56px 20px 16px", borderBottom: "1px solid var(--border)" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)" }}>커뮤니티</h1>
        <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 4 }}>함께 기도하고 말씀을 나눠요</p>
      </div>

      <div style={{ padding: "12px 16px", display: "flex", gap: 8, borderBottom: "1px solid var(--border)" }}>
        {(["prayer", "qt"] as const).map(k => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: "7px 16px", borderRadius: 20, fontSize: 12, fontWeight: 500, border: "none", cursor: "pointer", background: tab === k ? "var(--text)" : "var(--white)", color: tab === k ? "white" : "var(--text3)", outline: tab === k ? "none" : "1px solid var(--border)" }}>
            {k === "prayer" ? "🙏 중보기도" : "📖 큐티 나눔"}
          </button>
        ))}
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" />
          </div>
        ) : tab === "prayer" ? (
          prayers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>🙏</p>
              <p style={{ color: "var(--text3)", fontSize: 14 }}>아직 중보기도 요청이 없어요</p>
              <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 4 }}>기도 탭에서 중보기도를 요청해보세요</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {prayers.map(p => (
                <div key={p.id} className="prayer-card">
                  {/* 작성자 정보 — alignItems로 수정 */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--terra-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "var(--terra-dark)", flexShrink: 0 }}>
                      {p.is_anonymous ? "익" : (p.profiles?.name?.[0] ?? "?")}
                    </div>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}>
                        {p.is_anonymous ? "익명" : (p.profiles?.name ?? "성도")}
                      </p>
                      <p style={{ fontSize: 9, color: "var(--text3)" }}>
                        {new Date(p.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text)", marginBottom: 12 }}>{p.content}</p>
                  <button onClick={() => prayTogether(p.id, p.prayer_count)} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 500, padding: "7px 14px", borderRadius: 20, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text2)", cursor: "pointer" }}>
                    <Heart size={12} />
                    함께 기도했어요{p.prayer_count > 0 ? ` · ${p.prayer_count}명` : ""}
                  </button>
                </div>
              ))}
            </div>
          )
        ) : (
          qtShares.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>📖</p>
              <p style={{ color: "var(--text3)", fontSize: 14 }}>아직 큐티 나눔이 없어요</p>
              <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 4 }}>큐티 기록에서 나누기를 눌러보세요</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {qtShares.map(q => (
                <div key={q.id} className="card">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--sage-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "var(--sage-dark)" }}>
                      {q.profiles?.name?.[0] ?? "?"}
                    </div>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}>{q.profiles?.name ?? "성도"}</p>
                      <p style={{ fontSize: 9, color: "var(--terra)" }}>{q.bible_ref}</p>
                    </div>
                  </div>
                  {q.key_verse && (
                    <div style={{ background: "var(--sage-light)", borderRadius: 12, padding: "10px 12px", marginBottom: 8 }}>
                      <p style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.6, fontStyle: "italic" }}>"{q.key_verse}"</p>
                    </div>
                  )}
                  {q.meditation && (
                    <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.55 }}>{q.meditation.slice(0, 100)}{q.meditation.length > 100 ? "..." : ""}</p>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 10 }}>
                    <BookOpen size={12} style={{ color: "var(--text3)" }} />
                    <span style={{ fontSize: 10, color: "var(--text3)" }}>
                      {new Date(q.date).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      <BottomNav />
    </div>
  );
}

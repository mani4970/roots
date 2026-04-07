"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase";
import { Plus, CheckCircle, Loader2, Send } from "lucide-react";

export default function PrayerPage() {
  const router = useRouter();
  const [prayers, setPrayers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newPrayer, setNewPrayer] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [prayedIds, setPrayedIds] = useState<Set<string>>(new Set());

  useEffect(() => { loadPrayers(); }, []);

  async function loadPrayers() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    setUserId(user.id);
    const { data } = await supabase.from("prayer_items").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (data) setPrayers(data);
    // 이미 기도한 항목 로컬에서 불러오기
    const saved = localStorage.getItem(`prayed_${user.id}`);
    if (saved) setPrayedIds(new Set(JSON.parse(saved)));
    setLoading(false);
  }

  async function submit() {
    if (!newPrayer.trim() || !userId) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("prayer_items").insert({ user_id: userId, content: newPrayer.trim(), is_anonymous: false, visibility: "private" });
    setNewPrayer(""); setShowForm(false); setSaving(false);
    loadPrayers();
  }

  async function requestIntercession(id: string) {
    const supabase = createClient();
    await supabase.from("prayer_items").update({ visibility: "all" }).eq("id", id);
    loadPrayers();
  }

  async function markAnswered(id: string) {
    const testimony = prompt("기도 응답 간증을 나눠주세요 🙏");
    if (!testimony) return;
    const supabase = createClient();
    await supabase.from("prayer_items").update({ is_answered: true, testimony, answered_at: new Date().toISOString() }).eq("id", id);
    loadPrayers();
  }

  return (
    <div className="page">
      <div style={{ background: "var(--bg)", padding: "56px 20px 18px", borderBottom: "1px solid var(--border)" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)" }}>기도</h1>
        <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 4 }}>나의 기도제목을 기록해요</p>
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" /></div>
        ) : prayers.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>🙏</p>
            <p style={{ color: "var(--text3)", fontSize: 14 }}>아직 기도 제목이 없어요</p>
            <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 4 }}>+ 버튼으로 기도 제목을 적어보세요</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {prayers.map(p => (
              <div key={p.id} className={`prayer-card ${p.is_answered ? "answered" : ""}`}>
                {p.is_answered && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <CheckCircle size={14} style={{ color: "var(--terra-dark)" }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--terra-dark)" }}>기도 응답!</span>
                  </div>
                )}
                {p.visibility === "all" && !p.is_answered && (
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 600, color: "var(--sage-dark)", background: "var(--sage-light)", padding: "2px 8px", borderRadius: 20, border: "1px solid rgba(122,157,122,0.3)" }}>
                      중보기도 요청 중 · {p.prayer_count}명 기도 중
                    </span>
                  </div>
                )}
                <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 10, color: "var(--text)" }}>{p.content}</p>
                {p.testimony && <p style={{ color: "var(--text3)", fontSize: 12, lineHeight: 1.5, marginBottom: 10, fontStyle: "italic" }}>"{p.testimony}"</p>}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {!p.is_answered && (
                      <button onClick={() => markAnswered(p.id)} style={{ fontSize: 10, color: "var(--terra-dark)", border: "1px solid rgba(196,149,106,0.4)", padding: "5px 10px", borderRadius: 20, background: "none", cursor: "pointer" }}>
                        응답됐어요 🙌
                      </button>
                    )}
                    {!p.is_answered && p.visibility !== "all" && (
                      <button onClick={() => requestIntercession(p.id)} style={{ fontSize: 10, color: "var(--sage-dark)", border: "1px solid rgba(122,157,122,0.3)", padding: "5px 10px", borderRadius: 20, background: "var(--sage-light)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                        <Send size={10} /> 중보기도 요청
                      </button>
                    )}
                  </div>
                  <span style={{ fontSize: 10, color: "var(--text3)" }}>{new Date(p.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 기도 작성 폼 — 가운데 정렬 */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px" }}>
          <div style={{ background: "var(--bg2)", width: "100%", maxWidth: 390, borderRadius: 24, padding: 24, border: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>기도 제목 적기</h2>
            <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 14 }}>기본적으로 나만 볼 수 있어요.</p>
            <textarea className="textarea-field" rows={4} placeholder="기도 제목을 적어주세요..." value={newPrayer} onChange={e => setNewPrayer(e.target.value)} />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button className="btn-outline" onClick={() => setShowForm(false)} style={{ flex: 1 }}>취소</button>
              <button className="btn-sage" onClick={submit} disabled={saving || !newPrayer.trim()} style={{ flex: 1 }}>
                {saving ? <Loader2 size={16} className="spin" /> : "저장하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => setShowForm(true)} style={{ position: "fixed", bottom: 80, right: 16, width: 52, height: 52, background: "var(--sage)", border: "none", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30, cursor: "pointer" }}>
        <Plus size={22} style={{ color: "var(--bg)" }} />
      </button>

      <BottomNav />
    </div>
  );
}

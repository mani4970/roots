"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase";
import { Plus, Heart, CheckCircle, Loader2 } from "lucide-react";

export default function PrayerPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"my"|"community">("my");
  const [prayers, setPrayers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newPrayer, setNewPrayer] = useState("");
  const [isAnon, setIsAnon] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string|null>(null);

  useEffect(() => { loadPrayers(); }, [tab]);

  async function loadPrayers() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    setUserId(user.id);
    let q = supabase.from("prayer_items").select("*").order("created_at", { ascending: false });
    if (tab === "my") q = q.eq("user_id", user.id);
    const { data } = await q;
    if (data) setPrayers(data);
    setLoading(false);
  }

  async function submit() {
    if (!newPrayer.trim() || !userId) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("prayer_items").insert({ user_id: userId, content: newPrayer.trim(), is_anonymous: isAnon, visibility: "all" });
    setNewPrayer(""); setIsAnon(false); setShowForm(false); setSaving(false); loadPrayers();
  }

  async function pray(id: string, count: number) {
    const supabase = createClient();
    await supabase.from("prayer_items").update({ prayer_count: count + 1 }).eq("id", id);
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
      <div style={{ background: "var(--bg)", padding: "56px 20px 16px", borderBottom: "1px solid var(--border)" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text)", fontFamily: "'Fraunces', serif" }}>기도</h1>
        <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 4 }}>함께 기도하고 응답을 나눠요</p>
      </div>

      <div style={{ padding: "12px 16px", display: "flex", gap: 8, borderBottom: "1px solid var(--border)" }}>
        {(["my", "community"] as const).map(k => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: "7px 16px", borderRadius: 20, fontSize: 12, fontWeight: 500, border: "none", cursor: "pointer", background: tab === k ? "var(--text)" : "var(--white)", color: tab === k ? "white" : "var(--text3)", outline: tab === k ? "none" : "1px solid var(--border)" }}>
            {k === "my" ? "내 기도" : "커뮤니티"}
          </button>
        ))}
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" /></div>
        ) : prayers.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>🙏</p>
            <p style={{ color: "var(--text3)", fontSize: 14 }}>아직 기도 제목이 없어요</p>
          </div>
        ) : prayers.map(p => (
          <div key={p.id} className={`prayer-card ${p.is_answered ? "answered" : ""}`}>
            {p.is_answered && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <CheckCircle size={14} style={{ color: "var(--terra)" }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--terra)" }}>기도 응답!</span>
              </div>
            )}
            <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 10, color: "var(--text)" }}>
              {p.is_anonymous ? "익명 · " : ""}{p.content}
            </p>
            {p.testimony && <p style={{ color: "var(--text3)", fontSize: 12, lineHeight: 1.5, marginBottom: 10, fontStyle: "italic" }}>"{p.testimony}"</p>}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => pray(p.id, p.prayer_count)} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 500, padding: "6px 12px", borderRadius: 20, border: "none", cursor: "pointer", background: p.is_answered ? "var(--terra-light)" : "var(--bg2)", color: p.is_answered ? "var(--terra-dark)" : "var(--text2)" }}>
                  <Heart size={12} fill={p.is_answered ? "currentColor" : "none"} />
                  {p.is_answered ? `할렐루야 ${p.prayer_count}` : `함께 기도 ${p.prayer_count}`}
                </button>
                {!p.is_answered && p.user_id === userId && (
                  <button onClick={() => markAnswered(p.id)} style={{ fontSize: 10, color: "var(--terra)", border: "1px solid rgba(196,149,106,0.4)", padding: "6px 10px", borderRadius: 20, background: "none", cursor: "pointer" }}>
                    응답됐어요
                  </button>
                )}
              </div>
              <span style={{ fontSize: 10, color: "var(--text3)" }}>{new Date(p.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}</span>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(44,43,40,0.5)", zIndex: 40, display: "flex", alignItems: "flex-end" }}>
          <div style={{ background: "var(--white)", width: "100%", maxWidth: 430, margin: "0 auto", borderRadius: "24px 24px 0 0", padding: 24 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", fontFamily: "'Fraunces', serif", marginBottom: 14 }}>기도 제목 나누기</h2>
            <textarea className="textarea-field" rows={4} placeholder="기도 제목을 적어주세요..." value={newPrayer} onChange={e => setNewPrayer(e.target.value)} />
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={isAnon} onChange={e => setIsAnon(e.target.checked)} style={{ width: 16, height: 16, accentColor: "var(--terra)" }} />
              <span style={{ fontSize: 13, color: "var(--text3)" }}>익명으로 올리기</span>
            </label>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button className="btn-outline" onClick={() => setShowForm(false)} style={{ flex: 1 }}>취소</button>
              <button className="btn-sage" onClick={submit} disabled={saving || !newPrayer.trim()} style={{ flex: 1 }}>
                {saving ? <Loader2 size={16} className="spin" /> : "올리기"}
              </button>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => setShowForm(true)} style={{ position: "fixed", bottom: 80, right: 16, width: 52, height: 52, background: "var(--sage)", border: "none", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30, cursor: "pointer" }}>
        <Plus size={22} style={{ color: "white" }} />
      </button>

      <BottomNav />
    </div>
  );
}

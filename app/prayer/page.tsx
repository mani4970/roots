"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import Celebration from "@/components/Celebration";
import { createClient } from "@/lib/supabase";
import { Plus, CheckCircle, Loader2, Send, Pencil, X, Check } from "lucide-react";

export default function PrayerPage() {
  const router = useRouter();
  const [prayers, setPrayers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newPrayer, setNewPrayer] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [celebration, setCelebration] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  useEffect(() => { loadPrayers(); }, []);

  async function loadPrayers() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    setUserId(user.id);
    const { data } = await supabase.from("prayer_items").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (data) setPrayers(data);
    setLoading(false);
  }

  async function submit() {
    if (!newPrayer.trim() || !userId) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("prayer_items").insert({ user_id: userId, content: newPrayer.trim(), is_anonymous: false, visibility: "private" });
    setNewPrayer(""); setShowForm(false); setSaving(false);
    // 기도 저장 시 축하
    setCelebration(true);
    loadPrayers();
  }

  async function saveEdit() {
    if (!editText.trim() || !editId) return;
    const supabase = createClient();
    await supabase.from("prayer_items").update({ content: editText.trim() }).eq("id", editId);
    setEditId(null); setEditText("");
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
      <Celebration show={celebration} message="기도 제목 저장! 🙏" subMessage="구하고 찾는 자에게 반드시 하나님이 응답하실거예요" onClose={() => setCelebration(false)} />

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

                {/* 수정 모드 */}
                {editId === p.id ? (
                  <div>
                    <textarea className="textarea-field" rows={3} value={editText} onChange={e => setEditText(e.target.value)} style={{ marginBottom: 8 }} />
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={saveEdit} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "7px", borderRadius: 10, background: "var(--sage)", color: "var(--bg)", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                        <Check size={14} /> 저장
                      </button>
                      <button onClick={() => setEditId(null)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "7px", borderRadius: 10, background: "var(--bg3)", color: "var(--text3)", border: "1px solid var(--border)", cursor: "pointer", fontSize: 12 }}>
                        <X size={14} /> 취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 10, color: "var(--text)" }}>{p.content}</p>
                    {p.testimony && <p style={{ color: "var(--text3)", fontSize: 12, lineHeight: 1.5, marginBottom: 10, fontStyle: "italic" }}>"{p.testimony}"</p>}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {!p.is_answered && (
                          <>
                            <button onClick={() => { setEditId(p.id); setEditText(p.content); }} style={{ fontSize: 10, color: "var(--text3)", border: "1px solid var(--border)", padding: "5px 10px", borderRadius: 20, background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                              <Pencil size={10} /> 수정
                            </button>
                            <button onClick={() => markAnswered(p.id)} style={{ fontSize: 10, color: "var(--terra-dark)", border: "1px solid rgba(196,149,106,0.4)", padding: "5px 10px", borderRadius: 20, background: "none", cursor: "pointer" }}>
                              응답됐어요 🙌
                            </button>
                            {p.visibility !== "all" && (
                              <button onClick={() => requestIntercession(p.id)} style={{ fontSize: 10, color: "var(--sage-dark)", border: "1px solid rgba(122,157,122,0.3)", padding: "5px 10px", borderRadius: 20, background: "var(--sage-light)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                                <Send size={10} /> 중보기도 요청
                              </button>
                            )}
                          </>
                        )}
                      </div>
                      <span style={{ fontSize: 10, color: "var(--text3)" }}>{new Date(p.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}</span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 기도 작성 폼 — 가운데 */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px" }}>
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

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
  const [tab, setTab] = useState<"praying" | "answered">("praying");

  useEffect(() => { loadPrayers(); }, []);

  async function loadPrayers() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    setUserId(user.id);
    const { data } = await supabase
      .from("prayer_items")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setPrayers(data);
    setLoading(false);
  }

  async function submit() {
    if (!newPrayer.trim() || !userId) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("prayer_items").insert({
      user_id: userId,
      content: newPrayer.trim(),
      is_anonymous: false,
      visibility: "private",
    });
    setNewPrayer(""); setShowForm(false); setSaving(false);
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
    await supabase.from("prayer_items").update({
      is_answered: true,
      testimony,
      answered_at: new Date().toISOString(),
    }).eq("id", id);
    loadPrayers();
    setTab("answered"); // 응답 탭으로 자동 이동
  }

  const prayingList = prayers.filter(p => !p.is_answered);
  const answeredList = prayers.filter(p => p.is_answered);
  const currentList = tab === "praying" ? prayingList : answeredList;

  return (
    <div className="page">
      <Celebration
        show={celebration}
        message="기도 제목 저장! 🙏"
        subMessage="구하고 찾는 자에게 반드시 하나님이 응답하실거예요"
        onClose={() => setCelebration(false)}
      />

      {/* 헤더 */}
      <div style={{ background: "var(--bg)", padding: "56px 20px 0", borderBottom: "1px solid var(--border)" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>기도</h1>

        {/* 탭 */}
        <div style={{ display: "flex", gap: 0 }}>
          {[
            { key: "praying", label: "기도 중", count: prayingList.length, icon: "🙏" },
            { key: "answered", label: "기도 응답", count: answeredList.length, icon: "✨" },
          ].map(({ key, label, count, icon }) => (
            <button
              key={key}
              onClick={() => setTab(key as any)}
              style={{
                flex: 1, padding: "10px 0 12px",
                background: "none", border: "none",
                borderBottom: tab === key ? "2px solid var(--sage)" : "2px solid transparent",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              <span style={{ fontSize: 14 }}>{icon}</span>
              <span style={{ fontSize: 13, fontWeight: tab === key ? 700 : 400, color: tab === key ? "var(--sage-dark)" : "var(--text3)" }}>
                {label}
              </span>
              {count > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: tab === key ? "var(--bg)" : "var(--text3)", background: tab === key ? "var(--sage)" : "var(--border)", borderRadius: 20, padding: "1px 7px", minWidth: 20, textAlign: "center" }}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 내용 */}
      <div style={{ padding: "16px 16px 100px" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" />
          </div>
        ) : currentList.length === 0 ? (
          <div style={{ textAlign: "center", padding: "52px 0" }}>
            <p style={{ fontSize: 36, marginBottom: 12 }}>{tab === "praying" ? "🙏" : "✨"}</p>
            <p style={{ color: "var(--text3)", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
              {tab === "praying" ? "기도 제목이 없어요" : "아직 응답된 기도가 없어요"}
            </p>
            <p style={{ color: "var(--text3)", fontSize: 12, lineHeight: 1.6 }}>
              {tab === "praying"
                ? "+ 버튼으로 기도 제목을 적어보세요"
                : "기도 중인 제목에서 '응답됐어요'를 눌러보세요"}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {currentList.map(p => (
              <div key={p.id} className={`prayer-card ${p.is_answered ? "answered" : ""}`}>

                {/* 응답 배지 */}
                {p.is_answered && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <CheckCircle size={14} style={{ color: "var(--terra-dark)" }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--terra-dark)" }}>기도 응답! 🎉</span>
                    {p.answered_at && (
                      <span style={{ fontSize: 10, color: "var(--text3)", marginLeft: "auto" }}>
                        {new Date(p.answered_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                )}

                {/* 중보기도 요청 중 */}
                {p.visibility === "all" && !p.is_answered && (
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 9, fontWeight: 600, color: "var(--sage-dark)", background: "var(--sage-light)", padding: "3px 10px", borderRadius: 20, border: "1px solid rgba(122,157,122,0.3)" }}>
                      🤲 중보기도 요청 중 · {p.prayer_count ?? 0}명 기도 중
                    </span>
                  </div>
                )}

                {/* 수정 모드 */}
                {editId === p.id ? (
                  <div>
                    <textarea className="textarea-field" rows={3} value={editText}
                      onChange={e => setEditText(e.target.value)} style={{ marginBottom: 8 }} />
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={saveEdit} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "8px", borderRadius: 10, background: "var(--sage)", color: "var(--bg)", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                        <Check size={13} /> 저장
                      </button>
                      <button onClick={() => setEditId(null)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "8px", borderRadius: 10, background: "var(--bg3)", color: "var(--text3)", border: "1px solid var(--border)", cursor: "pointer", fontSize: 12 }}>
                        <X size={13} /> 취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 10, color: "var(--text)" }}>
                      {p.content}
                    </p>

                    {/* 간증 */}
                    {p.testimony && (
                      <div style={{ background: "rgba(196,149,106,0.08)", borderRadius: 10, padding: "10px 12px", marginBottom: 10, border: "1px solid rgba(196,149,106,0.2)" }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--terra-dark)", marginBottom: 4 }}>간증 ✍️</p>
                        <p style={{ color: "var(--text2)", fontSize: 12, lineHeight: 1.6, fontStyle: "italic" }}>"{p.testimony}"</p>
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {!p.is_answered && (
                          <>
                            <button onClick={() => { setEditId(p.id); setEditText(p.content); }}
                              style={{ fontSize: 10, color: "var(--text3)", border: "1px solid var(--border)", padding: "5px 10px", borderRadius: 20, background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                              <Pencil size={10} /> 수정
                            </button>
                            <button onClick={() => markAnswered(p.id)}
                              style={{ fontSize: 10, color: "var(--terra-dark)", border: "1px solid rgba(196,149,106,0.4)", padding: "5px 10px", borderRadius: 20, background: "rgba(196,149,106,0.08)", cursor: "pointer" }}>
                              응답됐어요 🙌
                            </button>
                            {p.visibility !== "all" && (
                              <button onClick={() => requestIntercession(p.id)}
                                style={{ fontSize: 10, color: "var(--sage-dark)", border: "1px solid rgba(122,157,122,0.3)", padding: "5px 10px", borderRadius: 20, background: "var(--sage-light)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                                <Send size={10} /> 중보기도 요청
                              </button>
                            )}
                          </>
                        )}
                      </div>
                      <span style={{ fontSize: 10, color: "var(--text3)" }}>
                        {new Date(p.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 기도 작성 폼 */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px" }}>
          <div style={{ background: "var(--bg2)", width: "100%", maxWidth: 390, borderRadius: 24, padding: 24, border: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>기도 제목 적기</h2>
            <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 14 }}>기본적으로 나만 볼 수 있어요.</p>
            <textarea className="textarea-field" rows={4}
              placeholder="기도 제목을 적어주세요..."
              value={newPrayer} onChange={e => setNewPrayer(e.target.value)} />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button className="btn-outline" onClick={() => setShowForm(false)} style={{ flex: 1 }}>취소</button>
              <button className="btn-sage" onClick={submit} disabled={saving || !newPrayer.trim()} style={{ flex: 1 }}>
                {saving ? <Loader2 size={16} className="spin" /> : "저장하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* + 버튼 (기도 중 탭에서만) */}
      {tab === "praying" && (
        <button
          onClick={() => setShowForm(true)}
          style={{ position: "fixed", bottom: 80, right: 16, width: 52, height: 52, background: "var(--sage)", border: "none", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30, cursor: "pointer", boxShadow: "0 4px 14px rgba(122,157,122,0.4)" }}
        >
          <Plus size={22} style={{ color: "var(--bg)" }} />
        </button>
      )}

      <BottomNav />
    </div>
  );
}

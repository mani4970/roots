"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase";
import { Loader2, Pencil, Check, X, Camera, Share2 } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [qtRecords, setQtRecords] = useState<any[]>([]);
  const [prayerStats, setPrayerStats] = useState({ total: 0, answered: 0, shared: 0 });
  const [qtShareCount, setQtShareCount] = useState(0);
  const [prayerSharedCount, setPrayerSharedCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (p) {
      // avatar_url 캐시 방지: 타임스탬프가 없으면 추가
      if (p.avatar_url && !p.avatar_url.includes("?t=")) {
        p.avatar_url = `${p.avatar_url}?t=${Date.now()}`;
      }
      setProfile(p);
      setNewName(p.name ?? "");
    }
    const now = new Date();
    const firstDay = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`;
    const { data: qt } = await supabase.from("qt_records").select("date").eq("user_id", user.id).eq("is_draft", false).gte("date", firstDay);
    if (qt) setQtRecords(qt);
    const { data: prayers } = await supabase.from("prayer_items").select("is_answered,visibility").eq("user_id", user.id);
    if (prayers) {
      const sharedCount = prayers.filter((p: any) => p.visibility === "all").length;
      setPrayerStats({
        total: prayers.length,
        answered: prayers.filter((p: any) => p.is_answered).length,
        shared: sharedCount,
      });
      setPrayerSharedCount(sharedCount);
    }

    // 큐티 커뮤니티 나눔 횟수
    const { data: qtShares } = await supabase.from("qt_records")
      .select("id").eq("user_id", user.id).not("visibility", "is", null).eq("is_draft", false);
    const qtShareCnt = qtShares?.length ?? 0;
    setQtShareCount(qtShareCnt);

    setLoading(false);
  }

  async function saveName() {
    if (!newName.trim()) return;
    setSavingName(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({ name: newName.trim() }).eq("id", user.id);
    setProfile((p: any) => ({ ...p, name: newName.trim() }));
    setEditingName(false);
    setSavingName(false);
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError("");
    // 5MB 제한
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("5MB 이하 이미지만 가능해요");
      return;
    }
    setUploadingPhoto(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      setPhotoError("업로드 실패: " + error.message);
      setUploadingPhoto(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const urlWithTs = `${publicUrl}?t=${Date.now()}`;
    // DB 저장 - 에러 체크 포함
    const { error: dbError } = await supabase.from("profiles").update({ avatar_url: urlWithTs }).eq("id", user.id);
    if (dbError) {
      console.error("프로필 사진 DB 저장 실패:", dbError);
      setPhotoError("사진 저장 실패: " + dbError.message);
      setUploadingPhoto(false);
      return;
    }
    console.log("프로필 사진 저장 성공:", urlWithTs);
    setProfile((p: any) => ({ ...p, avatar_url: urlWithTs }));
    setUploadingPhoto(false);
  }

  function shareApp() {
    const text = `🌱 Roots - 말씀에 뿌리내리고, 함께 자라다\n\n매일 큐티, 기도, 결단으로 나무를 키우는 크리스천 앱이에요.\n같이 시작해요! 👇\nhttps://christian-roots.com`;
    if (navigator.share) {
      navigator.share({ title: "Roots 앱 초대", text });
    } else {
      navigator.clipboard.writeText(text);
    }
  }

  async function sendFeedback() {
    if (!feedbackText.trim()) return;
    setSendingFeedback(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("feedback").insert({
        user_id: user?.id ?? null,
        content: feedbackText.trim(),
        created_at: new Date().toISOString(),
      });
      setFeedbackText("");
      setShowFeedbackModal(false);
      alert("소중한 의견 감사해요! 😊");
    } catch (e) {
      // feedback 테이블 없어도 이메일로 안내
      window.location.href = `mailto:cookiko313@gmail.com?subject=Roots 앱 피드백&body=${encodeURIComponent(feedbackText)}`;
    }
    setSendingFeedback(false);
  }

  async function deleteAccount() {
    setDeletingAccount(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // 사용자 데이터 삭제
      await Promise.all([
        supabase.from("qt_records").delete().eq("user_id", user.id),
        supabase.from("prayer_items").delete().eq("user_id", user.id),
        supabase.from("daily_checkins").delete().eq("user_id", user.id),
        supabase.from("user_prayer_logs").delete().eq("user_id", user.id),
        supabase.from("profiles").delete().eq("id", user.id),
      ]);
      await supabase.auth.signOut();
      router.push("/login");
    } catch (e) {
      alert("계정 삭제 중 오류가 발생했어요. cookiko313@gmail.com 으로 문의해 주세요.");
    }
    setDeletingAccount(false);
  }

  function renderCalendar() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDow = new Date(year, month, 1).getDay();
    const doneDates = new Set(qtRecords.map(r => r.date));
    const cells = [];
    for (let i = 0; i < firstDow; i++) cells.push(<div key={`e${i}`} />);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const done = doneDates.has(dateStr);
      const isToday = d === now.getDate();
      cells.push(
        <div key={d} style={{ aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: done ? "var(--sage)" : isToday ? "var(--bg3)" : "transparent", border: isToday && !done ? "1px solid var(--sage)" : "none" }}>
          <span style={{ fontSize: 10, fontWeight: done ? 700 : 400, color: done ? "var(--bg)" : isToday ? "var(--sage)" : "var(--text3)" }}>{d}</span>
        </div>
      );
    }
    return cells;
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" />
    </div>
  );

  return (
    <div className="page" style={{ paddingBottom: 80 }}>
      <div style={{ background: "var(--bg)", padding: "56px 20px 20px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* 프로필 사진 */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{ width: 68, height: 68, borderRadius: "50%", background: "var(--sage-light)", border: "2px solid var(--sage)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="프로필" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 26 }}>🌱</span>
              )}
            </div>
            <button
              onClick={() => { setPhotoError(""); fileRef.current?.click(); }}
              disabled={uploadingPhoto}
              style={{ position: "absolute", bottom: 0, right: 0, width: 22, height: 22, borderRadius: "50%", background: "var(--sage)", border: "2px solid var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              {uploadingPhoto ? <Loader2 size={9} style={{ color: "white" }} className="spin" /> : <Camera size={9} style={{ color: "white" }} />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={uploadPhoto} style={{ display: "none" }} />
          </div>

          {/* 이름 — overflow 방지 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingName ? (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value.slice(0, 20))}
                  maxLength={20}
                  style={{ flex: 1, minWidth: 0, background: "var(--bg2)", border: "1px solid var(--sage)", borderRadius: 10, padding: "7px 10px", color: "var(--text)", fontSize: 15, outline: "none" }}
                  autoFocus
                  onKeyDown={e => e.key === "Enter" && saveName()}
                />
                <button onClick={saveName} disabled={savingName} style={{ width: 30, height: 30, flexShrink: 0, borderRadius: "50%", background: "var(--sage)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  {savingName ? <Loader2 size={12} style={{ color: "white" }} className="spin" /> : <Check size={12} style={{ color: "white" }} />}
                </button>
                <button onClick={() => { setEditingName(false); setNewName(profile?.name ?? ""); }} style={{ width: 30, height: 30, flexShrink: 0, borderRadius: "50%", background: "var(--bg3)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <X size={12} style={{ color: "var(--text3)" }} />
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile?.name ?? "성도"}</h1>
                <button onClick={() => setEditingName(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", flexShrink: 0 }}>
                  <Pencil size={13} />
                </button>
              </div>
            )}
            <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>{profile?.streak_days ?? 0}일 연속 기록 중 🔥</p>
            {photoError && <p style={{ fontSize: 11, color: "#E05050", marginTop: 4 }}>{photoError}</p>}
          </div>
        </div>
      </div>

      {/* 신앙 여정 통계 */}
      <div style={{ padding: "14px 16px 0" }}>
        <div className="sec-label">신앙 여정</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            { label: "기도 제목", value: prayerStats.total, icon: "🙏" },
            { label: "기도 응답", value: prayerStats.answered, icon: "✨" },
            { label: "큐티 나눔", value: qtShareCount, icon: "🤝" },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: "center", padding: "14px 8px" }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--sage-dark)", marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "var(--text3)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 신앙의 결실 뱃지 */}
      <div style={{ padding: "14px 16px 0" }}>
        <div className="sec-label">신앙의 결실</div>
        <div className="card">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, justifyItems: "center" }}>
            {[
              { key: "badge_angel", img: "/angel.png", title: "천사", desc: "100일 streak", condition: (profile?.streak_days ?? 0) >= 100 },
              { key: "badge_prayer_warrior", img: "/prayer_warrior.png", title: "기도의 용사", desc: "중보기도 15회", condition: prayerSharedCount >= 15 },
              { key: "badge_qt_bird", img: "/qt_bird.png", title: "말씀 배달부", desc: "큐티 나눔 30회", condition: qtShareCount >= 30 },
            ].map(b => {
              const earned = profile?.[b.key] ?? false;
              return (
                <div key={b.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", opacity: earned ? 1 : 0.3 }}>
                  <div style={{ width: 72, height: 72, marginBottom: 6 }}>
                    <img src={b.img} alt={b.title} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: earned ? "rgba(232,197,71,0.95)" : "var(--text3)" }}>{b.title}</div>
                  <div style={{ fontSize: 9, color: "var(--text3)", marginTop: 2 }}>{b.desc}</div>
                  {earned && <div style={{ fontSize: 8, color: "rgba(232,197,71,0.7)", marginTop: 2 }}>✓ 획득</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 성령의 열매 배지 */}
      {(() => {
        const streak = profile?.streak_days ?? 0;
        const earnedCount = Math.min(Math.floor(streak / 100), 9);
        const BADGES = [
          { name: "Love", desc: "사랑", fruit: "🍎" },
          { name: "Peace", desc: "화평", fruit: "🍉" },
          { name: "Joy", desc: "희락", fruit: "🍌" },
          { name: "Goodness", desc: "양선", fruit: "🍊" },
          { name: "Kindness", desc: "자비", fruit: "🍒" },
          { name: "Patience", desc: "오래참음", fruit: "🍍" },
          { name: "Faithfulness", desc: "충성", fruit: "🍇" },
          { name: "Gentleness", desc: "온유", fruit: "🍋" },
          { name: "Self-Control", desc: "절제", fruit: "🍓" },
        ];
        return (
          <div style={{ padding: "14px 16px 0" }}>
            <div className="sec-label">
              성령의 열매
              <span style={{ marginLeft: 8, fontSize: 11, color: "var(--sage-dark)", fontWeight: 600 }}>{earnedCount} / 9</span>
            </div>
            <div className="card">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, justifyItems: "center" }}>
                {BADGES.map((b, i) => {
                  const earned = i < earnedCount;
                  return (
                    <div key={b.name} style={{
                      display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center",
                      textAlign: "center", width: "100%",
                      opacity: earned ? 1 : 0.3,
                    }}>
                      {/* 배지 이미지만, 테두리 없이 */}
                      <div style={{ width: 72, height: 72, margin: "0 auto 6px" }}>
                        <img
                          src={`/badge_${b.name.toLowerCase().replace("-","_")}.png`}
                          alt={b.name}
                          style={{ width: "100%", height: "100%", objectFit: "contain" }}
                        />
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: earned ? "rgba(232,197,71,0.95)" : "var(--text3)" }}>{b.name}</div>
                      <div style={{ fontSize: 9, color: "var(--text3)", marginTop: 1 }}>{b.desc}</div>
                      {earned && <div style={{ fontSize: 8, color: "rgba(232,197,71,0.7)", marginTop: 2 }}>✓ 획득</div>}
                    </div>
                  );
                })}
              </div>
              {earnedCount === 0 && (
                <p style={{ fontSize: 12, color: "var(--text3)", textAlign: "center", marginTop: 14 }}>
                  100일을 채우면 첫 번째 열매를 받아요 🌱
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {/* 큐티 현황 달력 */}
      <div style={{ padding: "14px 16px 0" }}>
        <div className="sec-label">
          {new Date().getMonth() + 1}월 큐티 현황
          <span style={{ marginLeft: 8, fontSize: 11, color: "var(--sage-dark)", fontWeight: 600 }}>{qtRecords.length}일</span>
        </div>
        <div className="card">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
            {["일","월","화","수","목","금","토"].map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 9, fontWeight: 600, color: "var(--text3)" }}>{d}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {renderCalendar()}
          </div>
        </div>
      </div>

      {/* 친구 초대 */}
      <div style={{ padding: "14px 16px 0" }}>
        <button onClick={shareApp} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px", borderRadius: 16, background: "var(--sage-light)", border: "1px solid rgba(122,157,122,0.3)", cursor: "pointer" }}>
          <Share2 size={16} style={{ color: "var(--sage-dark)" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--sage-dark)" }}>친구 초대하기</span>
        </button>
      </div>

      {/* 피드백 버튼 */}
      <div style={{ padding: "10px 16px 0" }}>
        <button onClick={() => setShowFeedbackModal(true)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px", borderRadius: 16, background: "var(--bg2)", border: "1px solid var(--border)", cursor: "pointer" }}>
          <span style={{ fontSize: 14 }}>💬</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)" }}>의견 보내기</span>
        </button>
      </div>

      {/* 법적 링크 */}
      <div style={{ padding: "16px 16px 4px", display: "flex", justifyContent: "center", gap: 16 }}>
        <a href="/impressum" style={{ fontSize: 11, color: "var(--text3)", textDecoration: "none" }}>Impressum</a>
        <span style={{ fontSize: 11, color: "var(--border)" }}>|</span>
        <a href="/privacy" style={{ fontSize: 11, color: "var(--text3)", textDecoration: "none" }}>개인정보처리방침</a>
      </div>

      <div style={{ height: 80 }} />
      <BottomNav />

      {/* 피드백 모달 */}
      {showFeedbackModal && (
        <div onClick={() => setShowFeedbackModal(false)} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(26,28,30,0.8)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 90 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg2)", borderRadius: 24, border: "1px solid var(--border)", padding: "24px 20px 20px", margin: "0 16px", width: "100%", maxWidth: 400 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>💬 의견 보내기</h3>
            <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 14, lineHeight: 1.6 }}>불편한 점, 개선 아이디어, 격려의 말씀 뭐든 환영해요!</p>
            <textarea
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
              placeholder="의견을 입력해 주세요..."
              rows={4}
              style={{ width: "100%", padding: "12px", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text)", fontSize: 13, resize: "none", outline: "none", boxSizing: "border-box" }}
            />
            <button onClick={sendFeedback} disabled={!feedbackText.trim() || sendingFeedback} style={{ width: "100%", padding: "12px", background: "var(--sage)", color: "var(--bg)", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 10 }}>
              {sendingFeedback ? "전송 중..." : "보내기"}
            </button>

            {/* 계정 관리 */}
            <div style={{ borderTop: "1px solid var(--border)", marginTop: 16, paddingTop: 14 }}>
              <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 8, textAlign: "center" }}>계정 관리</p>
              {!showDeleteConfirm ? (
                <button onClick={() => setShowDeleteConfirm(true)} style={{ width: "100%", padding: "9px", background: "none", border: "1px solid rgba(224,80,80,0.3)", borderRadius: 10, color: "#E05050", fontSize: 12, cursor: "pointer" }}>
                  계정 탈퇴
                </button>
              ) : (
                <div>
                  <p style={{ fontSize: 12, color: "#E05050", textAlign: "center", marginBottom: 10, lineHeight: 1.6 }}>
                    정말 탈퇴하시겠어요?<br />모든 큐티 기록, 기도 제목이 영구 삭제돼요.
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, padding: "10px", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text3)", fontSize: 13, cursor: "pointer" }}>
                      취소
                    </button>
                    <button onClick={deleteAccount} disabled={deletingAccount} style={{ flex: 1, padding: "10px", background: "#E05050", border: "none", borderRadius: 10, color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                      {deletingAccount ? "삭제 중..." : "탈퇴하기"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

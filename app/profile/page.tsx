"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase";
import { useLang } from "@/lib/useLang";
import { t, type TKey } from "@/lib/i18n";
import { Loader2, Check, X, Camera, Share2, Settings } from "lucide-react";

const PROFILE_WEEKDAY_KEYS = [
  "weekday_sun",
  "weekday_mon",
  "weekday_tue",
  "weekday_wed",
  "weekday_thu",
  "weekday_fri",
  "weekday_sat",
] as const satisfies readonly TKey[];

const PROFILE_MONTH_LOCALE = {
  ko: "ko-KR",
  de: "de-DE",
  en: "en-US",
  fr: "fr-FR",
} as const;

const FAITH_BADGES = [
  { key: "badge_rootsman", img: "/badge_rootsman.webp", titleKey: "badge_rootsman_title", descKey: "badge_rootsman_desc" },
  { key: "badge_mose", img: "/badge_mose.webp", titleKey: "badge_mose_title", descKey: "badge_mose_desc" },
  { key: "badge_rootsman_bible", img: "/badge_rootsman_bible.webp", titleKey: "badge_rootsman_bible_title", descKey: "badge_rootsman_bible_desc" },
  { key: "badge_david", img: "/badge_david.webp", titleKey: "badge_david_title", descKey: "badge_david_desc" },
  { key: "badge_noah", img: "/badge_noah.webp", titleKey: "badge_noah_title", descKey: "badge_noah_desc" },
  { key: "badge_joseph", img: "/badge_joseph.webp", titleKey: "badge_joseph_title", descKey: "badge_joseph_desc" },
  { key: "badge_prayer_warrior", img: "/prayer_warrior.webp", titleKey: "badge_prayer_warrior_title", descKey: "badge_prayer_warrior_desc" },
  { key: "badge_paul", img: "/badge_paul.webp", titleKey: "badge_paul_title", descKey: "badge_paul_desc" },
  { key: "badge_peter", img: "/badge_peter.webp", titleKey: "badge_peter_title", descKey: "badge_peter_desc" },
  { key: "badge_qt_bird", img: "/qt_bird.webp", titleKey: "badge_qt_bird_title", descKey: "badge_qt_bird_desc" },
  { key: "badge_angel", img: "/angel.webp", titleKey: "badge_angel_title", descKey: "badge_angel_desc" },
] as const satisfies readonly { key: string; img: string; titleKey: TKey; descKey: TKey }[];

const SPIRIT_FRUIT_BADGES = [
  { key: "badge_love", name: "Love", descKey: "fruit_love", fruit: "🍎" },
  { key: "badge_peace", name: "Peace", descKey: "fruit_peace", fruit: "🍉" },
  { key: "badge_joy", name: "Joy", descKey: "fruit_joy", fruit: "🍌" },
  { key: "badge_goodness", name: "Goodness", descKey: "fruit_goodness", fruit: "🍊" },
  { key: "badge_kindness", name: "Kindness", descKey: "fruit_kindness", fruit: "🍒" },
  { key: "badge_patience", name: "Patience", descKey: "fruit_patience", fruit: "🍍" },
  { key: "badge_faithfulness", name: "Faithfulness", descKey: "fruit_faithful", fruit: "🍇" },
  { key: "badge_gentleness", name: "Gentleness", descKey: "fruit_gentle", fruit: "🍋" },
  { key: "badge_self_control", name: "Self-Control", descKey: "fruit_selfctrl", fruit: "🍓" },
] as const satisfies readonly { key: string; name: string; descKey: TKey; fruit: string }[];

export default function ProfilePage() {
  const router = useRouter();
  const lang = useLang();
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
  const [userEmail, setUserEmail] = useState("");
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<null | { img?: string; title: string; desc: string; earned: boolean }>(null);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  }

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/welcome"); return; }
    setUserEmail(user.email ?? "");
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
      setPhotoError(t("profile_photo_size_error", lang));
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
      setPhotoError(`${t("profile_upload_fail", lang)}: ${error.message}`);
      setUploadingPhoto(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const urlWithTs = `${publicUrl}?t=${Date.now()}`;
    // DB 저장 - 에러 체크 포함
    const { error: dbError } = await supabase.from("profiles").update({ avatar_url: urlWithTs }).eq("id", user.id);
    if (dbError) {
      console.error("프로필 사진 DB 저장 실패:", dbError);
      setPhotoError(`${t("profile_save_fail", lang)}: ${dbError.message}`);
      setUploadingPhoto(false);
      return;
    }
    setProfile((p: any) => ({ ...p, avatar_url: urlWithTs }));
    setUploadingPhoto(false);
  }

  async function logout() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/welcome");
    } catch (e) {
      console.error(e);
      router.push("/welcome");
    }
  }

  function shareApp() {
    const title = t("profile_invite_title", lang);
    const text = t("profile_invite_text", lang);
    if (navigator.share) {
      navigator.share({ title, text });
    } else {
      navigator.clipboard.writeText(text);
      showToast(t("profile_invite_copied", lang));
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
      });
      setFeedbackText("");
      setShowFeedbackModal(false);
      showToast(t("profile_feedback_ok", lang));
    } catch (e) {
      showToast(t("profile_feedback_fail", lang));
    }
    setSendingFeedback(false);
  }

  async function sendPasswordResetEmail() {
    if (!userEmail) {
      showToast(t("profile_email_missing", lang));
      return;
    }
    setSendingPasswordReset(true);
    try {
      const supabase = createClient();
      await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/login`,
      });
      showToast(t("profile_password_reset_sent", lang));
    } catch (e) {
      showToast(t("profile_password_reset_fail", lang));
    }
    setSendingPasswordReset(false);
  }

  async function deleteAccount() {
    setDeletingAccount(true);
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Account deletion failed");
      }

      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/welcome");
    } catch (e) {
      console.error(e);
      showToast(t("profile_delete_error", lang));
    } finally {
      setDeletingAccount(false);
    }
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
      {toast && (
        <div style={{ position: "fixed", top: 18, left: "50%", transform: "translateX(-50%)", zIndex: 300, background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 999, padding: "10px 16px", fontSize: 13, fontWeight: 700, boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}>
          {toast}
        </div>
      )}

      {selectedBadge && (
        <div
          onClick={() => setSelectedBadge(null)}
          style={{ position: "fixed", inset: 0, zIndex: 260, background: "rgba(26,28,30,0.72)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px" }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 340, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 26, padding: "24px 20px 20px", textAlign: "center", boxShadow: "0 18px 48px rgba(0,0,0,0.28)", position: "relative" }}
          >
            <button
              onClick={() => setSelectedBadge(null)}
              aria-label="Close"
              style={{ position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: "50%", background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, lineHeight: 1 }}
            >
              ×
            </button>
            <div style={{ margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img
                src={selectedBadge.img}
                alt={selectedBadge.title}
                style={{ width: "168px", height: "168px", objectFit: "contain", opacity: selectedBadge.earned ? 1 : 0.42, filter: selectedBadge.earned ? "none" : "grayscale(0.2)" }}
              />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>{selectedBadge.title}</h3>
            <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6, marginBottom: 12 }}>{selectedBadge.desc}</p>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 999, padding: "7px 12px", background: selectedBadge.earned ? "rgba(232,197,71,0.14)" : "var(--bg3)", border: selectedBadge.earned ? "1px solid rgba(232,197,71,0.32)" : "1px solid var(--border)", color: selectedBadge.earned ? "rgba(232,197,71,0.95)" : "var(--text3)", fontSize: 11, fontWeight: 800 }}>
              {selectedBadge.earned ? t("profile_badge_earned", lang) : lang === "ko" ? "아직 미획득" : lang === "de" ? "Noch nicht erhalten" : lang === "fr" ? "Pas encore obtenu" : "Not earned yet"}
            </div>
          </div>
        </div>
      )}

      <div style={{ background: "var(--bg)", padding: "56px 20px 20px", borderBottom: "1px solid var(--border)", position: "relative" }}>
        <button
          onClick={() => { setShowSettingsModal(true); setShowDeleteConfirm(false); }}
          aria-label={t("profile_account_settings", lang)}
          style={{ position: "absolute", top: 72, right: 20, width: 36, height: 36, borderRadius: "50%", background: "var(--bg2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)", cursor: "pointer" }}
        >
          <Settings size={17} />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* 프로필 사진 */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{ width: 68, height: 68, borderRadius: "50%", background: "var(--sage-light)", border: "2px solid var(--sage)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={t("nav_profile", lang)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
              <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {profile?.name ?? t("profile_default_name", lang)}
              </h1>
            )}
            <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>{t("profile_streak", lang, { n: profile?.streak_days ?? 0 })}</p>
            {photoError && <p style={{ fontSize: 11, color: "#E05050", marginTop: 4 }}>{photoError}</p>}
          </div>
        </div>
      </div>

      {/* 신앙 여정 통계 */}
      <div style={{ padding: "14px 16px 0" }}>
        <div className="sec-label">{t("profile_faith_journey", lang)}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            { label: t("profile_prayer_count", lang), value: prayerStats.total, iconSrc: "/icon-prayer-request.webp" },
            { label: t("profile_prayer_answered_count", lang), value: prayerStats.answered, iconSrc: "/icon-prayer-answered.webp" },
            { label: t("profile_qt_share", lang), value: qtShareCount, iconSrc: "/icon-qt-share.webp" },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: "center", padding: "14px 8px" }}>
              <div style={{ width: 44, height: 44, margin: "0 auto 6px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img
                  src={s.iconSrc}
                  alt={s.label}
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--sage-dark)", marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "var(--text3)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 신앙의 결실 뱃지 - 가로 스크롤 */}
      <div style={{ padding: "14px 16px 0" }}>
        <div className="sec-label">{t("profile_faith_fruits", lang)}</div>
        <div className="card" style={{ padding: "16px 12px", position: "relative" }}>
          {/* 좌우 화살표 */}
          <button onClick={() => { const el = document.getElementById("faith-badge-scroll"); if (el) el.scrollBy({ left: -200, behavior: "smooth" }); }}
            style={{ position: "absolute", left: 4, top: "50%", transform: "translateY(-50%)", zIndex: 2, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text3)", fontSize: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }}>‹</button>
          <button onClick={() => { const el = document.getElementById("faith-badge-scroll"); if (el) el.scrollBy({ left: 200, behavior: "smooth" }); }}
            style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", zIndex: 2, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text3)", fontSize: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }}>›</button>
          <div id="faith-badge-scroll" style={{ display: "flex", overflowX: "auto", gap: 16, paddingBottom: 4, scrollbarWidth: "none", paddingLeft: 20, paddingRight: 20 }}>
            {[...FAITH_BADGES].sort((a, b) => {
              const aEarned = profile?.[a.key] ? 1 : 0;
              const bEarned = profile?.[b.key] ? 1 : 0;
              return bEarned - aEarned;
            }).map(b => {
              const earned = profile?.[b.key] ?? false;
              return (
                <button
                  key={b.key}
                  onClick={() => setSelectedBadge({ img: b.img, title: t(b.titleKey, lang), desc: t(b.descKey, lang), earned })}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", flexShrink: 0, width: 96, background: "transparent", border: "none", padding: 0, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}
                >
                  <div style={{ width: 88, height: 88, marginBottom: 6, opacity: earned ? 1 : 0.32, filter: earned ? "none" : "grayscale(0.2)", transition: "transform 160ms ease, opacity 160ms ease" }}>
                    <img
                      src={b.img}
                      alt={t(b.titleKey, lang)}
                      style={{ width: "100%", height: "100%", objectFit: "contain", transform: b.key === "badge_rootsman" ? "scale(1.15)" : "none" }}
                    />
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: earned ? "rgba(232,197,71,0.95)" : "var(--text)", lineHeight: 1.3 }}>{t(b.titleKey, lang)}</div>
                  <div style={{ fontSize: 9, color: "var(--text2)", marginTop: 2 }}>{t(b.descKey, lang)}</div>
                  {earned && <div style={{ fontSize: 8, color: "rgba(232,197,71,0.7)", marginTop: 2 }}>{t("profile_badge_earned", lang)}</div>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 성령의 열매 배지 */}
      {(() => {
        const BADGES = SPIRIT_FRUIT_BADGES;
        const earnedCount = BADGES.filter(b => profile?.[b.key]).length;
        return (
          <div style={{ padding: "14px 16px 0" }}>
            <div className="sec-label">
              {t("profile_spirit_fruits", lang)}
              <span style={{ marginLeft: 8, fontSize: 11, color: "var(--sage-dark)", fontWeight: 600 }}>{earnedCount} / 9</span>
            </div>
            <div className="card" style={{ padding: "16px 12px", position: "relative" }}>
              {/* 좌우 화살표 */}
              <button
                onClick={() => { const el = document.getElementById("spirit-fruit-scroll"); if (el) el.scrollBy({ left: -200, behavior: "smooth" }); }}
                style={{ position: "absolute", left: 4, top: "50%", transform: "translateY(-50%)", zIndex: 2, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text3)", fontSize: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }}
              >‹</button>
              <button
                onClick={() => { const el = document.getElementById("spirit-fruit-scroll"); if (el) el.scrollBy({ left: 200, behavior: "smooth" }); }}
                style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", zIndex: 2, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text3)", fontSize: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }}
              >›</button>
              <div id="spirit-fruit-scroll" style={{ display: "flex", overflowX: "auto", gap: 16, paddingBottom: 4, scrollbarWidth: "none", paddingLeft: 20, paddingRight: 20 }}>
                {BADGES.map((b, i) => {
                  const earned = profile?.[b.key] ?? false;
                  return (
                    <button
                      key={b.name}
                      onClick={() => setSelectedBadge({ img: `/badge_${b.name.toLowerCase().replace("-","_")}.webp`, title: b.name, desc: t(b.descKey, lang), earned })}
                      style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", flexShrink: 0, width: 76, background: "transparent", border: "none", padding: 0, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}
                    >
                      {/* 미획득 상태에서도 이름/설명은 읽기 쉽게 유지하고, 배지 이미지만 흐릿하게 표시 */}
                      <div style={{ width: 68, height: 68, marginBottom: 6, opacity: earned ? 1 : 0.32, filter: earned ? "none" : "grayscale(0.2)", transition: "transform 160ms ease, opacity 160ms ease" }}>
                        <img
                          src={`/badge_${b.name.toLowerCase().replace("-","_")}.webp`}
                          alt={b.name}
                          style={{ width: "100%", height: "100%", objectFit: "contain" }}
                        />
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: earned ? "rgba(232,197,71,0.95)" : "var(--text)", lineHeight: 1.3 }}>{b.name}</div>
                      <div style={{ fontSize: 9, color: "var(--text2)", marginTop: 2 }}>{t(b.descKey, lang)}</div>
                      {earned && <div style={{ fontSize: 8, color: "rgba(232,197,71,0.7)", marginTop: 2 }}>{t("profile_badge_earned", lang)}</div>}
                    </button>
                  );
                })}
              </div>
              {earnedCount === 0 && (
                <p style={{ fontSize: 12, color: "var(--text3)", textAlign: "center", marginTop: 14 }}>
                  {t("profile_spirit_fruit_first_hint", lang)}
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {/* 큐티 현황 달력 */}
      <div style={{ padding: "14px 16px 0" }}>
        <div className="sec-label">
          {t("profile_qt_month_label", lang, { month: new Date().toLocaleDateString(PROFILE_MONTH_LOCALE[lang], { month: "long" }) })}
          <span style={{ marginLeft: 8, fontSize: 11, color: "var(--sage-dark)", fontWeight: 600 }}>{qtRecords.length}{t("profile_qt_days_suffix", lang)}</span>
        </div>
        <div className="card">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
            {PROFILE_WEEKDAY_KEYS.map(key => {
              const d = t(key, lang);
              return (
              <div key={key} style={{ textAlign: "center", fontSize: 9, fontWeight: 600, color: "var(--text3)" }}>{d}</div>
              );
            })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {renderCalendar()}
          </div>
        </div>
      </div>

      {/* 로그아웃 */}
      <div style={{ padding: "4px 16px 0" }}>
        <button onClick={logout} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", borderRadius: 14, background: "none", border: "1px solid var(--border)", cursor: "pointer" }}>
          <span style={{ fontSize: 13, color: "var(--text3)", fontWeight: 600 }}>{t("profile_logout", lang)}</span>
        </button>
      </div>

      {/* 친구 초대 */}
      <div style={{ padding: "14px 16px 0" }}>
        <button onClick={shareApp} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px", borderRadius: 16, background: "var(--sage-light)", border: "1px solid rgba(122,157,122,0.3)", cursor: "pointer" }}>
          <Share2 size={16} style={{ color: "var(--sage-dark)" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--sage-dark)" }}>{t("profile_invite", lang)}</span>
        </button>
      </div>

      {/* 피드백 버튼 */}
      <div style={{ padding: "10px 16px 0" }}>
        <button onClick={() => setShowFeedbackModal(true)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px", borderRadius: 16, background: "var(--bg2)", border: "1px solid var(--border)", cursor: "pointer" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)" }}>{t("profile_feedback", lang)}</span>
        </button>
      </div>

      {/* 법적/지원 링크 */}
      <div style={{ padding: "16px 16px 4px", display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
        <a href="/impressum" style={{ fontSize: 11, color: "var(--text3)", textDecoration: "none" }}>{t("profile_impressum", lang)}</a>
        <span style={{ fontSize: 11, color: "var(--border)" }}>|</span>
        <a href="/privacy" style={{ fontSize: 11, color: "var(--text3)", textDecoration: "none" }}>{t("profile_privacy", lang)}</a>
        <span style={{ fontSize: 11, color: "var(--border)" }}>|</span>
        <a href="/terms" style={{ fontSize: 11, color: "var(--text3)", textDecoration: "none" }}>{t("profile_terms", lang)}</a>
        <span style={{ fontSize: 11, color: "var(--border)" }}>|</span>
        <a href="/support" style={{ fontSize: 11, color: "var(--text3)", textDecoration: "none" }}>{t("profile_support", lang)}</a>
        <span style={{ fontSize: 11, color: "var(--border)" }}>|</span>
        <a href="/account-deletion" style={{ fontSize: 11, color: "var(--text3)", textDecoration: "none" }}>{t("profile_account_deletion", lang)}</a>
      </div>

      <div style={{ height: 80 }} />
      <BottomNav />

      {/* 계정 설정 모달 */}
      {showSettingsModal && (
        <div onClick={() => setShowSettingsModal(false)} style={{ position: "fixed", inset: 0, zIndex: 110, background: "rgba(26,28,30,0.72)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 18px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg2)", borderRadius: 24, border: "1px solid var(--border)", padding: "22px 18px 18px", width: "100%", maxWidth: 390, boxShadow: "0 18px 48px rgba(0,0,0,0.24)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>{t("profile_account_settings", lang)}</h3>
                <p style={{ fontSize: 11, color: "var(--text3)" }}>{userEmail}</p>
              </div>
              <button onClick={() => setShowSettingsModal(false)} style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--bg3)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text3)" }}>
                <X size={15} />
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value.slice(0, 20))}
                maxLength={20}
                placeholder={t("profile_name_placeholder", lang)}
                style={{ flex: 1, minWidth: 0, background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 12, padding: "11px 12px", color: "var(--text)", fontSize: 13, outline: "none" }}
              />
              <button
                onClick={async () => { await saveName(); setShowSettingsModal(false); }}
                disabled={savingName || !newName.trim()}
                style={{ padding: "11px 13px", background: "var(--sage)", border: "none", borderRadius: 12, color: "var(--bg)", fontSize: 13, fontWeight: 800, cursor: "pointer", opacity: !newName.trim() ? 0.55 : 1 }}
              >
                {savingName ? <Loader2 size={13} className="spin" /> : t("profile_save", lang)}
              </button>
            </div>

            <button
              onClick={sendPasswordResetEmail}
              disabled={sendingPasswordReset}
              style={{ width: "100%", padding: "13px 14px", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14, color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", marginBottom: 10, textAlign: "left" }}
            >
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{t("profile_change_password", lang)}</p>
                <p style={{ fontSize: 11, color: "var(--text3)" }}>{t("profile_password_email_hint", lang)}</p>
              </div>
              {sendingPasswordReset ? <Loader2 size={15} className="spin" style={{ color: "var(--sage)" }} /> : <span style={{ fontSize: 18, color: "var(--text3)" }}>›</span>}
            </button>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{ width: "100%", padding: "13px 14px", background: "transparent", border: "1px solid rgba(224,80,80,0.34)", borderRadius: 14, color: "#E05050", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", textAlign: "left" }}
              >
                <div>
                  <p style={{ fontSize: 13, fontWeight: 800, marginBottom: 3 }}>{t("profile_delete", lang)}</p>
                  <p style={{ fontSize: 11, color: "var(--text3)" }}>{t("profile_delete_hint", lang)}</p>
                </div>
                <span style={{ fontSize: 18, color: "#E05050" }}>›</span>
              </button>
            ) : (
              <div style={{ padding: "13px 14px", background: "rgba(224,80,80,0.06)", border: "1px solid rgba(224,80,80,0.26)", borderRadius: 14 }}>
                <p style={{ fontSize: 12, color: "#E05050", marginBottom: 10, lineHeight: 1.6 }}>
                  {t("profile_delete_confirm", lang)}
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, padding: "10px", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text3)", fontSize: 13, cursor: "pointer" }}>
                    {t("profile_delete_cancel", lang)}
                  </button>
                  <button onClick={deleteAccount} disabled={deletingAccount} style={{ flex: 1, padding: "10px", background: "#E05050", border: "none", borderRadius: 10, color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    {deletingAccount ? t("profile_deleting", lang) : t("profile_delete_confirm_btn", lang)}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 피드백 모달 */}
      {showFeedbackModal && (
        <div onClick={() => setShowFeedbackModal(false)} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(26,28,30,0.8)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 90 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg2)", borderRadius: 24, border: "1px solid var(--border)", padding: "24px 20px 20px", margin: "0 16px", width: "100%", maxWidth: 400 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>{t("profile_feedback_title", lang)}</h3>
            <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 14, lineHeight: 1.6 }}>{t("profile_feedback_sub", lang)}</p>
            <textarea
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
              placeholder={t("profile_feedback_placeholder", lang)}
              rows={4}
              style={{ width: "100%", padding: "12px", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text)", fontSize: 13, resize: "none", outline: "none", boxSizing: "border-box" }}
            />
            <button onClick={sendFeedback} disabled={!feedbackText.trim() || sendingFeedback} style={{ width: "100%", padding: "12px", background: "var(--sage)", color: "var(--bg)", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 10 }}>
              {sendingFeedback ? t("profile_feedback_sending", lang) : t("profile_feedback_send", lang)}
            </button>


          </div>
        </div>
      )}
    </div>
  );
}

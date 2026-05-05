"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import Celebration from "@/components/Celebration";
import { createClient } from "@/lib/supabase";
import { useLang } from "@/lib/useLang";
import { t, type TKey } from "@/lib/i18n";
import { getDateLocale, getLocalDateString } from "@/lib/date";
import { Plus, CheckCircle, Loader2, Send, Pencil, X, Check } from "lucide-react";

type PrayerTab = "mine" | "answered" | "intercession";


function PrayerPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = useLang();
  const [badgePopup, setBadgePopup] = useState<{img:string;title:string;msg:string}|null>(null);
  const [prayers, setPrayers] = useState<any[]>([]);
  const [intercessionPrayers, setIntercessionPrayers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newPrayer, setNewPrayer] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [celebration, setCelebration] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [tab, setTab] = useState<PrayerTab>("mine");
  const [notice, setNotice] = useState<string | null>(null);
  const [testimonyPrayerId, setTestimonyPrayerId] = useState<string | null>(null);
  const [testimonyText, setTestimonyText] = useState("");
  const [savingTestimony, setSavingTestimony] = useState(false);

  const c = (key: TKey, vars?: Record<string, string | number>) => t(key, lang, vars);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2400);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => { loadPrayers(); }, []);

  useEffect(() => {
    if (searchParams.get("compose") === "1") {
      setTab("mine");
      setShowForm(true);
      router.replace("/prayer");
    }
  }, [searchParams, router]);

  async function fetchProfiles(supabase: any, rows: any[]) {
    const userIds = Array.from(new Set(rows.map((row: any) => row.user_id).filter(Boolean)));
    if (userIds.length === 0) return {};

    const { data } = await supabase
      .from("profiles")
      .select("id, name, avatar_url")
      .in("id", userIds);

    const profileMap: Record<string, any> = {};
    (data ?? []).forEach((profile: any) => { profileMap[profile.id] = profile; });
    return profileMap;
  }

  async function loadPrayers() {
    setLoading(true);
    const supabase = createClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);

      const { data } = await supabase
        .from("prayer_items")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (data) setPrayers(data);

      const { data: logs } = await supabase
        .from("user_prayer_logs")
        .select("prayer_id")
        .eq("user_id", user.id);

      const prayerIds = Array.from(new Set((logs ?? []).map((log: any) => log.prayer_id).filter(Boolean)));
      if (prayerIds.length === 0) {
        setIntercessionPrayers([]);
      } else {
        const { data: intercessionData } = await supabase
          .from("prayer_items")
          .select("*")
          .in("id", prayerIds)
          .order("is_answered", { ascending: true })
          .order("created_at", { ascending: false });

        if (intercessionData) {
          const profileMap = await fetchProfiles(supabase, intercessionData);
          setIntercessionPrayers(intercessionData.map((row: any) => ({
            ...row,
            profiles: profileMap[row.user_id] ?? null,
          })));
        }
      }
    } catch (error) {
      console.error("prayer load failed", error);
      setNotice(c("network_error_retry"));
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    if (!newPrayer.trim() || !userId || saving) return;
    setSaving(true);
    const supabase = createClient();
    try {
      const { data: insertedPrayer, error: insertError } = await supabase.from("prayer_items").insert({
        user_id: userId,
        content: newPrayer.trim(),
        is_anonymous: false,
        visibility: "private",
      }).select("id").single();
      if (insertError) throw insertError;

      const { error: prayerCompletionError } = await supabase.from("daily_prayer_completions").upsert({
        user_id: userId,
        date: getLocalDateString(),
        source: "written",
      }, { onConflict: "user_id,date" });
      if (prayerCompletionError) {
        if (insertedPrayer?.id) {
          await supabase.from("prayer_items").delete().eq("id", insertedPrayer.id);
        }
        throw prayerCompletionError;
      }

      setNewPrayer("");
      setShowForm(false);
      setCelebration(true);
      await loadPrayers();
    } catch (error) {
      console.error("prayer submit failed", error);
      setNotice(c("prayer_error_save"));
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!editText.trim() || !editId) return;
    const supabase = createClient();
    try {
      const { error } = await supabase.from("prayer_items").update({ content: editText.trim() }).eq("id", editId);
      if (error) {
        setNotice(c("prayer_error_edit"));
        return;
      }
      setEditId(null); setEditText("");
      loadPrayers();
    } catch (error) {
      console.error("prayer edit failed", error);
      setNotice(c("prayer_error_edit"));
    }
  }

  async function requestIntercession(id: string) {
    const supabase = createClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error: visibilityError } = await supabase.from("prayer_items").update({ visibility: "all" }).eq("id", id);
      if (visibilityError) {
        setNotice(c("prayer_error_intercession"));
        return;
      }
      // 기도의 용사 뱃지 체크 (중보요청 15번)
      const { data: prof } = await supabase.from("profiles")
        .select("badge_prayer_warrior").eq("id", user.id).single();
      if (!prof?.badge_prayer_warrior) {
        const { data: shared } = await supabase.from("prayer_items")
          .select("id").eq("user_id", user.id).eq("visibility", "all");
        if ((shared?.length ?? 0) >= 15) {
          await supabase.from("profiles").update({ badge_prayer_warrior: true }).eq("id", user.id);
          setBadgePopup({
            img: "/prayer_warrior.webp",
            title: c("prayer_badge_warrior_popup"),
            msg: t("badge_prayer_warrior_msg", lang),
          });
        }
      }
      loadPrayers();
    } catch (error) {
      console.error("intercession request failed", error);
      setNotice(c("prayer_error_intercession"));
    }
  }

  async function saveAnsweredPrayer() {
    if (!testimonyPrayerId || !testimonyText.trim() || savingTestimony) return;
    setSavingTestimony(true);
    const supabase = createClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("prayer_items").update({
        is_answered: true,
        testimony: testimonyText.trim(),
        answered_at: new Date().toISOString(),
      }).eq("id", testimonyPrayerId);
      if (error) {
        setNotice(c("prayer_error_answered"));
        return;
      }
      // 노아 뱃지는 기도 응답 저장이 성공한 뒤에만 지급합니다.
      if (user) {
        const { data: prof } = await supabase.from("profiles")
          .select("badge_noah").eq("id", user.id).single();
        if (!prof?.badge_noah) {
          await supabase.from("profiles").update({ badge_noah: true }).eq("id", user.id);
          setBadgePopup({ img: "/badge_noah.webp", title: c("prayer_badge_noah_popup"), msg: t("badge_noah_msg", lang) });
        }
      }
      setTestimonyPrayerId(null);
      setTestimonyText("");
      await loadPrayers();
      setTab("answered");
    } catch (error) {
      console.error("answered prayer save failed", error);
      setNotice(c("prayer_error_answered"));
    } finally {
      setSavingTestimony(false);
    }
  }

  function openAnsweredPrayer(id: string) {
    setTestimonyPrayerId(id);
    setTestimonyText("");
  }

  const myPrayingList = prayers.filter(p => !p.is_answered);
  const answeredList = prayers.filter(p => p.is_answered);
  const currentList = tab === "mine" ? myPrayingList : tab === "answered" ? answeredList : intercessionPrayers;
  const emptyIconSrc = tab === "mine" ? "/icon-prayer-request.webp" : tab === "answered" ? "/icon-prayer-answered.webp" : "/icon-pray.webp";
  const emptyTitle = tab === "mine" ? c("prayer_empty_mine_title") : tab === "answered" ? c("prayer_empty_answered_title") : c("prayer_empty_intercession_title");
  const emptySub = tab === "mine" ? c("prayer_empty_mine_sub") : tab === "answered" ? c("prayer_empty_answered_sub") : c("prayer_empty_intercession_sub");

  function tabAccentColor(key: PrayerTab) {
    if (key === "intercession") return "var(--terra-dark)";
    return "var(--sage-dark)";
  }

  function tabAccentBg(key: PrayerTab) {
    if (key === "intercession") return "var(--terra-dark)";
    return "var(--sage)";
  }

  function profileName(prayer: any) {
    if (prayer.is_anonymous) return c("prayer_intercession_anonymous");
    return prayer.profiles?.name || c("prayer_intercession_anonymous");
  }

  return (
    <div className="page">
      {badgePopup && (
        <div onClick={() => setBadgePopup(null)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(26,28,30,0.92)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 28px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg2)", borderRadius: 28, border: "1px solid rgba(232,197,71,0.4)", width: "100%", maxWidth: 340, padding: "32px 24px 28px", textAlign: "center" }}>
            <div style={{ width: 120, height: 120, margin: "0 auto 16px" }}>
              <img src={badgePopup.img} alt="badge" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "rgba(232,197,71,0.95)", marginBottom: 10, lineHeight: 1.3 }}>{badgePopup.title}</h2>
            <div style={{ padding: "14px 16px", background: "rgba(232,197,71,0.08)", borderRadius: 14, border: "1px solid rgba(232,197,71,0.25)", marginBottom: 20 }}>
              <p style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.7 }}>{badgePopup.msg}</p>
            </div>
            <button onClick={() => setBadgePopup(null)} style={{ width: "100%", padding: "13px", background: "rgba(232,197,71,0.9)", color: "#1a1c1e", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              {t("badge_thanks", lang)}
            </button>
          </div>
        </div>
      )}
      {notice && (
        <div style={{ position: "fixed", top: 84, left: "50%", transform: "translateX(-50%)", zIndex: 210, background: "rgba(26,28,30,0.96)", color: "#fff", padding: "12px 16px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", fontSize: 13, fontWeight: 600, boxShadow: "0 8px 28px rgba(0,0,0,0.22)", maxWidth: 320, width: "calc(100% - 40px)", textAlign: "center" }}>
          {notice}
        </div>
      )}
      <Celebration
        show={celebration}
        message={c("prayer_saved_message")}
        subMessage={c("prayer_saved_sub")}
        onClose={() => setCelebration(false)}
      />

      {/* 헤더 */}
      <div style={{ background: "var(--bg)", padding: "56px 20px 0", borderBottom: "1px solid var(--border)" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>{t("prayer_title", lang)}</h1>
        <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.7, marginBottom: 16 }}>
          {c("prayer_sub_line1")}<br />
          {c("prayer_sub_line2")}
        </p>

        {/* 탭 */}
        <div style={{ display: "flex", gap: 0 }}>
          {([
            { key: "mine", label: t("prayer_tab_mine", lang), count: myPrayingList.length, icon: "/icon-prayer-request.webp" },
            { key: "answered", label: t("prayer_tab_answered", lang), count: answeredList.length, icon: "/icon-prayer-answered.webp" },
            { key: "intercession", label: t("prayer_tab_intercession", lang), count: intercessionPrayers.length, icon: "/icon-pray.webp" },
          ] as const).map(({ key, label, count, icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  flex: 1, padding: "10px 0 12px",
                  background: "none", border: "none",
                  borderBottom: active ? `2px solid ${tabAccentColor(key)}` : "2px solid transparent",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                }}
              >
                <img src={icon} alt="" style={{ width: 19, height: 19, objectFit: "contain", opacity: active ? 1 : 0.48 }} />
                <span style={{ fontSize: 12, fontWeight: active ? 700 : 400, color: active ? tabAccentColor(key) : "var(--text3)", whiteSpace: "nowrap" }}>
                  {label}
                </span>
                {count > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: active ? "var(--bg)" : "var(--text3)", background: active ? tabAccentBg(key) : "var(--border)", borderRadius: 20, padding: "1px 6px", minWidth: 18, textAlign: "center" }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
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
            <div style={{ marginBottom: 12, display: "flex", justifyContent: "center" }}>
              <img src={emptyIconSrc} alt="" style={{ width: 54, height: 54, objectFit: "contain", opacity: 0.55 }} />
            </div>
            <p style={{ color: "var(--text3)", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
              {emptyTitle}
            </p>
            <p style={{ color: "var(--text3)", fontSize: 12, lineHeight: 1.6 }}>
              {emptySub}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {currentList.map(p => (
              <div key={p.id} className={`prayer-card ${p.is_answered ? "answered" : ""}`}>

                {tab === "intercession" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    {p.profiles?.avatar_url && !p.is_anonymous ? (
                      <img src={p.profiles.avatar_url} alt="" style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)" }} />
                    ) : (
                      <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(196,149,106,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <img src="/icon-pray.webp" alt="" style={{ width: 17, height: 17, objectFit: "contain" }} />
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)", lineHeight: 1.2 }}>{profileName(p)}</p>
                      <p style={{ fontSize: 10, color: "var(--text3)", lineHeight: 1.2 }}>{c("prayer_intercession_card_sub")}</p>
                    </div>
                  </div>
                )}

                {/* 응답 배지 */}
                {p.is_answered && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <CheckCircle size={14} style={{ color: "var(--terra-dark)" }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--terra-dark)" }}>{c("prayer_answered_badge")}</span>
                    {p.answered_at && (
                      <span style={{ fontSize: 10, color: "var(--text3)", marginLeft: "auto" }}>
                        {new Date(p.answered_at).toLocaleDateString(getDateLocale(lang), { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                )}

                {/* 중보기도 요청 중 */}
                {p.visibility === "all" && !p.is_answered && tab !== "intercession" && (
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 9, fontWeight: 600, color: "var(--sage-dark)", background: "var(--sage-light)", padding: "3px 10px", borderRadius: 20, border: "1px solid rgba(122,157,122,0.3)" }}>
                      {c("prayer_intercession_badge", { count: p.prayer_count ?? 0 })}
                    </span>
                  </div>
                )}

                {tab === "intercession" && !p.is_answered && (
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "var(--terra-dark)", background: "rgba(196,149,106,0.12)", padding: "3px 10px", borderRadius: 20, border: "1px solid rgba(196,149,106,0.28)" }}>
                      {c("prayer_intercession_praying_badge", { count: p.prayer_count ?? 0 })}
                    </span>
                  </div>
                )}

                {/* 수정 모드 */}
                {editId === p.id && tab !== "intercession" ? (
                  <div>
                    <textarea className="textarea-field" rows={3} value={editText}
                      onChange={e => setEditText(e.target.value)} style={{ marginBottom: 8 }} />
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={saveEdit} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "8px", borderRadius: 10, background: "var(--sage)", color: "var(--bg)", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                        <Check size={13} /> {c("prayer_save")}
                      </button>
                      <button onClick={() => setEditId(null)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "8px", borderRadius: 10, background: "var(--bg3)", color: "var(--text3)", border: "1px solid var(--border)", cursor: "pointer", fontSize: 12 }}>
                        <X size={13} /> {c("prayer_cancel")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 10, color: "var(--text)" }}>
                      {p.content} {p.is_answered && tab !== "intercession" && <span style={{ fontSize: 10, color: "var(--text3)" }}>({new Date(p.created_at).toLocaleDateString(getDateLocale(lang), { month: "short", day: "numeric" })})</span>}
                    </p>

                    {/* 간증 */}
                    {p.testimony && (
                      <div style={{ background: "rgba(196,149,106,0.08)", borderRadius: 10, padding: "10px 12px", marginBottom: 10, border: "1px solid rgba(196,149,106,0.2)" }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--terra-dark)", marginBottom: 4 }}>{c("prayer_testimony")}</p>
                        <p style={{ color: "var(--text2)", fontSize: 12, lineHeight: 1.6, fontStyle: "italic" }}>"{p.testimony}"</p>
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {!p.is_answered && tab !== "intercession" && (
                          <>
                            <button onClick={() => { setEditId(p.id); setEditText(p.content); }}
                              style={{ fontSize: 10, color: "var(--text3)", border: "1px solid var(--border)", padding: "5px 10px", borderRadius: 20, background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                              <Pencil size={10} /> {c("prayer_edit")}
                            </button>
                            <button onClick={() => openAnsweredPrayer(p.id)}
                              style={{ fontSize: 10, color: "var(--terra-dark)", border: "1px solid rgba(196,149,106,0.4)", padding: "5px 10px", borderRadius: 20, background: "rgba(196,149,106,0.08)", cursor: "pointer" }}>
                              {c("prayer_answered_cta")}
                            </button>
                            {p.visibility !== "all" && (
                              <button onClick={() => requestIntercession(p.id)}
                                style={{ fontSize: 10, color: "var(--sage-dark)", border: "1px solid rgba(122,157,122,0.3)", padding: "5px 10px", borderRadius: 20, background: "var(--sage-light)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                                <Send size={10} /> {c("prayer_request_intercession")}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                      {!p.is_answered && <span style={{ fontSize: 10, color: "var(--text3)" }}>
                        {new Date(p.created_at).toLocaleDateString(getDateLocale(lang), { month: "short", day: "numeric" })}
                      </span>}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {testimonyPrayerId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 45, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px" }}>
          <div style={{ background: "var(--bg2)", width: "100%", maxWidth: 390, borderRadius: 24, padding: 24, border: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
              {c("prayer_share_answered_title")}
            </h2>
            <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 14 }}>
              {c("prayer_share_answered_desc")}
            </p>
            <textarea
              className="textarea-field"
              rows={4}
              placeholder={c("prayer_share_answered_placeholder")}
              value={testimonyText}
              onChange={e => setTestimonyText(e.target.value)}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button className="btn-outline" onClick={() => { setTestimonyPrayerId(null); setTestimonyText(""); }} style={{ flex: 1 }}>
                {c("prayer_cancel")}
              </button>
              <button className="btn-sage" onClick={saveAnsweredPrayer} disabled={savingTestimony || !testimonyText.trim()} style={{ flex: 1 }}>
                {savingTestimony ? <Loader2 size={16} className="spin" /> : c("prayer_save_action")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 기도 작성 폼 */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px" }}>
          <div style={{ background: "var(--bg2)", width: "100%", maxWidth: 390, borderRadius: 24, padding: 24, border: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>{c("prayer_write_title")}</h2>
            <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 14 }}>{c("prayer_write_desc")}</p>
            <textarea className="textarea-field" rows={4}
              placeholder={c("prayer_write_placeholder")}
              value={newPrayer} onChange={e => setNewPrayer(e.target.value)} />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button className="btn-outline" onClick={() => setShowForm(false)} style={{ flex: 1 }}>{c("prayer_cancel")}</button>
              <button className="btn-sage" onClick={submit} disabled={saving || !newPrayer.trim()} style={{ flex: 1 }}>
                {saving ? <Loader2 size={16} className="spin" /> : c("prayer_save_action")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* + 버튼 (나의 기도 탭에서만) */}
      {tab === "mine" && (
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


function PrayerPageFallback() {
  return (
    <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" />
    </div>
  );
}

export default function PrayerPage() {
  return (
    <Suspense fallback={<PrayerPageFallback />}>
      <PrayerPageContent />
    </Suspense>
  );
}

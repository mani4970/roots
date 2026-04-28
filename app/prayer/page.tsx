"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import Celebration from "@/components/Celebration";
import { createClient } from "@/lib/supabase";
import { useLang } from "@/lib/useLang";
import { t, type Lang } from "@/lib/i18n";
import { getDateLocale, getLocalDateString } from "@/lib/date";
import { Plus, CheckCircle, Loader2, Send, Pencil, X, Check, HandHeart, Sparkles } from "lucide-react";

const PRAYER_TEXT = {
  savePrayerError: { ko: "기도 제목을 저장하지 못했어요.", de: "Das Gebetsanliegen konnte nicht gespeichert werden.", en: "Could not save the prayer request.", fr: "Impossible d’enregistrer le sujet de prière."  },
  editError: { ko: "수정을 저장하지 못했어요.", de: "Die Änderungen konnten nicht gespeichert werden.", en: "Could not save your changes.", fr: "Impossible d’enregistrer les modifications."  },
  intercessionError: { ko: "중보기도 요청을 저장하지 못했어요.", de: "Die Fürbitte-Anfrage konnte nicht gespeichert werden.", en: "Could not save the intercession request.", fr: "Impossible d’enregistrer la demande d’intercession."  },
  answeredError: { ko: "기도 응답을 저장하지 못했어요.", de: "Die Gebetserhörung konnte nicht gespeichert werden.", en: "Could not save the answered prayer.", fr: "Impossible d’enregistrer la prière exaucée."  },
  warriorTitle: { ko: "기도의 용사 배지 획득! ⚔️", de: "Gebetskrieger-Abzeichen! ⚔️", en: "Prayer Warrior Badge! ⚔️", fr: "Badge Guerrier de prière ! ⚔️"  },
  noahTitle: { ko: "노아 배지 획득! ⛵", de: "Noah-Abzeichen! ⛵", en: "Noah Badge! ⛵", fr: "Badge Noé ! ⛵"  },
  savedMessage: { ko: "기도 제목 저장!", de: "Gebetsanliegen gespeichert!", en: "Prayer requests saved!", fr: "Sujets de prière enregistrés !"  },
  savedSub: { ko: "구하고 찾는 자에게 반드시 하나님이 응답하실거예요", de: "Gott wird denen antworten, die suchen und bitten", en: "God will answer those who seek and ask", fr: "Dieu répondra à ceux qui cherchent et demandent"  },
} as const;

function pt(key: keyof typeof PRAYER_TEXT, lang: Lang) {
  const entry = PRAYER_TEXT[key] as Partial<Record<Lang, string>> & { ko: string };
  return entry[lang] ?? entry.en ?? entry.ko;
}

function PrayerPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = useLang();
  const [badgePopup, setBadgePopup] = useState<{img:string;title:string;msg:string}|null>(null);
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
  const [notice, setNotice] = useState<string | null>(null);
  const [testimonyPrayerId, setTestimonyPrayerId] = useState<string | null>(null);
  const [testimonyText, setTestimonyText] = useState("");
  const [savingTestimony, setSavingTestimony] = useState(false);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2400);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => { loadPrayers(); }, []);

  useEffect(() => {
    if (searchParams.get("compose") === "1") {
      setTab("praying");
      setShowForm(true);
      router.replace("/prayer");
    }
  }, [searchParams, router]);

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
      setNotice(pt("savePrayerError", lang));
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!editText.trim() || !editId) return;
    const supabase = createClient();
    const { error } = await supabase.from("prayer_items").update({ content: editText.trim() }).eq("id", editId);
    if (error) {
      setNotice(pt("editError", lang));
      return;
    }
    setEditId(null); setEditText("");
    loadPrayers();
  }

  async function requestIntercession(id: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error: visibilityError } = await supabase.from("prayer_items").update({ visibility: "all" }).eq("id", id);
    if (visibilityError) {
      setNotice(pt("intercessionError", lang));
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
          img: "/prayer_warrior.png",
          title: pt("warriorTitle", lang),
          msg: t("badge_prayer_warrior_msg", lang),
        });
      }
    }
    loadPrayers();
  }

  async function saveAnsweredPrayer() {
    if (!testimonyPrayerId || !testimonyText.trim() || savingTestimony) return;
    setSavingTestimony(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    // 노아 뱃지 체크 (첫 기도 응답)
    if (user) {
      const { data: prof } = await supabase.from("profiles")
        .select("badge_noah").eq("id", user.id).single();
      if (!prof?.badge_noah) {
        await supabase.from("profiles").update({ badge_noah: true }).eq("id", user.id);
        setBadgePopup({ img: "/badge_noah.png", title: pt("noahTitle", lang), msg: t("badge_noah_msg", lang) });
      }
    }
    const { error } = await supabase.from("prayer_items").update({
      is_answered: true,
      testimony: testimonyText.trim(),
      answered_at: new Date().toISOString(),
    }).eq("id", testimonyPrayerId);
    if (error) {
      setNotice(pt("answeredError", lang));
      setSavingTestimony(false);
      return;
    }
    setTestimonyPrayerId(null);
    setTestimonyText("");
    setSavingTestimony(false);
    await loadPrayers();
    setTab("answered");
  }

  function openAnsweredPrayer(id: string) {
    setTestimonyPrayerId(id);
    setTestimonyText("");
  }

  const prayingList = prayers.filter(p => !p.is_answered);
  const answeredList = prayers.filter(p => p.is_answered);
  const currentList = tab === "praying" ? prayingList : answeredList;

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
        message={pt("savedMessage", lang)}
        subMessage={pt("savedSub", lang)}
        onClose={() => setCelebration(false)}
      />

      {/* 헤더 */}
      <div style={{ background: "var(--bg)", padding: "56px 20px 0", borderBottom: "1px solid var(--border)" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>{t("prayer_title", lang)}</h1>
        <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.7, marginBottom: 16 }}>
          {lang === "de" ? "Gebetsanliegen aufschreiben. Um Fürbitte bitten." : lang === "fr" ? "Écrivez vos sujets de prière. Demandez l’intercession." : lang === "en" ? "Write prayer requests. Ask for intercession." : "기도 제목을 적어보세요. 함께 중보기도를 요청하세요."}<br />
          {lang === "de" ? "Wenn Gebete erhört werden, ein Zeugnis hinterlassen." : lang === "fr" ? "Quand une prière est exaucée, laissez un témoignage." : lang === "en" ? "When prayers are answered, leave a testimony." : "기도가 응답됐을 때, 받은 은혜를 간증으로 남겨주세요."}
        </p>

        {/* 탭 */}
        <div style={{ display: "flex", gap: 0 }}>
          {[
            { key: "praying", label: t("prayer_tab_praying", lang), count: prayingList.length, icon: <HandHeart size={14} /> },
            { key: "answered", label: t("prayer_tab_answered", lang), count: answeredList.length, icon: <Sparkles size={14} /> },
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
              <span style={{ display: "flex", color: tab === key ? "var(--sage-dark)" : "var(--text3)" }}>{icon}</span>
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
            <div style={{ color: "var(--text3)", marginBottom: 12, display: "flex", justifyContent: "center" }}>{tab === "praying" ? <HandHeart size={36} /> : <Sparkles size={36} />}</div>
            <p style={{ color: "var(--text3)", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
              {tab === "praying" ? (lang === "de" ? "Keine Gebetsanliegen" : lang === "fr" ? "Aucun sujet de prière" : lang === "en" ? "No prayer requests" : "기도 제목이 없어요") : (lang === "de" ? "Noch keine erhörten Gebete" : lang === "fr" ? "Aucune prière exaucée pour l’instant" : lang === "en" ? "No answered prayers yet" : "아직 응답된 기도가 없어요")}
            </p>
            <p style={{ color: "var(--text3)", fontSize: 12, lineHeight: 1.6 }}>
              {tab === "praying"
                ? (lang === "de" ? "+ drücken, um ein Anliegen zu schreiben" : lang === "fr" ? "+ Appuyez pour écrire un sujet" : lang === "en" ? "+ Press to write a request" : "+ 버튼으로 기도 제목을 적어보세요")
                : (lang === "de" ? "Tippen Sie bei einem Gebetsanliegen auf 'Erhört'" : lang === "fr" ? "Appuyez sur « Exaucée » pour un sujet de prière." : lang === "en" ? "Tap 'Answered' for a prayer request." : "기도 중인 제목에서 '응답됐어요'를 눌러보세요")}
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
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--terra-dark)" }}>{lang === "de" ? "Gebet erhört!" : lang === "fr" ? "Prière exaucée !" : lang === "en" ? "Prayer answered!" : "기도 응답!"}</span>
                    {p.answered_at && (
                      <span style={{ fontSize: 10, color: "var(--text3)", marginLeft: "auto" }}>
                        {new Date(p.answered_at).toLocaleDateString(getDateLocale(lang), { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                )}

                {/* 중보기도 요청 중 */}
                {p.visibility === "all" && !p.is_answered && (
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 9, fontWeight: 600, color: "var(--sage-dark)", background: "var(--sage-light)", padding: "3px 10px", borderRadius: 20, border: "1px solid rgba(122,157,122,0.3)" }}>
                      {lang === "de" ? `Fürbittenaufruf · ${p.prayer_count ?? 0} beten mit` : lang === "fr" ? `Demande d’intercession · ${p.prayer_count ?? 0} en prière` : lang === "en" ? `Intercession · ${p.prayer_count ?? 0} praying` : `중보기도 요청 중 · ${p.prayer_count ?? 0}명 기도 중`}
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
                        <Check size={13} /> {lang === "de" ? "Speichern" : lang === "fr" ? "Enregistrer" : lang === "en" ? "Save" : "저장"}
                      </button>
                      <button onClick={() => setEditId(null)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "8px", borderRadius: 10, background: "var(--bg3)", color: "var(--text3)", border: "1px solid var(--border)", cursor: "pointer", fontSize: 12 }}>
                        <X size={13} /> {lang === "de" ? "Abbrechen" : lang === "fr" ? "Annuler" : lang === "en" ? "Cancel" : "취소"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 10, color: "var(--text)" }}>
                      {p.content} {p.is_answered && <span style={{ fontSize: 10, color: "var(--text3)" }}>({new Date(p.created_at).toLocaleDateString(getDateLocale(lang), { month: "short", day: "numeric" })})</span>}
                    </p>

                    {/* 간증 */}
                    {p.testimony && (
                      <div style={{ background: "rgba(196,149,106,0.08)", borderRadius: 10, padding: "10px 12px", marginBottom: 10, border: "1px solid rgba(196,149,106,0.2)" }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--terra-dark)", marginBottom: 4 }}>{lang === "de" ? "Zeugnis ✍️" : lang === "fr" ? "Témoignage ✍️" : lang === "en" ? "Testimony ✍️" : "간증 ✍️"}</p>
                        <p style={{ color: "var(--text2)", fontSize: 12, lineHeight: 1.6, fontStyle: "italic" }}>"{p.testimony}"</p>
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {!p.is_answered && (
                          <>
                            <button onClick={() => { setEditId(p.id); setEditText(p.content); }}
                              style={{ fontSize: 10, color: "var(--text3)", border: "1px solid var(--border)", padding: "5px 10px", borderRadius: 20, background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                              <Pencil size={10} /> {lang === "de" ? "Ändern" : lang === "fr" ? "Modifier" : lang === "en" ? "Edit" : "수정"}
                            </button>
                            <button onClick={() => openAnsweredPrayer(p.id)}
                              style={{ fontSize: 10, color: "var(--terra-dark)", border: "1px solid rgba(196,149,106,0.4)", padding: "5px 10px", borderRadius: 20, background: "rgba(196,149,106,0.08)", cursor: "pointer" }}>
                              {lang === "de" ? "Erhört" : lang === "fr" ? "Exaucée" : lang === "en" ? "Answered" : "응답됐어요"}
                            </button>
                            {p.visibility !== "all" && (
                              <button onClick={() => requestIntercession(p.id)}
                                style={{ fontSize: 10, color: "var(--sage-dark)", border: "1px solid rgba(122,157,122,0.3)", padding: "5px 10px", borderRadius: 20, background: "var(--sage-light)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                                <Send size={10} /> {lang === "de" ? "Fürbitte bitten" : lang === "fr" ? "Demander l’intercession" : lang === "en" ? "Ask for intercession" : "중보기도 요청"}
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
              {lang === "de" ? "Gebetserhörung teilen" : lang === "fr" ? "Partager une prière exaucée" : lang === "en" ? "Share answered prayer" : "기도 응답 간증 나누기"}
            </h2>
            <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 14 }}>
              {lang === "de" ? "Schreiben Sie kurz auf, wie Gott geantwortet hat." : lang === "fr" ? "Écrivez brièvement comment Dieu a répondu." : lang === "en" ? "Write a short testimony of how God answered." : "하나님이 어떻게 응답하셨는지 짧게 남겨보세요."}
            </p>
            <textarea
              className="textarea-field"
              rows={4}
              placeholder={lang === "de" ? "Gebetszeugnis schreiben..." : lang === "fr" ? "Écrivez votre témoignage..." : lang === "en" ? "Write your testimony..." : "응답 간증을 적어주세요..."}
              value={testimonyText}
              onChange={e => setTestimonyText(e.target.value)}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button className="btn-outline" onClick={() => { setTestimonyPrayerId(null); setTestimonyText(""); }} style={{ flex: 1 }}>
                {lang === "de" ? "Abbrechen" : lang === "fr" ? "Annuler" : lang === "en" ? "Cancel" : "취소"}
              </button>
              <button className="btn-sage" onClick={saveAnsweredPrayer} disabled={savingTestimony || !testimonyText.trim()} style={{ flex: 1 }}>
                {savingTestimony ? <Loader2 size={16} className="spin" /> : (lang === "de" ? "Speichern" : lang === "fr" ? "Enregistrer" : lang === "en" ? "Save" : "저장하기")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 기도 작성 폼 */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px" }}>
          <div style={{ background: "var(--bg2)", width: "100%", maxWidth: 390, borderRadius: 24, padding: 24, border: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>{lang === "de" ? "Gebetsanliegen schreiben" : lang === "fr" ? "Écrire un sujet de prière" : lang === "en" ? "Write prayer request" : "기도 제목 적기"}</h2>
            <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 14 }}>{lang === "de" ? "Standardmäßig nur für Sie sichtbar." : lang === "fr" ? "Visible uniquement par vous par défaut." : lang === "en" ? "Only visible to you by default." : "기본적으로 나만 볼 수 있어요."}</p>
            <textarea className="textarea-field" rows={4}
              placeholder={lang === "de" ? "Gebetsanliegen eingeben..." : lang === "fr" ? "Écrivez vos sujets de prière..." : lang === "en" ? "Enter prayer requests..." : "기도 제목을 적어주세요..."}
              value={newPrayer} onChange={e => setNewPrayer(e.target.value)} />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button className="btn-outline" onClick={() => setShowForm(false)} style={{ flex: 1 }}>{lang === "de" ? "Abbrechen" : lang === "fr" ? "Annuler" : lang === "en" ? "Cancel" : "취소"}</button>
              <button className="btn-sage" onClick={submit} disabled={saving || !newPrayer.trim()} style={{ flex: 1 }}>
                {saving ? <Loader2 size={16} className="spin" /> : (lang === "de" ? "Speichern" : lang === "fr" ? "Enregistrer" : lang === "en" ? "Save" : "저장하기")}
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

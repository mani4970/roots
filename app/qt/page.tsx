"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase";
import { storageGet, storageSet } from "@/lib/clientStorage";
import { useLang } from "@/lib/useLang";
import { t, type TKey } from "@/lib/i18n";
import { translateBookName, translateBibleRef } from "@/lib/bibleBooks";
import { buildQTWriteHref } from "@/lib/qtEntry";
import { getDateLocale, getLocalDateString, parseLocalDateString } from "@/lib/date";
import { ChevronRight, Loader2, Plus, ChevronDown, HelpCircle, X, BookOpen, HandHeart, Sparkles, MessageCircle, Leaf, CheckCircle2, PenLine, CalendarDays } from "lucide-react";

const QT_GUIDE_KEYS: { icon: "prayer" | "book" | "sparkles" | "reflect" | "leaf" | "complete"; titleKey: TKey; descKey: TKey; exKey: TKey }[] = [
  { icon: "prayer", titleKey: "qt_g1_title", descKey: "qt_g1_desc", exKey: "qt_g1_ex" },
  { icon: "book", titleKey: "qt_g2_title", descKey: "qt_g2_desc", exKey: "qt_g2_ex" },
  { icon: "sparkles", titleKey: "qt_g3_title", descKey: "qt_g3_desc", exKey: "qt_g3_ex" },
  { icon: "reflect", titleKey: "qt_g4_title", descKey: "qt_g4_desc", exKey: "qt_g4_ex" },
  { icon: "leaf", titleKey: "qt_g5_title", descKey: "qt_g5_desc", exKey: "qt_g5_ex" },
  { icon: "complete", titleKey: "qt_g6_title", descKey: "qt_g6_desc", exKey: "qt_g6_ex" },
];

function QTGuideIcon({ icon, size = 20 }: { icon: typeof QT_GUIDE_KEYS[number]["icon"]; size?: number }) {
  if (icon === "prayer") return <HandHeart size={size} strokeWidth={1.9} />;
  if (icon === "book") return <BookOpen size={size} strokeWidth={1.9} />;
  if (icon === "sparkles") return <Sparkles size={size} strokeWidth={1.9} />;
  if (icon === "reflect") return <MessageCircle size={size} strokeWidth={1.9} />;
  if (icon === "leaf") return <Leaf size={size} strokeWidth={1.9} />;
  return <CheckCircle2 size={size} strokeWidth={1.9} />;
}

const TRANSLATIONS_BY_GROUP: { groupKey: TKey; items: { id: number; name: string }[] }[] = [
  { groupKey: "qt_translation_ko", items: [
    {id:92,name:"개역개정"},{id:84,name:"개역한글"},{id:98,name:"새번역"},{id:88,name:"쉬운성경"},{id:89,name:"우리말성경"},
    {id:90,name:"바른성경"},{id:83,name:"현대인의성경"},{id:81,name:"공동번역"},{id:99,name:"새한글"},{id:87,name:"한글KJV"},
  ]},
  { groupKey: "qt_translation_en", items: [
    {id:67,name:"KJV"},{id:80,name:"NIV"},{id:100,name:"ESV"},{id:62,name:"NASB"},{id:82,name:"NLT"},{id:95,name:"The Message"},
  ]},
  { groupKey: "qt_translation_de", items: [
    {id:29,name:"Luther"},{id:27,name:"Elberfelder"},{id:97,name:"Hoffnung für Alle"},
  ]},
  { groupKey: "qt_translation_fr", items: [
    {id:26,name:"Louis Segond"},{id:24,name:"Jérusalem"},
  ]},
];
const ALL_TRANSLATIONS = TRANSLATIONS_BY_GROUP.flatMap(g => g.items);

type QTRecord = {
  id: string;
  date: string;
  bible_ref?: string | null;
  key_verse?: string | null;
  qt_mode?: string | null;
  meditation?: string | null;
  [key: string]: any;
};

type QTMonthGroup = {
  key: string;
  month: number;
  records: QTRecord[];
};

function getYearMonthKey(dateValue = getLocalDateString()) {
  const date = parseLocalDateString(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getMonthGroups(recordsForYear: QTRecord[], year: number): QTMonthGroup[] {
  const grouped = recordsForYear.reduce((acc, record) => {
    const date = parseLocalDateString(record.date);
    const month = date.getMonth() + 1;
    const key = `${year}-${String(month).padStart(2, "0")}`;

    if (!acc[key]) {
      acc[key] = { key, month, records: [] };
    }

    acc[key].records.push(record);
    return acc;
  }, {} as Record<string, QTMonthGroup>);

  return Object.values(grouped).sort((a, b) => b.month - a.month);
}

export default function QTPage() {
  const router = useRouter();
  const lang = useLang();
  const [records, setRecords] = useState<QTRecord[]>([]);
  const [todayDone, setTodayDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedYear, setExpandedYear] = useState<number | null>(() => parseLocalDateString(getLocalDateString()).getFullYear());
  const [expandedMonthKeys, setExpandedMonthKeys] = useState<Set<string>>(() => new Set([getYearMonthKey()]));
  const [showStartModal, setShowStartModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [guidePage, setGuidePage] = useState(0);
  const [hasDraft, setHasDraft] = useState(false);
  const [showDraftPopup, setShowDraftPopup] = useState(false);
  const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return getLocalDateString(d); })();
  const [showCatchUpModal, setShowCatchUpModal] = useState(false);
  const [catchUpDate, setCatchUpDate] = useState(yesterday);
  const [todaySchedule, setTodaySchedule] = useState<{book:string;chapter:number;start_verse:number;end_verse:number;end_chapter:number|null;title:string|null}|null>(null);
  const [preferredTranslation, setPreferredTranslation] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = storageGet("roots_default_translation");
      if (saved) return parseInt(saved);
    }
    return 92;
  });
  const [showTranslationPicker, setShowTranslationPicker] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  }

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const today = getLocalDateString();
      const { data: todayRows } = await supabase.from("qt_records")
        .select("id,is_draft")
        .eq("user_id", user.id)
        .eq("date", today)
        .order("created_at", { ascending: false });
      const completedExists = !!todayRows?.some((row: any) => row.is_draft === false);
      const draftExists = !completedExists && !!todayRows?.some((row: any) => row.is_draft === true);
      setTodayDone(completedExists);
      setHasDraft(draftExists);
      if (draftExists) setShowDraftPopup(true);
      const { data } = await supabase.from("qt_records").select("*")
        .eq("user_id", user.id).eq("is_draft", false)
        .order("date", { ascending: false });
      if (data) setRecords(data);

      const todayDate = new Date();
      if (todayDate.getDay() !== 0) {
        const { data: sched } = await supabase
          .from("qt_schedule")
          .select("book,chapter,start_verse,end_verse,end_chapter,title")
          .eq("date", today)
          .maybeSingle();
        if (sched) setTodaySchedule(sched);
      }

      const { data: prof } = await supabase.from("profiles")
        .select("preferred_translation").eq("id", user.id).single();
      if (prof?.preferred_translation) { setPreferredTranslation(prof.preferred_translation); storageSet("roots_default_translation", String(prof.preferred_translation)); }
    } catch (error) {
      console.error("qt load failed", error);
      showToast(t("qt_error_load", lang));
    } finally {
      setLoading(false);
    }
  }

  const byYear = records.reduce((acc, r) => {
    const year = parseLocalDateString(r.date).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(r);
    return acc;
  }, {} as Record<number, any[]>);
  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a);
  const currentGuide = QT_GUIDE_KEYS[guidePage];

  function toggleMonth(monthKey: string) {
    setExpandedMonthKeys(prev => {
      const next = new Set(prev);
      if (next.has(monthKey)) {
        next.delete(monthKey);
      } else {
        next.add(monthKey);
      }
      return next;
    });
  }

  function startQT(mode: string) {
    setShowStartModal(false);
    router.push(buildQTWriteHref({
      mode: mode as "6step" | "sunday" | "free",
      preferredTranslation,
      todaySchedule,
    }));
  }

  async function deleteDraftAndStart() {
    const supabase = createClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const today = getLocalDateString();
      const { error } = await supabase.from("qt_records").delete().eq("user_id", user.id).eq("date", today).eq("is_draft", true);
      if (error) throw error;
      setHasDraft(false);
      setShowDraftPopup(false);
      setShowStartModal(true);
    } catch (error) {
      console.error("qt draft delete failed", error);
      showToast(t("qt_error_draft_delete", lang));
    }
  }


  function startCatchUp(mode: "6step" | "free") {
    const targetDate = catchUpDateOptions.includes(catchUpDate) ? catchUpDate : catchUpDateOptions[0];
    if (!targetDate) {
      showToast(t("qt_catchup_no_dates", lang));
      return;
    }
    setShowCatchUpModal(false);
    const params = new URLSearchParams({
      mode,
      date: targetDate,
      catchup: "true",
      translation: String(preferredTranslation),
    });
    router.push(`/qt/write?${params.toString()}`);
  }

  const completedRecordDates = new Set(records.map(r => r.date));
  const catchUpDateOptions = Array.from({ length: 60 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (i + 1));
    return getLocalDateString(d);
  }).filter(d => !completedRecordDates.has(d));

  const dateLocale = getDateLocale(lang);
  const isSundayToday = new Date().getDay() === 0;

  return (
    <div className="page">
      {toast && (
        <div style={{ position: "fixed", top: 18, left: "50%", transform: "translateX(-50%)", zIndex: 300, background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 999, padding: "10px 16px", fontSize: 13, fontWeight: 700, boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}>
          {toast}
        </div>
      )}
      {showDraftPopup && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(26,28,30,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
          <div style={{ background: "var(--bg2)", borderRadius: 28, border: "1px solid var(--border)", width: "100%", maxWidth: 340, padding: "32px 24px 24px", textAlign: "center" }}>
            <BookOpen size={38} style={{ color: "var(--sage)", marginBottom: 12 }} />
            <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>{t("qt_draft_title", lang)}</h3>
            <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6, marginBottom: 20, whiteSpace: "pre-line" }}>{t("qt_draft_sub", lang)}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={() => { setShowDraftPopup(false); router.push("/qt/write?resume=true"); }} className="btn-primary">{t("qt_draft_continue", lang)}</button>
              <button onClick={deleteDraftAndStart} className="btn-outline">{t("qt_draft_new", lang)}</button>
              <button onClick={() => setShowDraftPopup(false)} style={{ background: "none", border: "none", color: "var(--text3)", fontSize: 12, padding: 8, cursor: "pointer" }}>{t("qt_draft_later", lang)}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: "var(--bg)", padding: "56px 20px 16px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)" }}>{t("qt_title", lang)}</h1>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowTranslationPicker(p => !p)}
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, cursor: "pointer" }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text2)" }}>
                {ALL_TRANSLATIONS.find(tr => tr.id === preferredTranslation)?.name ?? "개역개정"}
              </span>
              <ChevronDown size={12} style={{ color: "var(--text3)" }} />
            </button>
            {showTranslationPicker && (
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: "6px 0", zIndex: 100, minWidth: 170, boxShadow: "0 4px 20px rgba(0,0,0,0.2)", maxHeight: 300, overflowY: "auto" }}>
                {TRANSLATIONS_BY_GROUP.map(g => (
                  <div key={g.groupKey}>
                    <p style={{ fontSize: 9, fontWeight: 700, color: "var(--text3)", padding: "6px 12px 2px", letterSpacing: "0.5px" }}>{t(g.groupKey, lang)}</p>
                    {g.items.map(tr => (
                      <button key={tr.id} onClick={async () => {
                        setPreferredTranslation(tr.id);
                        setShowTranslationPicker(false);
                        const supabase = createClient();
                        try {
                          const { data: { user } } = await supabase.auth.getUser();
                          if (user) {
                            const { error } = await supabase.from("profiles").update({ preferred_translation: tr.id }).eq("id", user.id);
                            if (error) throw error;
                          }
                        } catch (error) {
                          console.error("preferred translation save failed", error);
                          showToast(t("qt_error_translation_save", lang));
                        }
                      }} style={{ width: "100%", textAlign: "left", padding: "7px 12px", background: preferredTranslation === tr.id ? "var(--sage-light)" : "none", border: "none", cursor: "pointer", fontSize: 12, color: preferredTranslation === tr.id ? "var(--sage-dark)" : "var(--text)", fontWeight: preferredTranslation === tr.id ? 700 : 400 }}>
                        {tr.name} {preferredTranslation === tr.id ? "✓" : ""}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <p style={{ color: "var(--text3)", fontSize: 12 }}>{t("qt_sub", lang)}</p>
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        {todayDone ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="card-sage" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <CheckCircle2 size={24} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--sage-dark)" }}>{t("qt_today_done", lang)}</p>
                <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{t("qt_today_done_sub", lang)}</p>
              </div>
            </div>
            <button onClick={() => setShowCatchUpModal(true)} className="btn-outline" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <CalendarDays size={17} /> {t("qt_catchup_start", lang)}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {new Date().getDay() !== 0 && todaySchedule && (
              <div style={{ background: "var(--sage-light)", borderRadius: 14, padding: "12px 16px", border: "1px solid rgba(122,157,122,0.3)" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "var(--sage-dark)", letterSpacing: "0.5px", marginBottom: 4 }}>{t("qt_today_bible_ref", lang)}</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: todaySchedule.title ? 2 : 0 }}>
                  {translateBookName(todaySchedule.book, lang)} {todaySchedule.chapter}:{todaySchedule.start_verse}
                  {todaySchedule.end_chapter && todaySchedule.end_chapter !== todaySchedule.chapter
                    ? `~${todaySchedule.end_chapter}:${todaySchedule.end_verse}`
                    : todaySchedule.end_verse !== todaySchedule.start_verse
                    ? `-${todaySchedule.end_verse}`
                    : ""}
                </p>
                {todaySchedule.title && <p style={{ fontSize: 12, color: "var(--text3)" }}>{todaySchedule.title}</p>}
              </div>
            )}
            {new Date().getDay() === 0 && (
              <div className="card-sage">
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--sage-dark)", marginBottom: 4 }}>{t("qt_sunday_title", lang)}</p>
                <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>{t("qt_sunday_desc", lang)}</p>
              </div>
            )}
            <button onClick={() => { if (hasDraft) { setShowDraftPopup(true); } else { setShowStartModal(true); } }} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Plus size={18} /> {t("qt_today_start", lang)}
            </button>
            <button onClick={() => setShowCatchUpModal(true)} className="btn-outline" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <CalendarDays size={17} /> {t("qt_catchup_start", lang)}
            </button>
          </div>
        )}
      </div>

      <div style={{ padding: "20px 16px 0" }}>
        <div className="sec-label">{t("qt_past_records", lang)}</div>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" />
          </div>
        ) : records.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <BookOpen size={32} style={{ color: "var(--text3)", marginBottom: 10 }} />
            <p style={{ color: "var(--text3)", fontSize: 14 }}>{t("qt_no_records_simple", lang)}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {years.map(year => (
              <div key={year}>
                <button onClick={() => setExpandedYear(expandedYear === year ? null : year)} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: "0 2px", marginBottom: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: expandedYear === year ? "var(--sage-dark)" : "var(--text2)" }}>
                    {t("qt_year_records", lang, { year, count: byYear[year].length })}
                  </span>
                  <ChevronDown size={14} style={{ color: "var(--text3)", transform: expandedYear === year ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                </button>
                {expandedYear === year && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingLeft: 2 }}>
                    {getMonthGroups(byYear[year], year).map(monthGroup => {
                      const monthOpen = expandedMonthKeys.has(monthGroup.key);
                      const monthLabel = new Date(year, monthGroup.month - 1, 1).toLocaleDateString(dateLocale, { month: "long" });

                      return (
                        <div key={monthGroup.key} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <button
                            onClick={() => toggleMonth(monthGroup.key)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              width: "100%",
                              background: monthOpen ? "var(--bg2)" : "transparent",
                              border: monthOpen ? "1px solid var(--border)" : "1px solid transparent",
                              borderRadius: 12,
                              cursor: "pointer",
                              padding: "9px 10px",
                              textAlign: "left",
                            }}
                          >
                            <span style={{ fontSize: 13, fontWeight: 750, color: monthOpen ? "var(--terra)" : "var(--text2)" }}>
                              {t("qt_month_records", lang, { month: monthLabel, count: monthGroup.records.length })}
                            </span>
                            <ChevronDown size={14} style={{ color: "var(--text3)", transform: monthOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
                          </button>

                          {monthOpen && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              {monthGroup.records.map((r: QTRecord) => (
                                <button key={r.id} onClick={() => router.push(`/qt/record?id=${r.id}`)} className="qt-record-item">
                                  <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: 10, color: "var(--text3)", marginBottom: 4 }}>
                                      {parseLocalDateString(r.date).toLocaleDateString(dateLocale, { month: "long", day: "numeric", weekday: "short" })}
                                    </p>
                                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--terra)", marginBottom: r.key_verse ? 4 : 0 }}>
                                      {r.bible_ref ? translateBibleRef(r.bible_ref, lang) : (r.qt_mode === "free" ? t("profile_free_qt", lang) : t("profile_sunday_qt", lang))}
                                    </p>
                                    {r.key_verse && <p style={{ fontSize: 11, color: "var(--text2)", lineHeight: 1.4 }}>"{r.key_verse.slice(0, 45)}{r.key_verse.length > 45 ? "..." : ""}"</p>}
                                    {r.qt_mode === "free" && r.meditation && <p style={{ fontSize: 11, color: "var(--text2)", lineHeight: 1.4 }}>{r.meditation.slice(0, 45)}{r.meditation.length > 45 ? "..." : ""}</p>}
                                  </div>
                                  <ChevronRight size={16} style={{ color: "var(--text3)", flexShrink: 0 }} />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showCatchUpModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px" }}>
          <div style={{ background: "var(--bg2)", width: "100%", maxWidth: 400, borderRadius: 24, padding: "24px 20px 28px", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)" }}>{t("qt_catchup_title", lang)}</h2>
              <button onClick={() => setShowCatchUpModal(false)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6, marginBottom: 16 }}>{t("qt_catchup_sub", lang)}</p>

            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", display: "block", marginBottom: 6 }}>{t("qt_catchup_date_label", lang)}</label>
            {catchUpDateOptions.length > 0 ? (
              <select value={catchUpDateOptions.includes(catchUpDate) ? catchUpDate : catchUpDateOptions[0]} onChange={e => setCatchUpDate(e.target.value)} className="input-field" style={{ marginBottom: 14 }}>
                {catchUpDateOptions.map(d => (
                  <option key={d} value={d}>{parseLocalDateString(d).toLocaleDateString(dateLocale, { year: "numeric", month: "long", day: "numeric", weekday: "short" })}</option>
                ))}
              </select>
            ) : (
              <div style={{ padding: "14px", borderRadius: 14, background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text3)", fontSize: 12, lineHeight: 1.5, marginBottom: 14 }}>
                {t("qt_catchup_no_dates", lang)}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button disabled={catchUpDateOptions.length === 0} onClick={() => startCatchUp("6step")} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px", borderRadius: 16, border: "1px solid var(--sage)", background: "var(--sage-light)", cursor: catchUpDateOptions.length === 0 ? "not-allowed" : "pointer", opacity: catchUpDateOptions.length === 0 ? 0.5 : 1, textAlign: "left" }}>
                <BookOpen size={28} strokeWidth={1.8} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "var(--sage-dark)", marginBottom: 3 }}>{t("qt_mode_6step_title", lang)}</p>
                  <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.5 }}>{t("qt_catchup_6step_desc", lang)}</p>
                </div>
              </button>
              <button disabled={catchUpDateOptions.length === 0} onClick={() => startCatchUp("free")} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px", borderRadius: 16, border: "1px solid var(--border)", background: "var(--bg3)", cursor: catchUpDateOptions.length === 0 ? "not-allowed" : "pointer", opacity: catchUpDateOptions.length === 0 ? 0.5 : 1, textAlign: "left" }}>
                <PenLine size={28} strokeWidth={1.8} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 3 }}>{t("qt_mode_free_title", lang)}</p>
                  <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.5 }}>{t("qt_catchup_free_desc", lang)}</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {showStartModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px" }}>
          <div style={{ background: "var(--bg2)", width: "100%", maxWidth: 400, borderRadius: 24, padding: "24px 20px 28px", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)" }}>{t("qt_how_title", lang)}</h2>
              <button onClick={() => setShowStartModal(false)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 18 }}>{t("qt_how_sub", lang)}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                disabled={isSundayToday}
                onClick={() => {
                  if (isSundayToday) {
                    showToast(t("qt_sunday_required", lang));
                    return;
                  }
                  startQT("6step");
                }}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px", borderRadius: 16, border: isSundayToday ? "1px solid var(--border)" : "1px solid var(--sage)", background: isSundayToday ? "var(--bg3)" : "var(--sage-light)", cursor: isSundayToday ? "not-allowed" : "pointer", textAlign: "left", opacity: isSundayToday ? 0.6 : 1 }}
              >
                <BookOpen size={28} strokeWidth={1.8} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: isSundayToday ? "var(--text3)" : "var(--sage-dark)", marginBottom: 3 }}>{t("qt_mode_6step_title", lang)}</p>
                  <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.5, whiteSpace: "pre-line" }}>{t("qt_mode_6step_desc", lang)}</p>
                </div>
              </button>
              <button
                disabled={!isSundayToday}
                onClick={() => {
                  if (!isSundayToday) return;
                  startQT("sunday");
                }}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px", borderRadius: 16, border: isSundayToday ? "1px solid var(--sage)" : "1px solid var(--border)", background: isSundayToday ? "var(--sage-light)" : "var(--bg3)", cursor: isSundayToday ? "pointer" : "not-allowed", textAlign: "left", opacity: isSundayToday ? 1 : 0.6 }}
              >
                <HandHeart size={28} strokeWidth={1.8} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: isSundayToday ? "var(--sage-dark)" : "var(--text3)", marginBottom: 3 }}>{t("qt_mode_sunday_title", lang)}</p>
                  <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.5, whiteSpace: "pre-line" }}>{t("qt_mode_sunday_desc", lang)}</p>
                </div>
              </button>
              <button onClick={() => startQT("free")} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px", borderRadius: 16, border: "1px solid var(--border)", background: "var(--bg3)", cursor: "pointer", textAlign: "left" }}>
                <PenLine size={28} strokeWidth={1.8} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 3 }}>{t("qt_mode_free_title", lang)}</p>
                  <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.5, whiteSpace: "pre-line" }}>{t("qt_mode_free_desc", lang)}</p>
                </div>
              </button>
            </div>
            <button onClick={() => { setShowStartModal(false); setGuidePage(0); setShowGuideModal(true); }} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", marginTop: 14, padding: "10px", borderRadius: 12, border: "1px solid var(--border)", background: "none", cursor: "pointer", fontSize: 12, color: "var(--text3)" }}>
              <HelpCircle size={14} /> {t("qt_guide_btn", lang)}
            </button>
          </div>
        </div>
      )}

      {showGuideModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px" }}>
          <div style={{ background: "var(--bg2)", width: "100%", maxWidth: 390, borderRadius: 24, border: "1px solid var(--border)", overflow: "hidden" }}>
            <div style={{ background: "var(--sage-light)", padding: "18px 20px 14px", borderBottom: "1px solid rgba(122,157,122,0.2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--sage-dark)", letterSpacing: "1px" }}>{t("qt_guide_step_label", lang)} {guidePage + 1}/6</p>
                <button onClick={() => setShowGuideModal(false)} style={{ background: "none", border: "none", color: "var(--sage-dark)", cursor: "pointer" }}><X size={18} /></button>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {QT_GUIDE_KEYS.map((_, i) => (
                  <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= guidePage ? "var(--sage)" : "rgba(122,157,122,0.3)", transition: "all 0.3s" }} />
                ))}
              </div>
            </div>
            <div style={{ padding: "18px 20px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ color: "var(--sage-dark)", display: "flex" }}><QTGuideIcon icon={currentGuide.icon} size={28} /></span>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--text)" }}>{guidePage + 1} · {t(currentGuide.titleKey, lang)}</h2>
              </div>
              <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.75, marginBottom: 12 }}>{t(currentGuide.descKey, lang)}</p>
              <div style={{ background: "var(--bg3)", borderRadius: 12, padding: "10px 14px", border: "1px solid var(--border)" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "var(--terra-dark)", marginBottom: 5 }}>{t("qt_guide_example", lang)}</p>
                <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.7, fontStyle: "italic", whiteSpace: "pre-line" }}>{t(currentGuide.exKey, lang)}</p>
              </div>
            </div>
            <div style={{ padding: "0 20px 20px", display: "flex", gap: 8 }}>
              {guidePage > 0 && (
                <button onClick={() => setGuidePage(p => p - 1)} className="btn-outline" style={{ flex: 1 }}>{t("qt_guide_prev", lang)}</button>
              )}
              {guidePage < QT_GUIDE_KEYS.length - 1 ? (
                <button onClick={() => setGuidePage(p => p + 1)} className="btn-sage" style={{ flex: 2 }}>{t("qt_guide_next", lang)}</button>
              ) : (
                <button onClick={() => { storageSet("qt_guide_done", "true"); setShowGuideModal(false); setShowStartModal(true); }} className="btn-sage" style={{ flex: 2 }}>
                  {t("qt_guide_start", lang)}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

"use client";
import { useEffect, useState, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import TreeGrowth from "@/components/TreeGrowth";
import Celebration from "@/components/Celebration";
import Onboarding from "@/components/Onboarding";
import RootsManPopup from "@/components/RootsManPopup";
import WelcomeBackPopup from "@/components/WelcomeBackPopup";
import LanguagePicker from "@/components/LanguagePicker";
import GardenUpdatePopup from "@/components/GardenUpdatePopup";
import { createClient } from "@/lib/supabase";
import { useLang, setPreferredLang, isFirstLaunch } from "@/lib/useLang";
import { getLanguageOptions, LANG_META, t, type TKey } from "@/lib/i18n";
import { translateBookName } from "@/lib/bibleBooks";
import { buildQTWriteHref, getRecommendedQTMode, isSunday, type QTSchedule, type QTMode } from "@/lib/qtEntry";
import { ChevronRight, Check, BookOpen, HandHeart, CheckCircle2, Sparkles, MessageCircle, Leaf } from "lucide-react";
import { getLocalDateString, parseLocalDateString } from "@/lib/date";
import { storageGet, storageSet } from "@/lib/clientStorage";

function getGreetingKey(): "home_greeting_morning" | "home_greeting_afternoon" | "home_greeting_evening" | "home_greeting_night" {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "home_greeting_morning";
  if (h >= 12 && h < 17) return "home_greeting_afternoon";
  if (h >= 17 && h < 19) return "home_greeting_evening";
  return "home_greeting_night";
}

function getTreeSubMsgKey(streak: number): "tree_sub_0"|"tree_sub_10"|"tree_sub_20"|"tree_sub_30"|"tree_sub_40"|"tree_sub_50"|"tree_sub_60"|"tree_sub_70"|"tree_sub_80"|"tree_sub_90"|"tree_sub_100" {
  if (streak <= 0) return "tree_sub_0";
  const cycleDay = ((streak - 1) % 100) + 1;
  if (cycleDay <= 10) return "tree_sub_10";
  if (cycleDay <= 20) return "tree_sub_20";
  if (cycleDay <= 30) return "tree_sub_30";
  if (cycleDay <= 40) return "tree_sub_40";
  if (cycleDay <= 50) return "tree_sub_50";
  if (cycleDay <= 60) return "tree_sub_60";
  if (cycleDay <= 70) return "tree_sub_70";
  if (cycleDay <= 80) return "tree_sub_80";
  if (cycleDay <= 90) return "tree_sub_90";
  return "tree_sub_100";
}

const gardenTopRef_scroll = () => {
  window.scrollTo({ top: 0, behavior: "instant" });
};

type HomeQTState = {
  hasDraft: boolean;
  preferredTranslation: number;
  todaySchedule: QTSchedule | null;
};

function parseDecisionDoneList(value: unknown, fallback: boolean[]): boolean[] {
  if (typeof value !== "string" || !value.trim()) return fallback;

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return fallback;

    return fallback.map((fallbackValue, index) =>
      typeof parsed[index] === "boolean" ? parsed[index] : fallbackValue
    );
  } catch {
    return fallback;
  }
}

export default function HomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [todayVerse, setTodayVerse] = useState<any>(null);
  const [myDecisions, setMyDecisions] = useState<{text:string;done:boolean}[]>([]);
  const [todayDone, setTodayDone] = useState({ qt: false, prayer: false });
  const [loading, setLoading] = useState(true);
  const [celebration, setCelebration] = useState({ show: false, message: "", subMessage: "", launchRootsMan: false });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showRootsMan, setShowRootsMan] = useState(false);
  const [showRootsManPopup, setShowRootsManPopup] = useState(false);
  const [showHomeQTChoice, setShowHomeQTChoice] = useState(false);
  const [showHomeQTGuide, setShowHomeQTGuide] = useState(false);
  const [showHomeSundayQT, setShowHomeSundayQT] = useState(false);
  const [gardenPopup, setGardenPopup] = useState<{show:boolean; type:"garden"|"badge"; badgeIndex:number}>({
    show: false, type: "garden", badgeIndex: 0,
  });
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [welcomeBackDays, setWelcomeBackDays] = useState(0);
  const lang = useLang();
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [showFirstLangPicker, setShowFirstLangPicker] = useState(false);
  const [badgePopup, setBadgePopup] = useState<{img:string;title:string;msg:string}|null>(null);
  const newlyAwardedBadgesRef = useRef<Set<string>>(new Set());
  const celebrationShownRef = useRef(false);
  const celebrationQueueRef = useRef<Array<{ message: string; subMessage?: string; launchRootsMan?: boolean }>>([]);
  const pendingRootsManRef = useRef(false);
  const applySectionRef = useRef<HTMLDivElement | null>(null);
  const prayerSectionRef = useRef<HTMLDivElement | null>(null);
  const treeSectionRef = useRef<HTMLDivElement | null>(null);
  const [homeQTState, setHomeQTState] = useState<HomeQTState>({
    hasDraft: false,
    preferredTranslation: 92,
    todaySchedule: null,
  });
  const [completedQtRecordId, setCompletedQtRecordId] = useState<string | null>(null);
  const [homeDecisionInput, setHomeDecisionInput] = useState("");
  const [savingHomeDecision, setSavingHomeDecision] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  }
  const homeDecisionInputRef = useRef<HTMLInputElement | null>(null);

  const hasMyDecisions = myDecisions.length > 0;
  const decisionDone = hasMyDecisions ? myDecisions.some(d => d.done) : false;
  const allDone = todayDone.qt && todayDone.prayer && decisionDone;

  useEffect(() => { load(); }, []);

  async function load() {
    if (typeof window !== "undefined") {
      const saved = storageGet("roots_theme");
      if (saved === "light") {
        document.documentElement.setAttribute("data-theme", "light");
        setTheme("light");
      }
    }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/welcome"); return; }

    const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (p) {
      setProfile(p);
      setHomeQTState(prev => ({
        ...prev,
        preferredTranslation: p.preferred_translation || 92,
      }));
      const lastCheckin = p.last_checkin ? String(p.last_checkin).slice(0, 10) : null;
      if (lastCheckin) {
        const lastDate = parseLocalDateString(lastCheckin);
        lastDate.setHours(0,0,0,0);
        const todayDate = new Date(); todayDate.setHours(0,0,0,0);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / 86400000);
        const missedDays = Math.max(0, diffDays - 1);
        const welcomeKey = `welcome_back_${getLocalDateString()}`;
        if (missedDays >= 1 && !storageGet(welcomeKey)) {
          storageSet(welcomeKey, "true");
          setWelcomeBackDays(missedDays);
          setShowWelcomeBack(true);
        }
      }
    }

    const today = getLocalDateString();
    const { data: ci } = await supabase.from("daily_checkins")
      .select("verse,reference,verse_text,verse_reference,verse_lang,verse_translation_id,verse_ref_id")
      .eq("user_id", user.id).eq("date", today).maybeSingle();
    if (ci) {
      setTodayVerse({
        ...ci,
        verse: ci.verse_text ?? ci.verse,
        reference: ci.verse_reference ?? ci.reference,
      });
    }

    const { data: qtRecords } = await supabase.from("qt_records")
      .select("id,is_draft,decision")
      .eq("user_id", user.id)
      .eq("date", today);

    const { data: prayerCompletion } = await supabase
      .from("daily_prayer_completions")
      .select("id")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();
    const prayerChecked = !!prayerCompletion;

    const completedQt = qtRecords?.find((record: any) => !record.is_draft) ?? null;
    const hasDraft = qtRecords?.some((record: any) => record.is_draft) ?? false;
    setCompletedQtRecordId(completedQt?.id ?? null);

    let todaySchedule: QTSchedule | null = null;
    if (!isSunday()) {
      const { data: sched } = await supabase
        .from("qt_schedule")
        .select("book,chapter,start_verse,end_verse,end_chapter,title")
        .eq("date", today)
        .maybeSingle();
      todaySchedule = sched ?? null;
    }

    setHomeQTState(prev => ({
      ...prev,
      hasDraft,
      todaySchedule,
    }));

    if (completedQt?.decision) {
      const decisions = completedQt.decision.split("\n").filter((d: string) => d.trim());
      const { data: dc } = await supabase.from("daily_checkins")
        .select("decisions_done").eq("user_id", user.id).eq("date", today).maybeSingle();
      const defaultDoneList = decisions.map(() => false);
      const doneList = parseDecisionDoneList(dc?.decisions_done, defaultDoneList);
      setMyDecisions(decisions.map((text: string, i: number) => ({ text, done: doneList[i] ?? false })));
    } else {
      setMyDecisions([]);
    }

    setTodayDone({ qt: !!completedQt, prayer: prayerChecked });

    if (storageGet(`celebrated_${today}`)) {
      celebrationShownRef.current = true;
    }
    if (isFirstLaunch()) {
      setShowFirstLangPicker(true);
    }
    if (!storageGet("onboarding_done")) { setShowOnboarding(true); }
    setLoading(false);
  }

  useEffect(() => {
    const onboardingDone = storageGet("onboarding_done");
    if (!loading && allDone && !celebrationShownRef.current && onboardingDone) {
      const today = getLocalDateString();
      if (!storageGet(`celebrated_${today}`)) {
        void (async () => {
          const updated = await updateStreak(today);
          if (!updated) return;
          celebrationShownRef.current = true;
          storageSet(`celebrated_${today}`, "true");
          enqueueCelebration({
            message: t("home_celebration_title", lang),
            subMessage: t(getTreeSubMsgKey((profile?.streak_days ?? 0) + 1), lang),
            launchRootsMan: true,
          });
        })();
      }
    }
  }, [allDone, loading]);

  async function updateStreak(today: string): Promise<boolean> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data: p } = await supabase.from("profiles")
      .select("streak_days, total_days, last_checkin, badge_angel, badge_rootsman, badge_rootsman_bible, badge_david, badge_mose").eq("id", user.id).single();
    if (!p) return false;
    const lastCheckinDate = p.last_checkin ? String(p.last_checkin).slice(0, 10) : null;
    if (lastCheckinDate === today) return true;
    // Roots intentionally keeps the streak when a user returns after a break.
    // Returning is welcomed and the routine continues instead of resetting to zero.
    let newStreak = p.last_checkin ? (p.streak_days ?? 0) + 1 : 1;
    const alreadyHasAngel = p.badge_angel ?? false;
    const alreadyHasRootsman = p.badge_rootsman ?? false;
    const alreadyHasRootsmanBible = p.badge_rootsman_bible ?? false;
    const alreadyHasMose = p.badge_mose ?? false;
    const alreadyHasDavid = p.badge_david ?? false;
    const badgeUpdate: any = {
      streak_days: newStreak,
      total_days: (p.total_days ?? 0) + 1,
      last_checkin: today,
    };
    if (newStreak >= 7 && !alreadyHasRootsman) {
      badgeUpdate.badge_rootsman = true;
      newlyAwardedBadgesRef.current.add("badge_rootsman");
    }
    if (newStreak >= 40 && !alreadyHasMose) {
      badgeUpdate.badge_mose = true;
      newlyAwardedBadgesRef.current.add("badge_mose");
    }
    if (newStreak >= 52 && !alreadyHasRootsmanBible) {
      badgeUpdate.badge_rootsman_bible = true;
      newlyAwardedBadgesRef.current.add("badge_rootsman_bible");
    }
    if (newStreak >= 111 && !alreadyHasDavid) {
      badgeUpdate.badge_david = true;
      newlyAwardedBadgesRef.current.add("badge_david");
    }
    const fruitBadgeIndex =
      newStreak % 100 === 0 && newStreak >= 100 && newStreak <= 900
        ? Math.floor(newStreak / 100) - 1
        : null;
    if (fruitBadgeIndex !== null) {
      newlyAwardedBadgesRef.current.add(`fruit_badge_${fruitBadgeIndex}`);
    }
    if (newStreak >= 1000 && !alreadyHasAngel) {
      badgeUpdate.badge_angel = true;
      newlyAwardedBadgesRef.current.add("badge_angel");
    }
    const { error } = await supabase.from("profiles").update(badgeUpdate).eq("id", user.id);
    if (error) return false;
    const { data: newProfile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (newProfile) setProfile(newProfile);
    return true;
  }

  useEffect(() => {
    if (!profile) return;
    const newly = newlyAwardedBadgesRef.current;
    const streak = profile?.streak_days ?? 0;

    // 이번 세션에서 새로 획득한 뱃지만 팝업 (newlyAwardedBadgesRef에 있는 것만)
    if (newly.has("badge_rootsman")) {
      newly.delete("badge_rootsman");
      setBadgePopup({ img: "/badge_rootsman.png", title: t("badge_rootsman_title", lang), msg: t("badge_rootsman_desc", lang) });
      return;
    }
    if (newly.has("badge_mose")) {
      newly.delete("badge_mose");
      setBadgePopup({ img: "/badge_mose.png", title: t("badge_mose_title", lang), msg: t("badge_mose_desc", lang) });
      return;
    }
    if (newly.has("badge_rootsman_bible")) {
      newly.delete("badge_rootsman_bible");
      setBadgePopup({ img: "/badge_rootsman_bible.png", title: t("badge_rootsman_bible_title", lang), msg: t("badge_rootsman_bible_desc", lang) });
      return;
    }
    if (newly.has("badge_david")) {
      newly.delete("badge_david");
      setBadgePopup({ img: "/badge_david.png", title: t("badge_david_title", lang), msg: t("badge_david_desc", lang) });
      return;
    }
    for (let i = 0; i < 9; i++) {
      const key = `fruit_badge_${i}`;
      if (newly.has(key)) {
        newly.delete(key);
        setGardenPopup({ show: true, type: "badge", badgeIndex: i });
        return;
      }
    }
    if (newly.has("badge_angel")) {
      newly.delete("badge_angel");
      setBadgePopup({ img: "/angel.png", title: t("badge_popup_angel", lang), msg: t("badge_angel_msg", lang) });
      return;
    }

    // 정원 단계 변경 팝업 (10일마다)
    const cycleDay = streak > 0 ? (((streak - 1) % 100) + 1) : 0;
    if (cycleDay % 10 === 1 && cycleDay > 1) {
      const gardenKey = `garden_shown_${streak}`;
      if (!storageGet(gardenKey)) {
        storageSet(gardenKey, "true");
        setGardenPopup({ show: true, type: "garden", badgeIndex: 0 });
      }
    }
  }, [profile]);

  function enqueueCelebration(item: { message: string; subMessage?: string; launchRootsMan?: boolean }) {
    setCelebration((current) => {
      if (!current.show) {
        return {
          show: true,
          message: item.message,
          subMessage: item.subMessage ?? "",
          launchRootsMan: !!item.launchRootsMan,
        };
      }
      celebrationQueueRef.current.push(item);
      return current;
    });
  }

  function openRootsManExperience() {
    setShowRootsMan(false);
    setShowRootsManPopup(true);
  }

  function closeCelebration() {
    const launchRootsMan = celebration.launchRootsMan;
    const next = celebrationQueueRef.current.shift();

    if (next) {
      if (launchRootsMan) pendingRootsManRef.current = true;
      setCelebration({
        show: true,
        message: next.message,
        subMessage: next.subMessage ?? "",
        launchRootsMan: !!next.launchRootsMan,
      });
      return;
    }

    setCelebration({ show: false, message: "", subMessage: "", launchRootsMan: false });
    if (launchRootsMan || pendingRootsManRef.current) {
      pendingRootsManRef.current = false;
      openRootsManExperience();
    }
  }

  async function markQuietPrayer() {
    if (todayDone.prayer) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const today = getLocalDateString();
    const { error } = await supabase.from("daily_prayer_completions").upsert({
      user_id: user.id,
      date: today,
      source: "quiet",
    }, { onConflict: "user_id,date" });
    if (error) {
      showToast(t("home_prayer_save_error", lang));
      return;
    }
    setTodayDone(p => ({ ...p, prayer: true }));
    enqueueCelebration({
      message: t("home_prayer_quiet_celeb", lang),
      subMessage: t("home_prayer_quiet_celeb_sub", lang),
    });
  }

  function openPrayerRequest() {
    router.push("/prayer?compose=1");
  }

  async function saveHomeDecision() {
    const decisionText = homeDecisionInput.trim();
    if (!decisionText || savingHomeDecision) return;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = getLocalDateString();
    setSavingHomeDecision(true);
    try {
      let targetRecordId = completedQtRecordId;

      if (!targetRecordId) {
        const { data: completedRow } = await supabase.from("qt_records")
          .select("id")
          .eq("user_id", user.id)
          .eq("date", today)
          .eq("is_draft", false)
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle();
        targetRecordId = completedRow?.id ?? null;
      }

      if (!targetRecordId) {
        router.push("/qt");
        return;
      }

      const { error: recordError } = await supabase.from("qt_records")
        .update({ decision: decisionText })
        .eq("id", targetRecordId);
      if (recordError) throw recordError;

      const doneList = [false];
      const { error: checkinError } = await supabase.from("daily_checkins").upsert({
        user_id: user.id,
        date: today,
        decisions_done: JSON.stringify(doneList),
      }, { onConflict: "user_id,date" });
      if (checkinError) throw checkinError;

      setCompletedQtRecordId(targetRecordId);
      setMyDecisions([{ text: decisionText, done: false }]);
      setHomeDecisionInput("");
      requestAnimationFrame(() => {
        applySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (error) {
      console.error(error);
      showToast(t("home_decision_save_error", lang));
    } finally {
      setSavingHomeDecision(false);
    }
  }

  async function toggleMyDecision(i: number) {
    if (myDecisions[i].done) return;
    const today = getLocalDateString();
    const updated = myDecisions.map((d, idx) => idx === i ? { ...d, done: true } : d);
    setMyDecisions(updated);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from("daily_checkins")
        .update({ decisions_done: JSON.stringify(updated.map(d => d.done)) })
        .eq("user_id", user.id).eq("date", today);
      if (error) {
        await supabase.from("daily_checkins").insert({
          user_id: user.id, date: today,
          decisions_done: JSON.stringify(updated.map(d => d.done)),
        });
      }
    }
    if (!celebrationShownRef.current && !storageGet(`celebrated_${today}`)) {
      enqueueCelebration({ message: t("home_decision_celeb", lang), subMessage: t("home_decision_celeb_sub", lang) });
    }
  }

  function formatTodaySchedule() {
    const schedule = homeQTState.todaySchedule;
    if (!schedule) return null;
    const translatedBook = translateBookName(schedule.book, lang);
    const verseRange = schedule.end_chapter && schedule.end_chapter !== schedule.chapter
      ? `${schedule.chapter}:${schedule.start_verse}-${schedule.end_chapter}:${schedule.end_verse}`
      : schedule.end_verse !== schedule.start_verse
      ? `${schedule.chapter}:${schedule.start_verse}-${schedule.end_verse}`
      : `${schedule.chapter}:${schedule.start_verse}`;
    return `${translatedBook} ${verseRange}`;
  }

  function startHomeQT(mode?: QTMode) {
    if (homeQTState.hasDraft && !mode) {
      router.push("/qt/write?resume=true");
      return;
    }

    const nextMode = mode ?? getRecommendedQTMode();
    router.push(buildQTWriteHref({
      mode: nextMode,
      preferredTranslation: homeQTState.preferredTranslation,
      todaySchedule: homeQTState.todaySchedule,
    }));
  }

  function openHomeQT() {
    if (homeQTState.hasDraft) {
      startHomeQT();
      return;
    }
    if (todayDone.qt) {
      router.push("/qt");
      return;
    }
    if (isSunday()) {
      setShowHomeSundayQT(true);
      return;
    }
    setShowHomeQTChoice(true);
  }

  function startHomeQTFromPopup(mode: QTMode) {
    setShowHomeQTChoice(false);
    setShowHomeSundayQT(false);
    setShowHomeQTGuide(false);
    startHomeQT(mode);
  }

  function openDecisionSection() {
    if (applySectionRef.current) {
      applySectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      if (!hasMyDecisions) {
        setTimeout(() => homeDecisionInputRef.current?.focus(), 250);
      }
      return;
    }

    if (!todayDone.qt) {
      openHomeQT();
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openPrayerSection() {
    if (prayerSectionRef.current) {
      prayerSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openTreeSection() {
    if (treeSectionRef.current) {
      treeSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const routineCards = [
    {
      label: t("home_routine_qt", lang),
      done: todayDone.qt,
      icon: <img src="/icon-qt.webp" alt="" width={40} height={40} style={{ objectFit: "contain" }} />,
      onClick: openHomeQT,
    },
    {
      label: t("home_routine_prayer", lang),
      done: todayDone.prayer,
      icon: <img src="/icon-pray.webp" alt="" width={40} height={40} style={{ objectFit: "contain" }} />,
      onClick: openPrayerSection,
    },
    {
      label: t("home_routine_decision", lang),
      done: decisionDone,
      icon: <img src="/icon-decision.webp" alt="" width={40} height={40} style={{ objectFit: "contain" }} />,
      onClick: openDecisionSection,
    },
  ];

  const showGardenUpdatePopup = gardenPopup.show && !celebration.show && !showRootsManPopup;

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
      <img
        src="/roots-logo-transparent-160.png"
        alt="Roots sprout"
        width={82}
        height={82}
        style={{ objectFit: "contain" }}
      />
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.5px", marginBottom: 6 }}>Roots</h1>
        <p style={{ fontSize: 13, color: "var(--text3)" }}>{t("home_loading_sub", lang)}</p>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--sage)", animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite` }} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="page fade-in">
      {toast && (
        <div style={{ position: "fixed", top: 18, left: "50%", transform: "translateX(-50%)", zIndex: 300, background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 999, padding: "10px 16px", fontSize: 13, fontWeight: 700, boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}>
          {toast}
        </div>
      )}

      {(showHomeQTChoice || showHomeSundayQT) && (
        <div style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(26,28,30,0.72)", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 16 }}>
          <div style={{ width: "100%", maxWidth: 420, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 24, padding: 18, boxShadow: "0 18px 48px rgba(0,0,0,0.28)", position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>
                  {showHomeSundayQT ? t("home_qt_sunday_title", lang) : t("home_qt_choice_title", lang)}
                </h2>
                <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6 }}>
                  {showHomeSundayQT ? t("home_qt_sunday_sub", lang) : t("home_qt_choice_sub", lang)}
                </p>
              </div>
              <button
                onClick={() => { setShowHomeQTChoice(false); setShowHomeSundayQT(false); setShowHomeQTGuide(false); }}
                aria-label={t("home_qt_choice_close", lang)}
                style={{ position: "absolute", top: 14, right: 14, width: 28, height: 28, border: "none", background: "none", color: "var(--text3)", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                ×
              </button>
            </div>

            {showHomeSundayQT ? (
              <button onClick={() => startHomeQTFromPopup("sunday")} className="btn-sage" style={{ width: "100%", minHeight: 48, marginTop: 8 }}>
                {t("home_qt_sunday_start", lang)}
                <ChevronRight size={16} />
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                <button onClick={() => startHomeQTFromPopup("6step")} className="btn-sage" style={{ width: "100%", minHeight: 48 }}>
                  {t("home_qt_choice_6step", lang)}
                  <ChevronRight size={16} />
                </button>
                <button onClick={() => startHomeQTFromPopup("free")} className="btn-outline" style={{ width: "100%", minHeight: 48 }}>
                  {t("home_qt_choice_free", lang)}
                </button>
                <button onClick={() => setShowHomeQTGuide(v => !v)} style={{ background: "none", border: "none", color: "var(--sage-dark)", fontSize: 13, fontWeight: 700, padding: "6px 0", cursor: "pointer", textAlign: "center" }}>
                  {t("home_qt_choice_guide", lang)}
                </button>
                {showHomeQTGuide && (
                  <div style={{ maxHeight: 260, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 16, padding: 12, background: "var(--bg)" }}>
                    {([
                      [<HandHeart key="g1" size={17} strokeWidth={1.9} />, "qt_g1_title", "qt_g1_desc"],
                      [<BookOpen key="g2" size={17} strokeWidth={1.9} />, "qt_g2_title", "qt_g2_desc"],
                      [<Sparkles key="g3" size={17} strokeWidth={1.9} />, "qt_g3_title", "qt_g3_desc"],
                      [<MessageCircle key="g4" size={17} strokeWidth={1.9} />, "qt_g4_title", "qt_g4_desc"],
                      [<Leaf key="g5" size={17} strokeWidth={1.9} />, "qt_g5_title", "qt_g5_desc"],
                      [<CheckCircle2 key="g6" size={17} strokeWidth={1.9} />, "qt_g6_title", "qt_g6_desc"],
                    ] satisfies Array<[ReactNode, TKey, TKey]>).map(([iconNode, titleKey, descKey]) => (
                      <div key={String(titleKey)} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: titleKey === "qt_g6_title" ? "none" : "1px solid var(--border)" }}>
                        <div style={{ width: 26, height: 26, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--sage-dark)", background: "var(--sage-light)", flexShrink: 0 }}>{iconNode}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", marginBottom: 2 }}>{t(titleKey, lang)}</div>
                          <div style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.55 }}>{t(descKey, lang)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {showFirstLangPicker && (
        <LanguagePicker onSelect={async (l) => {
          await setPreferredLang(l);
          setShowFirstLangPicker(false);
          window.location.reload();
        }} />
      )}
      {showOnboarding && <Onboarding onClose={() => setShowOnboarding(false)} />}

      <WelcomeBackPopup
        show={showWelcomeBack}
        daysSince={welcomeBackDays}
        onClose={() => setShowWelcomeBack(false)}
      />

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
              {t("home_badge_thanks", lang)}
            </button>
          </div>
        </div>
      )}

      <Celebration
        show={celebration.show}
        message={celebration.message}
        subMessage={celebration.subMessage}
        onClose={closeCelebration}
      />

      <RootsManPopup
        show={showRootsManPopup}
        streakDays={profile?.streak_days ?? 0}
        onGoGarden={() => {
          setShowRootsMan(true);
          setShowRootsManPopup(false);
          requestAnimationFrame(() => {
            if (treeSectionRef.current) {
              treeSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
            } else {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          });
        }}
      />

      <GardenUpdatePopup
        show={showGardenUpdatePopup}
        type={gardenPopup.type}
        streakDays={profile?.streak_days ?? 0}
        badgeIndex={gardenPopup.badgeIndex}
        onClose={() => {
          setGardenPopup(p => ({ ...p, show: false }));
          gardenTopRef_scroll();
        }}
      />

      <div style={{ background: "var(--bg)", padding: "56px 20px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 4 }}>{t(getGreetingKey(), lang)}</div>
          <div className="header-title">
            {(() => {
              const name = profile?.name ?? t("profile_default_name", lang);
              const full = t("home_garden_my", lang, { name });
              const emWord = t("home_garden_keyword", lang);
              const idx = full.lastIndexOf(emWord);
              if (idx === -1) return full;
              return <>{full.slice(0, idx)}<em>{emWord}</em>{full.slice(idx + emWord.length)}</>;
            })()}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => {
              const html = document.documentElement;
              const isLight = html.getAttribute("data-theme") === "light";
              if (isLight) {
                html.removeAttribute("data-theme");
                storageSet("roots_theme", "dark");
              } else {
                html.setAttribute("data-theme", "light");
                storageSet("roots_theme", "light");
              }
              setTheme(isLight ? "dark" : "light");
            }}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, padding: 4, lineHeight: 1 }}
          >
            {theme === "light" ? "☀️" : "🌙"}
          </button>
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowLangPicker(p => !p)} style={{ background: "none", border: "none", color: "var(--text3)", marginTop: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 20 }}>{LANG_META[lang].flag}</span>
            </button>
            {showLangPicker && (
              <div onClick={() => setShowLangPicker(false)} style={{ position: "fixed", inset: 0, zIndex: 99 }} />
            )}
            {showLangPicker && (
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: "8px 0", zIndex: 100, minWidth: 150, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
                {getLanguageOptions().map(opt => (
                  <button key={opt.code} onClick={async () => {
                    setShowLangPicker(false);
                    await setPreferredLang(opt.code);
                    window.location.reload();
                  }} style={{ width: "100%", textAlign: "left", padding: "10px 16px", background: lang === opt.code ? "var(--sage-light)" : "none", border: "none", cursor: "pointer", fontSize: 14, color: lang === opt.code ? "var(--sage-dark)" : "var(--text)", fontWeight: lang === opt.code ? 700 : 400, display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{opt.flag}</span>
                    <span>{opt.nativeName}</span>
                    {lang === opt.code && <span style={{ marginLeft: "auto", color: "var(--sage)" }}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div ref={treeSectionRef}>
        <TreeGrowth days={profile?.streak_days ?? 0} lastCheckin={profile?.last_checkin ?? null} showRootsMan={showRootsMan} />
      </div>

      <div style={{ padding: "0 16px 14px" }}>
        <div className="sec-label">{t("home_routine_section", lang)}</div>
        <div style={{ display: "flex", gap: 8 }}>
          {routineCards.map(({ label, done, icon, onClick }) => {
            const bg = done ? "var(--terra-light)" : "var(--bg2)";
            const border = done ? "rgba(196,149,106,0.35)" : "var(--border)";
            const color = done ? "var(--terra-dark)" : "var(--text)";
            const subColor = done ? "var(--terra-dark)" : "var(--text3)";
            return (
              <button key={label} onClick={onClick} style={{ flex: 1, background: bg, border: `1px solid ${border}`, borderRadius: 18, padding: "15px 8px 13px", textAlign: "center", cursor: "pointer" }}>
                <div style={{ width: 44, height: 44, margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center", color }}>{icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color }}>{label}</div>
                <div style={{ fontSize: 11, color: subColor, marginTop: 4 }}>{done ? t("home_routine_done", lang) : t("home_routine_open", lang)}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: "0 16px 14px" }}>
        <div className="sec-label">{t("home_verse_section", lang)}</div>
        <div className="card-sage" style={{ borderRadius: 22, padding: 18 }}>
          {todayVerse?.verse ? (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--sage-dark)", letterSpacing: "0.4px", marginBottom: 10 }}>{todayVerse.reference}</div>
              <p className="verse-text">"{todayVerse.verse}"</p>
            </>
          ) : (
            <>
              <div style={{ fontSize: 14, color: "var(--text3)", lineHeight: 1.7, marginBottom: 14 }}>{t("home_verse_empty", lang)}</div>
              <Link href="/checkin"><button className="btn-sage">{t("home_verse_btn", lang)} <ChevronRight size={16} /></button></Link>
            </>
          )}
        </div>
      </div>

      {(todayDone.qt || myDecisions.length > 0) && (
        <div ref={applySectionRef} style={{ padding: "0 16px 14px" }}>
          <div className="sec-label">{t("home_apply_my", lang)}</div>
          <div className="card" style={{ borderRadius: 22, padding: 18 }}>
            {myDecisions.length > 0 ? (
              myDecisions.map((d, i) => (
                <button key={i} onClick={() => toggleMyDecision(i)} style={{ display: "flex", alignItems: "flex-start", gap: 12, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: i === myDecisions.length - 1 ? "0" : "0 0 10px", width: "100%" }}>
                  <div style={{ width: 24, height: 24, borderRadius: 7, border: `2px solid ${d.done ? "var(--sage)" : "var(--border)"}`, background: d.done ? "var(--sage)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                    {d.done && <Check size={13} style={{ color: "var(--bg)" }} />}
                  </div>
                  <span style={{ fontSize: 14, color: d.done ? "var(--text3)" : "var(--text)", lineHeight: 1.65, textDecoration: d.done ? "line-through" : "none" }}>
                    {i + 1}. {d.text}
                  </span>
                </button>
              ))
            ) : (
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", lineHeight: 1.45, marginBottom: 8 }}>
                  {t("home_next_step_decision_empty_title", lang)}
                </div>
                <div style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.65, marginBottom: 14 }}>
                  {t("home_next_step_decision_empty_sub", lang)}
                </div>
                <input
                  ref={homeDecisionInputRef}
                  value={homeDecisionInput}
                  onChange={(e) => setHomeDecisionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !savingHomeDecision && homeDecisionInput.trim()) {
                      saveHomeDecision();
                    }
                  }}
                  placeholder={t("home_next_step_decision_placeholder", lang)}
                  className="input-field"
                  style={{ fontSize: 14, marginBottom: 10 }}
                />
                <button
                  onClick={saveHomeDecision}
                  disabled={savingHomeDecision || !homeDecisionInput.trim()}
                  className="btn-sage"
                  style={{ width: "100%", minHeight: 46, opacity: savingHomeDecision || !homeDecisionInput.trim() ? 0.55 : 1 }}
                >
                  {savingHomeDecision ? t("loading", lang) : t("home_next_step_decision_save", lang)}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div ref={prayerSectionRef} style={{ padding: "0 16px 14px" }}>
        <div className="sec-label">{t("home_prayer_section", lang)}</div>
        <div className="card" style={{ padding: "18px", borderRadius: 22 }}>
          <div style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.75, marginBottom: 8 }}>
            {t("home_prayer_desc", lang)}
          </div>
          <div style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.7, marginBottom: 14 }}>
            {t("home_prayer_hint", lang)}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={markQuietPrayer}
              disabled={todayDone.prayer}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 14px", background: todayDone.prayer ? "var(--sage)" : "rgba(255,255,255,0.06)", borderRadius: 12, border: `1px solid ${todayDone.prayer ? "var(--sage)" : "var(--border)"}`, cursor: todayDone.prayer ? "default" : "pointer", flex: 1 }}
            >
              <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${todayDone.prayer ? "white" : "var(--text3)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: todayDone.prayer ? "rgba(255,255,255,0.2)" : "transparent" }}>
                {todayDone.prayer && <Check size={12} style={{ color: "white" }} />}
              </div>
              <span style={{ fontSize: 13, color: todayDone.prayer ? "white" : "var(--text2)", fontWeight: todayDone.prayer ? 700 : 600 }}>
                {todayDone.prayer ? t("home_prayer_done_msg", lang) : t("home_prayer_quiet_option", lang)}
              </span>
            </button>
            <button onClick={openPrayerRequest} className="btn-outline" style={{ flex: 1 }}>
              {t("home_prayer_write_option", lang)}
            </button>
          </div>
        </div>
      </div>


      <BottomNav />
    </div>
  );
}

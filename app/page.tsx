"use client";
import { useEffect, useState, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import TreeGrowth from "@/components/TreeGrowth";
import Celebration from "@/components/Celebration";
import ConfettiBurst from "@/components/ConfettiBurst";
import Onboarding from "@/components/Onboarding";
import RootsManPopup from "@/components/RootsManPopup";
import WelcomeBackPopup from "@/components/WelcomeBackPopup";
import LanguagePicker from "@/components/LanguagePicker";
import GardenUpdatePopup from "@/components/GardenUpdatePopup";
import SharePromptModal, { type ShareTargetGroup, type ShareTargetPartner } from "@/components/SharePromptModal";
import { createClient } from "@/lib/supabase";
import { useLang, setPreferredLang, isFirstLaunch } from "@/lib/useLang";
import { getLanguageOptions, LANG_META, t, type TKey } from "@/lib/i18n";
import { translateBookName } from "@/lib/bibleBooks";
import { buildQTPhotoHref, buildQTWriteHref, getRecommendedQTMode, isSunday, type QTSchedule, type QTMode } from "@/lib/qtEntry";
import { ChevronRight, Check, BookOpen, HandHeart, CheckCircle2, Sparkles, MessageCircle, Leaf, ImagePlus } from "lucide-react";
import { getLocalDateString, parseLocalDateString } from "@/lib/date";
import { storageGet, storageRemove, storageSet } from "@/lib/clientStorage";
import { getPendingAwardedBadgesKey, recordBibleReflectionProgress } from "@/lib/reflectionProgress";

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

const QT_COMPLETION_WATERING_KEY_PREFIX = "qt_completion_pending_watering_";
const CELEBRATED_KEY_PREFIX = "celebrated_";
function getScopedStorageKey(prefix: string, userId: string, date: string) {
  return `${prefix}${userId}_${date}`;
}

function getLegacyStorageKey(prefix: string, date: string) {
  return `${prefix}${date}`;
}

function consumePendingAwardedBadges(userId: string, date: string): string[] {
  const key = getPendingAwardedBadgesKey(userId, date);
  const raw = storageGet(key);
  if (!raw) return [];
  storageRemove(key);
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

const gardenTopRef_scroll = () => {
  window.scrollTo({ top: 0, behavior: "instant" });
};

type HomeQTState = {
  hasDraft: boolean;
  preferredTranslation: number;
  todaySchedule: QTSchedule | null;
};

type ChapterPopupState = {
  show: boolean;
  loading: boolean;
  reference: string;
  text: string;
  error: string;
};

const HOME_CHAPTER_LABELS = {
  open: { ko: "장 전체 보기", de: "Ganzes Kapitel", en: "Full chapter", fr: "Chapitre entier" },
  close: { ko: "닫기", de: "Schließen", en: "Close", fr: "Fermer" },
  loading: { ko: "장을 불러오고 있어요...", de: "Kapitel wird geladen...", en: "Loading chapter...", fr: "Chargement du chapitre..." },
  error: { ko: "장 전체를 불러오지 못했어요.", de: "Das ganze Kapitel konnte nicht geladen werden.", en: "Could not load the full chapter.", fr: "Impossible de charger le chapitre entier." },
  chapterSuffix: { ko: "장", de: "", en: "" , fr: "" },
} as const;

function homeChapterText(key: keyof typeof HOME_CHAPTER_LABELS, lang: "ko" | "de" | "en" | "fr") {
  return HOME_CHAPTER_LABELS[key][lang] ?? HOME_CHAPTER_LABELS[key].ko;
}

function formatChapterReference(book: string, chapter: number, lang: "ko" | "de" | "en" | "fr") {
  const translatedBook = translateBookName(book, lang);
  if (lang === "ko") return `${translatedBook} ${chapter}장`;
  if (lang === "de") return `${translatedBook} ${chapter}`;
  if (lang === "fr") return `${translatedBook} ${chapter}`;
  return `${translatedBook} ${chapter}`;
}

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
  const [chapterPopup, setChapterPopup] = useState<ChapterPopupState>({
    show: false,
    loading: false,
    reference: "",
    text: "",
    error: "",
  });
  const [myDecisions, setMyDecisions] = useState<{text:string;done:boolean}[]>([]);
  const [todayDone, setTodayDone] = useState({ qt: false, prayer: false });
  const [loading, setLoading] = useState(true);
  const [celebration, setCelebration] = useState({ show: false, message: "", subMessage: "", launchRootsMan: false });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showRootsMan, setShowRootsMan] = useState(false);
  const [showRootsManPopup, setShowRootsManPopup] = useState(false);
  const [showHomeQTChoice, setShowHomeQTChoice] = useState(false);
  const [showHomeQTPassageChoice, setShowHomeQTPassageChoice] = useState(false);
  const [showHomeQTPhotoPassageChoice, setShowHomeQTPhotoPassageChoice] = useState(false);
  const [showHomeQTGuide, setShowHomeQTGuide] = useState(false);
  const [showHomeSundayQT, setShowHomeSundayQT] = useState(false);
  const [gardenPopup, setGardenPopup] = useState<{show:boolean; type:"garden"|"badge"; badgeIndex:number}>({
    show: false, type: "garden", badgeIndex: 0,
  });
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [welcomeBackDays, setWelcomeBackDays] = useState(0);
  const lang = useLang();
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [showFirstLangPicker, setShowFirstLangPicker] = useState(false);
  const [badgePopup, setBadgePopup] = useState<{img:string;title:string;msg:string}|null>(null);
  const newlyAwardedBadgesRef = useRef<Set<string>>(new Set());
  const celebrationShownRef = useRef(false);
  const progressUpdateInFlightRef = useRef(false);
  const celebrationQueueRef = useRef<Array<{ message: string; subMessage?: string; launchRootsMan?: boolean }>>([]);
  const pendingRootsManRef = useRef(false);
  const [rootsManRequestToken, setRootsManRequestToken] = useState(0);
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
  const [showHomePrayerCompose, setShowHomePrayerCompose] = useState(false);
  const [homePrayerInput, setHomePrayerInput] = useState("");
  const [savingHomePrayer, setSavingHomePrayer] = useState(false);
  const [showHomePrayerSharePrompt, setShowHomePrayerSharePrompt] = useState(false);
  const [homePrayerShareTargets, setHomePrayerShareTargets] = useState<string[]>([]);
  const [homePrayerShareGroups, setHomePrayerShareGroups] = useState<ShareTargetGroup[]>([]);
  const [homePrayerSharePartners, setHomePrayerSharePartners] = useState<ShareTargetPartner[]>([]);
  const [loadingHomePrayerShareOptions, setLoadingHomePrayerShareOptions] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  }
  const homeDecisionInputRef = useRef<HTMLInputElement | null>(null);

  const hasMyDecisions = myDecisions.length > 0;
  const decisionDone = hasMyDecisions ? myDecisions.some(d => d.done) : false;
  const wordWalkDone = todayDone.qt;

  useEffect(() => { load(); }, []);

  async function load() {
    if (typeof window !== "undefined") {
      const saved = storageGet("roots_theme");
      if (saved === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
        setTheme("dark");
      } else {
        document.documentElement.removeAttribute("data-theme");
        setTheme("light");
      }
    }
    const supabase = createClient();
    let { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      await new Promise(resolve => setTimeout(resolve, 350));
      const retry = await supabase.auth.getSession();
      session = retry.data.session;
    }
    const user = session?.user ?? null;
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
    const pendingAwardedBadges = consumePendingAwardedBadges(user.id, today);
    pendingAwardedBadges.forEach((badgeKey) => newlyAwardedBadgesRef.current.add(badgeKey));

    const { data: ci } = await supabase.from("daily_checkins")
      .select("verse,reference,verse_text,verse_reference,verse_lang,verse_translation_id,verse_ref_id,verse_book,verse_start_chapter,verse_start_verse,verse_end_chapter,verse_end_verse")
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

    const completionWateringKey = getScopedStorageKey(QT_COMPLETION_WATERING_KEY_PREFIX, user.id, today);
    const legacyCompletionWateringKey = getLegacyStorageKey(QT_COMPLETION_WATERING_KEY_PREFIX, today);
    const celebratedKey = getScopedStorageKey(CELEBRATED_KEY_PREFIX, user.id, today);
    const profileLastCheckinToday = p?.last_checkin ? String(p.last_checkin).slice(0, 10) === today : false;
    const hasScopedCompletionWateringRequest = !!storageGet(completionWateringKey);
    const hasLegacyCompletionWateringRequest = !!storageGet(legacyCompletionWateringKey);
    const hasCompletionWateringRequest =
      hasScopedCompletionWateringRequest || (hasLegacyCompletionWateringRequest && !profileLastCheckinToday);
    if (!hasCompletionWateringRequest && (storageGet(celebratedKey) || profileLastCheckinToday)) {
      celebrationShownRef.current = true;
      if (profileLastCheckinToday && !storageGet(celebratedKey)) {
        storageSet(celebratedKey, "true");
      }
    }
    if (isFirstLaunch()) {
      setShowFirstLangPicker(true);
    }
    if (!storageGet("onboarding_done")) { setShowOnboarding(true); }
    setLoading(false);
  }

  useEffect(() => {
    const onboardingDone = storageGet("onboarding_done");
    if (loading || !wordWalkDone || !onboardingDone || celebrationShownRef.current || progressUpdateInFlightRef.current) return;

    const today = getLocalDateString();
    const userId = profile?.id;
    if (!userId) return;
    const completionWateringKey = getScopedStorageKey(QT_COMPLETION_WATERING_KEY_PREFIX, userId, today);
    const legacyCompletionWateringKey = getLegacyStorageKey(QT_COMPLETION_WATERING_KEY_PREFIX, today);
    const celebratedKey = getScopedStorageKey(CELEBRATED_KEY_PREFIX, userId, today);
    const profileLastCheckinToday = profile?.last_checkin ? String(profile.last_checkin).slice(0, 10) === today : false;
    const hasScopedCompletionWateringRequest = !!storageGet(completionWateringKey);
    const hasLegacyCompletionWateringRequest = !!storageGet(legacyCompletionWateringKey);
    const hasCompletionWateringRequest =
      hasScopedCompletionWateringRequest || (hasLegacyCompletionWateringRequest && !profileLastCheckinToday);
    if (!hasCompletionWateringRequest && (storageGet(celebratedKey) || profileLastCheckinToday)) {
      celebrationShownRef.current = true;
      if (profileLastCheckinToday && !storageGet(celebratedKey)) {
        storageSet(celebratedKey, "true");
      }
      return;
    }

    progressUpdateInFlightRef.current = true;
    void (async () => {
      const pendingBadgeKeys = consumePendingAwardedBadges(userId, today);
      pendingBadgeKeys.forEach((badgeKey) => newlyAwardedBadgesRef.current.add(badgeKey));

      const progressedOrAlreadyDone = await updateStreak(today);
      if (!progressedOrAlreadyDone) return;
      celebrationShownRef.current = true;
      storageSet(celebratedKey, "true");
      storageRemove(completionWateringKey);
      storageRemove(legacyCompletionWateringKey);
      requestRootsManExperience();
    })().finally(() => {
      progressUpdateInFlightRef.current = false;
    });
  }, [wordWalkDone, loading, profile?.id, profile?.last_checkin]);

  async function updateStreak(today: string): Promise<boolean> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    try {
      const result = await recordBibleReflectionProgress(supabase, user.id, today);
      result.awardedBadges.forEach((badgeKey) => newlyAwardedBadgesRef.current.add(badgeKey));
      if (result.profile) setProfile(result.profile);
      return true;
    } catch (error) {
      console.warn("말씀 묵상 progress 업데이트 실패:", error);
      return false;
    }
  }

  function showNextProgressPopup(): boolean {
    if (!profile || badgePopup || gardenPopup.show) return false;

    const newly = newlyAwardedBadgesRef.current;
    const streak = profile?.streak_days ?? 0;

    // 이번 세션에서 새로 획득한 뱃지만 팝업 (newlyAwardedBadgesRef에 있는 것만)
    if (newly.has("badge_rootsman")) {
      newly.delete("badge_rootsman");
      setBadgePopup({ img: "/badge_rootsman.webp", title: t("badge_popup_rootsman", lang), msg: t("badge_rootsman_msg", lang) });
      return true;
    }
    if (newly.has("badge_mose")) {
      newly.delete("badge_mose");
      setBadgePopup({ img: "/badge_mose.webp", title: t("badge_popup_mose", lang), msg: t("badge_mose_msg", lang) });
      return true;
    }
    if (newly.has("badge_rootsman_bible")) {
      newly.delete("badge_rootsman_bible");
      setBadgePopup({ img: "/badge_rootsman_bible.webp", title: t("badge_popup_rootsman_bible", lang), msg: t("badge_rootsman_bible_msg", lang) });
      return true;
    }
    if (newly.has("badge_david")) {
      newly.delete("badge_david");
      setBadgePopup({ img: "/badge_david.webp", title: t("badge_popup_david", lang), msg: t("badge_david_msg", lang) });
      return true;
    }
    for (let i = 0; i < 9; i++) {
      const key = `fruit_badge_${i}`;
      if (newly.has(key)) {
        newly.delete(key);
        setGardenPopup({ show: true, type: "badge", badgeIndex: i });
        return true;
      }
    }
    if (newly.has("badge_angel")) {
      newly.delete("badge_angel");
      setBadgePopup({ img: "/angel.webp", title: t("badge_popup_angel", lang), msg: t("badge_angel_msg", lang) });
      return true;
    }

    // 정원 단계 변경 팝업 (11/21/31/.../91일마다)
    // Roots의 streak_days는 연속 출석이 아니라 누적 QT 완료일(말씀 동행일)입니다.
    const cycleDay = streak > 0 ? (streak % 100) : 0;
    if (cycleDay % 10 === 1 && cycleDay > 1) {
      const gardenKey = `garden_shown_${streak}`;
      if (!storageGet(gardenKey)) {
        storageSet(gardenKey, "true");
        setGardenPopup({ show: true, type: "garden", badgeIndex: 0 });
        return true;
      }
    }

    return false;
  }

  useEffect(() => {
    if (!profile || celebration.show || showRootsManPopup) return;

    const openedProgressPopup = showNextProgressPopup();
    if (openedProgressPopup) return;

    if (pendingRootsManRef.current && !badgePopup && !gardenPopup.show) {
      pendingRootsManRef.current = false;
      openRootsManExperience();
    }
  }, [profile, celebration.show, badgePopup, gardenPopup.show, showRootsManPopup, rootsManRequestToken]);

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

  function requestRootsManExperience() {
    pendingRootsManRef.current = true;
    setRootsManRequestToken(token => token + 1);
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
      requestRootsManExperience();
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
    setShowHomePrayerCompose(true);
  }

  function splitHomePrayerShareTargets(targets: string[]) {
    const partnerRecipientIds = Array.from(new Set(
      targets
        .filter(target => target.startsWith("partner_"))
        .map(target => target.replace(/^partner_/, ""))
        .filter(Boolean)
    ));
    const visibilityTargets = targets.filter(target => target === "all" || target.startsWith("group_"));
    const visibility = visibilityTargets.includes("all")
      ? "all"
      : visibilityTargets.length > 0
        ? visibilityTargets.join(",")
        : "private";
    return { visibility, partnerRecipientIds };
  }

  async function loadHomePrayerShareOptions() {
    setLoadingHomePrayerShareOptions(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setHomePrayerShareGroups([]);
        setHomePrayerSharePartners([]);
        return;
      }

      const { data: memberRows } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);
      const groupIds = (memberRows ?? []).map((row: any) => row.group_id).filter(Boolean);
      if (groupIds.length > 0) {
        const { data: groups } = await supabase
          .from("groups")
          .select("id, name, is_public")
          .in("id", groupIds);
        setHomePrayerShareGroups((groups ?? []).map((group: any) => ({
          id: String(group.id),
          name: String(group.name ?? ""),
          is_public: !!group.is_public,
        })));
      } else {
        setHomePrayerShareGroups([]);
      }

      const { data: companionRows } = await supabase
        .from("companions")
        .select("requester_id, receiver_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);
      const partnerIds = Array.from(new Set((companionRows ?? [])
        .map((row: any) => row.requester_id === user.id ? row.receiver_id : row.requester_id)
        .filter(Boolean)
      ));
      if (partnerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, avatar_url")
          .in("id", partnerIds);
        const profileMap: Record<string, any> = {};
        (profiles ?? []).forEach((profile: any) => { profileMap[String(profile.id)] = profile; });
        setHomePrayerSharePartners(partnerIds.map((partnerId: any) => ({
          id: String(partnerId),
          name: String(profileMap[partnerId]?.name ?? t("profile_default_name", lang)),
          avatar_url: profileMap[partnerId]?.avatar_url ?? null,
        })));
      } else {
        setHomePrayerSharePartners([]);
      }
    } catch (error) {
      console.error("home prayer share options load failed", error);
      setHomePrayerShareGroups([]);
      setHomePrayerSharePartners([]);
    } finally {
      setLoadingHomePrayerShareOptions(false);
    }
  }

  function toggleHomePrayerShareTarget(target: string) {
    setHomePrayerShareTargets(prev =>
      prev.includes(target) ? prev.filter(item => item !== target) : [...prev, target]
    );
  }

  function openHomePrayerSharePrompt() {
    if (!homePrayerInput.trim() || savingHomePrayer) return;
    setHomePrayerShareTargets([]);
    setShowHomePrayerSharePrompt(true);
    void loadHomePrayerShareOptions();
  }

  function closeHomePrayerSharePrompt() {
    if (savingHomePrayer) return;
    setShowHomePrayerSharePrompt(false);
    setHomePrayerShareTargets([]);
  }

  async function saveHomePrayerRequest(visibility = "private", partnerRecipientIds: string[] = []) {
    const content = homePrayerInput.trim();
    if (!content || savingHomePrayer) return;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setSavingHomePrayer(true);
    try {
      const today = getLocalDateString();
      const { data: insertedPrayer, error: insertError } = await supabase.from("prayer_items").insert({
        user_id: user.id,
        content,
        is_anonymous: false,
        visibility,
      }).select("id").single();
      if (insertError) throw insertError;

      if (insertedPrayer?.id && partnerRecipientIds.length > 0) {
        const { error: recipientError } = await supabase
          .from("prayer_item_recipients")
          .insert(partnerRecipientIds.map(recipientId => ({
            prayer_item_id: insertedPrayer.id,
            owner_id: user.id,
            recipient_id: recipientId,
          })));
        if (recipientError) {
          await supabase.from("prayer_items").delete().eq("id", insertedPrayer.id);
          throw recipientError;
        }
      }

      await supabase.from("daily_prayer_completions").upsert({
        user_id: user.id,
        date: today,
        source: "written",
      }, { onConflict: "user_id,date" });

      setHomePrayerInput("");
      setShowHomePrayerCompose(false);
      setShowHomePrayerSharePrompt(false);
      setHomePrayerShareTargets([]);
      setTodayDone(p => ({ ...p, prayer: true }));
      enqueueCelebration({
        message: t("prayer_saved_message", lang),
        subMessage: t("prayer_saved_sub", lang),
      });
    } catch (error) {
      console.error(error);
      showToast(t("home_prayer_save_error", lang));
    } finally {
      setSavingHomePrayer(false);
    }
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
    const previous = myDecisions;
    const updated = myDecisions.map((d, idx) => idx === i ? { ...d, done: true } : d);
    const decisionsDone = JSON.stringify(updated.map(d => d.done));
    setMyDecisions(updated);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data: updatedRows, error } = await supabase.from("daily_checkins")
        .update({ decisions_done: decisionsDone })
        .eq("user_id", user.id).eq("date", today)
        .select("date");
      if (error) throw error;

      if (!updatedRows || updatedRows.length === 0) {
        const { error: upsertError } = await supabase.from("daily_checkins").upsert({
          user_id: user.id,
          date: today,
          decisions_done: decisionsDone,
        }, { onConflict: "user_id,date" });
        if (upsertError) throw upsertError;
      }
    } catch (error) {
      console.error(error);
      setMyDecisions(previous);
      showToast(t("home_decision_save_error", lang));
    }
  }

  async function loadChapterText(translationId: number) {
    if (!todayVerse?.verse_book || !todayVerse?.verse_start_chapter) return;

    const book = String(todayVerse.verse_book);
    const chapter = Number(todayVerse.verse_start_chapter);
    if (!book || !Number.isFinite(chapter) || chapter <= 0) return;

    const reference = formatChapterReference(book, chapter, lang);
    setChapterPopup(current => ({ ...current, show: true, loading: true, reference, text: "", error: "" }));

    try {
      const params = new URLSearchParams({
        book,
        chapter: String(chapter),
        startVerse: "1",
        endVerse: "176",
        translation: String(translationId),
      });
      const res = await fetch(`/api/bible?${params.toString()}`);
      if (!res.ok) throw new Error(`Bible chapter failed: ${res.status}`);
      const data = await res.json();
      const text = String(data.text ?? "").trim();
      if (!text) throw new Error("Empty chapter text");
      setChapterPopup({ show: true, loading: false, reference, text, error: "" });
    } catch (error) {
      console.error(error);
      setChapterPopup({ show: true, loading: false, reference, text: "", error: homeChapterText("error", lang) });
    }
  }

  async function openChapterPopup() {
    if (!todayVerse?.verse_book || !todayVerse?.verse_start_chapter) return;

    const translation = Number(todayVerse.verse_translation_id ?? profile?.preferred_translation ?? homeQTState.preferredTranslation ?? 92);
    await loadChapterText(translation);
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

  function startHomeQT(mode?: QTMode, passageSource: "scheduled" | "custom" = "scheduled") {
    if (homeQTState.hasDraft && !mode) {
      router.push("/qt/write?resume=true");
      return;
    }

    const nextMode = mode ?? getRecommendedQTMode();
    router.push(buildQTWriteHref({
      mode: nextMode,
      preferredTranslation: homeQTState.preferredTranslation,
      todaySchedule: homeQTState.todaySchedule,
      useTodaySchedule: passageSource === "scheduled",
      sundayContext: nextMode === "free" && isSunday(),
    }));
  }

  function startHomePhotoQT(passageSource: "scheduled" | "custom" = "scheduled") {
    setShowHomeQTChoice(false);
    setShowHomeQTPassageChoice(false);
    setShowHomeQTPhotoPassageChoice(false);
    setShowHomeSundayQT(false);
    setShowHomeQTGuide(false);
    router.push(buildQTPhotoHref({
      preferredTranslation: homeQTState.preferredTranslation,
      todaySchedule: homeQTState.todaySchedule,
      useTodaySchedule: passageSource === "scheduled",
      sundayContext: isSunday(),
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
    setShowHomeQTPassageChoice(false);
    setShowHomeQTPhotoPassageChoice(false);
    setShowHomeQTChoice(true);
  }

  function startHomeQTFromPopup(mode: QTMode) {
    setShowHomeQTChoice(false);
    setShowHomeSundayQT(false);
    setShowHomeQTGuide(false);
    setShowHomeQTPhotoPassageChoice(false);

    if (mode === "6step") {
      setShowHomeQTPassageChoice(true);
      return;
    }

    setShowHomeQTPassageChoice(false);
    startHomeQT(mode);
  }

  function startHomeSixStepFromPassageChoice(passageSource: "scheduled" | "custom") {
    setShowHomeQTPassageChoice(false);
    startHomeQT("6step", passageSource);
  }

  function startHomePhotoFromPassageChoice(passageSource: "scheduled" | "custom") {
    startHomePhotoQT(passageSource);
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

  function openTodayQtRecord() {
    if (completedQtRecordId) {
      router.push(`/qt/record?id=${completedQtRecordId}`);
      return;
    }
    router.push("/qt");
  }

  const qtCardSubText = todayDone.qt
    ? t("home_qt_completed_sub", lang).replace(". ", ".\n")
    : t("home_qt_today_sub", lang);
  const homePrayerGoLabel = lang === "ko"
    ? "기도 하러 가기"
    : lang === "de"
    ? "Zum Gebet"
    : lang === "fr"
    ? "Aller à la prière"
    : "Go to prayer";

  const showGardenUpdatePopup = gardenPopup.show && !celebration.show && !badgePopup && !showRootsManPopup;

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

      {(showHomeQTChoice || showHomeSundayQT || showHomeQTPassageChoice || showHomeQTPhotoPassageChoice) && (
        <div style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(26,28,30,0.72)", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 16 }}>
          <div style={{ width: "100%", maxWidth: 420, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 24, padding: 18, boxShadow: "0 18px 48px rgba(0,0,0,0.28)", position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>
                  {showHomeSundayQT ? t("home_qt_sunday_title", lang) : showHomeQTPhotoPassageChoice ? t("qt_photo_passage_choice_title", lang) : showHomeQTPassageChoice ? t("qt_passage_choice_title", lang) : t("home_qt_choice_title", lang)}
                </h2>
                {!(showHomeQTPassageChoice || showHomeQTPhotoPassageChoice) && (
                  <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6 }}>
                    {showHomeSundayQT ? t("home_qt_sunday_sub", lang) : t("home_qt_choice_sub", lang)}
                  </p>
                )}
                {showHomeQTPhotoPassageChoice && (
                  <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6 }}>
                    {t("qt_photo_passage_choice_sub", lang)}
                  </p>
                )}
              </div>
              <button
                onClick={() => { setShowHomeQTChoice(false); setShowHomeSundayQT(false); setShowHomeQTPassageChoice(false); setShowHomeQTPhotoPassageChoice(false); setShowHomeQTGuide(false); }}
                aria-label={t("home_qt_choice_close", lang)}
                style={{ position: "absolute", top: 14, right: 14, width: 28, height: 28, border: "none", background: "none", color: "var(--text3)", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                ×
              </button>
            </div>

            {showHomeSundayQT ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                <button onClick={() => startHomeQTFromPopup("sunday")} className="btn-sage" style={{ width: "100%", minHeight: 48 }}>
                  {t("home_qt_sunday_start", lang)}
                  <ChevronRight size={16} />
                </button>
                <button onClick={() => startHomeQTFromPopup("free")} className="btn-outline" style={{ width: "100%", minHeight: 48 }}>
                  {t("home_qt_choice_free", lang)}
                </button>
                <button onClick={() => { setShowHomeSundayQT(false); setShowHomeQTPhotoPassageChoice(true); }} className="btn-outline" style={{ width: "100%", minHeight: 48 }}>
                  <ImagePlus size={16} /> {t("qt_mode_photo_title", lang)}
                </button>
              </div>
            ) : (showHomeQTPassageChoice || showHomeQTPhotoPassageChoice) ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                <button
                  disabled={showHomeQTPhotoPassageChoice && isSunday()}
                  onClick={() => {
                    if (showHomeQTPhotoPassageChoice && isSunday()) return;
                    showHomeQTPhotoPassageChoice ? startHomePhotoFromPassageChoice("scheduled") : startHomeSixStepFromPassageChoice("scheduled");
                  }}
                  className={showHomeQTPhotoPassageChoice && isSunday() ? "btn-outline" : "btn-sage"}
                  style={{ width: "100%", minHeight: 48, justifyContent: "center", textAlign: "center", opacity: showHomeQTPhotoPassageChoice && isSunday() ? 0.55 : 1, cursor: showHomeQTPhotoPassageChoice && isSunday() ? "not-allowed" : "pointer" }}
                >
                  {t("qt_passage_choice_today", lang)}
                </button>
                <button onClick={() => showHomeQTPhotoPassageChoice ? startHomePhotoFromPassageChoice("custom") : startHomeSixStepFromPassageChoice("custom")} className="btn-outline" style={{ width: "100%", minHeight: 48, justifyContent: "center", textAlign: "center" }}>
                  {t("qt_passage_choice_custom", lang)}
                </button>
                <button onClick={() => { setShowHomeQTPassageChoice(false); setShowHomeQTPhotoPassageChoice(false); if (isSunday()) { setShowHomeSundayQT(true); } else { setShowHomeQTChoice(true); } }} style={{ background: "none", border: "none", color: "var(--text3)", fontSize: 13, fontWeight: 700, padding: "6px 0", cursor: "pointer", textAlign: "center" }}>
                  {t("qt_passage_choice_back", lang)}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                <button onClick={() => startHomeQTFromPopup("6step")} className="btn-sage" style={{ width: "100%", minHeight: 48 }}>
                  {t("home_qt_choice_6step", lang)}
                  <ChevronRight size={16} />
                </button>
                <button onClick={() => startHomeQTFromPopup("free")} className="btn-outline" style={{ width: "100%", minHeight: 48 }}>
                  {t("home_qt_choice_free", lang)}
                </button>
                <button onClick={() => { setShowHomeQTChoice(false); setShowHomeQTPhotoPassageChoice(true); }} className="btn-outline" style={{ width: "100%", minHeight: 48 }}>
                  <ImagePlus size={16} /> {t("qt_mode_photo_title", lang)}
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

      {showHomePrayerCompose && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 260, display: "flex", alignItems: "center", justifyContent: "center", padding: "calc(18px + env(safe-area-inset-top)) 18px calc(18px + env(safe-area-inset-bottom))", overflow: "hidden", overscrollBehavior: "contain" }}>
          <div style={{ background: "var(--bg2)", width: "100%", maxWidth: 480, borderRadius: 26, padding: "20px 18px 16px", border: "1px solid var(--border)", boxShadow: "0 18px 52px rgba(0,0,0,0.28)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>{t("home_prayer_compose_title", lang)}</h2>
                <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6 }}>{t("home_prayer_compose_sub", lang)}</p>
              </div>
              <button
                onClick={() => { if (!savingHomePrayer) { setShowHomePrayerCompose(false); setHomePrayerInput(""); } }}
                aria-label={t("close", lang)}
                style={{ border: "none", background: "none", color: "var(--text3)", fontSize: 22, lineHeight: 1, cursor: "pointer", padding: 2 }}
              >
                ×
              </button>
            </div>
            <textarea
              className="textarea-field"
              rows={4}
              value={homePrayerInput}
              onChange={(e) => setHomePrayerInput(e.target.value)}
              placeholder={t("home_prayer_compose_placeholder", lang)}
              style={{ marginBottom: 12 }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn-outline"
                onClick={() => { if (!savingHomePrayer) { setShowHomePrayerCompose(false); setHomePrayerInput(""); } }}
                style={{ flex: 1 }}
              >
                {t("cancel", lang)}
              </button>
              <button
                className="btn-sage"
                onClick={openHomePrayerSharePrompt}
                disabled={savingHomePrayer || !homePrayerInput.trim()}
                style={{ flex: 1, opacity: savingHomePrayer || !homePrayerInput.trim() ? 0.55 : 1 }}
              >
                {savingHomePrayer ? t("loading", lang) : t("home_prayer_compose_save", lang)}
              </button>
            </div>
          </div>
        </div>
      )}
      {chapterPopup.show && (
        <div
          onClick={() => setChapterPopup({ show: false, loading: false, reference: "", text: "", error: "" })}
          style={{ position: "fixed", inset: 0, zIndex: 260, background: "rgba(26,28,30,0.72)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "calc(18px + env(safe-area-inset-top)) 18px calc(18px + env(safe-area-inset-bottom))" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 520, maxHeight: "78vh", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 26, boxShadow: "0 18px 52px rgba(0,0,0,0.28)", display: "flex", flexDirection: "column", overflow: "hidden" }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "18px 18px 12px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h2 style={{ fontSize: 18, fontWeight: 850, color: "var(--text)", margin: 0 }}>{chapterPopup.reference}</h2>
              </div>
              <button
                onClick={() => setChapterPopup({ show: false, loading: false, reference: "", text: "", error: "" })}
                aria-label={homeChapterText("close", lang)}
                style={{ border: "none", background: "none", color: "var(--text3)", fontSize: 24, lineHeight: 1, cursor: "pointer", padding: 2 }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: 18, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
              {chapterPopup.loading ? (
                <p style={{ fontSize: 14, color: "var(--text3)", lineHeight: 1.7 }}>{homeChapterText("loading", lang)}</p>
              ) : chapterPopup.error ? (
                <p style={{ fontSize: 14, color: "var(--terra-dark)", lineHeight: 1.7 }}>{chapterPopup.error}</p>
              ) : (
                <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.9, whiteSpace: "pre-line" }}>
                  {chapterPopup.text}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showFirstLangPicker && (
        <LanguagePicker onSelect={async (l) => {
          await setPreferredLang(l);
          setShowFirstLangPicker(false);
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
          <ConfettiBurst variant="fixed" zIndex={201} />
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
        iconSrc="/icon-qt.webp"
        iconAlt="QT"
        onClose={closeCelebration}
      />

      {showHomePrayerSharePrompt && (
        <SharePromptModal
          title={t("prayer_complete_share_title", lang)}
          description={t("prayer_complete_share_sub", lang)}
          helperText={t("prayer_complete_share_helper", lang)}
          allLabel={t("prayer_intercession_share_all", lang)}
          allSubLabel={t("prayer_intercession_share_all_sub", lang)}
          partnersLabel={t("share_prompt_partners", lang)}
          partnerSubLabel={t("share_prompt_partner_sub", lang)}
          noPartnersLabel={t("share_prompt_no_partners", lang)}
          invitePartnersLabel={t("share_prompt_invite_partners", lang)}
          onInvitePartners={() => router.push("/community")}
          groupsLabel={t("prayer_intercession_my_groups", lang)}
          publicGroupLabel={t("prayer_intercession_public_group", lang)}
          privateGroupLabel={t("prayer_intercession_private_group", lang)}
          noGroupsLabel={t("prayer_intercession_no_groups", lang)}
          selectedCountLabel={t("prayer_intercession_selected_count", lang, { count: homePrayerShareTargets.length })}
          loadingLabel={t("loading", lang)}
          shareActionLabel={t("prayer_intercession_share_action", lang)}
          privateActionLabel={t("share_prompt_private_action", lang)}
          closeLabel={t("close", lang)}
          groups={homePrayerShareGroups}
          partners={homePrayerSharePartners}
          selectedTargets={homePrayerShareTargets}
          saving={savingHomePrayer}
          loadingGroups={loadingHomePrayerShareOptions}
          loadingPartners={loadingHomePrayerShareOptions}
          onToggleTarget={toggleHomePrayerShareTarget}
          onClose={closeHomePrayerSharePrompt}
          onPrivate={() => { void saveHomePrayerRequest("private", []); }}
          onShare={() => { if (homePrayerShareTargets.length > 0) { const { visibility, partnerRecipientIds } = splitHomePrayerShareTargets(homePrayerShareTargets); void saveHomePrayerRequest(visibility, partnerRecipientIds); } }}
        />
      )}

      <RootsManPopup
        show={showRootsManPopup && !celebration.show && !badgePopup && !gardenPopup.show}
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
          if (pendingRootsManRef.current) {
            pendingRootsManRef.current = false;
            openRootsManExperience();
            return;
          }
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
              const isDark = html.getAttribute("data-theme") === "dark";
              if (isDark) {
                html.removeAttribute("data-theme");
                storageSet("roots_theme", "light");
              } else {
                html.setAttribute("data-theme", "dark");
                storageSet("roots_theme", "dark");
              }
              setTheme(isDark ? "light" : "dark");
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
        <div className={todayDone.qt ? "card-sage" : "card"} style={{ borderRadius: 22, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 54, height: 54, borderRadius: 18, background: "rgba(122,157,122,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <img src="/icon-qt.webp" alt="" width={40} height={40} style={{ objectFit: "contain" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 850, color: "var(--text)", lineHeight: 1.35, marginBottom: 4 }}>
                {todayDone.qt ? t("home_qt_completed_title", lang) : t("home_qt_today_title", lang)}
              </div>
              <div style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.55, whiteSpace: "pre-line" }}>
                {qtCardSubText}
              </div>
            </div>
          </div>
          <button
            onClick={todayDone.qt ? openTodayQtRecord : openHomeQT}
            className={todayDone.qt ? "btn-outline" : "btn-sage"}
            style={{ width: "100%", minHeight: 46, marginTop: 14 }}
          >
            {todayDone.qt ? t("home_qt_view_record", lang) : t("home_qt_start_today", lang)}
          </button>
        </div>
      </div>

      <div style={{ padding: "0 16px 14px" }}>
        <div className="sec-label">{t("home_verse_section", lang)}</div>
        <div className="card-sage" style={{ borderRadius: 22, padding: 18 }}>
          {todayVerse?.verse ? (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--sage-dark)", letterSpacing: "0.4px" }}>{todayVerse.reference}</div>
                {todayVerse?.verse_book && todayVerse?.verse_start_chapter && (
                  <button
                    onClick={openChapterPopup}
                    style={{ border: "1px solid rgba(122,157,122,0.18)", background: "rgba(255,255,255,0.32)", color: "var(--sage-dark)", borderRadius: 999, padding: "4px 7px", fontSize: 10, fontWeight: 800, cursor: "pointer", flexShrink: 0 }}
                  >
                    {homeChapterText("open", lang)}
                  </button>
                )}
              </div>
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

      <div ref={prayerSectionRef} style={{ padding: "0 16px 14px" }}>
        <div className="sec-label">{t("home_prayer_section", lang)}</div>
        <div className="card" style={{ padding: "18px", borderRadius: 22 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
            <div style={{ width: 54, height: 54, borderRadius: 18, background: "rgba(122,157,122,0.10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <img src="/icon-pray.webp" alt="" width={40} height={40} style={{ objectFit: "contain" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", lineHeight: 1.45, marginBottom: 6 }}>
                {t("home_prayer_desc", lang)}
              </div>
              <div style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.65 }}>
                {t("home_prayer_hint", lang)}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={openPrayerRequest} className="btn-sage" style={{ flex: 1, minHeight: 46 }}>
              {t("home_prayer_write_option", lang)}
            </button>
            <button onClick={() => router.push("/prayer")} className="btn-outline" style={{ flex: 1, minHeight: 46 }}>
              {homePrayerGoLabel}
            </button>
          </div>
        </div>
      </div>


      {(todayDone.qt || myDecisions.length > 0) && (
        <div ref={applySectionRef} style={{ padding: "0 16px 14px" }}>
          <div className="sec-label">{t("home_apply_my", lang)}</div>
          <div className="card" style={{ borderRadius: 22, padding: 18 }}>
            {myDecisions.length > 0 ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                  <div style={{ width: 54, height: 54, borderRadius: 18, background: "rgba(122,157,122,0.10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <img src="/icon-decision.webp" alt="" width={40} height={40} style={{ objectFit: "contain" }} />
                  </div>
                  <div style={{ fontSize: 16, color: "var(--text)", lineHeight: 1.45, fontWeight: 800 }}>
                    {t("home_next_step_decision_empty_sub", lang)}
                  </div>
                </div>
                {myDecisions.map((d, i) => (
                <button key={i} onClick={() => toggleMyDecision(i)} style={{ display: "flex", alignItems: "flex-start", gap: 12, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: i === myDecisions.length - 1 ? "0" : "0 0 10px", width: "100%" }}>
                  <div style={{ width: 24, height: 24, borderRadius: 7, border: `2px solid ${d.done ? "var(--sage)" : "var(--border)"}`, background: d.done ? "var(--sage)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                    {d.done && <Check size={13} style={{ color: "var(--bg)" }} />}
                  </div>
                  <span style={{ fontSize: 14, color: d.done ? "var(--text3)" : "var(--text)", lineHeight: 1.65, textDecoration: d.done ? "line-through" : "none" }}>
                    {i + 1}. {d.text}
                  </span>
                </button>
                ))}
              </>
            ) : (
              <div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
                  <div style={{ width: 54, height: 54, borderRadius: 18, background: "rgba(122,157,122,0.10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <img src="/icon-decision.webp" alt="" width={40} height={40} style={{ objectFit: "contain" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", lineHeight: 1.45, marginBottom: 6 }}>
                      {t("home_next_step_decision_empty_title", lang)}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.65 }}>
                      {t("home_next_step_decision_empty_sub", lang)}
                    </div>
                  </div>
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



      <BottomNav />
    </div>
  );
}

"use client";
import { useEffect, useState, useRef, type ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
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
import NotificationSettingsModal from "@/components/NotificationSettingsModal";
import GardenUpdatePopup from "@/components/GardenUpdatePopup";
import SharePromptModal, { type ShareTargetGroup, type ShareTargetPartner } from "@/components/SharePromptModal";
import { loadSharePromptOptions } from "@/lib/sharePromptOptions";
import { createClient } from "@/lib/supabase";
import { useLang, setPreferredLang, isFirstLaunch } from "@/lib/useLang";
import { getLanguageOptions, LANG_META, t, type TKey } from "@/lib/i18n";
import { translateBookName } from "@/lib/bibleBooks";
import { buildQTPhotoHref, buildQTWriteHref, getRecommendedQTMode, isSunday, type QTSchedule, type QTMode } from "@/lib/qtEntry";
import { ChevronRight, Check, BookOpen, HandHeart, CheckCircle2, Sparkles, MessageCircle, Leaf, ImagePlus, Bell, Users } from "lucide-react";
import { getLocalDateString, parseLocalDateString } from "@/lib/date";
import { storageGet, storageRemove, storageSet } from "@/lib/clientStorage";
import { getPendingAwardedBadgesKey, recordBibleReflectionProgress } from "@/lib/reflectionProgress";
import { getCurrentRewardMapCycle, getRewardMapKeywordKey, getRewardMapStartSubKey, getRewardMapTitleKey, isRewardMapCompletionDay, isRewardMapStartDay, type RewardMapCycle, type RewardMapKind } from "@/lib/rewardMaps";
import { getNotificationIntroPopupText } from "@/lib/notifications/introPopupText";

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
const ONBOARDING_DONE_KEY = "onboarding_done";
const ONBOARDING_DONE_KEY_PREFIX = "onboarding_done_";
const GROUP_CHALLENGE_ANNOUNCEMENT_KEY_PREFIX = "roots_announcement_1_5_group_challenge_seen_";
const NOTIFICATION_INTRO_ANNOUNCEMENT_KEY_PREFIX = "roots_announcement_1_6_notifications_seen_";
const RECENT_SIGNUP_ONBOARDING_WINDOW_MS = 24 * 60 * 60 * 1000;

function getScopedStorageKey(prefix: string, userId: string, date: string) {
  return `${prefix}${userId}_${date}`;
}

function getOnboardingDoneKey(userId: string) {
  return `${ONBOARDING_DONE_KEY_PREFIX}${userId}`;
}

function isRecentSignup(createdAt: string | null | undefined) {
  if (!createdAt) return false;
  const createdAtMs = Date.parse(createdAt);
  if (!Number.isFinite(createdAtMs)) return false;
  return Date.now() - createdAtMs < RECENT_SIGNUP_ONBOARDING_WINDOW_MS;
}

function getGroupChallengeAnnouncementKey(userId: string) {
  return `${GROUP_CHALLENGE_ANNOUNCEMENT_KEY_PREFIX}${userId}`;
}

function getNotificationIntroAnnouncementKey(userId: string) {
  return `${NOTIFICATION_INTRO_ANNOUNCEMENT_KEY_PREFIX}${userId}`;
}

function isNativePushAvailable() {
  try {
    return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("PushNotifications");
  } catch {
    return false;
  }
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

type RewardMapNoticeState = {
  type: "complete" | "start";
  days: number;
  kind: RewardMapKind;
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

function RewardMapNoticePopup({ notice, onClose }: { notice: RewardMapNoticeState | null; onClose: () => void }) {
  const lang = useLang();
  if (!notice) return null;

  const mapKeyword = t(getRewardMapKeywordKey(notice.kind), lang);
  const isComplete = notice.type === "complete";
  const title = isComplete ? t("reward_map_completion_title", lang) : t("reward_map_start_title", lang);
  const message = isComplete
    ? t("reward_map_completion_sub", lang, { map: mapKeyword })
    : t(getRewardMapStartSubKey(notice.kind), lang);
  const button = isComplete
    ? t("reward_map_completion_btn", lang, { map: mapKeyword })
    : t("reward_map_start_btn", lang);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 198, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(26,28,30,0.86)", backdropFilter: "blur(8px)", padding: "0 28px" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg2)", borderRadius: 28, border: "1px solid var(--border)", width: "100%", maxWidth: 350, padding: "30px 24px 24px", textAlign: "center", boxShadow: "0 18px 60px rgba(0,0,0,0.28)" }}>
        <div style={{ width: 70, height: 70, borderRadius: 24, background: "var(--sage-light)", color: "var(--sage-dark)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", overflow: "hidden" }}>
          <img src={isComplete ? "/roots-logo-transparent-160.png" : "/rootsman.webp"} alt="Roots" width={52} height={52} style={{ objectFit: "contain", imageRendering: "pixelated" }} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 850, color: "var(--text)", lineHeight: 1.35, marginBottom: 12, whiteSpace: "pre-line" }}>
          {title}
        </h2>
        <div style={{ padding: "13px 15px", background: "var(--sage-light)", borderRadius: 16, border: "1px solid rgba(122,157,122,0.28)", marginBottom: 18 }}>
          <p style={{ fontSize: 13, color: "var(--sage-dark)", lineHeight: 1.75, whiteSpace: "pre-line" }}>
            {message}
          </p>
        </div>
        <button onClick={onClose} style={{ width: "100%", padding: "13px", background: "var(--sage)", color: "var(--bg)", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
          {button}
        </button>
      </div>
    </div>
  );
}

function GroupChallengeAnnouncementPopup({ onClose }: { onClose: () => void }) {
  const lang = useLang();

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 210, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(26,28,30,0.82)", backdropFilter: "blur(8px)", padding: "calc(18px + env(safe-area-inset-top)) 22px calc(18px + env(safe-area-inset-bottom))" }}>
      <div style={{ width: "100%", maxWidth: 350, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 28, padding: "28px 22px 22px", textAlign: "center", boxShadow: "0 18px 60px rgba(0,0,0,0.28)" }}>
        <h2 style={{ fontSize: 21, fontWeight: 900, color: "var(--text)", lineHeight: 1.35, marginBottom: 14 }}>
          {t("group_challenge_announcement_title", lang)}
        </h2>
        <div style={{ width: 118, height: 118, borderRadius: 32, background: "linear-gradient(180deg, rgba(255,246,213,0.92), rgba(255,246,213,0.52))", border: "1px solid rgba(232,197,71,0.36)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", overflow: "hidden" }}>
          <img
            src="/images/group-challenges/mystery-badge.png"
            alt=""
            aria-hidden="true"
            style={{ width: 92, height: 92, objectFit: "contain", imageRendering: "pixelated" }}
          />
        </div>
        <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.75, whiteSpace: "pre-line", marginBottom: 20 }}>
          {t("group_challenge_announcement_body", lang)}
        </p>
        <button onClick={onClose} className="btn-sage" style={{ width: "100%", minHeight: 48, justifyContent: "center" }}>
          {t("group_challenge_announcement_close", lang)}
        </button>
      </div>
    </div>
  );
}

function NotificationIntroAnnouncementPopup({ onLater, onOpenSettings }: { onLater: () => void; onOpenSettings: () => void }) {
  const lang = useLang();
  const copy = getNotificationIntroPopupText(lang);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 209, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(26,28,30,0.82)", backdropFilter: "blur(8px)", padding: "calc(18px + env(safe-area-inset-top)) 22px calc(18px + env(safe-area-inset-bottom))" }}>
      <div style={{ width: "100%", maxWidth: 350, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 28, padding: "28px 22px 22px", textAlign: "center", boxShadow: "0 18px 60px rgba(0,0,0,0.28)" }}>
        <div style={{ width: 86, height: 86, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", overflow: "visible" }}>
          <img
            src="/notification-bell-intro.png"
            alt=""
            aria-hidden="true"
            style={{ width: 78, height: 78, objectFit: "contain" }}
          />
        </div>
        <h2 style={{ fontSize: 21, fontWeight: 900, color: "var(--text)", lineHeight: 1.35, marginBottom: 14 }}>
          {copy.title}
        </h2>
        <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.75, whiteSpace: "pre-line", marginBottom: 20 }}>
          {copy.body}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={onOpenSettings} className="btn-sage" style={{ width: "100%", minHeight: 48, justifyContent: "center" }}>
            {copy.openSettings}
          </button>
          <button onClick={onLater} className="btn-outline" style={{ width: "100%", minHeight: 46, justifyContent: "center" }}>
            {copy.later}
          </button>
        </div>
      </div>
    </div>
  );
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
  const [showNotificationSettingsModal, setShowNotificationSettingsModal] = useState(false);
  const [showGroupChallengeAnnouncement, setShowGroupChallengeAnnouncement] = useState(false);
  const [showNotificationIntroAnnouncement, setShowNotificationIntroAnnouncement] = useState(false);
  const [pendingCompanionRequestCount, setPendingCompanionRequestCount] = useState(0);
  const [activeRewardMapKind, setActiveRewardMapKind] = useState<RewardMapKind | null>(null);
  const [rewardMapNotice, setRewardMapNotice] = useState<RewardMapNoticeState | null>(null);
  const pendingRewardMapNoticeRef = useRef<RewardMapNoticeState | null>(null);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  }
  const homeDecisionInputRef = useRef<HTMLInputElement | null>(null);

  const hasMyDecisions = myDecisions.length > 0;
  const decisionDone = hasMyDecisions ? myDecisions.some(d => d.done) : false;
  const wordWalkDone = todayDone.qt;
  const rewardMapDisplayDays = profile?.streak_days ?? 0;
  const currentRewardMapKind = activeRewardMapKind ?? getCurrentRewardMapCycle(rewardMapDisplayDays).kind;

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

    const { data: pendingCompanionRequests, error: pendingCompanionRequestsError } = await supabase
      .from("companions")
      .select("id")
      .eq("receiver_id", user.id)
      .eq("status", "pending");
    if (pendingCompanionRequestsError) {
      console.error("동역자 신청 조회 실패:", pendingCompanionRequestsError);
      setPendingCompanionRequestCount(0);
    } else {
      setPendingCompanionRequestCount((pendingCompanionRequests ?? []).length);
    }

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

    const onboardingDoneKey = getOnboardingDoneKey(user.id);
    const scopedOnboardingDone = storageGet(onboardingDoneKey);
    const legacyOnboardingDone = storageGet(ONBOARDING_DONE_KEY);
    const shouldMigrateLegacyOnboarding =
      !!legacyOnboardingDone &&
      !scopedOnboardingDone &&
      !isRecentSignup(user.created_at);

    if (shouldMigrateLegacyOnboarding) {
      storageSet(onboardingDoneKey, "true");
    } else if (!scopedOnboardingDone) {
      setShowOnboarding(true);
    }

    setLoading(false);
  }

  useEffect(() => {
    const userId = profile?.id;
    const onboardingDone = userId ? storageGet(getOnboardingDoneKey(userId)) : null;
    if (loading || !wordWalkDone || !onboardingDone || celebrationShownRef.current || progressUpdateInFlightRef.current) return;

    const today = getLocalDateString();
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

      const nextStreakDays = await updateStreak(today);
      if (nextStreakDays === null) return;
      celebrationShownRef.current = true;
      storageSet(celebratedKey, "true");
      storageRemove(completionWateringKey);
      storageRemove(legacyCompletionWateringKey);
      requestPostReflectionRewardExperience(nextStreakDays);
    })().finally(() => {
      progressUpdateInFlightRef.current = false;
    });
  }, [wordWalkDone, loading, profile?.id, profile?.last_checkin]);

  useEffect(() => {
    if (loading || !profile?.id || showGroupChallengeAnnouncement) return;
    if (!storageGet(getOnboardingDoneKey(profile.id))) return;
    if (
      showFirstLangPicker ||
      showOnboarding ||
      showWelcomeBack ||
      celebration.show ||
      !!badgePopup ||
      gardenPopup.show ||
      showRootsManPopup ||
      !!rewardMapNotice ||
      showNotificationSettingsModal ||
      showHomeQTChoice ||
      showHomeSundayQT ||
      showHomeQTPassageChoice ||
      showHomeQTPhotoPassageChoice ||
      showHomePrayerCompose ||
      showHomePrayerSharePrompt
    ) {
      return;
    }

    const today = getLocalDateString();
    const hasPendingReflectionReward =
      progressUpdateInFlightRef.current ||
      pendingRootsManRef.current ||
      !!pendingRewardMapNoticeRef.current ||
      !!storageGet(getScopedStorageKey(QT_COMPLETION_WATERING_KEY_PREFIX, profile.id, today)) ||
      !!storageGet(getLegacyStorageKey(QT_COMPLETION_WATERING_KEY_PREFIX, today));

    if (hasPendingReflectionReward) return;

    if (!storageGet(getGroupChallengeAnnouncementKey(profile.id))) {
      setShowGroupChallengeAnnouncement(true);
    }
  }, [
    loading,
    profile?.id,
    showGroupChallengeAnnouncement,
    showFirstLangPicker,
    showOnboarding,
    showWelcomeBack,
    celebration.show,
    badgePopup,
    gardenPopup.show,
    showRootsManPopup,
    rewardMapNotice,
    showNotificationSettingsModal,
    showHomeQTChoice,
    showHomeSundayQT,
    showHomeQTPassageChoice,
    showHomeQTPhotoPassageChoice,
    showHomePrayerCompose,
    showHomePrayerSharePrompt,
  ]);

  useEffect(() => {
    if (loading || !profile?.id || showGroupChallengeAnnouncement || showNotificationIntroAnnouncement) return;
    if (!isNativePushAvailable()) return;
    if (!storageGet(getOnboardingDoneKey(profile.id))) return;
    if (!storageGet(getGroupChallengeAnnouncementKey(profile.id))) return;
    if (
      showFirstLangPicker ||
      showOnboarding ||
      showWelcomeBack ||
      celebration.show ||
      !!badgePopup ||
      gardenPopup.show ||
      showRootsManPopup ||
      !!rewardMapNotice ||
      showNotificationSettingsModal ||
      showHomeQTChoice ||
      showHomeSundayQT ||
      showHomeQTPassageChoice ||
      showHomeQTPhotoPassageChoice ||
      showHomePrayerCompose ||
      showHomePrayerSharePrompt
    ) {
      return;
    }

    const today = getLocalDateString();
    const hasPendingReflectionReward =
      progressUpdateInFlightRef.current ||
      pendingRootsManRef.current ||
      !!pendingRewardMapNoticeRef.current ||
      !!storageGet(getScopedStorageKey(QT_COMPLETION_WATERING_KEY_PREFIX, profile.id, today)) ||
      !!storageGet(getLegacyStorageKey(QT_COMPLETION_WATERING_KEY_PREFIX, today));

    if (hasPendingReflectionReward) return;

    if (!storageGet(getNotificationIntroAnnouncementKey(profile.id))) {
      setShowNotificationIntroAnnouncement(true);
    }
  }, [
    loading,
    profile?.id,
    showGroupChallengeAnnouncement,
    showNotificationIntroAnnouncement,
    showFirstLangPicker,
    showOnboarding,
    showWelcomeBack,
    celebration.show,
    badgePopup,
    gardenPopup.show,
    showRootsManPopup,
    rewardMapNotice,
    showNotificationSettingsModal,
    showHomeQTChoice,
    showHomeSundayQT,
    showHomeQTPassageChoice,
    showHomeQTPhotoPassageChoice,
    showHomePrayerCompose,
    showHomePrayerSharePrompt,
  ]);

  async function updateStreak(today: string): Promise<number | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    try {
      const result = await recordBibleReflectionProgress(supabase, user.id, today);
      result.awardedBadges.forEach((badgeKey) => newlyAwardedBadgesRef.current.add(badgeKey));
      if (result.profile) setProfile((prev: any) => ({ ...(prev ?? {}), ...result.profile }));
      const nextDays = Number(result.profile?.streak_days ?? 0);
      return Number.isFinite(nextDays) && nextDays > 0 ? nextDays : null;
    } catch (error) {
      console.warn("말씀 묵상 progress 업데이트 실패:", error);
      return null;
    }
  }

  function requestPostReflectionRewardExperience(streakDays: number) {
    const currentMap = getCurrentRewardMapCycle(streakDays);

    if (isRewardMapCompletionDay(streakDays)) {
      pendingRewardMapNoticeRef.current = { type: "complete", days: streakDays, kind: currentMap.kind };
      setRootsManRequestToken(token => token + 1);
      return;
    }

    if (isRewardMapStartDay(streakDays)) {
      pendingRewardMapNoticeRef.current = { type: "start", days: streakDays, kind: currentMap.kind };
      pendingRootsManRef.current = true;
      setRootsManRequestToken(token => token + 1);
      return;
    }

    requestRootsManExperience();
  }

  function showNextProgressPopup(): boolean {
    if (!profile || badgePopup || gardenPopup.show || rewardMapNotice) return false;

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
    if (!profile || celebration.show || showRootsManPopup || rewardMapNotice) return;

    const openedProgressPopup = showNextProgressPopup();
    if (openedProgressPopup) return;

    if (pendingRewardMapNoticeRef.current && !badgePopup && !gardenPopup.show) {
      const nextNotice = pendingRewardMapNoticeRef.current;
      pendingRewardMapNoticeRef.current = null;
      setRewardMapNotice(nextNotice);
      return;
    }

    if (pendingRootsManRef.current && !badgePopup && !gardenPopup.show) {
      pendingRootsManRef.current = false;
      openRootsManExperience();
    }
  }, [profile, celebration.show, badgePopup, gardenPopup.show, rewardMapNotice, showRootsManPopup, rootsManRequestToken]);

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

  function closeRewardMapNotice() {
    const notice = rewardMapNotice;
    setRewardMapNotice(null);

    if (notice?.type === "start" && pendingRootsManRef.current) {
      pendingRootsManRef.current = false;
      openRootsManExperience();
      return;
    }

    requestAnimationFrame(() => {
      if (treeSectionRef.current) {
        treeSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  function closeGroupChallengeAnnouncement() {
    if (profile?.id) {
      storageSet(getGroupChallengeAnnouncementKey(profile.id), "true");
    }
    setShowGroupChallengeAnnouncement(false);
  }

  function closeNotificationIntroAnnouncement(openSettings = false) {
    if (profile?.id) {
      storageSet(getNotificationIntroAnnouncementKey(profile.id), "true");
    }
    setShowNotificationIntroAnnouncement(false);
    if (openSettings) {
      requestAnimationFrame(() => setShowNotificationSettingsModal(true));
    }
  }

  function closeOnboarding() {
    if (profile?.id) {
      storageSet(getOnboardingDoneKey(profile.id), "true");
    }
    setShowOnboarding(false);
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
      const options = await loadSharePromptOptions(t("profile_default_name", lang));
      setHomePrayerShareGroups(options.groups);
      setHomePrayerSharePartners(options.partners);
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

  const reflectionActionTitle = todayDone.qt
    ? t("home_action_reflection_done", lang)
    : t("home_action_reflection_start", lang);
  const reflectionActionSub = todayDone.qt ? t("home_action_view_record", lang) : "";

  const showGardenUpdatePopup = gardenPopup.show && !celebration.show && !badgePopup && !rewardMapNotice && !showRootsManPopup;

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
        <div style={{ position: "fixed", top: 18, left: "50%", transform: "translateX(-50%)", zIndex: 300, background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 999, padding: "10px 16px", fontSize: 13, fontWeight: 700, boxShadow: "0 8px 24px rgba(0,0,0,0.18)", whiteSpace: "nowrap", maxWidth: "calc(100vw - 32px)", overflow: "hidden", textOverflow: "ellipsis" }}>
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
      {showOnboarding && <Onboarding onClose={closeOnboarding} />}

      {showGroupChallengeAnnouncement && (
        <GroupChallengeAnnouncementPopup onClose={closeGroupChallengeAnnouncement} />
      )}

      {showNotificationIntroAnnouncement && (
        <NotificationIntroAnnouncementPopup
          onLater={() => closeNotificationIntroAnnouncement(false)}
          onOpenSettings={() => closeNotificationIntroAnnouncement(true)}
        />
      )}

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


      {showNotificationSettingsModal && (
        <NotificationSettingsModal
          onClose={() => setShowNotificationSettingsModal(false)}
          onSaved={(message) => showToast(message)}
        />
      )}

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

      <RewardMapNoticePopup notice={!celebration.show && !badgePopup && !gardenPopup.show && !showRootsManPopup ? rewardMapNotice : null} onClose={closeRewardMapNotice} />

      <RootsManPopup
        show={showRootsManPopup && !celebration.show && !badgePopup && !gardenPopup.show && !rewardMapNotice}
        streakDays={rewardMapDisplayDays}
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
        streakDays={rewardMapDisplayDays}
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
              const full = t(getRewardMapTitleKey(currentRewardMapKind), lang, { name });
              const emWord = t(getRewardMapKeywordKey(currentRewardMapKind), lang);
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
        <TreeGrowth
          days={rewardMapDisplayDays}
          lastCheckin={profile?.last_checkin ?? null}
          showRootsMan={showRootsMan}
          ownerName={profile?.name ?? t("profile_default_name", lang)}
          onActiveCycleChange={(cycle: RewardMapCycle) => setActiveRewardMapKind(cycle.kind)}
        />
      </div>

      <div style={{ padding: "0 16px 14px" }}>
        <div className="sec-label">{t("home_routine_section", lang)}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button
            type="button"
            onClick={todayDone.qt ? openTodayQtRecord : openHomeQT}
            className={todayDone.qt ? "card-sage" : "card"}
            style={{
              minHeight: 68,
              borderRadius: 18,
              padding: "9px 10px",
              border: todayDone.qt ? "1px solid rgba(122,157,122,0.22)" : "1px solid var(--border)",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "flex-start",
              gap: 10,
              cursor: "pointer",
              textAlign: "center",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <div style={{ width: 42, height: 42, flexShrink: 0, borderRadius: 14, background: todayDone.qt ? "rgba(122,157,122,0.16)" : "rgba(122,157,122,0.10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src="/icon-qt.webp" alt="" width={32} height={32} style={{ objectFit: "contain" }} />
            </div>
            <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: reflectionActionSub ? 3 : 0, justifyContent: "center", alignItems: "center", textAlign: "center" }}>
              <div style={{ fontSize: todayDone.qt ? 13 : 14, fontWeight: 900, color: "var(--text)", lineHeight: 1.18, wordBreak: "keep-all" }}>
                {reflectionActionTitle}
              </div>
              {reflectionActionSub && (
                <div style={{ fontSize: 12, fontWeight: 800, color: "var(--sage-dark)", lineHeight: 1.15, wordBreak: "keep-all" }}>
                  {reflectionActionSub}
                </div>
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={() => router.push("/prayer")}
            className="card"
            style={{
              minHeight: 68,
              borderRadius: 18,
              padding: "9px 10px",
              border: "1px solid var(--border)",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "flex-start",
              gap: 10,
              cursor: "pointer",
              textAlign: "center",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <div style={{ width: 42, height: 42, flexShrink: 0, borderRadius: 14, background: "rgba(122,157,122,0.10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src="/icon-pray.webp" alt="" width={32} height={32} style={{ objectFit: "contain" }} />
            </div>
            <div style={{ minWidth: 0, flex: 1, fontSize: 14, fontWeight: 900, color: "var(--text)", lineHeight: 1.22, textAlign: "center", wordBreak: "keep-all" }}>
              {t("home_action_prayer", lang)}
            </div>
          </button>
        </div>

        {pendingCompanionRequestCount > 0 && (
          <div
            style={{
              position: "relative",
              borderRadius: 20,
              padding: "18px 18px",
              marginTop: 10,
              minHeight: 104,
              border: "1px solid rgba(213,166,83,0.34)",
              background: "#FFF7E8",
              boxShadow: "0 10px 22px rgba(88, 64, 28, 0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src="/badge_roots_together.webp"
              alt=""
              width={62}
              height={62}
              style={{
                position: "absolute",
                left: 22,
                top: "50%",
                transform: "translateY(-50%)",
                objectFit: "contain",
              }}
            />
            <div
              style={{
                width: "100%",
                padding: "0 74px",
                textAlign: "center",
                fontSize: 17,
                fontWeight: 900,
                color: "var(--text)",
                lineHeight: 1.35,
                wordBreak: "keep-all",
              }}
            >
              {t("home_partner_request_notice", lang)}
            </div>
            <button
              onClick={() => router.push("/companions")}
              style={{
                position: "absolute",
                right: 18,
                bottom: 14,
                display: "inline-flex",
                alignItems: "center",
                gap: 2,
                padding: 0,
                border: 0,
                background: "transparent",
                color: "#111827",
                fontSize: 11,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {t("home_partner_request_cta", lang)}
              <ChevronRight size={12} strokeWidth={2.4} />
            </button>
          </div>
        )}
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

      <div style={{ padding: "0 16px 14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button
            type="button"
            onClick={() => setShowNotificationSettingsModal(true)}
            style={{
              minHeight: 42,
              borderRadius: 14,
              padding: "9px 10px",
              background: "#FFF7E8",
              border: "1px solid rgba(213,166,83,0.34)",
              color: "#6F4E24",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              fontSize: 12,
              fontWeight: 850,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              boxShadow: "0 8px 18px rgba(88, 64, 28, 0.04)",
            }}
          >
            <Bell size={14} strokeWidth={2.4} />
            <span>{t("home_shortcut_notifications", lang)}</span>
          </button>
          <button
            type="button"
            onClick={() => router.push("/companions")}
            style={{
              minHeight: 42,
              borderRadius: 14,
              padding: "9px 10px",
              background: "#FFF7E8",
              border: "1px solid rgba(213,166,83,0.34)",
              color: "#6F4E24",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              fontSize: 12,
              fontWeight: 850,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              boxShadow: "0 8px 18px rgba(88, 64, 28, 0.04)",
            }}
          >
            <Users size={14} strokeWidth={2.4} />
            <span>{t("home_shortcut_companions", lang)}</span>
          </button>
        </div>
      </div>


      <BottomNav />
    </div>
  );
}

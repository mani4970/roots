"use client";
import { lazy, Suspense, useEffect, useState, useRef, type ReactNode } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { useBottomNavSession } from "@/components/BottomNavSessionProvider";
import TreeGrowth from "@/components/TreeGrowth";
import Celebration from "@/components/Celebration";
import ConfettiBurst from "@/components/ConfettiBurst";
import Onboarding from "@/components/Onboarding";
import RootsManPopup from "@/components/RootsManPopup";
import AvatarChoiceModal from "@/components/AvatarChoiceModal";
import WelcomeBackPopup from "@/components/WelcomeBackPopup";
import LanguagePicker from "@/components/LanguagePicker";
import NotificationSettingsModal from "@/components/NotificationSettingsModal";
import GardenUpdatePopup from "@/components/GardenUpdatePopup";
import RequiredUpdatePopup from "@/components/RequiredUpdatePopup";
import ChallengeRewardPopup from "@/components/ChallengeRewardPopup";
import HomeCharacterPreview from "@/components/HomeCharacterPreview";
import HomeHeader from "@/components/HomeHeader";
import HomeLoadingScreen from "@/components/HomeLoadingScreen";
import { isChristmasLoadingDate } from "@/lib/christmasLoading";
import CompanionAcceptedPopup from "@/components/CompanionAcceptedPopup";
import MessengerShareAnnouncementPopup from "@/components/MessengerShareAnnouncementPopup";
import MonthlyBadgeAwardPopup from "@/components/MonthlyBadgeAwardPopup";
import ObservationPopup, { acknowledgeObservedPopup } from "@/components/ObservationPopup";
import { beginObservation, observe, observationError } from "@/lib/appObservation";
import HomeGratitudeDialog from "@/components/HomeGratitudeDialog";
import HomeDashboardCards from "@/components/HomeDashboardCards";
import HomeHubDialog from "@/components/HomeHubDialog";
import HomeRoutineActions from "@/components/HomeRoutineActions";
import { getHomeDashboardText } from "@/lib/homeDashboardText";
import { usePrayerModalViewport } from "@/lib/usePrayerModalViewport";
import PersonalReflectionChallengePopup from "@/components/PersonalReflectionChallengePopup";
import { usePersonalReflectionChallenge } from "@/lib/usePersonalReflectionChallenge";
import { NOVEMBER_PERSONAL_CHALLENGE_ID } from "@/lib/personalReflectionChallenges";
import HomeQTDraftChoice from "@/components/HomeQTDraftChoice";
import { useAndroidBackHandler } from "@/lib/androidBackNavigation";
import { createClient } from "@/lib/supabase";
import {
  getPreferredTranslationForLang,
  getStoredLang,
  isFirstLaunch,
  savePreferredTranslationLocally,
  setPreferredLang,
  useLang,
} from "@/lib/useLang";
import { isLang, t, type TKey } from "@/lib/i18n";
import { buildQTPhotoHref, buildQTWriteHref, isSunday, type QTSchedule, type QTMode } from "@/lib/qtEntry";
import { ChevronRight, BookOpen, HandHeart, CheckCircle2, Sparkles, MessageCircle, Leaf, ImagePlus, Bell, Users } from "lucide-react";
import { getLocalDateString, parseLocalDateString } from "@/lib/date";
import { consumePostReflectionHomeReturn } from "@/lib/postReflectionHome";
import { storageGet, storageSet } from "@/lib/clientStorage";
import { acknowledgePendingAwardedBadge, recordBibleReflectionProgress } from "@/lib/reflectionProgress";
import {
  ACTIVITY_BADGE_PRESENTATIONS_EVENT,
  acknowledgeActivityBadges,
  getActivityBadgePopup,
  readActivityBadgeAwardRetries,
  readLocalPendingActivityBadges,
  readPendingActivityBadges,
  retryPendingActivityBadgeAwards,
  type ActivityBadgeKey,
} from "@/lib/activityBadgePresentations";
import {
  acknowledgeRewardPresentations,
  migrateLegacyRewardPresentations,
  readLocalPendingRewardPresentations,
  readPendingRewardPresentations,
  REWARD_PRESENTATIONS_EVENT,
  type RewardPresentationReceipt,
} from "@/lib/rewardPresentationReceipts";
import { getCurrentRewardMapCycle, getRewardMapKeywordKey, getRewardMapStartSubKey, getRewardMapTitleKey, type RewardMapCycle, type RewardMapKind } from "@/lib/rewardMaps";
import { getNehemiahWallCopy } from "@/lib/nehemiahWallText";
import { getRootsAvatarImageSrc, getRootsAvatarLabel, normalizeRootsAvatarType, type RootsAvatarType } from "@/lib/avatar";
import { loadQTDraftBackup, removeQTDraftBackup } from "@/lib/qtDraftBackup";
import { getQtDraftSessionUser, withQtDraftTimeout } from "@/lib/qtDraftSync";
import { recordCompanionChallengeReflectionCompletedBestEffort } from "@/lib/companionChallenges";
import { loadOwnedHeartShopItems } from "@/lib/heartShop";
import { loadProfileCards } from "@/lib/profileCards";
import { getProfileCharacterLayersForItemIds } from "@/lib/heartShopCatalog";
import { isHeartShopCharacterItemId, isHeartShopMapItemId, type HeartShopCharacterItemId, type HeartShopMapItemId } from "@/lib/heartShopItems";
import { detectOneTimeUpdatePopup, markOptionalUpdateSeen, openRequiredUpdateStore, type NativeUpdatePrompt } from "@/lib/requiredUpdate";
import { saveProfilePreferences } from "@/lib/profilePreferences";
import {
  claimPendingChallengeRewards,
  loadUnseenChallengeRewards,
  markChallengeRewardSeen,
  type ChallengeReward,
} from "@/lib/challengeRewards";
import {
  getMonthlyBadgeAwardCampaignKey,
  getMonthlyBadgeDateRange,
  getMonthlyBadgeStatus,
  getPreviousMonthlyBadgeForAwardPopup,
  type MonthlyBadgeCompletionRecord,
  type MonthlyBadgeDefinition,
} from "@/lib/monthlyBadges";
import {
  getUserCampaignLocalStorageKey,
  loadUserCampaignSeen,
  markUserCampaignSeen,
} from "@/lib/userCampaignImpressions";
import {
  COMPANION_CHALLENGE_3_ID,
  COMPANION_CHALLENGE_3_END_DATE,
  COMPANION_CHALLENGE_4_ID,
} from "@/lib/companionChallengeCampaign";
import { useChallengeLocalDate } from "@/lib/useChallengeLocalDate";
import { consumeGiftHomeIntent, GIFT_HOME_INTENT_EVENT, type GiftHomeIntent } from "@/lib/giftHomeEntry";
import { acknowledgeMessengerShareAnnouncement, isMessengerShareAnnouncementEligible, readMessengerShareAnnouncementSeen } from "@/lib/messengerShareAnnouncement";
import PrayerCardsLoading from "@/components/PrayerCardsLoading";
import type { PrayerCardSnapshot } from "@/components/PrayerExperience";

const PrayerExperience = lazy(() => import("@/components/PrayerExperience"));
const HomeHeartShopGift = lazy(() => import("@/components/HomeHeartShopGift"));

const QT_COMPLETION_WATERING_KEY_PREFIX = "qt_completion_pending_watering_";
const CELEBRATED_KEY_PREFIX = "celebrated_";
const ONBOARDING_DONE_KEY = "onboarding_done";
const ONBOARDING_DONE_KEY_PREFIX = "onboarding_done_";
const RECENT_SIGNUP_ONBOARDING_WINDOW_MS = 24 * 60 * 60 * 1000;
const HOME_PROFILE_RETRY_DELAYS_MS = [300, 800] as const;

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

function hasEstablishedProfileActivity(profile: any) {
  if (!profile) return false;
  return Boolean(
    profile.avatar_choice_seen === true ||
    profile.last_checkin ||
    Number(profile.total_days ?? 0) > 0 ||
    Number(profile.streak_days ?? 0) > 0
  );
}

function getLegacyStorageKey(prefix: string, date: string) {
  return `${prefix}${date}`;
}

const gardenTopRef_scroll = () => {
  window.scrollTo({ top: 0, behavior: "instant" });
};

const HOME_LOCAL_TEXT = {
  ko: { characterSaveFailed: "캐릭터 선택을 저장하지 못했어요.", profileLoadFailed: "내 정보를 불러오지 못했어요.", retry: "다시 시도" },
  de: { characterSaveFailed: "Die Charakterauswahl konnte nicht gespeichert werden.", profileLoadFailed: "Dein Profil konnte nicht geladen werden.", retry: "Erneut versuchen" },
  en: { characterSaveFailed: "Could not save your character choice.", profileLoadFailed: "We couldn't load your profile.", retry: "Try again" },
  fr: { characterSaveFailed: "Impossible d’enregistrer le personnage.", profileLoadFailed: "Impossible de charger votre profil.", retry: "Réessayer" },
  es: { characterSaveFailed: "No pudimos guardar tu personaje.", profileLoadFailed: "No pudimos cargar tu perfil.", retry: "Intentar de nuevo" },
} as const;

type HomeQTState = {
  hasDraft: boolean;
  preferredTranslation: number;
  todaySchedule: QTSchedule | null;
};

type RewardMapNoticeState = {
  type: "complete" | "start";
  days: number;
  kind: RewardMapKind;
  receipt?: RewardPresentationReceipt;
};

function RewardMapNoticePopup({ notice, onClose, avatarType }: { notice: RewardMapNoticeState | null; onClose: () => void; avatarType: RootsAvatarType }) {
  const lang = useLang();
  if (!notice) return null;

  const isNehemiah = notice.kind === "nehemiahWall";
  const nehemiahCopy = isNehemiah ? getNehemiahWallCopy(lang) : null;
  const mapKeyword = nehemiahCopy?.keyword ?? t(getRewardMapKeywordKey(notice.kind), lang);
  const isComplete = notice.type === "complete";
  const title = isComplete ? t("reward_map_completion_title", lang) : t("reward_map_start_title", lang);
  const message = isComplete
    ? nehemiahCopy?.completionNotice ?? t("reward_map_completion_sub", lang, { map: mapKeyword })
    : nehemiahCopy?.startNotice ?? t(getRewardMapStartSubKey(notice.kind), lang);
  const button = isComplete
    ? nehemiahCopy?.completionButton ?? t("reward_map_completion_btn", lang, { map: mapKeyword })
    : t("reward_map_start_btn", lang);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 198, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(26,28,30,0.86)", backdropFilter: "blur(8px)", padding: "0 28px" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg2)", borderRadius: 28, border: "1px solid var(--border)", width: "100%", maxWidth: 350, padding: "30px 24px 24px", textAlign: "center", boxShadow: "0 18px 60px rgba(0,0,0,0.28)" }}>
        <div style={{ width: 70, height: 70, borderRadius: 24, background: "var(--sage-light)", color: "var(--sage-dark)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", overflow: "hidden" }}>
          <img src={isComplete ? "/roots-logo-transparent-160.png" : getRootsAvatarImageSrc(avatarType)} alt="Roots" width={52} height={52} style={{ objectFit: "contain", imageRendering: "pixelated" }} />
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

type CompanionAcceptanceNoticeState = {
  ids: string[];
  primaryName: string | null;
  additionalCount: number;
};

type HomeEntry = {
  userId: string;
  date: string;
  qtRecordId: string | null;
  postReflection: boolean;
  giftIntent?: GiftHomeIntent | null;
};

type HomePrayerObservationAttempt = {
  flow: ReturnType<typeof beginObservation>;
  mode: "create" | "quiet";
  attempt: number;
  failed: boolean;
  day: string;
  recordId?: string;
};

export default function HomePage() {
  const router = useRouter();
  const { hasShownNavigation } = useBottomNavSession();
  const [profile, setProfile] = useState<any>(null);
  const [todayDone, setTodayDone] = useState({ qt: false, prayer: false });
  const [loading, setLoading] = useState(true);
  const [homeLoadFailed, setHomeLoadFailed] = useState(false);
  const homeLoadGenerationRef = useRef(0);
  const homeDataDateRef = useRef<string | null>(null);
  const homeEntryRef = useRef<HomeEntry | null>(null);
  const [homeEntry, setHomeEntry] = useState<HomeEntry | null>(null);
  const [homeDetailsReady, setHomeDetailsReady] = useState({ prayer: false, schedule: false });
  const [progressRetryToken, setProgressRetryToken] = useState(0);
  const rewardReceiptsRef = useRef<RewardPresentationReceipt[]>([]);
  const claimedRewardReceiptsRef = useRef(new Set<string>());
  const rewardReceiptUserRef = useRef<string | null>(null);
  const rewardReceiptReadGenerationRef = useRef(0);
  const rewardReceiptRequestRef = useRef<{
    userId: string; loadGeneration: number; readGeneration: number; lastCheckin: string; days: number;
    promise: Promise<void>;
  } | null>(null);
  const [rewardReceiptOwner, setRewardReceiptOwner] = useState<string | null>(null);
  const [pendingRewardReceiptCount, setPendingRewardReceiptCount] = useState(0);
  const activityBadgeUserRef = useRef<string | null>(null);
  const activityBadgeReadGenerationRef = useRef(0);
  const initialActivityBadgeReadRef = useRef<{
    userId: string; loadGeneration: number; promise: Promise<ActivityBadgeKey[]>;
  } | null>(null);
  const activityBadgeReadInFlightRef = useRef<{ userId: string; generation: number } | null>(null);
  const activityBadgeRetryRef = useRef<{ userId: string; promise: Promise<ActivityBadgeKey[]>; blocking: boolean } | null>(null);
  const activityBadgesRef = useRef<ActivityBadgeKey[]>([]);
  const claimedActivityBadgesRef = useRef(new Set<ActivityBadgeKey>());
  const [activityBadgeOwner, setActivityBadgeOwner] = useState<string | null>(null);
  const [pendingActivityBadgeCount, setPendingActivityBadgeCount] = useState(0);
  const [activeActionReceipt, setActiveActionReceipt] = useState<RewardPresentationReceipt | null>(null);
  const [celebration, setCelebration] = useState({ show: false, message: "", subMessage: "", launchRootsMan: false });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showRootsMan, setShowRootsMan] = useState(false);
  const [showRootsManPopup, setShowRootsManPopup] = useState(false);
  const [showHomeQTChoice, setShowHomeQTChoice] = useState(false);
  const homeQTBackdropTapStart = useRef<{ x: number; y: number } | null>(null);
  const [showHomeQTDraftChoice, setShowHomeQTDraftChoice] = useState(false);
  const [deletingHomeQTDraft, setDeletingHomeQTDraft] = useState(false);
  const deletingHomeQTDraftRef = useRef(false);
  const [showHomeQTPassageChoice, setShowHomeQTPassageChoice] = useState(false);
  const [showHomeQTPhotoPassageChoice, setShowHomeQTPhotoPassageChoice] = useState(false);
  const [showHomeQTGuide, setShowHomeQTGuide] = useState(false);
  const [showHomeSundayQT, setShowHomeSundayQT] = useState(false);
  const [gardenPopup, setGardenPopup] = useState<{show:boolean; type:"garden"|"badge"; badgeIndex:number; badgeKey?:string; stageKey?:string; receipt?:RewardPresentationReceipt}>({
    show: false, type: "garden", badgeIndex: 0,
  });
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [welcomeBackDays, setWelcomeBackDays] = useState(0);
  const [welcomeBackStorageKey, setWelcomeBackStorageKey] = useState<string | null>(null);
  const lang = useLang();
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showFirstLangPicker, setShowFirstLangPicker] = useState(false);
  const [badgePopup, setBadgePopup] = useState<{img:string;title:string;msg:string;badgeKey?:string;receipt?:RewardPresentationReceipt;activityBadgeKey?:ActivityBadgeKey}|null>(null);
  const celebrationShownRef = useRef(false);
  const progressUpdateInFlightRef = useRef(false);
  const progressRetryRequestedRef = useRef(false);
  const celebrationQueueRef = useRef<Array<{ message: string; subMessage?: string; launchRootsMan?: boolean }>>([]);
  const pendingRootsManRef = useRef(false);
  const [rootsManRequestToken, setRootsManRequestToken] = useState(0);
  const homeQTDialogRef = useRef<HTMLDivElement>(null);
  const treeSectionRef = useRef<HTMLDivElement | null>(null);
  const [homeQTState, setHomeQTState] = useState<HomeQTState>({
    hasDraft: false,
    preferredTranslation: 92,
    todaySchedule: null,
  });
  const [completedQtRecordId, setCompletedQtRecordId] = useState<string | null>(null);
  const [showHomePrayerCards, setShowHomePrayerCards] = useState(false);
  const challengeLocalDate = useChallengeLocalDate();
  const [showHomeRoutine, setShowHomeRoutine] = useState(false);
  const homeRoutineButtonRef = useRef<HTMLButtonElement>(null);
  const [showHomeGratitude, setShowHomeGratitude] = useState(false);
  const [showHomeChallenge, setShowHomeChallenge] = useState(false);
  const [openingPersonalChallengeProfile, setOpeningPersonalChallengeProfile] = useState(false);
  useEffect(() => {
    setShowHomeRoutine(false); setShowHomeChallenge(false);
    setOpeningPersonalChallengeProfile(false);
  }, [profile?.id, challengeLocalDate]);
  useEffect(() => { setShowHomeGratitude(false); }, [profile?.id]);
  const homePrayerSnapshotRef = useRef<PrayerCardSnapshot | null>(null);
  const homePrayerObservationRef = useRef<Partial<Record<"create" | "quiet", HomePrayerObservationAttempt>>>({});
  useEffect(() => { homePrayerObservationRef.current = {}; }, [profile?.id]);
  const [toast, setToast] = useState<string | null>(null);
  const [showNotificationSettingsModal, setShowNotificationSettingsModal] = useState(false);
  const [requiredUpdatePrompt, setRequiredUpdatePrompt] = useState<NativeUpdatePrompt | null>(null);
  const [showAvatarChoiceModal, setShowAvatarChoiceModal] = useState(false);
  const [savingAvatarChoice, setSavingAvatarChoice] = useState(false);
  const [pendingCompanionRequestCount, setPendingCompanionRequestCount] = useState(0);
  const [companionAcceptanceNotice, setCompanionAcceptanceNotice] = useState<CompanionAcceptanceNoticeState | null>(null);
  const [companionAcceptanceCheckReady, setCompanionAcceptanceCheckReady] = useState(false);
  const [handlingCompanionAcceptanceNotice, setHandlingCompanionAcceptanceNotice] = useState(false);
  const [activeRewardMapKind, setActiveRewardMapKind] = useState<RewardMapKind | null>(null);
  const [enabledHeartShopItemIds, setEnabledHeartShopItemIds] = useState<HeartShopMapItemId[]>([]);
  const [enabledProfileCharacterItemIds, setEnabledProfileCharacterItemIds] = useState<HeartShopCharacterItemId[]>([]);
  const [homeCharacterItemsOwner, setHomeCharacterItemsOwner] = useState<string | null>(null);
  const [rewardMapNotice, setRewardMapNotice] = useState<RewardMapNoticeState | null>(null);
  const [challengeRewardQueue, setChallengeRewardQueue] = useState<ChallengeReward[]>([]);
  const challengeRewardCheckStartedRef = useRef<string | null>(null);
  const challengeRewardActionInFlightRef = useRef(false);
  const [openingChallengeProfile, setOpeningChallengeProfile] = useState(false);
  const companionChallengeAnnouncementUserIdRef = useRef<string | null>(null);
  const messengerShareAnnouncementUserIdRef = useRef<string | null>(null);
  const messengerShareAnnouncementHandledRef = useRef(false);
  const [messengerShareAnnouncementOwner, setMessengerShareAnnouncementOwner] = useState<string | null>(null);
  const [showMessengerShareAnnouncement, setShowMessengerShareAnnouncement] = useState(false);
  const [updateAnnouncementAccount, setUpdateAnnouncementAccount] = useState<{ userId: string; createdAt: string | null } | null>(null);
  const messengerShareAnnouncementEligible = updateAnnouncementAccount?.userId === profile?.id
    && isMessengerShareAnnouncementEligible(updateAnnouncementAccount?.createdAt);
  const [announcementRewardChecksReadyFor, setAnnouncementRewardChecksReadyFor] = useState<string | null>(null);
  const monthlyBadgeAwardUserIdRef = useRef<string | null>(null);
  const monthlyBadgeAwardHandledRef = useRef(false);
  const [monthlyBadgeAward, setMonthlyBadgeAward] = useState<MonthlyBadgeDefinition | null>(null);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  }

  async function completeCompanionAcceptanceNotice(openCompanions: boolean) {
    if (!companionAcceptanceNotice || handlingCompanionAcceptanceNotice) return;

    const noticeIds = companionAcceptanceNotice.ids;
    acknowledgeObservedPopup(
      profile?.id,
      "companion_accepted",
      openCompanions ? "confirm" : "close",
    );

    setHandlingCompanionAcceptanceNotice(true);
    setCompanionAcceptanceNotice(null);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("companion_acceptance_notices")
        .update({ seen_at: new Date().toISOString() })
        .in("id", noticeIds)
        .is("seen_at", null);
      if (error) throw error;
    } catch (error) {
      // Keep Home usable. If this receipt fails, the server-side unseen row can
      // safely show the notice again on a later Home load.
      console.warn("동역자 수락 안내 확인 저장 실패:", error);
    } finally {
      setHandlingCompanionAcceptanceNotice(false);
      if (openCompanions) router.push("/community?tab=partner");
    }
  }

  function completeMessengerShareAnnouncement(action: "confirm" | "close" | "back" = "confirm") {
    const userId = messengerShareAnnouncementUserIdRef.current;
    if (!userId || userId !== profile?.id || !visibleMessengerShareAnnouncement || messengerShareAnnouncementHandledRef.current) return;
    messengerShareAnnouncementHandledRef.current = true;
    acknowledgeObservedPopup(userId, "messenger_share_announcement", action);
    setShowMessengerShareAnnouncement(false);
    // The helper records this confirmation synchronously before starting its
    // server write. A failed request is retried without reopening the popup.
    void acknowledgeMessengerShareAnnouncement(createClient(), userId);
  }

  async function completeMonthlyBadgeAward(openProfile: boolean) {
    if (monthlyBadgeAwardHandledRef.current || !monthlyBadgeAward) return;
    acknowledgeObservedPopup(profile?.id, "monthly_badge", openProfile ? "profile" : "close");
    monthlyBadgeAwardHandledRef.current = true;

    const badge = monthlyBadgeAward;
    const userId = monthlyBadgeAwardUserIdRef.current ?? profile?.id ?? "";
    const campaignKey = getMonthlyBadgeAwardCampaignKey(badge);
    const localCampaignKey = userId
      ? getUserCampaignLocalStorageKey(campaignKey, userId)
      : "";

    if (localCampaignKey) storageSet(localCampaignKey, "true");
    setMonthlyBadgeAward(null);

    const persistSeenTask = (userId
      ? markUserCampaignSeen(createClient(), userId, campaignKey)
      : Promise.resolve()
    ).catch((error) => {
      // The local receipt still guarantees one-time display on this device.
      // A temporary receipt failure must never block Home or Profile.
      console.warn("월별 배지 축하 팝업 확인 저장 실패:", error);
    });

    if (openProfile) router.push("/profile#monthly-badges");
    await persistSeenTask;
  }

  async function checkMonthlyBadgeAwardAnnouncement(
    supabase: ReturnType<typeof createClient>,
    userId: string,
    now: Date = new Date(),
  ) {
    const eligibilityFlow = beginObservation("home_popup", userId, { reward_kind: "monthly_badge" });
    const badge = getPreviousMonthlyBadgeForAwardPopup(now);
    if (!badge) {
      observe(eligibilityFlow, "popup_eligibility_checked", { reward_kind: "monthly_badge", outcome: "ineligible" });
      return;
    }

    const campaignKey = getMonthlyBadgeAwardCampaignKey(badge);
    const localCampaignKey = getUserCampaignLocalStorageKey(campaignKey, userId);
    if (storageGet(localCampaignKey)) {
      observe(eligibilityFlow, "popup_eligibility_checked", { reward_kind: "monthly_badge", outcome: "already_seen" });
      return;
    }

    const seen = await loadUserCampaignSeen(supabase, userId, campaignKey);
    if (seen === true) {
      observe(eligibilityFlow, "popup_eligibility_checked", { reward_kind: "monthly_badge", outcome: "already_seen" });
      storageSet(localCampaignKey, "true");
      return;
    }

    const { startDate, endDateExclusive } = getMonthlyBadgeDateRange(badge);
    const { data, error } = await supabase
      .from("qt_records")
      .select("date,completed_at")
      .eq("user_id", userId)
      .eq("is_draft", false)
      .gte("date", startDate)
      .lt("date", endDateExclusive);

    if (error) {
      observe(eligibilityFlow, "popup_eligibility_checked", { reward_kind: "monthly_badge", outcome: "error", ...observationError(error) });
      console.warn("월별 배지 축하 대상 조회 실패:", error);
      return;
    }

    const status = getMonthlyBadgeStatus(
      badge,
      (data ?? []) as MonthlyBadgeCompletionRecord[],
      now,
    );
    if (status !== "earned" || storageGet(localCampaignKey)) {
      observe(eligibilityFlow, "popup_eligibility_checked", { reward_kind: "monthly_badge", outcome: status !== "earned" ? "ineligible" : "already_seen" });
      return;
    }

    observe(eligibilityFlow, "popup_eligibility_checked", { reward_kind: "monthly_badge", outcome: "eligible" });

    monthlyBadgeAwardHandledRef.current = false;
    setMonthlyBadgeAward(badge);
  }

  async function checkPendingChallengeRewards(
    supabase: ReturnType<typeof createClient>,
    today: string,
  ) {
    if (challengeRewardCheckStartedRef.current === today) return;
    challengeRewardCheckStartedRef.current = today;

    const eligibilityFlow = beginObservation("home_popup", companionChallengeAnnouncementUserIdRef.current ?? profile?.id, { reward_kind: "challenge_reward" });
    let eligibilityCheckFailed = false;
    const rewardsByAwardId = new Map<string, ChallengeReward>();

    try {
      const newlyClaimedRewards = await claimPendingChallengeRewards(supabase, today);
      newlyClaimedRewards.forEach((reward) => {
        rewardsByAwardId.set(reward.awardId, reward);
      });
    } catch (error) {
      // Challenge rewards are independent from Home and the core Bible Reflection flow.
      // A temporary reward check failure must never block Home, progress, or watering.
      console.warn("챌린지 미지급 보상 확인 실패:", error);
      eligibilityCheckFailed = true;
      observe(eligibilityFlow, "popup_eligibility_checked", { reward_kind: "challenge_reward", outcome: "error", ...observationError(error) });
    }

    try {
      const unseenRewards = await loadUnseenChallengeRewards(supabase);
      unseenRewards.forEach((reward) => {
        rewardsByAwardId.set(reward.awardId, reward);
      });
    } catch (error) {
      // Keep newly claimed rewards visible even if the recovery RPC has not
      // been deployed yet or is temporarily unavailable.
      console.warn("미확인 챌린지 보상 조회 실패:", error);
      eligibilityCheckFailed = true;
      observe(eligibilityFlow, "popup_eligibility_checked", { reward_kind: "challenge_reward", outcome: "error", ...observationError(error) });
    }

    const rewards = Array.from(rewardsByAwardId.values()).filter((reward) => {
      if (reward.kind !== "companion" || !companionChallengeAnnouncementUserIdRef.current) return true;
      const receiptPrefix = reward.challengeId === COMPANION_CHALLENGE_3_ID
        ? "companion_challenge_3_reward_"
        : reward.challengeId === COMPANION_CHALLENGE_4_ID
        ? "companion_challenge_4_reward_"
        : null;
      if (!receiptPrefix) return true;
      const key = getUserCampaignLocalStorageKey(
        `${receiptPrefix}${reward.awardId}`,
        companionChallengeAnnouncementUserIdRef.current,
      );
      if (!storageGet(key)) return true;
      // Retry a failed acknowledgement without showing or paying the reward again.
      void markChallengeRewardSeen(supabase, reward).catch((error) => {
        console.warn("동역자 챌린지 보상 확인 재시도 실패:", error);
      });
      return false;
    });
    if (rewards.length === 0) {
      if (!eligibilityCheckFailed) observe(eligibilityFlow, "popup_eligibility_checked", { reward_kind: "challenge_reward", outcome: "empty", count: 0 });
      return;
    }

    observe(eligibilityFlow, "popup_eligibility_checked", { reward_kind: "challenge_reward", outcome: "eligible", count: rewards.length });

    setChallengeRewardQueue((current) => {
      const existingAwardIds = new Set(current.map((reward) => reward.awardId));
      return [
        ...current,
        ...rewards.filter((reward) => !existingAwardIds.has(reward.awardId)),
      ];
    });
  }

  async function completeChallengeReward(openProfile: boolean) {
    const reward = challengeRewardQueue[0] ?? null;
    if (!reward || challengeRewardActionInFlightRef.current) return;
    acknowledgeObservedPopup(profile?.id, "challenge_reward", openProfile ? "profile" : "close");

    challengeRewardActionInFlightRef.current = true;
    const companionRewardReceiptPrefix = reward.kind === "companion"
      ? reward.challengeId === COMPANION_CHALLENGE_3_ID
        ? "companion_challenge_3_reward_"
        : reward.challengeId === COMPANION_CHALLENGE_4_ID
        ? "companion_challenge_4_reward_"
        : null
      : null;
    const hasFeaturedCompanionReward = companionRewardReceiptPrefix !== null;
    const userId = companionChallengeAnnouncementUserIdRef.current;
    if (companionRewardReceiptPrefix && userId) {
      storageSet(getUserCampaignLocalStorageKey(
        `${companionRewardReceiptPrefix}${reward.awardId}`, userId,
      ), "true");
    }
    const hasAnotherReward = challengeRewardQueue.some(
      (candidate) => candidate.awardId !== reward.awardId,
    );
    setChallengeRewardQueue((current) =>
      current.filter((candidate) => candidate.awardId !== reward.awardId),
    );

    if (hasFeaturedCompanionReward && openProfile) {
      // Leave remaining rewards unacknowledged for the next Home visit; do not
      // flash the next popup while navigating to the requested badge screen.
      setOpeningChallengeProfile(true);
      router.push("/profile#special-badges");
    }

    try {
      await markChallengeRewardSeen(createClient(), reward);
    } catch (error) {
      // If this acknowledgement fails, the same already-paid reward may be
      // shown again later. It never awards the badge or hearts twice.
      console.warn("챌린지 보상 팝업 확인 저장 실패:", error);
    } finally {
      challengeRewardActionInFlightRef.current = false;
      if (openProfile && !hasFeaturedCompanionReward && !hasAnotherReward) {
        router.push("/profile#special-badges");
      }
    }
  }

  async function saveAvatarChoice(avatarType: RootsAvatarType, markSeen = true) {
    if (!profile?.id || savingAvatarChoice) return;
    setSavingAvatarChoice(true);
    try {
      const supabase = createClient();
      await saveProfilePreferences(supabase, {
        avatarType,
        avatarChoiceSeen: markSeen,
      });
      setProfile((prev: any) => prev ? { ...prev, avatar_type: avatarType, avatar_choice_seen: markSeen } : prev);
      acknowledgeObservedPopup(profile?.id, "avatar_choice", "select");
      setShowAvatarChoiceModal(false);
    } catch (error) {
      console.error("캐릭터 선택 저장 실패:", error);
      showToast(HOME_LOCAL_TEXT[lang].characterSaveFailed);
    } finally {
      setSavingAvatarChoice(false);
    }
  }

  const wordWalkDone = todayDone.qt;
  const personalChallenge = usePersonalReflectionChallenge({
    userId: profile?.id ?? null,
    today: challengeLocalDate,
    ready: !loading && !homeLoadFailed,
    completedQtRecordId: wordWalkDone && homeDataDateRef.current === challengeLocalDate ? completedQtRecordId : null,
  });
  const dashboardText = getHomeDashboardText(lang);
  const currentHomeChallenge = personalChallenge.status
    && challengeLocalDate >= personalChallenge.status.startDate
    && challengeLocalDate <= personalChallenge.status.endDate
    ? personalChallenge.status : null;
  const personalChallengeDetails = showHomeChallenge ? currentHomeChallenge : null;
  const homeHubOpen = showHomeRoutine || showHomeGratitude || showHomeChallenge;
  const challengeDateFormatter = new Intl.DateTimeFormat(
    { ko: "ko-KR", en: "en-US", de: "de-DE", fr: "fr-FR", es: "es-ES" }[lang],
    { year: "numeric", month: "short", day: "numeric" },
  );
  const challengePeriod = personalChallengeDetails
    ? `${challengeDateFormatter.format(parseLocalDateString(personalChallengeDetails.startDate))} – ${challengeDateFormatter.format(parseLocalDateString(personalChallengeDetails.endDate))}`
    : undefined;
  usePrayerModalViewport(
    homeQTDialogRef,
    !loading && !homeLoadFailed && !!profile
      && (showHomeQTChoice || showHomeSundayQT || showHomeQTPassageChoice || showHomeQTPhotoPassageChoice),
  );
  const rewardMapDisplayDays = profile?.streak_days ?? 0;
  const rewardActionDisplayDays = activeActionReceipt?.days ?? rewardMapDisplayDays;
  const rewardPresentationsReady = !!profile?.id && rewardReceiptOwner === profile.id;
  const activityPresentationsReady = !!profile?.id && activityBadgeOwner === profile.id;
  const activityBadgeRecoveryPending = !!profile?.id && activityBadgeRetryRef.current?.userId === profile.id
    && activityBadgeRetryRef.current?.blocking === true;
  const currentRewardMapKind = activeRewardMapKind ?? getCurrentRewardMapCycle(rewardMapDisplayDays).kind;
  const isPostReflectionHome = homeEntry?.userId === profile?.id && homeEntry?.postReflection === true;
  const isGiftNotificationHome = homeEntry?.userId === profile?.id && !!homeEntry?.giftIntent;
  const visibleCelebration = !isGiftNotificationHome && celebration.show;
  const generalHomePopupsAllowed = !!homeEntry && homeEntry.userId === profile?.id && !isPostReflectionHome && !isGiftNotificationHome;
  // A deferred check is distinct from a completed check: no acceptance receipt
  // is read or acknowledged during the post-reflection visit.
  const companionNoticeGateReady = isPostReflectionHome || isGiftNotificationHome || companionAcceptanceCheckReady;
  const effectiveUpdatePrompt = requiredUpdatePrompt
    && (generalHomePopupsAllowed || requiredUpdatePrompt.mandatory) ? requiredUpdatePrompt : null;
  const homeDialogBlocked = showFirstLangPicker || showOnboarding || showLangPicker
    || showHomeQTDraftChoice || showHomeQTChoice || showHomeQTPassageChoice || showHomeQTPhotoPassageChoice
    || showHomeQTGuide || showHomeSundayQT || showNotificationSettingsModal
    || showHomePrayerCards || homeHubOpen;
  const rewardDialogBlocked = homeDialogBlocked || !!effectiveUpdatePrompt;
  const homePopupsReady = !loading && !homeLoadFailed && !!profile?.id;
  // Keep queued state until its own popup is shown and dismissed. A mandatory
  // update takes priority; otherwise welcome precedes an optional update.
  // General Home notices retain their existing sequence. A completed reflection
  // gets its own visit: ordinary notices stay unseen until the next Home entry.
  const visibleWelcomeBack = generalHomePopupsAllowed && homePopupsReady && showWelcomeBack
    && !effectiveUpdatePrompt?.mandatory && !homeDialogBlocked && !celebration.show;
  const visibleRequiredUpdatePrompt = homePopupsReady && effectiveUpdatePrompt
    && (effectiveUpdatePrompt.mandatory || (!showWelcomeBack && !homeDialogBlocked && !celebration.show))
    ? effectiveUpdatePrompt : null;
  const visibleCompanionAcceptanceNotice = generalHomePopupsAllowed && homePopupsReady
    && companionAcceptanceCheckReady
    && !!companionAcceptanceNotice
    && !handlingCompanionAcceptanceNotice
    && !requiredUpdatePrompt
    && !showWelcomeBack
    && !homeDialogBlocked
    && !celebration.show;
  const canShowProgressPopups = homePopupsReady
    && !isGiftNotificationHome
    && rewardPresentationsReady
    && companionNoticeGateReady
    && !companionAcceptanceNotice
    && !handlingCompanionAcceptanceNotice
    && !rewardDialogBlocked
    && !showWelcomeBack;
  const visibleBadgePopup = canShowProgressPopups && !celebration.show ? badgePopup : null;
  const showGardenUpdatePopup = canShowProgressPopups && gardenPopup.show
    && !celebration.show && !badgePopup && !rewardMapNotice && !showRootsManPopup;
  const visibleRewardMapNotice = canShowProgressPopups
    && !celebration.show && !badgePopup && !gardenPopup.show && !showRootsManPopup
    ? rewardMapNotice : null;
  const visibleRootsManPopup = canShowProgressPopups && showRootsManPopup
    && !celebration.show && !badgePopup && !gardenPopup.show && !rewardMapNotice;
  const currentAvatarType = normalizeRootsAvatarType(profile?.avatar_type);
  const homeProfileCharacterLayers = getProfileCharacterLayersForItemIds(
    enabledProfileCharacterItemIds,
    currentAvatarType,
  ).filter(layer => layer.slot !== "background");

  useEffect(() => {
    void load();
    return () => { homeLoadGenerationRef.current += 1; };
  }, []);

  useEffect(() => {
    const onGiftPush = () => { void load(); };
    window.addEventListener(GIFT_HOME_INTENT_EVENT, onGiftPush);
    return () => window.removeEventListener(GIFT_HOME_INTENT_EVENT, onGiftPush);
  }, []);

  useEffect(() => {
    if ((!isPostReflectionHome && !isGiftNotificationHome) || !profile?.id) return;
    const userId = profile.id;
    let active = true;
    let nativeActive = true;
    let foreground = document.visibilityState !== "hidden";
    // Opening a push while the app is still becoming active belongs to this
    // gift visit. Only a later leave/return starts an ordinary Home visit.
    const giftToken = homeEntryRef.current?.giftIntent?.token;
    let leftForeground = !foreground && !isGiftNotificationHome;
    const updateForeground = () => {
      const next = nativeActive && document.visibilityState !== "hidden";
      if (!active || next === foreground) return;
      foreground = next;
      if (!next) { leftForeground = true; return; }
      const entry = homeEntryRef.current;
      if (entry?.giftIntent && entry.giftIntent.token !== giftToken) return;
      if (!leftForeground || !entry || entry.userId !== userId || (!entry.postReflection && !entry.giftIntent)) return;
      // Returning to the app is a new ordinary Home visit. Keep all pending
      // rewards; only the one-visit presentation mode is reset.
      homeEntryRef.current = null;
      setHomeEntry(null);
      void load();
    };
    document.addEventListener("visibilitychange", updateForeground);
    let appStateListener: { remove: () => Promise<void> } | null = null;
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("App")) {
      void CapacitorApp.addListener("appStateChange", ({ isActive }) => {
        nativeActive = isActive;
        updateForeground();
      }).then(handle => {
        if (!active) void handle.remove();
        else appStateListener = handle;
      }).catch(() => {});
    }
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", updateForeground);
      if (appStateListener) void appStateListener.remove();
    };
  }, [isPostReflectionHome, isGiftNotificationHome, homeEntry?.giftIntent?.token, profile?.id]);

  useEffect(() => {
    const retryProgress = () => {
      if (progressUpdateInFlightRef.current) progressRetryRequestedRef.current = true;
      else setProgressRetryToken(token => token + 1);
    };
    window.addEventListener("online", retryProgress);
    return () => window.removeEventListener("online", retryProgress);
  }, []);

  useEffect(() => {
    const userId = profile?.id;
    if (loading || !userId || !messengerShareAnnouncementEligible) {
      messengerShareAnnouncementUserIdRef.current = null;
      setShowMessengerShareAnnouncement(false);
      setMessengerShareAnnouncementOwner(null);
      return;
    }
    messengerShareAnnouncementUserIdRef.current = userId;
    messengerShareAnnouncementHandledRef.current = false;
    setShowMessengerShareAnnouncement(false);
    setMessengerShareAnnouncementOwner(userId);
    let cancelled = false;
    let readGeneration = 0;
    const refresh = async (event?: Event) => {
      if (cancelled || (event?.type === "visibilitychange" && document.visibilityState !== "visible")) return;
      const generation = ++readGeneration;
      let seen: boolean | null = null;
      try {
        seen = await withQtDraftTimeout(
          readMessengerShareAnnouncementSeen(createClient(), userId),
          6_000, "messenger sharing announcement",
        );
      } catch { /* A later Home entry or reconnect retries this optional notice. */ }
      if (cancelled || generation !== readGeneration || messengerShareAnnouncementUserIdRef.current !== userId) return;
      setShowMessengerShareAnnouncement(seen === false && !messengerShareAnnouncementHandledRef.current);
    };
    void refresh();
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    let appStateListener: { remove: () => Promise<void> } | null = null;
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("App")) {
      void CapacitorApp.addListener("appStateChange", ({ isActive }) => {
        if (isActive) void refresh();
      }).then(handle => {
        if (cancelled) void handle.remove();
        else appStateListener = handle;
      }).catch(() => {});
    }
    return () => {
      cancelled = true;
      readGeneration += 1;
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
      if (appStateListener) void appStateListener.remove();
    };
  }, [loading, profile?.id, messengerShareAnnouncementEligible]);

  useEffect(() => {
    if (loading || !profile?.id || challengeLocalDate <= COMPANION_CHALLENGE_3_END_DATE) return;
    // Also checks on a new local day when an already-mounted native Home resumes.
    void checkPendingChallengeRewards(createClient(), challengeLocalDate);
  }, [loading, profile?.id, challengeLocalDate]);

  // A language change resets only the translation for a new Bible Reflection.
  // An existing draft keeps its own bible_version and is resumed unchanged.
  useEffect(() => {
    const storedLang = getStoredLang();
    if (!storedLang || storedLang !== lang || homeQTState.hasDraft) return;

    const preferredTranslation = getPreferredTranslationForLang(lang);
    savePreferredTranslationLocally(lang, preferredTranslation);
    setHomeQTState(prev => prev.preferredTranslation === preferredTranslation
      ? prev
      : { ...prev, preferredTranslation });
  }, [lang, homeQTState.hasDraft]);

  useEffect(() => {
    if (!profile?.id) {
      setRequiredUpdatePrompt(null);
      return;
    }

    let cancelled = false;
    let appStateListener: { remove: () => Promise<void> } | null = null;

    const refreshRequiredUpdate = async () => {
      const prompt = await detectOneTimeUpdatePopup(profile.id);
      if (!cancelled) setRequiredUpdatePrompt(prompt);
    };

    void refreshRequiredUpdate();

    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("App")) {
      void CapacitorApp.addListener("appStateChange", ({ isActive }) => {
        if (isActive) void refreshRequiredUpdate();
      }).then(handle => {
        if (cancelled) {
          void handle.remove();
          return;
        }
        appStateListener = handle;
      }).catch(error => {
        console.warn("Roots required-update app-state check unavailable", error);
      });
    }

    return () => {
      cancelled = true;
      if (appStateListener) void appStateListener.remove();
    };
  }, [profile?.id]);

  useEffect(() => {
    if (loading || !profile?.id || !completedQtRecordId) return;

    const today = getLocalDateString();
    const repairTodayCompanionLedger = () => {
      const supabase = createClient();
      void recordCompanionChallengeReflectionCompletedBestEffort(
        supabase,
        today,
        completedQtRecordId,
      );
    };

    // Reward-layer repair only: never calls or mutates Bible Reflection
    // streak/progress. This safely fills a same-day companion ledger row if the
    // immediate post-completion RPC lost its response or briefly failed.
    repairTodayCompanionLedger();
    window.addEventListener("online", repairTodayCompanionLedger);

    let appStateListener: { remove: () => Promise<void> } | null = null;
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("App")) {
      void CapacitorApp.addListener("appStateChange", ({ isActive }) => {
        if (isActive) repairTodayCompanionLedger();
      }).then(handle => {
        appStateListener = handle;
      }).catch(error => {
        console.warn("동역자 챌린지 완료일 복구 리스너 등록 실패:", error);
      });
    }

    return () => {
      window.removeEventListener("online", repairTodayCompanionLedger);
      if (appStateListener) void appStateListener.remove();
    };
  }, [loading, profile?.id, completedQtRecordId]);

  async function load() {
    const generation = ++homeLoadGenerationRef.current;
    const isCurrentLoad = () => homeLoadGenerationRef.current === generation;
    initialActivityBadgeReadRef.current = null;
    setHomeCharacterItemsOwner(null);
    setLoading(true);
    setHomeLoadFailed(false);
    setCompanionAcceptanceNotice(null);
    setCompanionAcceptanceCheckReady(false);
    setHandlingCompanionAcceptanceNotice(false);
    setHomeDetailsReady({ prayer: false, schedule: false });
    setUpdateAnnouncementAccount(null);
    setAnnouncementRewardChecksReadyFor(null);
    try {
      if (typeof window !== "undefined") {
        const saved = storageGet("roots_theme");
        if (saved === "dark") {
          document.documentElement.setAttribute("data-theme", "dark");
        } else {
          document.documentElement.removeAttribute("data-theme");
        }
      }
      const supabase = createClient();
      let sessionResponse = await withQtDraftTimeout(supabase.auth.getSession(), 6_000, "home session");
      if (sessionResponse.error) throw sessionResponse.error;
      let session = sessionResponse.data.session;
      if (!session) {
        await new Promise(resolve => setTimeout(resolve, 350));
        sessionResponse = await withQtDraftTimeout(supabase.auth.getSession(), 6_000, "home session retry");
        if (sessionResponse.error) throw sessionResponse.error;
        session = sessionResponse.data.session;
      }
      if (!isCurrentLoad()) return;
      const user = session?.user ?? null;
      if (!user) { router.push("/welcome"); return; }
      const today = getLocalDateString();

      // These presentation reads do not depend on the profile/QT snapshot.
      // Start them alongside it, but keep all existing popup readiness gates.
      if (readActivityBadgeAwardRetries(user.id).length === 0) {
        initialActivityBadgeReadRef.current = {
          userId: user.id,
          loadGeneration: generation,
          promise: withQtDraftTimeout(
            readPendingActivityBadges(supabase, user.id),
            8_000, "home activity badge preparation",
          ).catch(() => readLocalPendingActivityBadges(user.id)),
        };
      }

      // Only this confirmed snapshot gates Home and the post-reflection reward.
      // Optional verse, schedule and community requests must not hold it back.
      const loadProfile = async () => {
        let response = await withQtDraftTimeout(
          supabase.from("profiles").select("*").eq("id", user.id).single(),
          8_000, "home profile",
        );
        for (const delayMs of HOME_PROFILE_RETRY_DELAYS_MS) {
          if (response.data) break;
          await new Promise(resolve => setTimeout(resolve, delayMs));
          response = await withQtDraftTimeout(
            supabase.from("profiles").select("*").eq("id", user.id).single(),
            8_000, "home profile retry",
          );
        }
        if (!response.data) throw response.error ?? new Error("Home profile unavailable");
        return response.data;
      };
      const [p, qtResponse] = await Promise.all([
        loadProfile(),
        withQtDraftTimeout(
          supabase.from("qt_records").select("id,is_draft").eq("user_id", user.id).eq("date", today),
          8_000, "home reflection status",
        ),
      ]);
      if (qtResponse.error) throw qtResponse.error;
      if (!isCurrentLoad()) return;
      if (getLocalDateString() !== today) { void load(); return; }
      const qtRecords = qtResponse.data ?? [];
      const completedQt = qtRecords.find((record: any) => !record.is_draft) ?? null;
      const remoteDraftExists = qtRecords.some((record: any) => record.is_draft);
      const confirmedQtRecordId = completedQt?.id ?? null;
      const previousEntry = homeEntryRef.current;
      const giftIntent = consumeGiftHomeIntent(user.id);
      const entry = !giftIntent && previousEntry?.userId === user.id && previousEntry.date === today
        && previousEntry.qtRecordId === confirmedQtRecordId
        ? previousEntry
        : {
          userId: user.id, date: today, qtRecordId: confirmedQtRecordId,
          postReflection: consumePostReflectionHomeReturn(user.id, today, confirmedQtRecordId) && !giftIntent,
          giftIntent,
        };
      homeEntryRef.current = entry;
      setHomeEntry(entry);
      const hasDraft = !completedQt && (remoteDraftExists || !!loadQTDraftBackup(user.id, today));
      homeDataDateRef.current = today;
      companionChallengeAnnouncementUserIdRef.current = user.id;
      monthlyBadgeAwardUserIdRef.current = user.id;
      setUpdateAnnouncementAccount({ userId: user.id, createdAt: user.created_at ?? null });
      setProfile(p);
      setShowAvatarChoiceModal(!entry.postReflection && !entry.giftIntent
        && Object.prototype.hasOwnProperty.call(p, "avatar_choice_seen") && p.avatar_choice_seen !== true);
      const profileLang = isLang(p.preferred_language) ? p.preferred_language : null;
      const activeLang = getStoredLang() ?? profileLang ?? lang;
      const preferredTranslation = getPreferredTranslationForLang(activeLang, p.preferred_translation, profileLang);
      savePreferredTranslationLocally(activeLang, preferredTranslation);
      setHomeQTState({ hasDraft, preferredTranslation, todaySchedule: null });
      setCompletedQtRecordId(completedQt?.id ?? null);
      setTodayDone({ qt: !!completedQt, prayer: false });

      const lastCheckin = p.last_checkin ? String(p.last_checkin).slice(0, 10) : null;
      setShowWelcomeBack(false);
      if (!entry.postReflection && !entry.giftIntent && lastCheckin) {
        const lastDate = parseLocalDateString(lastCheckin);
        lastDate.setHours(0, 0, 0, 0);
        const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / 86400000);
        const missedDays = Math.max(0, diffDays - 1);
        const welcomeKey = `welcome_back_${today}`;
        if (missedDays >= 1 && !storageGet(welcomeKey)) {
          setWelcomeBackStorageKey(welcomeKey);
          setWelcomeBackDays(missedDays);
          setShowWelcomeBack(true);
        }
      }
      const completionWateringKey = getScopedStorageKey(QT_COMPLETION_WATERING_KEY_PREFIX, user.id, today);
      const legacyCompletionWateringKey = getLegacyStorageKey(QT_COMPLETION_WATERING_KEY_PREFIX, today);
      const celebratedKey = getScopedStorageKey(CELEBRATED_KEY_PREFIX, user.id, today);
      const profileLastCheckinToday = lastCheckin === today;
      const hasCompletionWateringRequest = !!storageGet(completionWateringKey)
        || (!!storageGet(legacyCompletionWateringKey) && !profileLastCheckinToday);
      if (!hasCompletionWateringRequest && (storageGet(celebratedKey) || profileLastCheckinToday)) {
        celebrationShownRef.current = true;
      }
      if (isFirstLaunch()) setShowFirstLangPicker(true);
      const onboardingDoneKey = getOnboardingDoneKey(user.id);
      const scopedOnboardingDone = storageGet(onboardingDoneKey);
      const legacyOnboardingDone = storageGet(ONBOARDING_DONE_KEY);
      const existingUserMissingLocalMarker = !scopedOnboardingDone && !isRecentSignup(user.created_at) && hasEstablishedProfileActivity(p);
      const shouldMigrateLegacyOnboarding = !!legacyOnboardingDone && !scopedOnboardingDone && !isRecentSignup(user.created_at);
      if (shouldMigrateLegacyOnboarding || existingUserMissingLocalMarker) {
        storageSet(onboardingDoneKey, "true");
      } else if (!scopedOnboardingDone) {
        setShowOnboarding(true);
      }
      setLoading(false);

      const background = (label: string, task: () => Promise<void>) => {
        void task().catch(error => { if (isCurrentLoad()) console.warn(label, error); });
      };
      const ready = (key: keyof typeof homeDetailsReady) => {
        if (isCurrentLoad()) setHomeDetailsReady(previous => ({ ...previous, [key]: true }));
      };
      background("홈 사랑 상점 아이템 조회 실패:", async () => {
        const items = await loadOwnedHeartShopItems(supabase);
        if (!isCurrentLoad()) return;
        const enabledItemIds = items.filter(item => item.isEnabled).map(item => item.itemId);
        setEnabledHeartShopItemIds(enabledItemIds.filter(isHeartShopMapItemId));
        setEnabledProfileCharacterItemIds(enabledItemIds.filter(isHeartShopCharacterItemId));
        setHomeCharacterItemsOwner(user.id);
      });
      background("홈 보상 안내 확인 실패:", async () => {
        // This readiness flag only delays the optional new-feature notice.
        // Existing monthly/challenge rewards still prepare independently.
        await Promise.allSettled([
          checkMonthlyBadgeAwardAnnouncement(supabase, user.id),
          checkPendingChallengeRewards(supabase, today),
        ]);
        if (isCurrentLoad()) setAnnouncementRewardChecksReadyFor(user.id);
      });
      if (!entry.postReflection && !entry.giftIntent) background("동역자 수락 안내 조회 실패:", async () => {
        try {
          const { data, error } = await withQtDraftTimeout(
            supabase
              .from("companion_acceptance_notices")
              .select("id,accepter_id,accepted_at")
              .eq("requester_id", user.id)
              .is("seen_at", null)
              .order("accepted_at", { ascending: true })
              .limit(20),
            5_000,
            "home companion acceptance notices",
          );
          if (error) throw error;
          if (!isCurrentLoad()) return;

          const notices = data ?? [];
          if (notices.length === 0) {
            setCompanionAcceptanceNotice(null);
            return;
          }

          let primaryName: string | null = null;
          try {
            const profiles = await withQtDraftTimeout(
              loadProfileCards(
                supabase,
                notices.map((notice: any) => notice.accepter_id),
              ),
              5_000,
              "home companion acceptance profiles",
            );
            if (!isCurrentLoad()) return;
            const primaryId = String(notices[0]?.accepter_id ?? "");
            primaryName = profiles.find((item) => item.id === primaryId)?.name?.trim() || null;
          } catch (profileError) {
            if (isCurrentLoad()) {
              console.warn("동역자 수락 안내 프로필 조회 실패:", profileError);
            }
          }

          if (!isCurrentLoad()) return;
          setCompanionAcceptanceNotice({
            ids: notices.map((notice: any) => String(notice.id)).filter(Boolean),
            primaryName,
            additionalCount: Math.max(0, notices.length - 1),
          });
        } finally {
          if (isCurrentLoad()) setCompanionAcceptanceCheckReady(true);
        }
      });
      background("동역자 신청 조회 실패:", async () => {
        const { data, error } = await withQtDraftTimeout(supabase.from("companions").select("id")
          .eq("receiver_id", user.id).eq("status", "pending"), 8_000, "home companion requests");
        if (error) throw error;
        if (isCurrentLoad()) setPendingCompanionRequestCount((data ?? []).length);
      });
      background("홈 기도 상태 조회 실패:", async () => {
        const { data, error } = await withQtDraftTimeout(supabase.from("daily_prayer_completions").select("id")
          .eq("user_id", user.id).eq("date", today).maybeSingle(), 8_000, "home prayer status");
        if (error) throw error;
        if (!isCurrentLoad()) return;
        setTodayDone(previous => ({ ...previous, prayer: previous.prayer || !!data }));
        ready("prayer");
      });
      background("홈 묵상 본문 일정 조회 실패:", async () => {
        let todaySchedule: QTSchedule | null = null;
        if (!isSunday()) {
          const { data, error } = await withQtDraftTimeout(supabase.from("qt_schedule")
            .select("book,chapter,start_verse,end_verse,end_chapter,title").eq("date", today).maybeSingle(), 8_000, "home reflection schedule");
          if (error) throw error;
          todaySchedule = data ?? null;
        }
        if (!isCurrentLoad()) return;
        setHomeQTState(previous => ({ ...previous, todaySchedule }));
        ready("schedule");
      });
    } catch (error) {
      if (!isCurrentLoad()) return;
      console.error("홈 정보 조회 실패:", error);
      setHomeLoadFailed(true);
      setLoading(false);
    }
  }

  useEffect(() => {
    const userId = profile?.id;
    const onboardingDone = userId ? storageGet(getOnboardingDoneKey(userId)) : null;
    if (loading || homeLoadFailed || !wordWalkDone || !onboardingDone || celebrationShownRef.current || progressUpdateInFlightRef.current) return;
    const today = getLocalDateString();
    if (!userId || homeDataDateRef.current !== today) return;
    const completionWateringKey = getScopedStorageKey(QT_COMPLETION_WATERING_KEY_PREFIX, userId, today);
    const legacyCompletionWateringKey = getLegacyStorageKey(QT_COMPLETION_WATERING_KEY_PREFIX, today);
    const celebratedKey = getScopedStorageKey(CELEBRATED_KEY_PREFIX, userId, today);
    const profileLastCheckinToday = profile?.last_checkin ? String(profile.last_checkin).slice(0, 10) === today : false;
    const hasCompletionWateringRequest = !!storageGet(completionWateringKey)
      || (!!storageGet(legacyCompletionWateringKey) && !profileLastCheckinToday);
    if (!hasCompletionWateringRequest && (storageGet(celebratedKey) || profileLastCheckinToday)) {
      celebrationShownRef.current = true;
      return;
    }
    const generation = homeLoadGenerationRef.current;
    progressUpdateInFlightRef.current = true;
    void (async () => {
      // This is a freshly read, server-confirmed profile, not a locally
      // calculated increment. Keep the original idempotent RPC for recovery.
      const confirmedDays = Number(profile?.streak_days ?? 0);
      const nextStreakDays = profileLastCheckinToday && Number.isFinite(confirmedDays) && confirmedDays > 0
        ? confirmedDays
        : await updateStreak(today, userId, generation);
      if (nextStreakDays === null || homeLoadGenerationRef.current !== generation || getLocalDateString() !== today) return;
      celebrationShownRef.current = true;
      // Progress was already confirmed above. Replaying its UI only reads
      // receipts; an older pending date never re-enters the progress RPC.
      await refreshRewardPresentations(userId, {
        ...profile, streak_days: nextStreakDays, last_checkin: today,
      }, true);
    })().catch(error => {
      console.warn("말씀 묵상 보상 화면 준비 실패:", error);
    }).finally(() => {
      progressUpdateInFlightRef.current = false;
      // Resume the receipt queue after today's recovery settles, including a
      // failed recovery. It may still contain valid older, already-earned UI.
      if (homeLoadGenerationRef.current === generation) setRootsManRequestToken(token => token + 1);
      if (progressRetryRequestedRef.current) {
        progressRetryRequestedRef.current = false;
        if (homeLoadGenerationRef.current === generation) setProgressRetryToken(token => token + 1);
      }
    });
  }, [wordWalkDone, loading, homeLoadFailed, profile?.id, profile?.last_checkin, profile?.streak_days, progressRetryToken, showOnboarding]);

  async function updateStreak(today: string, userId: string, generation: number): Promise<number | null> {
    const supabase = createClient();
    try {
      const { data: { user }, error } = await withQtDraftTimeout(supabase.auth.getUser(), 6_000, "home progress user");
      if (error) throw error;
      if (!user || user.id !== userId) return null;
      const result = await withQtDraftTimeout(recordBibleReflectionProgress(supabase, userId, today), 10_000, "home reflection progress");
      if (homeLoadGenerationRef.current !== generation) return null;
      // A failed presentation must not consume an already-earned badge receipt.
      if (result.profile) setProfile((previous: any) => ({ ...(previous ?? {}), ...result.profile }));
      // Reward ledger recovery is independent from the already committed core
      // progress; Home also retries it on online and native resume.
      void recordCompanionChallengeReflectionCompletedBestEffort(supabase, today, completedQtRecordId);
      const nextDays = Number(result.profile?.streak_days ?? 0);
      return Number.isFinite(nextDays) && nextDays > 0 ? nextDays : null;
    } catch (error) {
      console.warn("말씀 묵상 progress 업데이트 실패:", error);
      return null;
    }
  }

  function rewardReceiptIdentity(receipt: RewardPresentationReceipt) {
    return `${receipt.userId}:${receipt.date}:${receipt.itemKey}`;
  }

  async function refreshRewardPresentations(userId: string, receiptProfile: any, reuseInFlight = false) {
    const loadGeneration = homeLoadGenerationRef.current;
    const lastCheckin = String(receiptProfile?.last_checkin ?? "");
    const days = Number(receiptProfile?.streak_days ?? 0);
    const shared = rewardReceiptRequestRef.current;
    if (reuseInFlight && shared?.userId === userId
      && shared.loadGeneration === loadGeneration && shared.lastCheckin === lastCheckin && shared.days === days
      && shared.readGeneration === rewardReceiptReadGenerationRef.current) {
      // The initial effect and confirmed-progress gate await the same read.
      // Joining must not supersede its publisher or a newer event refresh.
      return shared.promise;
    }
    const generation = ++rewardReceiptReadGenerationRef.current;
    const supabase = createClient();
    const promise = (async () => {
      let receipts: RewardPresentationReceipt[];
      try {
        // Migration queues its local receipts synchronously. The read joins its
        // existing outbox sync, so Home needs one server lookup after that sync.
        void migrateLegacyRewardPresentations(supabase, userId, receiptProfile).catch(() => {});
        receipts = await withQtDraftTimeout(
          readPendingRewardPresentations(supabase, userId),
          8_000, "home pending reward receipts",
        );
      } catch {
        // A transient network failure cannot hide a device's durable pending UI.
        // Server receipts are retried on Home entry, foreground and reconnect.
        receipts = readLocalPendingRewardPresentations(userId);
      }
      if (rewardReceiptUserRef.current !== userId || generation !== rewardReceiptReadGenerationRef.current
        || loadGeneration !== homeLoadGenerationRef.current) return;
      rewardReceiptsRef.current = receipts;
      setPendingRewardReceiptCount(receipts.filter(receipt =>
        !claimedRewardReceiptsRef.current.has(rewardReceiptIdentity(receipt)),
      ).length);
      setRewardReceiptOwner(userId);
      setRootsManRequestToken(token => token + 1);
    })();
    const request = { userId, loadGeneration, readGeneration: generation, lastCheckin, days, promise };
    rewardReceiptRequestRef.current = request;
    try { await promise; }
    finally { if (rewardReceiptRequestRef.current === request) rewardReceiptRequestRef.current = null; }
  }

  useEffect(() => {
    const userId = profile?.id;
    if (loading || !userId) return;
    if (rewardReceiptUserRef.current !== userId) {
      rewardReceiptUserRef.current = userId;
      rewardReceiptsRef.current = [];
      claimedRewardReceiptsRef.current.clear();
      setBadgePopup(null);
      setGardenPopup({ show: false, type: "garden", badgeIndex: 0 });
      setRewardMapNotice(null);
      setActiveActionReceipt(null);
      setShowRootsManPopup(false);
      setShowRootsMan(false);
      setRewardReceiptOwner(null);
    }
    let cancelled = false;
    const refresh = (event?: Event, reuseInFlight = false) => {
      if (cancelled || (event?.type === "visibilitychange" && document.visibilityState !== "visible")) return;
      if (event?.type === REWARD_PRESENTATIONS_EVENT) {
        const detail = (event as CustomEvent<{ userId?: string }>).detail;
        if (detail?.userId !== userId) return;
        // A delayed successful completion may have outlived its screen timeout.
        // Only today's ordinary recovery gate may refresh missing progress.
        if (String(profile.last_checkin ?? "").slice(0, 10) !== getLocalDateString()) {
          if (progressUpdateInFlightRef.current) progressRetryRequestedRef.current = true;
          else setProgressRetryToken(token => token + 1);
        }
      }
      void refreshRewardPresentations(userId, profile, reuseInFlight);
    };
    refresh(undefined, true);
    window.addEventListener(REWARD_PRESENTATIONS_EVENT, refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    let appStateListener: { remove: () => Promise<void> } | null = null;
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("App")) {
      void CapacitorApp.addListener("appStateChange", ({ isActive }) => {
        if (isActive) refresh();
      }).then(handle => {
        if (cancelled) void handle.remove();
        else appStateListener = handle;
      }).catch(error => {
        console.warn("보상 안내 재개 리스너 등록 실패:", error);
      });
    }
    return () => {
      cancelled = true;
      rewardReceiptReadGenerationRef.current += 1;
      window.removeEventListener(REWARD_PRESENTATIONS_EVENT, refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
      if (appStateListener) void appStateListener.remove();
    };
  }, [loading, profile?.id, profile?.last_checkin, profile?.streak_days]);

  async function refreshActivityBadgePresentations(userId: string, retryAwardChecks = false) {
    if (retryAwardChecks && readActivityBadgeAwardRetries(userId).length > 0
      && activityBadgeRetryRef.current?.userId !== userId) {
      const tracked = { userId, promise: retryPendingActivityBadgeAwards(createClient(), userId), blocking: true };
      activityBadgeRetryRef.current = tracked;
      setRootsManRequestToken(token => token + 1);
      void tracked.promise.finally(() => {
        if (activityBadgeRetryRef.current === tracked) activityBadgeRetryRef.current = null;
      }).catch(() => {});
    }
    const retry = activityBadgeRetryRef.current?.userId === userId && activityBadgeRetryRef.current.blocking
      ? activityBadgeRetryRef.current.promise : null;
    const generation = ++activityBadgeReadGenerationRef.current;
    const loadGeneration = homeLoadGenerationRef.current;
    const supabase = createClient();
    const prepared = initialActivityBadgeReadRef.current;
    const usePreparedRead = !retry && readActivityBadgeAwardRetries(userId).length === 0
      && prepared?.userId === userId && prepared.loadGeneration === homeLoadGenerationRef.current;
    if (prepared?.userId === userId) initialActivityBadgeReadRef.current = null;
    const trackedRead = { userId, generation };
    activityBadgeReadInFlightRef.current = trackedRead;
    let keys: ActivityBadgeKey[];
    try {
      keys = await withQtDraftTimeout((async () => {
        // When a failed award is being recovered, read after that transaction
        // settles. All overlapping reads share the same recovery promise.
        if (retry) await retry;
        if (usePreparedRead) {
          await prepared.promise;
          // A newly earned badge or dismissal may have arrived while Home's
          // profile was loading. Publish the latest merged presentation state.
          return readLocalPendingActivityBadges(userId);
        }
        return readPendingActivityBadges(supabase, userId);
      })(), 8_000, "home activity badge receipts");
    } catch {
      if (retry && activityBadgeRetryRef.current?.promise === retry) {
        // The UI wait is bounded even if the underlying RPC keeps running.
        // Its eventual grant stays durable and must not interrupt an animation.
        activityBadgeRetryRef.current.blocking = false;
      }
      keys = readLocalPendingActivityBadges(userId);
    } finally {
      if (activityBadgeReadInFlightRef.current === trackedRead) activityBadgeReadInFlightRef.current = null;
    }
    if (activityBadgeUserRef.current !== userId || generation !== activityBadgeReadGenerationRef.current
      || loadGeneration !== homeLoadGenerationRef.current) return;
    // The server read has merged into local state. Include any award/ACK event
    // received during its final promise handoff before publishing the queue.
    keys = readLocalPendingActivityBadges(userId);
    activityBadgesRef.current = keys;
    setPendingActivityBadgeCount(keys.filter(key => !claimedActivityBadgesRef.current.has(key)).length);
    setActivityBadgeOwner(userId);
    setRootsManRequestToken(token => token + 1);
  }

  useEffect(() => {
    const userId = profile?.id;
    if (loading || !userId) return;
    if (activityBadgeUserRef.current !== userId) {
      activityBadgeUserRef.current = userId;
      activityBadgesRef.current = [];
      claimedActivityBadgesRef.current.clear();
      setActivityBadgeOwner(null);
      setPendingActivityBadgeCount(0);
    }
    let cancelled = false;
    const refresh = (event?: Event) => {
      if (cancelled || (event?.type === "visibilitychange" && document.visibilityState !== "visible")) return;
      if (event?.type === ACTIVITY_BADGE_PRESENTATIONS_EVENT) {
        if ((event as CustomEvent<{ userId?: string }>).detail?.userId !== userId) return;
        const reading = activityBadgeReadInFlightRef.current;
        // The active read merges current local awards/ACKs before returning.
        // Its own cache-change notification must not start a second server read.
        if (reading && activityBadgeUserRef.current === userId && reading.userId === userId
          && reading.generation === activityBadgeReadGenerationRef.current) return;
      }
      // Unfinished or failed checks queued by a successful share are retried.
      // Reading/acknowledging a popup never invokes the progress RPC.
      void refreshActivityBadgePresentations(userId, event?.type !== ACTIVITY_BADGE_PRESENTATIONS_EVENT);
    };
    refresh();
    window.addEventListener(ACTIVITY_BADGE_PRESENTATIONS_EVENT, refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    const { data: { subscription } } = createClient().auth.onAuthStateChange((event, session) => {
      if (cancelled || (event !== "SIGNED_OUT" && (!session?.user?.id || session.user.id === userId))) return;
      // Revoke this queue immediately even if the old profile is still on
      // screen while the route's ordinary account refresh is completing.
      activityBadgeUserRef.current = null;
      activityBadgeReadGenerationRef.current += 1;
      activityBadgeReadInFlightRef.current = null;
      activityBadgesRef.current = [];
      claimedActivityBadgesRef.current.clear();
      setActivityBadgeOwner(null);
      setPendingActivityBadgeCount(0);
      setBadgePopup(previous => previous?.activityBadgeKey ? null : previous);
    });
    let appStateListener: { remove: () => Promise<void> } | null = null;
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("App")) {
      void CapacitorApp.addListener("appStateChange", ({ isActive }) => {
        if (isActive) refresh();
      }).then(handle => {
        if (cancelled) void handle.remove();
        else appStateListener = handle;
      }).catch(error => {
        console.warn("배지 안내 재개 리스너 등록 실패:", error);
      });
    }
    return () => {
      cancelled = true;
      activityBadgeReadGenerationRef.current += 1;
      activityBadgeReadInFlightRef.current = null;
      window.removeEventListener(ACTIVITY_BADGE_PRESENTATIONS_EVENT, refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
      subscription.unsubscribe();
      if (appStateListener) void appStateListener.remove();
    };
  }, [loading, profile?.id]);

  function acknowledgeRewardReceipt(receipt?: RewardPresentationReceipt | null) {
    if (!receipt || receipt.userId !== profile?.id) return;
    // The helper writes a durable local acknowledgement before its first await.
    // Closing the app during the request must not replay a confirmed popup.
    void acknowledgeRewardPresentations(createClient(), receipt.userId, [receipt]).catch(() => {
      // The helper retains its outbox and retries it at the next receipt read.
    });
  }

  function acknowledgePostReflectionReward() {
    acknowledgeRewardReceipt(activeActionReceipt);
  }

  useEffect(() => {
    if (!visibleWelcomeBack || !welcomeBackStorageKey) return;
    const markWelcomeShown = () => {
      if (document.visibilityState === "visible") storageSet(welcomeBackStorageKey, "true");
    };
    markWelcomeShown();
    document.addEventListener("visibilitychange", markWelcomeShown);
    return () => document.removeEventListener("visibilitychange", markWelcomeShown);
  }, [visibleWelcomeBack, welcomeBackStorageKey]);

  function takeRewardReceipt(predicate: (receipt: RewardPresentationReceipt) => boolean) {
    const receipt = rewardReceiptsRef.current.find(candidate =>
      predicate(candidate) && !claimedRewardReceiptsRef.current.has(rewardReceiptIdentity(candidate)),
    );
    if (!receipt) return null;
    claimedRewardReceiptsRef.current.add(rewardReceiptIdentity(receipt));
    setPendingRewardReceiptCount(count => Math.max(0, count - 1));
    return receipt;
  }

  function showNextProgressPopup(): boolean {
    if (!profile || badgePopup || gardenPopup.show || rewardMapNotice) return false;
    const badgeDefinitions = [
      ["badge_rootsman", "/badge_rootsman.webp", "badge_popup_rootsman", "badge_rootsman_msg"],
      ["badge_mose", "/badge_mose.webp", "badge_popup_mose", "badge_mose_msg"],
      ["badge_rootsman_bible", "/badge_rootsman_bible.webp", "badge_popup_rootsman_bible", "badge_rootsman_bible_msg"],
      ["badge_david", "/badge_david.webp", "badge_popup_david", "badge_david_msg"],
    ] as const;
    for (const [badgeKey, img, titleKey, messageKey] of badgeDefinitions) {
      const receipt = takeRewardReceipt(candidate => candidate.itemKey === badgeKey);
      if (receipt) {
        setBadgePopup({ badgeKey, receipt, img, title: t(titleKey, lang), msg: t(messageKey, lang) });
        return true;
      }
    }
    for (let index = 0; index < 9; index++) {
      const badgeKey = `fruit_badge_${index}`;
      const receipt = takeRewardReceipt(candidate => candidate.itemKey === badgeKey);
      if (receipt) {
        setGardenPopup({ show: true, type: "badge", badgeIndex: index, badgeKey, receipt });
        return true;
      }
    }
    const angel = takeRewardReceipt(candidate => candidate.itemKey === "badge_angel");
    if (angel) {
      setBadgePopup({ badgeKey: "badge_angel", receipt: angel, img: "/angel.webp", title: t("badge_popup_angel", lang), msg: t("badge_angel_msg", lang) });
      return true;
    }
    // Earned activity badges join the same one-at-a-time sequence before map
    // notices and the reward animation. Keep their acknowledgement separate.
    if (!activityPresentationsReady || (activityBadgeRetryRef.current?.userId === profile.id && activityBadgeRetryRef.current?.blocking === true)) return false;
    const activityBadgeKey = activityBadgesRef.current.find(key => !claimedActivityBadgesRef.current.has(key));
    if (activityBadgeKey) {
      // An unusually late award response must not interrupt an animation the
      // user has already started. Its receipt remains pending for the next Home.
      if (showRootsMan) return false;
      claimedActivityBadgesRef.current.add(activityBadgeKey);
      setPendingActivityBadgeCount(count => Math.max(0, count - 1));
      setBadgePopup({ ...getActivityBadgePopup(activityBadgeKey, lang), activityBadgeKey });
      return true;
    }
    const stage = takeRewardReceipt(candidate => candidate.itemKey === "stage");
    if (stage) {
      const kind = getCurrentRewardMapCycle(stage.days).kind;
      const stageKey = `${kind === "nehemiahWall" ? "nehemiah_stage_shown" : "garden_shown"}_${stage.days}`;
      setGardenPopup({ show: true, type: "garden", badgeIndex: 0, stageKey, receipt: stage });
      return true;
    }
    return false;
  }

  useEffect(() => {
    // A gift push is an explicit one-visit destination. Keep earned receipts
    // unclaimed until the next ordinary Home; progress/reward writes still run.
    if (isGiftNotificationHome || !rewardPresentationsReady || loading || homeLoadFailed || rewardDialogBlocked || showWelcomeBack || !profile || celebration.show || showRootsManPopup || rewardMapNotice || progressUpdateInFlightRef.current) return;
    if (showNextProgressPopup() || badgePopup || gardenPopup.show) return;
    if (!activityPresentationsReady || (activityBadgeRetryRef.current?.userId === profile.id && activityBadgeRetryRef.current?.blocking === true)) return;
    if (showRootsMan && pendingActivityBadgeCount > 0) return;
    const notice = takeRewardReceipt(candidate => candidate.itemKey === "map_start" || candidate.itemKey === "map_complete");
    if (notice) {
      setRewardMapNotice({
        type: notice.itemKey === "map_complete" ? "complete" : "start",
        days: notice.days,
        kind: getCurrentRewardMapCycle(notice.days).kind,
        receipt: notice,
      });
      return;
    }
    const action = takeRewardReceipt(candidate => candidate.itemKey === "action");
    if (action) {
      setActiveActionReceipt(action);
      openRootsManExperience();
      return;
    }
    if (pendingRootsManRef.current) {
      pendingRootsManRef.current = false;
      openRootsManExperience();
    }
  }, [isGiftNotificationHome, rewardPresentationsReady, activityPresentationsReady, activityBadgeRecoveryPending, loading, homeLoadFailed, rewardDialogBlocked, showWelcomeBack, profile, celebration.show, badgePopup, gardenPopup.show, rewardMapNotice, showRootsManPopup, showRootsMan, pendingActivityBadgeCount, rootsManRequestToken]);

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
    acknowledgeObservedPopup(profile?.id, rewardMapNotice?.type === "complete" ? "map_complete" : "map_start");
    const notice = rewardMapNotice;
    acknowledgeRewardReceipt(notice?.receipt);
    setRewardMapNotice(null);

    if (notice?.type === "complete" && notice.kind === "nehemiahWall") {
      // Day 300 uses the approved longer tambourine praise directly on the map.
      setActiveActionReceipt(notice.receipt ?? null);
      setShowRootsMan(true);
      requestAnimationFrame(() => {
        if (treeSectionRef.current) {
          treeSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
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

  function closeProgressBadge(action: "close" | "back" = "close") {
    acknowledgeObservedPopup(profile?.id, "progress_badge", action);
    if (badgePopup?.activityBadgeKey && profile?.id && activityBadgeOwner === profile.id) {
      void acknowledgeActivityBadges(createClient(), profile.id, [badgePopup.activityBadgeKey]);
    }
    acknowledgeRewardReceipt(badgePopup?.receipt);
    if (badgePopup?.badgeKey && badgePopup.receipt) {
      acknowledgePendingAwardedBadge(badgePopup.receipt.userId, badgePopup.receipt.date, badgePopup.badgeKey);
    }
    setBadgePopup(null);
  }

  function closeGardenUpdatePopup() {
    acknowledgeObservedPopup(profile?.id, gardenPopup.type === "badge" ? "garden_badge" : "garden_stage");
    acknowledgeRewardReceipt(gardenPopup.receipt);
    if (gardenPopup.stageKey) storageSet(gardenPopup.stageKey, "true");
    if (gardenPopup.badgeKey && gardenPopup.receipt) {
      acknowledgePendingAwardedBadge(gardenPopup.receipt.userId, gardenPopup.receipt.date, gardenPopup.badgeKey);
    }
    setGardenPopup(previous => ({ ...previous, show: false }));
    gardenTopRef_scroll();
  }

  function closeWelcomeBack(action: "close" | "back" = "close") {
    if (!visibleWelcomeBack) return;
    // A fast dismissal can precede the visibility effect.
    if (welcomeBackStorageKey) storageSet(welcomeBackStorageKey, "true");
    acknowledgeObservedPopup(profile?.id, "welcome_back", action);
    setShowWelcomeBack(false);
  }

  function openRequiredUpdate() {
    if (!requiredUpdatePrompt) return;
    acknowledgeObservedPopup(profile?.id, "required_update", "update");
    markOptionalUpdateSeen(profile?.id, requiredUpdatePrompt);
    const platform = requiredUpdatePrompt.platform;
    if (!requiredUpdatePrompt.mandatory) setRequiredUpdatePrompt(null);
    openRequiredUpdateStore(platform);
  }

  function closeOptionalUpdate() {
    if (!requiredUpdatePrompt || requiredUpdatePrompt.mandatory) return;
    acknowledgeObservedPopup(profile?.id, "required_update", "close");
    markOptionalUpdateSeen(profile?.id, requiredUpdatePrompt);
    setRequiredUpdatePrompt(null);
  }

  function closeOnboarding() {
    acknowledgeObservedPopup(profile?.id, "onboarding", "confirm");
    if (profile?.id) {
      storageSet(getOnboardingDoneKey(profile.id), "true");
    }
    setShowOnboarding(false);
  }

  function closeCelebration() {
    acknowledgeObservedPopup(profile?.id, "celebration");
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

  function homePrayerObservationEvent(observation: HomePrayerObservationAttempt, event: string, phase: string, details: Record<string, string | number | boolean | null> = {}) {
    observe(observation.flow, event, {
      mode: observation.mode,
      source: "home_prayer",
      attempt: observation.attempt,
      phase,
      ...details,
    }, observation.recordId);
  }

  function startHomePrayerObservation(mode: "create" | "quiet", userId: string) {
    const day = getLocalDateString();
    const previous = homePrayerObservationRef.current[mode];
    const retry = previous?.failed === true && previous.flow?.userId === userId && previous.day === day;
    const observation: HomePrayerObservationAttempt = {
      flow: retry ? previous.flow : beginObservation("prayer", userId, { mode, source: "home_prayer" }),
      mode,
      attempt: retry ? previous.attempt + 1 : 1,
      failed: false,
      day,
    };
    homePrayerObservationRef.current[mode] = observation;
    const phase = mode === "quiet" ? "daily_completion" : "body";
    if (retry) homePrayerObservationEvent(observation, "retry_clicked", phase);
    homePrayerObservationEvent(observation, "action_started", phase);
    return observation;
  }

  async function markQuietPrayer() {
    if (!homeDetailsReady.prayer) { void load(); return; }
    if (todayDone.prayer) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const today = getLocalDateString();
    const observation = startHomePrayerObservation("quiet", user.id);
    let persisted = false;
    try {
      const { error } = await supabase.from("daily_prayer_completions").upsert({
        user_id: user.id,
        date: today,
        source: "quiet",
      }, { onConflict: "user_id,date" });
      if (error) {
        observation.failed = true;
        homePrayerObservationEvent(observation, "action_failed", "daily_completion", { ...observationError(error), persisted });
        showToast(t("home_prayer_save_error", lang));
        return;
      }
      persisted = true;
      homePrayerObservationEvent(observation, "stage_succeeded", "daily_completion", { persisted });
      setTodayDone(p => ({ ...p, prayer: true }));
      void refreshHomePrayerStatus();
      enqueueCelebration({
        message: t("home_prayer_quiet_celeb", lang),
        subMessage: t("home_prayer_quiet_celeb_sub", lang),
      });
      homePrayerObservationEvent(observation, "action_completed", "completion", { persisted });
    } catch (error) {
      observation.failed = true;
      homePrayerObservationEvent(observation, "action_failed", "daily_completion", { ...observationError(error), persisted });
      // Preserve the existing rejected promise; monitoring does not change UI handling.
      throw error;
    }
  }

  async function refreshHomePrayerStatus() {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const todayPrayerResponse = await supabase
        .from("daily_prayer_completions")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", getLocalDateString())
        .maybeSingle();
      if (!todayPrayerResponse.error) setTodayDone(previous => ({ ...previous, prayer: !!todayPrayerResponse.data }));
    } catch (error) {
      console.warn("홈 기도 상태를 갱신하지 못했어요:", error);
    }
  }

  function startHomeQT(mode: QTMode, passageSource: "scheduled" | "custom" = "scheduled") {
    if (mode === "6step" && passageSource === "scheduled" && !homeDetailsReady.schedule) { void load(); return; }
    router.push(buildQTWriteHref({
      mode,
      preferredTranslation: homeQTState.preferredTranslation,
      todaySchedule: homeQTState.todaySchedule,
      useTodaySchedule: passageSource === "scheduled",
      sundayContext: mode === "free" && isSunday(),
      entry: "home",
    }));
  }

  function startHomePhotoQT(passageSource: "scheduled" | "custom" = "scheduled") {
    if (passageSource === "scheduled" && !homeDetailsReady.schedule) { void load(); return; }
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
      entry: "home",
    }));
  }

  function closeHomeQTChoicePopup() {
    setShowHomeQTChoice(false);
    setShowHomeSundayQT(false);
    setShowHomeQTPassageChoice(false);
    setShowHomeQTPhotoPassageChoice(false);
    setShowHomeQTGuide(false);
  }

  function openHomeQT() {
    if (homeQTState.hasDraft) {
      setShowHomeQTDraftChoice(true);
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

  function continueHomeQTDraft() {
    if (deletingHomeQTDraftRef.current) return;
    setShowHomeQTDraftChoice(false);
    router.push("/qt/write?resume=true&entry=home");
  }

  async function deleteHomeQTDraftAndStartNew() {
    if (deletingHomeQTDraftRef.current) return;
    deletingHomeQTDraftRef.current = true;
    setDeletingHomeQTDraft(true);

    try {
      const supabase = createClient();
      const user = await getQtDraftSessionUser(supabase);
      if (!user) throw new Error("No authenticated user for QT draft deletion");

      const today = getLocalDateString();
      const { error } = await withQtDraftTimeout(
        supabase
          .from("qt_records")
          .delete()
          .eq("user_id", user.id)
          .eq("date", today)
          .eq("is_draft", true),
        8_000,
        "home delete QT draft",
      );
      if (error) throw error;
      if (!removeQTDraftBackup(user.id, today)) {
        throw new Error("Could not remove the device QT draft backup");
      }

      setHomeQTState(previous => ({ ...previous, hasDraft: false }));
      setShowHomeQTDraftChoice(false);
      setShowHomeQTPassageChoice(false);
      setShowHomeQTPhotoPassageChoice(false);
      setShowHomeQTGuide(false);

      if (isSunday()) {
        setShowHomeQTChoice(false);
        setShowHomeSundayQT(true);
      } else {
        setShowHomeSundayQT(false);
        setShowHomeQTChoice(true);
      }
    } catch (error) {
      console.error("home QT draft delete failed", error);
      showToast(t("qt_error_draft_delete", lang));
    } finally {
      deletingHomeQTDraftRef.current = false;
      setDeletingHomeQTDraft(false);
    }
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

  function returnToHomeQTModeChoice() {
    setShowHomeQTPassageChoice(false);
    setShowHomeQTPhotoPassageChoice(false);
    if (isSunday()) {
      setShowHomeSundayQT(true);
    } else {
      setShowHomeQTChoice(true);
    }
  }

  function startHomeSixStepFromPassageChoice(passageSource: "scheduled" | "custom") {
    setShowHomeQTPassageChoice(false);
    startHomeQT("6step", passageSource);
  }

  function startHomePhotoFromPassageChoice(passageSource: "scheduled" | "custom") {
    startHomePhotoQT(passageSource);
  }

  function openTodayQtRecord() {
    if (completedQtRecordId) {
      router.push(`/qt/record?id=${completedQtRecordId}`);
      return;
    }
    router.push("/qt");
  }

  const rewardCampaignPopupBlocked =
    loading || !rewardPresentationsReady || pendingRewardReceiptCount > 0 ||
    !activityPresentationsReady || activityBadgeRecoveryPending || pendingActivityBadgeCount > 0 ||
    !companionNoticeGateReady ||
    !!companionAcceptanceNotice ||
    handlingCompanionAcceptanceNotice ||
    showFirstLangPicker ||
    showOnboarding ||
    !!effectiveUpdatePrompt ||
    showWelcomeBack ||
    !!badgePopup ||
    celebration.show ||
    gardenPopup.show ||
    !!rewardMapNotice ||
    showRootsManPopup ||
    showAvatarChoiceModal ||
    showLangPicker ||
    showHomeQTDraftChoice ||
    showHomeQTChoice ||
    showHomeQTPassageChoice ||
    showHomeQTPhotoPassageChoice ||
    showHomeQTGuide ||
    showHomeSundayQT ||
    showNotificationSettingsModal ||
    showHomePrayerCards ||
    homeHubOpen;
  const monthlyBadgeAwardPopupBlocked = rewardCampaignPopupBlocked;
  const visibleMonthlyBadgeAward =
    generalHomePopupsAllowed && !!monthlyBadgeAward &&
    !monthlyBadgeAwardPopupBlocked;
  const homePopupBlocked =
    loading || !rewardPresentationsReady || pendingRewardReceiptCount > 0 ||
    !activityPresentationsReady || activityBadgeRecoveryPending || pendingActivityBadgeCount > 0 ||
    !companionNoticeGateReady ||
    !!companionAcceptanceNotice ||
    handlingCompanionAcceptanceNotice ||
    showFirstLangPicker ||
    showOnboarding ||
    !!effectiveUpdatePrompt ||
    showWelcomeBack ||
    !!badgePopup ||
    celebration.show ||
    gardenPopup.show ||
    !!rewardMapNotice ||
    showRootsManPopup ||
    showAvatarChoiceModal ||
    visibleMonthlyBadgeAward ||
    showLangPicker ||
    showHomeQTDraftChoice ||
    showHomeQTChoice ||
    showHomeQTPassageChoice ||
    showHomeQTPhotoPassageChoice ||
    showHomeSundayQT ||
    showNotificationSettingsModal ||
    showHomePrayerCards ||
    homeHubOpen;
  const visibleChallengeReward =
    !generalHomePopupsAllowed || homePopupBlocked || openingChallengeProfile
      ? null
      : challengeRewardQueue[0] ?? null;
  const visibleAvatarChoiceModal = generalHomePopupsAllowed && canShowProgressPopups && showAvatarChoiceModal
    && !celebration.show && !badgePopup && !gardenPopup.show && !rewardMapNotice && !showRootsManPopup
    && !visibleMonthlyBadgeAward;
  const personalCampaignPopupBlocked = homePopupBlocked || homeLoadFailed
    || (generalHomePopupsAllowed && (!!monthlyBadgeAward || challengeRewardQueue.length > 0))
    || openingChallengeProfile || openingPersonalChallengeProfile
    || challengeRewardActionInFlightRef.current || progressUpdateInFlightRef.current
    || pendingRootsManRef.current || showRootsMan;
  const visiblePersonalChallengeReward = !generalHomePopupsAllowed || personalCampaignPopupBlocked
    ? null : personalChallenge.rewards[0] ?? null;
  const visiblePersonalChallengeAnnouncement = generalHomePopupsAllowed && !personalCampaignPopupBlocked
    && personalChallenge.ready && personalChallenge.rewards.length === 0
    && announcementRewardChecksReadyFor === profile?.id
    && personalChallenge.announcementPending;

  function completePersonalChallengeReward(openProfile = false) {
    const reward = visiblePersonalChallengeReward;
    if (!reward) return;
    acknowledgeObservedPopup(profile?.id, "challenge_reward", openProfile ? "profile" : "close");
    personalChallenge.acknowledgeReward(reward);
    if (openProfile) {
      setOpeningPersonalChallengeProfile(true);
      router.push("/profile#special-badges");
    }
  }
  const visibleMessengerShareAnnouncement =
    generalHomePopupsAllowed && messengerShareAnnouncementEligible && messengerShareAnnouncementOwner === profile?.id &&
    showMessengerShareAnnouncement &&
    personalChallenge.ready &&
    announcementRewardChecksReadyFor === profile?.id &&
    !rewardCampaignPopupBlocked &&
    !monthlyBadgeAward && challengeRewardQueue.length === 0 &&
    personalChallenge.rewards.length === 0 && !personalChallenge.announcementPending &&
    !openingChallengeProfile && !challengeRewardActionInFlightRef.current &&
    !progressUpdateInFlightRef.current && !pendingRootsManRef.current && !showRootsMan;


  useAndroidBackHandler(() => {
    if (visibleRequiredUpdatePrompt) {
      if (!visibleRequiredUpdatePrompt.mandatory) closeOptionalUpdate();
      return true;
    }
    if (visibleWelcomeBack) {
      closeWelcomeBack("back");
      return true;
    }
    if (visibleCompanionAcceptanceNotice) {
      void completeCompanionAcceptanceNotice(false);
      return true;
    }
    if (showFirstLangPicker || visibleRootsManPopup) {
      return true;
    }
    if (visibleChallengeReward) {
      if (!challengeRewardActionInFlightRef.current) {
        void completeChallengeReward(false);
      }
      return true;
    }
    if (visibleMonthlyBadgeAward) {
      void completeMonthlyBadgeAward(false);
      return true;
    }
    if (visibleMessengerShareAnnouncement) {
      completeMessengerShareAnnouncement("back");
      return true;
    }
    if (visiblePersonalChallengeReward) {
      completePersonalChallengeReward();
      return true;
    }
    if (visiblePersonalChallengeAnnouncement) {
      personalChallenge.acknowledgeAnnouncement();
      return true;
    }
    if (showHomeRoutine) { setShowHomeRoutine(false); return true; }
    // Let the gratitude dialog consume Back, including while a save is in flight.
    if (showHomeGratitude) return false;
    if (showHomeChallenge) { setShowHomeChallenge(false); return true; }
    if (showNotificationSettingsModal) {
      setShowNotificationSettingsModal(false);
      return true;
    }
    if (visibleAvatarChoiceModal) {
      if (!savingAvatarChoice) setShowAvatarChoiceModal(false);
      return true;
    }
    if (showHomeQTDraftChoice) {
      if (!deletingHomeQTDraft) setShowHomeQTDraftChoice(false);
      return true;
    }
    if (showHomeQTGuide) {
      setShowHomeQTGuide(false);
      return true;
    }
    if (showHomeQTPassageChoice || showHomeQTPhotoPassageChoice) {
      returnToHomeQTModeChoice();
      return true;
    }
    if (showHomeQTChoice || showHomeSundayQT) {
      setShowHomeQTChoice(false);
      setShowHomeSundayQT(false);
      return true;
    }
    if (showLangPicker) {
      setShowLangPicker(false);
      return true;
    }
    if (showOnboarding) {
      // Onboarding owns Android back navigation: previous slide, or stay on
      // the first slide. It must only be completed via its final action.
      return false;
    }
    if (visibleCelebration) {
      closeCelebration();
      return true;
    }
    if (visibleBadgePopup) {
      closeProgressBadge("back");
      return true;
    }
    if (showGardenUpdatePopup) {
      closeGardenUpdatePopup();
      return true;
    }
    if (visibleRewardMapNotice) {
      closeRewardMapNotice();
      return true;
    }
    return false;
  });

  // Keep the first app load free of navigation. Once a tab has been displayed,
  // preserve it in the same sibling position during Home returns and retries.
  if (loading) return (
    <>
      <HomeLoadingScreen lang={lang} christmas={isChristmasLoadingDate(challengeLocalDate)} />
      {hasShownNavigation && <BottomNav lang={lang} />}
    </>
  );

  if (homeLoadFailed || !profile) return (
    <>
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 28, textAlign: "center" }}>
      <img
        src="/roots-logo-transparent-160.png"
        alt="Roots sprout"
        width={82}
        height={82}
        style={{ objectFit: "contain" }}
      />
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 850, color: "var(--text)", marginBottom: 8 }}>{HOME_LOCAL_TEXT[lang].profileLoadFailed}</h1>
        <p style={{ maxWidth: 320, fontSize: 13, color: "var(--text3)", lineHeight: 1.65 }}>{t("network_error_retry", lang)}</p>
      </div>
      <button
        type="button"
        onClick={() => void load()}
        style={{ minWidth: 140, minHeight: 44, padding: "10px 18px", border: "none", borderRadius: 14, background: "var(--sage)", color: "var(--bg)", fontSize: 13, fontWeight: 850, cursor: "pointer" }}
      >
        {HOME_LOCAL_TEXT[lang].retry}
      </button>
    </div>
    {hasShownNavigation && <BottomNav lang={lang} />}
    </>
  );

  return (
    <>
    <div className="page roots-home-phase1">
      {toast && (
        <div className="roots-elevation-toast" style={{ position: "fixed", top: "calc(18px + var(--safe-area-top))", left: "50%", transform: "translateX(-50%)", zIndex: 300, background: "var(--surface-card)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 999, padding: "10px 16px", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", maxWidth: "calc(100vw - 32px)", overflow: "hidden", textOverflow: "ellipsis" }}>
          {toast}
        </div>
      )}

      <ObservationPopup userId={profile?.id} kind="qt_draft_choice" queued={showHomeQTDraftChoice}>
      {showHomeQTDraftChoice && (
        <HomeQTDraftChoice
          lang={lang}
          deleting={deletingHomeQTDraft}
          onContinue={continueHomeQTDraft}
          onStartNew={() => { void deleteHomeQTDraftAndStartNew(); }}
          onClose={() => { if (!deletingHomeQTDraft) setShowHomeQTDraftChoice(false); }}
        />
      )}
      </ObservationPopup>

      <ObservationPopup userId={profile?.id} kind="qt_choice" queued={showHomeQTChoice || showHomeSundayQT || showHomeQTPassageChoice || showHomeQTPhotoPassageChoice}>
      {(showHomeQTChoice || showHomeSundayQT || showHomeQTPassageChoice || showHomeQTPhotoPassageChoice) && (
        <div
          ref={homeQTDialogRef}
          onTouchMove={event => event.stopPropagation()}
          onPointerDown={(event) => {
            homeQTBackdropTapStart.current = event.isPrimary && event.button === 0 && event.target === event.currentTarget
              ? { x: event.clientX, y: event.clientY }
              : null;
          }}
          onPointerCancel={() => { homeQTBackdropTapStart.current = null; }}
          onClick={(event) => {
            const start = homeQTBackdropTapStart.current;
            homeQTBackdropTapStart.current = null;
            if (
              !start ||
              event.target !== event.currentTarget ||
              Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10 ||
              document.elementFromPoint(event.clientX, event.clientY) !== event.currentTarget
            ) return;
            closeHomeQTChoicePopup();
          }}
          style={{ position: "fixed", insetInline: 0, top: "var(--prayer-visible-top, 0px)", height: "var(--prayer-visible-height, 100vh)", boxSizing: "border-box", zIndex: 120, background: "var(--overlay-sheet)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 16, overscrollBehavior: "none" }}
        >
          <div className="roots-elevation-sheet" style={{ width: "100%", maxWidth: 420, maxHeight: "100%", overflowY: "auto", overscrollBehavior: "contain", touchAction: "pan-y", background: "var(--surface-card)", border: "1px solid var(--border)", borderRadius: 24, padding: 18, position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10, paddingRight: 42 }}>
              <div style={{ width: "100%", minWidth: 0 }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", lineHeight: 1.35, marginBottom: 6, overflowWrap: "break-word" }}>
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
                onClick={closeHomeQTChoicePopup}
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
                <button onClick={returnToHomeQTModeChoice} style={{ background: "none", border: "none", color: "var(--text3)", fontSize: 13, fontWeight: 700, padding: "6px 0", cursor: "pointer", textAlign: "center" }}>
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
      </ObservationPopup>

      <ObservationPopup userId={profile?.id} kind="prayer_cards" queued={showHomePrayerCards}>
      {showHomePrayerCards && (
        <Suspense fallback={<PrayerCardsLoading lang={lang} onClose={() => setShowHomePrayerCards(false)} />}>
          <PrayerExperience
            variant="popup"
            lang={lang}
            snapshotRef={homePrayerSnapshotRef}
            initialProfile={profile ? { id: profile.id, name: profile.name ?? null, avatar_url: profile.avatar_url ?? null } : null}
            onClose={() => setShowHomePrayerCards(false)}
            dailyPrayerDone={todayDone.prayer}
            onCompleteDailyPrayer={markQuietPrayer}
            onDataChanged={() => { void refreshHomePrayerStatus(); }}
          />
        </Suspense>
      )}
      </ObservationPopup>

      <ObservationPopup userId={profile?.id} kind="language_picker" queued={showFirstLangPicker}>
      {showFirstLangPicker && (
        <LanguagePicker onSelect={async (l) => {
          await setPreferredLang(l);
          acknowledgeObservedPopup(profile?.id, "language_picker", "select");
          setShowFirstLangPicker(false);
        }} />
      )}
      </ObservationPopup>

      <ObservationPopup userId={profile?.id} kind="onboarding" queued={showOnboarding}>
      {showOnboarding && <Onboarding onClose={closeOnboarding} />}
      </ObservationPopup>

      <ObservationPopup userId={profile?.id} kind="required_update" queued={!!requiredUpdatePrompt}>
      {visibleRequiredUpdatePrompt && (
        <RequiredUpdatePopup
          platform={visibleRequiredUpdatePrompt.platform}
          mandatory={visibleRequiredUpdatePrompt.mandatory}
          campaignId={visibleRequiredUpdatePrompt.campaignId}
          onUpdate={openRequiredUpdate}
          onClose={closeOptionalUpdate}
        />
      )}
      </ObservationPopup>

      <HomeHubDialog open={showHomeRoutine && !visibleRequiredUpdatePrompt}
        title={dashboardText.routineTitle} closeLabel={dashboardText.close} hideTitle
        anchorRef={homeRoutineButtonRef}
        onClose={() => setShowHomeRoutine(false)}>
        <HomeRoutineActions
          lang={lang}
          qtDone={todayDone.qt}
          prayerDone={todayDone.prayer}
          prayerReady={homeDetailsReady.prayer}
          onReflection={() => { setShowHomeRoutine(false); todayDone.qt ? openTodayQtRecord() : openHomeQT(); }}
          onPrayer={() => { setShowHomeRoutine(false); setShowHomePrayerCards(true); }}
        />
      </HomeHubDialog>
      <HomeHubDialog open={showHomeChallenge && !personalChallengeDetails && !visibleRequiredUpdatePrompt}
        title={dashboardText.challengeTitle} closeLabel={dashboardText.close}
        onClose={() => setShowHomeChallenge(false)}>
        <p style={{ margin: "8px 0 16px", lineHeight: 1.65, color: "var(--text2)" }} role="status">
          {personalChallenge.loading ? dashboardText.loading : personalChallenge.error ? dashboardText.challengeLoadError : dashboardText.noChallenge}
        </p>
        {personalChallenge.error && <button type="button" className="btn-sage" onClick={personalChallenge.retry}>{dashboardText.retry}</button>}
      </HomeHubDialog>
      {profile?.id && (
        <HomeGratitudeDialog key={profile.id} userId={profile.id} lang={lang}
          open={showHomeGratitude && !visibleRequiredUpdatePrompt}
          onClose={() => setShowHomeGratitude(false)} />
      )}

      <PersonalReflectionChallengePopup
        show={!!personalChallengeDetails && !visibleRequiredUpdatePrompt && !showFirstLangPicker && !showOnboarding}
        mode="details"
        lang={lang}
        earned={personalChallengeDetails?.awarded === true || personalChallengeDetails?.isComplete === true}
        completedDays={personalChallengeDetails?.completedDays}
        failed={personalChallengeDetails?.hasMissedDay}
        period={challengePeriod}
        title={personalChallengeDetails && personalChallengeDetails.challengeId !== NOVEMBER_PERSONAL_CHALLENGE_ID ? personalChallengeDetails.title : undefined}
        requiredDays={personalChallengeDetails?.requiredDays}
        rewardHearts={personalChallengeDetails?.rewardHearts}
        badgeImagePath={personalChallengeDetails?.badgeImagePath}
        onClose={() => setShowHomeChallenge(false)}
      />
      <PersonalReflectionChallengePopup
        show={visiblePersonalChallengeAnnouncement}
        mode="announcement"
        lang={lang}
        requiredDays={personalChallenge.status?.requiredDays}
        rewardHearts={personalChallenge.status?.rewardHearts}
        badgeImagePath={personalChallenge.status?.badgeImagePath}
        onClose={personalChallenge.acknowledgeAnnouncement}
      />
      <PersonalReflectionChallengePopup
        show={!!visiblePersonalChallengeReward}
        mode="reward"
        lang={lang}
        rewardObservation={{ userId: profile?.id, queued: personalChallenge.rewards.length > 0, instanceKey: personalChallenge.rewards[0]?.awardId }}
        rewardHearts={visiblePersonalChallengeReward?.rewardHearts}
        badgeImagePath={visiblePersonalChallengeReward?.badgeImagePath}
        onClose={() => completePersonalChallengeReward()}
        onViewBadge={() => completePersonalChallengeReward(true)}
      />

      {homePopupsReady && (
        <Suspense fallback={null}>
          <HomeHeartShopGift key={`${profile.id}:${homeEntry?.giftIntent?.token ?? "general"}`} userId={profile.id} lang={lang}
            targetGiftId={isGiftNotificationHome ? homeEntry?.giftIntent?.giftId : undefined}
            eligible={isGiftNotificationHome
              ? !homeDialogBlocked && !effectiveUpdatePrompt
              : generalHomePopupsAllowed && !personalCampaignPopupBlocked && personalChallenge.ready
              && announcementRewardChecksReadyFor === profile.id
              && !visiblePersonalChallengeReward && !visiblePersonalChallengeAnnouncement
              && !visibleMessengerShareAnnouncement} />
        </Suspense>
      )}

      <ObservationPopup userId={profile?.id} kind="messenger_share_announcement" queued={showMessengerShareAnnouncement}>
      <MessengerShareAnnouncementPopup
        show={visibleMessengerShareAnnouncement}
        onConfirm={() => completeMessengerShareAnnouncement("confirm")}
        onClose={() => completeMessengerShareAnnouncement("close")}
      />
      </ObservationPopup>

      <ObservationPopup userId={profile?.id} kind="monthly_badge" queued={!!monthlyBadgeAward} instanceKey={monthlyBadgeAward}>
      <MonthlyBadgeAwardPopup
        badge={monthlyBadgeAward}
        show={visibleMonthlyBadgeAward}
        onConfirm={() => {
          void completeMonthlyBadgeAward(true);
        }}
        onClose={() => {
          void completeMonthlyBadgeAward(false);
        }}
      />
      </ObservationPopup>

      <ObservationPopup userId={profile?.id} kind="challenge_reward" queued={challengeRewardQueue.length > 0} instanceKey={challengeRewardQueue[0]?.awardId}>
      <ChallengeRewardPopup
        reward={visibleChallengeReward}
        onDismiss={() => {
          void completeChallengeReward(false);
        }}
        onConfirm={() => {
          void completeChallengeReward(true);
        }}
      />
      </ObservationPopup>

      <ObservationPopup userId={profile?.id} kind="welcome_back" queued={showWelcomeBack}>
      <WelcomeBackPopup
        show={visibleWelcomeBack}
        daysSince={welcomeBackDays}
        onClose={() => closeWelcomeBack()}
      />
      </ObservationPopup>

      <ObservationPopup
        userId={profile?.id}
        kind="companion_accepted"
        queued={!!companionAcceptanceNotice}
        instanceKey={companionAcceptanceNotice?.ids.join(":") ?? null}
      >
      <CompanionAcceptedPopup
        show={visibleCompanionAcceptanceNotice}
        name={companionAcceptanceNotice?.primaryName ?? null}
        additionalCount={companionAcceptanceNotice?.additionalCount ?? 0}
        busy={handlingCompanionAcceptanceNotice}
        onViewCompanions={() => {
          void completeCompanionAcceptanceNotice(true);
        }}
        onClose={() => {
          void completeCompanionAcceptanceNotice(false);
        }}
      />
      </ObservationPopup>

      <ObservationPopup userId={profile?.id} kind="progress_badge" queued={!!badgePopup} instanceKey={badgePopup} progressDays={badgePopup?.receipt?.days ?? profile?.streak_days}>
      {visibleBadgePopup && (
        <div onClick={() => closeProgressBadge()} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(26,28,30,0.92)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 28px" }}>
          <ConfettiBurst variant="fixed" zIndex={201} />
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg2)", borderRadius: 28, border: "1px solid rgba(232,197,71,0.4)", width: "100%", maxWidth: 340, padding: "32px 24px 28px", textAlign: "center" }}>
            <div style={{ width: 120, height: 120, margin: "0 auto 16px" }}>
              <img src={visibleBadgePopup.img} alt={visibleBadgePopup.title} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "rgba(232,197,71,0.95)", marginBottom: 10, lineHeight: 1.3 }}>{visibleBadgePopup.title}</h2>
            <div style={{ padding: "14px 16px", background: "rgba(232,197,71,0.08)", borderRadius: 14, border: "1px solid rgba(232,197,71,0.25)", marginBottom: 20 }}>
              <p style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.7 }}>{visibleBadgePopup.msg}</p>
            </div>
            <button onClick={() => closeProgressBadge()} style={{ width: "100%", padding: "13px", background: "rgba(232,197,71,0.9)", color: "#1a1c1e", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              {t("home_badge_thanks", lang)}
            </button>
          </div>
        </div>
      )}
      </ObservationPopup>

      <ObservationPopup userId={profile?.id} kind="celebration" queued={celebration.show} instanceKey={celebration} progressDays={profile?.streak_days}>
      <Celebration
        show={visibleCelebration}
        message={celebration.message}
        subMessage={celebration.subMessage}
        iconSrc="/icon-qt.webp"
        iconAlt={t("qt_complete_title", lang)}
        zIndex={showHomePrayerCards ? 220 : undefined}
        onClose={closeCelebration}
      />
      </ObservationPopup>


      <ObservationPopup userId={profile?.id} kind="notification_settings" queued={showNotificationSettingsModal}>
      {showNotificationSettingsModal && (
        <NotificationSettingsModal
          onClose={() => setShowNotificationSettingsModal(false)}
          onSaved={(message) => showToast(message)}
        />
      )}
      </ObservationPopup>

      <ObservationPopup userId={profile?.id} kind="avatar_choice" queued={showAvatarChoiceModal}>
      <AvatarChoiceModal
        show={visibleAvatarChoiceModal}
        selectedAvatar={currentAvatarType}
        saving={savingAvatarChoice}
        onSelect={(avatarType) => void saveAvatarChoice(avatarType)}
        onLater={() => void saveAvatarChoice("rootsman")}
      />
      </ObservationPopup>

      <ObservationPopup userId={profile?.id} kind={rewardMapNotice?.type === "complete" ? "map_complete" : "map_start"} queued={!!rewardMapNotice} instanceKey={rewardMapNotice} progressDays={rewardMapNotice?.days}>
      <RewardMapNoticePopup notice={visibleRewardMapNotice} onClose={closeRewardMapNotice} avatarType={currentAvatarType} />
      </ObservationPopup>

      <ObservationPopup userId={profile?.id} kind="character_reward" queued={showRootsManPopup || pendingRootsManRef.current} progressDays={rewardActionDisplayDays}>
      <RootsManPopup
        show={visibleRootsManPopup}
        streakDays={rewardActionDisplayDays}
        avatarType={currentAvatarType}
        onGoGarden={() => {
          acknowledgeObservedPopup(profile?.id, "character_reward", "confirm");
          acknowledgePostReflectionReward();
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
      </ObservationPopup>

      <ObservationPopup userId={profile?.id} kind={gardenPopup.type === "badge" ? "garden_badge" : "garden_stage"} queued={gardenPopup.show} instanceKey={gardenPopup} progressDays={gardenPopup.receipt?.days ?? rewardMapDisplayDays}>
      <GardenUpdatePopup
        show={showGardenUpdatePopup}
        type={gardenPopup.type}
        streakDays={gardenPopup.receipt?.days ?? rewardMapDisplayDays}
        badgeIndex={gardenPopup.badgeIndex}
        onClose={closeGardenUpdatePopup}
      />
      </ObservationPopup>

      <HomeHeader
        userId={profile?.id}
        lang={lang}
        menu={showLangPicker ? "language" : null}
        onMenuChange={menu => {
          setShowLangPicker(menu === "language");
        }}
        onLanguageChange={async nextLang => {
          setShowLangPicker(false);
          await setPreferredLang(nextLang);
        }}
      >
            {(() => {
              const name = profile?.name ?? t("profile_default_name", lang);
              const nehemiahCopy = currentRewardMapKind === "nehemiahWall" ? getNehemiahWallCopy(lang) : null;
              const full = nehemiahCopy
                ? nehemiahCopy.title(name)
                : t(getRewardMapTitleKey(currentRewardMapKind), lang, { name });
              const emWord = nehemiahCopy?.keyword ?? t(getRewardMapKeywordKey(currentRewardMapKind), lang);
              const idx = full.lastIndexOf(emWord);
              if (idx === -1) return full;
              return <>{full.slice(0, idx)}<em>{emWord}</em>{full.slice(idx + emWord.length)}</>;
            })()}
      </HomeHeader>

      <div ref={treeSectionRef}>
        <TreeGrowth
          days={showRootsMan ? rewardActionDisplayDays : rewardMapDisplayDays}
          lastCheckin={profile?.last_checkin ?? null}
          showRootsMan={showRootsMan}
          ownerName={profile?.name ?? t("profile_default_name", lang)}
          onActiveCycleChange={(cycle: RewardMapCycle) => setActiveRewardMapKind(cycle.kind)}
          avatarType={currentAvatarType}
          heartShopItemIds={enabledHeartShopItemIds}
        />
      </div>

      <HomeDashboardCards
        lang={lang}
        routineButtonRef={homeRoutineButtonRef}
        routineOpen={showHomeRoutine && !visibleRequiredUpdatePrompt}
        routineCompleted={Number(todayDone.qt) + Number(todayDone.prayer)}
        challenge={currentHomeChallenge}
        challengeLoading={personalChallenge.loading}
        challengeError={personalChallenge.error}
        onOpenRoutine={() => setShowHomeRoutine(true)}
        onOpenChallenge={() => setShowHomeChallenge(true)}
        onOpenGratitude={() => setShowHomeGratitude(true)}
        character={(
          <button
            type="button"
            onClick={() => router.push("/profile")}
            aria-label={t("home_character_customize", lang)}
            style={{
              minWidth: 0,
              padding: 0,
              border: "none",
              background: "transparent",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <HomeCharacterPreview
              ownerId={profile.id}
              avatarType={currentAvatarType}
              alt={getRootsAvatarLabel(currentAvatarType, lang)}
              layers={homeProfileCharacterLayers}
              itemsReady={homeCharacterItemsOwner === profile.id}
              lang={lang}
            />
            <span
              style={{
                marginTop: 3,
                color: "var(--text3)",
                fontSize: 9,
                fontWeight: 800,
                lineHeight: 1.2,
                textAlign: "center",
                wordBreak: "keep-all",
              }}
            >
              {t("home_character_customize", lang)} ›
            </span>
          </button>
        )}
      />
      <div style={{ padding: "0 16px 14px" }}>
        {pendingCompanionRequestCount > 0 && (
          <div
            className="roots-elevation-card-gold"
            style={{
              position: "relative",
              borderRadius: 20,
              padding: "18px 18px",
              marginTop: 10,
              minHeight: 104,
              border: "1px solid var(--border-gold-soft)",
              background: "var(--surface-gold-subtle)",
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
                color: "var(--text-gold-strong)",
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button
            type="button"
            onClick={() => setShowNotificationSettingsModal(true)}
            className="roots-elevation-card-gold"
            style={{
              minHeight: 42,
              borderRadius: 14,
              padding: "9px 10px",
              background: "var(--surface-gold-subtle)",
              border: "1px solid var(--border-gold-soft)",
              color: "var(--text-gold-strong)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              fontSize: 12,
              fontWeight: 850,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <Bell size={14} strokeWidth={2.4} />
            <span>{t("home_shortcut_notifications", lang)}</span>
          </button>
          <button
            type="button"
            onClick={() => router.push("/companions")}
            className="roots-elevation-card-gold"
            style={{
              minHeight: 42,
              borderRadius: 14,
              padding: "9px 10px",
              background: "var(--surface-gold-subtle)",
              border: "1px solid var(--border-gold-soft)",
              color: "var(--text-gold-strong)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              fontSize: 12,
              fontWeight: 850,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <Users size={14} strokeWidth={2.4} />
            <span>{t("home_shortcut_companions", lang)}</span>
          </button>
        </div>
      </div>
    </div>
    <BottomNav lang={lang} />
    </>
  );
}

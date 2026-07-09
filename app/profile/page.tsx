"use client";
import { useEffect, useState, useRef, type TouchEvent, type WheelEvent } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { Camera as NativeCamera, CameraResultType, CameraSource } from "@capacitor/camera";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase";
import { useLang } from "@/lib/useLang";
import { t, type TKey } from "@/lib/i18n";
import { getGroupChallengeBadgeImageSrc } from "@/lib/groupChallengeBadges";
import { getCompanionChallengeBadgeImageSrc } from "@/lib/companionChallenges";
import { getCompanionChallengeText } from "@/lib/companionChallengeText";
import { shareInvite as shareInviteContent } from "@/lib/nativeShare";
import NotificationSettingsModal from "@/components/NotificationSettingsModal";
import AvatarChoiceModal from "@/components/AvatarChoiceModal";
import { disableCurrentUserPushTokens } from "@/lib/notifications/pushTokens";
import { NEW_REWARD_BADGES, repairNewRewardBadges } from "@/lib/rewardBadges";
import { getLoveHeartBalance } from "@/lib/loveHearts";
import { getRootsAvatarChoiceText, getRootsAvatarImageSrc, getRootsAvatarLabel, normalizeRootsAvatarType, type RootsAvatarType } from "@/lib/avatar";
import { Loader2, Check, X, Camera, Share2, Settings, Bell, Users } from "lucide-react";

const ROOTS_WEB_ORIGIN = "https://www.christian-roots.com";
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

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

type QtRecord = { date: string };

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isSameCalendarMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

const FAITH_BADGES = [
  { key: "badge_rootsman", img: "/badge_rootsman.webp", titleKey: "badge_rootsman_title", descKey: "badge_rootsman_desc" },
  { key: "badge_mose", img: "/badge_mose.webp", titleKey: "badge_mose_title", descKey: "badge_mose_desc" },
  { key: "badge_rootsman_bible", img: "/badge_rootsman_bible.webp", titleKey: "badge_rootsman_bible_title", descKey: "badge_rootsman_bible_desc" },
  { key: "badge_david", img: "/badge_david.webp", titleKey: "badge_david_title", descKey: "badge_david_desc" },
  { key: "badge_noah", img: "/badge_noah.webp", titleKey: "badge_noah_title", descKey: "badge_noah_desc" },
  { key: "badge_joseph", img: "/badge_joseph.webp", titleKey: "badge_joseph_title", descKey: "badge_joseph_desc" },
  { key: "badge_prayer_ember", img: "/badge_rootswoman_fire.webp", titleKey: "badge_prayer_ember_title", descKey: "badge_prayer_ember_desc" },
  { key: "badge_prayer_warrior", img: "/prayer_warrior.webp", titleKey: "badge_prayer_warrior_title", descKey: "badge_prayer_warrior_desc" },
  { key: "badge_paul", img: "/badge_paul.webp", titleKey: "badge_paul_title", descKey: "badge_paul_desc" },
  { key: "badge_peter", img: "/badge_peter.webp", titleKey: "badge_peter_title", descKey: "badge_peter_desc" },
  { key: "badge_roots_together", img: "/badge_roots_together.webp", titleKey: "badge_roots_together_title", descKey: "badge_roots_together_desc" },
  { key: "badge_qt_bird", img: "/qt_bird.webp", titleKey: "badge_qt_bird_title", descKey: "badge_qt_bird_desc" },
  { key: "badge_word_peace", img: "/badge_rootswoman_rest.webp", titleKey: "badge_word_peace_title", descKey: "badge_word_peace_desc" },
  { key: "badge_angel", img: "/angel.webp", titleKey: "badge_angel_title", descKey: "badge_angel_desc" },
  ...NEW_REWARD_BADGES,
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

type FaithBadge = (typeof FAITH_BADGES)[number];
type SpiritFruitBadge = (typeof SPIRIT_FRUIT_BADGES)[number];

type GroupChallengeProfileBadge = {
  id: string;
  challengeId: string;
  groupId: string;
  title: string;
  groupName: string;
  badgeName: string;
  badgeImagePath: string | null;
  awardedAt: string;
};

type CompanionChallengeProfileBadge = {
  id: string;
  challengeId: string;
  companionUserId: string | null;
  title: string;
  companionName: string;
  badgeName: string;
  badgeImagePath: string | null;
  heartsAwarded: number;
  awardedAt: string;
};

type SpecialProfileBadge =
  | {
      kind: "group";
      id: string;
      title: string;
      subtitle: string;
      badgeName: string;
      badgeImagePath: string | null;
      badge: GroupChallengeProfileBadge;
      awardedAt: string;
    }
  | {
      kind: "companion";
      id: string;
      title: string;
      subtitle: string;
      badgeName: string;
      badgeImagePath: string | null;
      badge: CompanionChallengeProfileBadge;
      awardedAt: string;
    };

function getGroupChallengeBadgeImg(path?: string | null) {
  return getGroupChallengeBadgeImageSrc(path) ?? "/badge_roots_together.webp";
}

function getCompanionChallengeBadgeImg(path?: string | null) {
  return getCompanionChallengeBadgeImageSrc(path);
}

function getSpiritFruitBadgeImg(name: string) {
  return `/badge_${name.toLowerCase().replace("-", "_")}.webp`;
}

export default function ProfilePage() {
  const router = useRouter();
  const lang = useLang();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [resettingPhoto, setResettingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [qtRecords, setQtRecords] = useState<QtRecord[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(() => getMonthStart(new Date()));
  const [profileUserId, setProfileUserId] = useState("");
  const [loadingQtCalendar, setLoadingQtCalendar] = useState(false);
  const [prayerStats, setPrayerStats] = useState({ total: 0, answered: 0, shared: 0 });
  const [qtShareCount, setQtShareCount] = useState(0);
  const [loveHeartBalance, setLoveHeartBalance] = useState(0);
  const [showAvatarChoiceModal, setShowAvatarChoiceModal] = useState(false);
  const [savingAvatarChoice, setSavingAvatarChoice] = useState(false);
  const [prayerSharedCount, setPrayerSharedCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const [userEmail, setUserEmail] = useState("");
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNotificationSettingsModal, setShowNotificationSettingsModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<null | { img?: string; title: string; desc: string; earned: boolean }>(null);
  const [showBadgeGallery, setShowBadgeGallery] = useState(false);
  const [showGroupChallengeBadgeGallery, setShowGroupChallengeBadgeGallery] = useState(false);
  const [groupChallengeBadges, setGroupChallengeBadges] = useState<GroupChallengeProfileBadge[]>([]);
  const [selectedGroupChallengeBadge, setSelectedGroupChallengeBadge] = useState<GroupChallengeProfileBadge | null>(null);
  const [companionChallengeBadges, setCompanionChallengeBadges] = useState<CompanionChallengeProfileBadge[]>([]);
  const [selectedCompanionChallengeBadge, setSelectedCompanionChallengeBadge] = useState<CompanionChallengeProfileBadge | null>(null);
  const calendarTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const calendarWheelLockRef = useRef(0);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash !== "#special-badges" && hash !== "#group-challenge-badges" && hash !== "#companion-challenge-badges") return;
    const hasRows = groupChallengeBadges.length > 0 || companionChallengeBadges.length > 0;
    const timer = window.setTimeout(() => {
      document.getElementById("special-badges")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, hasRows ? 260 : 700);
    return () => window.clearTimeout(timer);
  }, [groupChallengeBadges.length, companionChallengeBadges.length]);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/welcome"); return; }
    setUserEmail(user.email ?? "");
    setProfileUserId(user.id);
    try {
      setLoveHeartBalance(await getLoveHeartBalance(supabase, user.id));
    } catch (error) {
      console.warn("사랑 하트 조회 실패:", error);
      setLoveHeartBalance(0);
    }
    const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (p) {
      // avatar_url 캐시 방지: 타임스탬프가 없으면 추가
      if (p.avatar_url && !p.avatar_url.includes("?t=")) {
        p.avatar_url = `${p.avatar_url}?t=${Date.now()}`;
      }
      setProfile(p);
      setNewName(p.name ?? "");
    }
    await loadQtRecordsForMonth(user.id, calendarMonth);
    await loadGroupChallengeBadgesForProfile(user.id);
    await loadCompanionChallengeBadgesForProfile(user.id);
    const { data: prayers } = await supabase.from("prayer_items").select("is_answered,visibility").eq("user_id", user.id);
    let prayerSharedCnt = 0;
    if (prayers) {
      prayerSharedCnt = prayers.filter((p: any) => p.visibility && p.visibility !== "private").length;
      setPrayerStats({
        total: prayers.length,
        answered: prayers.filter((p: any) => p.is_answered).length,
        shared: prayerSharedCnt,
      });
      setPrayerSharedCount(prayerSharedCnt);
    }

    // 큐티 나눔 횟수
    // visibility가 private인 기록은 실제 나눔이 아니므로 제외합니다.
    const { data: qtShares } = await supabase.from("qt_records")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_draft", false)
      .not("visibility", "is", null)
      .neq("visibility", "private")
      .neq("visibility", "");
    const qtShareCnt = qtShares?.length ?? 0;
    setQtShareCount(qtShareCnt);

    const { data: groupMemberships } = await supabase.from("group_members")
      .select("group_id")
      .eq("user_id", user.id);
    const groupParticipationCount = new Set((groupMemberships ?? []).map((row: any) => row.group_id).filter(Boolean)).size;

    // 기존 기록이 이미 조건을 채웠는데 배지 컬럼만 false인 경우를 보정합니다.
    if (p) {
      const badgeUpdates: Record<string, boolean> = {};
      if (!p.badge_joseph && qtShareCnt >= 1) badgeUpdates.badge_joseph = true;
      if (!p.badge_qt_bird && qtShareCnt >= 30) badgeUpdates.badge_qt_bird = true;
      if (!p.badge_word_peace && qtShareCnt >= 50) badgeUpdates.badge_word_peace = true;
      if (!p.badge_prayer_ember && prayerSharedCnt >= 7) badgeUpdates.badge_prayer_ember = true;
      if (!p.badge_prayer_warrior && prayerSharedCnt >= 15) badgeUpdates.badge_prayer_warrior = true;
      if (!p.badge_roots_together && groupParticipationCount >= 5) badgeUpdates.badge_roots_together = true;
      if (Object.keys(badgeUpdates).length > 0) {
        const { error: badgeError } = await supabase.from("profiles").update(badgeUpdates).eq("id", user.id);
        if (!badgeError) {
          setProfile((current: any) => ({ ...(current ?? p), ...badgeUpdates }));
        }
      }

      try {
        const newRewardBadgeUpdates = await repairNewRewardBadges(supabase, user.id);
        if (Object.keys(newRewardBadgeUpdates).length > 0) {
          setProfile((current: any) => ({ ...(current ?? p), ...newRewardBadgeUpdates }));
        }
      } catch (error) {
        console.warn("새 보상 배지 보정 실패:", error);
      }
    }

    setLoading(false);
  }

  async function loadGroupChallengeBadgesForProfile(userId: string) {
    const supabase = createClient();
    const { data: awards, error } = await supabase.from("group_challenge_awards")
      .select("id, challenge_id, group_id, badge_name, badge_description, badge_image_path, awarded_at")
      .eq("user_id", userId)
      .order("awarded_at", { ascending: false });

    if (error) {
      console.warn("그룹 챌린지 배지 조회 실패:", error);
      setGroupChallengeBadges([]);
      return;
    }

    const awardRows = (awards ?? []) as any[];
    if (awardRows.length === 0) {
      setGroupChallengeBadges([]);
      return;
    }

    const challengeIds = Array.from(new Set(awardRows.map(row => row.challenge_id).filter(Boolean)));
    const groupIds = Array.from(new Set(awardRows.map(row => row.group_id).filter(Boolean)));

    let challengeRows: any[] = [];
    if (challengeIds.length > 0) {
      const { data, error: challengeError } = await supabase.from("group_challenges")
        .select("id,title")
        .in("id", challengeIds);
      if (challengeError) {
        console.warn("그룹 챌린지 제목 조회 실패:", challengeError);
      } else {
        challengeRows = data ?? [];
      }
    }

    let groupRows: any[] = [];
    if (groupIds.length > 0) {
      const { data, error: groupError } = await supabase.from("groups")
        .select("id,name")
        .in("id", groupIds);
      if (groupError) {
        console.warn("그룹 챌린지 그룹명 조회 실패:", groupError);
      } else {
        groupRows = data ?? [];
      }
    }

    const challengeTitleMap = new Map(challengeRows.map(row => [row.id, row.title]));
    const groupNameMap = new Map(groupRows.map(row => [row.id, row.name]));

    setGroupChallengeBadges(awardRows.map(row => ({
      id: row.id,
      challengeId: row.challenge_id,
      groupId: row.group_id,
      title: challengeTitleMap.get(row.challenge_id) || row.badge_name || t("group_challenge_card_title", lang),
      groupName: groupNameMap.get(row.group_id) || t("community_unknown", lang),
      badgeName: row.badge_name || "",
      badgeImagePath: row.badge_image_path ?? null,
      awardedAt: row.awarded_at,
    })));
  }

  async function loadCompanionChallengeBadgesForProfile(userId: string) {
    const supabase = createClient();
    const { data: awards, error } = await supabase.from("companion_challenge_awards")
      .select("id, challenge_id, companion_user_id, badge_name, badge_description, badge_image_path, hearts_awarded, awarded_at")
      .eq("user_id", userId)
      .order("awarded_at", { ascending: false });

    if (error) {
      console.warn("동역자 챌린지 배지 조회 실패:", error);
      setCompanionChallengeBadges([]);
      return;
    }

    const awardRows = (awards ?? []) as any[];
    if (awardRows.length === 0) {
      setCompanionChallengeBadges([]);
      return;
    }

    const challengeIds = Array.from(new Set(awardRows.map(row => row.challenge_id).filter(Boolean)));
    const companionUserIds = Array.from(new Set(awardRows.map(row => row.companion_user_id).filter(Boolean)));

    let challengeRows: any[] = [];
    if (challengeIds.length > 0) {
      const { data, error: challengeError } = await supabase.from("companion_challenges")
        .select("id,title")
        .in("id", challengeIds);
      if (challengeError) {
        console.warn("동역자 챌린지 제목 조회 실패:", challengeError);
      } else {
        challengeRows = data ?? [];
      }
    }

    let companionRows: any[] = [];
    if (companionUserIds.length > 0) {
      const { data, error: companionError } = await supabase.from("profiles")
        .select("id,name")
        .in("id", companionUserIds);
      if (companionError) {
        console.warn("동역자 챌린지 동역자 이름 조회 실패:", companionError);
      } else {
        companionRows = data ?? [];
      }
    }

    const challengeTitleMap = new Map(challengeRows.map(row => [row.id, row.title]));
    const companionNameMap = new Map(companionRows.map(row => [row.id, row.name]));
    const text = getCompanionChallengeText(lang);

    setCompanionChallengeBadges(awardRows.map(row => ({
      id: row.id,
      challengeId: row.challenge_id,
      companionUserId: row.companion_user_id ?? null,
      title: challengeTitleMap.get(row.challenge_id) || row.badge_name || text.sectionTitle,
      companionName: row.companion_user_id ? (companionNameMap.get(row.companion_user_id) || t("profile_default_name", lang)) : t("profile_default_name", lang),
      badgeName: row.badge_name || "",
      badgeImagePath: row.badge_image_path ?? null,
      heartsAwarded: Number(row.hearts_awarded ?? 0),
      awardedAt: row.awarded_at,
    })));
  }

  async function loadQtRecordsForMonth(userId: string, monthDate: Date, options: { showSpinner?: boolean } = {}) {
    const monthStart = getMonthStart(monthDate);
    const nextMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
    if (options.showSpinner) {
      setLoadingQtCalendar(true);
      setQtRecords([]);
    }

    try {
      const supabase = createClient();
      const { data: qt, error } = await supabase.from("qt_records")
        .select("date")
        .eq("user_id", userId)
        .eq("is_draft", false)
        .gte("date", toDateKey(monthStart))
        .lt("date", toDateKey(nextMonthStart));

      if (error) {
        console.error("말씀 묵상 월별 기록 조회 실패:", error);
        setQtRecords([]);
        return;
      }
      setQtRecords((qt ?? []) as QtRecord[]);
    } finally {
      if (options.showSpinner) setLoadingQtCalendar(false);
    }
  }

  function changeCalendarMonth(monthOffset: number) {
    const targetMonth = getMonthStart(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + monthOffset, 1));
    const currentMonth = getMonthStart(new Date());
    if (targetMonth > currentMonth) return;
    setCalendarMonth(targetMonth);
    if (profileUserId) void loadQtRecordsForMonth(profileUserId, targetMonth, { showSpinner: true });
  }

  function handleCalendarTouchStart(e: TouchEvent<HTMLDivElement>) {
    const touch = e.touches[0];
    calendarTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleCalendarTouchEnd(e: TouchEvent<HTMLDivElement>) {
    const start = calendarTouchStartRef.current;
    calendarTouchStartRef.current = null;
    const touch = e.changedTouches[0];
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
    changeCalendarMonth(dx < 0 ? 1 : -1);
  }

  function handleCalendarWheel(e: WheelEvent<HTMLDivElement>) {
    if (Math.abs(e.deltaX) < 26 || Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
    const now = Date.now();
    if (now < calendarWheelLockRef.current) return;
    calendarWheelLockRef.current = now + 520;
    changeCalendarMonth(e.deltaX > 0 ? 1 : -1);
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

  async function uploadAvatarFile(file: File) {
    setPhotoError("");
    // 5MB 제한
    if (file.size > MAX_AVATAR_SIZE) {
      setPhotoError(t("profile_photo_size_error", lang));
      return;
    }
    const ext = ALLOWED_AVATAR_TYPES[file.type];
    if (!ext) {
      setPhotoError(t("profile_photo_format_error", lang));
      return;
    }
    setUploadingPhoto(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setUploadingPhoto(false);
      return;
    }
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

  function getMimeTypeFromPhoto(format?: string, blobType?: string) {
    if (blobType && ALLOWED_AVATAR_TYPES[blobType]) return blobType;
    if (format === "jpeg" || format === "jpg") return "image/jpeg";
    if (format === "png") return "image/png";
    if (format === "webp") return "image/webp";
    return "image/jpeg";
  }

  function base64ToAvatarFile(base64: string, mimeType: string, fileName: string) {
    const byteString = window.atob(base64);
    const bytes = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i += 1) {
      bytes[i] = byteString.charCodeAt(i);
    }
    return new File([bytes], fileName, { type: mimeType });
  }

  function restoreIOSViewportAfterPhotoPicker(scrollY: number) {
    if (!(Capacitor.getPlatform() === "ios" && Capacitor.isNativePlatform())) return;

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) activeElement.blur();

    // iOS Photo Library가 닫힌 뒤 WebView의 status bar / safe-area 계산이 밀리는 경우가 있어
    // native status bar 설정을 다시 적용하고, 현재 페이지 위치를 여러 프레임에 걸쳐 복구합니다.
    const restore = () => {
      window.dispatchEvent(new Event("roots:native-viewport-refresh"));
      window.dispatchEvent(new Event("resize"));
      document.documentElement.style.setProperty("--roots-viewport-refresh", String(Date.now()));
      window.scrollTo({ top: scrollY, left: 0, behavior: "auto" });
    };

    window.setTimeout(restore, 80);
    window.setTimeout(restore, 260);
    window.setTimeout(restore, 650);
  }

  async function resetProfilePhoto() {
    setPhotoError("");
    setResettingPhoto(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: dbError } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
      if (dbError) {
        console.error("프로필 사진 기본 이미지 복귀 실패:", dbError);
        setPhotoError(`${t("profile_photo_reset_fail", lang)}: ${dbError.message}`);
        return;
      }

      setProfile((current: any) => ({ ...(current ?? {}), avatar_url: null }));
      showToast(t("profile_photo_reset_ok", lang));

      // 이전 프로필 사진은 사용자별 고정 경로에 저장됩니다. 삭제가 실패해도 화면 복귀는 유지합니다.
      const oldAvatarPaths = ["jpg", "png", "webp"].map(ext => `${user.id}/avatar.${ext}`);
      const { error: removeError } = await supabase.storage.from("avatars").remove(oldAvatarPaths);
      if (removeError) {
        console.warn("기존 프로필 사진 파일 정리 실패:", removeError);
      }
    } finally {
      setResettingPhoto(false);
      setShowPhotoMenu(false);
    }
  }

  async function chooseProfilePhoto() {
    setPhotoError("");
    if (Capacitor.getPlatform() === "ios" && Capacitor.isNativePlatform()) {
      const scrollYBeforePicker = window.scrollY;
      try {
        // iOS의 기본 file input은 "Take Photo" 선택지를 함께 표시합니다.
        // App Store 심사에서 해당 카메라 촬영 흐름이 crash를 만들 수 있으므로,
        // iOS 앱에서는 Capacitor Camera plugin으로 Photo Library만 직접 엽니다.
        // Base64 결과를 사용해 webPath fetch 실패나 로컬 파일 URL 접근 이슈를 피합니다.
        const photo = await NativeCamera.getPhoto({
          source: CameraSource.Photos,
          resultType: CameraResultType.Base64,
          quality: 85,
          width: 1024,
          correctOrientation: true,
          allowEditing: false,
        });

        if (!photo.base64String) return;
        const mimeType = getMimeTypeFromPhoto(photo.format);
        const ext = ALLOWED_AVATAR_TYPES[mimeType] ?? "jpg";
        const file = base64ToAvatarFile(photo.base64String, mimeType, `avatar.${ext}`);
        await uploadAvatarFile(file);
      } catch (error: any) {
        const message = String(error?.message ?? error ?? "").toLowerCase();
        if (message.includes("cancel") || message.includes("cancelled") || message.includes("canceled") || message.includes("user cancelled")) return;
        console.error("프로필 사진 선택 실패:", error);
        setPhotoError(t("profile_upload_fail", lang));
      } finally {
        restoreIOSViewportAfterPhotoPicker(scrollYBeforePicker);
      }
      return;
    }

    fileRef.current?.click();
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.currentTarget.value = "";
    if (!file) return;
    await uploadAvatarFile(file);
  }

  async function logout() {
    try {
      try {
        await disableCurrentUserPushTokens();
      } catch (pushError) {
        console.warn("푸시 알림 토큰 비활성화 실패:", pushError);
      }

      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/welcome");
    } catch (e) {
      console.error(e);
      router.push("/welcome");
    }
  }

  async function shareApp() {
    const title = t("profile_invite_title", lang);
    const text = t("profile_invite_text", lang);
    const result = await shareInviteContent({ title, text, url: `${ROOTS_WEB_ORIGIN}/welcome?from=invite` });
    if (result === "copied") {
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
      const { data: { user } } = await supabase.auth.getUser();
      const providers = new Set(
        [
          ...((user?.app_metadata?.providers as string[] | undefined) ?? []),
          user?.app_metadata?.provider as string | undefined,
          ...((user?.identities ?? []).map((identity: any) => identity?.provider as string | undefined)),
        ].filter(Boolean),
      );
      const hasEmailPasswordIdentity = providers.has("email");
      const hasOnlyExternalIdentity = providers.size > 0 && !hasEmailPasswordIdentity;
      if (hasOnlyExternalIdentity) {
        showToast(t("profile_password_google_account", lang));
        setSendingPasswordReset(false);
        return;
      }

      const redirectTo = Capacitor.isNativePlatform()
        ? `roots://auth/callback?next=/reset-password&lang=${encodeURIComponent(lang)}`
        : `${ROOTS_WEB_ORIGIN}/reset-password?lang=${encodeURIComponent(lang)}`;

      await supabase.auth.resetPasswordForEmail(userEmail, { redirectTo });
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

  async function saveAvatarChoice(avatarType: RootsAvatarType) {
    if (!profile?.id || savingAvatarChoice) return;
    setSavingAvatarChoice(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_type: avatarType, avatar_choice_seen: true })
        .eq("id", profile.id);
      if (error) throw error;
      setProfile((prev: any) => prev ? { ...prev, avatar_type: avatarType, avatar_choice_seen: true } : prev);
      setShowAvatarChoiceModal(false);
      showToast(lang === "ko" ? "캐릭터가 변경되었어요." : lang === "de" ? "Der Charakter wurde geändert." : lang === "fr" ? "Le personnage a été modifié." : "Character updated.");
    } catch (error) {
      console.error("캐릭터 선택 저장 실패:", error);
      showToast(lang === "ko" ? "캐릭터 선택을 저장하지 못했어요." : lang === "de" ? "Die Charakterauswahl konnte nicht gespeichert werden." : lang === "fr" ? "Impossible d’enregistrer le personnage." : "Could not save your character choice.");
    } finally {
      setSavingAvatarChoice(false);
    }
  }

  function renderCalendar() {
    const now = new Date();
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDow = new Date(year, month, 1).getDay();
    const doneDates = new Set(qtRecords.map(r => r.date));
    const cells = [];
    for (let i = 0; i < firstDow; i++) cells.push(<div key={`e${i}`} />);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const done = doneDates.has(dateStr);
      const isToday = isSameCalendarMonth(calendarMonth, now) && d === now.getDate();
      cells.push(
        <div key={d} style={{ aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: done ? "var(--sage)" : isToday ? "var(--bg3)" : "transparent", border: isToday && !done ? "1px solid var(--sage)" : "none" }}>
          <span style={{ fontSize: 10, fontWeight: done ? 700 : 400, color: done ? "var(--bg)" : isToday ? "var(--sage)" : "var(--text3)" }}>{d}</span>
        </div>
      );
    }
    return cells;
  }

  const calendarMonthLabel = calendarMonth.toLocaleDateString(PROFILE_MONTH_LOCALE[lang], { year: "numeric", month: "long" });
  const qtCompletedDayCount = new Set(qtRecords.map(record => record.date)).size;
  const isViewingCurrentMonth = isSameCalendarMonth(calendarMonth, new Date());
  const sortedFaithBadges = [...FAITH_BADGES].sort((a, b) => {
    const aEarned = profile?.[a.key] ? 1 : 0;
    const bEarned = profile?.[b.key] ? 1 : 0;
    return bEarned - aEarned;
  });
  const previewFaithBadges = sortedFaithBadges.slice(0, 6);
  const earnedFaithBadgeCount = FAITH_BADGES.filter(b => profile?.[b.key]).length;
  const earnedSpiritFruitCount = SPIRIT_FRUIT_BADGES.filter(b => profile?.[b.key]).length;
  const companionChallengeText = getCompanionChallengeText(lang);
  const specialBadges: SpecialProfileBadge[] = [
    ...groupChallengeBadges.map((badge): SpecialProfileBadge => ({
      kind: "group",
      id: `group_${badge.id}`,
      title: badge.title,
      subtitle: badge.groupName,
      badgeName: badge.badgeName,
      badgeImagePath: badge.badgeImagePath,
      badge,
      awardedAt: badge.awardedAt,
    })),
    ...companionChallengeBadges.map((badge): SpecialProfileBadge => ({
      kind: "companion",
      id: `companion_${badge.id}`,
      title: badge.title,
      subtitle: badge.companionName,
      badgeName: badge.badgeName,
      badgeImagePath: badge.badgeImagePath,
      badge,
      awardedAt: badge.awardedAt,
    })),
  ].sort((a, b) => Date.parse(b.awardedAt || "") - Date.parse(a.awardedAt || ""));
  const previewSpecialBadges = specialBadges.slice(0, 3);
  const shouldShowSpecialBadgeGalleryButton = specialBadges.length > 0;
  const currentAvatarType = normalizeRootsAvatarType(profile?.avatar_type);

  function openFaithBadgeDetail(b: FaithBadge) {
    const earned = profile?.[b.key] ?? false;
    setSelectedBadge({ img: b.img, title: t(b.titleKey, lang), desc: t(b.descKey, lang), earned });
  }

  function openSpiritFruitBadgeDetail(b: SpiritFruitBadge, index: number) {
    const earned = profile?.[b.key] ?? false;
    const fruitName = t(b.descKey, lang);
    const targetDay = (index + 1) * 100;
    const lockedDesc =
      lang === "ko"
        ? `${targetDay}일 말씀동행을 채우면 ${fruitName}의 열매를 받을 수 있어요.`
        : lang === "de"
          ? `Nach ${targetDay} Tagen im Wortweg können Sie die Frucht ${fruitName} erhalten.`
          : lang === "fr"
            ? `Après ${targetDay} jours de chemin avec la Parole, vous pourrez recevoir le fruit ${fruitName}.`
            : `Complete ${targetDay} Word-walk days to receive the fruit of ${fruitName}.`;

    setSelectedBadge({
      img: getSpiritFruitBadgeImg(b.name),
      title: fruitName,
      desc: earned ? t("garden_badge_100days", lang, { n: targetDay, fruit: fruitName }) : lockedDesc,
      earned,
    });
  }


  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" />
    </div>
  );

  return (
    <div className="page" style={{ paddingBottom: 80 }}>
      {toast && (
        <div style={{ position: "fixed", top: 18, left: "50%", transform: "translateX(-50%)", zIndex: 300, background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 999, padding: "10px 16px", fontSize: 13, fontWeight: 700, boxShadow: "0 8px 24px rgba(0,0,0,0.18)", whiteSpace: "nowrap", maxWidth: "calc(100vw - 32px)", overflow: "hidden", textOverflow: "ellipsis" }}>
          {toast}
        </div>
      )}

      <AvatarChoiceModal
        show={showAvatarChoiceModal}
        mode="change"
        selectedAvatar={currentAvatarType}
        saving={savingAvatarChoice}
        onSelect={(avatarType) => void saveAvatarChoice(avatarType)}
        onClose={() => { if (!savingAvatarChoice) setShowAvatarChoiceModal(false); }}
      />

      {showBadgeGallery && (
        <div
          onClick={() => setShowBadgeGallery(false)}
          style={{ position: "fixed", inset: 0, zIndex: 250, background: "rgba(26,28,30,0.72)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 390, maxHeight: "calc(100vh - 64px)", overflowY: "auto", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 26, padding: "22px 16px 18px", boxShadow: "0 18px 48px rgba(0,0,0,0.28)", position: "relative" }}
          >
            <button
              onClick={() => setShowBadgeGallery(false)}
              aria-label="Close"
              style={{ position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: "50%", background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, lineHeight: 1 }}
            >
              ×
            </button>
            <div style={{ paddingRight: 36, marginBottom: 16 }}>
              <h3 style={{ fontSize: 20, fontWeight: 900, color: "var(--text)", marginBottom: 6 }}>{t("profile_badge_gallery_title", lang)}</h3>
              <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.55 }}>{t("profile_badge_gallery_sub", lang)}</p>
            </div>

            <div className="sec-label" style={{ marginBottom: 10 }}>
              {t("profile_faith_fruits", lang)}
              <span style={{ marginLeft: 8, fontSize: 11, color: "var(--sage-dark)", fontWeight: 600 }}>{earnedFaithBadgeCount} / {FAITH_BADGES.length}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
              {sortedFaithBadges.map(b => {
                const earned = profile?.[b.key] ?? false;
                return (
                  <button
                    key={b.key}
                    onClick={() => openFaithBadgeDetail(b)}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", background: "transparent", border: "none", padding: 0, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}
                  >
                    <div style={{ width: 72, height: 72, marginBottom: 5, opacity: earned ? 1 : 0.32, filter: earned ? "none" : "grayscale(0.2)", transition: "transform 160ms ease, opacity 160ms ease" }}>
                      <img src={b.img} alt={t(b.titleKey, lang)} style={{ width: "100%", height: "100%", objectFit: "contain", transform: b.key === "badge_rootsman" ? "scale(1.15)" : "none" }} />
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: earned ? "rgba(232,197,71,0.95)" : "var(--text)", lineHeight: 1.25 }}>{t(b.titleKey, lang)}</div>
                    <div style={{ fontSize: 9, color: "var(--text2)", marginTop: 2, lineHeight: 1.25 }}>{t(b.descKey, lang)}</div>
                  </button>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {showGroupChallengeBadgeGallery && (
        <div
          onClick={() => setShowGroupChallengeBadgeGallery(false)}
          style={{ position: "fixed", inset: 0, zIndex: 250, background: "rgba(26,28,30,0.72)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 390, maxHeight: "calc(100vh - 64px)", overflowY: "auto", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 26, padding: "22px 16px 18px", boxShadow: "0 18px 48px rgba(0,0,0,0.28)", position: "relative" }}
          >
            <button
              onClick={() => setShowGroupChallengeBadgeGallery(false)}
              aria-label="Close"
              style={{ position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: "50%", background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, lineHeight: 1 }}
            >
              ×
            </button>
            <div style={{ paddingRight: 36, marginBottom: 16 }}>
              <h3 style={{ fontSize: 20, fontWeight: 900, color: "var(--text)", marginBottom: 4 }}>{t("profile_special_badges", lang)}</h3>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {specialBadges.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setShowGroupChallengeBadgeGallery(false);
                    if (item.kind === "group") {
                      setSelectedGroupChallengeBadge(item.badge);
                    } else {
                      setSelectedCompanionChallengeBadge(item.badge);
                    }
                  }}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", minWidth: 0, background: "transparent", border: "none", padding: 0, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}
                >
                  <div style={{ width: 72, height: 72, marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img
                      src={item.kind === "group" ? getGroupChallengeBadgeImg(item.badgeImagePath) : getCompanionChallengeBadgeImg(item.badgeImagePath)}
                      alt={item.badgeName || item.title}
                      onError={(event) => {
                        const fallback = item.kind === "group" ? "/badge_roots_together.webp" : "/badge_roots_together.webp";
                        if (event.currentTarget.src.endsWith(fallback)) return;
                        event.currentTarget.src = fallback;
                      }}
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    />
                  </div>
                  <div style={{ width: "100%", fontSize: 10, fontWeight: 850, color: "var(--text)", lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {item.title}
                  </div>
                  <div style={{ width: "100%", fontSize: 9, color: "var(--text2)", marginTop: 3, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.subtitle}
                  </div>
                </button>
              ))}
            </div>
          </div>
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

      {selectedGroupChallengeBadge && (
        <div
          onClick={() => setSelectedGroupChallengeBadge(null)}
          style={{ position: "fixed", inset: 0, zIndex: 260, background: "rgba(26,28,30,0.72)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px" }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 340, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 26, padding: "24px 20px 20px", textAlign: "center", boxShadow: "0 18px 48px rgba(0,0,0,0.28)", position: "relative" }}
          >
            <button
              onClick={() => setSelectedGroupChallengeBadge(null)}
              aria-label="Close"
              style={{ position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: "50%", background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, lineHeight: 1 }}
            >
              ×
            </button>
            <div style={{ width: 132, height: 132, margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img
                src={getGroupChallengeBadgeImg(selectedGroupChallengeBadge.badgeImagePath)}
                alt={selectedGroupChallengeBadge.badgeName || selectedGroupChallengeBadge.title}
                onError={(event) => {
                  const fallback = "/badge_roots_together.webp";
                  if (event.currentTarget.src.endsWith(fallback)) return;
                  event.currentTarget.src = fallback;
                }}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 900, color: "var(--text)", marginBottom: 12 }}>
              {selectedGroupChallengeBadge.badgeName || t("profile_group_challenge_badge_detail_title", lang)}
            </h3>
            <div style={{ display: "grid", gap: 8, textAlign: "left", marginBottom: 16 }}>
              <div style={{ padding: "10px 12px", borderRadius: 14, background: "var(--bg3)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 10, fontWeight: 850, color: "var(--text3)", marginBottom: 3 }}>{t("profile_group_challenge_badge_detail_challenge", lang)}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", lineHeight: 1.35 }}>{selectedGroupChallengeBadge.title}</div>
              </div>
              <div style={{ padding: "10px 12px", borderRadius: 14, background: "var(--bg3)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 10, fontWeight: 850, color: "var(--text3)", marginBottom: 3 }}>{t("profile_group_challenge_badge_detail_group", lang)}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", lineHeight: 1.35 }}>{selectedGroupChallengeBadge.groupName}</div>
              </div>
            </div>
            <button onClick={() => setSelectedGroupChallengeBadge(null)} className="btn-sage" style={{ width: "100%" }}>
              {t("group_challenge_close", lang)}
            </button>
          </div>
        </div>
      )}

      {selectedCompanionChallengeBadge && (
        <div
          onClick={() => setSelectedCompanionChallengeBadge(null)}
          style={{ position: "fixed", inset: 0, zIndex: 260, background: "rgba(26,28,30,0.72)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px" }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 340, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 26, padding: "24px 20px 20px", textAlign: "center", boxShadow: "0 18px 48px rgba(0,0,0,0.28)", position: "relative" }}
          >
            <button
              onClick={() => setSelectedCompanionChallengeBadge(null)}
              aria-label="Close"
              style={{ position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: "50%", background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, lineHeight: 1 }}
            >
              ×
            </button>
            <div style={{ width: 132, height: 132, margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img
                src={getCompanionChallengeBadgeImg(selectedCompanionChallengeBadge.badgeImagePath)}
                alt={selectedCompanionChallengeBadge.badgeName || selectedCompanionChallengeBadge.title}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 900, color: "var(--text)", marginBottom: 12 }}>
              {selectedCompanionChallengeBadge.badgeName || companionChallengeText.sectionTitle}
            </h3>
            <div style={{ display: "grid", gap: 8, textAlign: "left", marginBottom: 16 }}>
              <div style={{ padding: "10px 12px", borderRadius: 14, background: "var(--bg3)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 10, fontWeight: 850, color: "var(--text3)", marginBottom: 3 }}>{companionChallengeText.sectionTitle}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", lineHeight: 1.35 }}>{selectedCompanionChallengeBadge.title}</div>
              </div>
              <div style={{ padding: "10px 12px", borderRadius: 14, background: "var(--bg3)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 10, fontWeight: 850, color: "var(--text3)", marginBottom: 3 }}>{companionChallengeText.partnerStatusLabel}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", lineHeight: 1.35 }}>{selectedCompanionChallengeBadge.companionName}</div>
              </div>
              <div style={{ padding: "10px 12px", borderRadius: 14, background: "rgba(232,197,71,0.08)", border: "1px solid rgba(232,197,71,0.22)" }}>
                <div style={{ fontSize: 10, fontWeight: 850, color: "var(--text3)", marginBottom: 3 }}>{companionChallengeText.heartsLabel}</div>
                <div style={{ fontSize: 13, fontWeight: 900, color: "rgba(189,139,30,0.98)", lineHeight: 1.35 }}>💛 +{selectedCompanionChallengeBadge.heartsAwarded}</div>
              </div>
            </div>
            <button onClick={() => setSelectedCompanionChallengeBadge(null)} className="btn-sage" style={{ width: "100%" }}>
              {t("group_challenge_close", lang)}
            </button>
          </div>
        </div>
      )}

      <div style={{ background: "var(--bg)", padding: "var(--roots-page-top-padding) 20px 20px", borderBottom: "1px solid var(--border)", position: "relative" }}>
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
                <img src="/roots-logo-transparent-96.png" alt="Roots" width={42} height={42} style={{ objectFit: "contain", imageRendering: "pixelated" }} />
              )}
            </div>
            <button
              onClick={() => setShowPhotoMenu(true)}
              disabled={uploadingPhoto || resettingPhoto}
              aria-label={t("profile_photo_menu_title", lang)}
              style={{ position: "absolute", bottom: 0, right: 0, width: 22, height: 22, borderRadius: "50%", background: "var(--sage)", border: "2px solid var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              {uploadingPhoto || resettingPhoto ? <Loader2 size={9} style={{ color: "white" }} className="spin" /> : <Camera size={9} style={{ color: "white" }} />}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto} style={{ display: "none" }} />
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
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: "var(--text3)" }}>{t("profile_streak", lang, { n: profile?.streak_days ?? 0 })}</span>
              <span aria-label="Love Hearts" style={{ display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "3px 8px", background: "rgba(232,197,71,0.12)", border: "1px solid rgba(232,197,71,0.26)", color: "rgba(232,197,71,0.98)", fontSize: 11, fontWeight: 850, lineHeight: 1 }}>
                💛 +{loveHeartBalance}
              </span>
            </div>
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

      {/* 내 캐릭터 */}
      <div style={{ padding: "14px 16px 0" }}>
        <div className="sec-label">{getRootsAvatarChoiceText("profileTitle", lang)}</div>
        <div className="card" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12, alignItems: "center", padding: "16px 14px", minHeight: 150 }}>
          <div style={{ minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "visible" }}>
            <img src={getRootsAvatarImageSrc(currentAvatarType)} alt={getRootsAvatarLabel(currentAvatarType, lang)} style={{ width: "100%", maxWidth: 150, maxHeight: 152, objectFit: "contain", imageRendering: "pixelated" }} />
          </div>
          <div style={{ minWidth: 0, display: "flex", flexDirection: "column", alignItems: "stretch", justifyContent: "center", gap: 9 }}>
            <button type="button" onClick={() => setShowAvatarChoiceModal(true)} style={{ width: "100%", border: "none", borderRadius: 999, background: "var(--sage)", color: "var(--bg)", padding: "10px 12px", fontSize: 12.5, fontWeight: 900, cursor: "pointer", lineHeight: 1.25 }}>
              {getRootsAvatarChoiceText("change", lang)}
            </button>
            <button type="button" disabled style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 999, background: "var(--bg3)", color: "var(--text3)", padding: "10px 12px", fontSize: 12.5, fontWeight: 850, cursor: "not-allowed", opacity: 0.72, lineHeight: 1.25 }}>
              {getRootsAvatarChoiceText("customizeSoon", lang)}
            </button>
          </div>
        </div>
      </div>

      {/* 신앙의 결실 배지 */}
      <div style={{ padding: "14px 16px 0" }}>
        <div className="sec-label" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span>
            {t("profile_faith_fruits", lang)}
            <span style={{ marginLeft: 8, fontSize: 11, color: "var(--sage-dark)", fontWeight: 600 }}>{earnedFaithBadgeCount} / {FAITH_BADGES.length}</span>
          </span>
          <button
            type="button"
            onClick={() => setShowBadgeGallery(true)}
            style={{ border: "none", background: "transparent", color: "var(--sage-dark)", fontSize: 11, fontWeight: 800, cursor: "pointer", padding: 0 }}
          >
            {t("profile_badges_view_all", lang)}
          </button>
        </div>
        <div className="card" style={{ padding: "16px 14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {previewFaithBadges.map(b => {
              const earned = profile?.[b.key] ?? false;
              return (
                <button
                  key={b.key}
                  onClick={() => openFaithBadgeDetail(b)}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", background: "transparent", border: "none", padding: 0, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}
                >
                  <div style={{ width: 72, height: 72, marginBottom: 5, opacity: earned ? 1 : 0.32, filter: earned ? "none" : "grayscale(0.2)", transition: "transform 160ms ease, opacity 160ms ease" }}>
                    <img src={b.img} alt={t(b.titleKey, lang)} style={{ width: "100%", height: "100%", objectFit: "contain", transform: b.key === "badge_rootsman" ? "scale(1.15)" : "none" }} />
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: earned ? "rgba(232,197,71,0.95)" : "var(--text)", lineHeight: 1.25 }}>{t(b.titleKey, lang)}</div>
                  <div style={{ fontSize: 9, color: "var(--text2)", marginTop: 2, lineHeight: 1.25 }}>{t(b.descKey, lang)}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {specialBadges.length > 0 && (
        <div id="special-badges" style={{ padding: "14px 16px 0", scrollMarginTop: 18 }}>
          <div className="sec-label" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span>{t("profile_special_badges", lang)}</span>
            {shouldShowSpecialBadgeGalleryButton && (
              <button
                type="button"
                onClick={() => setShowGroupChallengeBadgeGallery(true)}
                style={{ border: "none", background: "transparent", color: "var(--sage-dark)", fontSize: 11, fontWeight: 800, cursor: "pointer", padding: 0 }}
              >
                {t("profile_badges_view_all", lang)}
              </button>
            )}
          </div>
          <div className="card" style={{ padding: "18px 14px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 92px))", gap: 14, justifyContent: "start" }}>
              {previewSpecialBadges.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.kind === "group") {
                      setSelectedGroupChallengeBadge(item.badge);
                    } else {
                      setSelectedCompanionChallengeBadge(item.badge);
                    }
                  }}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", minWidth: 0, background: "transparent", border: "none", padding: 0, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}
                >
                  <div style={{ width: 78, height: 78, marginBottom: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img
                      src={item.kind === "group" ? getGroupChallengeBadgeImg(item.badgeImagePath) : getCompanionChallengeBadgeImg(item.badgeImagePath)}
                      alt={item.badgeName || item.title}
                      onError={(event) => {
                        const fallback = "/badge_roots_together.webp";
                        if (event.currentTarget.src.endsWith(fallback)) return;
                        event.currentTarget.src = fallback;
                      }}
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    />
                  </div>
                  <div style={{ width: "100%", fontSize: 10, fontWeight: 850, color: "var(--text)", lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {item.title}
                  </div>
                  <div style={{ width: "100%", fontSize: 9, color: "var(--text2)", marginTop: 3, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.subtitle}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 성령의 열매 배지 */}
      <div style={{ padding: "14px 16px 0" }}>
        <div className="sec-label">
          {t("profile_spirit_fruits", lang)}
          <span style={{ marginLeft: 8, fontSize: 11, color: "var(--sage-dark)", fontWeight: 600 }}>{earnedSpiritFruitCount} / {SPIRIT_FRUIT_BADGES.length}</span>
        </div>
        <div className="card" style={{ padding: "16px 12px", position: "relative" }}>
          <button
            onClick={() => { const el = document.getElementById("spirit-fruit-scroll"); if (el) el.scrollBy({ left: -200, behavior: "smooth" }); }}
            aria-label={lang === "ko" ? "이전 배지" : lang === "de" ? "Vorherige Abzeichen" : lang === "fr" ? "Badges précédents" : "Previous badges"}
            style={{ position: "absolute", left: 4, top: "50%", transform: "translateY(-50%)", zIndex: 2, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text3)", fontSize: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }}
          >‹</button>
          <button
            onClick={() => { const el = document.getElementById("spirit-fruit-scroll"); if (el) el.scrollBy({ left: 200, behavior: "smooth" }); }}
            aria-label={lang === "ko" ? "다음 배지" : lang === "de" ? "Nächste Abzeichen" : lang === "fr" ? "Badges suivants" : "Next badges"}
            style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", zIndex: 2, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text3)", fontSize: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }}
          >›</button>
          <div id="spirit-fruit-scroll" style={{ display: "flex", overflowX: "auto", gap: 16, paddingBottom: 4, scrollbarWidth: "none", paddingLeft: 20, paddingRight: 20 }}>
            {SPIRIT_FRUIT_BADGES.map((b, index) => {
              const earned = profile?.[b.key] ?? false;
              const fruitName = t(b.descKey, lang);
              return (
                <button
                  key={b.name}
                  onClick={() => openSpiritFruitBadgeDetail(b, index)}
                  aria-label={fruitName}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", flexShrink: 0, width: 76, background: "transparent", border: "none", padding: 0, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}
                >
                  <div style={{ width: 68, height: 68, marginBottom: 6, opacity: earned ? 1 : 0.32, filter: earned ? "none" : "grayscale(0.2)", transition: "transform 160ms ease, opacity 160ms ease" }}>
                    <img src={getSpiritFruitBadgeImg(b.name)} alt={fruitName} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: earned ? "rgba(232,197,71,0.95)" : "var(--text)", lineHeight: 1.3 }}>{b.name}</div>
                  <div style={{ fontSize: 9, color: "var(--text2)", marginTop: 2 }}>{fruitName}</div>
                  {earned && <div style={{ fontSize: 8, color: "rgba(232,197,71,0.7)", marginTop: 2 }}>{t("profile_badge_earned", lang)}</div>}
                </button>
              );
            })}
          </div>
          {earnedSpiritFruitCount === 0 && (
            <p style={{ fontSize: 12, color: "var(--text3)", textAlign: "center", marginTop: 14 }}>
              {t("profile_spirit_fruit_first_hint", lang)}
            </p>
          )}
        </div>
      </div>

      {/* 말씀 묵상 현황 달력 */}
      <div style={{ padding: "14px 16px 0" }}>
        <div className="sec-label" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => changeCalendarMonth(-1)}
            aria-label={t("profile_calendar_previous_month", lang)}
            style={{ width: 32, height: 32, flexShrink: 0, borderRadius: "50%", background: "var(--bg2)", border: "1px solid var(--border)", color: "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, lineHeight: 1 }}
          >‹</button>
          <div style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
            <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {t("profile_qt_month_label", lang, { month: calendarMonthLabel })}
            </span>
            <span style={{ display: "block", marginTop: 3, fontSize: 11, color: "var(--sage-dark)", fontWeight: 600, letterSpacing: 0, textTransform: "none" }}>
              {qtCompletedDayCount}{t("profile_qt_days_suffix", lang)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => changeCalendarMonth(1)}
            disabled={isViewingCurrentMonth}
            aria-label={t("profile_calendar_next_month", lang)}
            style={{ width: 32, height: 32, flexShrink: 0, borderRadius: "50%", background: "var(--bg2)", border: "1px solid var(--border)", color: "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: isViewingCurrentMonth ? "not-allowed" : "pointer", opacity: isViewingCurrentMonth ? 0.35 : 1, fontSize: 18, lineHeight: 1 }}
          >›</button>
        </div>
        <div
          className="card"
          style={{ position: "relative", touchAction: "pan-y" }}
          aria-busy={loadingQtCalendar}
          onTouchStart={handleCalendarTouchStart}
          onTouchEnd={handleCalendarTouchEnd}
          onWheel={handleCalendarWheel}
        >
          {loadingQtCalendar && (
            <div style={{ position: "absolute", top: 12, right: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Loader2 size={13} style={{ color: "var(--sage)" }} className="spin" />
            </div>
          )}
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
      <div style={{ padding: "16px 18px 4px", display: "flex", justifyContent: "center", alignItems: "center", gap: "6px 0", flexWrap: "wrap" }}>
        {[
          { href: "/impressum", label: t("profile_impressum", lang) },
          { href: "/privacy", label: t("profile_privacy", lang) },
          { href: "/terms", label: t("profile_terms", lang) },
          { href: "/support", label: t("profile_support", lang) },
          { href: "/account-deletion", label: t("profile_account_deletion", lang) },
        ].map((link, index) => (
          <span key={link.href} style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap" }}>
            <button
              type="button"
              onClick={() => router.push(link.href)}
              style={{ padding: "6px 0", background: "transparent", border: "none", fontSize: 11, lineHeight: 1.4, color: "var(--text3)", textDecoration: "none", cursor: "pointer" }}
            >
              {link.label}
            </button>
            {index < 4 && <span aria-hidden="true" style={{ margin: "0 10px", fontSize: 11, color: "var(--border)", userSelect: "none" }}>|</span>}
          </span>
        ))}
      </div>

      <div style={{ height: 80 }} />
      <BottomNav />


      {/* 프로필 사진 관리 메뉴 */}
      {showPhotoMenu && (
        <div onClick={() => setShowPhotoMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(26,28,30,0.72)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 16px 92px" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 390, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 24, padding: "18px 16px 14px", boxShadow: "0 18px 48px rgba(0,0,0,0.24)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--text)" }}>{t("profile_photo_menu_title", lang)}</h3>
              <button onClick={() => setShowPhotoMenu(false)} style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <X size={15} />
              </button>
            </div>
            <button
              onClick={async () => {
                setShowPhotoMenu(false);
                await chooseProfilePhoto();
              }}
              disabled={uploadingPhoto || resettingPhoto}
              style={{ width: "100%", padding: "14px 14px", borderRadius: 14, background: "var(--sage-light)", border: "1px solid rgba(122,157,122,0.28)", color: "var(--sage-dark)", fontSize: 14, fontWeight: 800, cursor: "pointer", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              {uploadingPhoto ? <Loader2 size={14} className="spin" /> : <Camera size={15} />}
              {t("profile_photo_select", lang)}
            </button>
            <button
              onClick={resetProfilePhoto}
              disabled={uploadingPhoto || resettingPhoto || !profile?.avatar_url}
              style={{ width: "100%", padding: "14px 14px", borderRadius: 14, background: "var(--bg3)", border: "1px solid var(--border)", color: profile?.avatar_url ? "var(--text)" : "var(--text3)", fontSize: 14, fontWeight: 700, cursor: profile?.avatar_url ? "pointer" : "not-allowed", opacity: profile?.avatar_url ? 1 : 0.56, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              {resettingPhoto ? <Loader2 size={14} className="spin" /> : null}
              {t("profile_photo_reset", lang)}
            </button>
            <button
              onClick={() => setShowPhotoMenu(false)}
              style={{ width: "100%", padding: "12px 14px", borderRadius: 14, background: "transparent", border: "none", color: "var(--text3)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              {t("profile_photo_cancel", lang)}
            </button>
          </div>
        </div>
      )}

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
              onClick={() => setShowNotificationSettingsModal(true)}
              style={{ width: "100%", padding: "13px 14px", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14, color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", marginBottom: 10, textAlign: "left" }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                <span style={{ width: 30, height: 30, borderRadius: 12, background: "var(--sage-light)", color: "var(--sage-dark)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Bell size={15} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 800, marginBottom: 3 }}>{t("notifications_title", lang)}</p>
                  <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.45 }}>{t("notifications_settings_hint", lang)}</p>
                </div>
              </div>
              <span style={{ fontSize: 18, color: "var(--text3)" }}>›</span>
            </button>

            <button
              onClick={() => { setShowSettingsModal(false); router.push("/companions"); }}
              style={{ width: "100%", padding: "13px 14px", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 14, color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", marginBottom: 10, textAlign: "left" }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                <span style={{ width: 30, height: 30, borderRadius: 12, background: "var(--sage-light)", color: "var(--sage-dark)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Users size={15} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 800, marginBottom: 3 }}>{t("companions_title", lang)}</p>
                  <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.45 }}>{t("companions_profile_settings_hint", lang)}</p>
                </div>
              </div>
              <span style={{ fontSize: 18, color: "var(--text3)" }}>›</span>
            </button>

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

      {showNotificationSettingsModal && (
        <NotificationSettingsModal
          onClose={() => setShowNotificationSettingsModal(false)}
          onSaved={(message) => showToast(message)}
        />
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

"use client";
import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import PhotoViewerModal from "@/components/PhotoViewerModal";
import ConfettiBurst from "@/components/ConfettiBurst";
import NotificationDirectOpenOverlay from "@/components/notifications/NotificationDirectOpenOverlay";
import CommunityReactionButtons from "@/components/community/CommunityReactionButtons";
import GroupChallengeScheduleFields from "@/components/community/GroupChallengeScheduleFields";
import { createClient } from "@/lib/supabase";
import { useLang } from "@/lib/useLang";
import { translateBibleRef } from "@/lib/bibleBooks";
import { t, type Lang, type TKey } from "@/lib/i18n";
import {
  getDateLocale,
  getLocalDateString,
  parseLocalDateString,
} from "@/lib/date";
import {
  GROUP_CHALLENGE_REQUEST_DEFAULT_DURATION_DAYS,
  GROUP_CHALLENGE_REQUEST_MAX_DURATION_DAYS,
  GROUP_CHALLENGE_REQUEST_MIN_LEAD_DAYS,
  addDaysToDateInput,
  deriveChallengeRequestEndDate,
  inclusiveDateRangeDays,
} from "@/lib/groupChallengeRequestDates";
import {
  formatGroupChallengeRequestText,
  getGroupChallengeRequestText,
} from "@/lib/groupChallengeRequestText";
import { getGroupLeaderText } from "@/lib/groupLeaderText";
import { storageGetJson, storageSetJson } from "@/lib/clientStorage";
import {
  loadProfileCards,
  mapProfileCards,
  type ProfileCard,
} from "@/lib/profileCards";
import {
  loadCommunityViewerMeta,
  loadPartnerSupplementalData,
} from "@/lib/communityInitialLoad";
import {
  getAnsweredPrayerTime,
  getPrayerShareActivityTime,
  getQtShareActivityTime,
  sortAnsweredPrayerRows,
  sortCommunityPrayerRows,
  sortPrayerRequestRows,
  sortQtRowsByCompletion,
} from "@/lib/communityContentOrder";
import { copyText, shareInvite as shareInviteContent } from "@/lib/nativeShare";
import { ESV_ATTRIBUTION_URL, ESV_TRANSLATION_ID } from "@/lib/esvBible";
import { clearSharePromptOptionsCache } from "@/lib/sharePromptOptions";
import {
  checkAndAwardPrayTogetherBadge,
  checkAndAwardQtReactionBadge,
  getRewardBadgePopup,
} from "@/lib/rewardBadges";
import { awardLoveHeartOnce, type LoveHeartSourceType } from "@/lib/loveHearts";
import { getLoveHeartToastText } from "@/lib/loveHeartText";
import {
  triggerLoveHeartTapHapticBestEffort,
  triggerReflectionNudgeHapticBestEffort,
} from "@/lib/nativeHaptics";
import { getReflectionNudgeText } from "@/lib/reflectionNudgeText";
import {
  communityNotificationTargetSignature,
  parseCommunityNotificationDirectTarget,
  type CommunityNotificationDirectTarget,
} from "@/lib/notifications/communityDeepLinks";
import { loadCommunityNotificationDirectContent } from "@/lib/notifications/communityDirectContent";
import {
  COMPANION_CHALLENGE_BADGE_FALLBACK,
  companionChallengeProgressPercent,
  getCompanionChallengeBadgeImageSrc,
  loadCompanionChallengeStatus,
  type CompanionChallengeStatus,
} from "@/lib/companionChallenges";
import {
  getCompanionChallengeDisplayTitle,
  getCompanionChallengeRewardTeaser,
  getCompanionChallengeStatusLabel,
  getCompanionChallengeText,
} from "@/lib/companionChallengeText";
import {
  Loader2,
  Plus,
  X,
  Users,
  Share2,
  Copy,
  Check,
  ChevronRight,
  ArrowLeft,
  Heart,
  HandHeart,
  BookOpen,
  CheckCircle2,
  Star,
  LogOut,
  AlertTriangle,
  Edit3,
  Trash2,
  MoreHorizontal,
  Flag,
  EyeOff,
  UserPlus,
  Crown,
  UserMinus,
} from "lucide-react";

const COMPANION_CHALLENGE_MYSTERY_BADGE_SRC = "/images/group-challenges/mystery-badge.png";

type CommunityCopyLang = Lang | "es";

const COMMUNITY_LOCAL_TEXT: Record<CommunityCopyLang, { profileAlt: string; photoAlt: string; photoLoading: string }> = {
  ko: { profileAlt: "프로필", photoAlt: "말씀 묵상 사진", photoLoading: "사진을 불러오는 중이에요." },
  en: { profileAlt: "Profile", photoAlt: "Bible Reflection photo", photoLoading: "Loading photo..." },
  de: { profileAlt: "Profil", photoAlt: "Foto zur Stillen Zeit", photoLoading: "Foto wird geladen..." },
  fr: { profileAlt: "Profil", photoAlt: "Photo de méditation biblique", photoLoading: "Chargement de la photo..." },
  es: { profileAlt: "Perfil", photoAlt: "Foto de meditación bíblica", photoLoading: "Cargando la foto..." },
};

function isEsvQtRecord(row: any) {
  return Number(row?.bible_version) === ESV_TRANSLATION_ID;
}

function EsvInlineAttribution({ row }: { row: any }) {
  if (!isEsvQtRecord(row)) return null;

  return (
    <>
      {" "}
      <span style={{ whiteSpace: "nowrap" }}>
        (ESV ·{" "}
        <a
          href={ESV_ATTRIBUTION_URL}
          target="_blank"
          rel="noreferrer noopener"
          onClick={(event) => event.stopPropagation()}
          style={{
            color: "inherit",
            textDecoration: "underline",
            textUnderlineOffset: 2,
            fontSize: "0.9em",
          }}
        >
          ESV.org
        </a>
        )
      </span>
    </>
  );
}

type ShareScope = "all" | "group" | "partner";

type GroupChallengeRequestSummary = {
  id?: string | null;
  status?: string | null;
  title?: string | null;
  requested_start_date?: string | null;
  requested_end_date?: string | null;
  duration_days?: number | null;
  created_at?: string | null;
};

const APP_URL = "https://www.christian-roots.com";
const COMMUNITY_FEED_PAGE_SIZE = 30;
const COMMUNITY_ALL_QT_LIMIT = 30;
const COMMUNITY_RELATION_QT_LIMIT = 120;
const COMMUNITY_PRAYER_PREFETCH_LIMIT = 90;
const COMMUNITY_PARTNER_QT_HISTORY_LIMIT = 120;
const COMMUNITY_PARTNER_PRAYER_HISTORY_LIMIT = 500;
type CommunitySectionKey = "qt" | "praying" | "answered";

type ReflectionNudgeStatus = {
  partnerCompletedIds: string[];
  groupUnavailableIds: string[];
  partnerSentIds: string[];
  groupSentIds: string[];
};

type GroupMemberProfile = ProfileCard & {
  isLeader: boolean;
};

type GroupLeaderAction =
  | "update_group"
  | "remove_member"
  | "transfer_leadership"
  | "delete_group"
  | "request_challenge";

const EMPTY_REFLECTION_NUDGE_STATUS: ReflectionNudgeStatus = {
  partnerCompletedIds: [],
  groupUnavailableIds: [],
  partnerSentIds: [],
  groupSentIds: [],
};

async function requestGroupLeaderAction(
  action: GroupLeaderAction,
  payload: Record<string, unknown>,
) {
  const response = await fetch("/api/groups/manage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });

  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) {
    throw new Error(result?.error ?? "group_action_failed");
  }
  return result;
}

function isLaterThan(left?: string | null, right?: string | null) {
  if (!left) return false;
  if (!right) return true;
  return new Date(left).getTime() > new Date(right).getTime();
}

function sharedContentTime(row: any): string | null {
  return row?.shared_at ?? row?.created_at ?? null;
}

function qtUnreadActivityTime(row: any): string | null {
  return getQtShareActivityTime(row);
}

function prayerUnreadActivityTime(row: any): string | null {
  return getPrayerShareActivityTime(row);
}

function sortQtFeedRows<T extends Record<string, any>>(rows: T[]): T[] {
  return sortQtRowsByCompletion(rows);
}

function sortPrayerFeedRows<T extends Record<string, any>>(rows: T[]): T[] {
  return sortCommunityPrayerRows(rows);
}

function mergeRowsById<T extends Record<string, any>>(
  rowSets: Array<T[] | null | undefined>,
): T[] {
  const map = new Map<string, T>();
  rowSets.forEach((rows) => {
    (rows ?? []).forEach((row) => {
      const id = String(row?.id ?? "");
      if (!id) return;
      map.set(id, { ...(map.get(id) ?? {}), ...row });
    });
  });
  return Array.from(map.values());
}

async function fetchQtFeedRows(
  supabase: ReturnType<typeof createClient>,
  visibilityPattern: string,
  limit: number,
) {
  // Fetch only the records this surface can actually show. Completion order is
  // authoritative; created_at remains a compatibility fallback for an
  // environment where migration 125 has not been applied yet.
  const completedAtQuery = await supabase
    .from("qt_records")
    .select("*")
    .ilike("visibility", visibilityPattern)
    .eq("is_draft", false)
    .order("completed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!completedAtQuery.error) {
    return sortQtFeedRows(completedAtQuery.data ?? []).slice(0, limit);
  }

  console.warn(
    "qt_records completed_at ordering failed. Falling back to legacy completion ordering:",
    completedAtQuery.error.message,
  );

  const createdAtQuery = await supabase
    .from("qt_records")
    .select("*")
    .ilike("visibility", visibilityPattern)
    .eq("is_draft", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (createdAtQuery.error) throw createdAtQuery.error;
  return sortQtFeedRows(createdAtQuery.data ?? []).slice(0, limit);
}

async function fetchPrayerFeedRows(
  supabase: ReturnType<typeof createClient>,
  visibilityPattern: string,
) {
  // An answered prayer is a newly completed testimony at answered_at. Fetch it
  // independently so an old prayer request answered today cannot be excluded by
  // a created_at limit. Active requests retain their existing share/create order.
  const [createdAtQuery, sharedAtQuery, answeredAtQuery] = await Promise.all([
    supabase
      .from("prayer_items")
      .select("*")
      .ilike("visibility", visibilityPattern)
      .order("created_at", { ascending: false })
      .limit(COMMUNITY_PRAYER_PREFETCH_LIMIT),
    supabase
      .from("prayer_items")
      .select("*")
      .ilike("visibility", visibilityPattern)
      .eq("is_answered", false)
      .order("shared_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(COMMUNITY_PRAYER_PREFETCH_LIMIT),
    supabase
      .from("prayer_items")
      .select("*")
      .ilike("visibility", visibilityPattern)
      .eq("is_answered", true)
      .order("answered_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(COMMUNITY_PRAYER_PREFETCH_LIMIT),
  ]);

  if (createdAtQuery.error) throw createdAtQuery.error;
  if (sharedAtQuery.error) {
    console.warn("기도 요청 공유 시각 정렬 조회 실패:", sharedAtQuery.error.message);
  }
  if (answeredAtQuery.error) {
    console.warn("기도 응답 완료 시각 정렬 조회 실패:", answeredAtQuery.error.message);
  }

  return sortPrayerFeedRows(
    mergeRowsById([
      createdAtQuery.data ?? [],
      sharedAtQuery.error ? [] : (sharedAtQuery.data ?? []),
      answeredAtQuery.error ? [] : (answeredAtQuery.data ?? []),
    ]),
  );
}

function latestSharedContentTime(rows?: any[] | null): string | null {
  if (!rows || rows.length === 0) return null;
  return rows
    .map(sharedContentTime)
    .filter(Boolean)
    .sort(
      (a, b) =>
        new Date(b as string).getTime() - new Date(a as string).getTime(),
    )[0] as string | null;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values.filter(
        (value): value is string =>
          typeof value === "string" && value.length > 0,
      ),
    ),
  );
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size)
    chunks.push(items.slice(i, i + size));
  return chunks;
}

async function fetchContentRowsByIds(
  supabase: ReturnType<typeof createClient>,
  table: "qt_records" | "prayer_items",
  ids: string[],
) {
  const rows: any[] = [];
  for (const chunk of chunkArray(ids, 100)) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .in("id", chunk);
    if (error) throw error;
    rows.push(...(data ?? []));
  }
  return rows;
}

function groupIdsFromVisibility(
  value: string | null | undefined,
  allowedGroupIds: Set<string>,
) {
  return String(value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.startsWith("group_"))
    .map((part) => part.replace(/^group_/, ""))
    .filter((groupId) => allowedGroupIds.has(groupId));
}

function addLatestTime(
  target: Record<string, string | null>,
  groupId: string,
  time: string | null,
) {
  if (!time) return;
  if (
    !target[groupId] ||
    new Date(time).getTime() > new Date(target[groupId] as string).getTime()
  ) {
    target[groupId] = time;
  }
}

async function fetchGroupMemberCounts(
  supabase: ReturnType<typeof createClient>,
  groupIds: string[],
) {
  const counts: Record<string, number> = {};
  if (groupIds.length === 0) return counts;

  for (const chunk of chunkArray(groupIds, 100)) {
    const { data, error } = await supabase
      .from("group_members")
      .select("group_id")
      .in("group_id", chunk);

    if (error) {
      console.warn("그룹 멤버 수 일괄 조회 실패:", error.message);
      continue;
    }

    (data ?? []).forEach((row: any) => {
      const groupId = String(row.group_id ?? "");
      if (groupId) counts[groupId] = (counts[groupId] ?? 0) + 1;
    });
  }

  return counts;
}

async function fetchLatestQtTimesByGroup(
  supabase: ReturnType<typeof createClient>,
  groupIds: string[],
) {
  const latestByGroup: Record<string, string | null> = {};
  const allowedGroupIds = new Set(groupIds);
  if (groupIds.length === 0) return latestByGroup;

  for (const chunk of chunkArray(groupIds, 35)) {
    const visibilityFilter = chunk
      .map((groupId) => `visibility.ilike.%group_${groupId}%`)
      .join(",");
    const limit = Math.min(1000, Math.max(200, chunk.length * 25));
    let createdAtRows: any[] = [];
    let sharedAtRows: any[] = [];

    const createdAt = await supabase
      .from("qt_records")
      .select("id,visibility,created_at,shared_at")
      .or(visibilityFilter)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (createdAt.error) {
      if (/shared_at/i.test(createdAt.error.message ?? "")) {
        const fallback = await supabase
          .from("qt_records")
          .select("id,visibility,created_at")
          .or(visibilityFilter)
          .order("created_at", { ascending: false })
          .limit(limit);
        if (fallback.error) {
          console.warn(
            "그룹 최신 묵상 fallback 조회 실패:",
            fallback.error.message,
          );
          continue;
        }
        createdAtRows = fallback.data ?? [];
      } else {
        console.warn(
          "그룹 최신 묵상 created_at 조회 실패:",
          createdAt.error.message,
        );
        continue;
      }
    } else {
      createdAtRows = createdAt.data ?? [];
    }

    const withSharedAt = await supabase
      .from("qt_records")
      .select("id,visibility,created_at,shared_at")
      .or(visibilityFilter)
      .order("shared_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (withSharedAt.error) {
      if (!/shared_at/i.test(withSharedAt.error.message ?? "")) {
        console.warn(
          "그룹 최신 묵상 shared_at 조회 실패:",
          withSharedAt.error.message,
        );
      }
    } else {
      sharedAtRows = withSharedAt.data ?? [];
    }

    mergeRowsById([createdAtRows, sharedAtRows]).forEach((row: any) => {
      const time = qtUnreadActivityTime(row);
      groupIdsFromVisibility(row.visibility, allowedGroupIds).forEach(
        (groupId) => addLatestTime(latestByGroup, groupId, time),
      );
    });
  }

  return latestByGroup;
}

async function fetchLatestPrayerTimesByGroup(
  supabase: ReturnType<typeof createClient>,
  groupIds: string[],
) {
  const latestByGroup: Record<string, string | null> = {};
  const allowedGroupIds = new Set(groupIds);
  if (groupIds.length === 0) return latestByGroup;

  for (const chunk of chunkArray(groupIds, 35)) {
    const visibilityFilter = chunk
      .map((groupId) => `visibility.ilike.%group_${groupId}%`)
      .join(",");
    const limit = Math.min(1000, Math.max(200, chunk.length * 25));
    const [createdAtResult, sharedAtResult, answeredAtResult] =
      await Promise.all([
        supabase
          .from("prayer_items")
          .select("id,visibility,created_at,shared_at,answered_at,is_answered")
          .or(visibilityFilter)
          .order("created_at", { ascending: false })
          .limit(limit),
        supabase
          .from("prayer_items")
          .select("id,visibility,created_at,shared_at,answered_at,is_answered")
          .or(visibilityFilter)
          .eq("is_answered", false)
          .order("shared_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
          .limit(limit),
        supabase
          .from("prayer_items")
          .select("id,visibility,created_at,shared_at,answered_at,is_answered")
          .or(visibilityFilter)
          .eq("is_answered", true)
          .order("answered_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
          .limit(limit),
      ]);

    if (createdAtResult.error) {
      console.warn(
        "그룹 최신 기도 created_at 조회 실패:",
        createdAtResult.error.message,
      );
      continue;
    }
    if (sharedAtResult.error) {
      console.warn(
        "그룹 최신 기도 shared_at 조회 실패:",
        sharedAtResult.error.message,
      );
    }
    if (answeredAtResult.error) {
      console.warn(
        "그룹 최신 기도 answered_at 조회 실패:",
        answeredAtResult.error.message,
      );
    }

    mergeRowsById([
      createdAtResult.data ?? [],
      sharedAtResult.error ? [] : (sharedAtResult.data ?? []),
      answeredAtResult.error ? [] : (answeredAtResult.data ?? []),
    ]).forEach((row: any) => {
      const time = prayerUnreadActivityTime(row);
      groupIdsFromVisibility(row.visibility, allowedGroupIds).forEach(
        (groupId) => addLatestTime(latestByGroup, groupId, time),
      );
    });
  }

  return latestByGroup;
}

function sortGroupsForDisplay(groups: any[]) {
  return [...groups].sort((a, b) => {
    const aIsMember = !!a.isMember;
    const bIsMember = !!b.isMember;
    const aHasNew = !!(a.hasNewContent ?? a.hasNewQt);
    const bHasNew = !!(b.hasNewContent ?? b.hasNewQt);

    // 참여하지 않은 공개 그룹은 새글이 있어도 내가 참여한 그룹 위로 올라오지 않게 항상 아래에 둔다.
    if (aIsMember !== bIsMember) return aIsMember ? -1 : 1;

    if (aIsMember && bIsMember) {
      if (!!a.isFavorite !== !!b.isFavorite) return a.isFavorite ? -1 : 1;
      if (aHasNew !== bHasNew) return aHasNew ? -1 : 1;
    }

    return (
      new Date(b.created_at ?? 0).getTime() -
      new Date(a.created_at ?? 0).getTime()
    );
  });
}

function sortPartnersForDisplay(partners: any[]) {
  return [...partners].sort((a, b) => {
    const aHasNew = !!a.hasNewContent;
    const bHasNew = !!b.hasNewContent;
    if (!!a.isFavorite !== !!b.isFavorite) return a.isFavorite ? -1 : 1;
    if (aHasNew !== bHasNew) return aHasNew ? -1 : 1;
    return (
      new Date(
        b.latest_partner_activity_at ??
          b.responded_at ??
          b.updated_at ??
          b.created_at ??
          0,
      ).getTime() -
      new Date(
        a.latest_partner_activity_at ??
          a.responded_at ??
          a.updated_at ??
          a.created_at ??
          0,
      ).getTime()
    );
  });
}

function favoriteCacheKey(userId: string) {
  return `roots_group_favorites_${userId}`;
}

function readFavoriteCache(userId: string): string[] {
  return storageGetJson<string[]>(favoriteCacheKey(userId), []);
}

function writeFavoriteCache(userId: string, groupIds: string[]) {
  storageSetJson(favoriteCacheKey(userId), Array.from(new Set(groupIds)));
}

function updateFavoriteCache(
  userId: string,
  groupId: string,
  isFavorite: boolean,
) {
  const current = readFavoriteCache(userId);
  const next = isFavorite
    ? Array.from(new Set([...current, groupId]))
    : current.filter((id) => id !== groupId);
  writeFavoriteCache(userId, next);
}

function isCharacterProfileAvatarUrl(url?: string | null) {
  if (!url) return false;
  try {
    return decodeURIComponent(new URL(url, APP_URL).pathname).endsWith(
      "/character-avatar.png",
    );
  } catch {
    return url.split("?")[0].endsWith("/character-avatar.png");
  }
}

function Avatar({
  url,
  name,
  size = 28,
}: {
  url?: string;
  name?: string;
  size?: number;
  emoji?: string;
}) {
  const safeAvatarStyle = {
    width: size,
    height: size,
    borderRadius: "50%",
    objectFit: "cover",
    flexShrink: 0,
    userSelect: "none",
    WebkitTouchCallout: "none",
  } as const;

  if (url)
    return (
      <img
        src={url}
        alt={name ?? COMMUNITY_LOCAL_TEXT[lang].profileAlt}
        decoding="async"
        draggable={false}
        onDragStart={(event) => event.preventDefault()}
        onContextMenu={(event) => event.preventDefault()}
        style={safeAvatarStyle}
      />
    );
  const initial = (name?.trim()?.[0] ?? "R").toUpperCase();
  return (
    <div
      onContextMenu={(event) => event.preventDefault()}
      style={{
        ...safeAvatarStyle,
        background: "var(--sage-light)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          fontSize: size * 0.36,
          fontWeight: 800,
          color: "var(--sage-dark)",
        }}
      >
        {initial}
      </span>
    </div>
  );
}

function GroupManagementModal({
  children,
  onClose,
  busy = false,
  danger = false,
  sheet = false,
  zIndex = 225,
}: {
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
  danger?: boolean;
  sheet?: boolean;
  zIndex?: number;
}) {
  return (
    <div
      role="presentation"
      onClick={() => !busy && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex,
        background: sheet
          ? "var(--community-overlay-sheet)"
          : "var(--community-overlay-modal)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: sheet ? "flex-end" : "center",
        justifyContent: "center",
        padding: sheet ? "0 14px 18px" : "0 22px",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: sheet ? 430 : 370,
          maxHeight: sheet ? "82vh" : "88vh",
          overflowY: "auto",
          background: "var(--community-modal-surface)",
          borderRadius: 24,
          padding: 22,
          border: `1px solid ${
            danger
              ? "var(--community-danger-border)"
              : "var(--community-card-border)"
          }`,
          boxShadow: sheet ? "var(--shadow-sheet)" : "var(--shadow-modal)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

const SECTIONS: {
  key: string;
  labelKey: TKey;
  sundayLabelKey?: TKey;
  italic?: boolean;
  isDecision?: boolean;
}[] = [
  { key: "opening_prayer", labelKey: "community_qt_section_opening_prayer" },
  {
    key: "summary",
    labelKey: "community_qt_section_summary",
    sundayLabelKey: "community_qt_section_sermon_summary",
  },
  {
    key: "key_verse",
    labelKey: "community_qt_section_key_verse",
    italic: true,
  },
  { key: "meditation", labelKey: "community_qt_section_meditation" },
  { key: "application", labelKey: "community_qt_section_application" },
  {
    key: "decision",
    labelKey: "community_qt_section_decision",
    isDecision: true,
  },
  { key: "closing_prayer", labelKey: "community_qt_section_closing_prayer" },
];

type CommunityModalHistoryKind = "qt-detail" | "photo-viewer";
type CommunityMainTab = "partner" | "group" | "all";

function CommunityPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<CommunityMainTab>(() => {
    const initialTab = searchParams.get("tab");
    if (initialTab === "group" || initialTab === "all") return initialTab;
    return "partner";
  });
  const [allTab, setAllTab] = useState<"qt" | "praying" | "answered">("qt");
  const lang = useLang();
  const [badgePopup, setBadgePopup] = useState<{
    img: string;
    title: string;
    msg: string;
  } | null>(null);
  const [loveHeartToast, setLoveHeartToast] = useState<string | null>(null);
  const loveHeartToastTimerRef = useRef<number | null>(null);
  const loveHeartHapticPendingRef = useRef<Set<string>>(new Set());
  const [reflectionNudgeStatus, setReflectionNudgeStatus] =
    useState<ReflectionNudgeStatus>(EMPTY_REFLECTION_NUDGE_STATUS);
  const [reflectionNudgeStatusLoaded, setReflectionNudgeStatusLoaded] =
    useState(false);
  const [reflectionNudgeSendingKeys, setReflectionNudgeSendingKeys] = useState<
    string[]
  >([]);
  const [reflectionNudgeWavingKey, setReflectionNudgeWavingKey] = useState<
    string | null
  >(null);
  const [reflectionNudgeToast, setReflectionNudgeToast] = useState<
    string | null
  >(null);
  const reflectionNudgeToastTimerRef = useRef<number | null>(null);
  const reflectionNudgeWaveTimerRef = useRef<number | null>(null);
  const [prayers, setPrayers] = useState<any[]>([]);
  const [answeredPrayers, setAnsweredPrayers] = useState<any[]>([]);
  const [qtShares, setQtShares] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<any | null>(null);
  const [partnerDetailTab, setPartnerDetailTab] = useState<
    "qt" | "praying" | "answered"
  >("qt");
  const [partnerQts, setPartnerQts] = useState<any[]>([]);
  const [partnerPrayers, setPartnerPrayers] = useState<any[]>([]);
  const [loadingPartnerQts, setLoadingPartnerQts] = useState(false);
  const [loadingPartnerPrayers, setLoadingPartnerPrayers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // 중보기도
  const [prayedIds, setPrayedIds] = useState<string[]>([]);

  // 기도 응답 좋아요: user_id + prayer_id 기준으로 1회만 허용
  const [likedPrayerIds, setLikedPrayerIds] = useState<string[]>([]);

  // 묵상 반응 DB ID는 기존 데이터 호환을 위해 bless / cheer / pray를 유지합니다.
  const [qtReactionCounts, setQtReactionCounts] = useState<
    Record<string, Record<string, number>>
  >({});
  // 사용자에게는 아멘! / 축복해요! / 기도해요로 표시합니다.
  const [myQtReactions, setMyQtReactions] = useState<Record<string, string>>(
    {},
  );
  const [qtPhotoUrls, setQtPhotoUrls] = useState<Record<string, string>>({});
  const qtPhotoUrlRequestingRef = useRef<Set<string>>(new Set());

  // 그룹
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [savingGroup, setSavingGroup] = useState(false);
  const [publicGroupHideConfirm, setPublicGroupHideConfirm] =
    useState<any | null>(null);
  const [hidingPublicGroup, setHidingPublicGroup] = useState(false);
  const [publicGroupHideError, setPublicGroupHideError] = useState<
    string | null
  >(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showChallengeRequestForm, setShowChallengeRequestForm] =
    useState(false);
  const [challengeTitle, setChallengeTitle] = useState("");
  const [challengeStartDate, setChallengeStartDate] = useState("");
  const [challengeEndDate, setChallengeEndDate] = useState("");
  const [challengeDescription, setChallengeDescription] = useState("");
  const [challengeBadgeIdea, setChallengeBadgeIdea] = useState("");
  const [challengeContactEmail, setChallengeContactEmail] = useState("");
  const [challengeExtraQuestions, setChallengeExtraQuestions] = useState("");
  const [challengeSaving, setChallengeSaving] = useState(false);
  const [challengeError, setChallengeError] = useState("");
  const [challengeSuccess, setChallengeSuccess] = useState(false);
  const [groupChallenges, setGroupChallenges] = useState<any[]>([]);
  const [groupChallengeProgress, setGroupChallengeProgress] = useState<
    Record<string, { doneDays: number; totalDays: number }>
  >({});
  const [myGroupChallengeRequests, setMyGroupChallengeRequests] = useState<
    Record<string, GroupChallengeRequestSummary>
  >({});
  const [loadingGroupChallenges, setLoadingGroupChallenges] = useState(false);
  const [companionChallengeStatus, setCompanionChallengeStatus] =
    useState<CompanionChallengeStatus | null>(null);
  const [loadingCompanionChallenge, setLoadingCompanionChallenge] =
    useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [groupQts, setGroupQts] = useState<any[]>([]);
  const [groupPrayers, setGroupPrayers] = useState<any[]>([]);
  const [groupDetailTab, setGroupDetailTab] = useState<
    "qt" | "praying" | "answered"
  >("qt");
  const [loadingGroupQts, setLoadingGroupQts] = useState(false);
  const [loadingGroupPrayers, setLoadingGroupPrayers] = useState(false);
  const [leavingGroup, setLeavingGroup] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showGroupActionMenu, setShowGroupActionMenu] = useState(false);
  const [showGroupMembers, setShowGroupMembers] = useState(false);
  const [groupMemberProfiles, setGroupMemberProfiles] = useState<
    GroupMemberProfile[]
  >([]);
  const [loadingGroupMembers, setLoadingGroupMembers] = useState(false);
  const [showGroupEdit, setShowGroupEdit] = useState(false);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupDesc, setEditGroupDesc] = useState("");
  const [editGroupIsPublic, setEditGroupIsPublic] = useState(true);
  const [savingGroupEdit, setSavingGroupEdit] = useState(false);
  const [groupEditError, setGroupEditError] = useState<string | null>(null);
  const [showLeadershipTransfer, setShowLeadershipTransfer] = useState(false);
  const [leadershipTransferStep, setLeadershipTransferStep] = useState<
    "select" | "confirm"
  >("select");
  const [leadershipTransferTargetId, setLeadershipTransferTargetId] = useState<
    string | null
  >(null);
  const [transferringLeadership, setTransferringLeadership] = useState(false);
  const [leadershipTransferError, setLeadershipTransferError] = useState<
    string | null
  >(null);
  const [memberRemovalTarget, setMemberRemovalTarget] =
    useState<GroupMemberProfile | null>(null);
  const [removingGroupMember, setRemovingGroupMember] = useState(false);
  const [memberRemovalError, setMemberRemovalError] = useState<string | null>(
    null,
  );
  const [showDeleteGroupConfirm, setShowDeleteGroupConfirm] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [deleteGroupError, setDeleteGroupError] = useState<string | null>(null);
  const [favoriteSavingIds, setFavoriteSavingIds] = useState<string[]>([]);
  const [partnerFavoriteSavingIds, setPartnerFavoriteSavingIds] = useState<
    string[]
  >([]);
  const [detailQt, setDetailQt] = useState<any | null>(null);
  const [manageModal, setManageModal] = useState<null | {
    kind: "qt-unshare" | "qt-edit" | "prayer-unshare" | "prayer-edit";
    item: any;
    scope?: ShareScope;
    groupId?: string;
    partnerId?: string;
  }>(null);
  const [manageText, setManageText] = useState("");
  const [manageSaving, setManageSaving] = useState(false);
  const [actionMenu, setActionMenu] = useState<null | {
    kind: "qt" | "prayer";
    item: any;
    scope?: ShareScope;
    groupId?: string;
    partnerId?: string;
  }>(null);
  const [safetyConfirm, setSafetyConfirm] = useState<null | {
    action: "report" | "hide-item" | "hide-author";
    kind: "qt" | "prayer";
    item: any;
  }>(null);
  const [safetyActionError, setSafetyActionError] = useState<string | null>(
    null,
  );
  const [hiddenKeys, setHiddenKeys] = useState<string[]>([]);
  const [hiddenUserIds, setHiddenUserIds] = useState<string[]>([]);
  const [visibleFeedCounts, setVisibleFeedCounts] = useState<
    Record<string, number>
  >({});
  const [allSectionSeenAt, setAllSectionSeenAt] = useState<
    Record<CommunitySectionKey, string | null>
  >({ qt: null, praying: null, answered: null });
  const [profileModal, setProfileModal] = useState<null | {
    profile: any;
    userId: string;
    relationStatus:
      | "loading"
      | "self"
      | "none"
      | "accepted"
      | "pending_sent"
      | "pending_received"
      | "declined";
    relationId?: string;
    saving?: boolean;
  }>(null);
  const [photoViewer, setPhotoViewer] = useState<null | {
    src: string;
    alt?: string;
  }>(null);
  const communityDetailHistoryRef = useRef<"partner" | "group" | null>(null);
  const communityModalHistoryStackRef = useRef<CommunityModalHistoryKind[]>([]);
  const qtDetailScrollRef = useRef<HTMLDivElement | null>(null);
  const handledNotificationRouteRef = useRef<string | null>(null);
  const directPrayerFocusRef = useRef<string | null>(null);
  const directPrayerHighlightTimerRef = useRef<number | null>(null);
  const [notificationDirectOpenPending, setNotificationDirectOpenPending] =
    useState(() => !!parseCommunityNotificationDirectTarget(searchParams));
  const [directPrayerTargetId, setDirectPrayerTargetId] = useState<
    string | null
  >(null);

  const c = (key: TKey, vars?: Record<string, string | number>) =>
    t(key, lang, vars);
  const reflectionNudgeText = getReflectionNudgeText(lang);
  const groupLeaderText = getGroupLeaderText(lang);
  const groupChallengeRequestText = getGroupChallengeRequestText(lang);

  function showLoveHeartToast(sourceType: LoveHeartSourceType) {
    if (loveHeartToastTimerRef.current)
      window.clearTimeout(loveHeartToastTimerRef.current);
    setLoveHeartToast(getLoveHeartToastText(sourceType, lang));
    loveHeartToastTimerRef.current = window.setTimeout(() => {
      setLoveHeartToast(null);
      loveHeartToastTimerRef.current = null;
    }, 2200);
  }

  function beginLoveHeartTapHaptic(
    sourceType: LoveHeartSourceType,
    sourceId: string,
  ) {
    const key = `${sourceType}:${sourceId}`;
    if (loveHeartHapticPendingRef.current.has(key)) return null;
    loveHeartHapticPendingRef.current.add(key);
    void triggerLoveHeartTapHapticBestEffort();
    return key;
  }

  function finishLoveHeartTapHaptic(key: string | null) {
    if (!key) return;
    loveHeartHapticPendingRef.current.delete(key);
  }

  async function awardCommunityLoveHeart(
    supabase: any,
    sourceType: LoveHeartSourceType,
    sourceId: string,
  ) {
    try {
      const result = await awardLoveHeartOnce(supabase, sourceType, sourceId);
      if (result?.awarded) showLoveHeartToast(sourceType);
    } catch (error) {
      console.warn("사랑 하트 적립 실패:", error);
    }
  }

  function renderLoveHeartToast() {
    if (!loveHeartToast) return null;
    return (
      <div
        style={{
          position: "fixed",
          top: "calc(18px + var(--safe-area-top))",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 240,
          background: "var(--community-toast-surface)",
          color: "var(--community-toast-text)",
          border: "1px solid var(--community-toast-border)",
          borderRadius: 999,
          padding: "10px 16px",
          fontSize: 13,
          fontWeight: 800,
          boxShadow: "var(--shadow-toast)",
          whiteSpace: "nowrap",
          maxWidth: "calc(100vw - 32px)",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {loveHeartToast}
      </div>
    );
  }

  function showReflectionNudgeToast(message: string) {
    if (reflectionNudgeToastTimerRef.current) {
      window.clearTimeout(reflectionNudgeToastTimerRef.current);
    }
    setReflectionNudgeToast(message);
    reflectionNudgeToastTimerRef.current = window.setTimeout(() => {
      setReflectionNudgeToast(null);
      reflectionNudgeToastTimerRef.current = null;
    }, 2400);
  }

  function renderReflectionNudgeToast() {
    if (!reflectionNudgeToast) return null;
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          position: "fixed",
          top: "calc(18px + var(--safe-area-top))",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 241,
          background: "var(--community-toast-surface)",
          color: "var(--community-toast-text)",
          border: "1px solid var(--community-toast-border)",
          borderRadius: 999,
          padding: "10px 16px",
          fontSize: 13,
          fontWeight: 800,
          boxShadow: "var(--shadow-toast)",
          whiteSpace: "nowrap",
          maxWidth: "calc(100vw - 32px)",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {reflectionNudgeToast}
      </div>
    );
  }

  function normalizeStringArray(value: unknown) {
    if (!Array.isArray(value)) return [];
    return Array.from(
      new Set(
        value.filter(
          (item): item is string =>
            typeof item === "string" && item.length > 0,
        ),
      ),
    );
  }

  async function loadReflectionNudgeStatus() {
    setReflectionNudgeStatusLoaded(false);
    try {
      const params = new URLSearchParams({
        localDate: getLocalDateString(),
      });
      const response = await fetch(`/api/reflection-nudges?${params}`, {
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error || "Reflection nudge status failed");
      }
      setReflectionNudgeStatus({
        partnerCompletedIds: normalizeStringArray(
          result?.partnerCompletedIds,
        ),
        groupUnavailableIds: normalizeStringArray(
          result?.groupUnavailableIds,
        ),
        partnerSentIds: normalizeStringArray(result?.partnerSentIds),
        groupSentIds: normalizeStringArray(result?.groupSentIds),
      });
      setReflectionNudgeStatusLoaded(true);
    } catch (error) {
      console.warn("묵상 넛지 상태 조회 실패:", error);
      setReflectionNudgeStatus(EMPTY_REFLECTION_NUDGE_STATUS);
    }
  }

  function addReflectionNudgeStatusId(
    key: keyof ReflectionNudgeStatus,
    id: string,
  ) {
    setReflectionNudgeStatus((current) => ({
      ...current,
      [key]: Array.from(new Set([...current[key], id])),
    }));
  }

  async function sendReflectionNudge(
    scope: "group" | "partner",
    targetId: string,
    displayName: string,
    event: React.MouseEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    event.stopPropagation();
    const sendingKey = `${scope}:${targetId}`;
    if (
      !reflectionNudgeStatusLoaded ||
      reflectionNudgeSendingKeys.includes(sendingKey)
    ) {
      return;
    }

    setReflectionNudgeSendingKeys((current) => [
      ...current,
      sendingKey,
    ]);
    setReflectionNudgeWavingKey(sendingKey);
    if (reflectionNudgeWaveTimerRef.current) {
      window.clearTimeout(reflectionNudgeWaveTimerRef.current);
    }
    reflectionNudgeWaveTimerRef.current = window.setTimeout(() => {
      setReflectionNudgeWavingKey(null);
      reflectionNudgeWaveTimerRef.current = null;
    }, 700);
    void triggerReflectionNudgeHapticBestEffort();

    try {
      const response = await fetch("/api/reflection-nudges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          targetId,
          localDate: getLocalDateString(),
        }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (result?.code === "already_sent") {
          addReflectionNudgeStatusId(
            scope === "group" ? "groupSentIds" : "partnerSentIds",
            targetId,
          );
          showReflectionNudgeToast(
            reflectionNudgeText.alreadySentNotice,
          );
          return;
        }
        if (result?.code === "completed" && scope === "partner") {
          addReflectionNudgeStatusId("partnerCompletedIds", targetId);
          showReflectionNudgeToast(
            reflectionNudgeText.completedNotice,
          );
          return;
        }
        if (result?.code === "all_completed" && scope === "group") {
          addReflectionNudgeStatusId("groupUnavailableIds", targetId);
          showReflectionNudgeToast(
            reflectionNudgeText.groupCompletedNotice,
          );
          return;
        }
        throw new Error(result?.error || "Reflection nudge failed");
      }

      addReflectionNudgeStatusId(
        scope === "group" ? "groupSentIds" : "partnerSentIds",
        targetId,
      );
      showReflectionNudgeToast(
        scope === "group"
          ? reflectionNudgeText.groupSuccess(displayName)
          : reflectionNudgeText.partnerSuccess(displayName),
      );
    } catch (error) {
      console.warn("묵상 넛지 발송 실패:", error);
      showReflectionNudgeToast(reflectionNudgeText.failed);
    } finally {
      setReflectionNudgeSendingKeys((current) =>
        current.filter((key) => key !== sendingKey),
      );
    }
  }

  function renderReflectionNudgeButton(
    scope: "group" | "partner",
    targetId: string,
    displayName: string,
  ) {
    const sendingKey = `${scope}:${targetId}`;
    const sending = reflectionNudgeSendingKeys.includes(sendingKey);
    const sent =
      scope === "group"
        ? reflectionNudgeStatus.groupSentIds.includes(targetId)
        : reflectionNudgeStatus.partnerSentIds.includes(targetId);
    const completed =
      scope === "group"
        ? reflectionNudgeStatus.groupUnavailableIds.includes(targetId)
        : reflectionNudgeStatus.partnerCompletedIds.includes(targetId);
    const disabled =
      !reflectionNudgeStatusLoaded || sending || sent || completed;
    const waving = reflectionNudgeWavingKey === sendingKey;

    let label =
      scope === "group"
        ? reflectionNudgeText.sendGroup(displayName)
        : reflectionNudgeText.sendPartner(displayName);
    if (!reflectionNudgeStatusLoaded) {
      label = reflectionNudgeText.loading;
    } else if (sending) {
      label = reflectionNudgeText.sending;
    } else if (sent) {
      label = reflectionNudgeText.alreadySent;
    } else if (completed) {
      label =
        scope === "group"
          ? reflectionNudgeText.groupCompleted(displayName)
          : reflectionNudgeText.partnerCompleted(displayName);
    }

    return (
      <button
        data-reflection-nudge-button="true"
        type="button"
        disabled={disabled}
        onClick={(event) =>
          sendReflectionNudge(scope, targetId, displayName, event)
        }
        aria-label={label}
        title={label}
        style={{
          width: 38,
          height: 38,
          borderRadius: 999,
          border: `1px solid ${
            disabled && !waving
              ? "var(--community-card-border)"
              : "var(--community-gold-border)"
          }`,
          background: "transparent",
          color: disabled && !waving
            ? "var(--text3)"
            : "var(--community-gold-text)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: disabled ? "default" : "pointer",
          opacity: disabled && !waving ? 0.42 : 1,
          flexShrink: 0,
          padding: 0,
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
        }}
      >
        <span
          aria-hidden="true"
          className={waving ? "reflection-nudge-wave" : undefined}
          style={{
            width: 24,
            height: 24,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
          }}
        >
          <Image
            src="/images/community/reflection-nudge-wave-hand.png"
            alt=""
            width={24}
            height={24}
            draggable={false}
          />
        </span>
      </button>
    );
  }

  useEffect(() => {
    return () => {
      if (loveHeartToastTimerRef.current)
        window.clearTimeout(loveHeartToastTimerRef.current);
      if (reflectionNudgeToastTimerRef.current) {
        window.clearTimeout(reflectionNudgeToastTimerRef.current);
      }
      if (reflectionNudgeWaveTimerRef.current) {
        window.clearTimeout(reflectionNudgeWaveTimerRef.current);
      }
    };
  }, []);

  function normalizeCommunitySection(
    value: string | null,
  ): CommunitySectionKey {
    if (value === "praying" || value === "answered") return value;
    return "qt";
  }

  function isCommunityMainTab(value: unknown): value is CommunityMainTab {
    return value === "partner" || value === "group" || value === "all";
  }

  function selectCommunityMainTab(nextTab: CommunityMainTab) {
    if (nextTab === tab) return;

    if (typeof window !== "undefined") {
      try {
        const currentState =
          window.history.state && typeof window.history.state === "object"
            ? window.history.state
            : {};
        window.history.pushState(
          { ...currentState, rootsCommunityTab: nextTab },
          "",
          window.location.href,
        );
      } catch {
        // The visual tab still changes if a browser refuses history mutation.
      }
    }

    setTab(nextTab);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const currentState =
        window.history.state && typeof window.history.state === "object"
          ? window.history.state
          : {};
      if (currentState.rootsCommunityTab === tab) return;
      window.history.replaceState(
        { ...currentState, rootsCommunityTab: tab },
        "",
        window.location.href,
      );
    } catch {
      // Keep navigation functional even if history state is unavailable.
    }
  }, [tab]);

  function pushCommunityDetailHistory(kind: "partner" | "group") {
    if (typeof window === "undefined") return;
    if (communityDetailHistoryRef.current) return;
    try {
      const currentState =
        window.history.state && typeof window.history.state === "object"
          ? window.history.state
          : {};
      window.history.pushState(
        { ...currentState, rootsCommunityDetail: kind },
        "",
        window.location.href,
      );
      communityDetailHistoryRef.current = kind;
    } catch {
      communityDetailHistoryRef.current = kind;
    }
  }

  function clearCommunityDetailHistory(kind?: "partner" | "group") {
    if (!kind || communityDetailHistoryRef.current === kind)
      communityDetailHistoryRef.current = null;
  }

  function pushCommunityModalHistory(kind: CommunityModalHistoryKind) {
    if (typeof window === "undefined") return;
    const stack = communityModalHistoryStackRef.current;
    if (stack[stack.length - 1] === kind) return;
    try {
      const currentState =
        window.history.state && typeof window.history.state === "object"
          ? window.history.state
          : {};
      window.history.pushState(
        { ...currentState, rootsCommunityModal: kind },
        "",
        window.location.href,
      );
      communityModalHistoryStackRef.current = [...stack, kind];
    } catch {
      communityModalHistoryStackRef.current = [...stack, kind];
    }
  }

  function popCommunityModalHistory() {
    const stack = communityModalHistoryStackRef.current;
    const activeModal = stack[stack.length - 1] ?? null;
    if (activeModal) communityModalHistoryStackRef.current = stack.slice(0, -1);
    return activeModal;
  }

  function clearCommunityModalHistory(kind?: CommunityModalHistoryKind) {
    if (!kind) {
      communityModalHistoryStackRef.current = [];
      return;
    }
    const stack = communityModalHistoryStackRef.current;
    if (stack[stack.length - 1] === kind) {
      communityModalHistoryStackRef.current = stack.slice(0, -1);
      return;
    }
    communityModalHistoryStackRef.current = stack.filter(
      (item) => item !== kind,
    );
  }

  function openQtDetail(record: any) {
    setActionMenu(null);
    pushCommunityModalHistory("qt-detail");
    setDetailQt(record);
  }

  function scrollQtDetailToTop(qtId: string) {
    if (detailQt?.id !== qtId) return;
    window.requestAnimationFrame(() => {
      qtDetailScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function resetQtDetailState() {
    clearCommunityModalHistory("qt-detail");
    setDetailQt(null);
  }

  function closeQtDetail() {
    const stack = communityModalHistoryStackRef.current;
    if (
      stack[stack.length - 1] === "qt-detail" &&
      typeof window !== "undefined"
    ) {
      window.history.back();
      return;
    }
    resetQtDetailState();
  }

  function openPhotoViewer(src: string, alt?: string) {
    pushCommunityModalHistory("photo-viewer");
    setPhotoViewer({ src, alt: alt || COMMUNITY_LOCAL_TEXT[lang].photoAlt });
  }

  function resetPhotoViewerState() {
    clearCommunityModalHistory("photo-viewer");
    setPhotoViewer(null);
  }

  function closePhotoViewer() {
    const stack = communityModalHistoryStackRef.current;
    if (
      stack[stack.length - 1] === "photo-viewer" &&
      typeof window !== "undefined"
    ) {
      window.history.back();
      return;
    }
    resetPhotoViewerState();
  }

  useEffect(() => {
    function handleCommunityPopState(event: PopStateEvent) {
      const activeModal = popCommunityModalHistory();
      if (activeModal === "photo-viewer") {
        setPhotoViewer(null);
        return;
      }
      if (activeModal === "qt-detail") {
        setDetailQt(null);
        return;
      }

      const activeDetail = communityDetailHistoryRef.current;
      if (activeDetail === "partner") {
        clearCommunityDetailHistory("partner");
        resetPartnerDetailState();
        return;
      }
      if (activeDetail === "group") {
        clearCommunityDetailHistory("group");
        resetGroupDetailState();
        return;
      }

      const previousTab = event.state?.rootsCommunityTab;
      if (isCommunityMainTab(previousTab)) {
        setTab(previousTab);
      }
    }

    window.addEventListener("popstate", handleCommunityPopState);
    return () =>
      window.removeEventListener("popstate", handleCommunityPopState);
  }, []);

  function contentKey(kind: "qt" | "prayer", id: string) {
    return `${kind}:${id}`;
  }

  function filterHiddenItems(
    kind: "qt" | "prayer",
    rows: any[],
    keys = hiddenKeys,
    authorIds = hiddenUserIds,
  ) {
    return rows.filter(
      (row: any) =>
        !keys.includes(contentKey(kind, row.id)) &&
        !authorIds.includes(row.user_id),
    );
  }

  function visibilityTargets(value?: string | null) {
    return String(value ?? "private")
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part && part !== "private");
  }

  function removeVisibilityTarget(
    value: string | null | undefined,
    target: string,
  ) {
    const nextTargets = visibilityTargets(value).filter(
      (part) => part !== target,
    );
    return nextTargets.length > 0 ? nextTargets.join(",") : "private";
  }

  function memberCountText(count: number) {
    return c("community_member_count", { count });
  }

  function localDateInputValue(offsetDays = 1) {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatChallengeDate(value?: string | null) {
    if (!value) return "";
    return parseLocalDateString(value).toLocaleDateString(getDateLocale(lang), {
      month: "short",
      day: "numeric",
    });
  }

  function challengeDateRange(challenge: any) {
    const start = formatChallengeDate(challenge?.start_date);
    const end = formatChallengeDate(challenge?.end_date);
    if (start && end) return `${start} – ${end}`;
    return start || end || "";
  }

  function challengeDisplayStatus(
    challenge: any,
  ): "scheduled" | "active" | "completed" {
    const today = localDateInputValue(0);
    const start = String(challenge?.start_date ?? "");
    const end = String(challenge?.end_date ?? "");
    if (challenge?.status === "completed" || (end && today > end))
      return "completed";
    if (start && today < start) return "scheduled";
    return "active";
  }

  function challengeStatusLabel(challenge: any) {
    const status = challengeDisplayStatus(challenge);
    if (status === "completed") return c("group_challenge_status_completed");
    if (status === "scheduled") return c("group_challenge_status_scheduled");
    return c("group_challenge_status_active");
  }

  function dateToUtcDay(value?: string | null) {
    if (!value) return null;
    const [year, month, day] = String(value).split("-").map(Number);
    if (!year || !month || !day) return null;
    return Date.UTC(year, month - 1, day);
  }

  function utcDayToDateString(value: number) {
    return new Date(value).toISOString().slice(0, 10);
  }

  function challengeTotalDays(challenge: any) {
    const start = dateToUtcDay(challenge?.start_date);
    const end = dateToUtcDay(challenge?.end_date);
    if (start === null || end === null || end < start) return 0;
    return Math.floor((end - start) / 86400000) + 1;
  }

  function challengeProgressPercent(progress?: {
    doneDays: number;
    totalDays: number;
  }) {
    if (!progress?.totalDays) return 0;
    return Math.max(
      0,
      Math.min(100, Math.round((progress.doneDays / progress.totalDays) * 100)),
    );
  }

  function groupChallengeRequestFor(groupId?: string | null) {
    if (!groupId) return null;
    return myGroupChallengeRequests[groupId] ?? null;
  }

  function hasActiveGroupChallengeRequest(groupId?: string | null) {
    const status = groupChallengeRequestFor(groupId)?.status ?? null;
    return status === "pending" || status === "contacted";
  }

  function preparingApprovedGroupChallengeRequest(groupId?: string | null) {
    const request = groupChallengeRequestFor(groupId);
    if (request?.status !== "approved") return null;
    const requestId = request.id ? String(request.id) : "";
    if (!requestId) return request;
    const hasLinkedChallenge = groupChallenges.some(
      (challenge) => String(challenge?.request_id ?? "") === requestId,
    );
    return hasLinkedChallenge ? null : request;
  }

  function challengeRequestScheduleText(request: GroupChallengeRequestSummary) {
    const start = formatChallengeDate(request.requested_start_date);
    const endDate =
      request.requested_end_date ||
      deriveChallengeRequestEndDate(
        request.requested_start_date,
        request.duration_days,
      );
    const end = formatChallengeDate(endDate);
    if (start && end) {
      return formatGroupChallengeRequestText(
        getGroupChallengeRequestText(lang).preparingSchedule,
        { start, end },
      );
    }
    if (start) return c("group_challenge_preparing_start", { start });
    return c("group_challenge_preparing_pending");
  }

  function shouldShowGroupChallengeCard(challenge: any) {
    return challengeDisplayStatus(challenge) !== "completed";
  }

  function visibleGroupChallengeCards() {
    return groupChallenges.filter(shouldShowGroupChallengeCard);
  }

  function groupChallengeSectionTitleKey(challenges: any[]): TKey {
    if (
      challenges.length > 0 &&
      challenges.every(
        (challenge) => challengeDisplayStatus(challenge) === "completed",
      )
    ) {
      return "group_challenge_recent_completed_section_title";
    }
    return "group_challenge_approved_section_title";
  }

  function setGroupChallengeRequest(
    groupId: string,
    request?: GroupChallengeRequestSummary | null,
  ) {
    setMyGroupChallengeRequests((prev) => {
      const next = { ...prev };
      if (request?.status) next[groupId] = request;
      else delete next[groupId];
      return next;
    });
  }

  function setGroupChallengeRequestStatus(
    groupId: string,
    status?: string | null,
  ) {
    setGroupChallengeRequest(groupId, status ? { status } : null);
  }

  async function fetchGroupChallengeProgress(
    supabase: ReturnType<typeof createClient>,
    challenges: any[],
    currentUserId: string,
  ) {
    const datedChallenges = challenges.filter(
      (challenge) => challenge?.start_date && challenge?.end_date,
    );
    if (datedChallenges.length === 0)
      return {} as Record<string, { doneDays: number; totalDays: number }>;

    const startDates = datedChallenges
      .map((challenge) => String(challenge.start_date))
      .sort();
    const endDates = datedChallenges
      .map((challenge) => String(challenge.end_date))
      .sort();
    const minStart = startDates[0];
    const maxEnd = endDates[endDates.length - 1];

    const { data, error } = await supabase
      .from("qt_records")
      .select("date")
      .eq("user_id", currentUserId)
      .eq("is_draft", false)
      .gte("date", minStart)
      .lte("date", maxEnd);

    if (error) {
      console.warn("그룹 챌린지 진행도 조회 실패:", error.message);
      return {} as Record<string, { doneDays: number; totalDays: number }>;
    }

    const completedDates = new Set(
      (data ?? []).map((row: any) => String(row.date ?? "")).filter(Boolean),
    );
    const progress: Record<string, { doneDays: number; totalDays: number }> =
      {};

    datedChallenges.forEach((challenge) => {
      const id = String(challenge.id ?? "");
      const start = dateToUtcDay(challenge.start_date);
      const end = dateToUtcDay(challenge.end_date);
      if (!id || start === null || end === null || end < start) return;

      let doneDays = 0;
      for (let day = start; day <= end; day += 86400000) {
        if (completedDates.has(utcDayToDateString(day))) doneDays += 1;
      }
      progress[id] = { doneDays, totalDays: challengeTotalDays(challenge) };
    });

    return progress;
  }

  function companionChallengeBadgeImageSrc(path?: string | null) {
    return getCompanionChallengeBadgeImageSrc(path);
  }

  async function loadCompanionChallengeForPartner(
    supabase: ReturnType<typeof createClient>,
    partnerId: string,
  ) {
    if (!partnerId) return;
    setLoadingCompanionChallenge(true);
    setCompanionChallengeStatus(null);
    try {
      const today = localDateInputValue(0);
      const status = await loadCompanionChallengeStatus(
        supabase,
        partnerId,
        today,
      );
      setCompanionChallengeStatus(
        status?.endDate && today > status.endDate ? null : status,
      );
    } catch (error) {
      // The community tab should remain usable if production deploy happens before
      // the companion challenge SQL is applied, or when no active challenge exists.
      console.warn("동역자 챌린지 상태 조회 실패:", error);
      setCompanionChallengeStatus(null);
    } finally {
      setLoadingCompanionChallenge(false);
    }
  }

  function resetChallengeRequestForm() {
    setShowChallengeRequestForm(false);
    setChallengeError("");
    setChallengeSuccess(false);
    setChallengeTitle("");
    setChallengeStartDate("");
    setChallengeEndDate("");
    setChallengeDescription("");
    setChallengeBadgeIdea("");
    setChallengeExtraQuestions("");
  }

  function openChallengeRequestForm() {
    if (
      !selectedGroup?.id ||
      !selectedGroup.isMember ||
      !isGroupLeader(selectedGroup) ||
      hasActiveGroupChallengeRequest(selectedGroup.id)
    )
      return;
    const startDate = localDateInputValue(
      GROUP_CHALLENGE_REQUEST_MIN_LEAD_DAYS,
    );
    setChallengeError("");
    setChallengeSuccess(false);
    setChallengeTitle("");
    setChallengeStartDate(startDate);
    setChallengeEndDate(
      addDaysToDateInput(
        startDate,
        GROUP_CHALLENGE_REQUEST_DEFAULT_DURATION_DAYS - 1,
      ),
    );
    setChallengeDescription("");
    setChallengeBadgeIdea("");
    setChallengeExtraQuestions("");
    setShowChallengeRequestForm(true);
  }

  async function submitChallengeRequest() {
    if (
      !selectedGroup?.id ||
      !userId ||
      !isGroupLeader(selectedGroup) ||
      challengeSaving
    )
      return;
    const title = challengeTitle.trim();
    const email = challengeContactEmail.trim();
    const requestText = groupChallengeRequestText;
    if (!title || !challengeStartDate || !challengeEndDate || !email) {
      setChallengeError(requestText.requiredError);
      return;
    }

    const minimumStartDate = localDateInputValue(
      GROUP_CHALLENGE_REQUEST_MIN_LEAD_DAYS,
    );
    if (challengeStartDate < minimumStartDate) {
      setChallengeError(requestText.startTooSoonError);
      return;
    }

    const duration = inclusiveDateRangeDays(
      challengeStartDate,
      challengeEndDate,
    );
    if (duration < 1) {
      setChallengeError(requestText.invalidDateRangeError);
      return;
    }
    if (duration > GROUP_CHALLENGE_REQUEST_MAX_DURATION_DAYS) {
      setChallengeError(requestText.maxDurationError);
      return;
    }

    setChallengeSaving(true);
    setChallengeError("");
    try {
      const result = await requestGroupLeaderAction("request_challenge", {
        groupId: selectedGroup.id,
        requesterEmail: email,
        title,
        requestedStartDate: challengeStartDate,
        durationDays: duration,
        description: challengeDescription.trim(),
        badgeIdea: challengeBadgeIdea.trim(),
        extraQuestions: challengeExtraQuestions.trim(),
      });
      setGroupChallengeRequest(selectedGroup.id, {
        id: result.requestId,
        status: "pending",
        title,
        requested_start_date: challengeStartDate,
        requested_end_date: challengeEndDate,
        duration_days: duration,
        created_at: result.createdAt ?? new Date().toISOString(),
      });
      setChallengeSuccess(true);
    } catch (error) {
      console.error("group challenge request failed", error);
      if (
        error instanceof Error &&
        error.message === "request_already_active"
      ) {
        setChallengeError(requestText.activeRequestError);
      } else if (
        error instanceof Error &&
        (error.message === "not_group_leader" ||
          error.message === "challenge_request_not_allowed")
      ) {
        setChallengeError(requestText.leaderOnlyNotice);
      } else {
        setChallengeError(c("group_challenge_save_error"));
      }
    } finally {
      setChallengeSaving(false);
    }
  }

  async function openAuthorProfile(
    profile: any,
    authorId?: string | null,
    event?: React.MouseEvent,
  ) {
    event?.preventDefault();
    event?.stopPropagation();
    if (!authorId) return;

    const fallbackProfile = profile ?? {
      id: authorId,
      name: c("community_unknown"),
      avatar_url: null,
      streak_days: 0,
    };
    setProfileModal({
      profile: { ...fallbackProfile, id: authorId },
      userId: authorId,
      relationStatus: authorId === userId ? "self" : "loading",
    });
    if (!userId || authorId === userId) return;

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("companions")
        .select("id,requester_id,receiver_id,status")
        .or(
          `and(requester_id.eq.${userId},receiver_id.eq.${authorId}),and(requester_id.eq.${authorId},receiver_id.eq.${userId})`,
        )
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      const relation = (data ?? [])[0] as any | undefined;
      let relationStatus:
        "none" | "accepted" | "pending_sent" | "pending_received" | "declined" =
        "none";
      if (relation?.status === "accepted") relationStatus = "accepted";
      else if (relation?.status === "pending")
        relationStatus =
          relation.requester_id === userId
            ? "pending_sent"
            : "pending_received";
      else if (relation?.status === "declined") relationStatus = "declined";
      setProfileModal((current) =>
        current?.userId === authorId
          ? { ...current, relationStatus, relationId: relation?.id }
          : current,
      );
    } catch (error) {
      console.warn("프로필 동역자 상태 조회 실패:", error);
      setProfileModal((current) =>
        current?.userId === authorId
          ? { ...current, relationStatus: "none" }
          : current,
      );
    }
  }

  function AuthorIdentity({
    profile,
    authorId,
  }: {
    profile: any;
    authorId?: string | null;
  }) {
    const canOpen = !!authorId;
    return (
      <div
        style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}
      >
        <button
          type="button"
          onClick={(event) => openAuthorProfile(profile, authorId, event)}
          disabled={!canOpen}
          aria-label={c("community_profile_view")}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            border: "none",
            background: "transparent",
            cursor: canOpen ? "pointer" : "default",
            flexShrink: 0,
          }}
        >
          <Avatar url={profile?.avatar_url} name={profile?.name} />
        </button>
        <button
          type="button"
          onClick={(event) => openAuthorProfile(profile, authorId, event)}
          disabled={!canOpen}
          style={{
            minWidth: 0,
            padding: 0,
            border: "none",
            background: "transparent",
            cursor: canOpen ? "pointer" : "default",
            textAlign: "left",
          }}
        >
          <span
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text2)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {profile?.name ?? c("community_unknown")}
          </span>
        </button>
      </div>
    );
  }

  async function sendCompanionRequestFromProfile() {
    if (
      !profileModal ||
      !userId ||
      profileModal.userId === userId ||
      profileModal.saving
    )
      return;
    const targetId = profileModal.userId;
    setProfileModal((current) =>
      current?.userId === targetId ? { ...current, saving: true } : current,
    );
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("companions")
        .insert({
          requester_id: userId,
          receiver_id: targetId,
          status: "pending",
        });
      if (error) throw error;
      setProfileModal((current) =>
        current?.userId === targetId
          ? { ...current, relationStatus: "pending_sent", saving: false }
          : current,
      );
    } catch (error) {
      console.error("동역자 신청 실패:", error);
      setProfileModal((current) =>
        current?.userId === targetId ? { ...current, saving: false } : current,
      );
    }
  }

  function renderProfileModal() {
    if (!profileModal) return null;
    const name = profileModal.profile?.name || c("profile_default_name");
    const streakDays = profileModal.profile?.streak_days ?? 0;
    const avatarUrl = profileModal.profile?.avatar_url as string | null | undefined;
    const canExpandCharacterAvatar = isCharacterProfileAvatarUrl(avatarUrl);
    return (
      <div
        onClick={() => setProfileModal(null)}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 330,
          background: "var(--community-overlay-sheet)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          padding: "0 14px calc(16px + env(safe-area-inset-bottom))",
        }}
      >
        <div
          onClick={(event) => event.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: 420,
            background: "var(--community-modal-surface)",
            borderRadius: 26,
            padding: 20,
            border: "1px solid var(--community-card-border)",
            boxShadow: "var(--shadow-sheet)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginBottom: 18,
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 850, color: "var(--text)" }}>
              {c("community_profile_modal_title")}
            </h2>
            <button
              onClick={() => setProfileModal(null)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: "var(--bg3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text3)",
                cursor: "pointer",
              }}
            >
              <X size={18} />
            </button>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: 10,
            }}
          >
            {canExpandCharacterAvatar ? (
              <button
                type="button"
                onClick={() => openPhotoViewer(avatarUrl!, name)}
                aria-label={c("community_profile_view")}
                style={{ padding: 0, border: "none", borderRadius: "50%", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <Avatar url={avatarUrl ?? undefined} name={name} size={76} />
              </button>
            ) : (
              <Avatar url={avatarUrl ?? undefined} name={name} size={76} />
            )}
            <div>
              <p
                style={{
                  fontSize: 20,
                  fontWeight: 850,
                  color: "var(--text)",
                  marginBottom: 4,
                }}
              >
                {name}
              </p>
              <p
                style={{ fontSize: 12, color: "var(--text3)", fontWeight: 700 }}
              >
                {t("profile_streak", lang, { n: streakDays })}
              </p>
            </div>
          </div>
          <div style={{ marginTop: 20 }}>
            {profileModal.relationStatus === "loading" ? (
              <button
                className="btn-outline"
                disabled
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  opacity: 0.65,
                }}
              >
                <Loader2 size={16} className="spin" />{" "}
                {c("community_profile_checking")}
              </button>
            ) : profileModal.relationStatus === "self" ? (
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 16,
                  background: "var(--bg3)",
                  color: "var(--text3)",
                  fontSize: 13,
                  fontWeight: 700,
                  textAlign: "center",
                }}
              >
                {c("community_profile_self")}
              </div>
            ) : profileModal.relationStatus === "accepted" ? (
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 16,
                  background: "var(--sage-light)",
                  color: "var(--sage-dark)",
                  fontSize: 13,
                  fontWeight: 800,
                  textAlign: "center",
                }}
              >
                {c("community_profile_already_partner")}
              </div>
            ) : profileModal.relationStatus === "pending_sent" ? (
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 16,
                  background: "var(--community-gold-surface)",
                  color: "var(--community-gold-text)",
                  fontSize: 13,
                  fontWeight: 800,
                  textAlign: "center",
                }}
              >
                {c("community_profile_request_sent")}
              </div>
            ) : profileModal.relationStatus === "pending_received" ? (
              <button
                onClick={() => router.push("/companions")}
                className="btn-sage"
                style={{ width: "100%" }}
              >
                {c("community_profile_request_received")}
              </button>
            ) : (
              <button
                onClick={sendCompanionRequestFromProfile}
                disabled={!!profileModal.saving}
                className="btn-sage"
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  opacity: profileModal.saving ? 0.65 : 1,
                }}
              >
                {profileModal.saving ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <UserPlus size={16} />
                )}
                {c("community_profile_request_button")}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  function resetGroupDetailState() {
    setActionMenu(null);
    setShowGroupActionMenu(false);
    setShowGroupMembers(false);
    setGroupMemberProfiles([]);
    setShowGroupEdit(false);
    setGroupEditError(null);
    setShowLeadershipTransfer(false);
    setLeadershipTransferStep("select");
    setLeadershipTransferTargetId(null);
    setLeadershipTransferError(null);
    setMemberRemovalTarget(null);
    setMemberRemovalError(null);
    setShowDeleteGroupConfirm(false);
    setDeleteGroupError(null);
    resetChallengeRequestForm();
    closeManageModal();
    setSelectedGroup(null);
    setGroupChallenges([]);
    setLoadingGroupChallenges(false);
    setGroupQts([]);
    setGroupPrayers([]);
    setGroupDetailTab("qt");
    resetQtDetailState();
  }

  function closeGroupDetail() {
    if (
      communityDetailHistoryRef.current === "group" &&
      typeof window !== "undefined"
    ) {
      window.history.back();
      return;
    }
    clearCommunityDetailHistory("group");
    resetGroupDetailState();
  }

  function resetPartnerDetailState() {
    setActionMenu(null);
    setSafetyConfirm(null);
    closeManageModal();
    setSelectedPartner(null);
    setPartnerDetailTab("qt");
    setPartnerQts([]);
    setPartnerPrayers([]);
    setCompanionChallengeStatus(null);
    setLoadingCompanionChallenge(false);
    resetQtDetailState();
  }

  function closePartnerDetail() {
    if (
      communityDetailHistoryRef.current === "partner" &&
      typeof window !== "undefined"
    ) {
      window.history.back();
      return;
    }
    clearCommunityDetailHistory("partner");
    resetPartnerDetailState();
  }

  function openPrayerEdit(
    item: any,
    event?: any,
    scope?: ShareScope,
    groupId?: string,
    partnerId?: string,
  ) {
    event?.stopPropagation?.();
    setActionMenu(null);
    setManageText(item.content ?? "");
    setManageModal({ kind: "prayer-edit", item, scope, groupId, partnerId });
  }

  function openManage(
    kind: "qt-unshare" | "qt-edit" | "prayer-unshare",
    item: any,
    event?: any,
    scope?: ShareScope,
    groupId?: string,
    partnerId?: string,
  ) {
    event?.stopPropagation?.();
    setActionMenu(null);
    setManageModal({ kind, item, scope, groupId, partnerId });
  }

  function closeManageModal() {
    if (manageSaving) return;
    setManageModal(null);
    setManageText("");
  }

  function removeSharedItem(kind: "qt" | "prayer", id: string) {
    if (kind === "qt") {
      setQtShares((prev) => prev.filter((item) => item.id !== id));
      setGroupQts((prev) => prev.filter((item) => item.id !== id));
      setPartnerQts((prev) => prev.filter((item) => item.id !== id));
      if (detailQt?.id === id) resetQtDetailState();
    } else {
      setPrayers((prev) => prev.filter((item) => item.id !== id));
      setGroupPrayers((prev) => prev.filter((item) => item.id !== id));
      setPartnerPrayers((prev) => prev.filter((item) => item.id !== id));
      setAnsweredPrayers((prev) => prev.filter((item) => item.id !== id));
    }
  }

  function removeSharedAuthor(authorId: string) {
    setQtShares((prev) => prev.filter((item) => item.user_id !== authorId));
    setGroupQts((prev) => prev.filter((item) => item.user_id !== authorId));
    setPartnerQts((prev) => prev.filter((item) => item.user_id !== authorId));
    setPrayers((prev) => prev.filter((item) => item.user_id !== authorId));
    setGroupPrayers((prev) => prev.filter((item) => item.user_id !== authorId));
    setPartnerPrayers((prev) =>
      prev.filter((item) => item.user_id !== authorId),
    );
    setAnsweredPrayers((prev) =>
      prev.filter((item) => item.user_id !== authorId),
    );
    if (detailQt?.user_id === authorId) resetQtDetailState();
  }

  async function confirmUnshare() {
    if (
      !manageModal ||
      (manageModal.kind !== "qt-unshare" &&
        manageModal.kind !== "prayer-unshare")
    )
      return;
    setManageSaving(true);
    const supabase = createClient();
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const isQt = manageModal.kind === "qt-unshare";
      if (manageModal.scope === "partner" && manageModal.partnerId) {
        const recipientTable = isQt
          ? "qt_record_recipients"
          : "prayer_item_recipients";
        const recordColumn = isQt ? "qt_record_id" : "prayer_item_id";
        const { error } = await supabase
          .from(recipientTable)
          .delete()
          .eq(recordColumn, manageModal.item.id)
          .eq("owner_id", user.id)
          .eq("recipient_id", manageModal.partnerId);
        if (error) throw error;

        if (isQt) {
          setPartnerQts((prev) =>
            prev.filter((item) => item.id !== manageModal.item.id),
          );
          if (detailQt?.id === manageModal.item.id) resetQtDetailState();
        } else {
          setPartnerPrayers((prev) =>
            prev.filter((item) => item.id !== manageModal.item.id),
          );
        }
      } else {
        const table = isQt ? "qt_records" : "prayer_items";
        const target =
          manageModal.scope === "group" && manageModal.groupId
            ? `group_${manageModal.groupId}`
            : "all";
        const nextVisibility = removeVisibilityTarget(
          manageModal.item.visibility,
          target,
        );
        const { error } = await supabase
          .from(table)
          .update({ visibility: nextVisibility })
          .eq("id", manageModal.item.id)
          .eq("user_id", user.id);
        if (error) throw error;

        const updateVisibility = (item: any) =>
          item.id === manageModal.item.id
            ? { ...item, visibility: nextVisibility }
            : item;
        if (isQt) {
          setQtShares((prev) =>
            target === "all"
              ? prev.filter((item) => item.id !== manageModal.item.id)
              : prev.map(updateVisibility),
          );
          setGroupQts((prev) =>
            target !== "all"
              ? prev.filter((item) => item.id !== manageModal.item.id)
              : prev.map(updateVisibility),
          );
          if (
            detailQt?.id === manageModal.item.id &&
            nextVisibility === "private"
          )
            resetQtDetailState();
        } else {
          setPrayers((prev) =>
            target === "all"
              ? prev.filter((item) => item.id !== manageModal.item.id)
              : prev.map(updateVisibility),
          );
          setGroupPrayers((prev) =>
            target !== "all"
              ? prev.filter((item) => item.id !== manageModal.item.id)
              : prev.map(updateVisibility),
          );
          setAnsweredPrayers((prev) => prev.map(updateVisibility));
        }
      }
      closeManageModal();
    } catch (error) {
      console.error("community unshare failed", error);
    } finally {
      setManageSaving(false);
    }
  }

  async function savePrayerEdit() {
    if (
      !manageModal ||
      manageModal.kind !== "prayer-edit" ||
      !manageText.trim()
    )
      return;
    setManageSaving(true);
    const supabase = createClient();
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const nextContent = manageText.trim();
      const { error } = await supabase
        .from("prayer_items")
        .update({ content: nextContent })
        .eq("id", manageModal.item.id)
        .eq("user_id", user.id);
      if (error) throw error;
      const updateItem = (item: any) =>
        item.id === manageModal.item.id
          ? { ...item, content: nextContent }
          : item;
      setPrayers((prev) => prev.map(updateItem));
      setGroupPrayers((prev) => prev.map(updateItem));
      setPartnerPrayers((prev) => prev.map(updateItem));
      setAnsweredPrayers((prev) => prev.map(updateItem));
      closeManageModal();
    } catch (error) {
      console.error("community prayer edit failed", error);
    } finally {
      setManageSaving(false);
    }
  }

  function goEditQt() {
    if (!manageModal || manageModal.kind !== "qt-edit") return;
    router.push(`/qt/write?editId=${manageModal.item.id}`);
  }

  function CardMenu({
    kind,
    item,
    scope = "all",
    groupId,
    partnerId,
  }: {
    kind: "qt" | "prayer";
    item: any;
    scope?: ShareScope;
    groupId?: string;
    partnerId?: string;
  }) {
    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setActionMenu({ kind, item, scope, groupId, partnerId });
        }}
        aria-label={c("community_manage_other_content")}
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          border: "none",
          background: "transparent",
          color: "var(--text3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          flexShrink: 0,
          padding: 0,
        }}
      >
        <MoreHorizontal size={16} />
      </button>
    );
  }

  async function hideItem(
    kind: "qt" | "prayer",
    item: any,
    shouldReport = false,
  ): Promise<boolean> {
    if (!userId) {
      setSafetyActionError(c("community_safety_action_error"));
      return false;
    }
    setManageSaving(true);
    const supabase = createClient();
    try {
      if (shouldReport) {
        const { data: existingReport, error: reportLookupError } = await supabase
          .from("content_reports")
          .select("id")
          .eq("reporter_id", userId)
          .eq("content_type", kind)
          .eq("content_id", item.id)
          .limit(1)
          .maybeSingle();
        if (reportLookupError) throw reportLookupError;

        if (!existingReport) {
          const { error: reportError } = await supabase
            .from("content_reports")
            .insert({
              reporter_id: userId,
              content_type: kind,
              content_id: item.id,
              reported_user_id: item.user_id ?? null,
              reason: "inappropriate",
            });
          if (reportError) throw reportError;
        }
      }
      const { error: hideError } = await supabase
        .from("hidden_community_items")
        .upsert(
          {
            user_id: userId,
            content_type: kind,
            content_id: item.id,
          },
          { onConflict: "user_id,content_type,content_id" },
        );
      if (hideError) throw hideError;

      const key = contentKey(kind, item.id);
      setHiddenKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
      removeSharedItem(kind, item.id);
      setActionMenu(null);
      return true;
    } catch (error) {
      console.error("community report/hide failed", error);
      setSafetyActionError(c("community_safety_action_error"));
      return false;
    } finally {
      setManageSaving(false);
    }
  }

  function openSafetyConfirm(
    action: "report" | "hide-item" | "hide-author",
    kind: "qt" | "prayer",
    item: any,
  ) {
    setActionMenu(null);
    setSafetyActionError(null);
    setSafetyConfirm({ action, kind, item });
  }

  function closeSafetyConfirm() {
    if (manageSaving) return;
    setSafetyActionError(null);
    setSafetyConfirm(null);
  }

  async function confirmSafetyAction() {
    if (!safetyConfirm || manageSaving) return;
    const { action, kind, item } = safetyConfirm;
    setSafetyActionError(null);
    let succeeded = false;
    if (action === "report") {
      succeeded = await hideItem(kind, item, true);
    } else if (action === "hide-item") {
      succeeded = await hideItem(kind, item, false);
    } else {
      succeeded = await hideAuthor(item);
    }
    if (succeeded) setSafetyConfirm(null);
  }

  async function hideAuthor(item: any): Promise<boolean> {
    if (!userId || !item?.user_id || item.user_id === userId) {
      setSafetyActionError(c("community_safety_action_error"));
      return false;
    }
    setManageSaving(true);
    const supabase = createClient();
    try {
      const { error: hideError } = await supabase
        .from("hidden_community_users")
        .upsert(
          {
            user_id: userId,
            hidden_user_id: item.user_id,
          },
          { onConflict: "user_id,hidden_user_id" },
        );
      if (hideError) throw hideError;

      setHiddenUserIds((prev) =>
        prev.includes(item.user_id) ? prev : [...prev, item.user_id],
      );
      removeSharedAuthor(item.user_id);
      setActionMenu(null);
      return true;
    } catch (error) {
      console.error("community user hide failed", error);
      setSafetyActionError(c("community_safety_action_error"));
      return false;
    } finally {
      setManageSaving(false);
    }
  }

  function renderActionMenu() {
    if (!actionMenu) return null;
    const { kind, item, scope, groupId, partnerId } = actionMenu;
    const isMine = !!userId && item.user_id === userId;
    return (
      <div
        onClick={() => setActionMenu(null)}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 270,
          background: "var(--community-overlay-sheet)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          padding: "0 16px calc(18px + env(safe-area-inset-bottom))",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: 420,
            background: "var(--community-popover-surface)",
            border: "1px solid var(--community-card-border)",
            borderRadius: 24,
            padding: "14px",
            boxShadow: "var(--shadow-sheet)",
          }}
        >
          <p
            style={{
              fontSize: 13,
              color: "var(--text3)",
              fontWeight: 800,
              padding: "4px 6px 10px",
            }}
          >
            {isMine
              ? c("community_manage_my_share")
              : c("community_manage_other_content")}
          </p>
          {isMine ? (
            <>
              <button
                onClick={() =>
                  openManage(
                    kind === "qt" ? "qt-unshare" : "prayer-unshare",
                    item,
                    undefined,
                    scope,
                    groupId,
                    partnerId,
                  )
                }
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "14px 12px",
                  borderRadius: 14,
                  border: "none",
                  background: "transparent",
                  color: "var(--community-danger-text)",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <Trash2 size={17} /> {c("community_manage_unshare")}
              </button>
              <button
                onClick={() =>
                  kind === "qt"
                    ? openManage(
                        "qt-edit",
                        item,
                        undefined,
                        scope,
                        groupId,
                        partnerId,
                      )
                    : openPrayerEdit(item, undefined, scope, groupId, partnerId)
                }
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "14px 12px",
                  borderRadius: 14,
                  border: "none",
                  background: "transparent",
                  color: "var(--sage-dark)",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <Edit3 size={17} />{" "}
                {kind === "qt"
                  ? c("community_manage_qt_edit")
                  : c("community_manage_prayer_edit")}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => openSafetyConfirm("report", kind, item)}
                disabled={manageSaving}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "14px 12px",
                  borderRadius: 14,
                  border: "none",
                  background: "transparent",
                  color: "var(--community-danger-text)",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <Flag size={17} /> {c("community_report")}
              </button>
              <button
                onClick={() => openSafetyConfirm("hide-item", kind, item)}
                disabled={manageSaving}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "14px 12px",
                  borderRadius: 14,
                  border: "none",
                  background: "transparent",
                  color: "var(--text2)",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <EyeOff size={17} /> {c("community_hide_content")}
              </button>
              <button
                onClick={() => openSafetyConfirm("hide-author", kind, item)}
                disabled={manageSaving}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "14px 12px",
                  borderRadius: 14,
                  border: "none",
                  background: "transparent",
                  color: "var(--text2)",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <EyeOff size={17} /> {c("community_hide_user_content")}
              </button>
            </>
          )}
          <button
            onClick={() => setActionMenu(null)}
            className="btn-outline"
            style={{ width: "100%", marginTop: 8 }}
          >
            {c("community_cancel")}
          </button>
        </div>
      </div>
    );
  }

  function renderSafetyConfirmModal() {
    if (!safetyConfirm) return null;
    const isReport = safetyConfirm.action === "report";
    const title = isReport
      ? c("community_report_confirm_title")
      : safetyConfirm.action === "hide-item"
        ? c("community_hide_content_confirm_title")
        : c("community_hide_user_confirm_title");
    const msg = isReport
      ? c("community_report_confirm_msg")
      : safetyConfirm.action === "hide-item"
        ? c("community_hide_content_confirm_msg")
        : c("community_hide_user_confirm_msg");
    const actionText = isReport
      ? c("community_report_confirm_action")
      : c("community_hide_confirm_action");

    return (
      <div
        onClick={closeSafetyConfirm}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 280,
          background: "var(--community-overlay-modal)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 22px",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: 380,
            background: "var(--community-modal-surface)",
            borderRadius: 24,
            padding: 22,
            border: "1px solid var(--community-card-border)",
            boxShadow: "var(--shadow-modal)",
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "var(--text)",
              marginBottom: 8,
            }}
          >
            {title}
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "var(--text2)",
              lineHeight: 1.65,
              marginBottom: 16,
            }}
          >
            {msg}
          </p>
          {safetyActionError && (
            <p
              role="alert"
              style={{
                fontSize: 12,
                color: "var(--community-danger-action)",
                lineHeight: 1.55,
                marginBottom: 12,
              }}
            >
              {safetyActionError}
            </p>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={closeSafetyConfirm}
              disabled={manageSaving}
              className="btn-outline"
              style={{ flex: 1 }}
            >
              {c("community_cancel")}
            </button>
            <button
              onClick={confirmSafetyAction}
              disabled={manageSaving}
              style={{
                flex: 1,
                border: "none",
                borderRadius: 14,
                background: isReport
                  ? "var(--community-danger-action)"
                  : "var(--community-action)",
                color: isReport
                  ? "var(--community-on-danger-action)"
                  : "var(--community-on-action)",
                fontSize: 14,
                fontWeight: 800,
                cursor: manageSaving ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              {manageSaving ? (
                <Loader2 size={15} className="spin" />
              ) : (
                actionText
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderManageModal() {
    if (!manageModal) return null;
    const isQt = manageModal.kind.startsWith("qt");
    const isEdit = manageModal.kind.endsWith("edit");
    const title =
      manageModal.kind === "qt-unshare"
        ? c("community_manage_qt_unshare_title")
        : manageModal.kind === "prayer-unshare"
          ? c("community_manage_prayer_unshare_title")
          : manageModal.kind === "qt-edit"
            ? c("community_manage_qt_edit_title")
            : c("community_manage_prayer_edit_title");
    const msg =
      manageModal.kind === "qt-unshare"
        ? c("community_manage_qt_unshare_msg")
        : manageModal.kind === "prayer-unshare"
          ? c("community_manage_prayer_unshare_msg")
          : manageModal.kind === "qt-edit"
            ? c("community_manage_qt_edit_msg")
            : c("community_manage_prayer_edit_msg");

    return (
      <div
        onClick={closeManageModal}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 260,
          background: "var(--community-overlay-modal)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 22px",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: 380,
            background: "var(--community-modal-surface)",
            borderRadius: 24,
            padding: 22,
            border: "1px solid var(--community-card-border)",
            boxShadow: "var(--shadow-modal)",
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "var(--text)",
              marginBottom: 8,
            }}
          >
            {title}
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "var(--text2)",
              lineHeight: 1.65,
              marginBottom: 16,
            }}
          >
            {msg}
          </p>
          {manageModal.kind === "prayer-edit" && (
            <textarea
              className="textarea-field"
              rows={5}
              value={manageText}
              onChange={(e) => setManageText(e.target.value)}
              placeholder={c("community_manage_prayer_edit_placeholder")}
              style={{ marginBottom: 14 }}
            />
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={closeManageModal}
              disabled={manageSaving}
              className="btn-outline"
              style={{ flex: 1 }}
            >
              {c("community_cancel")}
            </button>
            <button
              onClick={
                manageModal.kind === "qt-edit"
                  ? goEditQt
                  : manageModal.kind === "prayer-edit"
                    ? savePrayerEdit
                    : confirmUnshare
              }
              disabled={
                manageSaving ||
                (manageModal.kind === "prayer-edit" && !manageText.trim())
              }
              className={isEdit ? "btn-sage" : ""}
              style={
                isEdit
                  ? { flex: 1 }
                  : {
                      flex: 1,
                      border: "none",
                      borderRadius: 14,
                      background: "var(--community-danger-action)",
                      color: "var(--community-on-danger-action)",
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: manageSaving ? "default" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }
              }
            >
              {manageSaving ? (
                <Loader2 size={15} className="spin" />
              ) : isEdit ? (
                c("community_manage_continue")
              ) : (
                c("community_manage_unshare")
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  function prayerActionText(prayer: any, alreadyPrayed: boolean) {
    const count = prayer.prayer_count ?? 0;
    if (alreadyPrayed) {
      return count > 0
        ? c("community_prayed_with_count", { count })
        : c("community_prayed");
    }
    return count > 0
      ? c("community_pray_together_with_count", { count })
      : c("community_pray_together");
  }

  function answeredPrayerCountText(count: number) {
    return c("community_answered_prayer_count", { count });
  }

  async function fetchPrayerLikeMeta(
    supabase: any,
    prayerIds: string[],
    uid: string,
  ) {
    if (prayerIds.length === 0)
      return { counts: {} as Record<string, number>, mine: [] as string[] };

    const counts: Record<string, number> = {};
    const mine: string[] = [];

    for (const ids of chunkArray(prayerIds, 100)) {
      const { data: likes, error } = await supabase
        .from("prayer_likes")
        .select("prayer_id,user_id")
        .in("prayer_id", ids);

      if (error) {
        console.warn("기도 응답 좋아요 조회 실패:", error.message);
        continue;
      }

      (likes ?? []).forEach((like: any) => {
        counts[like.prayer_id] = (counts[like.prayer_id] ?? 0) + 1;
        if (like.user_id === uid) mine.push(like.prayer_id);
      });
    }

    return { counts, mine: Array.from(new Set(mine)) };
  }

  async function likeAnsweredPrayer(prayerId: string) {
    if (!userId || likedPrayerIds.includes(prayerId)) return;

    const hapticKey = beginLoveHeartTapHaptic(
      "answered_prayer_gratitude",
      prayerId,
    );
    if (!hapticKey) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("prayer_likes")
        .insert({ prayer_id: prayerId, user_id: userId });

      if (error) {
        if (error.code === "23505") {
          setLikedPrayerIds((prev) =>
            prev.includes(prayerId) ? prev : [...prev, prayerId],
          );
        }
        return;
      }

      const bumpLikeCount = (items: any[]) =>
        items.map((item: any) =>
          item.id === prayerId
            ? { ...item, like_count: (item.like_count ?? 0) + 1 }
            : item,
        );

      setLikedPrayerIds((prev) =>
        prev.includes(prayerId) ? prev : [...prev, prayerId],
      );
      setAnsweredPrayers((prev) => bumpLikeCount(prev));
      setGroupPrayers((prev) => bumpLikeCount(prev));
      setPartnerPrayers((prev) => bumpLikeCount(prev));
      void awardCommunityLoveHeart(
        supabase,
        "answered_prayer_gratitude",
        prayerId,
      );
    } finally {
      finishLoveHeartTapHaptic(hapticKey);
    }
  }

  function PrayerLikeButton({ prayer }: { prayer: any }) {
    const liked = likedPrayerIds.includes(prayer.id);
    return (
      <button
        onClick={() => {
          void likeAnsweredPrayer(prayer.id);
        }}
        disabled={liked}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          background: "none",
          border: "none",
          cursor: liked ? "default" : "pointer",
          padding: "4px 8px",
          borderRadius: 20,
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
        }}
      >
        <span
          style={{
            width: 18,
            height: 18,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: liked ? "var(--community-like-text)" : "var(--text3)",
          }}
        >
          <Heart
            size={17}
            strokeWidth={1.9}
            fill={liked ? "var(--community-like-text)" : "none"}
          />
        </span>
        <span
          aria-hidden={(prayer.like_count ?? 0) <= 0}
          style={{
            minWidth: 13,
            textAlign: "center",
            fontSize: 12,
            color: liked ? "var(--community-like-text)" : "var(--text3)",
            fontWeight: 700,
            visibility: (prayer.like_count ?? 0) > 0 ? "visible" : "hidden",
          }}
        >
          {(prayer.like_count ?? 0) > 0 ? prayer.like_count : 0}
        </span>
      </button>
    );
  }

  useEffect(() => {
    loadData();
  }, [tab]);

  useEffect(() => {
    if (tab !== "all" || !userId) return;
    markAllSectionSeen(allTab);
  }, [
    tab,
    allTab,
    userId,
    qtShares.length,
    prayers.length,
    answeredPrayers.length,
  ]);

  // 프로필 fetch 헬퍼
  async function fetchProfiles(supabase: any, data: any[]) {
    const uids = Array.from(new Set(data.map((r: any) => r.user_id)));
    if (uids.length === 0) return {};
    return mapProfileCards(await loadProfileCards(supabase, uids));
  }

  async function loadQtPhotoUrls(supabase: any, rows: any[]) {
    const photoRows = rows.filter((row: any) => {
      const rowId = String(row?.id ?? "");
      return (
        rowId &&
        row?.photo_path &&
        !qtPhotoUrls[rowId] &&
        !qtPhotoUrlRequestingRef.current.has(rowId)
      );
    });
    if (photoRows.length === 0) return;

    photoRows.forEach((row: any) =>
      qtPhotoUrlRequestingRef.current.add(String(row.id)),
    );

    try {
      const uniquePaths = uniqueStrings(
        photoRows.map((row: any) => row.photo_path),
      );
      const pathUrlMap: Record<string, string> = {};

      if (uniquePaths.length > 0) {
        const { data, error } = await supabase.storage
          .from("qt-photos")
          .createSignedUrls(uniquePaths, 60 * 60);

        if (error) {
          console.warn(
            "사진 묵상 signed URL 일괄 생성 실패. 개별 생성으로 fallback:",
            error.message,
          );
          const fallbackEntries = await Promise.all(
            uniquePaths.map(async (path) => {
              const { data: signed } = await supabase.storage
                .from("qt-photos")
                .createSignedUrl(path, 60 * 60);
              return [path, signed?.signedUrl ?? ""] as const;
            }),
          );
          fallbackEntries.forEach(([path, signedUrl]) => {
            if (signedUrl) pathUrlMap[path] = signedUrl;
          });
        } else {
          (data ?? []).forEach((item: any, index: number) => {
            const path = String(item?.path ?? uniquePaths[index] ?? "");
            if (path && item?.signedUrl) pathUrlMap[path] = item.signedUrl;
          });
        }
      }

      const entries = photoRows
        .map(
          (row: any) =>
            [String(row.id), pathUrlMap[String(row.photo_path)] ?? ""] as const,
        )
        .filter(([, url]) => !!url);

      if (entries.length > 0) {
        setQtPhotoUrls((prev) => ({
          ...prev,
          ...Object.fromEntries(entries),
        }));
      }
    } finally {
      photoRows.forEach((row: any) =>
        qtPhotoUrlRequestingRef.current.delete(String(row.id)),
      );
    }
  }

  function getVisibleFeedCount(key: string) {
    return visibleFeedCounts[key] ?? COMMUNITY_FEED_PAGE_SIZE;
  }

  function showMoreFeedItems(key: string) {
    setVisibleFeedCounts((prev) => ({
      ...prev,
      [key]: (prev[key] ?? COMMUNITY_FEED_PAGE_SIZE) + COMMUNITY_FEED_PAGE_SIZE,
    }));
  }

  function visibleFeedItems<T>(key: string, items: T[]) {
    return items.slice(0, getVisibleFeedCount(key));
  }

  useEffect(() => {
    const supabase = createClient();

    if (selectedPartner?.partner_id) {
      if (partnerDetailTab === "qt") {
        const key = `partner-${selectedPartner.partner_id}-qt`;
        void loadQtPhotoUrls(supabase, visibleFeedItems(key, partnerQts));
      }
      return;
    }

    if (selectedGroup?.id) {
      if (groupDetailTab === "qt") {
        const key = `group-${selectedGroup.id}-qt`;
        void loadQtPhotoUrls(supabase, visibleFeedItems(key, groupQts));
      }
      return;
    }

    if (tab === "all" && allTab === "qt") {
      void loadQtPhotoUrls(supabase, visibleFeedItems("all-qt", qtShares));
    }
  }, [
    tab,
    allTab,
    selectedGroup?.id,
    groupDetailTab,
    selectedPartner?.partner_id,
    partnerDetailTab,
    qtShares,
    groupQts,
    partnerQts,
    visibleFeedCounts,
    qtPhotoUrls,
  ]);

  function renderFeedLoadMore(key: string, total: number) {
    const visibleCount = getVisibleFeedCount(key);
    if (total <= visibleCount) return null;
    return (
      <button
        onClick={() => showMoreFeedItems(key)}
        className="btn-outline"
        style={{ width: "100%", marginTop: 4 }}
      >
        {c("community_manage_more")}
      </button>
    );
  }

  function allSectionSeenKey(uid: string) {
    return `roots_community_all_section_seen_${uid}`;
  }

  function latestContentTime(
    rows: any[],
    field: "qt" | "prayer" | "answered" = "qt",
  ) {
    if (!rows || rows.length === 0) return null;
    const times = rows
      .map((row: any) => {
        if (field === "answered") return getAnsweredPrayerTime(row);
        if (field === "prayer") return prayerUnreadActivityTime(row);
        return qtUnreadActivityTime(row);
      })
      .filter(
        (value): value is string =>
          typeof value === "string" && value.length > 0,
      );
    return (
      times.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ??
      null
    );
  }

  function hasAllSectionNew(section: CommunitySectionKey) {
    const latest =
      section === "qt"
        ? latestContentTime(qtShares, "qt")
        : section === "answered"
          ? latestContentTime(answeredPrayers, "answered")
          : latestContentTime(prayers, "prayer");
    return isLaterThan(latest, allSectionSeenAt[section]);
  }

  function markAllSectionSeen(section: CommunitySectionKey) {
    if (!userId) return;
    const seenAt = new Date().toISOString();
    setAllSectionSeenAt((prev) => {
      const next = { ...prev, [section]: seenAt };
      storageSetJson(allSectionSeenKey(userId), next);
      return next;
    });
  }

  function selectAllSection(section: CommunitySectionKey) {
    setAllTab(section);
    markAllSectionSeen(section);
  }

  function hasUnreadPartnerSection(section: CommunitySectionKey) {
    if (section === "qt")
      return partnerQts.some((row: any) => !!row.isUnreadInPartner);
    return partnerPrayers.some((row: any) =>
      section === "answered"
        ? !!row.is_answered && !!row.isUnreadInPartner
        : !row.is_answered && !!row.isUnreadInPartner,
    );
  }

  function selectPartnerSection(section: CommunitySectionKey) {
    setPartnerDetailTab(section);
    if (section === "qt") {
      setPartnerQts((prev) =>
        prev.map((row: any) => ({ ...row, isUnreadInPartner: false })),
      );
      return;
    }
    setPartnerPrayers((prev) =>
      prev.map((row: any) => {
        const matches =
          section === "answered" ? !!row.is_answered : !row.is_answered;
        return matches ? { ...row, isUnreadInPartner: false } : row;
      }),
    );
  }

  function hasUnreadGroupSection(section: CommunitySectionKey) {
    if (section === "qt")
      return groupQts.some((row: any) => !!row.isUnreadInGroup);
    return groupPrayers.some((row: any) =>
      section === "answered"
        ? !!row.is_answered && !!row.isUnreadInGroup
        : !row.is_answered && !!row.isUnreadInGroup,
    );
  }

  function selectGroupSection(section: CommunitySectionKey) {
    setGroupDetailTab(section);
    if (section === "qt") {
      setGroupQts((prev) =>
        prev.map((row: any) => ({ ...row, isUnreadInGroup: false })),
      );
      return;
    }
    setGroupPrayers((prev) =>
      prev.map((row: any) => {
        const matches =
          section === "answered" ? !!row.is_answered : !row.is_answered;
        return matches ? { ...row, isUnreadInGroup: false } : row;
      }),
    );
  }

  function SectionUnreadDot({ show }: { show: boolean }) {
    if (!show) return null;
    return (
      <span
        aria-hidden="true"
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          background: "var(--sage)",
          boxShadow: "var(--community-unread-dot-ring)",
          flexShrink: 0,
        }}
      />
    );
  }

  async function openDirectNotificationContent(
    target: CommunityNotificationDirectTarget,
    context?: {
      supabase?: ReturnType<typeof createClient>;
      userId?: string;
    },
  ): Promise<"qt" | "prayer" | null> {
    const supabase = context?.supabase ?? createClient();
    let directUserId = context?.userId ?? null;

    if (!directUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      directUserId = user?.id ?? null;
    }
    if (!directUserId) return null;

    const directContent = await loadCommunityNotificationDirectContent(
      supabase,
      directUserId,
      target,
    );
    if (!directContent) return null;

    if (directContent.kind === "qt") {
      const record = directContent.record;
      if (filterHiddenItems("qt", [record]).length === 0) return null;

      setQtReactionCounts((prev) => ({
        ...prev,
        ...directContent.reactionCounts,
      }));
      setMyQtReactions((prev) => ({
        ...prev,
        ...directContent.myReaction,
      }));

      if (target.scope === "group") {
        setGroupQts((prev) =>
          sortQtFeedRows(mergeRowsById([[record], prev])),
        );
      } else {
        setPartnerQts((prev) =>
          sortQtFeedRows(mergeRowsById([[record], prev])),
        );
      }

      if (record.photo_path) void loadQtPhotoUrls(supabase, [record]);
      openQtDetail(record);
      return "qt";
    }

    const record = directContent.record;
    if (filterHiddenItems("prayer", [record]).length === 0) return null;

    if (directContent.liked) {
      setLikedPrayerIds((prev) =>
        prev.includes(target.contentId)
          ? prev
          : [...prev, target.contentId],
      );
    }
    if (directContent.prayed) {
      setPrayedIds((prev) =>
        prev.includes(target.contentId)
          ? prev
          : [...prev, target.contentId],
      );
    }

    const resolvedPrayerSection: CommunitySectionKey = record.is_answered
      ? "answered"
      : "praying";

    if (target.scope === "group") {
      setGroupDetailTab(resolvedPrayerSection);
      setGroupPrayers((prev) =>
        sortPrayerFeedRows(mergeRowsById([[record], prev])),
      );
    } else {
      setPartnerDetailTab(resolvedPrayerSection);
      setPartnerPrayers((prev) =>
        sortPrayerFeedRows(mergeRowsById([[record], prev])),
      );
    }

    directPrayerFocusRef.current = null;
    setDirectPrayerTargetId(target.contentId);
    return "prayer";
  }

  useEffect(() => {
    if (loading) return;

    const directTarget = parseCommunityNotificationDirectTarget(searchParams);
    const targetTab = searchParams.get("tab");
    const section = normalizeCommunitySection(searchParams.get("section"));

    if (targetTab === "group") {
      const groupId = searchParams.get("groupId");
      if (!groupId) {
        setNotificationDirectOpenPending(false);
        return;
      }
      const signature = directTarget
        ? communityNotificationTargetSignature(directTarget)
        : `group:${groupId}:${section}`;
      if (handledNotificationRouteRef.current === signature) return;
      if (directTarget) setNotificationDirectOpenPending(true);

      if (tab !== "group") setTab("group");
      if (selectedPartner) {
        clearCommunityDetailHistory("partner");
        resetPartnerDetailState();
      }

      const group = groups.find((item: any) => String(item.id) === groupId);
      if (!group) return;
      handledNotificationRouteRef.current = signature;

      void (async () => {
        try {
          await loadGroupDetail(group, section, directTarget ?? undefined);
        } catch (error) {
          console.warn("그룹 알림 직접 열기 실패:", error);
          setNotificationDirectOpenPending(false);
        }
      })();
      return;
    }

    if (targetTab === "partner") {
      const partnerId = searchParams.get("partnerId");
      if (!partnerId) {
        setNotificationDirectOpenPending(false);
        return;
      }
      const signature = directTarget
        ? communityNotificationTargetSignature(directTarget)
        : `partner:${partnerId}:${section}`;
      if (handledNotificationRouteRef.current === signature) return;
      if (directTarget) setNotificationDirectOpenPending(true);

      if (tab !== "partner") setTab("partner");
      if (selectedGroup) {
        clearCommunityDetailHistory("group");
        resetGroupDetailState();
      }

      const partner = partners.find(
        (item: any) => String(item.partner_id) === partnerId,
      );
      if (!partner) return;
      handledNotificationRouteRef.current = signature;

      void (async () => {
        try {
          await openPartnerDetail(partner, section, directTarget ?? undefined);
        } catch (error) {
          console.warn("동역자 알림 직접 열기 실패:", error);
          setNotificationDirectOpenPending(false);
        }
      })();
      return;
    }

    setNotificationDirectOpenPending(false);
  }, [loading, searchParams, groups, partners]);

  useEffect(() => {
    if (!notificationDirectOpenPending) return;
    const timeoutId = window.setTimeout(() => {
      setNotificationDirectOpenPending(false);
    }, 8000);
    return () => window.clearTimeout(timeoutId);
  }, [notificationDirectOpenPending]);

  useEffect(() => {
    if (!directPrayerTargetId) return;
    if (directPrayerFocusRef.current === directPrayerTargetId) return;

    const element = document.getElementById(
      `community-prayer-${directPrayerTargetId}`,
    );
    if (!element) return;

    directPrayerFocusRef.current = directPrayerTargetId;
    element.scrollIntoView({ block: "center", behavior: "auto" });
    setNotificationDirectOpenPending(false);

    if (directPrayerHighlightTimerRef.current) {
      window.clearTimeout(directPrayerHighlightTimerRef.current);
    }
    directPrayerHighlightTimerRef.current = window.setTimeout(() => {
      setDirectPrayerTargetId(null);
      directPrayerHighlightTimerRef.current = null;
    }, 3600);
  }, [
    directPrayerTargetId,
    selectedGroup?.id,
    selectedPartner?.partner_id,
    groupDetailTab,
    partnerDetailTab,
    groupPrayers,
    partnerPrayers,
  ]);

  useEffect(() => {
    return () => {
      if (directPrayerHighlightTimerRef.current) {
        window.clearTimeout(directPrayerHighlightTimerRef.current);
      }
    };
  }, []);

  async function openPartnerDetail(
    partner: any,
    preferredSection?: CommunitySectionKey,
    directTarget?: CommunityNotificationDirectTarget,
  ) {
    pushCommunityDetailHistory("partner");
    const openedAt = new Date().toISOString();
    const previousSeenAt = partner.last_seen_shared_at ?? null;
    setSelectedPartner({
      ...partner,
      hasNewContent: false,
      hasNewQtShare: false,
      hasNewPrayer: false,
      last_seen_shared_at: openedAt,
    });
    setPartnerDetailTab(
      preferredSection ??
        (partner.hasNewPrayer && !partner.hasNewQtShare ? "praying" : "qt"),
    );
    setPartnerQts([]);
    setPartnerPrayers([]);
    setLoadingPartnerQts(true);
    setLoadingPartnerPrayers(true);

    const partnerId = partner?.partner_id;
    if (!partnerId) {
      setLoadingPartnerQts(false);
      setLoadingPartnerPrayers(false);
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoadingPartnerQts(false);
      setLoadingPartnerPrayers(false);
      setNotificationDirectOpenPending(false);
      return;
    }

    if (directTarget) {
      const opened = await openDirectNotificationContent(directTarget, {
        supabase,
        userId: user.id,
      });
      if (opened === "qt") {
        setLoadingPartnerQts(false);
        setNotificationDirectOpenPending(false);
      } else if (opened === "prayer") {
        setLoadingPartnerPrayers(false);
      } else {
        setNotificationDirectOpenPending(false);
      }
    }

    setPartners((prev) =>
      sortPartnersForDisplay(
        prev.map((item) =>
          item.partner_id === partnerId
            ? {
                ...item,
                hasNewContent: false,
                hasNewQtShare: false,
                hasNewPrayer: false,
                last_seen_shared_at: openedAt,
              }
            : item,
        ),
      ),
    );

    try {
      const { error: seenError } = await supabase
        .from("companion_preferences")
        .upsert(
          {
            user_id: user.id,
            companion_user_id: partnerId,
            is_favorite: !!partner.isFavorite,
            last_seen_shared_at: openedAt,
            updated_at: openedAt,
          },
          { onConflict: "user_id,companion_user_id" },
        );
      if (seenError)
        console.warn("동역자 읽음 상태 저장 실패:", seenError.message);
    } catch (error) {
      console.warn("동역자 읽음 상태 저장 중 예외:", error);
    }

    void loadCompanionChallengeForPartner(
      supabase,
      partnerId,
    );

    const currentHiddenKeys = hiddenKeys;
    const currentHiddenUserIds = hiddenUserIds;

    try {
      const { data: qtRecipientRows, error: qtRecipientError } = await supabase
        .from("qt_record_recipients")
        .select("qt_record_id,owner_id,recipient_id,created_at")
        .or(
          `and(owner_id.eq.${user.id},recipient_id.eq.${partnerId}),and(owner_id.eq.${partnerId},recipient_id.eq.${user.id})`,
        )
        .order("created_at", { ascending: false })
        .limit(COMMUNITY_PARTNER_QT_HISTORY_LIMIT);

      if (qtRecipientError) throw qtRecipientError;
      const qtIds = Array.from(
        new Set(
          (qtRecipientRows ?? [])
            .map((row: any) => row.qt_record_id)
            .filter(Boolean),
        ),
      );

      if (qtIds.length > 0) {
        const recipientMap: Record<string, any> = {};
        (qtRecipientRows ?? []).forEach((row: any) => {
          recipientMap[row.qt_record_id] = row;
        });

        const qtRows = await fetchContentRowsByIds(
          supabase,
          "qt_records",
          qtIds,
        );
        const profMap = await fetchProfiles(supabase, qtRows);
        const rowsWithProfiles = sortQtFeedRows(
          qtRows.map((row: any) => {
            const recipient = recipientMap[row.id] ?? null;
            const partnerSharedAt = recipient?.created_at ?? row.created_at;
            return {
              ...row,
              profiles: profMap[row.user_id] ?? null,
              partnerSharedAt,
              isUnreadInPartner:
                recipient?.owner_id === partnerId &&
                recipient?.recipient_id === user.id &&
                isLaterThan(partnerSharedAt, previousSeenAt),
            };
          }),
        );

        const visibleRows = filterHiddenItems(
          "qt",
          rowsWithProfiles,
          currentHiddenKeys,
          currentHiddenUserIds,
        );
        setPartnerQts(visibleRows);

        const { counts, mine } = await fetchQtReactions(
          supabase,
          qtIds,
          user.id,
        );
        setQtReactionCounts((prev) => ({ ...prev, ...counts }));
        setMyQtReactions((prev) => ({ ...prev, ...mine }));
      } else if (directTarget?.contentKind !== "qt") {
        setPartnerQts([]);
      }
    } catch (error) {
      console.warn("동역자 묵상 나눔 조회 실패:", error);
      if (directTarget?.contentKind !== "qt") setPartnerQts([]);
    } finally {
      setLoadingPartnerQts(false);
    }

    try {
      const { data: prayerRecipientRows, error: prayerRecipientError } =
        await supabase
          .from("prayer_item_recipients")
          .select("prayer_item_id,owner_id,recipient_id,created_at")
          .or(
            `and(owner_id.eq.${user.id},recipient_id.eq.${partnerId}),and(owner_id.eq.${partnerId},recipient_id.eq.${user.id})`,
          )
          .order("created_at", { ascending: false })
          .limit(COMMUNITY_PARTNER_PRAYER_HISTORY_LIMIT);

      if (prayerRecipientError) throw prayerRecipientError;
      const prayerIds = Array.from(
        new Set(
          (prayerRecipientRows ?? [])
            .map((row: any) => row.prayer_item_id)
            .filter(Boolean),
        ),
      );

      if (prayerIds.length > 0) {
        const recipientMap: Record<string, any> = {};
        (prayerRecipientRows ?? []).forEach((row: any) => {
          recipientMap[row.prayer_item_id] = row;
        });

        const prayerRows = await fetchContentRowsByIds(
          supabase,
          "prayer_items",
          prayerIds,
        );
        const profMap = await fetchProfiles(supabase, prayerRows);
        const answeredIds = prayerRows
          .filter((row: any) => !!row.is_answered)
          .map((row: any) => row.id);
        const { counts: likeCounts, mine: myLikedIds } =
          await fetchPrayerLikeMeta(supabase, answeredIds, user.id);
        if (myLikedIds.length > 0) {
          setLikedPrayerIds((prev) =>
            Array.from(new Set([...prev, ...myLikedIds])),
          );
        }
        const rowsWithProfiles = sortPrayerFeedRows(
          prayerRows.map((row: any) => {
            const recipient = recipientMap[row.id] ?? null;
            const partnerSharedAt = recipient?.created_at ?? row.created_at;
            const partnerActivityAt = row.is_answered
              ? getAnsweredPrayerTime(row) ?? partnerSharedAt
              : partnerSharedAt;
            return {
              ...row,
              like_count: likeCounts[row.id] ?? row.like_count ?? 0,
              profiles: profMap[row.user_id] ?? null,
              partnerSharedAt,
              partnerActivityAt,
              isUnreadInPartner:
                recipient?.owner_id === partnerId &&
                recipient?.recipient_id === user.id &&
                isLaterThan(partnerActivityAt, previousSeenAt),
            };
          }),
        );

        setPartnerPrayers(
          filterHiddenItems(
            "prayer",
            rowsWithProfiles,
            currentHiddenKeys,
            currentHiddenUserIds,
          ),
        );
      } else if (directTarget?.contentKind !== "prayer") {
        setPartnerPrayers([]);
      }
    } catch (error) {
      console.warn("동역자 기도 나눔 조회 실패:", error);
      if (directTarget?.contentKind !== "prayer") setPartnerPrayers([]);
    } finally {
      setLoadingPartnerPrayers(false);
    }
  }

  async function loadGroupMemberProfiles(group: any) {
    setLoadingGroupMembers(true);
    const supabase = createClient();
    try {
      const { data: rows, error } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", group.id);

      if (error) throw error;
      const memberIds = Array.from(
        new Set((rows ?? []).map((row: any) => row.user_id).filter(Boolean)),
      );
      if (memberIds.length === 0) {
        setGroupMemberProfiles([]);
        return [] as GroupMemberProfile[];
      }

      const profileMap = mapProfileCards(
        await loadProfileCards(supabase, memberIds),
      );
      const profiles = memberIds
        .map((id: string): GroupMemberProfile => {
          const profile = profileMap[id] ?? {
              id,
              name: c("community_member_unknown"),
              avatar_url: null,
              streak_days: null,
            };
          return {
            ...profile,
            isLeader: id === group.created_by,
          };
        })
        .sort((left, right) => {
          if (left.isLeader !== right.isLeader) return left.isLeader ? -1 : 1;
          return String(left.name ?? "").localeCompare(
            String(right.name ?? ""),
            getDateLocale(lang),
          );
        });

      setGroupMemberProfiles(profiles);
      setSelectedGroup((current: any) =>
        current?.id === group.id
          ? { ...current, member_count: profiles.length }
          : current,
      );
      setGroups((current) =>
        current.map((item) =>
          item.id === group.id
            ? { ...item, member_count: profiles.length }
            : item,
        ),
      );
      return profiles;
    } catch (error) {
      console.warn("그룹 참여자 조회 실패:", error);
      setGroupMemberProfiles([]);
      return [] as GroupMemberProfile[];
    } finally {
      setLoadingGroupMembers(false);
    }
  }

  async function openGroupMembers(group: any) {
    setShowGroupMembers(true);
    await loadGroupMemberProfiles(group);
  }

  // qt_reactions 로드 헬퍼 - qtIds 목록의 반응 카운트 + 내 반응 가져오기
  async function fetchQtReactions(supabase: any, qtIds: string[], uid: string) {
    if (qtIds.length === 0) return { counts: {}, mine: {} };

    const counts: Record<string, Record<string, number>> = {};
    const mine: Record<string, string> = {};

    for (const ids of chunkArray(qtIds, 100)) {
      const { data: rxData, error } = await supabase
        .from("qt_reactions")
        .select("qt_id, reaction, user_id")
        .in("qt_id", ids);

      if (error) {
        console.warn("묵상 반응 조회 실패:", error.message);
        continue;
      }

      (rxData ?? []).forEach((r: any) => {
        if (!counts[r.qt_id]) counts[r.qt_id] = {};
        counts[r.qt_id][r.reaction] =
          (counts[r.qt_id][r.reaction] ?? 0) + 1;
        if (r.user_id === uid) mine[r.qt_id] = r.reaction;
      });
    }

    return { counts, mine };
  }

  async function loadData() {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setUserId(user.id);
    if (tab === "partner" || tab === "group") {
      void loadReflectionNudgeStatus();
    }
    setChallengeContactEmail((prev) => prev || user.email || "");
    setAllSectionSeenAt(
      storageGetJson<Record<CommunitySectionKey, string | null>>(
        allSectionSeenKey(user.id),
        { qt: null, praying: null, answered: null },
      ),
    );

    const {
      hiddenKeys: loadedHiddenKeys,
      hiddenUserIds: loadedHiddenUserIds,
      prayedIds: dbPrayed,
    } = await loadCommunityViewerMeta(supabase, user.id);

    setHiddenKeys(loadedHiddenKeys);
    setHiddenUserIds(loadedHiddenUserIds);
    setPrayedIds(dbPrayed);
    storageSetJson(`comm_prayed_${user.id}`, dbPrayed);

    if (tab === "partner") {
      const { data: companionRows, error: companionError } = await supabase
        .from("companions")
        .select(
          "id,requester_id,receiver_id,status,created_at,updated_at,responded_at",
        )
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (companionError) {
        console.error("동역자 목록 조회 실패:", companionError);
        setPartners([]);
      } else {
        const rows = companionRows ?? [];
        const partnerIds = Array.from(
          new Set(
            rows
              .map((row: any) =>
                row.requester_id === user.id
                  ? row.receiver_id
                  : row.requester_id,
              )
              .filter(Boolean),
          ),
        );
        const {
          profileMap,
          partnerPreferenceMap,
          favoritePartnerIds,
          latestPartnerQtAt,
          latestPartnerPrayerAt,
        } = await loadPartnerSupplementalData(
          supabase,
          user.id,
          partnerIds,
        );

        setPartners(
          sortPartnersForDisplay(
            rows.map((row: any) => {
              const partnerId =
                row.requester_id === user.id
                  ? row.receiver_id
                  : row.requester_id;
              const preference = partnerPreferenceMap[partnerId] ?? null;
              const lastSeenPartnerAt =
                preference?.last_seen_shared_at ??
                row.responded_at ??
                row.created_at ??
                null;
              const latestQtAt = latestPartnerQtAt[partnerId] ?? null;
              const latestPrayerAt = latestPartnerPrayerAt[partnerId] ?? null;
              const latestPartnerActivityAt = latestSharedContentTime(
                [
                  latestQtAt ? { created_at: latestQtAt } : null,
                  latestPrayerAt ? { created_at: latestPrayerAt } : null,
                ].filter(Boolean) as any[],
              );
              const hasNewQtShare = isLaterThan(latestQtAt, lastSeenPartnerAt);
              const hasNewPrayer = isLaterThan(
                latestPrayerAt,
                lastSeenPartnerAt,
              );
              return {
                ...row,
                partner_id: partnerId,
                profile: profileMap[partnerId] ?? null,
                isFavorite: favoritePartnerIds.has(partnerId),
                last_seen_shared_at: lastSeenPartnerAt,
                latest_qt_at: latestQtAt,
                latest_prayer_at: latestPrayerAt,
                latest_partner_activity_at: latestPartnerActivityAt,
                hasNewQtShare,
                hasNewPrayer,
                hasNewContent: hasNewQtShare || hasNewPrayer,
              };
            }),
          ),
        );
      }
    } else if (tab === "all") {
      const [prayingResult, answeredResult, qtData] = await Promise.all([
        supabase
          .from("prayer_items")
          .select("*")
          .ilike("visibility", "%all%")
          .eq("is_answered", false)
          .order("created_at", { ascending: false })
          .limit(COMMUNITY_PRAYER_PREFETCH_LIMIT),
        supabase
          .from("prayer_items")
          .select("*")
          .ilike("visibility", "%all%")
          .eq("is_answered", true)
          .order("answered_at", { ascending: false })
          .limit(COMMUNITY_PRAYER_PREFETCH_LIMIT),
        fetchQtFeedRows(supabase, "%all%", COMMUNITY_ALL_QT_LIMIT),
      ]);

      const prayingRows = prayingResult.data ?? [];
      const answeredRows = answeredResult.data ?? [];
      const answeredIds = answeredRows.map((row: any) => row.id);
      const qtIds = qtData.map((row: any) => row.id);

      const [profileMap, likesResult, reactions] = await Promise.all([
        fetchProfiles(supabase, [
          ...prayingRows,
          ...answeredRows,
          ...qtData,
        ]),
        answeredIds.length > 0
          ? supabase
              .from("prayer_likes")
              .select("prayer_id,user_id")
              .in("prayer_id", answeredIds)
          : Promise.resolve({ data: [], error: null }),
        fetchQtReactions(supabase, qtIds, user.id),
      ]);

      const likeCounts: Record<string, number> = {};
      const myLikedIds: string[] = [];
      (likesResult.data ?? []).forEach((like: any) => {
        likeCounts[like.prayer_id] = (likeCounts[like.prayer_id] ?? 0) + 1;
        if (like.user_id === user.id) myLikedIds.push(like.prayer_id);
      });

      setPrayers(
        sortPrayerRequestRows(
          filterHiddenItems(
            "prayer",
            prayingRows.map((row: any) => ({
              ...row,
              profiles: profileMap[row.user_id] ?? null,
            })),
            loadedHiddenKeys,
            loadedHiddenUserIds,
          ),
        ),
      );
      setLikedPrayerIds(myLikedIds);
      setAnsweredPrayers(
        sortAnsweredPrayerRows(
          filterHiddenItems(
            "prayer",
            answeredRows.map((row: any) => ({
              ...row,
              like_count: likeCounts[row.id] ?? 0,
              profiles: profileMap[row.user_id] ?? null,
            })),
            loadedHiddenKeys,
            loadedHiddenUserIds,
          ),
        ),
      );
      setQtShares(
        sortQtFeedRows(
          filterHiddenItems(
            "qt",
            qtData.map((row: any) => ({
              ...row,
              profiles: profileMap[row.user_id] ?? null,
            })),
            loadedHiddenKeys,
            loadedHiddenUserIds,
          ),
        ),
      );
      setQtReactionCounts(reactions.counts);
      setMyQtReactions(reactions.mine);
    } else if (tab === "group") {
      let memberRows: any[] = [];
      const favoriteCache = readFavoriteCache(user.id);

      const { data: preferenceRows, error: preferenceError } =
        await supabase.rpc("get_my_group_preferences");

      if (preferenceError) {
        console.warn(
          "그룹 선호도 RPC 조회 실패. 기존 조회로 fallback:",
          preferenceError.message,
        );
        const { data: fullMemberRows, error: fullMemberError } = await supabase
          .from("group_members")
          .select("group_id,is_favorite,last_seen_qt_at,created_at")
          .eq("user_id", user.id);

        if (fullMemberError) {
          console.warn(
            "group_members preference columns are not available yet:",
            fullMemberError.message,
          );
          const { data: fallbackRows } = await supabase
            .from("group_members")
            .select("group_id")
            .eq("user_id", user.id);
          memberRows = fallbackRows ?? [];
        } else {
          memberRows = fullMemberRows ?? [];
        }
      } else {
        memberRows = preferenceRows ?? [];
      }

      const memberMap: Record<string, any> = {};
      memberRows.forEach((row: any) => {
        memberMap[row.group_id] = {
          ...row,
          is_favorite:
            !!row.is_favorite || favoriteCache.includes(row.group_id),
        };
      });
      const myGroupIds = memberRows.map((r: any) => r.group_id);

      const [publicGroupsResult, privateGroupsResult] = await Promise.all([
        supabase
          .from("groups")
          .select("*")
          .eq("is_public", true)
          .order("created_at", { ascending: false }),
        myGroupIds.length > 0
          ? supabase
              .from("groups")
              .select("*")
              .eq("is_public", false)
              .in("id", myGroupIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const all = [
        ...(publicGroupsResult.data ?? []),
        ...(privateGroupsResult.data ?? []),
      ];
      const hiddenPublicGroupIds = new Set(
        loadedHiddenKeys
          .filter((key) => key.startsWith("group:"))
          .map((key) => key.slice("group:".length)),
      );
      const unique = all
        .filter((g, i, arr) => arr.findIndex((x) => x.id === g.id) === i)
        .filter(
          (g) =>
            !!memberMap[g.id] ||
            !hiddenPublicGroupIds.has(String(g.id ?? "")),
        );
      const uniqueGroupIds = uniqueStrings(
        unique.map((g: any) => String(g.id ?? "")),
      );
      const joinedGroupIds = uniqueStrings(
        unique
          .filter((g: any) => !!memberMap[g.id])
          .map((g: any) => String(g.id ?? "")),
      );
      const leaderIds = uniqueStrings(
        unique.map((g: any) => String(g.created_by ?? "")),
      );

      const [
        memberCounts,
        latestQtByGroup,
        latestPrayerByGroup,
        leaderProfiles,
      ] =
        await Promise.all([
          fetchGroupMemberCounts(supabase, uniqueGroupIds),
          fetchLatestQtTimesByGroup(supabase, joinedGroupIds),
          fetchLatestPrayerTimesByGroup(supabase, joinedGroupIds),
          loadProfileCards(supabase, leaderIds).catch((error) => {
            console.warn("그룹장 프로필 조회 실패:", error);
            return [];
          }),
        ]);
      const leaderProfileMap = mapProfileCards(leaderProfiles);

      const withMeta = unique.map((g) => {
        const memberMeta = memberMap[g.id];
        const isMember = !!memberMeta;
        const lastSeenGroupAt =
          memberMeta?.last_seen_qt_at ?? memberMeta?.created_at ?? null;
        const latestQtAt = latestQtByGroup[g.id] ?? null;
        const latestPrayerAt = latestPrayerByGroup[g.id] ?? null;
        const hasNewQtShare =
          isMember && isLaterThan(latestQtAt, lastSeenGroupAt);
        const hasNewPrayer =
          isMember && isLaterThan(latestPrayerAt, lastSeenGroupAt);

        return {
          ...g,
          leaderProfile: leaderProfileMap[g.created_by] ?? null,
          member_count: memberCounts[g.id] ?? 0,
          isMember,
          isFavorite: !!memberMeta?.is_favorite,
          last_seen_qt_at: lastSeenGroupAt,
          latest_qt_at: latestQtAt,
          latest_prayer_at: latestPrayerAt,
          hasNewQtShare,
          hasNewPrayer,
          hasNewContent: hasNewQtShare || hasNewPrayer,
          hasNewQt: hasNewQtShare || hasNewPrayer,
        };
      });
      setGroups(sortGroupsForDisplay(withMeta));
    }
    setLoading(false);
  }

  async function loadGroupDetail(
    group: any,
    preferredSection?: CommunitySectionKey,
    directTarget?: CommunityNotificationDirectTarget,
    options?: { skipHistory?: boolean },
  ) {
    if (!options?.skipHistory) pushCommunityDetailHistory("group");
    setGroupDetailTab(
      preferredSection ??
        (group.hasNewPrayer && !group.hasNewQtShare ? "praying" : "qt"),
    );
    const openedAt = new Date().toISOString();
    const previousSeenAt = group.last_seen_qt_at ?? null;
    setSelectedGroup({
      ...group,
      hasNewQt: false,
      hasNewQtShare: false,
      hasNewPrayer: false,
      hasNewContent: false,
      last_seen_qt_at: openedAt,
    });
    setGroupChallenges([]);
    setGroupChallengeProgress({});
    setLoadingGroupChallenges(!!group.isMember);
    setLoadingGroupQts(true);
    setLoadingGroupPrayers(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const currentHiddenKeys = hiddenKeys;
    const currentHiddenUserIds = hiddenUserIds;

    if (!user) {
      setLoadingGroupChallenges(false);
      setLoadingGroupQts(false);
      setLoadingGroupPrayers(false);
      setNotificationDirectOpenPending(false);
      return;
    }

    if (group.created_by && !group.leaderProfile) {
      void loadProfileCards(supabase, [group.created_by])
        .then(([leaderProfile]) => {
          if (!leaderProfile) return;
          setSelectedGroup((current: any) =>
            current?.id === group.id
              ? { ...current, leaderProfile }
              : current,
          );
        })
        .catch((error) =>
          console.warn("그룹장 프로필 조회 실패:", error),
        );
    }

    // 공개 그룹의 소개는 누구나 볼 수 있지만, 그룹 피드는 참여한 뒤에만 불러옵니다.
    // 그룹 전용 기록은 기존 RLS에서도 그룹원만 조회할 수 있으며,
    // 이 가드는 전체 커뮤니티에도 함께 공유된 기록이 비회원 그룹 화면에 노출되는 것을 막습니다.
    if (!group.isMember) {
      setGroupChallengeRequestStatus(group.id, null);
      setGroupChallenges([]);
      setGroupChallengeProgress({});
      setGroupQts([]);
      setGroupPrayers([]);
      setLoadingGroupChallenges(false);
      setLoadingGroupQts(false);
      setLoadingGroupPrayers(false);
      setNotificationDirectOpenPending(false);
      return;
    }

    if (directTarget) {
      const opened = await openDirectNotificationContent(directTarget, {
        supabase,
        userId: user.id,
      });
      if (opened === "qt") {
        setLoadingGroupQts(false);
        setNotificationDirectOpenPending(false);
      } else if (opened === "prayer") {
        setLoadingGroupPrayers(false);
      } else {
        setNotificationDirectOpenPending(false);
      }
    }

    if (group.isMember) {
      if (user?.id) {
        let latestRequest: any | null = null;
        const { data: summaryRows, error: summaryError } = await supabase.rpc(
          "get_group_challenge_request_summary",
          { p_group_id: group.id },
        );

        if (summaryError) {
          console.warn(
            "그룹 챌린지 그룹 기준 신청 상태 조회 실패. 본인 신청 상태로 fallback:",
            summaryError.message,
          );
          const { data: requestRows, error: requestError } = await supabase
            .from("group_challenge_requests")
            .select(
              "id,status,title,requested_start_date,duration_days,created_at",
            )
            .eq("group_id", group.id)
            .eq("requester_id", user.id)
            .in("status", ["pending", "contacted", "approved"])
            .order("created_at", { ascending: false })
            .limit(1);
          if (requestError) {
            console.warn(
              "그룹 챌린지 신청 상태 조회 실패:",
              requestError.message,
            );
          } else {
            latestRequest = requestRows?.[0] ?? null;
          }
        } else {
          latestRequest = Array.isArray(summaryRows)
            ? (summaryRows[0] ?? null)
            : null;
        }

        setGroupChallengeRequest(
          group.id,
          latestRequest
            ? {
                id: latestRequest.id,
                status: latestRequest.status,
                title: latestRequest.title,
                requested_start_date: latestRequest.requested_start_date,
                requested_end_date:
                  latestRequest.requested_end_date ||
                  deriveChallengeRequestEndDate(
                    latestRequest.requested_start_date,
                    latestRequest.duration_days,
                  ),
                duration_days: latestRequest.duration_days,
                created_at: latestRequest.created_at,
              }
            : null,
        );
      } else {
        setGroupChallengeRequestStatus(group.id, null);
      }

      const { data: challengeRows, error: challengeError } = await supabase
        .from("group_challenges")
        .select(
          "id,request_id,title,description,start_date,end_date,badge_name,badge_description,badge_image_path,status",
        )
        .eq("group_id", group.id)
        .in("status", ["scheduled", "active", "completed"])
        .order("start_date", { ascending: true })
        .limit(5);
      if (challengeError) {
        console.warn("그룹 챌린지 조회 실패:", challengeError.message);
        setGroupChallenges([]);
        setGroupChallengeProgress({});
      } else {
        const nextChallenges = challengeRows ?? [];
        setGroupChallenges(nextChallenges);
        if (user?.id && nextChallenges.length > 0) {
          const progress = await fetchGroupChallengeProgress(
            supabase,
            nextChallenges,
            user.id,
          );
          setGroupChallengeProgress(progress);
        } else {
          setGroupChallengeProgress({});
        }
      }
    } else {
      setGroupChallengeRequestStatus(group.id, null);
      setGroupChallenges([]);
      setGroupChallengeProgress({});
    }
    setLoadingGroupChallenges(false);

    const data = await fetchQtFeedRows(
      supabase,
      `%group_${group.id}%`,
      COMMUNITY_RELATION_QT_LIMIT,
    );
    if (data && user) {
      const profMap = await fetchProfiles(supabase, data);
      const withProfs = filterHiddenItems(
        "qt",
        data.map((r: any) => ({
          ...r,
          profiles: profMap[r.user_id] ?? null,
          isUnreadInGroup: isLaterThan(
            qtUnreadActivityTime(r),
            previousSeenAt,
          ),
        })),
        currentHiddenKeys,
        currentHiddenUserIds,
      );
      setGroupQts(sortQtFeedRows(withProfs));
      // 반응 카운트 로드
      const qtIds = data.map((r: any) => r.id);
      const { counts, mine } = await fetchQtReactions(supabase, qtIds, user.id);
      setQtReactionCounts((prev) => ({ ...prev, ...counts }));
      setMyQtReactions((prev) => ({ ...prev, ...mine }));

      if (group.isMember) {
        const { data: seenRows, error } = await supabase.rpc(
          "mark_group_qt_seen_v2",
          { p_group_id: group.id },
        );
        if (error) {
          console.warn("그룹 큐티 읽음 처리 실패:", error.message);
          const { error: oldError } = await supabase.rpc("mark_group_qt_seen", {
            p_group_id: group.id,
          });
          if (oldError)
            console.warn("기존 그룹 큐티 읽음 처리도 실패:", oldError.message);
        }
        const persistedSeenAt =
          Array.isArray(seenRows) && seenRows[0]?.last_seen_qt_at
            ? seenRows[0].last_seen_qt_at
            : openedAt;
        setGroups((prev) =>
          sortGroupsForDisplay(
            prev.map((g) =>
              g.id === group.id
                ? {
                    ...g,
                    hasNewQt: false,
                    hasNewQtShare: false,
                    hasNewPrayer: false,
                    hasNewContent: false,
                    last_seen_qt_at: persistedSeenAt,
                  }
                : g,
            ),
          ),
        );
      }
    }

    if (user) {
      try {
        const prayerRows = await fetchPrayerFeedRows(
          supabase,
          `%group_${group.id}%`,
        );
        const prayerProfMap = await fetchProfiles(supabase, prayerRows);
        const answeredIds = prayerRows
          .filter((row: any) => !!row.is_answered)
          .map((row: any) => row.id);
        const { counts: likeCounts, mine: myLikedIds } =
          await fetchPrayerLikeMeta(supabase, answeredIds, user.id);
        if (myLikedIds.length > 0) {
          setLikedPrayerIds((prev) =>
            Array.from(new Set([...prev, ...myLikedIds])),
          );
        }
        setGroupPrayers(
          sortPrayerFeedRows(
            filterHiddenItems(
              "prayer",
              prayerRows.map((row: any) => ({
                ...row,
                like_count: likeCounts[row.id] ?? row.like_count ?? 0,
                profiles: prayerProfMap[row.user_id] ?? null,
                isUnreadInGroup: isLaterThan(
                  prayerUnreadActivityTime(row),
                  previousSeenAt,
                ),
              })),
              currentHiddenKeys,
              currentHiddenUserIds,
            ),
          ),
        );
      } catch (prayerError) {
        console.warn("그룹 기도 조회 실패:", prayerError);
        if (directTarget?.contentKind !== "prayer") setGroupPrayers([]);
      }
    } else if (directTarget?.contentKind !== "prayer") {
      setGroupPrayers([]);
    }
    setLoadingGroupPrayers(false);
    setLoadingGroupQts(false);
  }

  // 통합 반응 함수 (큐티 나눔 + 그룹 큐티 공용)
  async function reactToQT(qtId: string, reactionId: string) {
    const myPrev = myQtReactions[qtId];
    const hapticKey = !myPrev
      ? beginLoveHeartTapHaptic("qt_reaction", qtId)
      : null;
    if (!myPrev && !hapticKey) return;

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      if (myPrev === reactionId) {
        // 같은 반응 → 취소
        const { error: delErr } = await supabase
          .from("qt_reactions")
          .delete()
          .eq("qt_id", qtId)
          .eq("user_id", user.id);
        if (delErr) {
          console.error("반응 취소 실패:", delErr);
          return;
        }
        setMyQtReactions((prev) => {
          const n = { ...prev };
          delete n[qtId];
          return n;
        });
        setQtReactionCounts((prev) => ({
          ...prev,
          [qtId]: {
            ...prev[qtId],
            [reactionId]: Math.max(0, (prev[qtId]?.[reactionId] ?? 1) - 1),
          },
        }));
        scrollQtDetailToTop(qtId);
      } else {
        // 새 반응 or 변경 — insert 먼저, 실패하면 update
        const { error: upsertErr } = await supabase
          .from("qt_reactions")
          .upsert(
            { qt_id: qtId, user_id: user.id, reaction: reactionId },
            { onConflict: "qt_id,user_id" },
          );
        if (upsertErr) {
          console.error("반응 저장 실패:", upsertErr);
          // onConflict가 안 먹히는 경우 update 시도
          const { error: updateErr } = await supabase
            .from("qt_reactions")
            .update({ reaction: reactionId })
            .eq("qt_id", qtId)
            .eq("user_id", user.id);
          if (updateErr) {
            console.error("반응 update도 실패:", updateErr);
            return;
          }
        }
        setMyQtReactions((prev) => ({ ...prev, [qtId]: reactionId }));
        setQtReactionCounts((prev) => {
          const cur = { ...prev[qtId] };
          if (myPrev) cur[myPrev] = Math.max(0, (cur[myPrev] ?? 1) - 1);
          cur[reactionId] = (cur[reactionId] ?? 0) + 1;
          return { ...prev, [qtId]: cur };
        });
        scrollQtDetailToTop(qtId);
        void awardCommunityLoveHeart(supabase, "qt_reaction", qtId);

        try {
          const awarded = await checkAndAwardQtReactionBadge(supabase, user.id);
          if (awarded) {
            const popup = getRewardBadgePopup(awarded, lang);
            setBadgePopup(popup);
          }
        } catch (error) {
          console.warn("묵상 리액션 보상 배지 확인 실패:", error);
        }
      }
    } finally {
      finishLoveHeartTapHaptic(hapticKey);
    }
  }

  async function prayTogether(id: string) {
    if (!userId || prayedIds.includes(id)) return;

    const hapticKey = beginLoveHeartTapHaptic("prayer_intercession", id);
    if (!hapticKey) return;

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // 중복 체크
      const { data: existing } = await supabase
        .from("user_prayer_logs")
        .select("id")
        .eq("user_id", user.id)
        .eq("prayer_id", id)
        .maybeSingle();
      if (existing) {
        setPrayedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
        return;
      }

      // 로그 저장
      const { error: logError } = await supabase
        .from("user_prayer_logs")
        .insert({ user_id: user.id, prayer_id: id });
      if (logError) {
        if (logError.code === "23505") setPrayedIds((prev) => [...prev, id]);
        return;
      }

      // 카운트 증가: DB 함수가 실제 로그 개수 기준으로 prayer_count를 동기화합니다.
      // RLS 보안을 위해 클라이언트에서 prayer_items.prayer_count를 직접 update하지 않습니다.
      const { error: rpcError } = await supabase.rpc("increment_prayer_count", {
        prayer_id: id,
      });
      if (rpcError) console.error("기도 카운트 동기화 실패:", rpcError);
      const { data: cur } = await supabase
        .from("prayer_items")
        .select("prayer_count")
        .eq("id", id)
        .single();
      const newCount = cur?.prayer_count ?? 1;

      setPrayedIds((prev) => [...prev, id]);
      storageSetJson(`comm_prayed_${user.id}`, [...prayedIds, id]);
      setPrayers((prev) =>
        prev.map((p) => (p.id === id ? { ...p, prayer_count: newCount } : p)),
      );
      setGroupPrayers((prev) =>
        prev.map((p) => (p.id === id ? { ...p, prayer_count: newCount } : p)),
      );
      setPartnerPrayers((prev) =>
        prev.map((p) => (p.id === id ? { ...p, prayer_count: newCount } : p)),
      );
      setAnsweredPrayers((prev) =>
        prev.map((p) => (p.id === id ? { ...p, prayer_count: newCount } : p)),
      );
      void awardCommunityLoveHeart(supabase, "prayer_intercession", id);

      // 바울 뱃지 체크 (함께 기도 30번)
      let existingPrayerBadgeAwarded = false;
      try {
        const { data: paulBadgeAward, error: paulBadgeAwardError } =
          await supabase.rpc("award_own_paul_badge", {
            p_user_id: user.id,
          });
        if (paulBadgeAwardError) throw paulBadgeAwardError;
        if (paulBadgeAward?.awarded === true) {
          existingPrayerBadgeAwarded = true;
          setBadgePopup({
            img: "/badge_paul.webp",
            title: c("community_badge_paul_title"),
            msg: t("badge_paul_msg", lang),
          });
        }
      } catch (e) {}

      try {
        const awarded = await checkAndAwardPrayTogetherBadge(supabase, user.id);
        if (awarded && !existingPrayerBadgeAwarded) {
          const popup = getRewardBadgePopup(awarded, lang);
          setBadgePopup(popup);
        }
      } catch (error) {
        console.warn("함께 기도 보상 배지 확인 실패:", error);
      }
    } finally {
      finishLoveHeartTapHaptic(hapticKey);
    }
  }

  async function createGroup() {
    if (!groupName.trim() || !userId) return;
    setSavingGroup(true);
    const supabase = createClient();
    const { data: newGroup, error } = await supabase
      .from("groups")
      .insert({
        name: groupName.trim(),
        description: groupDesc.trim() || null,
        is_public: isPublic,
        created_by: userId,
      })
      .select()
      .single();
    if (error || !newGroup) {
      setSavingGroup(false);
      return;
    }
    const { error: memberError } = await supabase
      .from("group_members")
      .insert({ group_id: newGroup.id, user_id: userId });
    if (memberError) {
      setSavingGroup(false);
      return;
    }
    clearSharePromptOptionsCache();
    // 베드로 배지는 첫 그룹 생성, 동행 배지는 그룹 5개 참여 시 지급합니다.
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: groupBadgeAward, error: groupBadgeAwardError } =
          await supabase.rpc("award_own_group_activity_badges", {
            p_user_id: user.id,
            p_created_group_id: newGroup.id,
          });
        if (groupBadgeAwardError) throw groupBadgeAwardError;
        const awardedBadges = new Set(
          Array.isArray(groupBadgeAward?.awarded_badges)
            ? groupBadgeAward.awarded_badges.map((key: unknown) => String(key))
            : [],
        );
        let popup: null | { img: string; title: string; msg: string } = null;
        if (awardedBadges.has("badge_peter")) {
          popup = {
            img: "/badge_peter.webp",
            title: c("community_badge_peter_title"),
            msg: t("badge_peter_msg", lang),
          };
        }
        // 기존 순서 유지: 두 배지를 동시에 받으면 동역 배지가 표시됩니다.
        if (awardedBadges.has("badge_roots_together")) {
          popup = {
            img: "/badge_roots_together.webp",
            title: c("community_badge_roots_together_title"),
            msg: t("badge_roots_together_msg", lang),
          };
        }
        if (popup) setBadgePopup(popup);
      }
    } catch (e) {}
    setGroupName("");
    setGroupDesc("");
    setIsPublic(true);
    setShowGroupForm(false);
    setSavingGroup(false);
    loadData();
  }

  function openPublicGroupHideConfirm(group: any, event?: any) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!group?.id || !group.is_public || group.isMember) return;
    setPublicGroupHideError(null);
    setPublicGroupHideConfirm(group);
  }

  function closePublicGroupHideConfirm() {
    if (hidingPublicGroup) return;
    setPublicGroupHideError(null);
    setPublicGroupHideConfirm(null);
  }

  async function confirmHidePublicGroup() {
    if (
      !userId ||
      !publicGroupHideConfirm?.id ||
      publicGroupHideConfirm.isMember ||
      hidingPublicGroup
    ) {
      return;
    }

    const groupId = String(publicGroupHideConfirm.id);
    setHidingPublicGroup(true);
    setPublicGroupHideError(null);
    const supabase = createClient();
    const { error } = await supabase.from("hidden_community_items").upsert(
      {
        user_id: userId,
        content_type: "group",
        content_id: groupId,
      },
      { onConflict: "user_id,content_type,content_id" },
    );

    if (error) {
      console.warn("공개 그룹 숨기기 실패:", error.message);
      setPublicGroupHideError(c("community_hide_public_group_error"));
      setHidingPublicGroup(false);
      return;
    }

    setGroups((prev) => prev.filter((group) => group.id !== groupId));
    setPublicGroupHideConfirm(null);
    setHidingPublicGroup(false);
  }

  async function joinGroup(groupId: string) {
    if (!userId) return;
    const selectedGroupAtJoin =
      selectedGroup?.id === groupId ? selectedGroup : null;
    const supabase = createClient();
    const { error: joinError } = await supabase
      .from("group_members")
      .upsert(
        { group_id: groupId, user_id: userId },
        { onConflict: "group_id,user_id" },
      );
    if (joinError) {
      console.warn("그룹 참여 실패:", joinError.message);
      return;
    }
    const { error: unhideError } = await supabase
      .from("hidden_community_items")
      .delete()
      .eq("user_id", userId)
      .eq("content_type", "group")
      .eq("content_id", groupId);
    if (unhideError) {
      console.warn("그룹 참여 후 숨김 해제 실패:", unhideError.message);
    }
    clearSharePromptOptionsCache();
    const joinedAt = new Date().toISOString();
    const joinedSelectedGroup = selectedGroupAtJoin
      ? {
          ...selectedGroupAtJoin,
          isMember: true,
          member_count: (selectedGroupAtJoin.member_count ?? 0) + 1,
          last_seen_qt_at: joinedAt,
          hasNewQt: false,
          hasNewQtShare: false,
          hasNewPrayer: false,
          hasNewContent: false,
        }
      : null;
    setGroups((prev) =>
      sortGroupsForDisplay(
        prev.map((g) =>
          g.id === groupId
            ? {
                ...g,
                isMember: true,
                member_count: (g.member_count ?? 0) + 1,
                last_seen_qt_at: joinedAt,
                hasNewQt: false,
                hasNewQtShare: false,
                hasNewPrayer: false,
                hasNewContent: false,
              }
            : g,
        ),
      ),
    );
    if (joinedSelectedGroup) setSelectedGroup(joinedSelectedGroup);

    if (joinedSelectedGroup) {
      try {
        await loadGroupDetail(
          joinedSelectedGroup,
          groupDetailTab,
          undefined,
          { skipHistory: true },
        );
      } catch (error) {
        console.warn("그룹 참여 후 콘텐츠 조회 실패:", error);
      }
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: groupBadgeAward, error: groupBadgeAwardError } =
          await supabase.rpc("award_own_group_activity_badges", {
            p_user_id: user.id,
            p_created_group_id: null,
          });
        if (groupBadgeAwardError) throw groupBadgeAwardError;
        const awardedBadges = new Set(
          Array.isArray(groupBadgeAward?.awarded_badges)
            ? groupBadgeAward.awarded_badges.map((key: unknown) => String(key))
            : [],
        );
        if (awardedBadges.has("badge_roots_together")) {
          setBadgePopup({
            img: "/badge_roots_together.webp",
            title: c("community_badge_roots_together_title"),
            msg: t("badge_roots_together_msg", lang),
          });
        }
      }
    } catch (e) {}
  }

  async function toggleFavoriteGroup(group: any, event?: any) {
    event?.stopPropagation?.();
    if (!userId || !group.isMember || favoriteSavingIds.includes(group.id))
      return;

    const previousFavorite = !!group.isFavorite;
    const nextFavorite = !previousFavorite;

    const applyFavoriteState = (value: boolean) => {
      setGroups((prev) =>
        sortGroupsForDisplay(
          prev.map((g) =>
            g.id === group.id ? { ...g, isFavorite: value } : g,
          ),
        ),
      );
      if (selectedGroup?.id === group.id)
        setSelectedGroup((g: any) => ({ ...g, isFavorite: value }));
    };

    setFavoriteSavingIds((prev) =>
      prev.includes(group.id) ? prev : [...prev, group.id],
    );
    applyFavoriteState(nextFavorite);

    const supabase = createClient();
    const { data: savedRows, error } = await supabase.rpc(
      "set_group_favorite_v2",
      { p_group_id: group.id, p_is_favorite: nextFavorite },
    );

    if (error) {
      console.warn(
        "즐겨찾기 저장 v2 실패. 기존 RPC로 fallback:",
        error.message,
      );
      const { error: legacyError } = await supabase.rpc("set_group_favorite", {
        p_group_id: group.id,
        p_is_favorite: nextFavorite,
      });
      if (legacyError) {
        console.warn("즐겨찾기 저장 실패:", legacyError.message);
        applyFavoriteState(previousFavorite);
        updateFavoriteCache(userId, group.id, previousFavorite);
        setFavoriteSavingIds((prev) => prev.filter((id) => id !== group.id));
        return;
      }
    }

    const persistedFavorite =
      Array.isArray(savedRows) && typeof savedRows[0]?.is_favorite === "boolean"
        ? savedRows[0].is_favorite
        : nextFavorite;

    updateFavoriteCache(userId, group.id, persistedFavorite);
    clearSharePromptOptionsCache();
    applyFavoriteState(persistedFavorite);
    setFavoriteSavingIds((prev) => prev.filter((id) => id !== group.id));
  }

  async function toggleFavoritePartner(partner: any, event?: any) {
    event?.stopPropagation?.();
    if (
      !userId ||
      !partner?.partner_id ||
      partnerFavoriteSavingIds.includes(partner.partner_id)
    )
      return;

    const previousFavorite = !!partner.isFavorite;
    const nextFavorite = !previousFavorite;
    const partnerId = partner.partner_id;

    const applyFavoriteState = (value: boolean) => {
      setPartners((prev) =>
        sortPartnersForDisplay(
          prev.map((item) =>
            item.partner_id === partnerId
              ? { ...item, isFavorite: value }
              : item,
          ),
        ),
      );
      if (selectedPartner?.partner_id === partnerId)
        setSelectedPartner((current: any) => ({
          ...current,
          isFavorite: value,
        }));
    };

    setPartnerFavoriteSavingIds((prev) =>
      prev.includes(partnerId) ? prev : [...prev, partnerId],
    );
    applyFavoriteState(nextFavorite);

    const supabase = createClient();
    const { error } = await supabase.from("companion_preferences").upsert(
      {
        user_id: userId,
        companion_user_id: partnerId,
        is_favorite: nextFavorite,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,companion_user_id" },
    );

    if (error) {
      console.warn("동역자 즐겨찾기 저장 실패:", error.message);
      applyFavoriteState(previousFavorite);
    } else {
      clearSharePromptOptionsCache();
    }

    setPartnerFavoriteSavingIds((prev) =>
      prev.filter((id) => id !== partnerId),
    );
  }

  function isGroupLeader(group: any = selectedGroup) {
    return !!userId && !!group?.created_by && group.created_by === userId;
  }

  function openGroupEditModal() {
    if (!selectedGroup || !isGroupLeader(selectedGroup)) return;
    setGroupEditError(null);
    setEditGroupName(selectedGroup.name ?? "");
    setEditGroupDesc(selectedGroup.description ?? "");
    setEditGroupIsPublic(!!selectedGroup.is_public);
    setShowGroupActionMenu(false);
    setShowGroupEdit(true);
  }

  async function saveGroupEdits() {
    if (
      !selectedGroup?.id ||
      !isGroupLeader(selectedGroup) ||
      savingGroupEdit
    ) {
      return;
    }

    const name = editGroupName.trim();
    const description = editGroupDesc.trim();
    if (!name || name.length > 80 || description.length > 500) {
      setGroupEditError(groupLeaderText.editGroupError);
      return;
    }

    setSavingGroupEdit(true);
    setGroupEditError(null);
    try {
      const result = await requestGroupLeaderAction("update_group", {
        groupId: selectedGroup.id,
        name,
        description,
        isPublic: editGroupIsPublic,
      });
      const updatedGroup = result.group ?? {
        name,
        description: description || null,
        is_public: editGroupIsPublic,
      };

      setSelectedGroup((current: any) =>
        current?.id === selectedGroup.id
          ? { ...current, ...updatedGroup }
          : current,
      );
      setGroups((current) =>
        current.map((group) =>
          group.id === selectedGroup.id
            ? { ...group, ...updatedGroup }
            : group,
        ),
      );
      clearSharePromptOptionsCache();
      setShowGroupEdit(false);
    } catch (error) {
      console.warn("그룹 정보 수정 실패:", error);
      setGroupEditError(groupLeaderText.editGroupError);
    } finally {
      setSavingGroupEdit(false);
    }
  }

  async function openLeadershipTransferModal() {
    if (!selectedGroup || !isGroupLeader(selectedGroup)) return;
    setShowGroupActionMenu(false);
    setLeadershipTransferStep("select");
    setLeadershipTransferTargetId(null);
    setLeadershipTransferError(null);
    setShowLeadershipTransfer(true);
    await loadGroupMemberProfiles(selectedGroup);
  }

  async function confirmLeadershipTransfer() {
    if (
      !selectedGroup?.id ||
      !leadershipTransferTargetId ||
      !isGroupLeader(selectedGroup) ||
      transferringLeadership
    ) {
      return;
    }

    const target = groupMemberProfiles.find(
      (member) => member.id === leadershipTransferTargetId,
    );
    if (!target || target.isLeader) {
      setLeadershipTransferError(groupLeaderText.transferError);
      return;
    }

    setTransferringLeadership(true);
    setLeadershipTransferError(null);
    try {
      await requestGroupLeaderAction("transfer_leadership", {
        groupId: selectedGroup.id,
        targetUserId: target.id,
      });

      const leaderProfile: ProfileCard = {
        id: target.id,
        name: target.name,
        avatar_url: target.avatar_url,
        streak_days: target.streak_days,
      };
      setSelectedGroup((current: any) =>
        current?.id === selectedGroup.id
          ? {
              ...current,
              created_by: target.id,
              leaderProfile,
            }
          : current,
      );
      setGroups((current) =>
        current.map((group) =>
          group.id === selectedGroup.id
            ? {
                ...group,
                created_by: target.id,
                leaderProfile,
              }
            : group,
        ),
      );
      setGroupMemberProfiles((current) =>
        current.map((member) => ({
          ...member,
          isLeader: member.id === target.id,
        })),
      );
      setShowLeadershipTransfer(false);
      setLeadershipTransferStep("select");
      setLeadershipTransferTargetId(null);
    } catch (error) {
      console.warn("그룹장 권한 이전 실패:", error);
      setLeadershipTransferError(groupLeaderText.transferError);
    } finally {
      setTransferringLeadership(false);
    }
  }

  function openMemberRemovalConfirm(member: GroupMemberProfile) {
    if (
      !selectedGroup ||
      !isGroupLeader(selectedGroup) ||
      member.isLeader
    ) {
      return;
    }
    setMemberRemovalError(null);
    setMemberRemovalTarget(member);
  }

  async function removeGroupMember() {
    if (
      !selectedGroup?.id ||
      !memberRemovalTarget ||
      memberRemovalTarget.isLeader ||
      !isGroupLeader(selectedGroup) ||
      removingGroupMember
    ) {
      return;
    }

    setRemovingGroupMember(true);
    setMemberRemovalError(null);
    try {
      await requestGroupLeaderAction("remove_member", {
        groupId: selectedGroup.id,
        targetUserId: memberRemovalTarget.id,
      });

      setGroupMemberProfiles((current) =>
        current.filter((member) => member.id !== memberRemovalTarget.id),
      );
      setSelectedGroup((current: any) =>
        current?.id === selectedGroup.id
          ? {
              ...current,
              member_count: Math.max(0, (current.member_count ?? 1) - 1),
            }
          : current,
      );
      setGroups((current) =>
        current.map((group) =>
          group.id === selectedGroup.id
            ? {
                ...group,
                member_count: Math.max(0, (group.member_count ?? 1) - 1),
              }
            : group,
        ),
      );
      setMemberRemovalTarget(null);
    } catch (error) {
      console.warn("그룹원 내보내기 실패:", error);
      setMemberRemovalError(groupLeaderText.removeError);
    } finally {
      setRemovingGroupMember(false);
    }
  }

  function openDeleteGroupConfirm() {
    if (!selectedGroup || !isGroupLeader(selectedGroup)) return;
    setShowGroupActionMenu(false);
    setDeleteGroupError(null);
    setShowDeleteGroupConfirm(true);
  }

  async function deleteSelectedGroup() {
    if (
      !selectedGroup?.id ||
      !userId ||
      !isGroupLeader(selectedGroup) ||
      deletingGroup
    ) {
      return;
    }

    const groupId = selectedGroup.id;
    setDeletingGroup(true);
    setDeleteGroupError(null);
    try {
      await requestGroupLeaderAction("delete_group", { groupId });
      clearSharePromptOptionsCache();
      updateFavoriteCache(userId, groupId, false);
      clearCommunityDetailHistory("group");
      setGroups((current) =>
        current.filter((group) => group.id !== groupId),
      );
      setDeletingGroup(false);
      resetGroupDetailState();
    } catch (error) {
      console.warn("그룹 삭제 실패:", error);
      setDeleteGroupError(groupLeaderText.deleteGroupError);
      setDeletingGroup(false);
    }
  }

  async function leaveSelectedGroup() {
    if (
      !selectedGroup?.id ||
      !userId ||
      isGroupLeader(selectedGroup) ||
      leavingGroup
    ) {
      return;
    }
    setLeavingGroup(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("leave_group", {
      p_group_id: selectedGroup.id,
    });
    if (error) {
      console.warn("그룹 나가기 실패:", error.message);
      setLeavingGroup(false);
      return;
    }

    clearSharePromptOptionsCache();
    setShowLeaveConfirm(false);
    setShowGroupActionMenu(false);
    setShowGroupMembers(false);
    const leftGroupId = selectedGroup.id;
    const wasPublic = !!selectedGroup.is_public;
    updateFavoriteCache(userId, leftGroupId, false);
    clearCommunityDetailHistory("group");
    setSelectedGroup(null);
    setGroupChallenges([]);
    setLoadingGroupChallenges(false);
    setGroupQts([]);
    setGroupPrayers([]);
    setGroupDetailTab("qt");
    resetQtDetailState();
    setGroups((prev) =>
      sortGroupsForDisplay(
        prev
          .map((g) =>
            g.id === leftGroupId
              ? {
                  ...g,
                  isMember: false,
                  isFavorite: false,
                  hasNewQt: false,
                  hasNewQtShare: false,
                  hasNewPrayer: false,
                  hasNewContent: false,
                  member_count: Math.max(0, (g.member_count ?? 1) - 1),
                }
              : g,
          )
          .filter((g) => wasPublic || g.id !== leftGroupId),
      ),
    );
    setLeavingGroup(false);
  }

  function groupInviteUrl(groupId: string) {
    return `${APP_URL}/join?group=${groupId}&lang=${lang}`;
  }

  async function copyInviteLink(groupId: string) {
    const copied = await copyText(groupInviteUrl(groupId));
    if (copied) {
      setCopiedId(groupId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  async function shareInvite(group: any) {
    const inviteUrl = groupInviteUrl(group.id);
    const text = c("community_group_invite_share_text", {
      name: group.name,
      url: inviteUrl,
    });
    const result = await shareInviteContent({
      title: c("community_group_invite_share_title", { name: group.name }),
      text,
      url: inviteUrl,
    });
    if (result === "copied") {
      setCopiedId(group.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  async function shareApp() {
    const result = await shareInviteContent({
      title: c("community_app_invite_share_title"),
      text: c("community_app_invite_share_text"),
      url: `${APP_URL}/welcome?from=invite`,
    });
    if (result === "copied") {
      setCopiedId("app");
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  function renderPhotoReflectionImage({
    src,
    alt,
    style,
  }: {
    src: string;
    alt?: string;
    style?: CSSProperties;
  }) {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          openPhotoViewer(src, alt);
        }}
        style={{
          width: "100%",
          display: "block",
          padding: 0,
          border: "none",
          background: "transparent",
          cursor: "zoom-in",
          textAlign: "left",
        }}
      >
        <img
          src={src}
          alt={alt || COMMUNITY_LOCAL_TEXT[lang].photoAlt}
          loading="lazy"
          decoding="async"
          style={style}
        />
      </button>
    );
  }

  // 큐티 전체보기 모달
  function renderQTDetailModal(r: any, onClose: () => void) {
    return (
      <div
        key={r.id}
        ref={qtDetailScrollRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: "calc(-1 * var(--native-bottom-system-bar))",
          background: "var(--community-detail-overlay)",
          zIndex: 100,
          overflowY: "auto",
          overscrollBehavior: "contain",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          style={{
            minHeight: "calc(100dvh + var(--native-bottom-system-bar))",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding:
              "calc(20px + var(--safe-area-top)) 16px calc(40px + var(--native-bottom-system-bar))",
          }}
        >
          <div
            style={{
              background: "var(--community-modal-surface)",
              borderRadius: 24,
              border: "1px solid var(--community-card-border)",
              width: "100%",
              maxWidth: 480,
              padding: "24px 20px",
              boxShadow: "var(--shadow-modal)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Avatar
                  url={r.profiles?.avatar_url}
                  name={r.profiles?.name}
                  size={36}
                />
                <div>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--text)",
                    }}
                  >
                    {r.profiles?.name ?? c("community_unknown")}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--text3)" }}>
                    {parseLocalDateString(r.date).toLocaleDateString(
                      getDateLocale(lang),
                      { month: "long", day: "numeric", weekday: "short" },
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text3)",
                  cursor: "pointer",
                }}
              >
                <X size={22} />
              </button>
            </div>
            {r.bible_ref && (
              <div
                style={{
                  background: "var(--terra-light)",
                  borderRadius: 14,
                  padding: "12px 14px",
                  marginBottom: 16,
                  border: "1px solid var(--community-terra-border-soft)",
                }}
              >
                <p
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: "var(--terra-dark)",
                  }}
                >
                  {translateBibleRef(r.bible_ref, lang)}
                </p>
                {r.key_verse && (
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--terra-dark)",
                      lineHeight: 1.7,
                      marginTop: 6,
                      fontStyle: "italic",
                      whiteSpace: "pre-line",
                    }}
                  >
                    "{r.key_verse}"
                    <EsvInlineAttribution row={r} />
                  </p>
                )}
              </div>
            )}
            {r.photo_path && (
              <div style={{ marginBottom: 16 }}>
                {qtPhotoUrls[r.id] ? (
                  renderPhotoReflectionImage({
                    src: qtPhotoUrls[r.id],
                    alt: COMMUNITY_LOCAL_TEXT[lang].photoAlt,
                    style: {
                      width: "100%",
                      maxHeight: 520,
                      objectFit: "contain",
                      borderRadius: 18,
                      border: "1px solid var(--border)",
                      background: "var(--bg3)",
                    },
                  })
                ) : (
                  <div
                    style={{
                      padding: 24,
                      borderRadius: 16,
                      background: "var(--bg3)",
                      color: "var(--text3)",
                      fontSize: 13,
                      textAlign: "center",
                    }}
                  >
                    {COMMUNITY_LOCAL_TEXT[lang].photoLoading}
                  </div>
                )}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {SECTIONS.filter((s) => s.key !== "key_verse" && r[s.key])
                .sort((a, b) => {
                  if (r.qt_mode === "sunday") {
                    const order = [
                      "opening_prayer",
                      "meditation",
                      "application",
                      "decision",
                      "closing_prayer",
                      "summary",
                    ];
                    return order.indexOf(a.key) - order.indexOf(b.key);
                  }
                  return 0;
                })
                .map(
                  ({ key, labelKey, sundayLabelKey, italic, isDecision }) => {
                    const displayLabelKey =
                      key === "summary" &&
                      r.qt_mode === "sunday" &&
                      sundayLabelKey
                        ? sundayLabelKey
                        : labelKey;
                    return (
                      <div key={key}>
                        <p
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: "var(--text3)",
                            letterSpacing: "1px",
                            textTransform: "uppercase",
                            marginBottom: 6,
                          }}
                        >
                          {c(displayLabelKey)}
                        </p>
                        {isDecision ? (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 5,
                            }}
                          >
                            {r[key]
                              .split("\n")
                              .filter((d: string) => d.trim())
                              .map((d: string, i: number) => (
                                <p
                                  key={i}
                                  style={{
                                    fontSize: 13,
                                    color: "var(--text)",
                                    lineHeight: 1.6,
                                  }}
                                >
                                  <span
                                    style={{
                                      fontWeight: 700,
                                      color: "var(--sage-dark)",
                                    }}
                                  >
                                    {i + 1}.
                                  </span>{" "}
                                  {d}
                                </p>
                              ))}
                          </div>
                        ) : (
                          <p
                            style={{
                              fontSize: 13,
                              color: "var(--text)",
                              lineHeight: 1.7,
                              fontStyle: italic ? "italic" : "normal",
                              whiteSpace: "pre-line",
                            }}
                          >
                            {r[key]}
                          </p>
                        )}
                      </div>
                    );
                  },
                )}
            </div>
            <div
              style={{
                borderTop: "1px solid var(--border)",
                marginTop: 20,
                paddingTop: 16,
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  color: "var(--text3)",
                  marginBottom: 10,
                  fontWeight: 600,
                }}
              >
                {c("community_react_to_qt")}
              </p>
              <CommunityReactionButtons
                qtId={r.id}
                counts={qtReactionCounts[r.id] ?? {}}
                selectedReaction={myQtReactions[r.id]}
                lang={lang}
                onReact={reactToQT}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderChallengeRequestModal() {
    if (
      !showChallengeRequestForm ||
      !selectedGroup ||
      !isGroupLeader(selectedGroup)
    )
      return null;
    return (
      <div
        onClick={() => !challengeSaving && setShowChallengeRequestForm(false)}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 285,
          background: "var(--community-overlay-modal)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "18px 18px calc(18px + env(safe-area-inset-bottom))",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: 430,
            maxHeight: "86vh",
            overflowY: "auto",
            background: "var(--community-modal-surface)",
            borderRadius: 26,
            padding: 22,
            border: "1px solid var(--community-card-border)",
            boxShadow: "var(--shadow-modal)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: "var(--sage-dark)",
                  letterSpacing: "0.8px",
                  textTransform: "uppercase",
                  marginBottom: 5,
                }}
              >
                {selectedGroup.name}
              </p>
              <h2
                style={{
                  fontSize: 19,
                  fontWeight: 850,
                  color: "var(--text)",
                  marginBottom: 5,
                }}
              >
                {c("group_challenge_modal_title")}
              </h2>
              {!challengeSuccess && (
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--text3)",
                    lineHeight: 1.55,
                  }}
                >
                  {c("group_challenge_modal_sub")}
                </p>
              )}
            </div>
            <button
              onClick={() =>
                !challengeSaving && setShowChallengeRequestForm(false)
              }
              disabled={challengeSaving}
              aria-label={c("close")}
              style={{
                width: 34,
                height: 34,
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--text3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: challengeSaving ? "default" : "pointer",
                flexShrink: 0,
                opacity: challengeSaving ? 0.6 : 1,
              }}
            >
              <X size={17} />
            </button>
          </div>

          {challengeSuccess ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div
                style={{
                  borderRadius: 20,
                  border: "1px solid var(--community-sage-border)",
                  background: "var(--community-sage-subtle-surface)",
                  padding: 18,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 999,
                    background: "var(--sage-light)",
                    color: "var(--sage-dark)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 10,
                  }}
                >
                  <CheckCircle2 size={24} />
                </div>
                <h3
                  style={{
                    fontSize: 17,
                    fontWeight: 850,
                    color: "var(--text)",
                    marginBottom: 8,
                  }}
                >
                  {c("group_challenge_success_title")}
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--text2)",
                    lineHeight: 1.65,
                  }}
                >
                  {c("group_challenge_success_message")}
                </p>
              </div>
              <button
                onClick={resetChallengeRequestForm}
                className="btn-sage"
                style={{ width: "100%" }}
              >
                {c("group_challenge_success_confirm")}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "var(--text3)",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  {c("group_challenge_title_label")}
                </label>
                <input
                  className="input-field"
                  value={challengeTitle}
                  onChange={(e) => setChallengeTitle(e.target.value)}
                  placeholder={c("group_challenge_title_placeholder")}
                  style={{ height: 46, padding: "0 14px", fontSize: 15 }}
                />
              </div>
              <GroupChallengeScheduleFields
                lang={lang}
                startDate={challengeStartDate}
                endDate={challengeEndDate}
                minStartDate={localDateInputValue(
                  GROUP_CHALLENGE_REQUEST_MIN_LEAD_DAYS,
                )}
                maxEndDate={
                  challengeStartDate
                    ? addDaysToDateInput(
                        challengeStartDate,
                        GROUP_CHALLENGE_REQUEST_MAX_DURATION_DAYS - 1,
                      )
                    : ""
                }
                startLabel={c("group_challenge_start_label")}
                onStartDateChange={(nextStartDate) => {
                  setChallengeStartDate(nextStartDate);
                  if (!nextStartDate) {
                    setChallengeEndDate("");
                    return;
                  }
                  const maximumEndDate = addDaysToDateInput(
                    nextStartDate,
                    GROUP_CHALLENGE_REQUEST_MAX_DURATION_DAYS - 1,
                  );
                  if (
                    !challengeEndDate ||
                    challengeEndDate < nextStartDate ||
                    challengeEndDate > maximumEndDate
                  ) {
                    setChallengeEndDate(
                      addDaysToDateInput(
                        nextStartDate,
                        GROUP_CHALLENGE_REQUEST_DEFAULT_DURATION_DAYS - 1,
                      ),
                    );
                  }
                }}
                onEndDateChange={setChallengeEndDate}
              />
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "var(--text3)",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  {c("group_challenge_description_label")}
                </label>
                <textarea
                  className="textarea-field"
                  rows={3}
                  value={challengeDescription}
                  onChange={(e) => setChallengeDescription(e.target.value)}
                  placeholder={c("group_challenge_description_placeholder")}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "var(--text3)",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  {c("group_challenge_badge_idea_label")}
                </label>
                <textarea
                  className="textarea-field"
                  rows={3}
                  value={challengeBadgeIdea}
                  onChange={(e) => setChallengeBadgeIdea(e.target.value)}
                  placeholder={c("group_challenge_badge_idea_placeholder")}
                />
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--text3)",
                    lineHeight: 1.5,
                    marginTop: 6,
                  }}
                >
                  {c("group_challenge_badge_idea_hint")}
                </p>
              </div>
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "var(--text3)",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  {c("group_challenge_email_label")}
                </label>
                <input
                  type="email"
                  className="input-field"
                  value={challengeContactEmail}
                  onChange={(e) => setChallengeContactEmail(e.target.value)}
                  placeholder="name@example.com"
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "var(--text3)",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  {c("group_challenge_extra_label")}
                </label>
                <textarea
                  className="textarea-field"
                  rows={3}
                  value={challengeExtraQuestions}
                  onChange={(e) => setChallengeExtraQuestions(e.target.value)}
                  placeholder={c("group_challenge_extra_placeholder")}
                />
              </div>
              {challengeError && (
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--community-danger-text)",
                    lineHeight: 1.5,
                  }}
                >
                  {challengeError}
                </p>
              )}
              <button
                onClick={submitChallengeRequest}
                disabled={challengeSaving}
                className="btn-sage"
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  opacity: challengeSaving ? 0.65 : 1,
                }}
              >
                {challengeSaving ? (
                  <Loader2 size={16} className="spin" />
                ) : null}
                {challengeSaving
                  ? c("group_challenge_saving")
                  : c("group_challenge_submit")}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderCompanionChallengeCard() {
    const text = getCompanionChallengeText(lang);

    if (loadingCompanionChallenge && !companionChallengeStatus) {
      return (
        <div
          className="card"
          style={{
            padding: "15px 15px",
            border: "1px solid var(--challenge-border)",
            background: "var(--challenge-loading-surface)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Loader2 size={17} className="spin" style={{ color: "var(--sage)" }} />
            <span style={{ fontSize: 13, fontWeight: 850, color: "var(--text2)" }}>
              {text.loadingTitle}
            </span>
          </div>
        </div>
      );
    }

    if (!companionChallengeStatus) return null;

    const status = companionChallengeStatus;
    const progressPercent = companionChallengeProgressPercent(status);
    const statusLabel = getCompanionChallengeStatusLabel(status, lang);
    const badgeSrc = status.awarded
      ? companionChallengeBadgeImageSrc(status.badgeImagePath)
      : COMPANION_CHALLENGE_MYSTERY_BADGE_SRC;
    const badgeFallbackSrc = status.awarded
      ? COMPANION_CHALLENGE_BADGE_FALLBACK
      : COMPANION_CHALLENGE_MYSTERY_BADGE_SRC;
    const displayTitle = getCompanionChallengeDisplayTitle(
      {
        challengeId: status.challengeId,
        title: status.title,
        badgeName: status.badgeName,
      },
      lang,
    );

    return (
      <div
        className="card"
        style={{
          padding: "15px 15px 14px",
          border: "1px solid var(--challenge-border)",
          background: "var(--challenge-companion-surface)",
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 18,
              background: "var(--challenge-companion-badge-surface)",
              border: "1px solid var(--challenge-companion-badge-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            {badgeSrc ? (
              <img
                src={badgeSrc}
                alt={status.awarded ? displayTitle : t("group_challenge_special_badge_mystery_alt", lang)}
                onError={(event) => {
                  if (event.currentTarget.src.endsWith(badgeFallbackSrc))
                    return;
                  event.currentTarget.src = badgeFallbackSrc;
                }}
                style={{ width: "92%", height: "92%", objectFit: "contain" }}
              />
            ) : (
              <Users size={27} strokeWidth={1.7} style={{ color: "var(--sage-dark)" }} />
            )}
          </div>
          <div style={{ flex: "1 1 auto", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 900, color: "var(--text)", margin: "0 0 4px", lineHeight: 1.35 }}>
                  {displayTitle}
                </p>
                <p style={{ fontSize: 11, color: "var(--challenge-muted-text)", margin: 0, fontWeight: 750 }}>
                  {formatChallengeDate(status.startDate)} – {formatChallengeDate(status.endDate)}
                </p>
              </div>
              <span
                style={{
                  flexShrink: 0,
                  borderRadius: 999,
                  padding: "4px 8px",
                  background: status.status === "active" ? "var(--challenge-status-active-surface)" : "var(--challenge-status-neutral-surface)",
                  color: status.status === "active" ? "var(--challenge-status-active-text)" : "var(--challenge-status-neutral-text)",
                  fontSize: 10,
                  fontWeight: 850,
                }}
              >
                {statusLabel}
              </span>
            </div>
            <p style={{ fontSize: 12, color: "var(--challenge-secondary-text)", lineHeight: 1.55, margin: "9px 0 0" }}>
              {text.cardDescription}
            </p>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
            <span style={{ fontSize: 11, fontWeight: 850, color: "var(--challenge-sage-text)" }}>
              {text.progressLabel} {status.pairCompletedDays} / {status.requiredDays}
            </span>
          </div>
          <div aria-hidden="true" style={{ height: 8, borderRadius: 999, background: "var(--challenge-progress-track)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progressPercent}%`, borderRadius: 999, background: "var(--challenge-progress-fill)" }} />
          </div>
        </div>


        <p style={{ fontSize: 11, color: "var(--challenge-reward-text)", fontWeight: 800, margin: "12px 0 0", lineHeight: 1.45 }}>
          {status.awarded
            ? text.awardedLabel
            : getCompanionChallengeRewardTeaser(status.rewardHearts, lang)}
        </p>
      </div>
    );
  }

  function renderSharedOverlayModals() {
    return (
      <>
        {photoViewer && (
          <PhotoViewerModal
            src={photoViewer.src}
            alt={photoViewer.alt}
            lang={lang}
            onClose={closePhotoViewer}
          />
        )}
        {renderProfileModal()}
        {renderActionMenu()}
        {renderSafetyConfirmModal()}
        {renderManageModal()}
        {renderChallengeRequestModal()}
      </>
    );
  }

  const TABS: { id: typeof tab; label: string }[] = [
    { id: "partner", label: c("community_tab_partner") },
    { id: "group", label: c("community_tab_group") },
    { id: "all", label: c("community_tab_all") },
  ];
  const groupPrayingPrayers = groupPrayers.filter((p: any) => !p.is_answered);
  const groupAnsweredPrayers = groupPrayers.filter((p: any) => !!p.is_answered);
  const groupPrayersForCurrentTab =
    groupDetailTab === "answered" ? groupAnsweredPrayers : groupPrayingPrayers;
  const allQtFeedKey = "all-qt";
  const allPrayingFeedKey = "all-praying";
  const allAnsweredFeedKey = "all-answered";
  const visibleAllQts = visibleFeedItems(allQtFeedKey, qtShares);
  const visibleAllPrayers = visibleFeedItems(allPrayingFeedKey, prayers);
  const visibleAllAnsweredPrayers = visibleFeedItems(
    allAnsweredFeedKey,
    answeredPrayers,
  );

  if (selectedPartner) {
    const partnerProfile = selectedPartner.profile ?? {};
    const partnerName = partnerProfile.name || c("profile_default_name");
    const partnerPrayingPrayers = partnerPrayers.filter(
      (prayer) => !prayer.is_answered,
    );
    const partnerAnsweredPrayers = partnerPrayers.filter(
      (prayer) => prayer.is_answered,
    );
    const partnerPrayersForCurrentTab =
      partnerDetailTab === "answered"
        ? partnerAnsweredPrayers
        : partnerPrayingPrayers;
    const partnerQtFeedKey = `partner-${selectedPartner.partner_id}-qt`;
    const partnerPrayerFeedKey = `partner-${selectedPartner.partner_id}-${partnerDetailTab}`;
    const visiblePartnerQts = visibleFeedItems(partnerQtFeedKey, partnerQts);
    const visiblePartnerPrayers = visibleFeedItems(
      partnerPrayerFeedKey,
      partnerPrayersForCurrentTab,
    );
    const partnerEmptyConfig =
      partnerDetailTab === "qt"
        ? {
            icon: <BookOpen size={24} />,
            title: c("community_partner_empty_qt_title"),
            body: c("community_partner_empty_qt_body"),
            action: c("community_partner_empty_qt_action"),
            path: "/qt",
          }
        : partnerDetailTab === "praying"
          ? {
              icon: <HandHeart size={24} />,
              title: c("community_partner_empty_praying_title"),
              body: c("community_partner_empty_praying_body"),
              action: c("community_partner_empty_praying_action"),
              path: "/prayer",
            }
          : {
              icon: <CheckCircle2 size={24} />,
              title: c("community_partner_empty_answered_title"),
              body: c("community_partner_empty_answered_body"),
              action: c("community_partner_empty_answered_action"),
              path: "/prayer",
            };

    return (
      <div className="page roots-community-phase2d">
        {renderLoveHeartToast()}
        {renderReflectionNudgeToast()}
      {notificationDirectOpenPending && <NotificationDirectOpenOverlay lang={lang} />}
        <div
          style={{
            background: "var(--bg)",
            padding: "var(--roots-page-top-padding) 20px 8px",
          }}
        >
          <button
            onClick={closePartnerDetail}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "none",
              border: "none",
              color: "var(--text3)",
              marginBottom: 14,
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={18} />
            <span style={{ fontSize: 13 }}>{t("back", lang)}</span>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar
              url={partnerProfile.avatar_url}
              name={partnerName}
              size={48}
            />
            <div style={{ minWidth: 0 }}>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: "var(--text)",
                  marginBottom: 4,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {partnerName}
              </h1>
              <p style={{ fontSize: 12, color: "var(--text3)" }}>
                {t("profile_streak", lang, {
                  n: partnerProfile.streak_days ?? 0,
                })}
              </p>
            </div>
            <button
              onClick={(event) => toggleFavoritePartner(selectedPartner, event)}
              disabled={partnerFavoriteSavingIds.includes(
                selectedPartner.partner_id,
              )}
              aria-label={c("community_favorite")}
              style={{
                marginLeft: "auto",
                width: 32,
                height: 32,
                borderRadius: 999,
                border: `1px solid ${selectedPartner.isFavorite ? "var(--community-gold-border)" : "var(--community-card-border)"}`,
                background: selectedPartner.isFavorite
                  ? "var(--community-gold-surface)"
                  : "var(--community-card-surface)",
                color: selectedPartner.isFavorite
                  ? "var(--community-favorite-active)"
                  : "var(--text3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: partnerFavoriteSavingIds.includes(
                  selectedPartner.partner_id,
                )
                  ? "default"
                  : "pointer",
                opacity: partnerFavoriteSavingIds.includes(
                  selectedPartner.partner_id,
                )
                  ? 0.65
                  : 1,
                flexShrink: 0,
              }}
            >
              <Star
                size={16}
                strokeWidth={1.9}
                fill={
                  selectedPartner.isFavorite ? "currentColor" : "transparent"
                }
              />
            </button>
          </div>
        </div>

        <div
          style={{
            padding: "4px 16px 96px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex" }}>
            {[
              { key: "qt" as const, label: c("community_group_tab_qt") },
              {
                key: "praying" as const,
                label: c("community_prayer_tab_praying"),
              },
              {
                key: "answered" as const,
                label: c("community_prayer_tab_answered"),
              },
            ].map(({ key, label }) => {
              const active = partnerDetailTab === key;
              return (
                <button
                  key={key}
                  onClick={() => selectPartnerSection(key)}
                  style={{
                    flex: 1,
                    padding: "8px 0 10px",
                    background: "none",
                    border: "none",
                    borderBottom: active
                      ? "2px solid var(--sage)"
                      : "2px solid transparent",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: active ? 700 : 400,
                      color: active ? "var(--sage-dark)" : "var(--text3)",
                    }}
                  >
                    {label}
                  </span>
                  <SectionUnreadDot
                    show={!active && hasUnreadPartnerSection(key)}
                  />
                </button>
              );
            })}
          </div>

          {renderCompanionChallengeCard()}

          {partnerDetailTab === "qt" ? (
            loadingPartnerQts ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: 24,
                }}
              >
                <Loader2
                  size={20}
                  style={{ color: "var(--sage)" }}
                  className="spin"
                />
              </div>
            ) : partnerQts.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "32px 18px",
                  background: "var(--bg2)",
                  borderRadius: 18,
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 18,
                    margin: "0 auto 12px",
                    background: "var(--sage-light)",
                    color: "var(--sage-dark)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {partnerEmptyConfig.icon}
                </div>
                <h2
                  style={{
                    fontSize: 16,
                    fontWeight: 850,
                    color: "var(--text)",
                    marginBottom: 8,
                  }}
                >
                  {partnerEmptyConfig.title}
                </h2>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--text3)",
                    lineHeight: 1.65,
                    maxWidth: 320,
                    margin: "0 auto 16px",
                  }}
                >
                  {partnerEmptyConfig.body}
                </p>
                <button
                  onClick={() => router.push(partnerEmptyConfig.path)}
                  className="btn-sage"
                  style={{
                    width: "100%",
                    maxWidth: 300,
                    margin: "0 auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {partnerEmptyConfig.action}
                </button>
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {visiblePartnerQts.map((r) => (
                  <div
                    key={r.id}
                    className="card"
                    style={{ cursor: "pointer", position: "relative" }}
                    onClick={() => openQtDetail(r)}
                  >
                    {!r.photo_path && (
                      <ChevronRight
                        size={18}
                        style={{
                          position: "absolute",
                          right: 14,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "var(--text3)",
                          opacity: 0.65,
                          pointerEvents: "none",
                        }}
                      />
                    )}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <AuthorIdentity
                        profile={r.profiles}
                        authorId={r.user_id}
                      />
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          flexShrink: 0,
                        }}
                      >
                        {r.isUnreadInPartner && (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 800,
                              padding: "2px 7px",
                              borderRadius: 10,
                              background: "var(--community-gold-surface)",
                              color: "var(--community-gold-text)",
                              border: "1px solid var(--community-gold-border)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {c("community_unread")}
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: 10,
                            color: "var(--text3)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {parseLocalDateString(r.date).toLocaleDateString(
                            getDateLocale(lang),
                            { month: "short", day: "numeric" },
                          )}
                        </span>
                        <CardMenu
                          kind="qt"
                          item={r}
                          scope="partner"
                          partnerId={selectedPartner.partner_id}
                        />
                      </div>
                    </div>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--terra)",
                        marginBottom: 4,
                        paddingRight: 34,
                      }}
                    >
                      {r.bible_ref
                        ? translateBibleRef(r.bible_ref, lang)
                        : c("community_free_meditation")}
                    </p>
                    {r.key_verse && (
                      <p
                        style={{
                          fontSize: 12,
                          color: "var(--text2)",
                          lineHeight: 1.6,
                          fontStyle: "italic",
                          marginBottom: 10,
                          paddingRight: 34,
                        }}
                      >
                        "{r.key_verse.slice(0, 60)}
                        {r.key_verse.length > 60 ? "..." : ""}"
                        <EsvInlineAttribution row={r} />
                      </p>
                    )}
                    {r.photo_path && qtPhotoUrls[r.id] && (
                      renderPhotoReflectionImage({
                        src: qtPhotoUrls[r.id],
                        alt: COMMUNITY_LOCAL_TEXT[lang].photoAlt,
                        style: {
                          width: "100%",
                          maxHeight: 220,
                          objectFit: "cover",
                          borderRadius: 14,
                          border: "1px solid var(--border)",
                          margin: "6px 0 10px",
                        },
                      })
                    )}
                    {(r.photo_caption || (r.photo_path && r.meditation)) && (
                      <p
                        style={{
                          fontSize: 12,
                          color: "var(--text2)",
                          lineHeight: 1.6,
                          marginBottom: 10,
                          paddingRight: 34,
                          whiteSpace: "pre-line",
                        }}
                      >
                        {r.photo_caption || r.meditation}
                      </p>
                    )}
                    <div onClick={(e) => e.stopPropagation()}>
                      <CommunityReactionButtons
                          qtId={r.id}
                          counts={qtReactionCounts[r.id] ?? {}}
                          selectedReaction={myQtReactions[r.id]}
                          lang={lang}
                          onReact={reactToQT}
                        />
                    </div>
                  </div>
                ))}
                {renderFeedLoadMore(partnerQtFeedKey, partnerQts.length)}
              </div>
            )
          ) : loadingPartnerPrayers ? (
            <div
              style={{ display: "flex", justifyContent: "center", padding: 24 }}
            >
              <Loader2
                size={20}
                style={{ color: "var(--sage)" }}
                className="spin"
              />
            </div>
          ) : partnerPrayersForCurrentTab.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "32px 18px",
                background: "var(--bg2)",
                borderRadius: 18,
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 18,
                  margin: "0 auto 12px",
                  background: "var(--sage-light)",
                  color: "var(--sage-dark)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {partnerEmptyConfig.icon}
              </div>
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 850,
                  color: "var(--text)",
                  marginBottom: 8,
                }}
              >
                {partnerEmptyConfig.title}
              </h2>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text3)",
                  lineHeight: 1.65,
                  maxWidth: 320,
                  margin: "0 auto 16px",
                }}
              >
                {partnerEmptyConfig.body}
              </p>
              <button
                onClick={() => router.push(partnerEmptyConfig.path)}
                className="btn-sage"
                style={{
                  width: "100%",
                  maxWidth: 300,
                  margin: "0 auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {partnerEmptyConfig.action}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {visiblePartnerPrayers.map((p) => (
                <div
                  key={p.id}
                  id={`community-prayer-${p.id}`}
                  className="card"
                  style={{
                    scrollMarginTop: 96,
                    transition: "box-shadow 180ms ease, outline-color 180ms ease",
                    outline:
                      directPrayerTargetId === String(p.id)
                        ? "2px solid var(--sage)"
                        : "2px solid transparent",
                    boxShadow:
                      directPrayerTargetId === String(p.id)
                        ? "var(--community-highlight-shadow)"
                        : undefined,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <AuthorIdentity profile={p.profiles} authorId={p.user_id} />
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flexShrink: 0,
                      }}
                    >
                      {p.isUnreadInPartner && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            padding: "2px 7px",
                            borderRadius: 10,
                            background: "var(--community-gold-surface)",
                            color: "var(--community-gold-text)",
                            border: "1px solid var(--community-gold-border)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {c("community_unread")}
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: 10,
                          color: "var(--text3)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {new Date(
                          p.answered_at ?? p.created_at,
                        ).toLocaleDateString(getDateLocale(lang), {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <CardMenu
                        kind="prayer"
                        item={p}
                        scope="partner"
                        partnerId={selectedPartner.partner_id}
                      />
                    </div>
                  </div>

                  {p.is_answered && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 8,
                      }}
                    >
                      <CheckCircle2
                        size={14}
                        style={{ color: "var(--terra-dark)" }}
                      />
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--terra-dark)",
                        }}
                      >
                        {c("community_answered")}
                      </span>
                      {(p.prayer_count ?? 0) > 0 && (
                        <span style={{ fontSize: 11, color: "var(--text3)" }}>
                          {answeredPrayerCountText(p.prayer_count ?? 0)}
                        </span>
                      )}
                    </div>
                  )}

                  <p
                    style={{
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: p.is_answered ? "var(--text2)" : "var(--text)",
                      marginBottom: 12,
                      whiteSpace: "pre-line",
                      textDecoration: p.is_answered ? "line-through" : "none",
                      opacity: p.is_answered ? 0.72 : 1,
                    }}
                  >
                    {p.content}{" "}
                    {p.is_answered && (
                      <span style={{ fontSize: 10, color: "var(--text3)" }}>
                        ({new Date(p.created_at).toLocaleDateString(getDateLocale(lang), { month: "short", day: "numeric" })})
                      </span>
                    )}
                  </p>

                  {p.testimony && (
                    <div
                      style={{
                        background: "var(--community-gold-surface)",
                        borderRadius: 12,
                        padding: "10px 14px",
                        border: "1px solid var(--community-gold-border)",
                        marginBottom: 8,
                      }}
                    >
                      <p
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "var(--community-gold-text)",
                          marginBottom: 4,
                        }}
                      >
                        {c("community_prayer_testimony")}
                      </p>
                      <p
                        style={{
                          fontSize: 13,
                          color: "var(--text)",
                          lineHeight: 1.6,
                          fontStyle: "italic",
                        }}
                      >
                        "{p.testimony}"
                      </p>
                    </div>
                  )}

                  {p.is_answered && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                      }}
                    >
                      <PrayerLikeButton prayer={p} />
                    </div>
                  )}

                  {!p.is_answered && (
                    <button
                      onClick={() => prayTogether(p.id)}
                      disabled={prayedIds.includes(p.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        width: "100%",
                        padding: "10px",
                        borderRadius: 12,
                        border: `1px solid ${prayedIds.includes(p.id) ? "var(--sage)" : "var(--border)"}`,
                        background: prayedIds.includes(p.id)
                          ? "var(--sage-light)"
                          : "var(--bg2)",
                        cursor: prayedIds.includes(p.id)
                          ? "default"
                          : "pointer",
                      }}
                    >
                      <span style={{ fontSize: 14 }}>
                        {prayedIds.includes(p.id) ? (
                          <CheckCircle2 size={14} />
                        ) : (
                          <HandHeart size={14} />
                        )}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: prayedIds.includes(p.id)
                            ? "var(--sage-dark)"
                            : "var(--text2)",
                        }}
                      >
                        {prayerActionText(p, prayedIds.includes(p.id))}
                      </span>
                    </button>
                  )}
                </div>
              ))}
              {renderFeedLoadMore(
                partnerPrayerFeedKey,
                partnerPrayersForCurrentTab.length,
              )}
            </div>
          )}
        </div>

        {detailQt && renderQTDetailModal(detailQt, closeQtDetail)}
        {renderSharedOverlayModals()}
        <BottomNav />
      </div>
    );
  }

  if (selectedGroup) {
    const groupQtFeedKey = `group-${selectedGroup.id}-qt`;
    const groupPrayerFeedKey = `group-${selectedGroup.id}-${groupDetailTab}`;
    const viewerIsGroupLeader = isGroupLeader(selectedGroup);
    const leadershipTransferTarget = groupMemberProfiles.find(
      (member) => member.id === leadershipTransferTargetId,
    );
    const leadershipTransferCandidates = groupMemberProfiles.filter(
      (member) => !member.isLeader,
    );
    const visibleGroupQts = visibleFeedItems(groupQtFeedKey, groupQts);
    const visibleGroupPrayers = visibleFeedItems(
      groupPrayerFeedKey,
      groupPrayersForCurrentTab,
    );
    return (
      <div className="page roots-community-phase2d">
        {renderLoveHeartToast()}
        {renderReflectionNudgeToast()}
      {notificationDirectOpenPending && <NotificationDirectOpenOverlay lang={lang} />}
        <div
          style={{
            background: "var(--bg)",
            padding: "var(--roots-page-top-padding) 20px 8px",
          }}
        >
          <button
            onClick={closeGroupDetail}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "none",
              border: "none",
              color: "var(--text3)",
              marginBottom: 14,
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={18} />
            <span style={{ fontSize: 13 }}>{t("back", lang)}</span>
          </button>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
              position: "relative",
            }}
          >
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "var(--text)",
                minWidth: 0,
              }}
            >
              {selectedGroup.name}
            </h1>
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                padding: "2px 7px",
                borderRadius: 10,
                background: selectedGroup.is_public
                  ? "var(--sage-light)"
                  : "var(--bg3)",
                color: selectedGroup.is_public
                  ? "var(--sage-dark)"
                  : "var(--text3)",
                border: `1px solid ${selectedGroup.is_public ? "var(--community-sage-border)" : "var(--community-card-border)"}`,
              }}
            >
              {selectedGroup.is_public
                ? c("community_public")
                : c("community_private")}
            </span>
            {selectedGroup.isMember && (
              <button
                onClick={(e) => toggleFavoriteGroup(selectedGroup, e)}
                disabled={favoriteSavingIds.includes(selectedGroup.id)}
                aria-label={c("community_favorite")}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 999,
                  border: `1px solid ${selectedGroup.isFavorite ? "var(--community-gold-border)" : "var(--community-card-border)"}`,
                  background: selectedGroup.isFavorite
                    ? "var(--community-gold-surface)"
                    : "var(--community-card-surface)",
                  color: selectedGroup.isFavorite
                    ? "var(--community-favorite-active)"
                    : "var(--text3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: favoriteSavingIds.includes(selectedGroup.id)
                    ? "default"
                    : "pointer",
                  opacity: favoriteSavingIds.includes(selectedGroup.id)
                    ? 0.65
                    : 1,
                  flexShrink: 0,
                }}
              >
                <Star
                  size={16}
                  strokeWidth={1.9}
                  fill={
                    selectedGroup.isFavorite ? "currentColor" : "transparent"
                  }
                />
              </button>
            )}
            <button
              onClick={() => setShowGroupActionMenu((prev) => !prev)}
              aria-label={c("community_group_actions")}
              style={{
                marginLeft: "auto",
                width: 34,
                height: 34,
                border: "none",
                background: "transparent",
                color: "var(--text3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: 0,
                flexShrink: 0,
              }}
            >
              <MoreHorizontal size={22} />
            </button>
            {showGroupActionMenu && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: 38,
                  zIndex: 80,
                  minWidth: viewerIsGroupLeader ? 250 : 180,
                  borderRadius: 18,
                  border: "1px solid var(--community-card-border)",
                  background: "var(--community-popover-surface)",
                  boxShadow: "var(--shadow-popover)",
                  padding: 8,
                }}
              >
                <button
                  onClick={() => {
                    setShowGroupActionMenu(false);
                    shareInvite(selectedGroup);
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "11px 10px",
                    border: "none",
                    background: "transparent",
                    color: "var(--sage-dark)",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <Share2 size={15} />
                  {c("community_invite")}
                </button>
                <button
                  onClick={() => {
                    setShowGroupActionMenu(false);
                    copyInviteLink(selectedGroup.id);
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "11px 10px",
                    border: "none",
                    background: "transparent",
                    color: "var(--text2)",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {copiedId === selectedGroup.id ? (
                    <Check size={15} />
                  ) : (
                    <Copy size={15} />
                  )}
                  {copiedId === selectedGroup.id
                    ? c("community_copied")
                    : c("community_copy_link")}
                </button>
                {viewerIsGroupLeader && (
                  <>
                    <div
                      style={{
                        height: 1,
                        background: "var(--community-card-border)",
                        margin: "4px 6px",
                      }}
                    />
                    <p
                      style={{
                        padding: "6px 10px 3px",
                        fontSize: 10,
                        fontWeight: 800,
                        color: "var(--text3)",
                      }}
                    >
                      {groupLeaderText.groupManagement}
                    </p>
                    <button
                      onClick={openGroupEditModal}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 9,
                        padding: "11px 10px",
                        border: "none",
                        background: "transparent",
                        color: "var(--text2)",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <Edit3 size={15} />
                      {groupLeaderText.editGroup}
                    </button>
                    <button
                      onClick={openLeadershipTransferModal}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 9,
                        padding: "11px 10px",
                        border: "none",
                        background: "transparent",
                        color: "var(--text2)",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <Crown size={15} />
                      {groupLeaderText.transferLeadership}
                    </button>
                    <button
                      onClick={openDeleteGroupConfirm}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 9,
                        padding: "11px 10px",
                        border: "none",
                        background: "transparent",
                        color: "var(--community-danger-text)",
                        fontSize: 13,
                        fontWeight: 800,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <Trash2 size={15} />
                      {groupLeaderText.deleteGroup}
                    </button>
                  </>
                )}
                {selectedGroup.isMember && !viewerIsGroupLeader && (
                  <button
                    onClick={() => {
                      setShowGroupActionMenu(false);
                      setShowLeaveConfirm(true);
                    }}
                    disabled={leavingGroup}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      padding: "11px 10px",
                      border: "none",
                      background: "transparent",
                      color: "var(--community-danger-text)",
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: leavingGroup ? "default" : "pointer",
                      textAlign: "left",
                      opacity: leavingGroup ? 0.65 : 1,
                    }}
                  >
                    {leavingGroup ? (
                      <Loader2 size={15} className="spin" />
                    ) : (
                      <LogOut size={15} />
                    )}
                    {c("community_leave_group")}
                  </button>
                )}
              </div>
            )}
          </div>
          {selectedGroup.description && (
            <p style={{ fontSize: 13, color: "var(--text3)" }}>
              {selectedGroup.description}
            </p>
          )}
          <button
            onClick={() => openGroupMembers(selectedGroup)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: "none",
              border: "none",
              padding: 0,
              fontSize: 12,
              color: "var(--sage-dark)",
              marginTop: 6,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <span>{memberCountText(selectedGroup.member_count ?? 0)}</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div
          style={{
            padding: "4px 16px 0",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {!selectedGroup.isMember && (
            <button
              onClick={() => joinGroup(selectedGroup.id)}
              className="btn-sage"
              style={{ width: "100%" }}
            >
              {c("community_join")}
            </button>
          )}

          {selectedGroup.isMember && (
            <>
              {(loadingGroupChallenges ||
                visibleGroupChallengeCards().length > 0) && (
                <div
                  style={{
                    borderRadius: 20,
                    border: "1px solid var(--challenge-border)",
                    background: "var(--challenge-section-surface)",
                    padding: "15px 15px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 11,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 850,
                        color: "var(--text)",
                        margin: 0,
                        lineHeight: 1.35,
                      }}
                    >
                      {c(
                        groupChallengeSectionTitleKey(
                          visibleGroupChallengeCards(),
                        ),
                      )}
                      {groupChallengeSectionTitleKey(
                        visibleGroupChallengeCards(),
                      ) === "group_challenge_approved_section_title" && (
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 500,
                            color: "var(--challenge-muted-text)",
                            lineHeight: 1.45,
                          }}
                        >
                          {` (${c("group_challenge_auto_participation_note")})`}
                        </span>
                      )}
                    </p>
                    {loadingGroupChallenges && (
                      <Loader2
                        size={15}
                        className="spin"
                        style={{ color: "var(--sage)" }}
                      />
                    )}
                  </div>
                  {!loadingGroupChallenges &&
                    visibleGroupChallengeCards().map((challenge) => (
                      <div
                        key={challenge.id}
                        style={{
                          borderRadius: 17,
                          border: "1px solid var(--challenge-item-border)",
                          background: "var(--challenge-item-surface)",
                          padding: "12px 13px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 13,
                          }}
                        >
                          <div
                            style={{
                              width: 62,
                              height: 62,
                              borderRadius: 18,
                              background: "var(--challenge-group-badge-surface)",
                              border: "1px solid var(--challenge-group-badge-border)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              overflow: "hidden",
                              flexShrink: 0,
                            }}
                          >
                            <img
                              src="/images/group-challenges/mystery-badge.png"
                              alt=""
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "contain",
                              }}
                            />
                          </div>
                          <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                justifyContent: "space-between",
                                gap: 8,
                              }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <p
                                  style={{
                                    fontSize: 14,
                                    fontWeight: 850,
                                    color: "var(--text)",
                                    margin: "0 0 4px",
                                    lineHeight: 1.35,
                                  }}
                                >
                                  {challenge.title}
                                </p>
                                <p
                                  style={{
                                    fontSize: 11,
                                    color: "var(--challenge-muted-text)",
                                    margin: 0,
                                    fontWeight: 700,
                                  }}
                                >
                                  {challengeDateRange(challenge)}
                                </p>
                              </div>
                              <span
                                style={{
                                  flexShrink: 0,
                                  borderRadius: 999,
                                  padding: "4px 8px",
                                  background:
                                    challengeDisplayStatus(challenge) ===
                                    "active"
                                      ? "var(--challenge-status-active-surface)"
                                      : "var(--challenge-status-neutral-surface)",
                                  color:
                                    challengeDisplayStatus(challenge) ===
                                    "active"
                                      ? "var(--challenge-status-active-text)"
                                      : "var(--challenge-status-neutral-text)",
                                  fontSize: 10,
                                  fontWeight: 850,
                                }}
                              >
                                {challengeStatusLabel(challenge)}
                              </span>
                            </div>
                            <p
                              style={{
                                fontSize: 11,
                                color: "var(--challenge-reward-text)",
                                fontWeight: 800,
                                margin: "8px 0 0",
                                lineHeight: 1.45,
                              }}
                            >
                              {c("group_challenge_special_badge_teaser")}
                            </p>
                          </div>
                        </div>
                        {groupChallengeProgress[challenge.id] && (
                          <div style={{ marginTop: 10 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                                marginBottom: 6,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 850,
                                  color: "var(--challenge-sage-text)",
                                }}
                              >
                                {c("group_challenge_progress_day", {
                                  day: groupChallengeProgress[challenge.id]
                                    .doneDays,
                                })}
                              </span>
                            </div>
                            <div
                              aria-hidden="true"
                              style={{
                                height: 8,
                                borderRadius: 999,
                                background: "var(--challenge-progress-track)",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${challengeProgressPercent(groupChallengeProgress[challenge.id])}%`,
                                  borderRadius: 999,
                                  background: "var(--challenge-progress-fill)",
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}

              {!loadingGroupChallenges &&
                visibleGroupChallengeCards().length === 0 &&
                preparingApprovedGroupChallengeRequest(selectedGroup.id) && (
                  <div
                    style={{
                      borderRadius: 20,
                      border: "1px solid var(--challenge-border)",
                      background: "var(--challenge-invite-surface)",
                      padding: "16px 15px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 850,
                        color: "var(--text)",
                        margin: 0,
                      }}
                    >
                      {c("group_challenge_preparing_title")}
                    </p>
                    {preparingApprovedGroupChallengeRequest(selectedGroup.id)
                      ?.title && (
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: "var(--challenge-sage-text)",
                          margin: 0,
                          lineHeight: 1.35,
                        }}
                      >
                        {
                          preparingApprovedGroupChallengeRequest(
                            selectedGroup.id,
                          )?.title
                        }
                      </p>
                    )}
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--challenge-secondary-text)",
                        lineHeight: 1.55,
                        margin: 0,
                      }}
                    >
                      {challengeRequestScheduleText(
                        preparingApprovedGroupChallengeRequest(
                          selectedGroup.id,
                        )!,
                      )}
                    </p>
                  </div>
                )}

              {!loadingGroupChallenges &&
                visibleGroupChallengeCards().length === 0 &&
                !preparingApprovedGroupChallengeRequest(selectedGroup.id) && (
                  <div
                    style={{
                      borderRadius: 20,
                      border: "1px solid var(--challenge-border)",
                      background: "var(--challenge-invite-surface)",
                      padding: "16px 15px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 13,
                    }}
                  >
                    <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 14,
                          fontWeight: 850,
                          color: "var(--text)",
                          margin: "0 0 7px",
                          minWidth: 0,
                        }}
                      >
                        {c("group_challenge_card_title")}
                      </p>
                      <p
                        style={{
                          fontSize: 12,
                          color: "var(--challenge-secondary-text)",
                          lineHeight: 1.55,
                          whiteSpace: "pre-line",
                          margin: 0,
                        }}
                      >
                        {c("group_challenge_card_body")}
                      </p>
                      {!viewerIsGroupLeader &&
                        !hasActiveGroupChallengeRequest(selectedGroup.id) && (
                          <p
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              fontSize: 11,
                              fontWeight: 800,
                              color: "var(--challenge-sage-text)",
                              lineHeight: 1.45,
                              margin: "9px 0 0",
                            }}
                          >
                            <Crown size={13} aria-hidden="true" />
                            {groupChallengeRequestText.leaderOnlyNotice}
                          </p>
                        )}
                    </div>
                    {(viewerIsGroupLeader ||
                      hasActiveGroupChallengeRequest(selectedGroup.id)) && (
                      <button
                        onClick={openChallengeRequestForm}
                        disabled={hasActiveGroupChallengeRequest(
                          selectedGroup.id,
                        )}
                        style={{
                          flex: "0 0 auto",
                          border: "none",
                          borderRadius: 16,
                          background: hasActiveGroupChallengeRequest(
                            selectedGroup.id,
                          )
                            ? "var(--challenge-disabled-surface)"
                            : "var(--challenge-action)",
                          color: hasActiveGroupChallengeRequest(selectedGroup.id)
                            ? "var(--challenge-disabled-text)"
                            : "var(--challenge-on-action)",
                          padding: "11px 16px",
                          minWidth: 82,
                          fontSize: 12,
                          fontWeight: 850,
                          cursor: hasActiveGroupChallengeRequest(
                            selectedGroup.id,
                          )
                            ? "default"
                            : "pointer",
                          whiteSpace: "nowrap",
                          opacity: hasActiveGroupChallengeRequest(
                            selectedGroup.id,
                          )
                            ? 0.92
                            : 1,
                        }}
                      >
                        {hasActiveGroupChallengeRequest(selectedGroup.id)
                          ? c("group_challenge_requested_btn")
                          : c("group_challenge_apply_btn")}
                      </button>
                    )}
                  </div>
                )}
            </>
          )}

          <div style={{ marginTop: selectedGroup.isMember ? 2 : 0 }}>
            <div style={{ display: "flex", marginBottom: 12 }}>
              {[
                { key: "qt" as const, label: c("community_group_tab_qt") },
                {
                  key: "praying" as const,
                  label: c("community_prayer_tab_praying"),
                },
                {
                  key: "answered" as const,
                  label: c("community_prayer_tab_answered"),
                },
              ].map(({ key, label }) => {
                const active = groupDetailTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => selectGroupSection(key)}
                    style={{
                      flex: 1,
                      padding: "8px 0 10px",
                      background: "none",
                      border: "none",
                      borderBottom: active
                        ? "2px solid var(--sage)"
                        : "2px solid transparent",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: active ? 700 : 400,
                        color: active ? "var(--sage-dark)" : "var(--text3)",
                      }}
                    >
                      {label}
                    </span>
                    <SectionUnreadDot
                      show={!active && hasUnreadGroupSection(key)}
                    />
                  </button>
                );
              })}
            </div>

            {!selectedGroup.isMember ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "32px 18px",
                  background: "var(--bg2)",
                  borderRadius: 16,
                  border: "1px solid var(--border)",
                }}
              >
                <UserPlus
                  size={24}
                  style={{ color: "var(--sage-dark)", marginBottom: 8 }}
                />
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--text2)",
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {c("community_join_to_view_group_content")}
                </p>
              </div>
            ) : groupDetailTab === "qt" ? (
              loadingGroupQts ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    padding: 24,
                  }}
                >
                  <Loader2
                    size={20}
                    style={{ color: "var(--sage)" }}
                    className="spin"
                  />
                </div>
              ) : groupQts.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "32px 0",
                    background: "var(--bg2)",
                    borderRadius: 16,
                    border: "1px solid var(--border)",
                  }}
                >
                  <BookOpen
                    size={24}
                    style={{ color: "var(--text3)", marginBottom: 8 }}
                  />
                  <p style={{ fontSize: 13, color: "var(--text3)" }}>
                    {c("community_no_group_qts")}
                  </p>
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {visibleGroupQts.map((r) => (
                    <div
                      key={r.id}
                      className="card"
                      style={{ cursor: "pointer", position: "relative" }}
                      onClick={() => openQtDetail(r)}
                    >
                      {!r.photo_path && (
                        <ChevronRight
                          size={18}
                          style={{
                            position: "absolute",
                            right: 14,
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "var(--text3)",
                            opacity: 0.65,
                            pointerEvents: "none",
                          }}
                        />
                      )}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <AuthorIdentity
                          profile={r.profiles}
                          authorId={r.user_id}
                        />
                        <div
                          style={{
                            position: "absolute",
                            top: 18,
                            right: 18,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          {r.isUnreadInGroup && (
                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: 800,
                                padding: "2px 7px",
                                borderRadius: 10,
                                background: "var(--community-gold-surface)",
                                color: "var(--community-gold-text)",
                                border: "1px solid var(--community-gold-border)",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {c("community_unread")}
                            </span>
                          )}
                          <span style={{ fontSize: 10, color: "var(--text3)" }}>
                            {parseLocalDateString(r.date).toLocaleDateString(
                              getDateLocale(lang),
                              { month: "short", day: "numeric" },
                            )}
                          </span>
                          <CardMenu
                            kind="qt"
                            item={r}
                            scope={selectedGroup ? "group" : "all"}
                            groupId={selectedGroup?.id}
                          />
                        </div>
                      </div>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "var(--terra)",
                          marginBottom: 4,
                          paddingRight: 34,
                        }}
                      >
                        {r.bible_ref
                          ? translateBibleRef(r.bible_ref, lang)
                          : c("community_free_meditation")}
                      </p>
                      {r.key_verse && (
                        <p
                          style={{
                            fontSize: 12,
                            color: "var(--text2)",
                            lineHeight: 1.6,
                            fontStyle: "italic",
                            marginBottom: 10,
                            paddingRight: 34,
                          }}
                        >
                          "{r.key_verse.slice(0, 60)}
                          {r.key_verse.length > 60 ? "..." : ""}"
                          <EsvInlineAttribution row={r} />
                        </p>
                      )}
                      {r.photo_path && qtPhotoUrls[r.id] && (
                        renderPhotoReflectionImage({
                          src: qtPhotoUrls[r.id],
                          alt: COMMUNITY_LOCAL_TEXT[lang].photoAlt,
                          style: {
                            width: "100%",
                            maxHeight: 220,
                            objectFit: "cover",
                            borderRadius: 14,
                            border: "1px solid var(--border)",
                            margin: "6px 0 10px",
                          },
                        })
                      )}
                      {(r.photo_caption || (r.photo_path && r.meditation)) && (
                        <p
                          style={{
                            fontSize: 12,
                            color: "var(--text2)",
                            lineHeight: 1.6,
                            marginBottom: 10,
                            paddingRight: 34,
                            whiteSpace: "pre-line",
                          }}
                        >
                          {r.photo_caption || r.meditation}
                        </p>
                      )}
                      <div onClick={(e) => e.stopPropagation()}>
                        <CommunityReactionButtons
                          qtId={r.id}
                          counts={qtReactionCounts[r.id] ?? {}}
                          selectedReaction={myQtReactions[r.id]}
                          lang={lang}
                          onReact={reactToQT}
                        />
                      </div>
                    </div>
                  ))}
                  {renderFeedLoadMore(groupQtFeedKey, groupQts.length)}
                </div>
              )
            ) : loadingGroupPrayers ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: 24,
                }}
              >
                <Loader2
                  size={20}
                  style={{ color: "var(--sage)" }}
                  className="spin"
                />
              </div>
            ) : groupPrayersForCurrentTab.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "32px 0",
                  background: "var(--bg2)",
                  borderRadius: 16,
                  border: "1px solid var(--border)",
                }}
              >
                <HandHeart
                  size={24}
                  style={{ color: "var(--text3)", marginBottom: 8 }}
                />
                <p style={{ fontSize: 13, color: "var(--text3)" }}>
                  {groupDetailTab === "answered"
                    ? c("community_no_group_answered_prayers")
                    : c("community_no_group_prayers")}
                </p>
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {visibleGroupPrayers.map((p) => (
                  <div
                    key={p.id}
                    id={`community-prayer-${p.id}`}
                    className="card"
                    style={{
                    scrollMarginTop: 96,
                    transition: "box-shadow 180ms ease, outline-color 180ms ease",
                    outline:
                      directPrayerTargetId === String(p.id)
                        ? "2px solid var(--sage)"
                        : "2px solid transparent",
                      boxShadow:
                        directPrayerTargetId === String(p.id)
                          ? "var(--community-highlight-shadow)"
                          : undefined,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <AuthorIdentity
                        profile={p.profiles}
                        authorId={p.user_id}
                      />
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        {p.isUnreadInGroup && (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 800,
                              padding: "2px 7px",
                              borderRadius: 10,
                              background: "var(--community-gold-surface)",
                              color: "var(--community-gold-text)",
                              border: "1px solid var(--community-gold-border)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {c("community_unread")}
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: 10,
                            color: "var(--text3)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {new Date(
                            p.answered_at ?? p.created_at,
                          ).toLocaleDateString(getDateLocale(lang), {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        {!p.is_answered && (
                          <CardMenu
                            kind="prayer"
                            item={p}
                            scope={selectedGroup ? "group" : "all"}
                            groupId={selectedGroup?.id}
                          />
                        )}
                      </div>
                    </div>

                    {p.is_answered && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginBottom: 8,
                        }}
                      >
                        <CheckCircle2
                          size={14}
                          style={{ color: "var(--terra-dark)" }}
                        />
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "var(--terra-dark)",
                          }}
                        >
                          {c("community_answered")}
                        </span>
                        {(p.prayer_count ?? 0) > 0 && (
                          <span style={{ fontSize: 11, color: "var(--text3)" }}>
                            {answeredPrayerCountText(p.prayer_count ?? 0)}
                          </span>
                        )}
                      </div>
                    )}

                    <p
                      style={{
                        fontSize: 13,
                        lineHeight: 1.6,
                        color: p.is_answered ? "var(--text2)" : "var(--text)",
                        marginBottom: 12,
                        whiteSpace: "pre-line",
                        textDecoration: p.is_answered ? "line-through" : "none",
                        opacity: p.is_answered ? 0.72 : 1,
                      }}
                    >
                      {p.content}{" "}
                      {p.is_answered && (
                        <span style={{ fontSize: 10, color: "var(--text3)" }}>
                          ({new Date(p.created_at).toLocaleDateString(getDateLocale(lang), { month: "short", day: "numeric" })})
                        </span>
                      )}
                    </p>

                    {p.testimony && (
                      <div
                        style={{
                          background: "var(--community-gold-surface)",
                          borderRadius: 12,
                          padding: "10px 14px",
                          border: "1px solid var(--community-gold-border)",
                          marginBottom: 8,
                        }}
                      >
                        <p
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: "var(--community-gold-text)",
                            marginBottom: 4,
                          }}
                        >
                          {c("community_prayer_testimony")}
                        </p>
                        <p
                          style={{
                            fontSize: 13,
                            color: "var(--text)",
                            lineHeight: 1.6,
                            fontStyle: "italic",
                          }}
                        >
                          "{p.testimony}"
                        </p>
                      </div>
                    )}

                    {p.is_answered && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                        }}
                      >
                        <PrayerLikeButton prayer={p} />
                      </div>
                    )}

                    {!p.is_answered && (
                      <button
                        onClick={() => prayTogether(p.id)}
                        disabled={prayedIds.includes(p.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          width: "100%",
                          padding: "10px",
                          borderRadius: 12,
                          border: `1px solid ${prayedIds.includes(p.id) ? "var(--sage)" : "var(--border)"}`,
                          background: prayedIds.includes(p.id)
                            ? "var(--sage-light)"
                            : "var(--bg2)",
                          cursor: prayedIds.includes(p.id)
                            ? "default"
                            : "pointer",
                        }}
                      >
                        <span style={{ fontSize: 14 }}>
                          {prayedIds.includes(p.id) ? (
                            <CheckCircle2 size={14} />
                          ) : (
                            <HandHeart size={14} />
                          )}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: prayedIds.includes(p.id)
                              ? "var(--sage-dark)"
                              : "var(--text2)",
                          }}
                        >
                          {prayerActionText(p, prayedIds.includes(p.id))}
                        </span>
                      </button>
                    )}
                  </div>
                ))}
                {renderFeedLoadMore(
                  groupPrayerFeedKey,
                  groupPrayersForCurrentTab.length,
                )}
              </div>
            )}
          </div>
        </div>
        {renderSharedOverlayModals()}
        {showGroupMembers && selectedGroup && (
          <div
            onClick={() => setShowGroupMembers(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 215,
              background: "var(--community-overlay-sheet)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              padding: "0 14px 18px",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 430,
                background: "var(--community-modal-surface)",
                borderRadius: 26,
                padding: 20,
                border: "1px solid var(--community-card-border)",
                boxShadow: "var(--shadow-sheet)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: "var(--text)",
                      marginBottom: 3,
                    }}
                  >
                    {c("community_members_title")}
                  </h2>
                  <p style={{ fontSize: 12, color: "var(--text3)" }}>
                    {memberCountText(
                      selectedGroup.member_count ?? groupMemberProfiles.length,
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setShowGroupMembers(false)}
                  aria-label={c("close")}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                    color: "var(--text3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <X size={17} />
                </button>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  maxHeight: "52vh",
                  overflowY: "auto",
                }}
              >
                {loadingGroupMembers ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "22px 0",
                      color: "var(--text3)",
                      fontSize: 13,
                    }}
                  >
                    <Loader2 size={16} className="spin" />
                    {c("community_members_loading")}
                  </div>
                ) : groupMemberProfiles.length > 0 ? (
                  groupMemberProfiles.map((member) => (
                    <div
                      key={member.id}
                      role="button"
                      tabIndex={0}
                      aria-label={member.name || c("community_member_unknown")}
                      onClick={(event) => void openAuthorProfile(member, member.id, event)}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        void openAuthorProfile(member, member.id);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "9px 4px",
                        borderRadius: 12,
                        cursor: "pointer",
                      }}
                    >
                      <Avatar
                        url={member.avatar_url ?? undefined}
                        name={member.name ?? undefined}
                        size={38}
                      />
                      <div
                        style={{
                          minWidth: 0,
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 14,
                            color: "var(--text)",
                            fontWeight: 700,
                          }}
                        >
                          {member.name || c("community_member_unknown")}
                        </span>
                        {member.isLeader && (
                          <span
                            role="img"
                            aria-label={groupLeaderText.groupLeader}
                            title={groupLeaderText.groupLeader}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              color: "var(--community-gold-text)",
                              flexShrink: 0,
                            }}
                          >
                            <Crown size={13} strokeWidth={2.2} />
                          </span>
                        )}
                      </div>
                      {viewerIsGroupLeader && !member.isLeader && (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            openMemberRemovalConfirm(member);
                          }}
                          style={{
                            border: "1px solid var(--community-danger-border)",
                            borderRadius: 10,
                            background: "var(--community-danger-surface)",
                            color: "var(--community-danger-text)",
                            padding: "7px 9px",
                            fontSize: 10,
                            fontWeight: 800,
                            cursor: "pointer",
                            flexShrink: 0,
                          }}
                        >
                          {groupLeaderText.removeMember}
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--text3)",
                      padding: "12px 0",
                    }}
                  >
                    {c("community_members_empty")}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        {showLeaveConfirm && selectedGroup && (
          <div
            onClick={() => !leavingGroup && setShowLeaveConfirm(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 220,
              background: "var(--community-overlay-modal)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 22px",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 360,
                background: "var(--community-modal-surface)",
                borderRadius: 24,
                padding: 22,
                border: "1px solid var(--community-danger-border)",
                boxShadow: "var(--shadow-modal)",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 999,
                  background: "var(--community-danger-surface)",
                  color: "var(--community-danger-text)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 14,
                }}
              >
                <AlertTriangle size={23} strokeWidth={1.9} />
              </div>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: "var(--text)",
                  marginBottom: 8,
                }}
              >
                {c("community_leave_confirm_title")}
              </h2>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text2)",
                  lineHeight: 1.65,
                  marginBottom: 18,
                }}
              >
                {c("community_leave_confirm_msg", { name: selectedGroup.name })}
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  disabled={leavingGroup}
                  className="btn-outline"
                  style={{ flex: 1 }}
                >
                  {c("community_cancel")}
                </button>
                <button
                  onClick={leaveSelectedGroup}
                  disabled={leavingGroup}
                  style={{
                    flex: 1,
                    border: "none",
                    borderRadius: 14,
                    background: "var(--community-danger-action)",
                    color: "var(--community-on-danger-action)",
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: leavingGroup ? "default" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  {leavingGroup ? (
                    <Loader2 size={15} className="spin" />
                  ) : (
                    <LogOut size={15} />
                  )}
                  {c("community_leave")}
                </button>
              </div>
            </div>
          </div>
        )}
        {showGroupEdit && viewerIsGroupLeader && (
          <GroupManagementModal
            busy={savingGroupEdit}
            onClose={() => {
              setShowGroupEdit(false);
              setGroupEditError(null);
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 18,
              }}
            >
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 850,
                  color: "var(--text)",
                }}
              >
                {groupLeaderText.editGroupTitle}
              </h2>
              <button
                onClick={() => setShowGroupEdit(false)}
                disabled={savingGroupEdit}
                aria-label={c("close")}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  color: "var(--text3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: savingGroupEdit ? "default" : "pointer",
                }}
              >
                <X size={17} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--text3)",
                  }}
                >
                  {c("community_group_name_label")}
                </label>
                <input
                  type="text"
                  className="input-field"
                  maxLength={80}
                  value={editGroupName}
                  onChange={(event) => setEditGroupName(event.target.value)}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--text3)",
                  }}
                >
                  {c("community_group_desc_label")}
                </label>
                <textarea
                  className="textarea-field"
                  rows={3}
                  maxLength={500}
                  value={editGroupDesc}
                  onChange={(event) => setEditGroupDesc(event.target.value)}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--text3)",
                  }}
                >
                  {c("community_visibility")}
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    {
                      value: true,
                      label: c("community_public"),
                      sub: c("community_public_sub"),
                    },
                    {
                      value: false,
                      label: c("community_private"),
                      sub: c("community_private_sub"),
                    },
                  ].map((option) => (
                    <button
                      key={String(option.value)}
                      onClick={() => setEditGroupIsPublic(option.value)}
                      style={{
                        flex: 1,
                        padding: "10px 8px",
                        borderRadius: 12,
                        border: `1px solid ${
                          editGroupIsPublic === option.value
                            ? "var(--sage)"
                            : "var(--border)"
                        }`,
                        background:
                          editGroupIsPublic === option.value
                            ? "var(--sage-light)"
                            : "var(--bg3)",
                        color: "var(--text)",
                        cursor: "pointer",
                        textAlign: "center",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {option.label}
                      </span>
                      <span
                        style={{
                          display: "block",
                          marginTop: 3,
                          fontSize: 9.5,
                          color: "var(--text3)",
                        }}
                      >
                        {option.sub}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              {groupEditError && (
                <p
                  style={{
                    fontSize: 12,
                    lineHeight: 1.55,
                    color: "var(--community-danger-text)",
                  }}
                >
                  {groupEditError}
                </p>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                <button
                  className="btn-outline"
                  onClick={() => setShowGroupEdit(false)}
                  disabled={savingGroupEdit}
                  style={{ flex: 1 }}
                >
                  {c("community_cancel")}
                </button>
                <button
                  className="btn-sage"
                  onClick={saveGroupEdits}
                  disabled={savingGroupEdit || !editGroupName.trim()}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  {savingGroupEdit && <Loader2 size={15} className="spin" />}
                  {c("save")}
                </button>
              </div>
            </div>
          </GroupManagementModal>
        )}
        {showLeadershipTransfer && viewerIsGroupLeader && (
          <GroupManagementModal
            busy={transferringLeadership}
            sheet
            zIndex={226}
            onClose={() => {
              setShowLeadershipTransfer(false);
              setLeadershipTransferStep("select");
              setLeadershipTransferTargetId(null);
              setLeadershipTransferError(null);
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 15,
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: 18,
                    fontWeight: 850,
                    color: "var(--text)",
                    marginBottom: 3,
                  }}
                >
                  {leadershipTransferStep === "confirm"
                    ? groupLeaderText.transferConfirmTitle
                    : groupLeaderText.transferLeadership}
                </h2>
                {leadershipTransferStep === "select" && (
                  <p
                    style={{
                      fontSize: 11.5,
                      color: "var(--text3)",
                      lineHeight: 1.5,
                    }}
                  >
                    {groupLeaderText.transferSelectMessage}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowLeadershipTransfer(false)}
                disabled={transferringLeadership}
                aria-label={c("close")}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  color: "var(--text3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: transferringLeadership ? "default" : "pointer",
                  flexShrink: 0,
                }}
              >
                <X size={17} />
              </button>
            </div>

            {leadershipTransferStep === "select" ? (
              <>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    maxHeight: "48vh",
                    overflowY: "auto",
                  }}
                >
                  {loadingGroupMembers ? (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: 7,
                        padding: "24px 0",
                        color: "var(--text3)",
                        fontSize: 12,
                      }}
                    >
                      <Loader2 size={15} className="spin" />
                      {c("community_members_loading")}
                    </div>
                  ) : leadershipTransferCandidates.length === 0 ? (
                    <p
                      style={{
                        padding: "18px 4px",
                        color: "var(--text3)",
                        fontSize: 12.5,
                        lineHeight: 1.55,
                      }}
                    >
                      {groupLeaderText.transferEmpty}
                    </p>
                  ) : (
                    leadershipTransferCandidates.map((member) => {
                      const selected =
                        leadershipTransferTargetId === member.id;
                      return (
                        <button
                          key={member.id}
                          onClick={() => {
                            setLeadershipTransferTargetId(member.id);
                            setLeadershipTransferError(null);
                          }}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            border: `1px solid ${
                              selected
                                ? "var(--sage)"
                                : "var(--community-card-border)"
                            }`,
                            borderRadius: 14,
                            background: selected
                              ? "var(--sage-light)"
                              : "var(--community-card-surface)",
                            padding: "10px 11px",
                            color: "var(--text)",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <Avatar
                            url={member.avatar_url ?? undefined}
                            name={member.name ?? undefined}
                            size={38}
                          />
                          <span
                            style={{
                              flex: 1,
                              minWidth: 0,
                              fontSize: 13.5,
                              fontWeight: 750,
                            }}
                          >
                            {member.name || c("community_member_unknown")}
                          </span>
                          <span
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 999,
                              border: `1px solid ${
                                selected
                                  ? "var(--sage)"
                                  : "var(--border)"
                              }`,
                              background: selected
                                ? "var(--sage)"
                                : "transparent",
                              color: "white",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {selected && <Check size={12} />}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
                {leadershipTransferError && (
                  <p
                    style={{
                      marginTop: 10,
                      fontSize: 12,
                      color: "var(--community-danger-text)",
                      lineHeight: 1.55,
                    }}
                  >
                    {leadershipTransferError}
                  </p>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button
                    className="btn-outline"
                    onClick={() => setShowLeadershipTransfer(false)}
                    style={{ flex: 1 }}
                  >
                    {c("community_cancel")}
                  </button>
                  <button
                    className="btn-sage"
                    onClick={() => setLeadershipTransferStep("confirm")}
                    disabled={!leadershipTransferTargetId}
                    style={{ flex: 1 }}
                  >
                    {groupLeaderText.transferNext}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 999,
                    background: "var(--community-gold-surface)",
                    color: "var(--community-gold-text)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 14,
                  }}
                >
                  <Crown size={25} />
                </div>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 750,
                    color: "var(--text)",
                    lineHeight: 1.6,
                  }}
                >
                  {groupLeaderText.transferConfirmMessage(
                    leadershipTransferTarget?.name ??
                      c("community_member_unknown"),
                  )}
                </p>
                <p
                  style={{
                    marginTop: 8,
                    padding: "10px 12px",
                    borderRadius: 12,
                    background: "var(--community-gold-surface)",
                    color: "var(--community-gold-text)",
                    fontSize: 11.5,
                    lineHeight: 1.55,
                  }}
                >
                  {groupLeaderText.transferWarning}
                </p>
                {leadershipTransferError && (
                  <p
                    style={{
                      marginTop: 10,
                      fontSize: 12,
                      color: "var(--community-danger-text)",
                      lineHeight: 1.55,
                    }}
                  >
                    {leadershipTransferError}
                  </p>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 17 }}>
                  <button
                    className="btn-outline"
                    onClick={() => {
                      setLeadershipTransferStep("select");
                      setLeadershipTransferError(null);
                    }}
                    disabled={transferringLeadership}
                    style={{ flex: 1 }}
                  >
                    {t("back", lang)}
                  </button>
                  <button
                    className="btn-sage"
                    onClick={confirmLeadershipTransfer}
                    disabled={
                      transferringLeadership || !leadershipTransferTarget
                    }
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    {transferringLeadership && (
                      <Loader2 size={15} className="spin" />
                    )}
                    {groupLeaderText.transferAction}
                  </button>
                </div>
              </>
            )}
          </GroupManagementModal>
        )}
        {memberRemovalTarget && viewerIsGroupLeader && (
          <GroupManagementModal
            danger
            busy={removingGroupMember}
            zIndex={230}
            onClose={() => {
              setMemberRemovalTarget(null);
              setMemberRemovalError(null);
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 999,
                background: "var(--community-danger-surface)",
                color: "var(--community-danger-text)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 14,
              }}
            >
              <UserMinus size={23} />
            </div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 850,
                color: "var(--text)",
                marginBottom: 8,
              }}
            >
              {groupLeaderText.removeConfirmTitle}
            </h2>
            <p
              style={{
                fontSize: 13,
                color: "var(--text2)",
                lineHeight: 1.65,
              }}
            >
              {groupLeaderText.removeConfirmMessage(
                memberRemovalTarget.name ?? c("community_member_unknown"),
              )}
            </p>
            {memberRemovalError && (
              <p
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: "var(--community-danger-text)",
                  lineHeight: 1.55,
                }}
              >
                {memberRemovalError}
              </p>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button
                className="btn-outline"
                onClick={() => setMemberRemovalTarget(null)}
                disabled={removingGroupMember}
                style={{ flex: 1 }}
              >
                {c("community_cancel")}
              </button>
              <button
                onClick={removeGroupMember}
                disabled={removingGroupMember}
                style={{
                  flex: 1,
                  border: "none",
                  borderRadius: 14,
                  background: "var(--community-danger-action)",
                  color: "var(--community-on-danger-action)",
                  fontSize: 13,
                  fontWeight: 850,
                  cursor: removingGroupMember ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                {removingGroupMember && (
                  <Loader2 size={15} className="spin" />
                )}
                {groupLeaderText.removeMember}
              </button>
            </div>
          </GroupManagementModal>
        )}
        {showDeleteGroupConfirm && viewerIsGroupLeader && (
          <GroupManagementModal
            danger
            busy={deletingGroup}
            zIndex={231}
            onClose={() => {
              setShowDeleteGroupConfirm(false);
              setDeleteGroupError(null);
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 999,
                background: "var(--community-danger-surface)",
                color: "var(--community-danger-text)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 14,
              }}
            >
              <Trash2 size={23} />
            </div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 850,
                color: "var(--text)",
                marginBottom: 8,
              }}
            >
              {groupLeaderText.deleteGroupTitle}
            </h2>
            <p
              style={{
                fontSize: 13,
                color: "var(--text2)",
                lineHeight: 1.65,
              }}
            >
              {groupLeaderText.deleteGroupMessage(selectedGroup.name)}
            </p>
            {deleteGroupError && (
              <p
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: "var(--community-danger-text)",
                  lineHeight: 1.55,
                }}
              >
                {deleteGroupError}
              </p>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button
                className="btn-outline"
                onClick={() => setShowDeleteGroupConfirm(false)}
                disabled={deletingGroup}
                style={{ flex: 1 }}
              >
                {c("community_cancel")}
              </button>
              <button
                onClick={deleteSelectedGroup}
                disabled={deletingGroup}
                style={{
                  flex: 1,
                  border: "none",
                  borderRadius: 14,
                  background: "var(--community-danger-action)",
                  color: "var(--community-on-danger-action)",
                  fontSize: 13,
                  fontWeight: 850,
                  cursor: deletingGroup ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                {deletingGroup && <Loader2 size={15} className="spin" />}
                {groupLeaderText.deleteGroupAction}
              </button>
            </div>
          </GroupManagementModal>
        )}
        {detailQt && renderQTDetailModal(detailQt, closeQtDetail)}
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="page roots-community-phase2d">
      {renderLoveHeartToast()}
      {renderReflectionNudgeToast()}
      {notificationDirectOpenPending && <NotificationDirectOpenOverlay lang={lang} />}
      {badgePopup && (
        <div
          onClick={() => setBadgePopup(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "var(--community-reward-overlay)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 28px",
          }}
        >
          <ConfettiBurst variant="fixed" zIndex={201} />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--community-modal-surface)",
              borderRadius: 28,
              border: "1px solid var(--community-gold-border)",
              width: "100%",
              maxWidth: 340,
              padding: "32px 24px 28px",
              textAlign: "center",
            }}
          >
            <div style={{ width: 120, height: 120, margin: "0 auto 16px" }}>
              <img
                src={badgePopup.img}
                alt={badgePopup.title}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: "var(--community-gold-text)",
                marginBottom: 10,
                lineHeight: 1.3,
              }}
            >
              {badgePopup.title}
            </h2>
            <div
              style={{
                padding: "14px 16px",
                background: "var(--community-gold-surface)",
                borderRadius: 14,
                border: "1px solid var(--community-gold-border)",
                marginBottom: 20,
              }}
            >
              <p
                style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.7 }}
              >
                {badgePopup.msg}
              </p>
            </div>
            <button
              onClick={() => setBadgePopup(null)}
              style={{
                width: "100%",
                padding: "13px",
                background: "var(--community-gold-action)",
                color: "var(--community-on-gold-action)",
                border: "none",
                borderRadius: 14,
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {c("community_thanks")}
            </button>
          </div>
        </div>
      )}
      <div
        style={{
          background: "var(--bg)",
          padding: "var(--roots-page-top-padding) 20px 0",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 4,
          }}
        >
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)" }}>
              {c("community_title")}
            </h1>
            <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 2 }}>
              {c("community_subtitle")}
            </p>
          </div>
          <button
            onClick={shareApp}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: "var(--sage-light)",
              border: "1px solid var(--community-sage-border)",
              borderRadius: 20,
              padding: "7px 12px",
              cursor: "pointer",
              marginTop: 4,
            }}
          >
            <Share2 size={13} style={{ color: "var(--sage-dark)" }} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--sage-dark)",
              }}
            >
              {c("community_app_invite")}
            </span>
          </button>
        </div>
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--border)",
            marginTop: 12,
          }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => selectCommunityMainTab(t.id)}
              style={{
                flex: 1,
                padding: "10px 0",
                background: "none",
                border: "none",
                borderBottom:
                  tab === t.id
                    ? "2px solid var(--sage)"
                    : "2px solid transparent",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: tab === t.id ? 700 : 400,
                color: tab === t.id ? "var(--sage-dark)" : "var(--text3)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        {loading ? (
          <div
            style={{ display: "flex", justifyContent: "center", padding: 40 }}
          >
            <Loader2
              size={24}
              style={{ color: "var(--sage)" }}
              className="spin"
            />
          </div>
        ) : tab === "partner" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button
              onClick={() => router.push("/companions")}
              className="btn-sage"
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <Plus size={16} /> {c("community_partner_invite_button")}
            </button>

            {partners.length === 0 ? (
              <>
                <div
                  className="card"
                  style={{
                    padding: 18,
                    border: "1px solid var(--community-sage-border)",
                    background: "var(--community-intro-surface)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 16,
                        background: "var(--sage-light)",
                        color: "var(--sage-dark)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Users size={20} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h2
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          color: "var(--text)",
                          marginBottom: 6,
                        }}
                      >
                        {c("community_partner_cta_title")}
                      </h2>
                      <p
                        style={{
                          fontSize: 13,
                          color: "var(--text3)",
                          lineHeight: 1.6,
                          marginBottom: 14,
                        }}
                      >
                        {c("community_partner_cta_body")}
                      </p>
                      <button
                        onClick={() => router.push("/companions")}
                        className="btn-outline"
                      >
                        {c("community_partner_manage_button")}
                      </button>
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    textAlign: "center",
                    padding: "28px 16px",
                    background: "var(--bg2)",
                    borderRadius: 18,
                    border: "1px dashed var(--border)",
                  }}
                >
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--text3)",
                      lineHeight: 1.6,
                    }}
                  >
                    {c("community_partner_feed_coming")}
                  </p>
                </div>
              </>
            ) : (
              <>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--text3)",
                    lineHeight: 1.55,
                  }}
                >
                  {c("community_partner_list_hint")}
                </p>
                {partners.map((partner) => {
                  const profile = partner.profile ?? {};
                  const partnerName = profile.name || c("profile_default_name");
                  return (
                    <div
                      key={partner.id}
                      onClick={(event) => {
                        if (
                          (event.target as HTMLElement).closest(
                            "[data-reflection-nudge-button]",
                          )
                        ) {
                          return;
                        }
                        openPartnerDetail(partner);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) return;
                        if (event.key === "Enter") openPartnerDetail(partner);
                      }}
                      style={{
                        width: "100%",
                        padding: 14,
                        borderRadius: 18,
                        border: `1px solid ${partner.hasNewContent ? "var(--community-unread-card-border)" : "var(--community-card-border)"}`,
                        background: partner.hasNewContent
                          ? "var(--community-unread-card-surface)"
                          : "var(--community-card-surface)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <button
                          onClick={(event) =>
                            toggleFavoritePartner(partner, event)
                          }
                          disabled={partnerFavoriteSavingIds.includes(
                            partner.partner_id,
                          )}
                          aria-label={c("community_favorite")}
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 999,
                            border: `1px solid ${partner.isFavorite ? "var(--community-gold-border)" : "var(--community-card-border)"}`,
                            background: partner.isFavorite
                              ? "var(--community-gold-surface)"
                              : "var(--community-card-muted-surface)",
                            color: partner.isFavorite
                              ? "var(--community-favorite-active)"
                              : "var(--text3)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: partnerFavoriteSavingIds.includes(
                              partner.partner_id,
                            )
                              ? "default"
                              : "pointer",
                            opacity: partnerFavoriteSavingIds.includes(
                              partner.partner_id,
                            )
                              ? 0.65
                              : 1,
                            flexShrink: 0,
                          }}
                        >
                          <Star
                            size={16}
                            strokeWidth={1.9}
                            fill={
                              partner.isFavorite
                                ? "currentColor"
                                : "transparent"
                            }
                          />
                        </button>
                        <Avatar
                          url={profile.avatar_url}
                          name={partnerName}
                          size={42}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              marginBottom: 3,
                              minWidth: 0,
                              flexWrap: "wrap",
                            }}
                          >
                            <p
                              style={{
                                fontSize: 14,
                                fontWeight: 850,
                                color: "var(--text)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                minWidth: 0,
                              }}
                            >
                              {partnerName}
                            </p>
                            {partner.hasNewContent && (
                              <span
                                style={{
                                  fontSize: 9,
                                  fontWeight: 800,
                                  padding: "2px 7px",
                                  borderRadius: 10,
                                  background: "var(--community-gold-surface)",
                                  color: "var(--community-gold-text)",
                                  border: "1px solid var(--community-gold-border)",
                                  flexShrink: 0,
                                }}
                              >
                                {c("community_new")}
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: 11, color: "var(--text3)" }}>
                            {t("profile_streak", lang, {
                              n: profile.streak_days ?? 0,
                            })}
                          </p>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          flexShrink: 0,
                        }}
                      >
                        {renderReflectionNudgeButton(
                          "partner",
                          partner.partner_id,
                          partnerName,
                        )}
                        <ChevronRight
                          size={18}
                          style={{ color: "var(--text3)", flexShrink: 0 }}
                        />
                      </div>
                    </div>
                  );
                })}
                <button
                  onClick={() => router.push("/companions")}
                  className="btn-outline"
                >
                  {c("community_partner_manage_button")}
                </button>
              </>
            )}
          </div>
        ) : tab === "all" ? (
          <>
            <div
              style={{
                display: "flex",
                marginBottom: 16,
                borderBottom: "1px solid var(--border)",
              }}
            >
              {[
                { key: "qt" as const, label: c("community_group_tab_qt") },
                {
                  key: "praying" as const,
                  label: c("community_prayer_tab_praying"),
                },
                {
                  key: "answered" as const,
                  label: c("community_prayer_tab_answered"),
                },
              ].map(({ key, label }) => {
                const active = allTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => selectAllSection(key)}
                    style={{
                      flex: 1,
                      padding: "8px 0 10px",
                      background: "none",
                      border: "none",
                      borderBottom: active
                        ? "2px solid var(--sage)"
                        : "2px solid transparent",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: active ? 700 : 400,
                        color: active ? "var(--sage-dark)" : "var(--text3)",
                      }}
                    >
                      {label}
                    </span>
                    <SectionUnreadDot show={!active && hasAllSectionNew(key)} />
                  </button>
                );
              })}
            </div>

            {allTab === "qt" ? (
              <>
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--text3)",
                    marginBottom: 12,
                  }}
                >
                  {c("community_qt_shared_sub")}
                </p>
                {qtShares.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "48px 0" }}>
                    <BookOpen
                      size={30}
                      style={{ color: "var(--text3)", marginBottom: 10 }}
                    />
                    <p style={{ color: "var(--text3)", fontSize: 14 }}>
                      {c("community_no_shared_qts")}
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {visibleAllQts.map((r) => (
                      <div
                        key={r.id}
                        className="card"
                        style={{ cursor: "pointer", position: "relative" }}
                        onClick={() => openQtDetail(r)}
                      >
                        {!r.photo_path && (
                          <ChevronRight
                            size={18}
                            style={{
                              position: "absolute",
                              right: 14,
                              top: "50%",
                              transform: "translateY(-50%)",
                              color: "var(--text3)",
                              opacity: 0.65,
                              pointerEvents: "none",
                            }}
                          />
                        )}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 8,
                          }}
                        >
                          <AuthorIdentity
                            profile={r.profiles}
                            authorId={r.user_id}
                          />
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <span
                              style={{ fontSize: 10, color: "var(--text3)" }}
                            >
                              {parseLocalDateString(r.date).toLocaleDateString(
                                getDateLocale(lang),
                                { month: "short", day: "numeric" },
                              )}
                            </span>
                            <CardMenu kind="qt" item={r} scope="all" />
                          </div>
                        </div>
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "var(--terra)",
                            marginBottom: 4,
                            paddingRight: 34,
                          }}
                        >
                          {r.bible_ref
                            ? translateBibleRef(r.bible_ref, lang)
                            : c("community_free_meditation")}
                        </p>
                        {r.key_verse && (
                          <p
                            style={{
                              fontSize: 12,
                              color: "var(--text2)",
                              lineHeight: 1.6,
                              fontStyle: "italic",
                              marginBottom: 10,
                              paddingRight: 34,
                            }}
                          >
                            "{r.key_verse.slice(0, 60)}
                            {r.key_verse.length > 60 ? "..." : ""}"
                            <EsvInlineAttribution row={r} />
                          </p>
                        )}
                        {r.photo_path && qtPhotoUrls[r.id] && (
                          renderPhotoReflectionImage({
                            src: qtPhotoUrls[r.id],
                            alt: COMMUNITY_LOCAL_TEXT[lang].photoAlt,
                            style: {
                              width: "100%",
                              maxHeight: 220,
                              objectFit: "cover",
                              borderRadius: 14,
                              border: "1px solid var(--border)",
                              margin: "6px 0 10px",
                            },
                          })
                        )}
                        {(r.photo_caption ||
                          (r.photo_path && r.meditation)) && (
                          <p
                            style={{
                              fontSize: 12,
                              color: "var(--text2)",
                              lineHeight: 1.6,
                              marginBottom: 10,
                              paddingRight: 34,
                              whiteSpace: "pre-line",
                            }}
                          >
                            {r.photo_caption || r.meditation}
                          </p>
                        )}
                        <div onClick={(e) => e.stopPropagation()}>
                          <CommunityReactionButtons
                          qtId={r.id}
                          counts={qtReactionCounts[r.id] ?? {}}
                          selectedReaction={myQtReactions[r.id]}
                          lang={lang}
                          onReact={reactToQT}
                        />
                        </div>
                      </div>
                    ))}
                    {renderFeedLoadMore(allQtFeedKey, qtShares.length)}
                  </div>
                )}
                {detailQt && renderQTDetailModal(detailQt, closeQtDetail)}
              </>
            ) : allTab === "praying" ? (
              prayers.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 0" }}>
                  <HandHeart
                    size={30}
                    style={{ color: "var(--text3)", marginBottom: 10 }}
                  />
                  <p style={{ color: "var(--text3)", fontSize: 14 }}>
                    {c("community_no_prayers")}
                  </p>
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {visibleAllPrayers.map((p) => (
                    <div key={p.id} className="card">
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <AuthorIdentity
                          profile={p.profiles}
                          authorId={p.user_id}
                        />
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <span style={{ fontSize: 10, color: "var(--text3)" }}>
                            {new Date(p.created_at).toLocaleDateString(
                              getDateLocale(lang),
                              { month: "short", day: "numeric" },
                            )}
                          </span>
                          {!p.is_answered && (
                            <CardMenu kind="prayer" item={p} scope="all" />
                          )}
                        </div>
                      </div>
                      <p
                        style={{
                          fontSize: 13,
                          lineHeight: 1.6,
                          color: "var(--text)",
                          marginBottom: 12,
                          whiteSpace: "pre-line",
                        }}
                      >
                        {p.content}
                      </p>
                      <button
                        onClick={() => prayTogether(p.id)}
                        disabled={prayedIds.includes(p.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          width: "100%",
                          padding: "10px",
                          borderRadius: 12,
                          border: `1px solid ${prayedIds.includes(p.id) ? "var(--sage)" : "var(--border)"}`,
                          background: prayedIds.includes(p.id)
                            ? "var(--sage-light)"
                            : "var(--bg2)",
                          cursor: prayedIds.includes(p.id)
                            ? "default"
                            : "pointer",
                        }}
                      >
                        <span style={{ fontSize: 14 }}>
                          {prayedIds.includes(p.id) ? (
                            <CheckCircle2 size={14} />
                          ) : (
                            <HandHeart size={14} />
                          )}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: prayedIds.includes(p.id)
                              ? "var(--sage-dark)"
                              : "var(--text2)",
                          }}
                        >
                          {prayerActionText(p, prayedIds.includes(p.id))}
                        </span>
                      </button>
                    </div>
                  ))}
                  {renderFeedLoadMore(allPrayingFeedKey, prayers.length)}
                </div>
              )
            ) : answeredPrayers.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <p style={{ fontSize: 32, marginBottom: 10 }}>✨</p>
                <p style={{ color: "var(--text3)", fontSize: 14 }}>
                  {c("community_no_answered_prayers")}
                </p>
                <p
                  style={{ color: "var(--text3)", fontSize: 12, marginTop: 6 }}
                >
                  {c("community_no_answered_sub")}
                </p>
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {visibleAllAnsweredPrayers.map((p) => (
                  <div key={p.id} className="card">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <AuthorIdentity
                        profile={p.profiles}
                        authorId={p.user_id}
                      />
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span style={{ fontSize: 10, color: "var(--text3)" }}>
                          {p.answered_at
                            ? new Date(p.answered_at).toLocaleDateString(
                                getDateLocale(lang),
                                { month: "short", day: "numeric" },
                              )
                            : ""}
                        </span>
                      </div>
                    </div>
                    <p
                      style={{
                        fontSize: 13,
                        lineHeight: 1.6,
                        color: "var(--text2)",
                        marginBottom: 8,
                        whiteSpace: "pre-line",
                        textDecoration: "line-through",
                        opacity: 0.7,
                      }}
                    >
                      {p.content}{" "}
                      <span style={{ fontSize: 10, color: "var(--text3)" }}>
                        ({new Date(p.created_at).toLocaleDateString(getDateLocale(lang), { month: "short", day: "numeric" })})
                      </span>
                    </p>
                    {p.testimony && (
                      <div
                        style={{
                          background: "var(--community-gold-surface)",
                          borderRadius: 12,
                          padding: "10px 14px",
                          border: "1px solid var(--community-gold-border)",
                          marginBottom: 8,
                        }}
                      >
                        <p
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: "var(--community-gold-text)",
                            marginBottom: 4,
                          }}
                        >
                          {c("community_prayer_testimony")}
                        </p>
                        <p
                          style={{
                            fontSize: 13,
                            color: "var(--text)",
                            lineHeight: 1.6,
                            fontStyle: "italic",
                          }}
                        >
                          "{p.testimony}"
                        </p>
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--sage-dark)",
                            fontWeight: 600,
                          }}
                        >
                          {c("community_answered")}
                        </span>
                        {(p.prayer_count ?? 0) > 0 && (
                          <span style={{ fontSize: 11, color: "var(--text3)" }}>
                            {answeredPrayerCountText(p.prayer_count ?? 0)}
                          </span>
                        )}
                      </div>
                      <PrayerLikeButton prayer={p} />
                    </div>
                  </div>
                ))}
                {renderFeedLoadMore(allAnsweredFeedKey, answeredPrayers.length)}
              </div>
            )}
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              onClick={() => setShowGroupForm(true)}
              className="btn-sage"
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <Plus size={16} /> {c("community_create_group")}
            </button>
            {groups.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <p style={{ fontSize: 32, marginBottom: 10 }}>👥</p>
                <p style={{ color: "var(--text3)", fontSize: 14 }}>
                  {c("community_no_groups")}
                </p>
              </div>
            ) : (
              groups.map((g) => (
                <div
                  key={g.id}
                  onClick={(event) => {
                    if (
                      (event.target as HTMLElement).closest(
                        "[data-reflection-nudge-button]",
                      )
                    ) {
                      return;
                    }
                    loadGroupDetail(g);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === "Enter") loadGroupDetail(g);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background:
                      (g.hasNewContent ?? g.hasNewQt)
                        ? "var(--community-unread-card-surface)"
                        : "var(--community-card-surface)",
                    border: `1px solid ${(g.hasNewContent ?? g.hasNewQt) ? "var(--community-unread-card-border)" : "var(--community-card-border)"}`,
                    borderRadius: 16,
                    padding: "14px 16px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  {g.isMember && (
                    <button
                      onClick={(e) => toggleFavoriteGroup(g, e)}
                      disabled={favoriteSavingIds.includes(g.id)}
                      aria-label={c("community_favorite")}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 999,
                        border: `1px solid ${g.isFavorite ? "var(--community-gold-border)" : "var(--community-card-border)"}`,
                        background: g.isFavorite
                          ? "var(--community-gold-surface)"
                          : "var(--community-card-muted-surface)",
                        color: g.isFavorite
                          ? "var(--community-favorite-active)"
                          : "var(--text3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: favoriteSavingIds.includes(g.id)
                          ? "default"
                          : "pointer",
                        opacity: favoriteSavingIds.includes(g.id) ? 0.65 : 1,
                        flexShrink: 0,
                      }}
                    >
                      <Star
                        size={16}
                        strokeWidth={1.9}
                        fill={g.isFavorite ? "currentColor" : "transparent"}
                      />
                    </button>
                  )}
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 4,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: "var(--text)",
                        }}
                      >
                        {g.name}
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: 10,
                          background: g.is_public
                            ? "var(--sage-light)"
                            : "var(--bg3)",
                          color: g.is_public
                            ? "var(--sage-dark)"
                            : "var(--text3)",
                          border: `1px solid ${g.is_public ? "var(--community-sage-border)" : "var(--community-card-border)"}`,
                        }}
                      >
                        {g.is_public
                          ? c("community_public")
                          : c("community_private")}
                      </span>
                      {(g.hasNewContent ?? g.hasNewQt) && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            padding: "2px 7px",
                            borderRadius: 10,
                            background: "var(--community-gold-surface)",
                            color: "var(--community-gold-text)",
                            border: "1px solid var(--community-gold-border)",
                          }}
                        >
                          {c("community_new")}
                        </span>
                      )}
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 3 }}
                    >
                      <Users size={11} style={{ color: "var(--text3)" }} />
                      <span style={{ fontSize: 11, color: "var(--text3)" }}>
                        {g.member_count}
                      </span>
                      {g.isMember && (
                        <span
                          style={{
                            fontSize: 10,
                            color: "var(--sage-dark)",
                            fontWeight: 600,
                            marginLeft: 6,
                          }}
                        >
                          ✓ {c("community_member")}
                        </span>
                      )}
                    </div>
                  </div>
                  {g.isMember &&
                    renderReflectionNudgeButton(
                      "group",
                      g.id,
                      String(g.name ?? c("community_unknown")),
                    )}
                  {g.is_public && !g.isMember && (
                    <button
                      onClick={(e) => openPublicGroupHideConfirm(g, e)}
                      aria-label={c("community_hide_public_group")}
                      title={c("community_hide_public_group")}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 999,
                        border: "1px solid var(--community-card-border)",
                        background: "var(--community-card-muted-surface)",
                        color: "var(--text3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        flexShrink: 0,
                        padding: 0,
                      }}
                    >
                      <EyeOff size={15} strokeWidth={1.9} />
                    </button>
                  )}
                  <ChevronRight
                    size={16}
                    style={{ color: "var(--text3)", flexShrink: 0 }}
                  />
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {renderSharedOverlayModals()}

      {publicGroupHideConfirm && (
        <div
          onClick={closePublicGroupHideConfirm}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 220,
            background: "var(--community-overlay-modal)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 22px",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="public-group-hide-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 360,
              background: "var(--community-modal-surface)",
              borderRadius: 24,
              padding: 22,
              border: "1px solid var(--community-card-border)",
              boxShadow: "var(--shadow-modal)",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 999,
                background: "var(--community-card-muted-surface)",
                color: "var(--text3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 14,
              }}
            >
              <EyeOff size={23} strokeWidth={1.9} />
            </div>
            <h2
              id="public-group-hide-title"
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "var(--text)",
                marginBottom: 8,
              }}
            >
              {c("community_hide_public_group_title")}
            </h2>
            <p
              style={{
                fontSize: 13,
                color: "var(--text2)",
                lineHeight: 1.65,
                marginBottom: publicGroupHideError ? 10 : 18,
              }}
            >
              {c("community_hide_public_group_msg", {
                name: publicGroupHideConfirm.name,
              })}
            </p>
            {publicGroupHideError && (
              <p
                role="alert"
                style={{
                  fontSize: 12,
                  color: "var(--community-danger-text)",
                  lineHeight: 1.5,
                  marginBottom: 14,
                }}
              >
                {publicGroupHideError}
              </p>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={closePublicGroupHideConfirm}
                disabled={hidingPublicGroup}
                className="btn-outline"
                style={{ flex: 1 }}
              >
                {c("community_cancel")}
              </button>
              <button
                onClick={confirmHidePublicGroup}
                disabled={hidingPublicGroup}
                className="btn-sage"
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                {hidingPublicGroup && (
                  <Loader2 size={15} className="spin" />
                )}
                {c("community_hide_confirm_action")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showGroupForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "var(--community-overlay-modal)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 20px",
          }}
        >
          <div
            style={{
              background: "var(--community-modal-surface)",
              width: "100%",
              maxWidth: 390,
              borderRadius: 24,
              padding: 24,
              border: "1px solid var(--community-card-border)",
              boxShadow: "var(--shadow-modal)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h2
                style={{ fontSize: 17, fontWeight: 700, color: "var(--text)" }}
              >
                {c("community_create_group")}
              </h2>
              <button
                onClick={() => setShowGroupForm(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text3)",
                  cursor: "pointer",
                }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text3)",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  {c("community_group_name_label")}
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder={c("community_group_name_placeholder")}
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text3)",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  {c("community_group_desc_label")}
                </label>
                <textarea
                  className="textarea-field"
                  rows={2}
                  placeholder={c("community_group_desc_placeholder")}
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text3)",
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  {c("community_visibility")}
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    {
                      v: true,
                      emoji: "🌍",
                      label: c("community_public"),
                      sub: c("community_public_sub"),
                    },
                    {
                      v: false,
                      emoji: "🔒",
                      label: c("community_private"),
                      sub: c("community_private_sub"),
                    },
                  ].map((opt) => (
                    <button
                      key={String(opt.v)}
                      onClick={() => setIsPublic(opt.v)}
                      style={{
                        flex: 1,
                        padding: "10px 8px",
                        borderRadius: 12,
                        border: `1px solid ${isPublic === opt.v ? "var(--sage)" : "var(--border)"}`,
                        background:
                          isPublic === opt.v
                            ? "var(--sage-light)"
                            : "var(--bg3)",
                        cursor: "pointer",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: 16, marginBottom: 3 }}>
                        {opt.emoji}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color:
                            isPublic === opt.v
                              ? "var(--sage-dark)"
                              : "var(--text)",
                        }}
                      >
                        {opt.label}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--text3)",
                          marginTop: 2,
                        }}
                      >
                        {opt.sub}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button
                  className="btn-outline"
                  onClick={() => setShowGroupForm(false)}
                  style={{ flex: 1 }}
                >
                  {c("community_cancel")}
                </button>
                <button
                  className="btn-sage"
                  onClick={createGroup}
                  disabled={savingGroup || !groupName.trim()}
                  style={{ flex: 1 }}
                >
                  {savingGroup ? (
                    <Loader2 size={16} className="spin" />
                  ) : (
                    c("community_create")
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  );
}

export default function CommunityPage() {
  return (
    <Suspense fallback={null}>
      <CommunityPageContent />
    </Suspense>
  );
}

"use client";
import { Suspense, useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import PhotoViewerModal from "@/components/PhotoViewerModal";
import ConfettiBurst from "@/components/ConfettiBurst";
import { createClient } from "@/lib/supabase";
import { useLang } from "@/lib/useLang";
import { translateBibleRef } from "@/lib/bibleBooks";
import { t, type TKey } from "@/lib/i18n";
import { GROUP_CHALLENGE_BADGE_FALLBACK, getGroupChallengeBadgeImageSrc } from "@/lib/groupChallengeBadges";
import { getDateLocale, parseLocalDateString } from "@/lib/date";
import { storageGetJson, storageSetJson } from "@/lib/clientStorage";
import { copyText, shareInvite as shareInviteContent } from "@/lib/nativeShare";
import { clearSharePromptOptionsCache } from "@/lib/sharePromptOptions";
import { checkAndAwardPrayTogetherBadge, checkAndAwardQtReactionBadge, getRewardBadgePopup } from "@/lib/rewardBadges";
import { Loader2, Plus, X, Users, Share2, Copy, Check, ChevronRight, ArrowLeft, Sparkles, Heart, HandHeart, BookOpen, CheckCircle2, Star, LogOut, AlertTriangle, Edit3, Trash2, MoreHorizontal, Flag, EyeOff, UserPlus } from "lucide-react";

const REACTIONS: { id: "bless" | "cheer" | "pray"; labelKey: TKey }[] = [
  { id: "bless", labelKey: "community_reaction_bless" },
  { id: "cheer", labelKey: "community_reaction_cheer" },
  { id: "pray", labelKey: "community_reaction_pray" },
];

function ReactionIcon({ id, selected }: { id: string; selected: boolean }) {
  const color = selected ? "var(--sage-dark)" : "currentColor";
  if (id === "bless") return <Sparkles size={14} strokeWidth={1.9} style={{ color }} />;
  if (id === "cheer") return <Heart size={14} strokeWidth={1.9} style={{ color }} />;
  return <HandHeart size={14} strokeWidth={1.9} style={{ color }} />;
}

type ShareScope = "all" | "group" | "partner";

type GroupChallengeRequestSummary = {
  id?: string | null;
  status?: string | null;
  title?: string | null;
  requested_start_date?: string | null;
  duration_days?: number | null;
  created_at?: string | null;
};

const APP_URL = "https://www.christian-roots.com";
const COMMUNITY_FEED_PAGE_SIZE = 30;
const COMMUNITY_FEED_PREFETCH_LIMIT = 90;
type CommunitySectionKey = "qt" | "praying" | "answered";

function isLaterThan(left?: string | null, right?: string | null) {
  if (!left) return false;
  if (!right) return true;
  return new Date(left).getTime() > new Date(right).getTime();
}

function sharedContentTime(row: any): string | null {
  return row?.shared_at ?? row?.created_at ?? null;
}

function qtFeedTime(row: any): string | null {
  return row?.shared_at ?? row?.created_at ?? null;
}

function sortQtFeedRows<T extends Record<string, any>>(rows: T[]): T[] {
  return [...rows].sort((a, b) => new Date(qtFeedTime(b) ?? 0).getTime() - new Date(qtFeedTime(a) ?? 0).getTime());
}

function mergeRowsById<T extends Record<string, any>>(rowSets: Array<T[] | null | undefined>): T[] {
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

async function fetchQtFeedRows(supabase: ReturnType<typeof createClient>, visibilityPattern: string) {
  // 중요한 이유: 오래된 공유 기록은 shared_at이 null일 수 있습니다.
  // shared_at 기준 쿼리만 limit 하면 null shared_at 기록이 뒤로 밀려 그룹/전체 피드에서 사라져 보일 수 있으므로,
  // created_at 기준 쿼리도 함께 가져와 합친 뒤 클라이언트에서 shared_at ?? created_at 기준으로 정렬합니다.
  const createdAtQuery = await supabase
    .from("qt_records")
    .select("*")
    .ilike("visibility", visibilityPattern)
    .order("created_at", { ascending: false })
    .limit(COMMUNITY_FEED_PREFETCH_LIMIT);

  if (createdAtQuery.error) throw createdAtQuery.error;

  const sharedAtQuery = await supabase
    .from("qt_records")
    .select("*")
    .ilike("visibility", visibilityPattern)
    .order("shared_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(COMMUNITY_FEED_PREFETCH_LIMIT);

  if (sharedAtQuery.error) {
    if (/shared_at/i.test(sharedAtQuery.error.message ?? "")) {
      console.warn("qt_records.shared_at column is not available yet. Falling back to created_at ordering:", sharedAtQuery.error.message);
    } else {
      console.warn("qt_records shared_at ordering failed. Falling back to created_at ordering:", sharedAtQuery.error.message);
    }
  }

  return sortQtFeedRows(mergeRowsById([createdAtQuery.data ?? [], sharedAtQuery.error ? [] : sharedAtQuery.data ?? []]))
    .slice(0, COMMUNITY_FEED_PREFETCH_LIMIT);
}

function latestSharedContentTime(rows?: any[] | null): string | null {
  if (!rows || rows.length === 0) return null;
  return rows
    .map(sharedContentTime)
    .filter(Boolean)
    .sort((a, b) => new Date(b as string).getTime() - new Date(a as string).getTime())[0] as string | null;
}


function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => typeof value === "string" && value.length > 0)));
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function groupIdsFromVisibility(value: string | null | undefined, allowedGroupIds: Set<string>) {
  return String(value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.startsWith("group_"))
    .map((part) => part.replace(/^group_/, ""))
    .filter((groupId) => allowedGroupIds.has(groupId));
}

function addLatestTime(target: Record<string, string | null>, groupId: string, time: string | null) {
  if (!time) return;
  if (!target[groupId] || new Date(time).getTime() > new Date(target[groupId] as string).getTime()) {
    target[groupId] = time;
  }
}

async function fetchGroupMemberCounts(supabase: ReturnType<typeof createClient>, groupIds: string[]) {
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

async function fetchLatestQtTimesByGroup(supabase: ReturnType<typeof createClient>, groupIds: string[]) {
  const latestByGroup: Record<string, string | null> = {};
  const allowedGroupIds = new Set(groupIds);
  if (groupIds.length === 0) return latestByGroup;

  for (const chunk of chunkArray(groupIds, 35)) {
    const visibilityFilter = chunk.map((groupId) => `visibility.ilike.%group_${groupId}%`).join(",");
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
          console.warn("그룹 최신 묵상 fallback 조회 실패:", fallback.error.message);
          continue;
        }
        createdAtRows = fallback.data ?? [];
      } else {
        console.warn("그룹 최신 묵상 created_at 조회 실패:", createdAt.error.message);
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
        console.warn("그룹 최신 묵상 shared_at 조회 실패:", withSharedAt.error.message);
      }
    } else {
      sharedAtRows = withSharedAt.data ?? [];
    }

    mergeRowsById([createdAtRows, sharedAtRows]).forEach((row: any) => {
      const time = qtFeedTime(row);
      groupIdsFromVisibility(row.visibility, allowedGroupIds).forEach((groupId) => addLatestTime(latestByGroup, groupId, time));
    });
  }

  return latestByGroup;
}

async function fetchLatestPrayerTimesByGroup(supabase: ReturnType<typeof createClient>, groupIds: string[]) {
  const latestByGroup: Record<string, string | null> = {};
  const allowedGroupIds = new Set(groupIds);
  if (groupIds.length === 0) return latestByGroup;

  for (const chunk of chunkArray(groupIds, 35)) {
    const visibilityFilter = chunk.map((groupId) => `visibility.ilike.%group_${groupId}%`).join(",");
    const limit = Math.min(1000, Math.max(200, chunk.length * 25));
    const { data, error } = await supabase
      .from("prayer_items")
      .select("visibility,created_at,shared_at,answered_at,is_answered")
      .or(visibilityFilter)
      .order("shared_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("그룹 최신 기도 일괄 조회 실패:", error.message);
      continue;
    }

    (data ?? []).forEach((row: any) => {
      const time = sharedContentTime(row);
      groupIdsFromVisibility(row.visibility, allowedGroupIds).forEach((groupId) => addLatestTime(latestByGroup, groupId, time));
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

    return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
  });
}

function sortPartnersForDisplay(partners: any[]) {
  return [...partners].sort((a, b) => {
    const aHasNew = !!a.hasNewContent;
    const bHasNew = !!b.hasNewContent;
    if (!!a.isFavorite !== !!b.isFavorite) return a.isFavorite ? -1 : 1;
    if (aHasNew !== bHasNew) return aHasNew ? -1 : 1;
    return new Date(b.latest_partner_activity_at ?? b.responded_at ?? b.updated_at ?? b.created_at ?? 0).getTime() - new Date(a.latest_partner_activity_at ?? a.responded_at ?? a.updated_at ?? a.created_at ?? 0).getTime();
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

function updateFavoriteCache(userId: string, groupId: string, isFavorite: boolean) {
  const current = readFavoriteCache(userId);
  const next = isFavorite
    ? Array.from(new Set([...current, groupId]))
    : current.filter((id) => id !== groupId);
  writeFavoriteCache(userId, next);
}

function Avatar({ url, name, size = 28 }: { url?: string; name?: string; size?: number; emoji?: string }) {
  const safeAvatarStyle = {
    width: size,
    height: size,
    borderRadius: "50%",
    objectFit: "cover",
    flexShrink: 0,
    userSelect: "none",
    WebkitTouchCallout: "none",
  } as const;

  if (url) return (
    <img
      src={url}
      alt={name ?? "프로필"}
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
      style={{ ...safeAvatarStyle, background: "var(--sage-light)", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <span style={{ fontSize: size * 0.36, fontWeight: 800, color: "var(--sage-dark)" }}>{initial}</span>
    </div>
  );
}

const SECTIONS: { key: string; labelKey: TKey; sundayLabelKey?: TKey; italic?: boolean; isDecision?: boolean }[] = [
  { key: "opening_prayer", labelKey: "community_qt_section_opening_prayer" },
  { key: "summary", labelKey: "community_qt_section_summary", sundayLabelKey: "community_qt_section_sermon_summary" },
  { key: "key_verse", labelKey: "community_qt_section_key_verse", italic: true },
  { key: "meditation", labelKey: "community_qt_section_meditation" },
  { key: "application", labelKey: "community_qt_section_application" },
  { key: "decision", labelKey: "community_qt_section_decision", isDecision: true },
  { key: "closing_prayer", labelKey: "community_qt_section_closing_prayer" },
];

type CommunityModalHistoryKind = "qt-detail" | "photo-viewer";

function CommunityPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"partner" | "group" | "all">("partner");
  const [allTab, setAllTab] = useState<"qt" | "praying" | "answered">("qt");
  const lang = useLang();
  const [badgePopup, setBadgePopup] = useState<{img:string;title:string;msg:string}|null>(null);
  const [prayers, setPrayers] = useState<any[]>([]);
  const [answeredPrayers, setAnsweredPrayers] = useState<any[]>([]);
  const [qtShares, setQtShares] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<any | null>(null);
  const [partnerDetailTab, setPartnerDetailTab] = useState<"qt" | "praying" | "answered">("qt");
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

  // 큐티 반응: { [qtId]: { bless: 3, cheer: 1, pray: 2 } }
  const [qtReactionCounts, setQtReactionCounts] = useState<Record<string, Record<string, number>>>({});
  // 내 반응: { [qtId]: "bless" | "cheer" | "pray" }
  const [myQtReactions, setMyQtReactions] = useState<Record<string, string>>({});
  const [qtPhotoUrls, setQtPhotoUrls] = useState<Record<string, string>>({});
  const qtPhotoUrlRequestingRef = useRef<Set<string>>(new Set());

  // 그룹
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [savingGroup, setSavingGroup] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showChallengeRequestForm, setShowChallengeRequestForm] = useState(false);
  const [challengeTitle, setChallengeTitle] = useState("");
  const [challengeStartDate, setChallengeStartDate] = useState("");
  const [challengeDurationDays, setChallengeDurationDays] = useState("30");
  const [challengeDescription, setChallengeDescription] = useState("");
  const [challengeBadgeIdea, setChallengeBadgeIdea] = useState("");
  const [challengeContactEmail, setChallengeContactEmail] = useState("");
  const [challengeExtraQuestions, setChallengeExtraQuestions] = useState("");
  const [challengeSaving, setChallengeSaving] = useState(false);
  const [challengeError, setChallengeError] = useState("");
  const [challengeSuccess, setChallengeSuccess] = useState(false);
  const [groupChallenges, setGroupChallenges] = useState<any[]>([]);
  const [groupChallengeProgress, setGroupChallengeProgress] = useState<Record<string, { doneDays: number; totalDays: number }>>({});
  const [myGroupChallengeRequests, setMyGroupChallengeRequests] = useState<Record<string, GroupChallengeRequestSummary>>({});
  const [groupChallengeAwardPopup, setGroupChallengeAwardPopup] = useState<null | { challengeTitle: string; groupName: string; badgeName: string; badgeImagePath?: string | null }>(null);
  const claimedGroupChallengeAwardIdsRef = useRef<Set<string>>(new Set());
  const [loadingGroupChallenges, setLoadingGroupChallenges] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [groupQts, setGroupQts] = useState<any[]>([]);
  const [groupPrayers, setGroupPrayers] = useState<any[]>([]);
  const [groupDetailTab, setGroupDetailTab] = useState<"qt" | "praying" | "answered">("qt");
  const [loadingGroupQts, setLoadingGroupQts] = useState(false);
  const [loadingGroupPrayers, setLoadingGroupPrayers] = useState(false);
  const [leavingGroup, setLeavingGroup] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showGroupActionMenu, setShowGroupActionMenu] = useState(false);
  const [showGroupMembers, setShowGroupMembers] = useState(false);
  const [groupMemberProfiles, setGroupMemberProfiles] = useState<any[]>([]);
  const [loadingGroupMembers, setLoadingGroupMembers] = useState(false);
  const [favoriteSavingIds, setFavoriteSavingIds] = useState<string[]>([]);
  const [partnerFavoriteSavingIds, setPartnerFavoriteSavingIds] = useState<string[]>([]);
  const [detailQt, setDetailQt] = useState<any | null>(null);
  const [manageModal, setManageModal] = useState<null | { kind: "qt-unshare" | "qt-edit" | "prayer-unshare" | "prayer-edit"; item: any; scope?: ShareScope; groupId?: string; partnerId?: string }>(null);
  const [manageText, setManageText] = useState("");
  const [manageSaving, setManageSaving] = useState(false);
  const [actionMenu, setActionMenu] = useState<null | { kind: "qt" | "prayer"; item: any; scope?: ShareScope; groupId?: string; partnerId?: string }>(null);
  const [safetyConfirm, setSafetyConfirm] = useState<null | { action: "report" | "hide-item" | "hide-author"; kind: "qt" | "prayer"; item: any }>(null);
  const [hiddenKeys, setHiddenKeys] = useState<string[]>([]);
  const [hiddenUserIds, setHiddenUserIds] = useState<string[]>([]);
  const [visibleFeedCounts, setVisibleFeedCounts] = useState<Record<string, number>>({});
  const [allSectionSeenAt, setAllSectionSeenAt] = useState<Record<CommunitySectionKey, string | null>>({ qt: null, praying: null, answered: null });
  const [profileModal, setProfileModal] = useState<null | { profile: any; userId: string; relationStatus: "loading" | "self" | "none" | "accepted" | "pending_sent" | "pending_received" | "declined"; relationId?: string; saving?: boolean }>(null);
  const [photoViewer, setPhotoViewer] = useState<null | { src: string; alt?: string }>(null);
  const communityDetailHistoryRef = useRef<"partner" | "group" | null>(null);
  const communityModalHistoryStackRef = useRef<CommunityModalHistoryKind[]>([]);
  const handledNotificationRouteRef = useRef<string | null>(null);

  const c = (key: TKey, vars?: Record<string, string | number>) => t(key, lang, vars);

  function normalizeCommunitySection(value: string | null): CommunitySectionKey {
    if (value === "praying" || value === "answered") return value;
    return "qt";
  }

  function pushCommunityDetailHistory(kind: "partner" | "group") {
    if (typeof window === "undefined") return;
    if (communityDetailHistoryRef.current) return;
    try {
      const currentState = window.history.state && typeof window.history.state === "object" ? window.history.state : {};
      window.history.pushState({ ...currentState, rootsCommunityDetail: kind }, "", window.location.href);
      communityDetailHistoryRef.current = kind;
    } catch {
      communityDetailHistoryRef.current = kind;
    }
  }

  function clearCommunityDetailHistory(kind?: "partner" | "group") {
    if (!kind || communityDetailHistoryRef.current === kind) communityDetailHistoryRef.current = null;
  }

  function pushCommunityModalHistory(kind: CommunityModalHistoryKind) {
    if (typeof window === "undefined") return;
    const stack = communityModalHistoryStackRef.current;
    if (stack[stack.length - 1] === kind) return;
    try {
      const currentState = window.history.state && typeof window.history.state === "object" ? window.history.state : {};
      window.history.pushState({ ...currentState, rootsCommunityModal: kind }, "", window.location.href);
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
    communityModalHistoryStackRef.current = stack.filter(item => item !== kind);
  }

  function openQtDetail(record: any) {
    setActionMenu(null);
    pushCommunityModalHistory("qt-detail");
    setDetailQt(record);
  }

  function resetQtDetailState() {
    clearCommunityModalHistory("qt-detail");
    setDetailQt(null);
  }

  function closeQtDetail() {
    const stack = communityModalHistoryStackRef.current;
    if (stack[stack.length - 1] === "qt-detail" && typeof window !== "undefined") {
      window.history.back();
      return;
    }
    resetQtDetailState();
  }

  function openPhotoViewer(src: string, alt?: string) {
    pushCommunityModalHistory("photo-viewer");
    setPhotoViewer({ src, alt: alt || "photo reflection" });
  }

  function resetPhotoViewerState() {
    clearCommunityModalHistory("photo-viewer");
    setPhotoViewer(null);
  }

  function closePhotoViewer() {
    const stack = communityModalHistoryStackRef.current;
    if (stack[stack.length - 1] === "photo-viewer" && typeof window !== "undefined") {
      window.history.back();
      return;
    }
    resetPhotoViewerState();
  }

  useEffect(() => {
    function handleCommunityPopState() {
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
      }
    }

    window.addEventListener("popstate", handleCommunityPopState);
    return () => window.removeEventListener("popstate", handleCommunityPopState);
  }, []);

  function contentKey(kind: "qt" | "prayer", id: string) {
    return `${kind}:${id}`;
  }

  function filterHiddenItems(kind: "qt" | "prayer", rows: any[], keys = hiddenKeys, authorIds = hiddenUserIds) {
    return rows.filter((row: any) => !keys.includes(contentKey(kind, row.id)) && !authorIds.includes(row.user_id));
  }

  function visibilityTargets(value?: string | null) {
    return String(value ?? "private")
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part && part !== "private");
  }

  function removeVisibilityTarget(value: string | null | undefined, target: string) {
    const nextTargets = visibilityTargets(value).filter((part) => part !== target);
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
    return parseLocalDateString(value).toLocaleDateString(getDateLocale(lang), { month: "short", day: "numeric" });
  }

  function formatChallengeRequestInputDate(value?: string | null) {
    if (!value) return "";
    return parseLocalDateString(value).toLocaleDateString(getDateLocale(lang), { year: "numeric", month: "long", day: "numeric" });
  }

  function challengeRequestDateInputWidth() {
    if (lang === "fr") return 142;
    if (lang === "ko") return 150;
    return 152;
  }

  function challengeDateRange(challenge: any) {
    const start = formatChallengeDate(challenge?.start_date);
    const end = formatChallengeDate(challenge?.end_date);
    if (start && end) return `${start} – ${end}`;
    return start || end || "";
  }

  function challengeDisplayStatus(challenge: any): "scheduled" | "active" | "completed" {
    const today = localDateInputValue(0);
    const start = String(challenge?.start_date ?? "");
    const end = String(challenge?.end_date ?? "");
    if (challenge?.status === "completed" || (end && today > end)) return "completed";
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

  function challengeProgressPercent(progress?: { doneDays: number; totalDays: number }) {
    if (!progress?.totalDays) return 0;
    return Math.max(0, Math.min(100, Math.round((progress.doneDays / progress.totalDays) * 100)));
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
    const hasLinkedChallenge = groupChallenges.some((challenge) => String(challenge?.request_id ?? "") === requestId);
    return hasLinkedChallenge ? null : request;
  }

  function challengeRequestScheduleText(request: GroupChallengeRequestSummary) {
    const start = formatChallengeDate(request.requested_start_date);
    const days = Number(request.duration_days ?? 0);
    if (start && Number.isFinite(days) && days > 0) {
      return c("group_challenge_preparing_schedule", { start, days });
    }
    if (start) return c("group_challenge_preparing_start", { start });
    return c("group_challenge_preparing_pending");
  }

  function isRecentCompletedGroupChallenge(challenge: any) {
    if (challengeDisplayStatus(challenge) !== "completed") return false;
    const today = dateToUtcDay(localDateInputValue(0));
    const end = dateToUtcDay(challenge?.end_date);
    if (today === null || end === null) return true;
    return today <= end + 2 * 86400000;
  }

  function shouldShowGroupChallengeCard(challenge: any) {
    return challengeDisplayStatus(challenge) !== "completed" || isRecentCompletedGroupChallenge(challenge);
  }

  function visibleGroupChallengeCards() {
    return groupChallenges.filter(shouldShowGroupChallengeCard);
  }

  function groupChallengeSectionTitleKey(challenges: any[]): TKey {
    if (challenges.length > 0 && challenges.every((challenge) => challengeDisplayStatus(challenge) === "completed")) {
      return "group_challenge_recent_completed_section_title";
    }
    return "group_challenge_approved_section_title";
  }

  function setGroupChallengeRequest(groupId: string, request?: GroupChallengeRequestSummary | null) {
    setMyGroupChallengeRequests((prev) => {
      const next = { ...prev };
      if (request?.status) next[groupId] = request;
      else delete next[groupId];
      return next;
    });
  }

  function setGroupChallengeRequestStatus(groupId: string, status?: string | null) {
    setGroupChallengeRequest(groupId, status ? { status } : null);
  }

  function groupChallengeBadgeImageSrc(path?: string | null) {
    return getGroupChallengeBadgeImageSrc(path, { fallback: null });
  }

  function isChallengeCompleteForUser(progress?: { doneDays: number; totalDays: number }) {
    return !!progress?.totalDays && progress.doneDays >= progress.totalDays;
  }

  async function claimCompletedGroupChallengeAwards(
    supabase: ReturnType<typeof createClient>,
    challenges: any[],
    progressByChallenge: Record<string, { doneDays: number; totalDays: number }>,
    groupName: string
  ) {
    for (const challenge of challenges) {
      const challengeId = String(challenge?.id ?? "");
      if (!challengeId || claimedGroupChallengeAwardIdsRef.current.has(challengeId)) continue;
      if (challengeDisplayStatus(challenge) !== "completed") continue;
      if (!isChallengeCompleteForUser(progressByChallenge[challengeId])) continue;

      claimedGroupChallengeAwardIdsRef.current.add(challengeId);
      const { data, error } = await supabase.rpc("claim_group_challenge_award", { p_challenge_id: challengeId });
      if (error) {
        console.warn("그룹 챌린지 배지 지급 확인 실패:", error.message);
        continue;
      }

      const result = (data ?? {}) as any;
      if (!result?.awarded || result?.already_awarded) continue;

      setGroupChallengeAwardPopup({
        challengeTitle: result.challenge_title ?? challenge.title ?? "",
        groupName: result.group_name ?? groupName ?? "",
        badgeName: result.badge_name ?? challenge.badge_name ?? challenge.title ?? "",
        badgeImagePath: result.badge_image_path ?? challenge.badge_image_path ?? null,
      });
      break;
    }
  }

  async function fetchGroupChallengeProgress(supabase: ReturnType<typeof createClient>, challenges: any[], currentUserId: string) {
    const datedChallenges = challenges.filter((challenge) => challenge?.start_date && challenge?.end_date);
    if (datedChallenges.length === 0) return {} as Record<string, { doneDays: number; totalDays: number }>;

    const startDates = datedChallenges.map((challenge) => String(challenge.start_date)).sort();
    const endDates = datedChallenges.map((challenge) => String(challenge.end_date)).sort();
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

    const completedDates = new Set((data ?? []).map((row: any) => String(row.date ?? "")).filter(Boolean));
    const progress: Record<string, { doneDays: number; totalDays: number }> = {};

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

  function resetChallengeRequestForm() {
    setShowChallengeRequestForm(false);
    setChallengeError("");
    setChallengeSuccess(false);
    setChallengeTitle("");
    setChallengeStartDate("");
    setChallengeDurationDays("30");
    setChallengeDescription("");
    setChallengeBadgeIdea("");
    setChallengeExtraQuestions("");
  }

  function openChallengeRequestForm() {
    if (!selectedGroup?.id || !selectedGroup.isMember || hasActiveGroupChallengeRequest(selectedGroup.id)) return;
    setChallengeError("");
    setChallengeSuccess(false);
    setChallengeTitle("");
    setChallengeStartDate(localDateInputValue(1));
    setChallengeDurationDays("30");
    setChallengeDescription("");
    setChallengeBadgeIdea("");
    setChallengeExtraQuestions("");
    setShowChallengeRequestForm(true);
  }

  async function submitChallengeRequest() {
    if (!selectedGroup?.id || !userId || challengeSaving) return;
    const title = challengeTitle.trim();
    const email = challengeContactEmail.trim();
    const duration = Number(challengeDurationDays);
    if (!title || !challengeStartDate || !email || !Number.isFinite(duration) || duration < 1) {
      setChallengeError(c("group_challenge_required_error"));
      return;
    }

    setChallengeSaving(true);
    setChallengeError("");
    const supabase = createClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const { error } = await supabase.from("group_challenge_requests").insert({
        group_id: selectedGroup.id,
        requester_id: user.id,
        requester_email: email,
        title,
        requested_start_date: challengeStartDate,
        duration_days: duration,
        description: challengeDescription.trim() || null,
        badge_idea: challengeBadgeIdea.trim() || null,
        extra_questions: challengeExtraQuestions.trim() || null,
      });
      if (error) throw error;
      setGroupChallengeRequest(selectedGroup.id, {
        status: "pending",
        title,
        requested_start_date: challengeStartDate,
        duration_days: duration,
        created_at: new Date().toISOString(),
      });
      setChallengeSuccess(true);
    } catch (error) {
      console.error("group challenge request failed", error);
      setChallengeError(c("group_challenge_save_error"));
    } finally {
      setChallengeSaving(false);
    }
  }

  async function openAuthorProfile(profile: any, authorId?: string | null, event?: React.MouseEvent) {
    event?.preventDefault();
    event?.stopPropagation();
    if (!authorId) return;

    const fallbackProfile = profile ?? { id: authorId, name: c("community_unknown"), avatar_url: null, streak_days: 0 };
    setProfileModal({ profile: { ...fallbackProfile, id: authorId }, userId: authorId, relationStatus: authorId === userId ? "self" : "loading" });
    if (!userId || authorId === userId) return;

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("companions")
        .select("id,requester_id,receiver_id,status")
        .or(`and(requester_id.eq.${userId},receiver_id.eq.${authorId}),and(requester_id.eq.${authorId},receiver_id.eq.${userId})`)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      const relation = (data ?? [])[0] as any | undefined;
      let relationStatus: "none" | "accepted" | "pending_sent" | "pending_received" | "declined" = "none";
      if (relation?.status === "accepted") relationStatus = "accepted";
      else if (relation?.status === "pending") relationStatus = relation.requester_id === userId ? "pending_sent" : "pending_received";
      else if (relation?.status === "declined") relationStatus = "declined";
      setProfileModal(current => current?.userId === authorId ? { ...current, relationStatus, relationId: relation?.id } : current);
    } catch (error) {
      console.warn("프로필 동역자 상태 조회 실패:", error);
      setProfileModal(current => current?.userId === authorId ? { ...current, relationStatus: "none" } : current);
    }
  }

  function AuthorIdentity({ profile, authorId }: { profile: any; authorId?: string | null }) {
    const canOpen = !!authorId;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        <button type="button" onClick={(event) => openAuthorProfile(profile, authorId, event)} disabled={!canOpen} aria-label={c("community_profile_view")} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 0, border: "none", background: "transparent", cursor: canOpen ? "pointer" : "default", flexShrink: 0 }}>
          <Avatar url={profile?.avatar_url} name={profile?.name} />
        </button>
        <button type="button" onClick={(event) => openAuthorProfile(profile, authorId, event)} disabled={!canOpen} style={{ minWidth: 0, padding: 0, border: "none", background: "transparent", cursor: canOpen ? "pointer" : "default", textAlign: "left" }}>
          <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile?.name ?? (c("community_unknown"))}</span>
        </button>
      </div>
    );
  }

  async function sendCompanionRequestFromProfile() {
    if (!profileModal || !userId || profileModal.userId === userId || profileModal.saving) return;
    const targetId = profileModal.userId;
    setProfileModal(current => current?.userId === targetId ? { ...current, saving: true } : current);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("companions").insert({ requester_id: userId, receiver_id: targetId, status: "pending" });
      if (error) throw error;
      setProfileModal(current => current?.userId === targetId ? { ...current, relationStatus: "pending_sent", saving: false } : current);
    } catch (error) {
      console.error("동역자 신청 실패:", error);
      setProfileModal(current => current?.userId === targetId ? { ...current, saving: false } : current);
    }
  }

  function renderProfileModal() {
    if (!profileModal) return null;
    const name = profileModal.profile?.name || c("profile_default_name");
    const streakDays = profileModal.profile?.streak_days ?? 0;
    return (
      <div onClick={() => setProfileModal(null)} style={{ position: "fixed", inset: 0, zIndex: 330, background: "rgba(26,28,30,0.68)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 14px calc(16px + env(safe-area-inset-bottom))" }}>
        <div onClick={(event) => event.stopPropagation()} style={{ width: "100%", maxWidth: 420, background: "var(--bg2)", borderRadius: 26, padding: 20, border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,0.24)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18 }}>
            <h2 style={{ fontSize: 18, fontWeight: 850, color: "var(--text)" }}>{c("community_profile_modal_title")}</h2>
            <button onClick={() => setProfileModal(null)} style={{ width: 32, height: 32, borderRadius: 999, border: "1px solid var(--border)", background: "var(--bg3)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)", cursor: "pointer" }}><X size={18} /></button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10 }}>
            <Avatar url={profileModal.profile?.avatar_url} name={name} size={76} />
            <div>
              <p style={{ fontSize: 20, fontWeight: 850, color: "var(--text)", marginBottom: 4 }}>{name}</p>
              <p style={{ fontSize: 12, color: "var(--text3)", fontWeight: 700 }}>{t("profile_streak", lang, { n: streakDays })}</p>
            </div>
          </div>
          <div style={{ marginTop: 20 }}>
            {profileModal.relationStatus === "loading" ? (
              <button className="btn-outline" disabled style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: 0.65 }}><Loader2 size={16} className="spin" /> {c("community_profile_checking")}</button>
            ) : profileModal.relationStatus === "self" ? (
              <div style={{ padding: "12px 14px", borderRadius: 16, background: "var(--bg3)", color: "var(--text3)", fontSize: 13, fontWeight: 700, textAlign: "center" }}>{c("community_profile_self")}</div>
            ) : profileModal.relationStatus === "accepted" ? (
              <div style={{ padding: "12px 14px", borderRadius: 16, background: "var(--sage-light)", color: "var(--sage-dark)", fontSize: 13, fontWeight: 800, textAlign: "center" }}>{c("community_profile_already_partner")}</div>
            ) : profileModal.relationStatus === "pending_sent" ? (
              <div style={{ padding: "12px 14px", borderRadius: 16, background: "rgba(232,197,71,0.12)", color: "var(--terra-dark)", fontSize: 13, fontWeight: 800, textAlign: "center" }}>{c("community_profile_request_sent")}</div>
            ) : profileModal.relationStatus === "pending_received" ? (
              <button onClick={() => router.push("/companions")} className="btn-sage" style={{ width: "100%" }}>{c("community_profile_request_received")}</button>
            ) : (
              <button onClick={sendCompanionRequestFromProfile} disabled={!!profileModal.saving} className="btn-sage" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: profileModal.saving ? 0.65 : 1 }}>
                {profileModal.saving ? <Loader2 size={16} className="spin" /> : <UserPlus size={16} />}
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
    if (communityDetailHistoryRef.current === "group" && typeof window !== "undefined") {
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
    resetQtDetailState();
  }

  function closePartnerDetail() {
    if (communityDetailHistoryRef.current === "partner" && typeof window !== "undefined") {
      window.history.back();
      return;
    }
    clearCommunityDetailHistory("partner");
    resetPartnerDetailState();
  }

  function openPrayerEdit(item: any, event?: any, scope?: ShareScope, groupId?: string, partnerId?: string) {
    event?.stopPropagation?.();
    setActionMenu(null);
    setManageText(item.content ?? "");
    setManageModal({ kind: "prayer-edit", item, scope, groupId, partnerId });
  }

  function openManage(kind: "qt-unshare" | "qt-edit" | "prayer-unshare", item: any, event?: any, scope?: ShareScope, groupId?: string, partnerId?: string) {
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
      setQtShares(prev => prev.filter(item => item.id !== id));
      setGroupQts(prev => prev.filter(item => item.id !== id));
      setPartnerQts(prev => prev.filter(item => item.id !== id));
      if (detailQt?.id === id) resetQtDetailState();
    } else {
      setPrayers(prev => prev.filter(item => item.id !== id));
      setGroupPrayers(prev => prev.filter(item => item.id !== id));
      setPartnerPrayers(prev => prev.filter(item => item.id !== id));
      setAnsweredPrayers(prev => prev.filter(item => item.id !== id));
    }
  }

  function removeSharedAuthor(authorId: string) {
    setQtShares(prev => prev.filter(item => item.user_id !== authorId));
    setGroupQts(prev => prev.filter(item => item.user_id !== authorId));
    setPartnerQts(prev => prev.filter(item => item.user_id !== authorId));
    setPrayers(prev => prev.filter(item => item.user_id !== authorId));
    setGroupPrayers(prev => prev.filter(item => item.user_id !== authorId));
    setPartnerPrayers(prev => prev.filter(item => item.user_id !== authorId));
    setAnsweredPrayers(prev => prev.filter(item => item.user_id !== authorId));
    if (detailQt?.user_id === authorId) resetQtDetailState();
  }

  async function confirmUnshare() {
    if (!manageModal || (manageModal.kind !== "qt-unshare" && manageModal.kind !== "prayer-unshare")) return;
    setManageSaving(true);
    const supabase = createClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const isQt = manageModal.kind === "qt-unshare";
      if (manageModal.scope === "partner" && manageModal.partnerId) {
        const recipientTable = isQt ? "qt_record_recipients" : "prayer_item_recipients";
        const recordColumn = isQt ? "qt_record_id" : "prayer_item_id";
        const { error } = await supabase
          .from(recipientTable)
          .delete()
          .eq(recordColumn, manageModal.item.id)
          .eq("owner_id", user.id)
          .eq("recipient_id", manageModal.partnerId);
        if (error) throw error;

        if (isQt) {
          setPartnerQts(prev => prev.filter(item => item.id !== manageModal.item.id));
          if (detailQt?.id === manageModal.item.id) resetQtDetailState();
        } else {
          setPartnerPrayers(prev => prev.filter(item => item.id !== manageModal.item.id));
        }
      } else {
        const table = isQt ? "qt_records" : "prayer_items";
        const target = manageModal.scope === "group" && manageModal.groupId ? `group_${manageModal.groupId}` : "all";
        const nextVisibility = removeVisibilityTarget(manageModal.item.visibility, target);
        const { error } = await supabase
          .from(table)
          .update({ visibility: nextVisibility })
          .eq("id", manageModal.item.id)
          .eq("user_id", user.id);
        if (error) throw error;

        const updateVisibility = (item: any) => item.id === manageModal.item.id ? { ...item, visibility: nextVisibility } : item;
        if (isQt) {
          setQtShares(prev => target === "all" ? prev.filter(item => item.id !== manageModal.item.id) : prev.map(updateVisibility));
          setGroupQts(prev => target !== "all" ? prev.filter(item => item.id !== manageModal.item.id) : prev.map(updateVisibility));
          if (detailQt?.id === manageModal.item.id && nextVisibility === "private") resetQtDetailState();
        } else {
          setPrayers(prev => target === "all" ? prev.filter(item => item.id !== manageModal.item.id) : prev.map(updateVisibility));
          setGroupPrayers(prev => target !== "all" ? prev.filter(item => item.id !== manageModal.item.id) : prev.map(updateVisibility));
          setAnsweredPrayers(prev => prev.map(updateVisibility));
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
    if (!manageModal || manageModal.kind !== "prayer-edit" || !manageText.trim()) return;
    setManageSaving(true);
    const supabase = createClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const nextContent = manageText.trim();
      const { error } = await supabase
        .from("prayer_items")
        .update({ content: nextContent })
        .eq("id", manageModal.item.id)
        .eq("user_id", user.id);
      if (error) throw error;
      const updateItem = (item: any) => item.id === manageModal.item.id ? { ...item, content: nextContent } : item;
      setPrayers(prev => prev.map(updateItem));
      setGroupPrayers(prev => prev.map(updateItem));
      setPartnerPrayers(prev => prev.map(updateItem));
      setAnsweredPrayers(prev => prev.map(updateItem));
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

  function CardMenu({ kind, item, scope = "all", groupId, partnerId }: { kind: "qt" | "prayer"; item: any; scope?: ShareScope; groupId?: string; partnerId?: string }) {
    return (
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActionMenu({ kind, item, scope, groupId, partnerId }); }}
        aria-label="Manage content"
        style={{ width: 28, height: 28, borderRadius: 999, border: "none", background: "transparent", color: "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, padding: 0 }}
      >
        <MoreHorizontal size={16} />
      </button>
    );
  }


  async function hideItem(kind: "qt" | "prayer", item: any, shouldReport = false) {
    if (!userId) return;
    setManageSaving(true);
    const supabase = createClient();
    try {
      if (shouldReport) {
        await supabase.from("content_reports").insert({
          reporter_id: userId,
          content_type: kind,
          content_id: item.id,
          reported_user_id: item.user_id ?? null,
          reason: "inappropriate",
        });
      }
      await supabase.from("hidden_community_items").upsert({
        user_id: userId,
        content_type: kind,
        content_id: item.id,
      }, { onConflict: "user_id,content_type,content_id" });
      const key = contentKey(kind, item.id);
      setHiddenKeys(prev => prev.includes(key) ? prev : [...prev, key]);
      removeSharedItem(kind, item.id);
      setActionMenu(null);
    } catch (error) {
      console.error("community report/hide failed", error);
    } finally {
      setManageSaving(false);
    }
  }

  function openSafetyConfirm(action: "report" | "hide-item" | "hide-author", kind: "qt" | "prayer", item: any) {
    setActionMenu(null);
    setSafetyConfirm({ action, kind, item });
  }

  function closeSafetyConfirm() {
    if (manageSaving) return;
    setSafetyConfirm(null);
  }

  async function confirmSafetyAction() {
    if (!safetyConfirm || manageSaving) return;
    const { action, kind, item } = safetyConfirm;
    if (action === "report") {
      await hideItem(kind, item, true);
    } else if (action === "hide-item") {
      await hideItem(kind, item, false);
    } else {
      await hideAuthor(item);
    }
    setSafetyConfirm(null);
  }

  async function hideAuthor(item: any) {
    if (!userId || !item?.user_id || item.user_id === userId) return;
    setManageSaving(true);
    const supabase = createClient();
    try {
      await supabase.from("hidden_community_users").upsert({
        user_id: userId,
        hidden_user_id: item.user_id,
      }, { onConflict: "user_id,hidden_user_id" });
      setHiddenUserIds(prev => prev.includes(item.user_id) ? prev : [...prev, item.user_id]);
      removeSharedAuthor(item.user_id);
      setActionMenu(null);
    } catch (error) {
      console.error("community user hide failed", error);
    } finally {
      setManageSaving(false);
    }
  }

  function renderActionMenu() {
    if (!actionMenu) return null;
    const { kind, item, scope, groupId, partnerId } = actionMenu;
    const isMine = !!userId && item.user_id === userId;
    return (
      <div onClick={() => setActionMenu(null)} style={{ position: "fixed", inset: 0, zIndex: 270, background: "rgba(26,28,30,0.58)", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 16px calc(18px + env(safe-area-inset-bottom))" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 24, padding: "14px", boxShadow: "0 18px 52px rgba(0,0,0,0.28)" }}>
          <p style={{ fontSize: 13, color: "var(--text3)", fontWeight: 800, padding: "4px 6px 10px" }}>{isMine ? c("community_manage_my_share") : c("community_manage_other_content")}</p>
          {isMine ? (
            <>
              <button onClick={() => openManage(kind === "qt" ? "qt-unshare" : "prayer-unshare", item, undefined, scope, groupId, partnerId)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "14px 12px", borderRadius: 14, border: "none", background: "transparent", color: "#B35F5F", fontSize: 14, fontWeight: 800, cursor: "pointer", textAlign: "left" }}>
                <Trash2 size={17} /> {c("community_manage_unshare")}
              </button>
              <button onClick={() => kind === "qt" ? openManage("qt-edit", item, undefined, scope, groupId, partnerId) : openPrayerEdit(item, undefined, scope, groupId, partnerId)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "14px 12px", borderRadius: 14, border: "none", background: "transparent", color: "var(--sage-dark)", fontSize: 14, fontWeight: 800, cursor: "pointer", textAlign: "left" }}>
                <Edit3 size={17} /> {kind === "qt" ? c("community_manage_qt_edit") : c("community_manage_prayer_edit")}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => openSafetyConfirm("report", kind, item)} disabled={manageSaving} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "14px 12px", borderRadius: 14, border: "none", background: "transparent", color: "#B35F5F", fontSize: 14, fontWeight: 800, cursor: "pointer", textAlign: "left" }}>
                <Flag size={17} /> {c("community_report")}
              </button>
              <button onClick={() => openSafetyConfirm("hide-item", kind, item)} disabled={manageSaving} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "14px 12px", borderRadius: 14, border: "none", background: "transparent", color: "var(--text2)", fontSize: 14, fontWeight: 800, cursor: "pointer", textAlign: "left" }}>
                <EyeOff size={17} /> {c("community_hide_content")}
              </button>
              <button onClick={() => openSafetyConfirm("hide-author", kind, item)} disabled={manageSaving} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "14px 12px", borderRadius: 14, border: "none", background: "transparent", color: "var(--text2)", fontSize: 14, fontWeight: 800, cursor: "pointer", textAlign: "left" }}>
                <EyeOff size={17} /> {c("community_hide_user_content")}
              </button>
            </>
          )}
          <button onClick={() => setActionMenu(null)} className="btn-outline" style={{ width: "100%", marginTop: 8 }}>{c("community_cancel")}</button>
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
    const actionText = isReport ? c("community_report_confirm_action") : c("community_hide_confirm_action");

    return (
      <div onClick={closeSafetyConfirm} style={{ position: "fixed", inset: 0, zIndex: 280, background: "rgba(26,28,30,0.72)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 22px" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 380, background: "var(--bg2)", borderRadius: 24, padding: 22, border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,0.28)" }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>{title}</h2>
          <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.65, marginBottom: 16 }}>{msg}</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={closeSafetyConfirm} disabled={manageSaving} className="btn-outline" style={{ flex: 1 }}>{c("community_cancel")}</button>
            <button
              onClick={confirmSafetyAction}
              disabled={manageSaving}
              style={{ flex: 1, border: "none", borderRadius: 14, background: isReport ? "rgba(196,106,106,0.14)" : "var(--sage)", color: isReport ? "#B35F5F" : "white", fontSize: 14, fontWeight: 800, cursor: manageSaving ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              {manageSaving ? <Loader2 size={15} className="spin" /> : actionText}
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
    const title = manageModal.kind === "qt-unshare"
      ? c("community_manage_qt_unshare_title")
      : manageModal.kind === "prayer-unshare"
        ? c("community_manage_prayer_unshare_title")
        : manageModal.kind === "qt-edit"
          ? c("community_manage_qt_edit_title")
          : c("community_manage_prayer_edit_title");
    const msg = manageModal.kind === "qt-unshare"
      ? c("community_manage_qt_unshare_msg")
      : manageModal.kind === "prayer-unshare"
        ? c("community_manage_prayer_unshare_msg")
        : manageModal.kind === "qt-edit"
          ? c("community_manage_qt_edit_msg")
          : c("community_manage_prayer_edit_msg");

    return (
      <div onClick={closeManageModal} style={{ position: "fixed", inset: 0, zIndex: 260, background: "rgba(26,28,30,0.72)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 22px" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 380, background: "var(--bg2)", borderRadius: 24, padding: 22, border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,0.28)" }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>{title}</h2>
          <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.65, marginBottom: 16 }}>{msg}</p>
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
            <button onClick={closeManageModal} disabled={manageSaving} className="btn-outline" style={{ flex: 1 }}>{c("community_cancel")}</button>
            <button
              onClick={manageModal.kind === "qt-edit" ? goEditQt : manageModal.kind === "prayer-edit" ? savePrayerEdit : confirmUnshare}
              disabled={manageSaving || (manageModal.kind === "prayer-edit" && !manageText.trim())}
              className={isEdit ? "btn-sage" : ""}
              style={isEdit ? { flex: 1 } : { flex: 1, border: "none", borderRadius: 14, background: "rgba(196,106,106,0.14)", color: "#B35F5F", fontSize: 14, fontWeight: 800, cursor: manageSaving ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              {manageSaving ? <Loader2 size={15} className="spin" /> : isEdit ? c("community_manage_continue") : c("community_manage_unshare")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  function prayerActionText(prayer: any, alreadyPrayed: boolean) {
    const count = prayer.prayer_count ?? 0;
    if (alreadyPrayed) {
      return count > 0 ? c("community_prayed_with_count", { count }) : c("community_prayed");
    }
    return count > 0 ? c("community_pray_together_with_count", { count }) : c("community_pray_together");
  }

  function answeredPrayerCountText(count: number) {
    return c("community_answered_prayer_count", { count });
  }

  async function fetchPrayerLikeMeta(supabase: any, prayerIds: string[], uid: string) {
    if (prayerIds.length === 0) return { counts: {} as Record<string, number>, mine: [] as string[] };

    const { data: likes, error } = await supabase
      .from("prayer_likes")
      .select("prayer_id,user_id")
      .in("prayer_id", prayerIds);

    if (error) {
      console.warn("기도 응답 좋아요 조회 실패:", error.message);
      return { counts: {} as Record<string, number>, mine: [] as string[] };
    }

    const counts: Record<string, number> = {};
    const mine: string[] = [];
    (likes ?? []).forEach((like: any) => {
      counts[like.prayer_id] = (counts[like.prayer_id] ?? 0) + 1;
      if (like.user_id === uid) mine.push(like.prayer_id);
    });

    return { counts, mine };
  }

  async function likeAnsweredPrayer(prayerId: string) {
    if (!userId || likedPrayerIds.includes(prayerId)) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("prayer_likes")
      .insert({ prayer_id: prayerId, user_id: userId });

    if (error) {
      if (error.code === "23505") {
        setLikedPrayerIds(prev => prev.includes(prayerId) ? prev : [...prev, prayerId]);
      }
      return;
    }

    const bumpLikeCount = (items: any[]) => items.map((item: any) =>
      item.id === prayerId ? { ...item, like_count: (item.like_count ?? 0) + 1 } : item
    );

    setLikedPrayerIds(prev => prev.includes(prayerId) ? prev : [...prev, prayerId]);
    setAnsweredPrayers(prev => bumpLikeCount(prev));
    setGroupPrayers(prev => bumpLikeCount(prev));
    setPartnerPrayers(prev => bumpLikeCount(prev));
  }

  function PrayerLikeButton({ prayer }: { prayer: any }) {
    const liked = likedPrayerIds.includes(prayer.id);
    return (
      <button
        onClick={() => { void likeAnsweredPrayer(prayer.id); }}
        disabled={liked}
        style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: liked ? "default" : "pointer", padding: "4px 8px", borderRadius: 20 }}
      >
        <span style={{ fontSize: 18, color: liked ? "#E05050" : "var(--text3)", transition: "transform 0.2s", transform: liked ? "scale(1.1)" : "scale(1)" }}>
          <Heart size={17} strokeWidth={1.9} fill={liked ? "#E05050" : "none"} />
        </span>
        {(prayer.like_count ?? 0) > 0 && (
          <span style={{ fontSize: 12, color: liked ? "#E05050" : "var(--text3)", fontWeight: 700 }}>
            {prayer.like_count}
          </span>
        )}
      </button>
    );
  }

  useEffect(() => { loadData(); }, [tab]);

  useEffect(() => {
    if (tab !== "all" || !userId) return;
    markAllSectionSeen(allTab);
  }, [tab, allTab, userId, qtShares.length, prayers.length, answeredPrayers.length]);

  // 프로필 fetch 헬퍼
  async function fetchProfiles(supabase: any, data: any[]) {
    const uids = Array.from(new Set(data.map((r: any) => r.user_id)));
    if (uids.length === 0) return {};
    const { data: profs } = await supabase.from("profiles").select("id, name, avatar_url, streak_days").in("id", uids);
    const map: Record<string, any> = {};
    (profs ?? []).forEach((p: any) => { map[p.id] = p; });
    return map;
  }

  async function loadQtPhotoUrls(supabase: any, rows: any[]) {
    const photoRows = rows.filter((row: any) => {
      const rowId = String(row?.id ?? "");
      return rowId && row?.photo_path && !qtPhotoUrls[rowId] && !qtPhotoUrlRequestingRef.current.has(rowId);
    });
    if (photoRows.length === 0) return;

    photoRows.forEach((row: any) => qtPhotoUrlRequestingRef.current.add(String(row.id)));

    try {
      const uniquePaths = uniqueStrings(photoRows.map((row: any) => row.photo_path));
      const pathUrlMap: Record<string, string> = {};

      if (uniquePaths.length > 0) {
        const { data, error } = await supabase.storage.from("qt-photos").createSignedUrls(uniquePaths, 60 * 60);

        if (error) {
          console.warn("사진 묵상 signed URL 일괄 생성 실패. 개별 생성으로 fallback:", error.message);
          const fallbackEntries = await Promise.all(uniquePaths.map(async (path) => {
            const { data: signed } = await supabase.storage.from("qt-photos").createSignedUrl(path, 60 * 60);
            return [path, signed?.signedUrl ?? ""] as const;
          }));
          fallbackEntries.forEach(([path, signedUrl]) => { if (signedUrl) pathUrlMap[path] = signedUrl; });
        } else {
          (data ?? []).forEach((item: any, index: number) => {
            const path = String(item?.path ?? uniquePaths[index] ?? "");
            if (path && item?.signedUrl) pathUrlMap[path] = item.signedUrl;
          });
        }
      }

      const entries = photoRows
        .map((row: any) => [String(row.id), pathUrlMap[String(row.photo_path)] ?? ""] as const)
        .filter(([, url]) => !!url);

      if (entries.length > 0) {
        setQtPhotoUrls(prev => ({
          ...prev,
          ...Object.fromEntries(entries),
        }));
      }
    } finally {
      photoRows.forEach((row: any) => qtPhotoUrlRequestingRef.current.delete(String(row.id)));
    }
  }

  function getVisibleFeedCount(key: string) {
    return visibleFeedCounts[key] ?? COMMUNITY_FEED_PAGE_SIZE;
  }

  function showMoreFeedItems(key: string) {
    setVisibleFeedCounts(prev => ({
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
  }, [tab, allTab, selectedGroup?.id, groupDetailTab, selectedPartner?.partner_id, partnerDetailTab, qtShares, groupQts, partnerQts, visibleFeedCounts, qtPhotoUrls]);

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

  function latestContentTime(rows: any[], field: "qt" | "prayer" | "answered" = "qt") {
    if (!rows || rows.length === 0) return null;
    const times = rows
      .map((row: any) => {
        if (field === "answered") return row.answered_at ?? row.created_at ?? null;
        if (field === "prayer") return sharedContentTime(row);
        return row.created_at ?? null;
      })
      .filter((value): value is string => typeof value === "string" && value.length > 0);
    return times.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
  }

  function hasAllSectionNew(section: CommunitySectionKey) {
    const latest = section === "qt"
      ? latestContentTime(qtShares, "qt")
      : section === "answered"
        ? latestContentTime(answeredPrayers, "answered")
        : latestContentTime(prayers, "prayer");
    return isLaterThan(latest, allSectionSeenAt[section]);
  }

  function markAllSectionSeen(section: CommunitySectionKey) {
    if (!userId) return;
    const seenAt = new Date().toISOString();
    setAllSectionSeenAt(prev => {
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
    if (section === "qt") return partnerQts.some((row: any) => !!row.isUnreadInPartner);
    return partnerPrayers.some((row: any) => section === "answered" ? !!row.is_answered && !!row.isUnreadInPartner : !row.is_answered && !!row.isUnreadInPartner);
  }

  function selectPartnerSection(section: CommunitySectionKey) {
    setPartnerDetailTab(section);
    if (section === "qt") {
      setPartnerQts(prev => prev.map((row: any) => ({ ...row, isUnreadInPartner: false })));
      return;
    }
    setPartnerPrayers(prev => prev.map((row: any) => {
      const matches = section === "answered" ? !!row.is_answered : !row.is_answered;
      return matches ? { ...row, isUnreadInPartner: false } : row;
    }));
  }

  function hasUnreadGroupSection(section: CommunitySectionKey) {
    if (section === "qt") return groupQts.some((row: any) => !!row.isUnreadInGroup);
    return groupPrayers.some((row: any) => section === "answered" ? !!row.is_answered && !!row.isUnreadInGroup : !row.is_answered && !!row.isUnreadInGroup);
  }

  function selectGroupSection(section: CommunitySectionKey) {
    setGroupDetailTab(section);
    if (section === "qt") {
      setGroupQts(prev => prev.map((row: any) => ({ ...row, isUnreadInGroup: false })));
      return;
    }
    setGroupPrayers(prev => prev.map((row: any) => {
      const matches = section === "answered" ? !!row.is_answered : !row.is_answered;
      return matches ? { ...row, isUnreadInGroup: false } : row;
    }));
  }

  function SectionUnreadDot({ show }: { show: boolean }) {
    if (!show) return null;
    return <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 999, background: "var(--sage)", boxShadow: "0 0 0 2px rgba(122,157,122,0.14)", flexShrink: 0 }} />;
  }

  useEffect(() => {
    if (loading) return;

    const targetTab = searchParams.get("tab");
    const section = normalizeCommunitySection(searchParams.get("section"));

    if (targetTab === "group") {
      const groupId = searchParams.get("groupId");
      if (!groupId) return;
      const signature = `group:${groupId}:${section}`;
      if (handledNotificationRouteRef.current === signature) return;

      if (tab !== "group") setTab("group");
      if (selectedPartner) {
        clearCommunityDetailHistory("partner");
        resetPartnerDetailState();
      }

      const group = groups.find((item: any) => String(item.id) === groupId);
      if (!group) return;
      handledNotificationRouteRef.current = signature;
      void loadGroupDetail(group, section);
      return;
    }

    if (targetTab === "partner") {
      const partnerId = searchParams.get("partnerId");
      if (!partnerId) return;
      const signature = `partner:${partnerId}:${section}`;
      if (handledNotificationRouteRef.current === signature) return;

      if (tab !== "partner") setTab("partner");
      if (selectedGroup) {
        clearCommunityDetailHistory("group");
        resetGroupDetailState();
      }

      const partner = partners.find((item: any) => String(item.partner_id) === partnerId);
      if (!partner) return;
      handledNotificationRouteRef.current = signature;
      void openPartnerDetail(partner, section);
    }
  }, [loading, searchParams, groups, partners, tab, selectedPartner, selectedGroup]);

  async function openPartnerDetail(partner: any, preferredSection?: CommunitySectionKey) {
    pushCommunityDetailHistory("partner");
    const openedAt = new Date().toISOString();
    const previousSeenAt = partner.last_seen_shared_at ?? null;
    setSelectedPartner({ ...partner, hasNewContent: false, hasNewQtShare: false, hasNewPrayer: false, last_seen_shared_at: openedAt });
    setPartnerDetailTab(preferredSection ?? (partner.hasNewPrayer && !partner.hasNewQtShare ? "praying" : "qt"));
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoadingPartnerQts(false);
      setLoadingPartnerPrayers(false);
      return;
    }

    setPartners(prev => sortPartnersForDisplay(prev.map(item => item.partner_id === partnerId ? { ...item, hasNewContent: false, hasNewQtShare: false, hasNewPrayer: false, last_seen_shared_at: openedAt } : item)));

    try {
      const { error: seenError } = await supabase
        .from("companion_preferences")
        .upsert({
          user_id: user.id,
          companion_user_id: partnerId,
          is_favorite: !!partner.isFavorite,
          last_seen_shared_at: openedAt,
          updated_at: openedAt,
        }, { onConflict: "user_id,companion_user_id" });
      if (seenError) console.warn("동역자 읽음 상태 저장 실패:", seenError.message);
    } catch (error) {
      console.warn("동역자 읽음 상태 저장 중 예외:", error);
    }

    const currentHiddenKeys = hiddenKeys;
    const currentHiddenUserIds = hiddenUserIds;

    try {
      const { data: qtRecipientRows, error: qtRecipientError } = await supabase
        .from("qt_record_recipients")
        .select("qt_record_id,owner_id,recipient_id,created_at")
        .or(`and(owner_id.eq.${user.id},recipient_id.eq.${partnerId}),and(owner_id.eq.${partnerId},recipient_id.eq.${user.id})`)
        .order("created_at", { ascending: false })
        .limit(COMMUNITY_FEED_PREFETCH_LIMIT);

      if (qtRecipientError) throw qtRecipientError;
      const qtIds = Array.from(new Set((qtRecipientRows ?? []).map((row: any) => row.qt_record_id).filter(Boolean)));

      if (qtIds.length > 0) {
        const recipientMap: Record<string, any> = {};
        (qtRecipientRows ?? []).forEach((row: any) => { recipientMap[row.qt_record_id] = row; });

        const { data: qtRows, error: qtError } = await supabase
          .from("qt_records")
          .select("*")
          .in("id", qtIds)
          .order("created_at", { ascending: false });

        if (qtError) throw qtError;
        const profMap = await fetchProfiles(supabase, qtRows ?? []);
        const rowsWithProfiles = (qtRows ?? []).map((row: any) => {
          const recipient = recipientMap[row.id] ?? null;
          const partnerSharedAt = recipient?.created_at ?? row.created_at;
          return {
            ...row,
            profiles: profMap[row.user_id] ?? null,
            partnerSharedAt,
            isUnreadInPartner: recipient?.owner_id === partnerId && recipient?.recipient_id === user.id && isLaterThan(partnerSharedAt, previousSeenAt),
          };
        }).sort((a: any, b: any) => new Date(b.partnerSharedAt ?? b.created_at ?? 0).getTime() - new Date(a.partnerSharedAt ?? a.created_at ?? 0).getTime());

        const visibleRows = filterHiddenItems("qt", rowsWithProfiles, currentHiddenKeys, currentHiddenUserIds);
        setPartnerQts(visibleRows);

        const { counts, mine } = await fetchQtReactions(supabase, qtIds, user.id);
        setQtReactionCounts(prev => ({ ...prev, ...counts }));
        setMyQtReactions(prev => ({ ...prev, ...mine }));
      } else {
        setPartnerQts([]);
      }
    } catch (error) {
      console.warn("동역자 묵상 나눔 조회 실패:", error);
      setPartnerQts([]);
    } finally {
      setLoadingPartnerQts(false);
    }

    try {
      const { data: prayerRecipientRows, error: prayerRecipientError } = await supabase
        .from("prayer_item_recipients")
        .select("prayer_item_id,owner_id,recipient_id,created_at")
        .or(`and(owner_id.eq.${user.id},recipient_id.eq.${partnerId}),and(owner_id.eq.${partnerId},recipient_id.eq.${user.id})`)
        .order("created_at", { ascending: false })
        .limit(COMMUNITY_FEED_PREFETCH_LIMIT);

      if (prayerRecipientError) throw prayerRecipientError;
      const prayerIds = Array.from(new Set((prayerRecipientRows ?? []).map((row: any) => row.prayer_item_id).filter(Boolean)));

      if (prayerIds.length > 0) {
        const recipientMap: Record<string, any> = {};
        (prayerRecipientRows ?? []).forEach((row: any) => { recipientMap[row.prayer_item_id] = row; });

        const { data: prayerRows, error: prayerError } = await supabase
          .from("prayer_items")
          .select("*")
          .in("id", prayerIds)
          .order("is_answered", { ascending: true })
          .order("created_at", { ascending: false });

        if (prayerError) throw prayerError;
        const profMap = await fetchProfiles(supabase, prayerRows ?? []);
        const answeredIds = (prayerRows ?? []).filter((row: any) => !!row.is_answered).map((row: any) => row.id);
        const { counts: likeCounts, mine: myLikedIds } = await fetchPrayerLikeMeta(supabase, answeredIds, user.id);
        if (myLikedIds.length > 0) {
          setLikedPrayerIds(prev => Array.from(new Set([...prev, ...myLikedIds])));
        }
        const rowsWithProfiles = (prayerRows ?? []).map((row: any) => {
          const recipient = recipientMap[row.id] ?? null;
          const partnerSharedAt = recipient?.created_at ?? row.created_at;
          return {
            ...row,
            like_count: likeCounts[row.id] ?? row.like_count ?? 0,
            profiles: profMap[row.user_id] ?? null,
            partnerSharedAt,
            isUnreadInPartner: recipient?.owner_id === partnerId && recipient?.recipient_id === user.id && isLaterThan(partnerSharedAt, previousSeenAt),
          };
        }).sort((a: any, b: any) => new Date((b.is_answered ? b.answered_at : b.partnerSharedAt) ?? b.created_at ?? 0).getTime() - new Date((a.is_answered ? a.answered_at : a.partnerSharedAt) ?? a.created_at ?? 0).getTime());

        setPartnerPrayers(filterHiddenItems("prayer", rowsWithProfiles, currentHiddenKeys, currentHiddenUserIds));
      } else {
        setPartnerPrayers([]);
      }
    } catch (error) {
      console.warn("동역자 기도 나눔 조회 실패:", error);
      setPartnerPrayers([]);
    } finally {
      setLoadingPartnerPrayers(false);
    }
  }

  async function openGroupMembers(group: any) {
    setShowGroupMembers(true);
    setLoadingGroupMembers(true);
    const supabase = createClient();
    try {
      const { data: rows, error } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", group.id);

      if (error) throw error;
      const memberIds = Array.from(new Set((rows ?? []).map((row: any) => row.user_id).filter(Boolean)));
      if (memberIds.length === 0) {
        setGroupMemberProfiles([]);
        return;
      }

      const { data: profs } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", memberIds);

      const profileMap: Record<string, any> = {};
      (profs ?? []).forEach((profile: any) => { profileMap[profile.id] = profile; });
      setGroupMemberProfiles(memberIds.map((id: string) => profileMap[id] ?? { id, name: c("community_member_unknown"), avatar_url: null }));
    } catch (error) {
      console.warn("그룹 참여자 조회 실패:", error);
      setGroupMemberProfiles([]);
    } finally {
      setLoadingGroupMembers(false);
    }
  }

  // qt_reactions 로드 헬퍼 - qtIds 목록의 반응 카운트 + 내 반응 가져오기
  async function fetchQtReactions(supabase: any, qtIds: string[], uid: string) {
    if (qtIds.length === 0) return { counts: {}, mine: {} };
    const { data: rxData } = await supabase.from("qt_reactions")
      .select("qt_id, reaction, user_id")
      .in("qt_id", qtIds);

    const counts: Record<string, Record<string, number>> = {};
    const mine: Record<string, string> = {};

    (rxData ?? []).forEach((r: any) => {
      if (!counts[r.qt_id]) counts[r.qt_id] = {};
      counts[r.qt_id][r.reaction] = (counts[r.qt_id][r.reaction] ?? 0) + 1;
      if (r.user_id === uid) mine[r.qt_id] = r.reaction;
    });
    return { counts, mine };
  }

  async function loadData() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    setUserId(user.id);
    setChallengeContactEmail(prev => prev || user.email || "");
    setAllSectionSeenAt(storageGetJson<Record<CommunitySectionKey, string | null>>(allSectionSeenKey(user.id), { qt: null, praying: null, answered: null }));

    const { data: hiddenRows } = await supabase.from("hidden_community_items")
      .select("content_type,content_id")
      .eq("user_id", user.id);
    const loadedHiddenKeys = (hiddenRows ?? []).map((row: any) => `${row.content_type}:${row.content_id}`);
    setHiddenKeys(loadedHiddenKeys);

    const { data: hiddenUserRows } = await supabase.from("hidden_community_users")
      .select("hidden_user_id")
      .eq("user_id", user.id);
    const loadedHiddenUserIds = (hiddenUserRows ?? []).map((row: any) => row.hidden_user_id).filter(Boolean);
    setHiddenUserIds(loadedHiddenUserIds);

    // prayedIds: DB에서 로드
    const { data: prayLogs } = await supabase.from("user_prayer_logs")
      .select("prayer_id").eq("user_id", user.id);
    const dbPrayed = (prayLogs ?? []).map((r: any) => r.prayer_id);
    setPrayedIds(dbPrayed);
    storageSetJson(`comm_prayed_${user.id}`, dbPrayed);

    if (tab === "partner") {
      const { data: companionRows, error: companionError } = await supabase
        .from("companions")
        .select("id,requester_id,receiver_id,status,created_at,updated_at,responded_at")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (companionError) {
        console.error("동역자 목록 조회 실패:", companionError);
        setPartners([]);
      } else {
        const rows = companionRows ?? [];
        const partnerIds = Array.from(new Set(rows.map((row: any) => row.requester_id === user.id ? row.receiver_id : row.requester_id).filter(Boolean)));
        let profileMap: Record<string, any> = {};
        if (partnerIds.length > 0) {
          const { data: profileRows } = await supabase
            .from("profiles")
            .select("id,name,avatar_url,streak_days")
            .in("id", partnerIds);
          (profileRows ?? []).forEach((profile: any) => { profileMap[profile.id] = profile; });
        }
        let favoritePartnerIds = new Set<string>();
        const partnerPreferenceMap: Record<string, any> = {};
        if (partnerIds.length > 0) {
          let preferenceRows: any[] | null = null;
          const { data, error: preferenceError } = await supabase
            .from("companion_preferences")
            .select("companion_user_id,is_favorite,last_seen_shared_at,created_at")
            .eq("user_id", user.id)
            .in("companion_user_id", partnerIds);

          if (preferenceError) {
            console.warn("동역자 선호도/읽음 상태 조회 실패. 기존 컬럼으로 fallback:", preferenceError.message);
            const { data: fallbackRows, error: fallbackError } = await supabase
              .from("companion_preferences")
              .select("companion_user_id,is_favorite,created_at")
              .eq("user_id", user.id)
              .in("companion_user_id", partnerIds);
            if (fallbackError) {
              console.warn("동역자 즐겨찾기 조회 실패:", fallbackError.message);
            } else {
              preferenceRows = fallbackRows ?? [];
            }
          } else {
            preferenceRows = data ?? [];
          }

          (preferenceRows ?? []).forEach((row: any) => {
            partnerPreferenceMap[row.companion_user_id] = row;
          });
          favoritePartnerIds = new Set((preferenceRows ?? [])
            .filter((row: any) => !!row.is_favorite)
            .map((row: any) => row.companion_user_id)
            .filter(Boolean));
        }

        const latestPartnerQtAt: Record<string, string | null> = {};
        const latestPartnerPrayerAt: Record<string, string | null> = {};
        if (partnerIds.length > 0) {
          const { data: qtRecipientRows, error: qtRecipientError } = await supabase
            .from("qt_record_recipients")
            .select("owner_id,recipient_id,created_at")
            .eq("recipient_id", user.id)
            .in("owner_id", partnerIds)
            .order("created_at", { ascending: false })
            .limit(200);
          if (qtRecipientError) {
            console.warn("동역자 새 묵상 조회 실패:", qtRecipientError.message);
          } else {
            (qtRecipientRows ?? []).forEach((row: any) => {
              if (!latestPartnerQtAt[row.owner_id]) latestPartnerQtAt[row.owner_id] = row.created_at ?? null;
            });
          }

          const { data: prayerRecipientRows, error: prayerRecipientError } = await supabase
            .from("prayer_item_recipients")
            .select("owner_id,recipient_id,created_at")
            .eq("recipient_id", user.id)
            .in("owner_id", partnerIds)
            .order("created_at", { ascending: false })
            .limit(200);
          if (prayerRecipientError) {
            console.warn("동역자 새 기도 조회 실패:", prayerRecipientError.message);
          } else {
            (prayerRecipientRows ?? []).forEach((row: any) => {
              if (!latestPartnerPrayerAt[row.owner_id]) latestPartnerPrayerAt[row.owner_id] = row.created_at ?? null;
            });
          }
        }

        setPartners(sortPartnersForDisplay(rows.map((row: any) => {
          const partnerId = row.requester_id === user.id ? row.receiver_id : row.requester_id;
          const preference = partnerPreferenceMap[partnerId] ?? null;
          const lastSeenPartnerAt = preference?.last_seen_shared_at ?? row.responded_at ?? row.created_at ?? null;
          const latestQtAt = latestPartnerQtAt[partnerId] ?? null;
          const latestPrayerAt = latestPartnerPrayerAt[partnerId] ?? null;
          const latestPartnerActivityAt = latestSharedContentTime([
            latestQtAt ? { created_at: latestQtAt } : null,
            latestPrayerAt ? { created_at: latestPrayerAt } : null,
          ].filter(Boolean) as any[]);
          const hasNewQtShare = isLaterThan(latestQtAt, lastSeenPartnerAt);
          const hasNewPrayer = isLaterThan(latestPrayerAt, lastSeenPartnerAt);
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
        })));
      }

    } else if (tab === "all") {
      // 기도 중 (미응답)
      const { data } = await supabase.from("prayer_items")
        .select("*").ilike("visibility", "%all%").eq("is_answered", false)
        .order("created_at", { ascending: false })
        .limit(COMMUNITY_FEED_PREFETCH_LIMIT);
      if (data) {
        const profMap = await fetchProfiles(supabase, data);
        setPrayers(filterHiddenItems("prayer", data.map((r: any) => ({ ...r, profiles: profMap[r.user_id] ?? null })), loadedHiddenKeys, loadedHiddenUserIds));
      }
      // 응답됨 (간증 있는 것)
      const { data: answered } = await supabase.from("prayer_items")
        .select("*").ilike("visibility", "%all%").eq("is_answered", true)
        .order("answered_at", { ascending: false })
        .limit(COMMUNITY_FEED_PREFETCH_LIMIT);
      if (answered) {
        const profMap2 = await fetchProfiles(supabase, answered);
        const answeredIds = answered.map((r: any) => r.id);
        let likeCounts: Record<string, number> = {};
        let myLikedIds: string[] = [];

        if (answeredIds.length > 0) {
          const { data: likes } = await supabase
            .from("prayer_likes")
            .select("prayer_id,user_id")
            .in("prayer_id", answeredIds);

          (likes ?? []).forEach((like: any) => {
            likeCounts[like.prayer_id] = (likeCounts[like.prayer_id] ?? 0) + 1;
            if (like.user_id === user.id) myLikedIds.push(like.prayer_id);
          });
        }

        setLikedPrayerIds(myLikedIds);
        setAnsweredPrayers(filterHiddenItems("prayer", answered.map((r: any) => ({ ...r, like_count: likeCounts[r.id] ?? 0, profiles: profMap2[r.user_id] ?? null })), loadedHiddenKeys, loadedHiddenUserIds));
      } else {
        setLikedPrayerIds([]);
        setAnsweredPrayers([]);
      }

      // 전체 공개 묵상 나눔
      const qtData = await fetchQtFeedRows(supabase, "%all%");
      if (qtData) {
        const profMap = await fetchProfiles(supabase, qtData);
        const withProfs = filterHiddenItems("qt", qtData.map((r: any) => ({ ...r, profiles: profMap[r.user_id] ?? null })), loadedHiddenKeys, loadedHiddenUserIds);
        setQtShares(sortQtFeedRows(withProfs));
        // 반응 카운트 로드
        const qtIds = qtData.map((r: any) => r.id);
        const { counts, mine } = await fetchQtReactions(supabase, qtIds, user.id);
        setQtReactionCounts(counts);
        setMyQtReactions(mine);
      }

    } else if (tab === "group") {
      let memberRows: any[] = [];
      const favoriteCache = readFavoriteCache(user.id);

      const { data: preferenceRows, error: preferenceError } = await supabase.rpc("get_my_group_preferences");

      if (preferenceError) {
        console.warn("그룹 선호도 RPC 조회 실패. 기존 조회로 fallback:", preferenceError.message);
        const { data: fullMemberRows, error: fullMemberError } = await supabase.from("group_members")
          .select("group_id,is_favorite,last_seen_qt_at,created_at").eq("user_id", user.id);

        if (fullMemberError) {
          console.warn("group_members preference columns are not available yet:", fullMemberError.message);
          const { data: fallbackRows } = await supabase.from("group_members")
            .select("group_id").eq("user_id", user.id);
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
          is_favorite: !!row.is_favorite || favoriteCache.includes(row.group_id),
        };
      });
      const myGroupIds = memberRows.map((r: any) => r.group_id);

      const { data: publicGroups } = await supabase.from("groups")
        .select("*").eq("is_public", true).order("created_at", { ascending: false });

      let myPrivateGroups: any[] = [];
      if (myGroupIds.length > 0) {
        const { data } = await supabase.from("groups")
          .select("*").eq("is_public", false).in("id", myGroupIds);
        myPrivateGroups = data ?? [];
      }

      const all = [...(publicGroups ?? []), ...myPrivateGroups];
      const unique = all.filter((g, i, arr) => arr.findIndex(x => x.id === g.id) === i);
      const uniqueGroupIds = uniqueStrings(unique.map((g: any) => String(g.id ?? "")));
      const joinedGroupIds = uniqueStrings(unique
        .filter((g: any) => !!memberMap[g.id])
        .map((g: any) => String(g.id ?? "")));

      const [memberCounts, latestQtByGroup, latestPrayerByGroup] = await Promise.all([
        fetchGroupMemberCounts(supabase, uniqueGroupIds),
        fetchLatestQtTimesByGroup(supabase, joinedGroupIds),
        fetchLatestPrayerTimesByGroup(supabase, joinedGroupIds),
      ]);

      const withMeta = unique.map((g) => {
        const memberMeta = memberMap[g.id];
        const isMember = !!memberMeta;
        const lastSeenGroupAt = memberMeta?.last_seen_qt_at ?? memberMeta?.created_at ?? null;
        const latestQtAt = latestQtByGroup[g.id] ?? null;
        const latestPrayerAt = latestPrayerByGroup[g.id] ?? null;
        const hasNewQtShare = isMember && isLaterThan(latestQtAt, lastSeenGroupAt);
        const hasNewPrayer = isMember && isLaterThan(latestPrayerAt, lastSeenGroupAt);

        return {
          ...g,
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

  async function loadGroupDetail(group: any, preferredSection?: CommunitySectionKey) {
    pushCommunityDetailHistory("group");
    setGroupDetailTab(preferredSection ?? (group.hasNewPrayer && !group.hasNewQtShare ? "praying" : "qt"));
    const openedAt = new Date().toISOString();
    const previousSeenAt = group.last_seen_qt_at ?? null;
    setSelectedGroup({ ...group, hasNewQt: false, hasNewQtShare: false, hasNewPrayer: false, hasNewContent: false, last_seen_qt_at: openedAt });
    setGroupChallenges([]);
    setGroupChallengeProgress({});
    setLoadingGroupChallenges(!!group.isMember);
    setLoadingGroupQts(true);
    setLoadingGroupPrayers(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const currentHiddenKeys = hiddenKeys;
    const currentHiddenUserIds = hiddenUserIds;

    if (group.isMember) {
      if (user?.id) {
        let latestRequest: any | null = null;
        const { data: summaryRows, error: summaryError } = await supabase
          .rpc("get_group_challenge_request_summary", { p_group_id: group.id });

        if (summaryError) {
          console.warn("그룹 챌린지 그룹 기준 신청 상태 조회 실패. 본인 신청 상태로 fallback:", summaryError.message);
          const { data: requestRows, error: requestError } = await supabase
            .from("group_challenge_requests")
            .select("id,status,title,requested_start_date,duration_days,created_at")
            .eq("group_id", group.id)
            .eq("requester_id", user.id)
            .in("status", ["pending", "contacted", "approved"])
            .order("created_at", { ascending: false })
            .limit(1);
          if (requestError) {
            console.warn("그룹 챌린지 신청 상태 조회 실패:", requestError.message);
          } else {
            latestRequest = requestRows?.[0] ?? null;
          }
        } else {
          latestRequest = Array.isArray(summaryRows) ? summaryRows[0] ?? null : null;
        }

        setGroupChallengeRequest(group.id, latestRequest ? {
          id: latestRequest.id,
          status: latestRequest.status,
          title: latestRequest.title,
          requested_start_date: latestRequest.requested_start_date,
          duration_days: latestRequest.duration_days,
          created_at: latestRequest.created_at,
        } : null);
      } else {
        setGroupChallengeRequestStatus(group.id, null);
      }

      const { data: challengeRows, error: challengeError } = await supabase
        .from("group_challenges")
        .select("id,request_id,title,description,start_date,end_date,badge_name,badge_description,badge_image_path,status")
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
          const progress = await fetchGroupChallengeProgress(supabase, nextChallenges, user.id);
          setGroupChallengeProgress(progress);
          await claimCompletedGroupChallengeAwards(supabase, nextChallenges, progress, group.name ?? "");
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

    const data = await fetchQtFeedRows(supabase, `%group_${group.id}%`);
    if (data && user) {
      const profMap = await fetchProfiles(supabase, data);
      const withProfs = filterHiddenItems("qt", data.map((r: any) => ({
        ...r,
        profiles: profMap[r.user_id] ?? null,
        isUnreadInGroup: isLaterThan(qtFeedTime(r), previousSeenAt),
      })), currentHiddenKeys, currentHiddenUserIds);
      setGroupQts(sortQtFeedRows(withProfs));
      // 반응 카운트 로드
      const qtIds = data.map((r: any) => r.id);
      const { counts, mine } = await fetchQtReactions(supabase, qtIds, user.id);
      setQtReactionCounts(prev => ({ ...prev, ...counts }));
      setMyQtReactions(prev => ({ ...prev, ...mine }));

      if (group.isMember) {
        const { data: seenRows, error } = await supabase.rpc("mark_group_qt_seen_v2", { p_group_id: group.id });
        if (error) {
          console.warn("그룹 큐티 읽음 처리 실패:", error.message);
          const { error: oldError } = await supabase.rpc("mark_group_qt_seen", { p_group_id: group.id });
          if (oldError) console.warn("기존 그룹 큐티 읽음 처리도 실패:", oldError.message);
        }
        const persistedSeenAt = Array.isArray(seenRows) && seenRows[0]?.last_seen_qt_at ? seenRows[0].last_seen_qt_at : openedAt;
        setGroups(prev => sortGroupsForDisplay(prev.map(g => g.id === group.id ? { ...g, hasNewQt: false, hasNewQtShare: false, hasNewPrayer: false, hasNewContent: false, last_seen_qt_at: persistedSeenAt } : g)));
      }
    }


    if (user) {
      const { data: prayerRows } = await supabase.from("prayer_items")
        .select("*")
        .ilike("visibility", `%group_${group.id}%`)
        .order("is_answered", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(COMMUNITY_FEED_PREFETCH_LIMIT);
      if (prayerRows) {
        const prayerProfMap = await fetchProfiles(supabase, prayerRows);
        const answeredIds = prayerRows.filter((row: any) => !!row.is_answered).map((row: any) => row.id);
        const { counts: likeCounts, mine: myLikedIds } = await fetchPrayerLikeMeta(supabase, answeredIds, user.id);
        if (myLikedIds.length > 0) {
          setLikedPrayerIds(prev => Array.from(new Set([...prev, ...myLikedIds])));
        }
        setGroupPrayers(filterHiddenItems("prayer", prayerRows.map((row: any) => ({
          ...row,
          like_count: likeCounts[row.id] ?? row.like_count ?? 0,
          profiles: prayerProfMap[row.user_id] ?? null,
          isUnreadInGroup: isLaterThan(sharedContentTime(row), previousSeenAt),
        })), currentHiddenKeys, currentHiddenUserIds));
      } else {
        setGroupPrayers([]);
      }
    } else {
      setGroupPrayers([]);
    }
    setLoadingGroupPrayers(false);
    setLoadingGroupQts(false);
  }

  // 통합 반응 함수 (큐티 나눔 + 그룹 큐티 공용)
  async function reactToQT(qtId: string, reactionId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const myPrev = myQtReactions[qtId];

    if (myPrev === reactionId) {
      // 같은 반응 → 취소
      const { error: delErr } = await supabase.from("qt_reactions")
        .delete().eq("qt_id", qtId).eq("user_id", user.id);
      if (delErr) { console.error("반응 취소 실패:", delErr); return; }
      setMyQtReactions(prev => { const n = { ...prev }; delete n[qtId]; return n; });
      setQtReactionCounts(prev => ({
        ...prev,
        [qtId]: { ...prev[qtId], [reactionId]: Math.max(0, (prev[qtId]?.[reactionId] ?? 1) - 1) }
      }));
    } else {
      // 새 반응 or 변경 — insert 먼저, 실패하면 update
      const { error: upsertErr } = await supabase.from("qt_reactions").upsert(
        { qt_id: qtId, user_id: user.id, reaction: reactionId },
        { onConflict: "qt_id,user_id" }
      );
      if (upsertErr) {
        console.error("반응 저장 실패:", upsertErr);
        // onConflict가 안 먹히는 경우 update 시도
        const { error: updateErr } = await supabase.from("qt_reactions")
          .update({ reaction: reactionId })
          .eq("qt_id", qtId).eq("user_id", user.id);
        if (updateErr) { console.error("반응 update도 실패:", updateErr); return; }
      }
      setMyQtReactions(prev => ({ ...prev, [qtId]: reactionId }));
      setQtReactionCounts(prev => {
        const cur = { ...prev[qtId] };
        if (myPrev) cur[myPrev] = Math.max(0, (cur[myPrev] ?? 1) - 1);
        cur[reactionId] = (cur[reactionId] ?? 0) + 1;
        return { ...prev, [qtId]: cur };
      });

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
  }

  async function prayTogether(id: string) {
    if (prayedIds.includes(id)) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 중복 체크
    const { data: existing } = await supabase.from("user_prayer_logs")
      .select("id").eq("user_id", user.id).eq("prayer_id", id).maybeSingle();
    if (existing) {
      setPrayedIds(prev => prev.includes(id) ? prev : [...prev, id]);
      return;
    }

    // 로그 저장
    const { error: logError } = await supabase.from("user_prayer_logs")
      .insert({ user_id: user.id, prayer_id: id });
    if (logError) {
      if (logError.code === "23505") setPrayedIds(prev => [...prev, id]);
      return;
    }

    // 카운트 증가: DB 함수가 실제 로그 개수 기준으로 prayer_count를 동기화합니다.
    // RLS 보안을 위해 클라이언트에서 prayer_items.prayer_count를 직접 update하지 않습니다.
    const { error: rpcError } = await supabase.rpc("increment_prayer_count", { prayer_id: id });
    if (rpcError) console.error("기도 카운트 동기화 실패:", rpcError);
    const { data: cur } = await supabase.from("prayer_items").select("prayer_count").eq("id", id).single();
    const newCount = cur?.prayer_count ?? 1;

    setPrayedIds(prev => [...prev, id]);
    storageSetJson(`comm_prayed_${user.id}`, [...prayedIds, id]);
    setPrayers(prev => prev.map(p => p.id === id ? { ...p, prayer_count: newCount } : p));
    setGroupPrayers(prev => prev.map(p => p.id === id ? { ...p, prayer_count: newCount } : p));
    setPartnerPrayers(prev => prev.map(p => p.id === id ? { ...p, prayer_count: newCount } : p));
    setAnsweredPrayers(prev => prev.map(p => p.id === id ? { ...p, prayer_count: newCount } : p));

    // 바울 뱃지 체크 (함께 기도 30번)
    let existingPrayerBadgeAwarded = false;
    try {
      const { data: prof } = await supabase.from("profiles")
        .select("badge_paul").eq("id", user.id).single();
      if (!prof?.badge_paul) {
        const { data: logs } = await supabase.from("user_prayer_logs")
          .select("id").eq("user_id", user.id);
        if ((logs?.length ?? 0) >= 30) {
          await supabase.from("profiles").update({ badge_paul: true }).eq("id", user.id);
          existingPrayerBadgeAwarded = true;
          setBadgePopup({ img: "/badge_paul.webp", title: c("community_badge_paul_title"), msg: t("badge_paul_msg", lang) });
        }
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
  }

  async function createGroup() {
    if (!groupName.trim() || !userId) return;
    setSavingGroup(true);
    const supabase = createClient();
    const { data: newGroup, error } = await supabase.from("groups").insert({
      name: groupName.trim(), description: groupDesc.trim() || null,
      is_public: isPublic, created_by: userId,
    }).select().single();
    if (error || !newGroup) { setSavingGroup(false); return; }
    const { error: memberError } = await supabase.from("group_members").insert({ group_id: newGroup.id, user_id: userId });
    if (memberError) { setSavingGroup(false); return; }
    clearSharePromptOptionsCache();
    // 베드로 배지는 첫 그룹 생성, 동행 배지는 그룹 5개 참여 시 지급합니다.
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prof } = await supabase.from("profiles")
          .select("badge_peter, badge_roots_together").eq("id", user.id).single();
        const updates: Record<string, boolean> = {};
        let popup: null | { img: string; title: string; msg: string } = null;
        if (!prof?.badge_peter) {
          updates.badge_peter = true;
          popup = { img: "/badge_peter.webp", title: c("community_badge_peter_title"), msg: t("badge_peter_msg", lang) };
        }
        if (!prof?.badge_roots_together) {
          const { data: memberships } = await supabase.from("group_members")
            .select("group_id").eq("user_id", user.id);
          const joinedCount = new Set((memberships ?? []).map((row: any) => row.group_id).filter(Boolean)).size;
          if (joinedCount >= 5) {
            updates.badge_roots_together = true;
            popup = { img: "/badge_roots_together.webp", title: c("community_badge_roots_together_title"), msg: t("badge_roots_together_msg", lang) };
          }
        }
        if (Object.keys(updates).length > 0) {
          await supabase.from("profiles").update(updates).eq("id", user.id);
          if (popup) setBadgePopup(popup);
        }
      }
    } catch (e) {}
    setGroupName(""); setGroupDesc(""); setIsPublic(true); setShowGroupForm(false); setSavingGroup(false);
    loadData();
  }

  async function joinGroup(groupId: string) {
    if (!userId) return;
    const supabase = createClient();
    const { error: joinError } = await supabase.from("group_members").upsert({ group_id: groupId, user_id: userId }, { onConflict: "group_id,user_id" });
    if (joinError) {
      console.warn("그룹 참여 실패:", joinError.message);
      return;
    }
    clearSharePromptOptionsCache();
    const joinedAt = new Date().toISOString();
    setGroups(prev => sortGroupsForDisplay(prev.map(g => g.id === groupId ? { ...g, isMember: true, member_count: (g.member_count ?? 0) + 1, last_seen_qt_at: joinedAt, hasNewQt: false, hasNewQtShare: false, hasNewPrayer: false, hasNewContent: false } : g)));
    if (selectedGroup?.id === groupId) setSelectedGroup((g: any) => ({ ...g, isMember: true, member_count: (g.member_count ?? 0) + 1, last_seen_qt_at: joinedAt, hasNewQt: false, hasNewQtShare: false, hasNewPrayer: false, hasNewContent: false }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prof } = await supabase.from("profiles")
          .select("badge_roots_together").eq("id", user.id).single();
        if (!prof?.badge_roots_together) {
          const { data: memberships } = await supabase.from("group_members")
            .select("group_id").eq("user_id", user.id);
          const joinedCount = new Set((memberships ?? []).map((row: any) => row.group_id).filter(Boolean)).size;
          if (joinedCount >= 5) {
            await supabase.from("profiles").update({ badge_roots_together: true }).eq("id", user.id);
            setBadgePopup({ img: "/badge_roots_together.webp", title: c("community_badge_roots_together_title"), msg: t("badge_roots_together_msg", lang) });
          }
        }
      }
    } catch (e) {}
  }

  async function toggleFavoriteGroup(group: any, event?: any) {
    event?.stopPropagation?.();
    if (!userId || !group.isMember || favoriteSavingIds.includes(group.id)) return;

    const previousFavorite = !!group.isFavorite;
    const nextFavorite = !previousFavorite;

    const applyFavoriteState = (value: boolean) => {
      setGroups(prev => sortGroupsForDisplay(prev.map(g => g.id === group.id ? { ...g, isFavorite: value } : g)));
      if (selectedGroup?.id === group.id) setSelectedGroup((g: any) => ({ ...g, isFavorite: value }));
    };

    setFavoriteSavingIds(prev => prev.includes(group.id) ? prev : [...prev, group.id]);
    applyFavoriteState(nextFavorite);

    const supabase = createClient();
    const { data: savedRows, error } = await supabase.rpc("set_group_favorite_v2", { p_group_id: group.id, p_is_favorite: nextFavorite });

    if (error) {
      console.warn("즐겨찾기 저장 v2 실패. 기존 RPC로 fallback:", error.message);
      const { error: legacyError } = await supabase.rpc("set_group_favorite", { p_group_id: group.id, p_is_favorite: nextFavorite });
      if (legacyError) {
        console.warn("즐겨찾기 저장 실패:", legacyError.message);
        applyFavoriteState(previousFavorite);
        updateFavoriteCache(userId, group.id, previousFavorite);
        setFavoriteSavingIds(prev => prev.filter(id => id !== group.id));
        return;
      }
    }

    const persistedFavorite = Array.isArray(savedRows) && typeof savedRows[0]?.is_favorite === "boolean"
      ? savedRows[0].is_favorite
      : nextFavorite;

    updateFavoriteCache(userId, group.id, persistedFavorite);
    applyFavoriteState(persistedFavorite);
    setFavoriteSavingIds(prev => prev.filter(id => id !== group.id));
  }

  async function toggleFavoritePartner(partner: any, event?: any) {
    event?.stopPropagation?.();
    if (!userId || !partner?.partner_id || partnerFavoriteSavingIds.includes(partner.partner_id)) return;

    const previousFavorite = !!partner.isFavorite;
    const nextFavorite = !previousFavorite;
    const partnerId = partner.partner_id;

    const applyFavoriteState = (value: boolean) => {
      setPartners(prev => sortPartnersForDisplay(prev.map(item => item.partner_id === partnerId ? { ...item, isFavorite: value } : item)));
      if (selectedPartner?.partner_id === partnerId) setSelectedPartner((current: any) => ({ ...current, isFavorite: value }));
    };

    setPartnerFavoriteSavingIds(prev => prev.includes(partnerId) ? prev : [...prev, partnerId]);
    applyFavoriteState(nextFavorite);

    const supabase = createClient();
    const { error } = await supabase
      .from("companion_preferences")
      .upsert(
        {
          user_id: userId,
          companion_user_id: partnerId,
          is_favorite: nextFavorite,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,companion_user_id" }
      );

    if (error) {
      console.warn("동역자 즐겨찾기 저장 실패:", error.message);
      applyFavoriteState(previousFavorite);
    }

    setPartnerFavoriteSavingIds(prev => prev.filter(id => id !== partnerId));
  }

  async function leaveSelectedGroup() {
    if (!selectedGroup?.id || !userId || leavingGroup) return;
    setLeavingGroup(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("leave_group", { p_group_id: selectedGroup.id });
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
    setGroups(prev => sortGroupsForDisplay(prev
      .map(g => g.id === leftGroupId ? { ...g, isMember: false, isFavorite: false, hasNewQt: false, hasNewQtShare: false, hasNewPrayer: false, hasNewContent: false, member_count: Math.max(0, (g.member_count ?? 1) - 1) } : g)
      .filter(g => wasPublic || g.id !== leftGroupId)
    ));
    setLeavingGroup(false);
  }

  async function copyInviteLink(groupId: string) {
    const copied = await copyText(`${APP_URL}/join?group=${groupId}`);
    if (copied) {
      setCopiedId(groupId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  async function shareInvite(group: any) {
    const inviteUrl = `${APP_URL}/join?group=${group.id}`;
    const text = c("community_group_invite_share_text", { name: group.name, url: inviteUrl });
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
      url: `${APP_URL}/welcome`,
    });
    if (result === "copied") {
      setCopiedId("app");
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  // 반응 버튼 컴포넌트
  function ReactionButtons({ qtId, onReact }: { qtId: string; onReact: (qtId: string, rx: string) => void }) {
    const counts = qtReactionCounts[qtId] ?? {};
    const myRx = myQtReactions[qtId];
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return (
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {REACTIONS.map(reaction => {
          const count = counts[reaction.id] ?? 0;
          const isSelected = myRx === reaction.id;
          return (
            <button key={reaction.id} onClick={() => onReact(qtId, reaction.id)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 11px", borderRadius: 20, border: `1.5px solid ${isSelected ? "var(--sage)" : "var(--border)"}`, background: isSelected ? "var(--sage-light)" : "var(--bg3)", cursor: "pointer", fontSize: 12, color: isSelected ? "var(--sage-dark)" : "var(--text3)", fontWeight: isSelected ? 700 : 400, transition: "all 0.15s" }}>
              <ReactionIcon id={reaction.id} selected={isSelected} />
              <span>{c(reaction.labelKey)}</span>
              {count > 0 && <span style={{ fontWeight: 700, color: isSelected ? "var(--sage-dark)" : "var(--text2)", marginLeft: 2 }}>{count}</span>}
            </button>
          );
        })}

      </div>
    );
  }

  function PhotoReflectionImage({ src, alt, style }: { src: string; alt?: string; style?: CSSProperties }) {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          openPhotoViewer(src, alt);
        }}
        style={{ width: "100%", display: "block", padding: 0, border: "none", background: "transparent", cursor: "zoom-in", textAlign: "left" }}
      >
        <img src={src} alt={alt || "photo reflection"} loading="lazy" decoding="async" style={style} />
      </button>
    );
  }

  // 큐티 전체보기 모달
  function QTDetailModal({ r, onClose }: { r: any; onClose: () => void }) {
    return (
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: "calc(-1 * var(--native-bottom-system-bar))", background: "rgba(0,0,0,0.88)", zIndex: 100, overflowY: "auto", overscrollBehavior: "contain" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div style={{ minHeight: "calc(100dvh + var(--native-bottom-system-bar))", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "20px 16px calc(40px + var(--native-bottom-system-bar))" }}>
          <div style={{ background: "var(--bg2)", borderRadius: 24, border: "1px solid var(--border)", width: "100%", maxWidth: 480, padding: "24px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Avatar url={r.profiles?.avatar_url} name={r.profiles?.name} size={36} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{r.profiles?.name ?? (c("community_unknown"))}</p>
                  <p style={{ fontSize: 11, color: "var(--text3)" }}>{parseLocalDateString(r.date).toLocaleDateString(getDateLocale(lang), { month: "long", day: "numeric", weekday: "short" })}</p>
                </div>
              </div>
              <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}><X size={22} /></button>
            </div>
            {r.bible_ref && (
              <div style={{ background: "var(--terra-light)", borderRadius: 14, padding: "12px 14px", marginBottom: 16, border: "1px solid rgba(196,149,106,0.2)" }}>
                <p style={{ fontSize: 16, fontWeight: 800, color: "var(--terra-dark)" }}>{translateBibleRef(r.bible_ref, lang)}</p>
                {r.key_verse && <p style={{ fontSize: 13, color: "var(--terra-dark)", lineHeight: 1.7, marginTop: 6, fontStyle: "italic", whiteSpace: "pre-line" }}>"{r.key_verse}"</p>}
              </div>
            )}
            {r.photo_path && (
              <div style={{ marginBottom: 16 }}>
                {qtPhotoUrls[r.id] ? (
                  <PhotoReflectionImage src={qtPhotoUrls[r.id]} alt="photo reflection" style={{ width: "100%", maxHeight: 520, objectFit: "contain", borderRadius: 18, border: "1px solid var(--border)", background: "var(--bg3)" }} />
                ) : (
                  <div style={{ padding: 24, borderRadius: 16, background: "var(--bg3)", color: "var(--text3)", fontSize: 13, textAlign: "center" }}>사진을 불러오는 중이에요.</div>
                )}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {SECTIONS.filter(s => s.key !== "key_verse" && r[s.key]).sort((a, b) => { if (r.qt_mode === "sunday") { const order = ["opening_prayer","meditation","application","decision","closing_prayer","summary"]; return order.indexOf(a.key) - order.indexOf(b.key); } return 0; }).map(({ key, labelKey, sundayLabelKey, italic, isDecision }) => { const displayLabelKey = key === "summary" && r.qt_mode === "sunday" && sundayLabelKey ? sundayLabelKey : labelKey; return (
                <div key={key}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>{c(displayLabelKey)}</p>
                  {isDecision ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {r[key].split("\n").filter((d: string) => d.trim()).map((d: string, i: number) => (
                        <p key={i} style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6 }}>
                          <span style={{ fontWeight: 700, color: "var(--sage-dark)" }}>{i + 1}.</span> {d}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7, fontStyle: italic ? "italic" : "normal", whiteSpace: "pre-line" }}>{r[key]}</p>
                  )}
                </div>
              ); })}
            </div>
            <div style={{ borderTop: "1px solid var(--border)", marginTop: 20, paddingTop: 16 }}>
              <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 10, fontWeight: 600 }}>{c("community_react_to_qt")}</p>
              <ReactionButtons qtId={r.id} onReact={reactToQT} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderChallengeRequestModal() {
    if (!showChallengeRequestForm || !selectedGroup) return null;
    return (
      <div onClick={() => !challengeSaving && setShowChallengeRequestForm(false)} style={{ position: "fixed", inset: 0, zIndex: 285, background: "rgba(26,28,30,0.68)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "18px 18px calc(18px + env(safe-area-inset-bottom))" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 430, maxHeight: "86vh", overflowY: "auto", background: "var(--bg2)", borderRadius: 26, padding: 22, border: "1px solid var(--border)", boxShadow: "0 22px 70px rgba(0,0,0,0.28)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: "var(--sage-dark)", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 5 }}>{selectedGroup.name}</p>
              <h2 style={{ fontSize: 19, fontWeight: 850, color: "var(--text)", marginBottom: 5 }}>{c("group_challenge_modal_title")}</h2>
              {!challengeSuccess && (
                <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.55 }}>{c("group_challenge_modal_sub")}</p>
              )}
            </div>
            <button onClick={() => !challengeSaving && setShowChallengeRequestForm(false)} disabled={challengeSaving} aria-label="Close" style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: challengeSaving ? "default" : "pointer", flexShrink: 0, opacity: challengeSaving ? 0.6 : 1 }}>
              <X size={17} />
            </button>
          </div>

          {challengeSuccess ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ borderRadius: 20, border: "1px solid rgba(122,157,122,0.28)", background: "rgba(122,157,122,0.10)", padding: 18, textAlign: "center" }}>
                <div style={{ width: 46, height: 46, borderRadius: 999, background: "var(--sage-light)", color: "var(--sage-dark)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                  <CheckCircle2 size={24} />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 850, color: "var(--text)", marginBottom: 8 }}>{c("group_challenge_success_title")}</h3>
                <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.65 }}>{c("group_challenge_success_message")}</p>
              </div>
              <button onClick={resetChallengeRequestForm} className="btn-sage" style={{ width: "100%" }}>{c("group_challenge_success_confirm")}</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: "var(--text3)", display: "block", marginBottom: 6 }}>{c("group_challenge_title_label")}</label>
                <input className="input-field" value={challengeTitle} onChange={(e) => setChallengeTitle(e.target.value)} placeholder={c("group_challenge_title_placeholder")} style={{ height: 46, padding: "0 14px", fontSize: 15 }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, color: "var(--text3)", display: "block", marginBottom: 6 }}>{c("group_challenge_start_label")}</label>
                  <div style={{ position: "relative", width: challengeRequestDateInputWidth(), maxWidth: "100%" }}>
                    <input
                      type="date"
                      className="input-field"
                      value={challengeStartDate}
                      onChange={(e) => setChallengeStartDate(e.target.value)}
                      style={{ width: "100%", height: 46, minWidth: 0, padding: "0 14px", boxSizing: "border-box", fontSize: 15, color: "transparent", caretColor: "transparent", WebkitTextFillColor: "transparent" } as CSSProperties}
                    />
                    <span aria-hidden="true" style={{ position: "absolute", inset: 0, height: 46, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 12px", pointerEvents: "none", fontSize: 15, color: "var(--text)", whiteSpace: "nowrap" }}>
                      {formatChallengeRequestInputDate(challengeStartDate)}
                    </span>
                  </div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, color: "var(--text3)", display: "block", marginBottom: 6 }}>{c("group_challenge_duration_label")}</label>
                  <input type="number" min={1} max={120} inputMode="numeric" className="input-field" value={challengeDurationDays} onChange={(e) => setChallengeDurationDays(e.target.value)} style={{ width: 86, height: 46, minWidth: 0, padding: "0 14px", textAlign: "center", fontSize: 15 }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: "var(--text3)", display: "block", marginBottom: 6 }}>{c("group_challenge_description_label")}</label>
                <textarea className="textarea-field" rows={3} value={challengeDescription} onChange={(e) => setChallengeDescription(e.target.value)} placeholder={c("group_challenge_description_placeholder")} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: "var(--text3)", display: "block", marginBottom: 6 }}>{c("group_challenge_badge_idea_label")}</label>
                <textarea className="textarea-field" rows={3} value={challengeBadgeIdea} onChange={(e) => setChallengeBadgeIdea(e.target.value)} placeholder={c("group_challenge_badge_idea_placeholder")} />
                <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.5, marginTop: 6 }}>{c("group_challenge_badge_idea_hint")}</p>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: "var(--text3)", display: "block", marginBottom: 6 }}>{c("group_challenge_email_label")}</label>
                <input type="email" className="input-field" value={challengeContactEmail} onChange={(e) => setChallengeContactEmail(e.target.value)} placeholder="name@example.com" />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: "var(--text3)", display: "block", marginBottom: 6 }}>{c("group_challenge_extra_label")}</label>
                <textarea className="textarea-field" rows={3} value={challengeExtraQuestions} onChange={(e) => setChallengeExtraQuestions(e.target.value)} placeholder={c("group_challenge_extra_placeholder")} />
              </div>
              {challengeError && <p style={{ fontSize: 12, color: "#B35F5F", lineHeight: 1.5 }}>{challengeError}</p>}
              <button onClick={submitChallengeRequest} disabled={challengeSaving} className="btn-sage" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: challengeSaving ? 0.65 : 1 }}>
                {challengeSaving ? <Loader2 size={16} className="spin" /> : null}
                {challengeSaving ? c("group_challenge_saving") : c("group_challenge_submit")}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }


  function renderSharedOverlayModals() {
    return (
      <>
        {photoViewer && <PhotoViewerModal src={photoViewer.src} alt={photoViewer.alt} onClose={closePhotoViewer} />}
        {renderProfileModal()}
        {renderActionMenu()}
        {renderSafetyConfirmModal()}
        {renderManageModal()}
        {renderChallengeRequestModal()}
      </>
    );
  }

  const TABS: { id: typeof tab; label: string }[] = [{ id: "partner", label: c("community_tab_partner") }, { id: "group", label: c("community_tab_group") }, { id: "all", label: c("community_tab_all") }];
  const groupPrayingPrayers = groupPrayers.filter((p: any) => !p.is_answered);
  const groupAnsweredPrayers = groupPrayers.filter((p: any) => !!p.is_answered);
  const groupPrayersForCurrentTab = groupDetailTab === "answered" ? groupAnsweredPrayers : groupPrayingPrayers;
  const allQtFeedKey = "all-qt";
  const allPrayingFeedKey = "all-praying";
  const allAnsweredFeedKey = "all-answered";
  const visibleAllQts = visibleFeedItems(allQtFeedKey, qtShares);
  const visibleAllPrayers = visibleFeedItems(allPrayingFeedKey, prayers);
  const visibleAllAnsweredPrayers = visibleFeedItems(allAnsweredFeedKey, answeredPrayers);

  if (selectedPartner) {
    const partnerProfile = selectedPartner.profile ?? {};
    const partnerName = partnerProfile.name || c("profile_default_name");
    const partnerPrayingPrayers = partnerPrayers.filter((prayer) => !prayer.is_answered);
    const partnerAnsweredPrayers = partnerPrayers.filter((prayer) => prayer.is_answered);
    const partnerPrayersForCurrentTab = partnerDetailTab === "answered" ? partnerAnsweredPrayers : partnerPrayingPrayers;
    const partnerQtFeedKey = `partner-${selectedPartner.partner_id}-qt`;
    const partnerPrayerFeedKey = `partner-${selectedPartner.partner_id}-${partnerDetailTab}`;
    const visiblePartnerQts = visibleFeedItems(partnerQtFeedKey, partnerQts);
    const visiblePartnerPrayers = visibleFeedItems(partnerPrayerFeedKey, partnerPrayersForCurrentTab);
    const partnerEmptyConfig = partnerDetailTab === "qt"
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
      <div className="page">
        <div style={{ background: "var(--bg)", padding: "56px 20px 8px" }}>
          <button onClick={closePartnerDetail} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", marginBottom: 14, cursor: "pointer" }}>
            <ArrowLeft size={18} /><span style={{ fontSize: 13 }}>{t("back", lang)}</span>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar url={partnerProfile.avatar_url} name={partnerName} size={48} />
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{partnerName}</h1>
              <p style={{ fontSize: 12, color: "var(--text3)" }}>{t("profile_streak", lang, { n: partnerProfile.streak_days ?? 0 })}</p>
            </div>
            <button
              onClick={(event) => toggleFavoritePartner(selectedPartner, event)}
              disabled={partnerFavoriteSavingIds.includes(selectedPartner.partner_id)}
              aria-label={c("community_favorite")}
              style={{ marginLeft: "auto", width: 32, height: 32, borderRadius: 999, border: `1px solid ${selectedPartner.isFavorite ? "rgba(232,197,71,0.55)" : "var(--border)"}`, background: selectedPartner.isFavorite ? "rgba(232,197,71,0.12)" : "var(--bg2)", color: selectedPartner.isFavorite ? "rgba(232,197,71,0.95)" : "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: partnerFavoriteSavingIds.includes(selectedPartner.partner_id) ? "default" : "pointer", opacity: partnerFavoriteSavingIds.includes(selectedPartner.partner_id) ? 0.65 : 1, flexShrink: 0 }}
            >
              <Star size={16} strokeWidth={1.9} fill={selectedPartner.isFavorite ? "currentColor" : "transparent"} />
            </button>
          </div>
        </div>

        <div style={{ padding: "4px 16px 96px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex" }}>
            {([
              { key: "qt" as const, label: c("community_group_tab_qt") },
              { key: "praying" as const, label: c("community_prayer_tab_praying") },
              { key: "answered" as const, label: c("community_prayer_tab_answered") },
            ]).map(({ key, label }) => {
              const active = partnerDetailTab === key;
              return (
                <button
                  key={key}
                  onClick={() => selectPartnerSection(key)}
                  style={{ flex: 1, padding: "8px 0 10px", background: "none", border: "none", borderBottom: active ? "2px solid var(--sage)" : "2px solid transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  <span style={{ fontSize: 13, fontWeight: active ? 700 : 400, color: active ? "var(--sage-dark)" : "var(--text3)" }}>{label}</span>
                  <SectionUnreadDot show={!active && hasUnreadPartnerSection(key)} />
                </button>
              );
            })}
          </div>

          {partnerDetailTab === "qt" ? (
            loadingPartnerQts ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 24 }}><Loader2 size={20} style={{ color: "var(--sage)" }} className="spin" /></div>
            ) : partnerQts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 18px", background: "var(--bg2)", borderRadius: 18, border: "1px solid var(--border)" }}>
                <div style={{ width: 46, height: 46, borderRadius: 18, margin: "0 auto 12px", background: "var(--sage-light)", color: "var(--sage-dark)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {partnerEmptyConfig.icon}
                </div>
                <h2 style={{ fontSize: 16, fontWeight: 850, color: "var(--text)", marginBottom: 8 }}>{partnerEmptyConfig.title}</h2>
                <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.65, maxWidth: 320, margin: "0 auto 16px" }}>{partnerEmptyConfig.body}</p>
                <button onClick={() => router.push(partnerEmptyConfig.path)} className="btn-sage" style={{ width: "100%", maxWidth: 300, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {partnerEmptyConfig.action}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {visiblePartnerQts.map(r => (
                  <div key={r.id} className="card" style={{ cursor: "pointer", position: "relative" }} onClick={() => openQtDetail(r)}>
                    {!r.photo_path && <ChevronRight size={18} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text3)", opacity: 0.65, pointerEvents: "none" }} />}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <AuthorIdentity profile={r.profiles} authorId={r.user_id} />
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        {r.isUnreadInPartner && (
                          <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 10, background: "rgba(232,197,71,0.15)", color: "rgba(196,149,106,0.95)", border: "1px solid rgba(232,197,71,0.28)", whiteSpace: "nowrap" }}>
                            {c("community_unread")}
                          </span>
                        )}
                        <span style={{ fontSize: 10, color: "var(--text3)", whiteSpace: "nowrap" }}>{parseLocalDateString(r.date).toLocaleDateString(getDateLocale(lang), { month: "short", day: "numeric" })}</span>
                        <CardMenu kind="qt" item={r} scope="partner" partnerId={selectedPartner.partner_id} />
                      </div>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--terra)", marginBottom: 4, paddingRight: 34 }}>{r.bible_ref ? translateBibleRef(r.bible_ref, lang) : (c("community_free_meditation"))}</p>
                    {r.key_verse && <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6, fontStyle: "italic", marginBottom: 10, paddingRight: 34 }}>"{r.key_verse.slice(0, 60)}{r.key_verse.length > 60 ? "..." : ""}"</p>}
                    {r.photo_path && qtPhotoUrls[r.id] && <PhotoReflectionImage src={qtPhotoUrls[r.id]} alt="photo reflection" style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 14, border: "1px solid var(--border)", margin: "6px 0 10px" }} />}
                    {(r.photo_caption || (r.photo_path && r.meditation)) && <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6, marginBottom: 10, paddingRight: 34, whiteSpace: "pre-line" }}>{r.photo_caption || r.meditation}</p>}
                    <div onClick={e => e.stopPropagation()}>
                      <ReactionButtons qtId={r.id} onReact={reactToQT} />
                    </div>
                  </div>
                ))}
                {renderFeedLoadMore(partnerQtFeedKey, partnerQts.length)}
              </div>
            )
          ) : (
            loadingPartnerPrayers ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 24 }}><Loader2 size={20} style={{ color: "var(--sage)" }} className="spin" /></div>
            ) : partnerPrayersForCurrentTab.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 18px", background: "var(--bg2)", borderRadius: 18, border: "1px solid var(--border)" }}>
                <div style={{ width: 46, height: 46, borderRadius: 18, margin: "0 auto 12px", background: "var(--sage-light)", color: "var(--sage-dark)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {partnerEmptyConfig.icon}
                </div>
                <h2 style={{ fontSize: 16, fontWeight: 850, color: "var(--text)", marginBottom: 8 }}>{partnerEmptyConfig.title}</h2>
                <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.65, maxWidth: 320, margin: "0 auto 16px" }}>{partnerEmptyConfig.body}</p>
                <button onClick={() => router.push(partnerEmptyConfig.path)} className="btn-sage" style={{ width: "100%", maxWidth: 300, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {partnerEmptyConfig.action}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {visiblePartnerPrayers.map(p => (
                  <div key={p.id} className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <AuthorIdentity profile={p.profiles} authorId={p.user_id} />
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        {p.isUnreadInPartner && (
                          <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 10, background: "rgba(232,197,71,0.15)", color: "rgba(196,149,106,0.95)", border: "1px solid rgba(232,197,71,0.28)", whiteSpace: "nowrap" }}>
                            {c("community_unread")}
                          </span>
                        )}
                        <span style={{ fontSize: 10, color: "var(--text3)", whiteSpace: "nowrap" }}>{new Date(p.answered_at ?? p.created_at).toLocaleDateString(getDateLocale(lang), { month: "short", day: "numeric" })}</span>
                        <CardMenu kind="prayer" item={p} scope="partner" partnerId={selectedPartner.partner_id} />
                      </div>
                    </div>

                    {p.is_answered && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                        <CheckCircle2 size={14} style={{ color: "var(--terra-dark)" }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--terra-dark)" }}>{c("community_answered")}</span>
                        {(p.prayer_count ?? 0) > 0 && (
                          <span style={{ fontSize: 11, color: "var(--text3)" }}>{answeredPrayerCountText(p.prayer_count ?? 0)}</span>
                        )}
                      </div>
                    )}

                    <p style={{ fontSize: 13, lineHeight: 1.6, color: p.is_answered ? "var(--text2)" : "var(--text)", marginBottom: 12, whiteSpace: "pre-line", textDecoration: p.is_answered ? "line-through" : "none", opacity: p.is_answered ? 0.72 : 1 }}>{p.content}</p>

                    {p.testimony && (
                      <div style={{ background: "rgba(232,197,71,0.08)", borderRadius: 12, padding: "10px 14px", border: "1px solid rgba(232,197,71,0.25)", marginBottom: 8 }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(232,197,71,0.9)", marginBottom: 4 }}>{c("community_prayer_testimony")}</p>
                        <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6, fontStyle: "italic" }}>"{p.testimony}"</p>
                      </div>
                    )}

                    {p.is_answered && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                        <PrayerLikeButton prayer={p} />
                      </div>
                    )}

                    {!p.is_answered && (
                      <button onClick={() => prayTogether(p.id)} disabled={prayedIds.includes(p.id)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "10px", borderRadius: 12, border: `1px solid ${prayedIds.includes(p.id) ? "var(--sage)" : "var(--border)"}`, background: prayedIds.includes(p.id) ? "var(--sage-light)" : "var(--bg2)", cursor: prayedIds.includes(p.id) ? "default" : "pointer" }}>
                        <span style={{ fontSize: 14 }}>{prayedIds.includes(p.id) ? <CheckCircle2 size={14} /> : <HandHeart size={14} />}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: prayedIds.includes(p.id) ? "var(--sage-dark)" : "var(--text2)" }}>
                          {prayerActionText(p, prayedIds.includes(p.id))}
                        </span>
                      </button>
                    )}
                  </div>
                ))}
                {renderFeedLoadMore(partnerPrayerFeedKey, partnerPrayersForCurrentTab.length)}
              </div>
            )
          )}
        </div>

        {detailQt && <QTDetailModal r={detailQt} onClose={closeQtDetail} />}
        {renderSharedOverlayModals()}
        <BottomNav />
      </div>
    );
  }

  if (selectedGroup) {
    const groupQtFeedKey = `group-${selectedGroup.id}-qt`;
    const groupPrayerFeedKey = `group-${selectedGroup.id}-${groupDetailTab}`;
    const visibleGroupQts = visibleFeedItems(groupQtFeedKey, groupQts);
    const visibleGroupPrayers = visibleFeedItems(groupPrayerFeedKey, groupPrayersForCurrentTab);
    return (
      <div className="page">
        <div style={{ background: "var(--bg)", padding: "56px 20px 8px" }}>
          <button onClick={closeGroupDetail} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text3)", marginBottom: 14, cursor: "pointer" }}>
            <ArrowLeft size={18} /><span style={{ fontSize: 13 }}>{t("back", lang)}</span>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, position: "relative" }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", minWidth: 0 }}>{selectedGroup.name}</h1>
            <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: selectedGroup.is_public ? "var(--sage-light)" : "var(--bg3)", color: selectedGroup.is_public ? "var(--sage-dark)" : "var(--text3)", border: `1px solid ${selectedGroup.is_public ? "rgba(122,157,122,0.3)" : "var(--border)"}` }}>
              {selectedGroup.is_public ? (c("community_public")) : (c("community_private"))}
            </span>
            {selectedGroup.isMember && (
              <button
                onClick={(e) => toggleFavoriteGroup(selectedGroup, e)}
                disabled={favoriteSavingIds.includes(selectedGroup.id)}
                aria-label={c("community_favorite")}
                style={{ width: 30, height: 30, borderRadius: 999, border: `1px solid ${selectedGroup.isFavorite ? "rgba(232,197,71,0.55)" : "var(--border)"}`, background: selectedGroup.isFavorite ? "rgba(232,197,71,0.12)" : "var(--bg2)", color: selectedGroup.isFavorite ? "rgba(232,197,71,0.95)" : "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: favoriteSavingIds.includes(selectedGroup.id) ? "default" : "pointer", opacity: favoriteSavingIds.includes(selectedGroup.id) ? 0.65 : 1, flexShrink: 0 }}
              >
                <Star size={16} strokeWidth={1.9} fill={selectedGroup.isFavorite ? "currentColor" : "transparent"} />
              </button>
            )}
            <button
              onClick={() => setShowGroupActionMenu(prev => !prev)}
              aria-label={c("community_group_actions")}
              style={{ marginLeft: "auto", width: 34, height: 34, border: "none", background: "transparent", color: "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0, flexShrink: 0 }}
            >
              <MoreHorizontal size={22} />
            </button>
            {showGroupActionMenu && (
              <div style={{ position: "absolute", right: 0, top: 38, zIndex: 80, minWidth: 180, borderRadius: 18, border: "1px solid var(--border)", background: "var(--bg2)", boxShadow: "0 16px 45px rgba(0,0,0,0.16)", padding: 8 }}>
                <button onClick={() => { setShowGroupActionMenu(false); shareInvite(selectedGroup); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "11px 10px", border: "none", background: "transparent", color: "var(--sage-dark)", fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "left" }}>
                  <Share2 size={15} />{c("community_invite")}
                </button>
                <button onClick={() => { setShowGroupActionMenu(false); copyInviteLink(selectedGroup.id); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "11px 10px", border: "none", background: "transparent", color: "var(--text2)", fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "left" }}>
                  {copiedId === selectedGroup.id ? <Check size={15} /> : <Copy size={15} />}
                  {copiedId === selectedGroup.id ? c("community_copied") : c("community_copy_link")}
                </button>
                {selectedGroup.isMember && (
                  <button onClick={() => { setShowGroupActionMenu(false); setShowLeaveConfirm(true); }} disabled={leavingGroup} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "11px 10px", border: "none", background: "transparent", color: "#B35F5F", fontSize: 13, fontWeight: 800, cursor: leavingGroup ? "default" : "pointer", textAlign: "left", opacity: leavingGroup ? 0.65 : 1 }}>
                    {leavingGroup ? <Loader2 size={15} className="spin" /> : <LogOut size={15} />}
                    {c("community_leave_group")}
                  </button>
                )}
              </div>
            )}
          </div>
          {selectedGroup.description && <p style={{ fontSize: 13, color: "var(--text3)" }}>{selectedGroup.description}</p>}
          <button onClick={() => openGroupMembers(selectedGroup)} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "none", padding: 0, fontSize: 12, color: "var(--sage-dark)", marginTop: 6, fontWeight: 700, cursor: "pointer" }}>
            <span>{memberCountText(selectedGroup.member_count ?? 0)}</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div style={{ padding: "4px 16px 0", display: "flex", flexDirection: "column", gap: 10 }}>
          {!selectedGroup.isMember && (
            <button onClick={() => joinGroup(selectedGroup.id)} className="btn-sage" style={{ width: "100%" }}>{c("community_join")}</button>
          )}

          {selectedGroup.isMember && (
            <>
              {(loadingGroupChallenges || visibleGroupChallengeCards().length > 0) && (
                <div style={{ borderRadius: 20, border: "1px solid rgba(122,157,122,0.24)", background: "var(--bg2)", padding: "15px 15px 14px", display: "flex", flexDirection: "column", gap: 11 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <p style={{ fontSize: 14, fontWeight: 850, color: "var(--text)", margin: 0, lineHeight: 1.35 }}>
                      {c(groupChallengeSectionTitleKey(visibleGroupChallengeCards()))}
                      {groupChallengeSectionTitleKey(visibleGroupChallengeCards()) === "group_challenge_approved_section_title" && (
                        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text3)", lineHeight: 1.45 }}>
                          {` (${c("group_challenge_auto_participation_note")})`}
                        </span>
                      )}
                    </p>
                    {loadingGroupChallenges && <Loader2 size={15} className="spin" style={{ color: "var(--sage)" }} />}
                  </div>
                  {!loadingGroupChallenges && visibleGroupChallengeCards().map((challenge) => (
                    <div key={challenge.id} style={{ borderRadius: 17, border: "1px solid var(--border)", background: "rgba(255,255,255,0.62)", padding: "12px 13px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                        <div style={{ width: 62, height: 62, borderRadius: 18, background: "rgba(232,197,71,0.12)", border: "1px solid rgba(232,197,71,0.24)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                          <img
                            src="/images/group-challenges/mystery-badge.png"
                            alt=""
                            style={{ width: "100%", height: "100%", objectFit: "contain" }}
                          />
                        </div>
                        <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: 14, fontWeight: 850, color: "var(--text)", margin: "0 0 4px", lineHeight: 1.35 }}>{challenge.title}</p>
                              <p style={{ fontSize: 11, color: "var(--text3)", margin: 0, fontWeight: 700 }}>{challengeDateRange(challenge)}</p>
                            </div>
                            <span style={{ flexShrink: 0, borderRadius: 999, padding: "4px 8px", background: challengeDisplayStatus(challenge) === "active" ? "var(--sage-light)" : "var(--bg3)", color: challengeDisplayStatus(challenge) === "active" ? "var(--sage-dark)" : "var(--text3)", fontSize: 10, fontWeight: 850 }}>
                              {challengeStatusLabel(challenge)}
                            </span>
                          </div>
                          <p style={{ fontSize: 11, color: "var(--terra-dark)", fontWeight: 800, margin: "8px 0 0", lineHeight: 1.45 }}>{c("group_challenge_special_badge_teaser")}</p>
                        </div>
                      </div>
                      {groupChallengeProgress[challenge.id] && (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 850, color: "var(--sage-dark)" }}>{c("group_challenge_progress_day", { day: groupChallengeProgress[challenge.id].doneDays })}</span>
                          </div>
                          <div aria-hidden="true" style={{ height: 8, borderRadius: 999, background: "rgba(122,157,122,0.16)", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${challengeProgressPercent(groupChallengeProgress[challenge.id])}%`, borderRadius: 999, background: "var(--sage)" }} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!loadingGroupChallenges && visibleGroupChallengeCards().length === 0 && preparingApprovedGroupChallengeRequest(selectedGroup.id) && (
                <div style={{ borderRadius: 20, border: "1px solid rgba(122,157,122,0.24)", background: "linear-gradient(135deg, rgba(122,157,122,0.11), rgba(246,241,232,0.72))", padding: "16px 15px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <p style={{ fontSize: 14, fontWeight: 850, color: "var(--text)", margin: 0 }}>{c("group_challenge_preparing_title")}</p>
                  {preparingApprovedGroupChallengeRequest(selectedGroup.id)?.title && (
                    <p style={{ fontSize: 13, fontWeight: 800, color: "var(--sage-dark)", margin: 0, lineHeight: 1.35 }}>{preparingApprovedGroupChallengeRequest(selectedGroup.id)?.title}</p>
                  )}
                  <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.55, margin: 0 }}>{challengeRequestScheduleText(preparingApprovedGroupChallengeRequest(selectedGroup.id)!)}</p>
                </div>
              )}

              {!loadingGroupChallenges && visibleGroupChallengeCards().length === 0 && !preparingApprovedGroupChallengeRequest(selectedGroup.id) && (
                <div style={{ borderRadius: 20, border: "1px solid rgba(122,157,122,0.24)", background: "linear-gradient(135deg, rgba(122,157,122,0.11), rgba(246,241,232,0.72))", padding: "16px 15px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 13 }}>
                  <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 850, color: "var(--text)", margin: "0 0 7px", minWidth: 0 }}>{c("group_challenge_card_title")}</p>
                    <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.55, whiteSpace: "pre-line", margin: 0 }}>{c("group_challenge_card_body")}</p>
                  </div>
                  <button
                    onClick={openChallengeRequestForm}
                    disabled={hasActiveGroupChallengeRequest(selectedGroup.id)}
                    style={{
                      flex: "0 0 auto",
                      border: "none",
                      borderRadius: 16,
                      background: hasActiveGroupChallengeRequest(selectedGroup.id) ? "var(--bg3)" : "var(--sage)",
                      color: hasActiveGroupChallengeRequest(selectedGroup.id) ? "var(--text3)" : "white",
                      padding: "11px 16px",
                      minWidth: 82,
                      fontSize: 12,
                      fontWeight: 850,
                      cursor: hasActiveGroupChallengeRequest(selectedGroup.id) ? "default" : "pointer",
                      whiteSpace: "nowrap",
                      opacity: hasActiveGroupChallengeRequest(selectedGroup.id) ? 0.92 : 1,
                    }}
                  >
                    {hasActiveGroupChallengeRequest(selectedGroup.id) ? c("group_challenge_requested_btn") : c("group_challenge_apply_btn")}
                  </button>
                </div>
              )}
            </>
          )}

          <div style={{ marginTop: selectedGroup.isMember ? 2 : 0 }}>
            <div style={{ display: "flex", marginBottom: 12 }}>
              {[
                { key: "qt" as const, label: c("community_group_tab_qt") },
                { key: "praying" as const, label: c("community_prayer_tab_praying") },
                { key: "answered" as const, label: c("community_prayer_tab_answered") },
              ].map(({ key, label }) => {
                const active = groupDetailTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => selectGroupSection(key)}
                    style={{ flex: 1, padding: "8px 0 10px", background: "none", border: "none", borderBottom: active ? "2px solid var(--sage)" : "2px solid transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  >
                    <span style={{ fontSize: 13, fontWeight: active ? 700 : 400, color: active ? "var(--sage-dark)" : "var(--text3)" }}>{label}</span>
                    <SectionUnreadDot show={!active && hasUnreadGroupSection(key)} />
                  </button>
                );
              })}
            </div>

            {groupDetailTab === "qt" ? (
              loadingGroupQts ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 24 }}><Loader2 size={20} style={{ color: "var(--sage)" }} className="spin" /></div>
              ) : groupQts.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", background: "var(--bg2)", borderRadius: 16, border: "1px solid var(--border)" }}>
                  <BookOpen size={24} style={{ color: "var(--text3)", marginBottom: 8 }} />
                  <p style={{ fontSize: 13, color: "var(--text3)" }}>{c("community_no_group_qts")}</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {visibleGroupQts.map(r => (
                    <div key={r.id} className="card" style={{ cursor: "pointer", position: "relative" }} onClick={() => openQtDetail(r)}>
                      {!r.photo_path && <ChevronRight size={18} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text3)", opacity: 0.65, pointerEvents: "none" }} />}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <AuthorIdentity profile={r.profiles} authorId={r.user_id} />
                        <div style={{ position: "absolute", top: 18, right: 18, display: "flex", alignItems: "center", gap: 6 }}>
                          {r.isUnreadInGroup && (
                            <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 10, background: "rgba(232,197,71,0.15)", color: "rgba(196,149,106,0.95)", border: "1px solid rgba(232,197,71,0.28)", whiteSpace: "nowrap" }}>
                              {c("community_unread")}
                            </span>
                          )}
                          <span style={{ fontSize: 10, color: "var(--text3)" }}>{parseLocalDateString(r.date).toLocaleDateString(getDateLocale(lang), { month: "short", day: "numeric" })}</span>
                          <CardMenu kind="qt" item={r} scope={selectedGroup ? "group" : "all"} groupId={selectedGroup?.id} />
                        </div>
                      </div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--terra)", marginBottom: 4, paddingRight: 34 }}>{r.bible_ref ? translateBibleRef(r.bible_ref, lang) : (c("community_free_meditation"))}</p>
                      {r.key_verse && <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6, fontStyle: "italic", marginBottom: 10, paddingRight: 34 }}>"{r.key_verse.slice(0, 60)}{r.key_verse.length > 60 ? "..." : ""}"</p>}
                      {r.photo_path && qtPhotoUrls[r.id] && <PhotoReflectionImage src={qtPhotoUrls[r.id]} alt="photo reflection" style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 14, border: "1px solid var(--border)", margin: "6px 0 10px" }} />}
                      {(r.photo_caption || (r.photo_path && r.meditation)) && <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6, marginBottom: 10, paddingRight: 34, whiteSpace: "pre-line" }}>{r.photo_caption || r.meditation}</p>}
                      <div onClick={e => e.stopPropagation()}>
                        <ReactionButtons qtId={r.id} onReact={reactToQT} />
                      </div>
                    </div>
                  ))}
                  {renderFeedLoadMore(groupQtFeedKey, groupQts.length)}
                </div>
              )
            ) : (
              loadingGroupPrayers ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 24 }}><Loader2 size={20} style={{ color: "var(--sage)" }} className="spin" /></div>
              ) : groupPrayersForCurrentTab.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", background: "var(--bg2)", borderRadius: 16, border: "1px solid var(--border)" }}>
                  <HandHeart size={24} style={{ color: "var(--text3)", marginBottom: 8 }} />
                  <p style={{ fontSize: 13, color: "var(--text3)" }}>{groupDetailTab === "answered" ? c("community_no_group_answered_prayers") : c("community_no_group_prayers")}</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {visibleGroupPrayers.map(p => (
                    <div key={p.id} className="card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <AuthorIdentity profile={p.profiles} authorId={p.user_id} />
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {p.isUnreadInGroup && (
                            <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 10, background: "rgba(232,197,71,0.15)", color: "rgba(196,149,106,0.95)", border: "1px solid rgba(232,197,71,0.28)", whiteSpace: "nowrap" }}>
                              {c("community_unread")}
                            </span>
                          )}
                          <span style={{ fontSize: 10, color: "var(--text3)", whiteSpace: "nowrap" }}>{new Date(p.answered_at ?? p.created_at).toLocaleDateString(getDateLocale(lang), { month: "short", day: "numeric" })}</span>
                          {!p.is_answered && <CardMenu kind="prayer" item={p} scope={selectedGroup ? "group" : "all"} groupId={selectedGroup?.id} />}
                        </div>
                      </div>

                      {p.is_answered && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                          <CheckCircle2 size={14} style={{ color: "var(--terra-dark)" }} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--terra-dark)" }}>{c("community_answered")}</span>
                          {(p.prayer_count ?? 0) > 0 && (
                            <span style={{ fontSize: 11, color: "var(--text3)" }}>{answeredPrayerCountText(p.prayer_count ?? 0)}</span>
                          )}
                        </div>
                      )}

                      <p style={{ fontSize: 13, lineHeight: 1.6, color: p.is_answered ? "var(--text2)" : "var(--text)", marginBottom: 12, whiteSpace: "pre-line", textDecoration: p.is_answered ? "line-through" : "none", opacity: p.is_answered ? 0.72 : 1 }}>{p.content}</p>

                      {p.testimony && (
                        <div style={{ background: "rgba(232,197,71,0.08)", borderRadius: 12, padding: "10px 14px", border: "1px solid rgba(232,197,71,0.25)", marginBottom: 8 }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(232,197,71,0.9)", marginBottom: 4 }}>{c("community_prayer_testimony")}</p>
                          <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6, fontStyle: "italic" }}>"{p.testimony}"</p>
                        </div>
                      )}

                      {p.is_answered && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                          <PrayerLikeButton prayer={p} />
                        </div>
                      )}

                      {!p.is_answered && (
                        <button onClick={() => prayTogether(p.id)} disabled={prayedIds.includes(p.id)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "10px", borderRadius: 12, border: `1px solid ${prayedIds.includes(p.id) ? "var(--sage)" : "var(--border)"}`, background: prayedIds.includes(p.id) ? "var(--sage-light)" : "var(--bg2)", cursor: prayedIds.includes(p.id) ? "default" : "pointer" }}>
                          <span style={{ fontSize: 14 }}>{prayedIds.includes(p.id) ? <CheckCircle2 size={14} /> : <HandHeart size={14} />}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: prayedIds.includes(p.id) ? "var(--sage-dark)" : "var(--text2)" }}>
                            {prayerActionText(p, prayedIds.includes(p.id))}
                          </span>
                        </button>
                      )}
                    </div>
                  ))}
                  {renderFeedLoadMore(groupPrayerFeedKey, groupPrayersForCurrentTab.length)}
                </div>
              )
            )}
          </div>
        </div>
        {renderSharedOverlayModals()}
        {showGroupMembers && selectedGroup && (
          <div
            onClick={() => setShowGroupMembers(false)}
            style={{ position: "fixed", inset: 0, zIndex: 215, background: "rgba(26,28,30,0.62)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 14px 18px" }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ width: "100%", maxWidth: 430, background: "var(--bg2)", borderRadius: 26, padding: 20, border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,0.24)" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 3 }}>{c("community_members_title")}</h2>
                  <p style={{ fontSize: 12, color: "var(--text3)" }}>{memberCountText(selectedGroup.member_count ?? groupMemberProfiles.length)}</p>
                </div>
                <button onClick={() => setShowGroupMembers(false)} aria-label="Close" style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <X size={17} />
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: "52vh", overflowY: "auto" }}>
                {loadingGroupMembers ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "22px 0", color: "var(--text3)", fontSize: 13 }}>
                    <Loader2 size={16} className="spin" />
                    {c("community_members_loading")}
                  </div>
                ) : groupMemberProfiles.length > 0 ? (
                  groupMemberProfiles.map((member: any) => (
                    <div key={member.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0" }}>
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt="" loading="lazy" decoding="async" style={{ width: 38, height: 38, borderRadius: 999, objectFit: "cover", border: "1px solid var(--border)" }} />
                      ) : (
                        <div style={{ width: 38, height: 38, borderRadius: 999, background: "var(--sage-light)", color: "var(--sage-dark)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Users size={17} />
                        </div>
                      )}
                      <span style={{ fontSize: 14, color: "var(--text)", fontWeight: 700 }}>{member.name || c("community_member_unknown")}</span>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: 13, color: "var(--text3)", padding: "12px 0" }}>{c("community_members_empty")}</p>
                )}
              </div>
            </div>
          </div>
        )}
        {showLeaveConfirm && selectedGroup && (
          <div
            onClick={() => !leavingGroup && setShowLeaveConfirm(false)}
            style={{ position: "fixed", inset: 0, zIndex: 220, background: "rgba(26,28,30,0.72)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 22px" }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ width: "100%", maxWidth: 360, background: "var(--bg2)", borderRadius: 24, padding: 22, border: "1px solid rgba(196,106,106,0.25)", boxShadow: "0 20px 60px rgba(0,0,0,0.28)" }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 999, background: "rgba(196,106,106,0.10)", color: "#B35F5F", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                <AlertTriangle size={23} strokeWidth={1.9} />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>
                {c("community_leave_confirm_title")}
              </h2>
              <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.65, marginBottom: 18 }}>
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
                  style={{ flex: 1, border: "none", borderRadius: 14, background: "rgba(196,106,106,0.14)", color: "#B35F5F", fontSize: 14, fontWeight: 800, cursor: leavingGroup ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  {leavingGroup ? <Loader2 size={15} className="spin" /> : <LogOut size={15} />}
                  {c("community_leave")}
                </button>
              </div>
            </div>
          </div>
        )}
        {groupChallengeAwardPopup && (
          <div onClick={() => setGroupChallengeAwardPopup(null)} style={{ position: "fixed", inset: 0, zIndex: 245, background: "rgba(26,28,30,0.86)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
            <ConfettiBurst variant="fixed" zIndex={246} />
            <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 340, borderRadius: 28, background: "var(--bg2)", border: "1px solid rgba(232,197,71,0.38)", boxShadow: "0 20px 60px rgba(0,0,0,0.28)", padding: "30px 23px 24px", textAlign: "center" }}>
              <div style={{ width: 116, height: 116, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {groupChallengeBadgeImageSrc(groupChallengeAwardPopup.badgeImagePath) ? (
                  <img
                    src={groupChallengeBadgeImageSrc(groupChallengeAwardPopup.badgeImagePath) ?? undefined}
                    alt={groupChallengeAwardPopup.badgeName}
                    onError={(event) => {
                      if (event.currentTarget.src.endsWith(GROUP_CHALLENGE_BADGE_FALLBACK)) return;
                      event.currentTarget.src = GROUP_CHALLENGE_BADGE_FALLBACK;
                    }}
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                ) : (
                  <div style={{ width: 104, height: 104, borderRadius: 28, background: "rgba(232,197,71,0.16)", color: "rgba(189,139,30,0.95)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(232,197,71,0.34)" }}>
                    <Star size={48} strokeWidth={1.7} />
                  </div>
                )}
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: "rgba(189,139,30,0.98)", margin: "0 0 8px", lineHeight: 1.3 }}>{c("group_challenge_award_popup_title")}</h2>
              <p style={{ fontSize: 14, fontWeight: 850, color: "var(--text)", lineHeight: 1.45, margin: "0 0 4px" }}>{groupChallengeAwardPopup.challengeTitle}</p>
              <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.45, margin: "0 0 14px" }}>{groupChallengeAwardPopup.groupName}</p>
              <div style={{ padding: "14px 15px", borderRadius: 16, background: "rgba(232,197,71,0.08)", border: "1px solid rgba(232,197,71,0.25)", marginBottom: 18 }}>
                <p style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.68, margin: 0 }}>{c("group_challenge_award_popup_body")}</p>
              </div>
              <button
                onClick={() => {
                  setGroupChallengeAwardPopup(null);
                  router.push("/profile#group-challenge-badges");
                }}
                className="btn-sage"
                style={{ width: "100%" }}
              >
                {c("group_challenge_award_popup_btn")}
              </button>
            </div>
          </div>
        )}
        {detailQt && <QTDetailModal r={detailQt} onClose={closeQtDetail} />}
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="page">
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
              {c("community_thanks")}
            </button>
          </div>
        </div>
      )}
      <div style={{ background: "var(--bg)", padding: "56px 20px 0", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)" }}>{c("community_title")}</h1>
            <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 2 }}>{c("community_subtitle")}</p>
          </div>
          <button onClick={shareApp} style={{ display: "flex", alignItems: "center", gap: 5, background: "var(--sage-light)", border: "1px solid rgba(122,157,122,0.3)", borderRadius: 20, padding: "7px 12px", cursor: "pointer", marginTop: 4 }}>
            <Share2 size={13} style={{ color: "var(--sage-dark)" }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--sage-dark)" }}>{c("community_app_invite")}</span>
          </button>
        </div>
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginTop: 12 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "10px 0", background: "none", border: "none", borderBottom: tab === t.id ? "2px solid var(--sage)" : "2px solid transparent", cursor: "pointer", fontSize: 13, fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? "var(--sage-dark)" : "var(--text3)" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Loader2 size={24} style={{ color: "var(--sage)" }} className="spin" /></div>

        ) : tab === "partner" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button onClick={() => router.push("/companions")} className="btn-sage" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Plus size={16} /> {c("community_partner_invite_button")}
            </button>

            {partners.length === 0 ? (
              <>
                <div className="card" style={{ padding: 18, border: "1px solid rgba(122,157,122,0.22)", background: "linear-gradient(135deg, rgba(122,157,122,0.12), rgba(232,197,71,0.07))" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 16, background: "var(--sage-light)", color: "var(--sage-dark)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Users size={20} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>{c("community_partner_cta_title")}</h2>
                      <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6, marginBottom: 14 }}>{c("community_partner_cta_body")}</p>
                      <button onClick={() => router.push("/companions")} className="btn-outline">
                        {c("community_partner_manage_button")}
                      </button>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "center", padding: "28px 16px", background: "var(--bg2)", borderRadius: 18, border: "1px dashed var(--border)" }}>
                  <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6 }}>{c("community_partner_feed_coming")}</p>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.55 }}>{c("community_partner_list_hint")}</p>
                {partners.map((partner) => {
                  const profile = partner.profile ?? {};
                  const partnerName = profile.name || c("profile_default_name");
                  return (
                    <div
                      key={partner.id}
                      onClick={() => openPartnerDetail(partner)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => { if (event.key === "Enter") openPartnerDetail(partner); }}
                      style={{ width: "100%", padding: 14, borderRadius: 18, border: `1px solid ${partner.hasNewContent ? "rgba(122,157,122,0.35)" : "var(--border)"}`, background: partner.hasNewContent ? "rgba(122,157,122,0.08)" : "var(--bg2)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, textAlign: "left", cursor: "pointer" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <button
                          onClick={(event) => toggleFavoritePartner(partner, event)}
                          disabled={partnerFavoriteSavingIds.includes(partner.partner_id)}
                          aria-label={c("community_favorite")}
                          style={{ width: 30, height: 30, borderRadius: 999, border: `1px solid ${partner.isFavorite ? "rgba(232,197,71,0.55)" : "var(--border)"}`, background: partner.isFavorite ? "rgba(232,197,71,0.12)" : "var(--bg3)", color: partner.isFavorite ? "rgba(232,197,71,0.95)" : "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: partnerFavoriteSavingIds.includes(partner.partner_id) ? "default" : "pointer", opacity: partnerFavoriteSavingIds.includes(partner.partner_id) ? 0.65 : 1, flexShrink: 0 }}
                        >
                          <Star size={16} strokeWidth={1.9} fill={partner.isFavorite ? "currentColor" : "transparent"} />
                        </button>
                        <Avatar url={profile.avatar_url} name={partnerName} size={42} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, minWidth: 0, flexWrap: "wrap" }}>
                            <p style={{ fontSize: 14, fontWeight: 850, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{partnerName}</p>
                            {partner.hasNewContent && (
                              <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 10, background: "rgba(232,197,71,0.15)", color: "rgba(196,149,106,0.95)", border: "1px solid rgba(232,197,71,0.28)", flexShrink: 0 }}>
                                {c("community_new")}
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: 11, color: "var(--text3)" }}>{t("profile_streak", lang, { n: profile.streak_days ?? 0 })}</p>
                        </div>
                      </div>
                      <ChevronRight size={18} style={{ color: "var(--text3)", flexShrink: 0 }} />
                    </div>
                  );
                })}
                <button onClick={() => router.push("/companions")} className="btn-outline">
                  {c("community_partner_manage_button")}
                </button>
              </>
            )}
          </div>

        ) : tab === "all" ? (
          <>
            <div style={{ display: "flex", marginBottom: 16, borderBottom: "1px solid var(--border)" }}>
              {([
                { key: "qt" as const, label: c("community_group_tab_qt") },
                { key: "praying" as const, label: c("community_prayer_tab_praying") },
                { key: "answered" as const, label: c("community_prayer_tab_answered") },
              ]).map(({ key, label }) => {
                const active = allTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => selectAllSection(key)}
                    style={{ flex: 1, padding: "8px 0 10px", background: "none", border: "none", borderBottom: active ? "2px solid var(--sage)" : "2px solid transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  >
                    <span style={{ fontSize: 13, fontWeight: active ? 700 : 400, color: active ? "var(--sage-dark)" : "var(--text3)" }}>{label}</span>
                    <SectionUnreadDot show={!active && hasAllSectionNew(key)} />
                  </button>
                );
              })}
            </div>

            {allTab === "qt" ? (
              <>
                <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 12 }}>{c("community_qt_shared_sub")}</p>
                {qtShares.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "48px 0" }}>
                    <BookOpen size={30} style={{ color: "var(--text3)", marginBottom: 10 }} />
                    <p style={{ color: "var(--text3)", fontSize: 14 }}>{c("community_no_shared_qts")}</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {visibleAllQts.map(r => (
                      <div key={r.id} className="card" style={{ cursor: "pointer", position: "relative" }} onClick={() => openQtDetail(r)}>
                        {!r.photo_path && <ChevronRight size={18} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text3)", opacity: 0.65, pointerEvents: "none" }} />}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <AuthorIdentity profile={r.profiles} authorId={r.user_id} />
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 10, color: "var(--text3)" }}>{parseLocalDateString(r.date).toLocaleDateString(getDateLocale(lang), { month: "short", day: "numeric" })}</span>
                            <CardMenu kind="qt" item={r} scope="all" />
                          </div>
                        </div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--terra)", marginBottom: 4, paddingRight: 34 }}>{r.bible_ref ? translateBibleRef(r.bible_ref, lang) : (c("community_free_meditation"))}</p>
                        {r.key_verse && <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6, fontStyle: "italic", marginBottom: 10, paddingRight: 34 }}>"{r.key_verse.slice(0, 60)}{r.key_verse.length > 60 ? "..." : ""}"</p>}
                        {r.photo_path && qtPhotoUrls[r.id] && <PhotoReflectionImage src={qtPhotoUrls[r.id]} alt="photo reflection" style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 14, border: "1px solid var(--border)", margin: "6px 0 10px" }} />}
                        {(r.photo_caption || (r.photo_path && r.meditation)) && <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6, marginBottom: 10, paddingRight: 34, whiteSpace: "pre-line" }}>{r.photo_caption || r.meditation}</p>}
                        <div onClick={e => e.stopPropagation()}>
                          <ReactionButtons qtId={r.id} onReact={reactToQT} />
                        </div>
                      </div>
                    ))}
                    {renderFeedLoadMore(allQtFeedKey, qtShares.length)}
                  </div>
                )}
                {detailQt && <QTDetailModal r={detailQt} onClose={closeQtDetail} />}
              </>
            ) : allTab === "praying" ? (
              prayers.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 0" }}>
                  <HandHeart size={30} style={{ color: "var(--text3)", marginBottom: 10 }} />
                  <p style={{ color: "var(--text3)", fontSize: 14 }}>{c("community_no_prayers")}</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {visibleAllPrayers.map(p => (
                    <div key={p.id} className="card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <AuthorIdentity profile={p.profiles} authorId={p.user_id} />
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 10, color: "var(--text3)" }}>{new Date(p.created_at).toLocaleDateString(getDateLocale(lang), { month: "short", day: "numeric" })}</span>
                          {!p.is_answered && <CardMenu kind="prayer" item={p} scope="all" />}
                        </div>
                      </div>
                      <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text)", marginBottom: 12, whiteSpace: "pre-line" }}>{p.content}</p>
                      <button onClick={() => prayTogether(p.id)} disabled={prayedIds.includes(p.id)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "10px", borderRadius: 12, border: `1px solid ${prayedIds.includes(p.id) ? "var(--sage)" : "var(--border)"}`, background: prayedIds.includes(p.id) ? "var(--sage-light)" : "var(--bg2)", cursor: prayedIds.includes(p.id) ? "default" : "pointer" }}>
                        <span style={{ fontSize: 14 }}>{prayedIds.includes(p.id) ? <CheckCircle2 size={14} /> : <HandHeart size={14} />}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: prayedIds.includes(p.id) ? "var(--sage-dark)" : "var(--text2)" }}>
                          {prayerActionText(p, prayedIds.includes(p.id))}
                        </span>
                      </button>
                    </div>
                  ))}
                  {renderFeedLoadMore(allPrayingFeedKey, prayers.length)}
                </div>
              )
            ) : (
              answeredPrayers.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 0" }}>
                  <p style={{ fontSize: 32, marginBottom: 10 }}>✨</p>
                  <p style={{ color: "var(--text3)", fontSize: 14 }}>{c("community_no_answered_prayers")}</p>
                  <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 6 }}>{c("community_no_answered_sub")}</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {visibleAllAnsweredPrayers.map(p => (
                    <div key={p.id} className="card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <AuthorIdentity profile={p.profiles} authorId={p.user_id} />
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 10, color: "var(--text3)" }}>
                            {p.answered_at ? new Date(p.answered_at).toLocaleDateString(getDateLocale(lang), { month: "short", day: "numeric" }) : ""}
                          </span>
                        </div>
                      </div>
                      <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)", marginBottom: 8, whiteSpace: "pre-line", textDecoration: "line-through", opacity: 0.7 }}>{p.content}</p>
                      {p.testimony && (
                        <div style={{ background: "rgba(232,197,71,0.08)", borderRadius: 12, padding: "10px 14px", border: "1px solid rgba(232,197,71,0.25)", marginBottom: 8 }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(232,197,71,0.9)", marginBottom: 4 }}>{c("community_prayer_testimony")}</p>
                          <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6, fontStyle: "italic" }}>"{p.testimony}"</p>
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 11, color: "var(--sage-dark)", fontWeight: 600 }}>{c("community_answered")}</span>
                          {(p.prayer_count ?? 0) > 0 && (
                            <span style={{ fontSize: 11, color: "var(--text3)" }}>{answeredPrayerCountText(p.prayer_count ?? 0)}</span>
                          )}
                        </div>
                        <PrayerLikeButton prayer={p} />
                      </div>
                    </div>
                  ))}
                  {renderFeedLoadMore(allAnsweredFeedKey, answeredPrayers.length)}
                </div>
              )
            )}
          </>

        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => setShowGroupForm(true)} className="btn-sage" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Plus size={16} /> {c("community_create_group")}
            </button>
            {groups.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <p style={{ fontSize: 32, marginBottom: 10 }}>👥</p>
                <p style={{ color: "var(--text3)", fontSize: 14 }}>{c("community_no_groups")}</p>
              </div>
            ) : (
              groups.map(g => (
                <div key={g.id} onClick={() => loadGroupDetail(g)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") loadGroupDetail(g); }} style={{ width: "100%", textAlign: "left", background: (g.hasNewContent ?? g.hasNewQt) ? "rgba(122,157,122,0.08)" : "var(--bg2)", border: `1px solid ${(g.hasNewContent ?? g.hasNewQt) ? "rgba(122,157,122,0.35)" : "var(--border)"}`, borderRadius: 16, padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
                  {g.isMember && (
                    <button
                      onClick={(e) => toggleFavoriteGroup(g, e)}
                      disabled={favoriteSavingIds.includes(g.id)}
                      aria-label={c("community_favorite")}
                      style={{ width: 30, height: 30, borderRadius: 999, border: `1px solid ${g.isFavorite ? "rgba(232,197,71,0.55)" : "var(--border)"}`, background: g.isFavorite ? "rgba(232,197,71,0.12)" : "var(--bg3)", color: g.isFavorite ? "rgba(232,197,71,0.95)" : "var(--text3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: favoriteSavingIds.includes(g.id) ? "default" : "pointer", opacity: favoriteSavingIds.includes(g.id) ? 0.65 : 1, flexShrink: 0 }}
                    >
                      <Star size={16} strokeWidth={1.9} fill={g.isFavorite ? "currentColor" : "transparent"} />
                    </button>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{g.name}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: g.is_public ? "var(--sage-light)" : "var(--bg3)", color: g.is_public ? "var(--sage-dark)" : "var(--text3)", border: `1px solid ${g.is_public ? "rgba(122,157,122,0.3)" : "var(--border)"}` }}>
                        {g.is_public ? (c("community_public")) : (c("community_private"))}
                      </span>
                      {(g.hasNewContent ?? g.hasNewQt) && (
                        <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 10, background: "rgba(232,197,71,0.15)", color: "rgba(196,149,106,0.95)", border: "1px solid rgba(232,197,71,0.28)" }}>
                          {c("community_new")}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <Users size={11} style={{ color: "var(--text3)" }} />
                      <span style={{ fontSize: 11, color: "var(--text3)" }}>{g.member_count}</span>
                      {g.isMember && <span style={{ fontSize: 10, color: "var(--sage-dark)", fontWeight: 600, marginLeft: 6 }}>✓ {c("community_member")}</span>}
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ color: "var(--text3)", flexShrink: 0 }} />
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {renderSharedOverlayModals()}

      {showGroupForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px" }}>
          <div style={{ background: "var(--bg2)", width: "100%", maxWidth: 390, borderRadius: 24, padding: 24, border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)" }}>{c("community_create_group")}</h2>
              <button onClick={() => setShowGroupForm(false)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>{c("community_group_name_label")}</label>
                <input type="text" className="input-field" placeholder={c("community_group_name_placeholder")} value={groupName} onChange={e => setGroupName(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 6 }}>{c("community_group_desc_label")}</label>
                <textarea className="textarea-field" rows={2} placeholder={c("community_group_desc_placeholder")} value={groupDesc} onChange={e => setGroupDesc(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", display: "block", marginBottom: 8 }}>{c("community_visibility")}</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[{ v: true, emoji: "🌍", label: c("community_public"), sub: c("community_public_sub") }, { v: false, emoji: "🔒", label: c("community_private"), sub: c("community_private_sub") }].map(opt => (
                    <button key={String(opt.v)} onClick={() => setIsPublic(opt.v)} style={{ flex: 1, padding: "10px 8px", borderRadius: 12, border: `1px solid ${isPublic === opt.v ? "var(--sage)" : "var(--border)"}`, background: isPublic === opt.v ? "var(--sage-light)" : "var(--bg3)", cursor: "pointer", textAlign: "center" }}>
                      <div style={{ fontSize: 16, marginBottom: 3 }}>{opt.emoji}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: isPublic === opt.v ? "var(--sage-dark)" : "var(--text)" }}>{opt.label}</div>
                      <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button className="btn-outline" onClick={() => setShowGroupForm(false)} style={{ flex: 1 }}>{c("community_cancel")}</button>
                <button className="btn-sage" onClick={createGroup} disabled={savingGroup || !groupName.trim()} style={{ flex: 1 }}>
                  {savingGroup ? <Loader2 size={16} className="spin" /> : (c("community_create"))}
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

"use client";

import type { ShareTargetGroup, ShareTargetPartner } from "@/components/SharePromptModal";
import { loadProfileCards } from "@/lib/profileCards";
import { createClient } from "@/lib/supabase";

type RawSharePartner = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  isFavorite?: boolean | null;
};

type CachedSharePromptOptions = {
  groups: ShareTargetGroup[];
  partners: RawSharePartner[];
};

export type SharePromptOptions = {
  groups: ShareTargetGroup[];
  partners: ShareTargetPartner[];
};

const SHARE_PROMPT_BULK_SELECTION_LABELS = {
  ko: { selectAll: "전체 선택", deselectAll: "전체 선택 해제", showMore: "더보기", showLess: "접기" },
  de: { selectAll: "Alle auswählen", deselectAll: "Auswahl aufheben", showMore: "Mehr anzeigen", showLess: "Weniger anzeigen" },
  en: { selectAll: "Select all", deselectAll: "Clear selection", showMore: "Show more", showLess: "Show less" },
  fr: { selectAll: "Tout sélectionner", deselectAll: "Tout désélectionner", showMore: "Afficher plus", showLess: "Réduire" },
  es: { selectAll: "Seleccionar todo", deselectAll: "Quitar selección", showMore: "Ver más", showLess: "Ver menos" },
} as const;

export function getSharePromptBulkSelectionLabels(lang: string) {
  return SHARE_PROMPT_BULK_SELECTION_LABELS[lang as keyof typeof SHARE_PROMPT_BULK_SELECTION_LABELS]
    ?? SHARE_PROMPT_BULK_SELECTION_LABELS.ko;
}

const SHARE_PROMPT_OPTIONS_CACHE_MS = 45 * 1000;

let cachedSharePromptOptions: { userId: string; fetchedAt: number; data: CachedSharePromptOptions } | null = null;
let pendingSharePromptOptions: { userId: string; promise: Promise<CachedSharePromptOptions> } | null = null;

function uniqueStrings(values: unknown[]) {
  return Array.from(new Set(values.map(value => String(value ?? "")).filter(Boolean)));
}

function sortFavoritesFirst<T extends { isFavorite?: boolean | null }>(items: T[]) {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const favoriteDiff = Number(!!b.item.isFavorite) - Number(!!a.item.isFavorite);
      return favoriteDiff !== 0 ? favoriteDiff : a.index - b.index;
    })
    .map(({ item }) => item);
}

function applyPartnerFallback(data: CachedSharePromptOptions, fallbackPartnerName: string): SharePromptOptions {
  return {
    groups: data.groups,
    partners: data.partners.map(partner => ({
      id: partner.id,
      name: partner.name?.trim() || fallbackPartnerName,
      avatar_url: partner.avatar_url,
      isFavorite: !!partner.isFavorite,
    })),
  };
}

async function fetchSharePromptOptions(userId: string, signal?: AbortSignal): Promise<CachedSharePromptOptions> {
  const supabase = createClient();

  const cancellable = <T extends { abortSignal: (signal: AbortSignal) => T }>(request: T): T => {
    if (!signal) return request;
    if (signal.aborted) throw shareOptionsAbortError(signal);
    return request.abortSignal(signal);
  };

  const [memberResult, companionResult] = await Promise.all([
    cancellable(supabase
      .from("group_members")
      .select("group_id,is_favorite")
      .eq("user_id", userId)),
    cancellable(supabase
      .from("companions")
      .select("requester_id, receiver_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)),
  ]);

  if (signal?.aborted) throw shareOptionsAbortError(signal);
  let memberRows: any[] = memberResult.data ?? [];
  if (memberResult.error) {
    if (/is_favorite/i.test(memberResult.error.message ?? "")) {
      console.warn("share prompt group favorite column not available. Loading groups without favorite order:", memberResult.error.message);
      const fallbackResult = await cancellable(supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", userId));
      if (fallbackResult.error) throw fallbackResult.error;
      memberRows = fallbackResult.data ?? [];
    } else {
      throw memberResult.error;
    }
  }
  if (companionResult.error) throw companionResult.error;

  const groupIds = uniqueStrings(memberRows.map((row: any) => row.group_id));
  const groupFavoriteMap: Record<string, boolean> = {};
  memberRows.forEach((row: any) => {
    const groupId = String(row.group_id ?? "");
    if (groupId) groupFavoriteMap[groupId] = !!row.is_favorite;
  });

  const partnerIds = uniqueStrings((companionResult.data ?? []).map((row: any) => (
    row.requester_id === userId ? row.receiver_id : row.requester_id
  )));

  const [groupsResult, profilesResult, partnerPreferencesResult] = await Promise.all([
    groupIds.length > 0
      ? cancellable(supabase
        .from("groups")
        .select("id, name, is_public")
        .in("id", groupIds))
      : Promise.resolve({ data: [], error: null }),
    partnerIds.length > 0
      ? loadProfileCards(supabase, partnerIds, signal ? { signal } : undefined)
        .then(data => ({ data, error: null }))
        .catch((error: any) => ({ data: [], error }))
      : Promise.resolve({ data: [], error: null }),
    partnerIds.length > 0
      ? cancellable(supabase
        .from("companion_preferences")
        .select("companion_user_id,is_favorite")
        .eq("user_id", userId)
        .in("companion_user_id", partnerIds))
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (signal?.aborted) throw shareOptionsAbortError(signal);
  if (groupsResult.error) throw groupsResult.error;
  if (profilesResult.error) throw profilesResult.error;

  const groupMap: Record<string, any> = {};
  (groupsResult.data ?? []).forEach((group: any) => { groupMap[String(group.id)] = group; });

  const profileMap: Record<string, any> = {};
  (profilesResult.data ?? []).forEach((profile: any) => { profileMap[String(profile.id)] = profile; });

  const partnerFavoriteIds = new Set<string>();
  if (partnerPreferencesResult.error) {
    console.warn("share prompt partner favorites failed to load. Loading partners without favorite order:", partnerPreferencesResult.error.message);
  } else {
    (partnerPreferencesResult.data ?? []).forEach((row: any) => {
      if (row.is_favorite && row.companion_user_id) partnerFavoriteIds.add(String(row.companion_user_id));
    });
  }

  return {
    groups: sortFavoritesFirst(groupIds
      .map(groupId => groupMap[groupId])
      .filter(Boolean)
      .map((group: any) => ({
        id: String(group.id),
        name: String(group.name ?? ""),
        is_public: !!group.is_public,
        isFavorite: !!groupFavoriteMap[String(group.id)],
      }))),
    partners: sortFavoritesFirst(partnerIds.map(partnerId => ({
      id: String(partnerId),
      name: profileMap[partnerId]?.name ? String(profileMap[partnerId].name) : null,
      avatar_url: profileMap[partnerId]?.avatar_url ?? null,
      isFavorite: partnerFavoriteIds.has(String(partnerId)),
    }))),
  };
}

export async function loadSharePromptOptions(fallbackPartnerName: string, options: { force?: boolean } = {}): Promise<SharePromptOptions> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { groups: [], partners: [] };

  const now = Date.now();
  if (!options.force && cachedSharePromptOptions?.userId === user.id && now - cachedSharePromptOptions.fetchedAt < SHARE_PROMPT_OPTIONS_CACHE_MS) {
    return applyPartnerFallback(cachedSharePromptOptions.data, fallbackPartnerName);
  }

  if (!options.force && pendingSharePromptOptions?.userId === user.id) {
    const data = await pendingSharePromptOptions.promise;
    return applyPartnerFallback(data, fallbackPartnerName);
  }

  const promise = fetchSharePromptOptions(user.id);
  pendingSharePromptOptions = { userId: user.id, promise };

  try {
    const data = await promise;
    cachedSharePromptOptions = { userId: user.id, fetchedAt: Date.now(), data };
    return applyPartnerFallback(data, fallbackPartnerName);
  } finally {
    if (pendingSharePromptOptions?.promise === promise) {
      pendingSharePromptOptions = null;
    }
  }
}

// QT completion uses its own successful-result cache. It must not inherit an
// unresolved legacy pending request used by prayer or existing-record sharing.
let recoverableCache: { userId: string; fetchedAt: number; data: CachedSharePromptOptions } | null = null;
let recoverableGeneration = 0;

function shareOptionsAbortError(signal: AbortSignal): Error {
  if (signal.reason instanceof Error) return signal.reason;
  const error = new Error("Share options request cancelled");
  error.name = "AbortError";
  return error;
}

/**
 * Opt-in read-only loader for QT completion. The caller owns the deadline.
 * Auth getUser has no AbortSignal argument: abort ends the UI wait and prevents
 * its late result from starting reads, but does not claim to cancel the SDK auth call.
 * All cancellable database reads (including profile batches) receive the signal.
 */
export function loadRecoverableSharePromptOptions(
  fallbackPartnerName: string,
  options: { signal: AbortSignal; force?: boolean },
): Promise<SharePromptOptions> {
  const { signal } = options;
  const generation = ++recoverableGeneration;

  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(shareOptionsAbortError(signal)); return; }
    const abort = () => reject(shareOptionsAbortError(signal));
    signal.addEventListener("abort", abort, { once: true });

    const run = async () => {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (signal.aborted) throw shareOptionsAbortError(signal);
      if (error) throw error;
      if (!user) {
        const missing = new Error("Share options require a signed-in user");
        missing.name = "AuthSessionMissingError";
        throw missing;
      }

      if (!options.force && recoverableCache?.userId === user.id
        && Date.now() - recoverableCache.fetchedAt < SHARE_PROMPT_OPTIONS_CACHE_MS) {
        return applyPartnerFallback(recoverableCache.data, fallbackPartnerName);
      }

      const data = await fetchSharePromptOptions(user.id, signal);
      if (signal.aborted) throw shareOptionsAbortError(signal);
      if (generation === recoverableGeneration) {
        recoverableCache = { userId: user.id, fetchedAt: Date.now(), data };
      }
      return applyPartnerFallback(data, fallbackPartnerName);
    };

    // Attach both handlers even after cancellation so late rejection is consumed.
    void run().then(
      data => { signal.removeEventListener("abort", abort); resolve(data); },
      error => { signal.removeEventListener("abort", abort); reject(error); },
    );
  });
}

export function clearSharePromptOptionsCache() {
  cachedSharePromptOptions = null;
  pendingSharePromptOptions = null;
  recoverableCache = null;
  recoverableGeneration += 1;
}

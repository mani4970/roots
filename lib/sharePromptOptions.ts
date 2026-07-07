"use client";

import type { ShareTargetGroup, ShareTargetPartner } from "@/components/SharePromptModal";
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

async function fetchSharePromptOptions(userId: string): Promise<CachedSharePromptOptions> {
  const supabase = createClient();

  const [memberResult, companionResult] = await Promise.all([
    supabase
      .from("group_members")
      .select("group_id,is_favorite")
      .eq("user_id", userId),
    supabase
      .from("companions")
      .select("requester_id, receiver_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`),
  ]);

  let memberRows: any[] = memberResult.data ?? [];
  if (memberResult.error) {
    if (/is_favorite/i.test(memberResult.error.message ?? "")) {
      console.warn("share prompt group favorite column not available. Loading groups without favorite order:", memberResult.error.message);
      const fallbackResult = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", userId);
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
      ? supabase
        .from("groups")
        .select("id, name, is_public")
        .in("id", groupIds)
      : Promise.resolve({ data: [], error: null }),
    partnerIds.length > 0
      ? supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", partnerIds)
      : Promise.resolve({ data: [], error: null }),
    partnerIds.length > 0
      ? supabase
        .from("companion_preferences")
        .select("companion_user_id,is_favorite")
        .eq("user_id", userId)
        .in("companion_user_id", partnerIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

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

export function clearSharePromptOptionsCache() {
  cachedSharePromptOptions = null;
  pendingSharePromptOptions = null;
}

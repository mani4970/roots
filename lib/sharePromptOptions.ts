"use client";

import type { ShareTargetGroup, ShareTargetPartner } from "@/components/SharePromptModal";
import { createClient } from "@/lib/supabase";

type RawSharePartner = {
  id: string;
  name: string | null;
  avatar_url: string | null;
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

function applyPartnerFallback(data: CachedSharePromptOptions, fallbackPartnerName: string): SharePromptOptions {
  return {
    groups: data.groups,
    partners: data.partners.map(partner => ({
      id: partner.id,
      name: partner.name?.trim() || fallbackPartnerName,
      avatar_url: partner.avatar_url,
    })),
  };
}

async function fetchSharePromptOptions(userId: string): Promise<CachedSharePromptOptions> {
  const supabase = createClient();

  const [memberResult, companionResult] = await Promise.all([
    supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", userId),
    supabase
      .from("companions")
      .select("requester_id, receiver_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`),
  ]);

  if (memberResult.error) throw memberResult.error;
  if (companionResult.error) throw companionResult.error;

  const groupIds = uniqueStrings((memberResult.data ?? []).map((row: any) => row.group_id));
  const partnerIds = uniqueStrings((companionResult.data ?? []).map((row: any) => (
    row.requester_id === userId ? row.receiver_id : row.requester_id
  )));

  const [groupsResult, profilesResult] = await Promise.all([
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
  ]);

  if (groupsResult.error) throw groupsResult.error;
  if (profilesResult.error) throw profilesResult.error;

  const groupMap: Record<string, any> = {};
  (groupsResult.data ?? []).forEach((group: any) => { groupMap[String(group.id)] = group; });

  const profileMap: Record<string, any> = {};
  (profilesResult.data ?? []).forEach((profile: any) => { profileMap[String(profile.id)] = profile; });

  return {
    groups: groupIds
      .map(groupId => groupMap[groupId])
      .filter(Boolean)
      .map((group: any) => ({
        id: String(group.id),
        name: String(group.name ?? ""),
        is_public: !!group.is_public,
      })),
    partners: partnerIds.map(partnerId => ({
      id: String(partnerId),
      name: profileMap[partnerId]?.name ? String(profileMap[partnerId].name) : null,
      avatar_url: profileMap[partnerId]?.avatar_url ?? null,
    })),
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

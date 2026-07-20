import { loadProfileCards } from "@/lib/profileCards";

export type CommunityViewerMeta = {
  hiddenKeys: string[];
  hiddenUserIds: string[];
  prayedIds: string[];
};

export type PartnerSupplementalData = {
  profileMap: Record<string, any>;
  partnerPreferenceMap: Record<string, any>;
  favoritePartnerIds: Set<string>;
  latestPartnerQtAt: Record<string, string | null>;
  latestPartnerPrayerAt: Record<string, string | null>;
};

/**
 * Loads the viewer-specific community filters in parallel.
 *
 * These three queries are independent. Keeping them outside the large page
 * component also prevents future community features from making the initial
 * loading path even more serial.
 */
export async function loadCommunityViewerMeta(
  supabase: any,
  userId: string,
): Promise<CommunityViewerMeta> {
  const [hiddenItemsResult, hiddenUsersResult, prayerLogsResult] =
    await Promise.all([
      supabase
        .from("hidden_community_items")
        .select("content_type,content_id")
        .eq("user_id", userId),
      supabase
        .from("hidden_community_users")
        .select("hidden_user_id")
        .eq("user_id", userId),
      supabase
        .from("user_prayer_logs")
        .select("prayer_id")
        .eq("user_id", userId),
    ]);

  if (hiddenItemsResult.error) {
    console.warn(
      "숨긴 커뮤니티 콘텐츠 조회 실패:",
      hiddenItemsResult.error.message,
    );
  }
  if (hiddenUsersResult.error) {
    console.warn(
      "숨긴 커뮤니티 사용자 조회 실패:",
      hiddenUsersResult.error.message,
    );
  }
  if (prayerLogsResult.error) {
    console.warn("함께 기도한 기록 조회 실패:", prayerLogsResult.error.message);
  }

  return {
    hiddenKeys: (hiddenItemsResult.data ?? []).map(
      (row: any) => `${row.content_type}:${row.content_id}`,
    ),
    hiddenUserIds: (hiddenUsersResult.data ?? [])
      .map((row: any) => row.hidden_user_id)
      .filter(Boolean),
    prayedIds: (prayerLogsResult.data ?? []).map(
      (row: any) => row.prayer_id,
    ),
  };
}

async function loadPartnerPreferenceRows(
  supabase: any,
  userId: string,
  partnerIds: string[],
) {
  const { data, error } = await supabase
    .from("companion_preferences")
    .select("companion_user_id,is_favorite,last_seen_shared_at,created_at")
    .eq("user_id", userId)
    .in("companion_user_id", partnerIds);

  if (!error) return data ?? [];

  console.warn(
    "동역자 선호도/읽음 상태 조회 실패. 기존 컬럼으로 fallback:",
    error.message,
  );

  const { data: fallbackRows, error: fallbackError } = await supabase
    .from("companion_preferences")
    .select("companion_user_id,is_favorite,created_at")
    .eq("user_id", userId)
    .in("companion_user_id", partnerIds);

  if (fallbackError) {
    console.warn("동역자 즐겨찾기 조회 실패:", fallbackError.message);
    return [];
  }

  return fallbackRows ?? [];
}

/**
 * Loads all independent metadata needed by the companion list concurrently.
 * The returned shape is intentionally identical to the maps previously built
 * inside app/community/page.tsx, so the UI and sorting rules remain unchanged.
 */
export async function loadPartnerSupplementalData(
  supabase: any,
  userId: string,
  partnerIds: string[],
): Promise<PartnerSupplementalData> {
  if (partnerIds.length === 0) {
    return {
      profileMap: {},
      partnerPreferenceMap: {},
      favoritePartnerIds: new Set<string>(),
      latestPartnerQtAt: {},
      latestPartnerPrayerAt: {},
    };
  }

  const [profileResult, preferenceRows, qtRecipientResult, prayerRecipientResult] =
    await Promise.all([
      loadProfileCards(supabase, partnerIds)
        .then((data) => ({ data, error: null }))
        .catch((error: any) => ({ data: [], error })),
      loadPartnerPreferenceRows(supabase, userId, partnerIds),
      supabase
        .from("qt_record_recipients")
        .select("owner_id,recipient_id,created_at")
        .eq("recipient_id", userId)
        .in("owner_id", partnerIds)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("prayer_item_recipients")
        .select("owner_id,recipient_id,created_at")
        .eq("recipient_id", userId)
        .in("owner_id", partnerIds)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

  if (profileResult.error) {
    console.warn("동역자 프로필 조회 실패:", profileResult.error.message);
  }
  if (qtRecipientResult.error) {
    console.warn("동역자 새 묵상 조회 실패:", qtRecipientResult.error.message);
  }
  if (prayerRecipientResult.error) {
    console.warn(
      "동역자 새 기도 조회 실패:",
      prayerRecipientResult.error.message,
    );
  }

  const profileMap: Record<string, any> = {};
  (profileResult.data ?? []).forEach((profile: any) => {
    profileMap[profile.id] = profile;
  });

  const partnerPreferenceMap: Record<string, any> = {};
  (preferenceRows ?? []).forEach((row: any) => {
    partnerPreferenceMap[row.companion_user_id] = row;
  });

  const favoritePartnerIds = new Set<string>(
    (preferenceRows ?? [])
      .filter((row: any) => !!row.is_favorite)
      .map((row: any) => row.companion_user_id)
      .filter(Boolean),
  );

  const latestPartnerQtAt: Record<string, string | null> = {};
  (qtRecipientResult.data ?? []).forEach((row: any) => {
    if (!latestPartnerQtAt[row.owner_id]) {
      latestPartnerQtAt[row.owner_id] = row.created_at ?? null;
    }
  });

  const latestPartnerPrayerAt: Record<string, string | null> = {};
  (prayerRecipientResult.data ?? []).forEach((row: any) => {
    if (!latestPartnerPrayerAt[row.owner_id]) {
      latestPartnerPrayerAt[row.owner_id] = row.created_at ?? null;
    }
  });

  return {
    profileMap,
    partnerPreferenceMap,
    favoritePartnerIds,
    latestPartnerQtAt,
    latestPartnerPrayerAt,
  };
}

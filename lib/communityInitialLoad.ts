import { getPrayerShareActivityTime } from "@/lib/communityContentOrder";
import { loadProfileCards } from "@/lib/profileCards";


function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function addLatestTime(
  target: Record<string, string | null>,
  key: string,
  value: string | null,
) {
  if (!value) return;
  const current = target[key];
  if (!current || Date.parse(value) > Date.parse(current)) target[key] = value;
}

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
 * The returned shape matches the maps consumed by app/community/page.tsx.
 * Prayer activity additionally includes answered_at so a newly completed
 * testimony is not hidden behind the original prayer-request date.
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
        .select("prayer_item_id,owner_id,recipient_id,created_at")
        .eq("recipient_id", userId)
        .in("owner_id", partnerIds)
        .order("created_at", { ascending: false })
        .limit(500),
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
    addLatestTime(latestPartnerQtAt, row.owner_id, row.created_at ?? null);
  });

  const prayerRecipientRows = prayerRecipientResult.data ?? [];
  const prayerItemIds = Array.from(
    new Set(
      prayerRecipientRows
        .map((row: any) => String(row.prayer_item_id ?? ""))
        .filter(Boolean),
    ),
  );
  const prayerItemMap: Record<string, any> = {};

  if (prayerItemIds.length > 0) {
    const prayerItemResults = await Promise.all(
      chunkArray(prayerItemIds, 100).map((ids) =>
        supabase
          .from("prayer_items")
          .select("id,is_answered,answered_at,created_at")
          .in("id", ids),
      ),
    );

    prayerItemResults.forEach((result) => {
      if (result.error) {
        console.warn(
          "동역자 기도 응답 완료 시각 조회 실패:",
          result.error.message,
        );
        return;
      }
      (result.data ?? []).forEach((row: any) => {
        prayerItemMap[row.id] = row;
      });
    });
  }

  const latestPartnerPrayerAt: Record<string, string | null> = {};
  prayerRecipientRows.forEach((recipient: any) => {
    const prayer = prayerItemMap[recipient.prayer_item_id] ?? null;
    const activityAt = getPrayerShareActivityTime({
      ...prayer,
      shared_at: recipient.created_at,
      created_at: prayer?.created_at ?? recipient.created_at,
    });
    addLatestTime(latestPartnerPrayerAt, recipient.owner_id, activityAt);
  });

  return {
    profileMap,
    partnerPreferenceMap,
    favoritePartnerIds,
    latestPartnerQtAt,
    latestPartnerPrayerAt,
  };
}

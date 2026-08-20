export const SPANISH_LANGUAGE_LAUNCH_ANNOUNCEMENT_KEY =
  "spanish_language_launch_announcement_20260820";

// Only accounts that already existed when the announcement was prepared
// should see it. New signups already choose from all five languages during
// their normal welcome flow and do not need a launch announcement later.
export const SPANISH_LANGUAGE_LAUNCH_EXISTING_USER_CUTOFF =
  "2026-08-20T15:00:00.000Z";

export function isEligibleForSpanishLanguageLaunchAnnouncement(
  createdAt: string | null | undefined,
) {
  if (!createdAt) return false;
  const createdAtMs = Date.parse(createdAt);
  const cutoffMs = Date.parse(SPANISH_LANGUAGE_LAUNCH_EXISTING_USER_CUTOFF);
  return (
    Number.isFinite(createdAtMs) &&
    Number.isFinite(cutoffMs) &&
    createdAtMs < cutoffMs
  );
}

export const COMPANION_CHALLENGE_2_ANNOUNCEMENT_KEY =
  "companion_challenge_2_announcement_20260811";

export const COMPANION_CHALLENGE_2_ANNOUNCEMENT_START_DATE = "2026-08-11";
export const COMPANION_CHALLENGE_2_ANNOUNCEMENT_END_DATE = "2026-08-14";

export function isCompanionChallenge2AnnouncementWindow(localDate: string) {
  return (
    localDate >= COMPANION_CHALLENGE_2_ANNOUNCEMENT_START_DATE &&
    localDate <= COMPANION_CHALLENGE_2_ANNOUNCEMENT_END_DATE
  );
}

export function getUserCampaignLocalStorageKey(
  campaignKey: string,
  userId: string,
) {
  return `roots_campaign_seen_${campaignKey}_${userId}`;
}

export async function loadUserCampaignSeen(
  supabase: any,
  userId: string,
  campaignKey: string,
): Promise<boolean | null> {
  if (!userId || !campaignKey) return null;

  const { data, error } = await supabase
    .from("user_campaign_impressions")
    .select("campaign_key")
    .eq("user_id", userId)
    .eq("campaign_key", campaignKey)
    .maybeSingle();

  if (error) {
    console.warn("일회성 안내 확인 상태 조회 실패:", error);
    return null;
  }

  return !!data;
}

export async function markUserCampaignSeen(
  supabase: any,
  userId: string,
  campaignKey: string,
) {
  if (!userId || !campaignKey) return;

  const { error } = await supabase.from("user_campaign_impressions").insert({
    user_id: userId,
    campaign_key: campaignKey,
  });

  // A second device or a quick double-tap may race with the first insert.
  // The composite primary key makes that harmless and idempotent.
  if (error && String(error.code ?? "") !== "23505") {
    throw error;
  }
}

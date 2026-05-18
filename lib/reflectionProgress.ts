import type { SupabaseClient } from "@supabase/supabase-js";

export const QT_PENDING_AWARDED_BADGES_PREFIX = "qt_pending_awarded_badges_";

export type ReflectionProgressResult = {
  updated: boolean;
  awardedBadges: string[];
};

const SPIRIT_FRUIT_BADGE_COLUMNS = [
  "badge_love",
  "badge_peace",
  "badge_joy",
  "badge_goodness",
  "badge_kindness",
  "badge_patience",
  "badge_faithfulness",
  "badge_gentleness",
  "badge_self_control",
] as const;

export function getPendingAwardedBadgesKey(userId: string, date: string) {
  return `${QT_PENDING_AWARDED_BADGES_PREFIX}${userId}_${date}`;
}

export async function recordBibleReflectionProgress(
  supabase: SupabaseClient,
  userId: string,
  date: string
): Promise<ReflectionProgressResult> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("streak_days, total_days, last_checkin, badge_angel, badge_rootsman, badge_rootsman_bible, badge_david, badge_mose, badge_love, badge_peace, badge_joy, badge_goodness, badge_kindness, badge_patience, badge_faithfulness, badge_gentleness, badge_self_control")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    throw profileError ?? new Error("Profile not found");
  }

  const lastCheckinDate = profile.last_checkin ? String(profile.last_checkin).slice(0, 10) : null;
  if (lastCheckinDate === date) {
    return { updated: false, awardedBadges: [] };
  }

  // Roots의 streak_days는 연속 출석이 아니라 누적 말씀 묵상 완료일(말씀동행일)입니다.
  // 오랜만에 돌아와도 리셋하지 않고 다음 말씀동행일로 이어갑니다.
  const nextStreak = profile.last_checkin ? (profile.streak_days ?? 0) + 1 : 1;
  const awardedBadges: string[] = [];
  const update: Record<string, any> = {
    streak_days: nextStreak,
    total_days: (profile.total_days ?? 0) + 1,
    last_checkin: date,
  };

  if (nextStreak >= 7 && !profile.badge_rootsman) {
    update.badge_rootsman = true;
    awardedBadges.push("badge_rootsman");
  }
  if (nextStreak >= 40 && !profile.badge_mose) {
    update.badge_mose = true;
    awardedBadges.push("badge_mose");
  }
  if (nextStreak >= 52 && !profile.badge_rootsman_bible) {
    update.badge_rootsman_bible = true;
    awardedBadges.push("badge_rootsman_bible");
  }
  if (nextStreak >= 111 && !profile.badge_david) {
    update.badge_david = true;
    awardedBadges.push("badge_david");
  }

  const fruitBadgeIndex =
    nextStreak % 100 === 0 && nextStreak >= 100 && nextStreak <= 900
      ? Math.floor(nextStreak / 100) - 1
      : null;
  if (fruitBadgeIndex !== null) {
    const fruitBadgeColumn = SPIRIT_FRUIT_BADGE_COLUMNS[fruitBadgeIndex];
    if (fruitBadgeColumn && !profile[fruitBadgeColumn]) {
      update[fruitBadgeColumn] = true;
      awardedBadges.push(`fruit_badge_${fruitBadgeIndex}`);
    }
  }

  if (nextStreak >= 1000 && !profile.badge_angel) {
    update.badge_angel = true;
    awardedBadges.push("badge_angel");
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", userId)
    .or(`last_checkin.is.null,last_checkin.neq.${date}`);

  if (updateError) throw updateError;

  return { updated: true, awardedBadges };
}

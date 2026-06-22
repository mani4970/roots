import type { SupabaseClient } from "@supabase/supabase-js";

export const QT_PENDING_AWARDED_BADGES_PREFIX = "qt_pending_awarded_badges_";

export type ReflectionProgressResult = {
  updated: boolean;
  awardedBadges: string[];
  profile: any | null;
};

export type LegacyReflectionProgressResult = {
  ok: boolean;
  progressed: boolean;
  newBadgeKeys: string[];
  profile: any | null;
};

const PROFILE_PROGRESS_SELECT =
  "id, name, streak_days, total_days, last_checkin, badge_angel, badge_rootsman, badge_rootsman_bible, badge_david, badge_mose, badge_love, badge_peace, badge_joy, badge_goodness, badge_kindness, badge_patience, badge_faithfulness, badge_gentleness, badge_self_control";

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

/**
 * Persist Bible Reflection progress immediately after a newly completed reflection is saved.
 *
 * Roots treats `streak_days` as accumulated Word-walk days, not as a reset-on-missed-day streak.
 * The update is guarded by `last_checkin`, so calling this multiple times for the same date should
 * not double count. Callers should only use this for a newly completed, non-draft Bible Reflection
 * for today, not for edits or historical records.
 */
export async function recordBibleReflectionProgress(
  supabase: SupabaseClient,
  userId: string,
  date: string
): Promise<ReflectionProgressResult> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(PROFILE_PROGRESS_SELECT)
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    throw profileError ?? new Error("Profile not found");
  }

  const lastCheckinDate = profile.last_checkin ? String(profile.last_checkin).slice(0, 10) : null;
  if (lastCheckinDate === date) {
    return { updated: false, awardedBadges: [], profile };
  }

  const nextStreak = profile.last_checkin ? (profile.streak_days ?? 0) + 1 : 1;
  const awardedBadges: string[] = [];
  const update: Record<string, unknown> = {
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

  const { data: updatedProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  return {
    updated: true,
    awardedBadges,
    profile: updatedProfile ?? { ...profile, ...update },
  };
}

/**
 * Backwards-compatible wrapper for older Home code paths.
 */
export async function completeReflectionProgressForDate(
  supabase: SupabaseClient,
  userId: string,
  completedDate: string
): Promise<LegacyReflectionProgressResult> {
  try {
    const result = await recordBibleReflectionProgress(supabase, userId, completedDate);
    return {
      ok: true,
      progressed: result.updated,
      newBadgeKeys: result.awardedBadges,
      profile: result.profile,
    };
  } catch {
    return { ok: false, progressed: false, newBadgeKeys: [], profile: null };
  }
}

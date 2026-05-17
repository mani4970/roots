import type { SupabaseClient } from "@supabase/supabase-js";

export type ReflectionProgressResult = {
  ok: boolean;
  progressed: boolean;
  newBadgeKeys: string[];
  profile: any | null;
};

const PROFILE_PROGRESS_SELECT =
  "streak_days, total_days, last_checkin, badge_angel, badge_rootsman, badge_rootsman_bible, badge_david, badge_mose, badge_love, badge_peace, badge_joy, badge_goodness, badge_kindness, badge_patience, badge_faithfulness, badge_gentleness, badge_self_control";

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

/**
 * Persist the Bible Reflection progress for a completed reflection date.
 *
 * Roots intentionally treats `streak_days` as accumulated Word-walk days,
 * not as a reset-on-missed-day streak. This helper only increments when the
 * user's `last_checkin` is not already the completed date, so the same day
 * cannot be counted twice. Callers should only use this for a newly completed
 * non-draft Bible Reflection, not for edits or historical records.
 */
export async function completeReflectionProgressForDate(
  supabase: SupabaseClient,
  userId: string,
  completedDate: string
): Promise<ReflectionProgressResult> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(PROFILE_PROGRESS_SELECT)
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return { ok: false, progressed: false, newBadgeKeys: [], profile: null };
  }

  const lastCheckinDate = profile.last_checkin ? String(profile.last_checkin).slice(0, 10) : null;
  if (lastCheckinDate === completedDate) {
    return { ok: true, progressed: false, newBadgeKeys: [], profile };
  }

  const newStreak = profile.last_checkin ? (profile.streak_days ?? 0) + 1 : 1;
  const newBadgeKeys: string[] = [];
  const badgeUpdate: Record<string, unknown> = {
    streak_days: newStreak,
    total_days: (profile.total_days ?? 0) + 1,
    last_checkin: completedDate,
  };

  if (newStreak >= 7 && !profile.badge_rootsman) {
    badgeUpdate.badge_rootsman = true;
    newBadgeKeys.push("badge_rootsman");
  }
  if (newStreak >= 40 && !profile.badge_mose) {
    badgeUpdate.badge_mose = true;
    newBadgeKeys.push("badge_mose");
  }
  if (newStreak >= 52 && !profile.badge_rootsman_bible) {
    badgeUpdate.badge_rootsman_bible = true;
    newBadgeKeys.push("badge_rootsman_bible");
  }
  if (newStreak >= 111 && !profile.badge_david) {
    badgeUpdate.badge_david = true;
    newBadgeKeys.push("badge_david");
  }

  const fruitBadgeIndex =
    newStreak % 100 === 0 && newStreak >= 100 && newStreak <= 900
      ? Math.floor(newStreak / 100) - 1
      : null;
  if (fruitBadgeIndex !== null) {
    const fruitBadgeColumn = SPIRIT_FRUIT_BADGE_COLUMNS[fruitBadgeIndex];
    if (fruitBadgeColumn && !profile[fruitBadgeColumn]) {
      badgeUpdate[fruitBadgeColumn] = true;
      newBadgeKeys.push(`fruit_badge_${fruitBadgeIndex}`);
    }
  }

  if (newStreak >= 1000 && !profile.badge_angel) {
    badgeUpdate.badge_angel = true;
    newBadgeKeys.push("badge_angel");
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update(badgeUpdate)
    .eq("id", userId);

  if (updateError) {
    return { ok: false, progressed: false, newBadgeKeys: [], profile };
  }

  const { data: updatedProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  return {
    ok: true,
    progressed: true,
    newBadgeKeys,
    profile: updatedProfile ?? { ...profile, ...badgeUpdate },
  };
}

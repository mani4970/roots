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
  const { data, error } = await supabase.rpc("record_bible_reflection_progress", {
    p_user_id: userId,
    p_date: date,
  });

  if (error) throw error;
  if (!data || typeof data.updated !== "boolean") {
    throw new Error("Invalid Bible Reflection progress response");
  }

  const awardedBadges = Array.isArray(data.awarded_badges)
    ? data.awarded_badges.filter((value: unknown): value is string => typeof value === "string")
    : [];

  return {
    updated: data.updated,
    awardedBadges,
    profile: data.profile ?? null,
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

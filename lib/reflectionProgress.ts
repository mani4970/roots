import type { SupabaseClient } from "@supabase/supabase-js";
import { storageGet, storageRemove, storageSet } from "@/lib/clientStorage";

export const QT_PENDING_AWARDED_BADGES_PREFIX = "qt_pending_awarded_badges_";
export const QT_PENDING_AWARDED_BADGES_EVENT = "roots:qt-pending-awarded-badges";

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

function getAcknowledgedAwardedBadgesKey(userId: string, date: string) {
  // Keep the existing account-scoped prefix so account deletion also clears
  // these receipts. Pending badges retain their original JSON string-array form.
  return `${getPendingAwardedBadgesKey(userId, date)}_seen`;
}

// Only failed receipt writes live here. Successful storage operations are never
// cached, so normal account-deletion cleanup remains visible to subsequent reads.
const receiptMemoryFallback = new Map<string, string | null>();

function readReceipt(key: string): string | null {
  return receiptMemoryFallback.has(key)
    ? receiptMemoryFallback.get(key) ?? null
    : storageGet(key);
}

function writeReceipt(key: string, value: string) {
  storageSet(key, value);
  if (storageGet(key) === value) receiptMemoryFallback.delete(key);
  else receiptMemoryFallback.set(key, value);
}

function removeReceipt(key: string) {
  storageRemove(key);
  if (storageGet(key) === null) receiptMemoryFallback.delete(key);
  else receiptMemoryFallback.set(key, null);
}

function readBadgeKeys(key: string): string[] {
  const raw = readReceipt(key);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? Array.from(new Set(parsed.filter((value): value is string => typeof value === "string")))
      : [];
  } catch {
    return [];
  }
}

export function readPendingAwardedBadges(userId: string, date: string): string[] {
  const seen = new Set(readBadgeKeys(getAcknowledgedAwardedBadgesKey(userId, date)));
  return readBadgeKeys(getPendingAwardedBadgesKey(userId, date)).filter(key => !seen.has(key));
}

function preserveAwardedBadgeReceipt(userId: string, date: string, awardedBadges: string[]) {
  if (awardedBadges.length === 0) return;
  const seen = new Set(readBadgeKeys(getAcknowledgedAwardedBadgesKey(userId, date)));
  const pending = Array.from(new Set([
    ...readPendingAwardedBadges(userId, date),
    ...awardedBadges,
  ])).filter(key => !seen.has(key));
  if (pending.length > 0) {
    const pendingKey = getPendingAwardedBadgesKey(userId, date);
    const serialized = JSON.stringify(pending);
    if (readReceipt(pendingKey) === serialized) return;
    writeReceipt(pendingKey, serialized);
    // Home may already be mounted when an earlier request finally returns.
    // The listener re-reads its active account/date instead of trusting payloads.
    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(new CustomEvent(QT_PENDING_AWARDED_BADGES_EVENT, {
          detail: { userId, date },
        }));
      } catch {
        // Browser event support cannot change the successful RPC result.
      }
    }
  }
}

/** Call only once the corresponding badge popup has actually become visible. */
export function acknowledgePendingAwardedBadge(userId: string, date: string, badgeKey: string) {
  const seenKey = getAcknowledgedAwardedBadgesKey(userId, date);
  const seen = Array.from(new Set([...readBadgeKeys(seenKey), badgeKey]));
  // Remember the acknowledgement before removing the pending entry. A delayed
  // response from an earlier attempt must not put this badge back in the queue.
  writeReceipt(seenKey, JSON.stringify(seen));
  const remaining = readPendingAwardedBadges(userId, date).filter(key => key !== badgeKey);
  const pendingKey = getPendingAwardedBadgesKey(userId, date);
  if (remaining.length > 0) writeReceipt(pendingKey, JSON.stringify(remaining));
  else removeReceipt(pendingKey);
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

  // The caller's UI timeout does not cancel a committed RPC. Preserve the
  // server's badge receipt here even when its awaiting screen has timed out or
  // unmounted. Explicit user/date keys cannot feed another account's queue.
  preserveAwardedBadgeReceipt(userId, date, awardedBadges);

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

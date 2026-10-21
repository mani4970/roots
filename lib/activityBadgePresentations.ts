import type { SupabaseClient } from "@supabase/supabase-js";
import { storageGet, storageSet } from "@/lib/clientStorage";
import { isActivityBadgeKey, type ActivityBadgeKey } from "@/lib/activityBadgeMetadata";

export * from "@/lib/activityBadgeMetadata";

export const ACTIVITY_BADGE_PRESENTATIONS_EVENT = "roots:activity-badge-presentations";
export const ACTIVITY_BADGE_PRESENTATIONS_STORAGE_PREFIX = "roots_reward_presentations_activity_";
export type ActivityBadgeAwardRetry = "qt_share" | "prayer_share";
type LocalPresentations = {
  pending: ActivityBadgeKey[];
  cached: ActivityBadgeKey[];
  acknowledged: ActivityBadgeKey[];
  syncedAcknowledged: ActivityBadgeKey[];
  retryChecks: ActivityBadgeAwardRetry[];
  retryTokens: Partial<Record<ActivityBadgeAwardRetry, string>>;
};
const memoryFallback = new Map<string, string>();
const acknowledgementRequests = new Map<string, Promise<void>>();
let retryAttemptSequence = 0;

function uniqueKeys(value: unknown): ActivityBadgeKey[] {
  return Array.isArray(value) ? Array.from(new Set(value.filter(isActivityBadgeKey))) : [];
}
function validOwner(userId: string): boolean { return typeof userId === "string" && userId.trim().length > 0; }
function storageKey(userId: string): string { return `${ACTIVITY_BADGE_PRESENTATIONS_STORAGE_PREFIX}${userId}`; }
function readLocal(userId: string): LocalPresentations {
  try {
    const key = storageKey(userId);
    const raw = memoryFallback.get(key) ?? storageGet(key);
    const value = raw ? JSON.parse(raw) : null;
    return {
      pending: uniqueKeys(value?.pending), cached: uniqueKeys(value?.cached),
      acknowledged: uniqueKeys(value?.acknowledged), syncedAcknowledged: uniqueKeys(value?.syncedAcknowledged),
      retryChecks: Array.isArray(value?.retryChecks)
        ? Array.from(new Set(value.retryChecks.filter((item: unknown): item is ActivityBadgeAwardRetry => item === "qt_share" || item === "prayer_share"))) : [],
      retryTokens: Object.fromEntries((["qt_share", "prayer_share"] as const)
        .filter(kind => typeof value?.retryTokens?.[kind] === "string" && value.retryTokens[kind].length > 0)
        .map(kind => [kind, value.retryTokens[kind]])),
    };
  } catch { return { pending: [], cached: [], acknowledged: [], syncedAcknowledged: [], retryChecks: [], retryTokens: {} }; }
}
function writeLocal(userId: string, value: LocalPresentations): void {
  const key = storageKey(userId);
  const raw = JSON.stringify(value);
  storageSet(key, raw);
  if (storageGet(key) === raw) memoryFallback.delete(key); else memoryFallback.set(key, raw);
}
function notify(userId: string): void {
  if (typeof window === "undefined") return;
  try { window.dispatchEvent(new CustomEvent(ACTIVITY_BADGE_PRESENTATIONS_EVENT, { detail: { userId } })); }
  catch { /* Presentation events cannot invalidate an award or acknowledgement. */ }
}

export function readLocalPendingActivityBadges(userId: string): ActivityBadgeKey[] {
  if (!validOwner(userId)) return [];
  const local = readLocal(userId);
  const seen = new Set(local.acknowledged);
  return uniqueKeys([...local.pending, ...local.cached]).filter(key => !seen.has(key));
}

/** Call only for keys explicitly reported as newly awarded by an award RPC. */
export function recordActivityBadgeAwards(
  _supabase: SupabaseClient, userId: string, keys: readonly unknown[],
): ActivityBadgeKey[] {
  if (!validOwner(userId)) return [];
  const local = readLocal(userId);
  const seen = new Set(local.acknowledged);
  const incoming = uniqueKeys(keys).filter(key => !seen.has(key));
  const pending = uniqueKeys([...local.pending, ...incoming]);
  if (pending.length !== local.pending.length) {
    // This is synchronous. Navigating away immediately cannot discard an earned popup.
    writeLocal(userId, { ...local, pending });
    notify(userId);
  }
  // No server INSERT: the profile false→true trigger owns the server receipt.
  return incoming;
}

async function synchronizeAcknowledgements(supabase: SupabaseClient, userId: string): Promise<void> {
  const existing = acknowledgementRequests.get(userId);
  if (existing) {
    await existing;
    const local = readLocal(userId);
    if (local.acknowledged.some(key => !local.syncedAcknowledged.includes(key))) {
      return synchronizeAcknowledgements(supabase, userId);
    }
    return;
  }
  const initial = readLocal(userId);
  const keys = initial.acknowledged.filter(key => !initial.syncedAcknowledged.includes(key));
  if (keys.length === 0) return;
  const request = (async () => {
    const { error } = await supabase.rpc("acknowledge_activity_badge_presentations", {
      p_user_id: userId, p_badge_keys: keys,
    });
    if (error) throw error;
    const latest = readLocal(userId);
    writeLocal(userId, { ...latest, syncedAcknowledged: uniqueKeys([...latest.syncedAcknowledged, ...keys]) });
  })();
  acknowledgementRequests.set(userId, request);
  try { await request; }
  finally { if (acknowledgementRequests.get(userId) === request) acknowledgementRequests.delete(userId); }
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && Number.isFinite(Date.parse(value));
}

/** Restores only presentation state; it never grants badges or changes progress. */
export async function readPendingActivityBadges(supabase: SupabaseClient, userId: string): Promise<ActivityBadgeKey[]> {
  if (!validOwner(userId)) return [];
  // A failed ACK retry must not prevent a successful read learning another device's ACK.
  try { await synchronizeAcknowledgements(supabase, userId); } catch { /* Durable outbox remains for the next read. */ }
  try {
    const { data, error } = await supabase.from("activity_badge_presentations")
      .select("user_id,badge_key,awarded_at,acknowledged_at")
      .eq("user_id", userId).order("awarded_at", { ascending: true });
    if (error) throw error;
    const rows = Array.isArray(data) ? data.filter(row => row?.user_id === userId && isActivityBadgeKey(row?.badge_key)
      && isTimestamp(row?.awarded_at) && (row?.acknowledged_at === null || isTimestamp(row?.acknowledged_at))) : [];
    const local = readLocal(userId);
    const serverAcknowledged = uniqueKeys(rows.filter(row => row.acknowledged_at !== null).map(row => row.badge_key));
    const acknowledged = uniqueKeys([...local.acknowledged, ...serverAcknowledged]);
    const seen = new Set(acknowledged);
    const next = {
      ...local,
      pending: local.pending.filter(key => !seen.has(key)),
      cached: uniqueKeys(rows.filter(row => row.acknowledged_at === null).map(row => row.badge_key)).filter(key => !seen.has(key)),
      acknowledged,
      syncedAcknowledged: uniqueKeys([...local.syncedAcknowledged, ...serverAcknowledged]),
    };
    writeLocal(userId, next);
    if (JSON.stringify(next) !== JSON.stringify(local)) notify(userId);
  } catch { /* SQL not installed/network unavailable: retain the local pending queue and ACKs. */ }
  return readLocalPendingActivityBadges(userId);
}

/** Explicit user dismissal only. Rendering, reset and unmount must never call this. */
export async function acknowledgeActivityBadges(
  supabase: SupabaseClient, userId: string, keys: readonly unknown[],
): Promise<void> {
  if (!validOwner(userId)) return;
  const valid = uniqueKeys(keys);
  if (valid.length === 0) return;
  const local = readLocal(userId);
  const acknowledged = uniqueKeys([...local.acknowledged, ...valid]);
  const seen = new Set(acknowledged);
  // Everything before the first await, including the tombstone, is durable locally.
  writeLocal(userId, { ...local, pending: local.pending.filter(key => !seen.has(key)),
    cached: local.cached.filter(key => !seen.has(key)), acknowledged });
  notify(userId);
  try { await synchronizeAcknowledgements(supabase, userId); }
  catch { /* Keep the ACK outbox; a later restore/reconnect retries it. */ }
}

export function readActivityBadgeAwardRetries(userId: string): ActivityBadgeAwardRetry[] {
  return validOwner(userId) ? readLocal(userId).retryChecks : [];
}
function markRetry(userId: string, kind: ActivityBadgeAwardRetry, token: string, pending: boolean): void {
  const local = readLocal(userId);
  // A delayed earlier success must not clear a newer failed share attempt.
  if (!pending && local.retryTokens[kind] !== token) return;
  const retryChecks = local.retryChecks.filter(item => item !== kind);
  const retryTokens = { ...local.retryTokens };
  if (pending) { retryChecks.push(kind); retryTokens[kind] = token; }
  else delete retryTokens[kind];
  writeLocal(userId, { ...local, retryChecks, retryTokens });
}
async function checkShareAwards(supabase: SupabaseClient, userId: string, kind: ActivityBadgeAwardRetry): Promise<ActivityBadgeKey[]> {
  if (!validOwner(userId)) return [];
  // If this RPC fails or resolves after navigation, Home can retry the original criteria.
  const token = `${++retryAttemptSequence}:${Math.random().toString(36).slice(2)}`;
  markRetry(userId, kind, token, true);
  const { data, error } = await supabase.rpc(kind === "qt_share" ? "award_own_qt_share_badges" : "award_own_prayer_share_badges", {
    p_user_id: userId, p_include_partner_recipients: true,
  });
  if (error) throw error;
  if (!data || typeof data !== "object" || Array.isArray(data) || !Array.isArray(data.awarded_badges)) {
    throw new Error("Invalid activity badge award response");
  }
  const allowed = kind === "qt_share" ? ["badge_joseph", "badge_qt_bird", "badge_word_peace"] : ["badge_prayer_ember", "badge_prayer_warrior"];
  const awarded = uniqueKeys(data?.awarded_badges).filter(key => allowed.includes(key));
  const pending = recordActivityBadgeAwards(supabase, userId, awarded);
  markRetry(userId, kind, token, false);
  return pending;
}
export function checkAndAwardQtShareBadges(supabase: SupabaseClient, userId: string): Promise<ActivityBadgeKey[]> {
  return checkShareAwards(supabase, userId, "qt_share");
}
export function checkAndAwardPrayerShareBadges(supabase: SupabaseClient, userId: string): Promise<ActivityBadgeKey[]> {
  return checkShareAwards(supabase, userId, "prayer_share");
}
export async function retryPendingActivityBadgeAwards(supabase: SupabaseClient, userId: string): Promise<ActivityBadgeKey[]> {
  const results = await Promise.allSettled(readActivityBadgeAwardRetries(userId).map(kind => checkShareAwards(supabase, userId, kind)));
  return uniqueKeys(results.flatMap(result => result.status === "fulfilled" ? result.value : []));
}

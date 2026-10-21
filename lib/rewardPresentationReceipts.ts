import type { SupabaseClient } from "@supabase/supabase-js";
import { storageGet, storageRemove, storageSet } from "@/lib/clientStorage";

/** Presentation state only. None of these helpers advance progress or award rewards. */
export type RewardPresentationReceipt = {
  userId: string;
  date: string;
  itemKey: string;
  days: number;
};

export const REWARD_PRESENTATIONS_EVENT = "roots:reward-presentations";
export const REWARD_PRESENTATIONS_STORAGE_PREFIX = "roots_reward_presentations_";

type LocalReceipts = {
  pending: RewardPresentationReceipt[];
  cached: RewardPresentationReceipt[];
  acknowledgements: RewardPresentationReceipt[];
  syncedAcknowledgements: string[];
  latestDays: number;
};
type LegacyProfile = { id?: string; streak_days?: number | null; last_checkin?: string | null };
const memoryFallback = new Map<string, string>();
const syncRequests = new Map<string, Promise<void>>();
const BADGE_KEY = /^(?:badge_rootsman|badge_mose|badge_rootsman_bible|badge_david|badge_angel|fruit_badge_[0-8])$/;
const ITEM_KEY = /^(?:badge_rootsman|badge_mose|badge_rootsman_bible|badge_david|badge_angel|fruit_badge_[0-8]|stage|map_start|map_complete|action)$/;
const NEHEMIAH_STAGE_STARTS = new Set([8, 11, 16, 19, 31, 41, 51, 61, 70, 71, 81, 91]);

function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isReceipt(value: unknown, userId: string): value is RewardPresentationReceipt {
  if (!value || typeof value !== "object") return false;
  const item = value as RewardPresentationReceipt;
  return item.userId === userId && isDate(item.date) && ITEM_KEY.test(item.itemKey)
    && Number.isSafeInteger(item.days) && item.days > 0;
}

export function rewardPresentationReceiptKey(receipt: RewardPresentationReceipt): string {
  return `${receipt.date}:${receipt.itemKey}`;
}

function localKey(userId: string) { return `${REWARD_PRESENTATIONS_STORAGE_PREFIX}${userId}`; }

function readLocal(userId: string): LocalReceipts {
  try {
    const key = localKey(userId);
    const raw = memoryFallback.get(key) ?? storageGet(key);
    const data = raw ? JSON.parse(raw) : null;
    return {
      pending: Array.isArray(data?.pending) ? data.pending.filter((item: unknown) => isReceipt(item, userId)) : [],
      cached: Array.isArray(data?.cached) ? data.cached.filter((item: unknown) => isReceipt(item, userId)) : [],
      acknowledgements: Array.isArray(data?.acknowledgements)
        ? data.acknowledgements.filter((item: unknown) => isReceipt(item, userId)) : [],
      syncedAcknowledgements: Array.isArray(data?.syncedAcknowledgements)
        ? data.syncedAcknowledgements.filter((item: unknown): item is string => typeof item === "string") : [],
      latestDays: Number.isSafeInteger(data?.latestDays) && data.latestDays > 0 ? data.latestDays : 0,
    };
  } catch {
    return { pending: [], cached: [], acknowledgements: [], syncedAcknowledgements: [], latestDays: 0 };
  }
}

function writeLocal(userId: string, value: LocalReceipts) {
  const key = localKey(userId);
  const raw = JSON.stringify(value);
  storageSet(key, raw);
  if (storageGet(key) === raw) memoryFallback.delete(key);
  else memoryFallback.set(key, raw);
}

function notify(userId: string) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(REWARD_PRESENTATIONS_EVENT, { detail: { userId } }));
  } catch { /* A browser event cannot change a successful save or acknowledgement. */ }
}

function mergeReceipts(receipts: RewardPresentationReceipt[]): RewardPresentationReceipt[] {
  const unique = new Map<string, RewardPresentationReceipt>();
  receipts.forEach(item => unique.set(rewardPresentationReceiptKey(item), item));
  const all = Array.from(unique.values()).sort((a, b) => a.date.localeCompare(b.date) || a.itemKey.localeCompare(b.itemKey));
  const latestDays = Math.max(0, ...all.map(item => item.days));
  const latestAction = all.filter(item => item.itemKey === "action")
    .sort((a, b) => b.days - a.days || b.date.localeCompare(a.date))[0];
  return all.filter(item => item.itemKey !== "action" || item === latestAction && item.days >= latestDays);
}

export function readLocalPendingRewardPresentations(userId: string): RewardPresentationReceipt[] {
  const local = readLocal(userId);
  const seen = new Set(local.acknowledgements.map(rewardPresentationReceiptKey));
  const acknowledgedActionDays = Math.max(0, ...local.acknowledgements
    .filter(item => item.itemKey === "action" || item.itemKey === "map_complete").map(item => item.days));
  return mergeReceipts([...local.pending, ...local.cached].filter(item => !seen.has(rewardPresentationReceiptKey(item))
    && (item.itemKey !== "action" || item.days >= local.latestDays && item.days > acknowledgedActionDays)));
}

function queueLocal(userId: string, receipts: RewardPresentationReceipt[], announce = true) {
  const local = readLocal(userId);
  const seen = new Set(local.acknowledgements.map(rewardPresentationReceiptKey));
  const incoming = receipts.filter(item => isReceipt(item, userId) && !seen.has(rewardPresentationReceiptKey(item)));
  if (incoming.length === 0) return;
  const next = mergeReceipts([...local.pending, ...incoming]);
  if (JSON.stringify(next) === JSON.stringify(local.pending)) return;
  writeLocal(userId, { ...local, pending: next });
  if (announce) notify(userId);
}

export function isRewardPresentationStageDay(days: number): boolean {
  if (days <= 0 || days > 300) return false;
  const day = ((days - 1) % 100) + 1;
  return days <= 200 ? day > 1 && day % 10 === 1 : NEHEMIAH_STAGE_STARTS.has(day);
}

/** Used only after an old progress RPC fallback reports updated=true. */
export function preserveLocalRewardPresentation(userId: string, date: string, days: number, badgeKeys: string[]) {
  if (!isDate(date) || !Number.isSafeInteger(days) || days <= 0) return;
  const local = readLocal(userId);
  if (days > local.latestDays) writeLocal(userId, { ...local, latestDays: days });
  const keys = badgeKeys.filter(key => BADGE_KEY.test(key));
  if (days <= 300) {
    if (days % 100 === 0) keys.push("map_complete");
    else {
      keys.push("action");
      if (days === 101 || days === 201) keys.push("map_start");
    }
    if (isRewardPresentationStageDay(days)) keys.push("stage");
  }
  queueLocal(userId, Array.from(new Set(keys)).map(itemKey => ({ userId, date, days, itemKey })));
  if (keys.length === 0 && days > local.latestDays) notify(userId);
}

function rpcReceipts(receipts: RewardPresentationReceipt[]) {
  return receipts.map(({ date, days, itemKey }) => ({ date, days, itemKey }));
}

async function synchronizeLocal(supabase: SupabaseClient, userId: string): Promise<void> {
  const existing = syncRequests.get(userId);
  if (existing) {
    await existing;
    const remaining = readLocal(userId);
    const synced = new Set(remaining.syncedAcknowledgements);
    if (remaining.pending.length || remaining.acknowledgements.some(item => !synced.has(rewardPresentationReceiptKey(item)))) {
      return synchronizeLocal(supabase, userId);
    }
    return;
  }
  const request = (async () => {
    const initial = readLocal(userId);
    // Upload before acknowledging: closing an offline popup must not lose its tombstone.
    const synced = new Set(initial.syncedAcknowledgements);
    const unsyncedAcknowledgements = initial.acknowledgements.filter(item => !synced.has(rewardPresentationReceiptKey(item)));
    const upload = mergeReceipts([...initial.pending, ...unsyncedAcknowledgements]);
    for (let index = 0; index < upload.length; index += 500) {
      const batch = upload.slice(index, index + 500);
      const { error } = await supabase.rpc("import_reflection_reward_presentations", {
        p_user_id: userId, p_receipts: rpcReceipts(batch),
      });
      if (error) throw error;
      const imported = new Set(batch.map(rewardPresentationReceiptKey));
      const latest = readLocal(userId);
      writeLocal(userId, {
        ...latest,
        cached: mergeReceipts([...latest.cached, ...latest.pending.filter(item => imported.has(rewardPresentationReceiptKey(item)))]),
        pending: latest.pending.filter(item => !imported.has(rewardPresentationReceiptKey(item))),
      });
    }
    for (let index = 0; index < unsyncedAcknowledgements.length; index += 500) {
      const batch = unsyncedAcknowledgements.slice(index, index + 500);
      const { error } = await supabase.rpc("acknowledge_reflection_reward_presentations", {
        p_user_id: userId, p_receipts: rpcReceipts(batch),
      });
      if (error) throw error;
      const latest = readLocal(userId);
      writeLocal(userId, {
        ...latest,
        syncedAcknowledgements: Array.from(new Set([...latest.syncedAcknowledgements, ...batch.map(rewardPresentationReceiptKey)])),
      });
    }
    // Keep local tombstones: a delayed older request may finish after this one.
  })();
  syncRequests.set(userId, request);
  try { await request; }
  finally { if (syncRequests.get(userId) === request) syncRequests.delete(userId); }
}

/** Network/SQL absence preserves a usable local queue; re-reading retries the outbox. */
export async function readPendingRewardPresentations(supabase: SupabaseClient, userId: string): Promise<RewardPresentationReceipt[]> {
  try {
    await synchronizeLocal(supabase, userId);
    const { data, error } = await supabase.from("reflection_reward_presentations")
      .select("user_id,completion_date,item_key,streak_days")
      .eq("user_id", userId).is("acknowledged_at", null).is("superseded_at", null)
      .order("completion_date", { ascending: true });
    if (error) throw error;
    const rows: RewardPresentationReceipt[] = (data ?? []).map(row => ({
      userId: row.user_id, date: row.completion_date, itemKey: row.item_key, days: row.streak_days,
    })).filter(row => isReceipt(row, userId));
    const local = readLocal(userId);
    const seen = new Set(local.acknowledgements.map(rewardPresentationReceiptKey));
    const acknowledgedActionDays = Math.max(0, ...local.acknowledgements
      .filter(item => item.itemKey === "action" || item.itemKey === "map_complete").map(item => item.days));
    const pending = mergeReceipts([...rows, ...local.pending].filter(item => !seen.has(rewardPresentationReceiptKey(item))
      && (item.itemKey !== "action" || item.days >= local.latestDays && item.days > acknowledgedActionDays)));
    writeLocal(userId, { ...local, cached: rows.filter(item => !seen.has(rewardPresentationReceiptKey(item))) });
    return pending;
  } catch {
    return readLocalPendingRewardPresentations(userId);
  }
}

function readStringArray(key: string): string[] {
  try {
    const value: unknown = JSON.parse(storageGet(key) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch { return []; }
}

function updateLegacyAcknowledgement(userId: string, item: RewardPresentationReceipt) {
  if (BADGE_KEY.test(item.itemKey)) {
    const key = `qt_pending_awarded_badges_${userId}_${item.date}`;
    const seen = Array.from(new Set([...readStringArray(`${key}_seen`), item.itemKey]));
    storageSet(`${key}_seen`, JSON.stringify(seen));
    const pending = readStringArray(key).filter(badge => badge !== item.itemKey);
    if (pending.length) storageSet(key, JSON.stringify(pending)); else storageRemove(key);
  }
  if (item.itemKey === "action" || item.itemKey === "map_complete") {
    storageSet(`celebrated_${userId}_${item.date}`, "true");
    storageRemove(`qt_completion_pending_watering_${userId}_${item.date}`);
    storageRemove(`qt_completion_pending_watering_${item.date}`);
  }
  if (item.itemKey === "stage") {
    storageSet(`${item.days > 200 ? "nehemiah_stage_shown" : "garden_shown"}_${item.days}`, "true");
  }
}

/** Call only from an existing user confirm/close handler, never from a visibility effect. */
export async function acknowledgeRewardPresentations(
  supabase: SupabaseClient, userId: string, receipts: RewardPresentationReceipt[],
): Promise<void> {
  const valid = receipts.filter(item => isReceipt(item, userId));
  if (valid.length === 0) return;
  const local = readLocal(userId);
  const acknowledged = new Map(local.acknowledgements.map(item => [rewardPresentationReceiptKey(item), item]));
  valid.forEach(item => acknowledged.set(rewardPresentationReceiptKey(item), item));
  const seen = new Set(acknowledged.keys());
  // Everything above the first await is synchronous, including durable local acknowledgement.
  writeLocal(userId, {
    ...local,
    pending: local.pending.filter(item => !seen.has(rewardPresentationReceiptKey(item))),
    cached: local.cached.filter(item => !seen.has(rewardPresentationReceiptKey(item))),
    acknowledgements: Array.from(acknowledged.values()),
  });
  valid.forEach(item => updateLegacyAcknowledgement(userId, item));
  notify(userId);
  try {
    // A stale/unrelated legacy import must not block closing a receipt that
    // already exists on the server. Import + ack below also covers offline-only items.
    const { error } = await supabase.rpc("acknowledge_reflection_reward_presentations", {
      p_user_id: userId, p_receipts: rpcReceipts(valid),
    });
    if (error) throw error;
    await synchronizeLocal(supabase, userId);
    // Another in-flight read may have started before this close handler.
    const remaining = readLocal(userId);
    const synced = new Set(remaining.syncedAcknowledgements);
    if (remaining.acknowledgements.some(item => !synced.has(rewardPresentationReceiptKey(item)))) {
      await synchronizeLocal(supabase, userId);
    }
  }
  catch { /* Retry on the next Home load/focus; never replay a locally closed popup. */ }
}

/** Import actual pending old keys, not all badges already owned by the account. */
export async function migrateLegacyRewardPresentations(
  supabase: SupabaseClient, userId: string, profile: LegacyProfile,
): Promise<void> {
  const days = Math.floor(profile.streak_days ?? 0);
  if (profile.id && profile.id !== userId || days <= 0 || !isDate(profile.last_checkin)) return;
  const lastDate = profile.last_checkin;
  const local = readLocal(userId);
  if (days > local.latestDays) writeLocal(userId, { ...local, latestDays: days });
  const receipts: RewardPresentationReceipt[] = [];
  const importedKeys: string[] = [];
  try {
    if (typeof window !== "undefined") {
      const keys: string[] = [];
      for (let index = 0; index < window.localStorage.length; index++) {
        const key = window.localStorage.key(index);
        if (key) keys.push(key);
      }
      const badgePrefix = `qt_pending_awarded_badges_${userId}_`;
      const wateringPrefix = `qt_completion_pending_watering_${userId}_`;
      for (const key of keys) {
        if (key.startsWith(badgePrefix)) {
          const date = key.slice(badgePrefix.length);
          if (!isDate(date) || date > lastDate) continue;
          const seen = new Set(readStringArray(`${key}_seen`));
          readStringArray(key).filter(badge => BADGE_KEY.test(badge) && !seen.has(badge))
            .forEach(itemKey => receipts.push({
              userId, date, days: itemKey.startsWith("fruit_badge_") ? (Number(itemKey.slice(-1)) + 1) * 100 : days, itemKey,
            }));
          importedKeys.push(key);
        } else if (key.startsWith(wateringPrefix)) {
          const date = key.slice(wateringPrefix.length);
          if (!isDate(date) || date > lastDate || !storageGet(key)) continue;
          if (!storageGet(`celebrated_${userId}_${date}`)) {
            // Old keys never stored historical day snapshots. Use the latest map state once.
            if (date === lastDate && days % 100 === 0 && days <= 300) {
              receipts.push({ userId, date, days, itemKey: "map_complete" });
            } else if (days <= 300 && days % 100 !== 0) {
              receipts.push({ userId, date, days, itemKey: "action" });
              if (date === lastDate && (days === 101 || days === 201)) {
                receipts.push({ userId, date, days, itemKey: "map_start" });
              }
            }
          }
          importedKeys.push(key);
        }
      }
    }
  } catch { /* Restricted storage still allows server receipts to load. */ }
  // Keep the current existing stage notice when its old local marker is absent.
  const stageKey = `${days > 200 ? "nehemiah_stage_shown" : "garden_shown"}_${days}`;
  if (isRewardPresentationStageDay(days) && !storageGet(stageKey)) {
    receipts.push({ userId, date: lastDate, days, itemKey: "stage" });
  }
  queueLocal(userId, receipts, false);
  try {
    await synchronizeLocal(supabase, userId);
    importedKeys.forEach(key => storageRemove(key));
  } catch { /* Source keys remain until import succeeds. */ }
}

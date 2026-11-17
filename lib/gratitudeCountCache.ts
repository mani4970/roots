export type GratitudeCountSnapshot = { days: number; checkedAt: number };

const FRESH_MS = 60_000;
const DISPLAY_MAX_AGE_MS = 7 * 24 * 60 * 60_000;
const MAX_OWNERS = 16;
const STORAGE_PREFIX = "roots_gratitude_count_v1_";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Slot = {
  snapshot: GratitudeCountSnapshot | null;
  needsRefresh: boolean;
  pending?: Promise<GratitudeCountSnapshot | null>;
};
const counts = new Map<string, Slot>();
const ownerKey = (userId: string) => UUID.test(userId) ? userId.toLowerCase() : null;
const copy = (value: GratitudeCountSnapshot | null) => value ? { ...value } : null;
const validDays = (days: unknown): days is number => typeof days === "number" && Number.isSafeInteger(days) && days >= 0;

function validTime(checkedAt: unknown): checkedAt is number {
  return typeof checkedAt === "number" && Number.isSafeInteger(checkedAt) && checkedAt >= 0
    && Date.now() >= checkedAt && Date.now() - checkedAt < DISPLAY_MAX_AGE_MS;
}

function removeStored(userId: string) {
  try { window.localStorage.removeItem(STORAGE_PREFIX + userId); } catch { /* Memory remains usable. */ }
}

function readStored(userId: string): GratitudeCountSnapshot | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + userId);
    if (!raw) return null;
    if (raw.length <= 256) {
      const value = JSON.parse(raw);
      if (value?.version === 1 && value.userId === userId && validDays(value.days) && validTime(value.checkedAt)) {
        return { days: value.days, checkedAt: value.checkedAt };
      }
    }
    removeStored(userId);
  } catch { /* Missing, malformed or blocked storage must not prevent display. */ }
  return null;
}

function store(userId: string, snapshot: GratitudeCountSnapshot) {
  try {
    // Display metadata only: gratitude text never enters this cache.
    window.localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify({ version: 1, userId, ...snapshot }));
  } catch { /* The in-memory count still survives Home navigation. */ }
}

function slotFor(userId: string): Slot {
  let slot = counts.get(userId);
  if (!slot) {
    if (counts.size >= MAX_OWNERS) {
      const oldest = counts.keys().next().value;
      if (oldest) counts.delete(oldest);
    }
    // After an app restart, show the last count immediately and verify it once
    // in the background. Only this running app's successful reads skip queries.
    slot = { snapshot: readStored(userId), needsRefresh: true };
    counts.set(userId, slot);
  }
  if (slot.snapshot && !validTime(slot.snapshot.checkedAt)) {
    slot.snapshot = null;
    slot.needsRefresh = true;
    removeStored(userId);
  }
  return slot;
}

/** A cached value is for display; null means unknown, not a confirmed zero. */
export function readCachedGratitudeCount(userId: string): GratitudeCountSnapshot | null {
  const key = ownerKey(userId);
  if (!key || typeof window === "undefined") return null;
  return copy(slotFor(key).snapshot);
}

/** Share in-flight reads; a failed refresh never erases a known display value. */
export function refreshCachedGratitudeCount(
  userId: string, read: () => Promise<number>, options?: { force?: boolean },
): Promise<GratitudeCountSnapshot | null> {
  const key = ownerKey(userId);
  if (!key) return Promise.reject(new Error("Invalid gratitude count owner"));
  if (typeof window === "undefined") {
    // No per-user data is retained in the server module between requests.
    return Promise.resolve().then(read).then(days => {
      if (!validDays(days)) throw new Error("Invalid gratitude count");
      return { days, checkedAt: Date.now() };
    });
  }
  const slot = slotFor(key);
  if (slot.pending) return slot.pending.then(copy);
  if (!options?.force && !slot.needsRefresh && slot.snapshot && Date.now() - slot.snapshot.checkedAt < FRESH_MS) {
    return Promise.resolve(copy(slot.snapshot));
  }
  const pending = Promise.resolve().then(read).then(days => {
    // Save/delete, logout, or eviction can replace this generation. A late
    // response must not revive it, even when the same account has signed in again.
    if (counts.get(key) !== slot) return null;
    if (!validDays(days)) throw new Error("Invalid gratitude count");
    slot.snapshot = { days, checkedAt: Date.now() };
    slot.needsRefresh = false;
    store(key, slot.snapshot);
    return copy(slot.snapshot);
  }, error => {
    if (counts.get(key) !== slot) return null;
    throw error;
  }).finally(() => {
    if (counts.get(key) === slot) slot.pending = undefined;
  });
  slot.pending = pending;
  return pending.then(copy);
}

/** Keep the displayed count, but ensure a post-mutation read starts anew. */
export function invalidateGratitudeCount(userId: string) {
  const key = ownerKey(userId);
  if (!key || typeof window === "undefined") return;
  const previous = slotFor(key);
  counts.set(key, { snapshot: previous.snapshot, needsRefresh: true });
}

/** Called on logout/account rejection; detached requests cannot restore it. */
export function clearGratitudeCount(userId: string) {
  const key = ownerKey(userId);
  if (!key || typeof window === "undefined") return;
  counts.delete(key);
  removeStored(key);
}

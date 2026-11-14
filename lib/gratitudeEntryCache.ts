import type { GratitudeEntry } from "@/lib/gratitude";

export const GRATITUDE_ENTRY_CACHE_TTL_MS = 60_000;
export type GratitudeEntrySnapshot = { entry: GratitudeEntry | null; fetchedAt: number };
type Slot = { snapshot?: GratitudeEntrySnapshot; pending?: Promise<GratitudeEntry | null> };
type Scope = { userId: string; ownerEpoch: object; mutations: Map<string, object>; slots: Map<string, Slot> };

// Activated by the mounted Home effect only; never persisted or enabled by SSR.
let scope: Scope | null = null;
const copyEntry = (entry: GratitudeEntry | null): GratitudeEntry | null => entry ? { ...entry, items: [...entry.items] } : null;
const fresh = (snapshot?: GratitudeEntrySnapshot) => !!snapshot
  && Date.now() >= snapshot.fetchedAt && Date.now() - snapshot.fetchedAt < GRATITUDE_ENTRY_CACHE_TTL_MS;

export function setGratitudeCacheOwner(userId: string | null) {
  if (scope?.userId === userId) return;
  scope = userId ? { userId, ownerEpoch: {}, mutations: new Map(), slots: new Map() } : null;
}

export function clearGratitudeEntryCache(userId: string) {
  if (scope?.userId === userId) scope = { ...scope, slots: new Map() };
}

export function forgetGratitudeCacheOwner(userId: string) {
  if (scope?.userId === userId) scope = null;
}

export function invalidateGratitudeEntryCache(userId: string, date: string) {
  if (scope?.userId === userId) scope.slots.delete(date);
}

/** Outer null means unknown; a snapshot containing entry:null means confirmed empty. */
export function readGratitudeEntryCache(userId: string, date: string): GratitudeEntrySnapshot | null {
  const snapshot = scope?.userId === userId ? scope.slots.get(date)?.snapshot : undefined;
  return fresh(snapshot) ? { entry: copyEntry(snapshot!.entry), fetchedAt: snapshot!.fetchedAt } : null;
}

/** The caller still performs its own session guard before consulting this cache. */
export async function loadGratitudeEntryCached(
  userId: string, date: string, read: () => Promise<GratitudeEntry | null>,
): Promise<GratitudeEntry | null> {
  const current = scope;
  if (!current || current.userId !== userId) return read();
  const cached = readGratitudeEntryCache(userId, date);
  if (cached) return cached.entry;
  let slot = current.slots.get(date);
  if (slot?.pending) return copyEntry(await slot.pending);
  slot ??= {};
  current.slots.set(date, slot);
  const ownSlot = slot;
  const isCurrent = () => scope === current && current.slots.get(date) === ownSlot;
  const readCurrent = () => {
    // A resume/retry may replace a read while its editor is still mounted.
    // Join the newer read instead of showing a stale error or stale contents.
    // Logging out/switching accounts gets a new ownerEpoch, even on A -> B -> A.
    if (scope?.ownerEpoch !== current.ownerEpoch) throw new Error("Gratitude owner changed");
    return loadGratitudeEntryCached(userId, date, read);
  };
  const pending = read().then(entry => {
    if (!isCurrent()) return readCurrent();
    ownSlot.snapshot = { entry: copyEntry(entry), fetchedAt: Date.now() };
    return copyEntry(entry);
  }, error => {
    if (!isCurrent()) return readCurrent();
    throw error;
  }).finally(() => {
    if (current.slots.get(date) === ownSlot) {
      ownSlot.pending = undefined;
      if (!ownSlot.snapshot) current.slots.delete(date);
    }
  });
  ownSlot.pending = pending;
  return copyEntry(await pending);
}

/** Invalidates before a mutation; only that same owner/date generation may publish it. */
export function beginGratitudeEntryMutation(userId: string, date: string) {
  const current = scope;
  const mutation = {};
  if (current?.userId === userId) {
    current.mutations.set(date, mutation);
    current.slots.set(date, {});
  }
  return (entry: GratitudeEntry | null) => {
    if (current?.userId !== userId || scope?.ownerEpoch !== current.ownerEpoch
      || current.mutations.get(date) !== mutation) return;
    // Resume can invalidate reads during a save. The latest successful write
    // still wins within that owner epoch, including over a resumed prefetch.
    scope.slots.set(date, { snapshot: { entry: copyEntry(entry), fetchedAt: Date.now() } });
  };
}

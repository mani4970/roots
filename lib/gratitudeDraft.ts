"use client";

import type { GratitudeEntry } from "@/lib/gratitude";

export type GratitudeDraft = {
  date: string;
  items: string[];
  base: GratitudeEntry | null;
  savedAt: number;
};

const PREFIX = "roots_gratitude_draft_v1_";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Only failed storage writes/removals stay in memory. A null entry prevents a
// failed removal from reviving an older persisted draft during this session.
const memory = new Map<string, GratitudeDraft | null>();

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validItems(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 50
    && value.every(item => typeof item === "string" && item.length <= 2000);
}

function keyFor(userId: string, date: string): string | null {
  return UUID.test(userId) && validDate(date) ? `${PREFIX}${userId.toLowerCase()}_${date}` : null;
}

function parseDraft(value: unknown, userId: string, date: string): GratitudeDraft | null {
  if (!value || typeof value !== "object") return null;
  const draft = value as Partial<GratitudeDraft>;
  if (draft.date !== date || !validDate(date) || !validItems(draft.items)
    || typeof draft.savedAt !== "number" || !Number.isFinite(draft.savedAt) || draft.savedAt <= 0) return null;
  let base: GratitudeEntry | null = null;
  if (draft.base !== null) {
    const entry = draft.base;
    if (!entry || typeof entry !== "object" || typeof entry.id !== "string" || !UUID.test(entry.id)
      || typeof entry.user_id !== "string" || entry.user_id.toLowerCase() !== userId.toLowerCase()
      || entry.entry_date !== date || !validItems(entry.items)
      || !Number.isSafeInteger(entry.revision) || entry.revision < 1
      || typeof entry.created_at !== "string" || !Number.isFinite(Date.parse(entry.created_at))
      || typeof entry.updated_at !== "string" || !Number.isFinite(Date.parse(entry.updated_at))) return null;
    base = {
      id: entry.id, user_id: entry.user_id, entry_date: entry.entry_date, items: [...entry.items],
      revision: entry.revision, created_at: entry.created_at, updated_at: entry.updated_at,
    };
  }
  return { date, items: [...draft.items], base, savedAt: draft.savedAt };
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage; } catch { return null; }
}

export function readGratitudeDraft(userId: string, date: string): GratitudeDraft | null {
  const key = keyFor(userId, date);
  if (!key) return null;
  if (memory.has(key)) return parseDraft(memory.get(key), userId, date);
  try {
    const raw = getStorage()?.getItem(key);
    if (!raw || raw.length > 1_500_000) return null;
    return parseDraft(JSON.parse(raw), userId, date);
  } catch { return null; }
}

export function writeGratitudeDraft(userId: string, draft: GratitudeDraft): boolean {
  const key = keyFor(userId, draft.date);
  const safe = parseDraft(draft, userId, draft.date);
  if (!key || !safe) return false;
  memory.set(key, safe);
  try {
    const storage = getStorage();
    if (!storage) return false;
    storage.setItem(key, JSON.stringify(safe));
    memory.delete(key);
    return true;
  } catch { return false; }
}

export function removeGratitudeDraft(userId: string, date: string, expected?: GratitudeDraft | null): boolean {
  const key = keyFor(userId, date);
  if (!key) return false;
  // A completed network request must not erase newer writing from another tab.
  // Compare the full snapshot, including its write timestamp and base revision.
  if (expected !== undefined) {
    const safeExpected = expected === null ? null : parseDraft(expected, userId, date);
    if (expected !== null && !safeExpected) return false;
    if (JSON.stringify(readGratitudeDraft(userId, date)) !== JSON.stringify(safeExpected)) return false;
  }
  memory.set(key, null);
  try {
    const storage = getStorage();
    if (!storage) return true;
    storage.removeItem(key);
    memory.delete(key);
  } catch { /* The tombstone keeps the discarded draft hidden this session. */ }
  return true;
}

export function listGratitudeDrafts(userId: string): GratitudeDraft[] {
  if (!UUID.test(userId)) return [];
  const prefix = `${PREFIX}${userId.toLowerCase()}_`;
  const keys = new Set<string>();
  try {
    const storage = getStorage();
    if (storage) {
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key?.startsWith(prefix)) keys.add(key);
      }
    }
  } catch { /* Any in-memory drafts remain available. */ }
  for (const key of memory.keys()) if (key.startsWith(prefix)) keys.add(key);
  return Array.from(keys).map(key => readGratitudeDraft(userId, key.slice(prefix.length)))
    .filter((draft): draft is GratitudeDraft => draft !== null)
    .sort((left, right) => right.date.localeCompare(left.date));
}

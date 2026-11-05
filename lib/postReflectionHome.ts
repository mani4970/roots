import { getLocalDateString } from "@/lib/date";

export type PostReflectionHomeReturn = {
  userId: string;
  date: string;
  qtRecordId: string;
};

type ReturnMarker = PostReflectionHomeReturn & { token: string; markedAt: number };

const STORAGE_KEY = "roots_post_reflection_home_once";
const MAX_AGE_MS = 2 * 60 * 1000;
let memoryMarker: ReturnMarker | null = null;
const consumedTokens = new Set<string>();

function isMarker(value: unknown): value is ReturnMarker {
  if (!value || typeof value !== "object") return false;
  const marker = value as Partial<ReturnMarker>;
  return typeof marker.userId === "string" && marker.userId.length > 0
    && typeof marker.qtRecordId === "string" && marker.qtRecordId.length > 0
    && typeof marker.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(marker.date)
    && typeof marker.token === "string" && marker.token.length > 0
    && typeof marker.markedAt === "number" && Number.isFinite(marker.markedAt);
}

/** Call only when leaving a successfully saved completion screen for Home. */
export function markPostReflectionHomeReturn(completion: PostReflectionHomeReturn): void {
  if (typeof window === "undefined" || !completion.userId || !completion.qtRecordId
    || completion.date !== getLocalDateString()) return;
  const markedAt = Date.now();
  memoryMarker = { ...completion, markedAt, token: `${markedAt}:${Math.random().toString(36).slice(2)}` };
  try { window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(memoryMarker)); }
  catch { /* The current tab can still hand off through memory. */ }
}

/** Display routing only. Home must first confirm the same account/date/record on the server. */
export function consumePostReflectionHomeReturn(
  userId: string,
  today: string,
  completedQtRecordId: string | null,
): boolean {
  if (typeof window === "undefined") return false;
  let marker: unknown = memoryMarker;
  if (!marker) {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      marker = raw ? JSON.parse(raw) : null;
    } catch { /* No marker means the ordinary Home flow. */ }
  }
  // Consume even mismatches. It must never suppress a later, ordinary Home visit.
  memoryMarker = null;
  try { window.sessionStorage.removeItem(STORAGE_KEY); }
  catch { /* The token below also prevents reuse when removal is unavailable. */ }
  if (!isMarker(marker) || consumedTokens.has(marker.token)) return false;
  consumedTokens.add(marker.token);
  const age = Date.now() - marker.markedAt;
  return age >= 0 && age <= MAX_AGE_MS && today === getLocalDateString()
    && marker.userId === userId && marker.date === today
    && marker.qtRecordId === completedQtRecordId;
}

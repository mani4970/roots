export const GIFT_HOME_INTENT_EVENT = "roots:gift-home-intent";
const STORAGE_KEY = "roots_gift_home_once";
const MAX_AGE_MS = 5 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type GiftHomeIntent = { giftId: string; recipientId: string; token: string };
type StoredIntent = GiftHomeIntent & { markedAt: number };
let memoryIntent: StoredIntent | null = null;
const consumedTokens = new Set<string>();

/** Notification links carry identity only. The gift RPC still verifies its owner. */
export function readGiftHomeLink(value: unknown): Pick<GiftHomeIntent, "giftId" | "recipientId"> | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return null;
  try {
    const url = new URL(value, "https://roots.invalid");
    const giftId = url.searchParams.get("giftId");
    const recipientId = url.searchParams.get("giftRecipient");
    return url.origin === "https://roots.invalid" && url.pathname === "/"
      && giftId && recipientId && UUID.test(giftId) && UUID.test(recipientId)
      ? { giftId, recipientId } : null;
  } catch { return null; }
}

/** Called only for an explicit gift push tap, including before Home mounts. */
export function markGiftHomeIntent(intent: Pick<GiftHomeIntent, "giftId" | "recipientId">): void {
  if (typeof window === "undefined" || !UUID.test(intent.giftId) || !UUID.test(intent.recipientId)) return;
  const markedAt = Date.now();
  memoryIntent = { ...intent, markedAt, token: `${markedAt}:${Math.random().toString(36).slice(2)}` };
  try { window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(memoryIntent)); } catch {}
  try { window.dispatchEvent(new CustomEvent(GIFT_HOME_INTENT_EVENT)); } catch {}
}

/** A different explicit notification destination supersedes a pending gift tap. */
export function clearGiftHomeIntent(): void {
  let value: unknown = memoryIntent;
  if (!value && typeof window !== "undefined") {
    try { value = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? "null"); } catch {}
  }
  if (value && typeof value === "object" && typeof (value as Partial<StoredIntent>).token === "string") {
    consumedTokens.add((value as StoredIntent).token);
  }
  memoryIntent = null;
  try { if (typeof window !== "undefined") window.sessionStorage.removeItem(STORAGE_KEY); } catch {}
}

/** Consume after Home confirms its current account. It never acknowledges a gift. */
export function consumeGiftHomeIntent(userId: string): GiftHomeIntent | null {
  if (typeof window === "undefined") return null;
  let value: unknown = memoryIntent;
  if (!value) {
    try { value = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? "null"); } catch {}
  }
  memoryIntent = null;
  try { window.sessionStorage.removeItem(STORAGE_KEY); } catch {}
  if (!value || typeof value !== "object") return null;
  const intent = value as Partial<StoredIntent>;
  if (typeof intent.token !== "string" || consumedTokens.has(intent.token)) return null;
  consumedTokens.add(intent.token);
  const age = Date.now() - Number(intent.markedAt);
  if (typeof intent.giftId !== "string" || !UUID.test(intent.giftId)
    || typeof intent.recipientId !== "string" || !UUID.test(intent.recipientId)
    || intent.recipientId !== userId || !Number.isFinite(age) || age < 0 || age > MAX_AGE_MS) return null;
  return { giftId: intent.giftId, recipientId: intent.recipientId, token: intent.token };
}

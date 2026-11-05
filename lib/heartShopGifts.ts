import { createClient } from "@/lib/supabase";
import { getHeartShopCatalogItem } from "@/lib/heartShopCatalog";
import { isHeartShopItemId } from "@/lib/heartShopItems";
import { getHeartShopText } from "@/lib/heartShopText";
import { getProfileCharacterItemText } from "@/lib/profileCharacterText";

export { getGiftText } from "@/lib/heartShopGiftText";

export type GiftRecipient = {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  canReceive: boolean;
};

export type PendingGift = {
  giftId: string;
  itemKey: string;
  senderName: string | null;
};

export function getGiftItem(itemKey: string, lang: string) {
  const item = isHeartShopItemId(itemKey) ? getHeartShopCatalogItem(itemKey) : null;
  if (!item) return null;
  const name = item.category === "map"
    ? getHeartShopText(lang).items[item.id].name
    : getProfileCharacterItemText(item.id, lang).name;
  return { name, catalogItem: item };
}

// randomUUID is missing in some older WebViews, including early iOS 15.
export function createGiftRequestId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
}

// Release the UI even when a stalled transport or session refresh ignores abort.
async function senderRpc(name: string, parameters: Record<string, string | number>) {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("Gift request timed out"));
    }, 15_000);
  });
  try {
    const query = createClient().rpc(name, parameters).abortSignal(controller.signal);
    return await Promise.race([query, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchGiftRecipients(itemKey: string): Promise<GiftRecipient[]> {
  const { data, error } = await senderRpc("get_heart_shop_gift_recipients", {
    p_item_key: itemKey,
  });
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error("Invalid gift recipient list");
  return data.map(row => {
    if (typeof row?.user_id !== "string" || typeof row.can_receive !== "boolean") {
      throw new Error("Invalid gift recipient");
    }
    return {
      userId: row.user_id,
      displayName: row.display_name || null,
      avatarUrl: row.avatar_url || null,
      canReceive: row.can_receive,
    };
  });
}

export async function sendGift(
  itemKey: string,
  recipientId: string,
  requestId: string,
  expectedPrice: number,
): Promise<{ sent: boolean; reason: string; balance: number | null }> {
  const { data, error } = await senderRpc("send_heart_shop_gift", {
    p_item_key: itemKey,
    p_recipient_id: recipientId,
    p_request_id: requestId,
    p_expected_price: expectedPrice,
  });
  if (error) throw error;
  // A missing response is an uncertain send; the caller can retry the same request ID.
  if (typeof data?.sent !== "boolean" || typeof data.reason !== "string") {
    throw new Error("Invalid gift send response");
  }
  if (data.sent) {
    // Presentation delivery is independent of the successful gift transaction.
    // A lost request is recovered from the committed gift by the minute cron.
    try {
      void fetch("/api/gift-notifications/dispatch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }), keepalive: true,
      }).catch(() => {});
    } catch { /* Notification setup cannot turn a successful gift into a failure. */ }
  }
  return {
    sent: data.sent,
    reason: data.reason,
    balance: typeof data.balance === "number" && Number.isSafeInteger(data.balance) ? data.balance : null,
  };
}

export async function fetchPendingGifts(): Promise<PendingGift[]> {
  const { data, error } = await createClient().rpc("get_pending_heart_shop_gifts");
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error("Invalid pending gift list");
  return data.map(row => {
    if (typeof row?.gift_id !== "string" || typeof row.item_key !== "string") {
      throw new Error("Invalid pending gift");
    }
    return { giftId: row.gift_id, itemKey: row.item_key, senderName: row.sender_name || null };
  });
}

/** Recipient-only lookup for a push target outside the ordinary Home batch. */
export async function fetchPendingGift(giftId: string): Promise<PendingGift | null> {
  const { data, error } = await createClient().rpc("get_pending_heart_shop_gift", { p_gift_id: giftId });
  if (error) throw error;
  if (!Array.isArray(data) || data.length > 1) throw new Error("Invalid pending gift");
  if (data.length === 0) return null;
  const row = data[0];
  if (row?.gift_id !== giftId || typeof row.item_key !== "string") throw new Error("Invalid pending gift");
  return { giftId: row.gift_id, itemKey: row.item_key, senderName: typeof row.sender_name === "string" ? row.sender_name : null };
}

export async function acknowledgeGift(giftId: string): Promise<boolean> {
  const { data, error } = await createClient().rpc("acknowledge_heart_shop_gift", { p_gift_id: giftId });
  if (error) throw error;
  return data === true;
}

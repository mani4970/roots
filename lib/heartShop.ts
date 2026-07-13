import type { HeartShopItemId } from "@/lib/heartShopText";

export type OwnedHeartShopItem = {
  itemId: HeartShopItemId;
  isEnabled: boolean;
  pricePaid: number;
  purchasedAt: string;
};

export type HeartShopPurchaseResult = {
  purchased: boolean;
  alreadyOwned: boolean;
  reason: string;
  itemId: HeartShopItemId | "";
  price: number;
  balance: number;
  needed: number;
  isEnabled: boolean;
};

export type HeartShopToggleResult = {
  updated: boolean;
  reason: string;
  itemId: HeartShopItemId | "";
  isEnabled: boolean;
};

const ITEM_IDS = new Set<HeartShopItemId>([
  "jjaekjjaek",
  "hindungi",
  "choko",
  "kkumdeuli",
  "bamtoli",
  "mongsili",
]);

function normalizeItemId(value: unknown): HeartShopItemId | "" {
  const next = String(value ?? "") as HeartShopItemId;
  return ITEM_IDS.has(next) ? next : "";
}

function toBoolean(value: unknown) {
  return value === true || value === "true";
}

function toNumber(value: unknown) {
  const next = Number(value ?? 0);
  return Number.isFinite(next) ? next : 0;
}

function toObject(value: unknown): Record<string, unknown> | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") return null;
  return row as Record<string, unknown>;
}

export async function loadOwnedHeartShopItems(supabase: any): Promise<OwnedHeartShopItem[]> {
  const { data, error } = await supabase
    .from("heart_shop_purchases")
    .select("item_key, price_paid, is_enabled, purchased_at")
    .order("purchased_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).flatMap((row: any) => {
    const itemId = normalizeItemId(row?.item_key);
    if (!itemId) return [];
    return [{
      itemId,
      isEnabled: toBoolean(row?.is_enabled),
      pricePaid: toNumber(row?.price_paid),
      purchasedAt: String(row?.purchased_at ?? ""),
    }];
  });
}

export async function purchaseHeartShopItem(
  supabase: any,
  itemId: HeartShopItemId,
): Promise<HeartShopPurchaseResult> {
  const { data, error } = await supabase.rpc("purchase_heart_shop_item", {
    p_item_key: itemId,
  });
  if (error) throw error;

  const row = toObject(data);
  if (!row) {
    return {
      purchased: false,
      alreadyOwned: false,
      reason: "invalid_response",
      itemId: "",
      price: 0,
      balance: 0,
      needed: 0,
      isEnabled: false,
    };
  }

  return {
    purchased: toBoolean(row.purchased),
    alreadyOwned: toBoolean(row.already_owned),
    reason: String(row.reason ?? ""),
    itemId: normalizeItemId(row.item_key),
    price: toNumber(row.price),
    balance: toNumber(row.balance),
    needed: toNumber(row.needed),
    isEnabled: toBoolean(row.is_enabled),
  };
}

export async function setHeartShopItemEnabled(
  supabase: any,
  itemId: HeartShopItemId,
  enabled: boolean,
): Promise<HeartShopToggleResult> {
  const { data, error } = await supabase.rpc("set_heart_shop_item_enabled", {
    p_item_key: itemId,
    p_enabled: enabled,
  });
  if (error) throw error;

  const row = toObject(data);
  return {
    updated: toBoolean(row?.updated),
    reason: String(row?.reason ?? ""),
    itemId: normalizeItemId(row?.item_key),
    isEnabled: toBoolean(row?.is_enabled),
  };
}

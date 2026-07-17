import type { RootsAvatarType } from "@/lib/avatar";

export const HEART_SHOP_MAP_ITEM_IDS = [
  "jjaekjjaek",
  "hindungi",
  "choko",
  "kkumdeuli",
  "bamtoli",
  "mongsili",
] as const;

export type HeartShopMapItemId = (typeof HEART_SHOP_MAP_ITEM_IDS)[number];

export type HeartShopCharacterSlot =
  | "bottom"
  | "shoes"
  | "top"
  | "bag"
  | "eyewear"
  | "hair_accessory"
  | "headwear";

export const HEART_SHOP_CHARACTER_ITEM_IDS = [
  "rootsman_bottom_01",
  "rootsman_bottom_02",
  "rootsman_bottom_03",
  "rootsman_bottom_04",
  "rootsman_bottom_05",
  "rootsman_bottom_06",
  "rootsman_shoes_01",
  "rootsman_shoes_02",
  "rootsman_shoes_03",
  "rootsman_shoes_04",
  "rootsman_top_01",
  "rootsman_top_02",
  "rootsman_top_03",
  "rootsman_top_04",
  "rootsman_top_05",
  "rootsman_top_06",
  "rootsman_top_07",
  "rootsman_top_08",
  "rootsman_top_09",
  "rootsman_top_10",
  "rootsman_eyewear_01",
  "rootsman_eyewear_02",
  "rootsman_eyewear_03",
  "rootsman_eyewear_04",
  "rootsman_eyewear_05",
  "rootsman_eyewear_06",
  "rootsman_headwear_01",
  "rootsman_headwear_02",
  "rootsman_headwear_03",
  "rootsman_headwear_04",
  "rootswoman_bottom_01",
  "rootswoman_bottom_02",
  "rootswoman_bottom_03",
  "rootswoman_bottom_04",
  "rootswoman_bottom_05",
  "rootswoman_bottom_06",
  "rootswoman_shoes_01",
  "rootswoman_shoes_02",
  "rootswoman_shoes_03",
  "rootswoman_shoes_04",
  "rootswoman_top_01",
  "rootswoman_top_02",
  "rootswoman_top_03",
  "rootswoman_top_04",
  "rootswoman_top_05",
  "rootswoman_top_06",
  "rootswoman_eyewear_01",
  "rootswoman_eyewear_02",
  "rootswoman_eyewear_03",
  "rootswoman_eyewear_04",
  "rootswoman_eyewear_05",
  "rootswoman_eyewear_06",
  "rootswoman_headwear_01",
  "rootswoman_headwear_02",
  "rootswoman_headwear_03",
  "rootswoman_headwear_04",
  "rootswoman_hair_accessory_01",
  "rootswoman_hair_accessory_02",
  "rootswoman_hair_accessory_03",
  "rootswoman_hair_accessory_04",
  "rootswoman_hair_accessory_05",
  "rootswoman_hair_accessory_06",
  "rootswoman_bag_01",
  "rootswoman_bag_02",
  "rootswoman_bag_03",
  "rootswoman_bag_04",
] as const;

export type HeartShopCharacterItemId = (typeof HEART_SHOP_CHARACTER_ITEM_IDS)[number];
export type HeartShopItemId = HeartShopMapItemId | HeartShopCharacterItemId;

export const HEART_SHOP_ITEM_IDS = [
  ...HEART_SHOP_MAP_ITEM_IDS,
  ...HEART_SHOP_CHARACTER_ITEM_IDS,
] as const;

const ITEM_ID_SET = new Set<string>(HEART_SHOP_ITEM_IDS);
const MAP_ITEM_ID_SET = new Set<string>(HEART_SHOP_MAP_ITEM_IDS);
const CHARACTER_ITEM_ID_SET = new Set<string>(HEART_SHOP_CHARACTER_ITEM_IDS);

export function isHeartShopItemId(value: unknown): value is HeartShopItemId {
  return ITEM_ID_SET.has(String(value ?? ""));
}

export function isHeartShopMapItemId(value: unknown): value is HeartShopMapItemId {
  return MAP_ITEM_ID_SET.has(String(value ?? ""));
}

export function isHeartShopCharacterItemId(value: unknown): value is HeartShopCharacterItemId {
  return CHARACTER_ITEM_ID_SET.has(String(value ?? ""));
}

export function getCharacterItemAvatarType(itemId: HeartShopCharacterItemId): RootsAvatarType {
  return itemId.startsWith("rootswoman_") ? "rootswoman" : "rootsman";
}

export function getCharacterItemSlot(itemId: HeartShopCharacterItemId): HeartShopCharacterSlot {
  if (itemId.includes("_bottom_")) return "bottom";
  if (itemId.includes("_shoes_")) return "shoes";
  if (itemId.includes("_bag_")) return "bag";
  if (itemId.includes("_eyewear_")) return "eyewear";
  if (itemId.includes("_hair_accessory_")) return "hair_accessory";
  if (itemId.includes("_headwear_")) return "headwear";
  return "top";
}

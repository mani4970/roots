import type { RootsAvatarType } from "@/lib/avatar";

export const HEART_SHOP_PEACE_ARK_STATIC_ITEM_IDS = [
  "ark_supplies",
  "ark_workbench",
  "ark_lantern",
] as const;

export type HeartShopPeaceArkStaticItemId = (typeof HEART_SHOP_PEACE_ARK_STATIC_ITEM_IDS)[number];

export const HEART_SHOP_MAP_ITEM_IDS = [
  "jjaekjjaek",
  "hindungi",
  "choko",
  "kkumdeuli",
  "bamtoli",
  "mongsili",
  "nabi",
  "kkangchongi",
  "salgeumi",
  ...HEART_SHOP_PEACE_ARK_STATIC_ITEM_IDS,
] as const;

export type HeartShopMapItemId = (typeof HEART_SHOP_MAP_ITEM_IDS)[number];

export type HeartShopCharacterSlot =
  | "background"
  | "pet"
  | "bottom"
  | "shoes"
  | "top"
  | "bag"
  | "eyewear"
  | "hair_accessory"
  | "headwear";

export const HEART_SHOP_CHARACTER_ITEM_IDS = [
  "shared_background_01",
  "shared_background_02",
  "shared_background_03",
  "shared_background_04",
  "shared_background_05",
  "shared_background_06",
  "shared_background_07",
  "shared_background_08",
  "shared_background_09",
  "shared_background_10",
  "shared_background_11",
  "shared_background_12",
  "shared_background_13",
  "shared_background_14",
  "shared_background_15",
  "shared_background_16",
  "shared_background_17",
  "shared_background_18",
  "shared_background_19",
  "shared_background_20",
  "shared_pet_01",
  "shared_pet_02",
  "shared_pet_03",
  "shared_pet_04",
  "shared_pet_05",
  "shared_pet_06",
  "shared_pet_07",
  "rootsman_bottom_01",
  "rootsman_bottom_02",
  "rootsman_bottom_03",
  "rootsman_bottom_04",
  "rootsman_bottom_05",
  "rootsman_bottom_06",
  "rootsman_bottom_07",
  "rootsman_bottom_08",
  "rootsman_bottom_09",
  "rootsman_bottom_10",
  "rootsman_bottom_11",
  "rootsman_bottom_12",
  "rootsman_bottom_13",
  "rootsman_bottom_14",
  "rootsman_shoes_01",
  "rootsman_shoes_02",
  "rootsman_shoes_03",
  "rootsman_shoes_04",
  "rootsman_shoes_05",
  "rootsman_shoes_06",
  "rootsman_shoes_07",
  "rootsman_shoes_08",
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
  "rootsman_top_11",
  "rootsman_top_12",
  "rootsman_top_13",
  "rootsman_top_14",
  "rootsman_top_15",
  "rootsman_top_16",
  "rootsman_top_17",
  "rootsman_top_18",
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
  "rootswoman_bottom_07",
  "rootswoman_bottom_08",
  "rootswoman_bottom_09",
  "rootswoman_bottom_10",
  "rootswoman_bottom_11",
  "rootswoman_bottom_12",
  "rootswoman_bottom_13",
  "rootswoman_bottom_14",
  "rootswoman_bottom_15",
  "rootswoman_bottom_16",
  "rootswoman_bottom_17",
  "rootswoman_bottom_18",
  "rootswoman_shoes_01",
  "rootswoman_shoes_02",
  "rootswoman_shoes_03",
  "rootswoman_shoes_04",
  "rootswoman_shoes_05",
  "rootswoman_shoes_06",
  "rootswoman_shoes_07",
  "rootswoman_shoes_08",
  "rootswoman_top_01",
  "rootswoman_top_02",
  "rootswoman_top_03",
  "rootswoman_top_04",
  "rootswoman_top_05",
  "rootswoman_top_06",
  "rootswoman_top_07",
  "rootswoman_top_08",
  "rootswoman_top_09",
  "rootswoman_top_10",
  "rootswoman_top_11",
  "rootswoman_top_12",
  "rootswoman_top_13",
  "rootswoman_top_14",
  "rootswoman_top_15",
  "rootswoman_top_16",
  "rootswoman_top_17",
  "rootswoman_top_18",
  "rootswoman_top_19",
  "rootswoman_top_20",
  "rootswoman_top_21",
  "rootswoman_top_22",
  "rootswoman_top_23",
  "rootswoman_top_24",
  "rootswoman_top_25",
  "rootswoman_top_26",
  "rootswoman_top_27",
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
export type HeartShopCharacterAvatarType = RootsAvatarType | "shared";

export const HEART_SHOP_ROOTSWOMAN_DRESS_ITEM_IDS = [
  "rootswoman_top_11",
  "rootswoman_top_12",
  "rootswoman_top_23",
  "rootswoman_top_25",
] as const satisfies readonly HeartShopCharacterItemId[];

export type HeartShopRootsWomanDressItemId = (typeof HEART_SHOP_ROOTSWOMAN_DRESS_ITEM_IDS)[number];
export type HeartShopItemId = HeartShopMapItemId | HeartShopCharacterItemId;

export const HEART_SHOP_ITEM_IDS = [
  ...HEART_SHOP_MAP_ITEM_IDS,
  ...HEART_SHOP_CHARACTER_ITEM_IDS,
] as const;

const ITEM_ID_SET = new Set<string>(HEART_SHOP_ITEM_IDS);
const MAP_ITEM_ID_SET = new Set<string>(HEART_SHOP_MAP_ITEM_IDS);
const PEACE_ARK_STATIC_ITEM_ID_SET = new Set<string>(HEART_SHOP_PEACE_ARK_STATIC_ITEM_IDS);
const CHARACTER_ITEM_ID_SET = new Set<string>(HEART_SHOP_CHARACTER_ITEM_IDS);
const ROOTSWOMAN_DRESS_ITEM_ID_SET = new Set<string>(HEART_SHOP_ROOTSWOMAN_DRESS_ITEM_IDS);

export function isHeartShopItemId(value: unknown): value is HeartShopItemId {
  return ITEM_ID_SET.has(String(value ?? ""));
}

export function isHeartShopMapItemId(value: unknown): value is HeartShopMapItemId {
  return MAP_ITEM_ID_SET.has(String(value ?? ""));
}

export function isHeartShopPeaceArkStaticItemId(value: unknown): value is HeartShopPeaceArkStaticItemId {
  return PEACE_ARK_STATIC_ITEM_ID_SET.has(String(value ?? ""));
}

export function isHeartShopCharacterItemId(value: unknown): value is HeartShopCharacterItemId {
  return CHARACTER_ITEM_ID_SET.has(String(value ?? ""));
}

export function isHeartShopRootsWomanDressItemId(
  itemId: HeartShopCharacterItemId,
): itemId is HeartShopRootsWomanDressItemId {
  return ROOTSWOMAN_DRESS_ITEM_ID_SET.has(itemId);
}

export function getCharacterItemAvatarType(itemId: HeartShopCharacterItemId): HeartShopCharacterAvatarType {
  if (itemId.startsWith("shared_")) return "shared";
  return itemId.startsWith("rootswoman_") ? "rootswoman" : "rootsman";
}

export function getCharacterItemSlot(itemId: HeartShopCharacterItemId): HeartShopCharacterSlot {
  if (itemId.includes("_background_")) return "background";
  if (itemId.includes("_pet_")) return "pet";
  if (itemId.includes("_bottom_")) return "bottom";
  if (itemId.includes("_shoes_")) return "shoes";
  if (itemId.includes("_bag_")) return "bag";
  if (itemId.includes("_eyewear_")) return "eyewear";
  if (itemId.includes("_hair_accessory_")) return "hair_accessory";
  if (itemId.includes("_headwear_")) return "headwear";
  return "top";
}

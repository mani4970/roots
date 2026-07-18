import type { RootsAvatarType } from "@/lib/avatar";
import type { ProfileCharacterLayer } from "@/lib/profileCharacter";
import type { RewardMapKind } from "@/lib/rewardMaps";
import {
  HEART_SHOP_CHARACTER_ITEM_IDS,
  getCharacterItemAvatarType,
  type HeartShopCharacterItemId,
  type HeartShopCharacterAvatarType,
  type HeartShopCharacterSlot,
  type HeartShopItemId,
  type HeartShopMapItemId,
} from "@/lib/heartShopItems";

type HeartShopCatalogBase = {
  id: HeartShopItemId;
  price: number;
};

export type HeartShopMapCatalogItem = HeartShopCatalogBase & {
  id: HeartShopMapItemId;
  category: "map";
  previewPath: string;
  sourceSpriteSheetPath: string;
  frameCount: number;
  sheetWidth: number;
  sheetHeight: number;
  intervalMs: number;
  mapKinds: readonly RewardMapKind[];
};

export type HeartShopCharacterCatalogItem = HeartShopCatalogBase & {
  id: HeartShopCharacterItemId;
  category: "character";
  avatarType: HeartShopCharacterAvatarType;
  slot: HeartShopCharacterSlot;
  layerPath: string;
  zIndex: number;
  sortOrder: number;
};

export type HeartShopCatalogItem = HeartShopMapCatalogItem | HeartShopCharacterCatalogItem;

const GARDEN_AND_ARK = ["garden", "peaceArk"] as const satisfies readonly RewardMapKind[];

export const HEART_SHOP_MAP_CATALOG: readonly HeartShopMapCatalogItem[] = [
  {
    id: "jjaekjjaek",
    category: "map",
    price: 40,
    previewPath: "/images/heart-shop/previews/jjaekjjaek.webp",
    sourceSpriteSheetPath: "/images/heart-shop/source-sprites/jjaekjjaek.png",
    frameCount: 4,
    sheetWidth: 2048,
    sheetHeight: 512,
    intervalMs: 170,
    mapKinds: GARDEN_AND_ARK,
  },
  {
    id: "hindungi",
    category: "map",
    price: 60,
    previewPath: "/images/heart-shop/previews/hindungi.webp",
    sourceSpriteSheetPath: "/images/heart-shop/source-sprites/hindungi.png",
    frameCount: 4,
    sheetWidth: 2048,
    sheetHeight: 682,
    intervalMs: 390,
    mapKinds: GARDEN_AND_ARK,
  },
  {
    id: "choko",
    category: "map",
    price: 60,
    previewPath: "/images/heart-shop/previews/choko.webp",
    sourceSpriteSheetPath: "/images/heart-shop/source-sprites/choko.png",
    frameCount: 4,
    sheetWidth: 2048,
    sheetHeight: 512,
    intervalMs: 380,
    mapKinds: GARDEN_AND_ARK,
  },
  {
    id: "kkumdeuli",
    category: "map",
    price: 25,
    previewPath: "/images/heart-shop/previews/kkumdeuli.webp",
    sourceSpriteSheetPath: "/images/heart-shop/source-sprites/kkumdeuli.png",
    frameCount: 4,
    sheetWidth: 2048,
    sheetHeight: 512,
    intervalMs: 360,
    mapKinds: GARDEN_AND_ARK,
  },
  {
    id: "bamtoli",
    category: "map",
    price: 60,
    previewPath: "/images/heart-shop/previews/bamtoli.webp",
    sourceSpriteSheetPath: "/images/heart-shop/source-sprites/bamtoli.png",
    frameCount: 6,
    sheetWidth: 2048,
    sheetHeight: 682,
    intervalMs: 520,
    mapKinds: GARDEN_AND_ARK,
  },
  {
    id: "mongsili",
    category: "map",
    price: 60,
    previewPath: "/images/heart-shop/previews/mongsili.webp",
    sourceSpriteSheetPath: "/images/heart-shop/source-sprites/mongsili.png",
    frameCount: 6,
    sheetWidth: 2048,
    sheetHeight: 682,
    intervalMs: 540,
    mapKinds: GARDEN_AND_ARK,
  },
] as const;

const CHARACTER_SLOT_CONFIG: Record<HeartShopCharacterSlot, {
  price: number;
  directory: string;
  filePrefix: string;
  zIndex: number;
  sortOffset: number;
}> = {
  background: { price: 0, directory: "backgrounds", filePrefix: "background", zIndex: -10, sortOffset: 0 },
  bottom: { price: 30, directory: "bottoms", filePrefix: "bottom", zIndex: 10, sortOffset: 0 },
  shoes: { price: 30, directory: "shoes", filePrefix: "shoes", zIndex: 20, sortOffset: 100 },
  top: { price: 30, directory: "tops", filePrefix: "top", zIndex: 30, sortOffset: 200 },
  bag: { price: 30, directory: "bags", filePrefix: "bag", zIndex: 35, sortOffset: 500 },
  eyewear: { price: 40, directory: "eyewear", filePrefix: "eyewear", zIndex: 40, sortOffset: 300 },
  hair_accessory: { price: 5, directory: "hair-accessories", filePrefix: "hair-accessory", zIndex: 45, sortOffset: 600 },
  headwear: { price: 10, directory: "headwear", filePrefix: "headwear", zIndex: 50, sortOffset: 400 },
};

export const HEART_SHOP_PROFILE_BACKGROUND_ASSET_VERSION = "20260718_v2";

function getCharacterSlot(itemId: HeartShopCharacterItemId): HeartShopCharacterSlot {
  if (itemId.includes("_background_")) return "background";
  if (itemId.includes("_bottom_")) return "bottom";
  if (itemId.includes("_shoes_")) return "shoes";
  if (itemId.includes("_bag_")) return "bag";
  if (itemId.includes("_eyewear_")) return "eyewear";
  if (itemId.includes("_hair_accessory_")) return "hair_accessory";
  if (itemId.includes("_headwear_")) return "headwear";
  return "top";
}

function createCharacterCatalogItem(itemId: HeartShopCharacterItemId): HeartShopCharacterCatalogItem {
  const avatarType = getCharacterItemAvatarType(itemId);
  const slot = getCharacterSlot(itemId);
  const config = CHARACTER_SLOT_CONFIG[slot];
  const itemNumber = Number(itemId.slice(-2));
  const avatarSortOffset = avatarType === "shared" ? 0 : avatarType === "rootswoman" ? 2000 : 1000;
  const isRootsmanSummerTop = avatarType === "rootsman" && slot === "top" && itemNumber >= 7 && itemNumber <= 10;
  const sharedDirectory = slot === "background" ? "profile-backgrounds" : config.directory;
  const sharedLayerPath = `/images/heart-shop/character/shared/${sharedDirectory}/${config.filePrefix}-${String(itemNumber).padStart(2, "0")}.png`;
  const layerPath = avatarType === "shared"
    ? slot === "background"
      ? `${sharedLayerPath}?v=${HEART_SHOP_PROFILE_BACKGROUND_ASSET_VERSION}`
      : sharedLayerPath
    : `/images/heart-shop/character/${avatarType}/${config.directory}/${config.filePrefix}-${String(itemNumber).padStart(2, "0")}.png`;

  return {
    id: itemId,
    category: "character",
    avatarType,
    slot,
    price: config.price,
    layerPath,
    zIndex: config.zIndex,
    sortOrder: isRootsmanSummerTop
      ? avatarSortOffset + config.sortOffset - 10 + (itemNumber - 7)
      : avatarSortOffset + config.sortOffset + itemNumber,
  };
}

export const HEART_SHOP_CHARACTER_CATALOG: readonly HeartShopCharacterCatalogItem[] =
  HEART_SHOP_CHARACTER_ITEM_IDS.map(createCharacterCatalogItem);

export const HEART_SHOP_CATALOG: readonly HeartShopCatalogItem[] = [
  ...HEART_SHOP_MAP_CATALOG,
  ...HEART_SHOP_CHARACTER_CATALOG,
];

export function getHeartShopCatalogItem(itemId: HeartShopItemId | null): HeartShopCatalogItem | null {
  if (!itemId) return null;
  return HEART_SHOP_CATALOG.find(item => item.id === itemId) ?? null;
}

export function isHeartShopMapCatalogItem(item: HeartShopCatalogItem): item is HeartShopMapCatalogItem {
  return item.category === "map";
}

export function isHeartShopCharacterCatalogItem(item: HeartShopCatalogItem): item is HeartShopCharacterCatalogItem {
  return item.category === "character";
}

export function isHeartShopItemAvailableOnMap(itemId: HeartShopMapItemId, mapKind: RewardMapKind) {
  const item = HEART_SHOP_MAP_CATALOG.find(candidate => candidate.id === itemId);
  return !!item?.mapKinds.includes(mapKind);
}

export function getProfileCharacterLayersForItemIds(
  itemIds: readonly HeartShopItemId[],
  avatarType: RootsAvatarType,
): ProfileCharacterLayer[] {
  const enabledIds = new Set(itemIds);
  return HEART_SHOP_CHARACTER_CATALOG
    .filter(item => (item.avatarType === "shared" || item.avatarType === avatarType) && enabledIds.has(item.id))
    .map(item => ({
      id: item.id,
      src: item.layerPath,
      slot: item.slot,
      zIndex: item.zIndex,
      compatibleAvatarTypes: item.avatarType === "shared"
        ? (["rootsman", "rootswoman"] as const)
        : [item.avatarType],
    }));
}

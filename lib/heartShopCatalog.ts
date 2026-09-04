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
  isNew?: boolean;
  newPriority?: number;
  isBest?: boolean;
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
  sortOrder: number;
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

const GENERAL_REWARD_MAPS = ["garden", "peaceArk", "nehemiahWall"] as const satisfies readonly RewardMapKind[];

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
    sortOrder: 10,
    mapKinds: GENERAL_REWARD_MAPS,
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
    sortOrder: 20,
    mapKinds: GENERAL_REWARD_MAPS,
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
    sortOrder: 30,
    mapKinds: GENERAL_REWARD_MAPS,
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
    sortOrder: 40,
    mapKinds: GENERAL_REWARD_MAPS,
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
    sortOrder: 50,
    mapKinds: GENERAL_REWARD_MAPS,
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
    sortOrder: 60,
    mapKinds: GENERAL_REWARD_MAPS,
  },
  {
    id: "nabi",
    category: "map",
    price: 40,
    previewPath: "/images/heart-shop/previews/nabi.webp",
    sourceSpriteSheetPath: "/images/heart-shop/source-sprites/nabi.png",
    frameCount: 6,
    sheetWidth: 1536,
    sheetHeight: 264,
    intervalMs: 180,
    sortOrder: 70,
    mapKinds: GENERAL_REWARD_MAPS,
  },
  {
    id: "kkangchongi",
    category: "map",
    price: 60,
    previewPath: "/images/heart-shop/previews/kkangchongi.webp",
    sourceSpriteSheetPath: "/images/heart-shop/source-sprites/kkangchongi.png",
    frameCount: 8,
    sheetWidth: 1664,
    sheetHeight: 200,
    intervalMs: 155,
    sortOrder: 80,
    mapKinds: GENERAL_REWARD_MAPS,
  },
  {
    id: "salgeumi",
    category: "map",
    price: 25,
    previewPath: "/images/heart-shop/previews/salgeumi.webp",
    sourceSpriteSheetPath: "/images/heart-shop/source-sprites/salgeumi.png",
    frameCount: 6,
    sheetWidth: 1728,
    sheetHeight: 160,
    intervalMs: 620,
    sortOrder: 90,
    mapKinds: GENERAL_REWARD_MAPS,
  },
  {
    id: "ark_supplies",
    category: "map",
    price: 40,
    previewPath: "/images/reward-maps/peace-ark/static-items/ark-supplies.webp",
    sourceSpriteSheetPath: "/images/reward-maps/peace-ark/static-items/ark-supplies.webp",
    frameCount: 1,
    sheetWidth: 448,
    sheetHeight: 375,
    intervalMs: 1000,
    sortOrder: 1,
    mapKinds: ["peaceArk"],
  },
  {
    id: "ark_workbench",
    category: "map",
    price: 40,
    previewPath: "/images/reward-maps/peace-ark/static-items/ark-workbench.webp",
    sourceSpriteSheetPath: "/images/reward-maps/peace-ark/static-items/ark-workbench.webp",
    frameCount: 1,
    sheetWidth: 448,
    sheetHeight: 358,
    intervalMs: 1000,
    sortOrder: 2,
    mapKinds: ["peaceArk"],
  },
  {
    id: "ark_lantern",
    category: "map",
    price: 40,
    previewPath: "/images/reward-maps/peace-ark/static-items/ark-lantern.webp",
    sourceSpriteSheetPath: "/images/reward-maps/peace-ark/static-items/ark-lantern.webp",
    frameCount: 1,
    sheetWidth: 340,
    sheetHeight: 433,
    intervalMs: 1000,
    sortOrder: 3,
    mapKinds: ["peaceArk"],
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
  pet: { price: 150, directory: "pets", filePrefix: "pet", zIndex: 25, sortOffset: 800 },
  bottom: { price: 30, directory: "bottoms", filePrefix: "bottom", zIndex: 10, sortOffset: 0 },
  shoes: { price: 30, directory: "shoes", filePrefix: "shoes", zIndex: 5, sortOffset: 100 },
  top: { price: 30, directory: "tops", filePrefix: "top", zIndex: 30, sortOffset: 200 },
  bag: { price: 30, directory: "bags", filePrefix: "bag", zIndex: 35, sortOffset: 500 },
  eyewear: { price: 40, directory: "eyewear", filePrefix: "eyewear", zIndex: 40, sortOffset: 300 },
  hair_accessory: { price: 5, directory: "hair-accessories", filePrefix: "hair-accessory", zIndex: 45, sortOffset: 600 },
  headwear: { price: 10, directory: "headwear", filePrefix: "headwear", zIndex: 50, sortOffset: 400 },
};

export const HEART_SHOP_PROFILE_BACKGROUND_ASSET_VERSION = "20260718_v2";
export const HEART_SHOP_TRAVEL_BACKGROUND_ASSET_VERSION = "20260726_travel_v1";
export const HEART_SHOP_LATEST_CLOTHING_ASSET_VERSION = "20260825_v4";
export const HEART_SHOP_ROOTSWOMAN_FW_TOP_ASSET_VERSION = "20260904_fw_v1";
export const HEART_SHOP_ROOTSWOMAN_FW_SHOES_ASSET_VERSION = "20260904_fw_v1";
export const HEART_SHOP_ROOTSMAN_FW_BOTTOM_ASSET_VERSION = "20260904_fw_v1";
export const HEART_SHOP_ROOTSMAN_FW_TOP_ASSET_VERSION = "20260904_fw_v1";
export const HEART_SHOP_LATEST_PROFILE_ASSET_VERSION = "20260822_v1";
export const HEART_SHOP_BUSAN_BACKGROUND_ASSET_VERSION = "20260828_busan_v1";
export const HEART_SHOP_NEW_TRAVEL_BACKGROUND_ASSET_VERSION = "20260904_travel_v1";

// Every current Love Shop character asset has a lossless WebP counterpart.
// Legacy PNG files remain deployed temporarily for older app tabs and caches.
const HEART_SHOP_CHARACTER_ASSET_EXTENSION = "webp";

function getCharacterSlot(itemId: HeartShopCharacterItemId): HeartShopCharacterSlot {
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

function createCharacterCatalogItem(itemId: HeartShopCharacterItemId): HeartShopCharacterCatalogItem {
  const avatarType = getCharacterItemAvatarType(itemId);
  const slot = getCharacterSlot(itemId);
  const config = CHARACTER_SLOT_CONFIG[slot];
  const itemNumber = Number(itemId.slice(-2));
  const avatarSortOffset = avatarType === "shared" ? 0 : avatarType === "rootswoman" ? 2000 : 1000;
  const isRootsmanSummerTop = avatarType === "rootsman" && slot === "top" && itemNumber >= 7 && itemNumber <= 10;
  const isNewRootsmanClothing = avatarType === "rootsman"
    && (slot === "top" || slot === "bottom")
    && itemNumber >= 11
    && itemNumber <= 14;
  const isExistingNewRootsWomanTop = avatarType === "rootswoman" && slot === "top" && itemNumber >= 11 && itemNumber <= 14;
  const isLatestRootsWomanTop = avatarType === "rootswoman" && slot === "top" && itemNumber >= 15 && itemNumber <= 18;
  const isNewestRootsmanTop = avatarType === "rootsman" && slot === "top" && itemNumber >= 15 && itemNumber <= 18;
  const isNewestRootswomanTop = avatarType === "rootswoman" && slot === "top" && itemNumber >= 19 && itemNumber <= 22;
  const isNewestRootswomanFwTop = avatarType === "rootswoman" && slot === "top" && itemNumber >= 23 && itemNumber <= 27;
  const isNewestRootswomanFwShoes = avatarType === "rootswoman" && slot === "shoes" && itemNumber >= 9 && itemNumber <= 12;
  const isNewestRootsmanBottom = avatarType === "rootsman" && slot === "bottom" && itemNumber >= 15 && itemNumber <= 18;
  const isNewestRootsmanFwTop = avatarType === "rootsman" && slot === "top" && itemNumber >= 19 && itemNumber <= 22;
  const isNewestTop = isNewestRootsmanTop || isNewestRootswomanTop;
  const isLatestRootsWomanBottom = avatarType === "rootswoman" && slot === "bottom" && itemNumber >= 11 && itemNumber <= 14;
  const isNewestRootsWomanBottom = avatarType === "rootswoman" && slot === "bottom" && itemNumber >= 15 && itemNumber <= 18;
  const isRootsWomanDress = isExistingNewRootsWomanTop && itemNumber <= 12;
  const isNewestRootsWomanDress = isNewestRootswomanFwTop && (itemNumber === 23 || itemNumber === 25);
  const isRootswomanFwBoot = isNewestRootswomanFwShoes && (itemNumber === 9 || itemNumber === 10);
  const isTravelBackground = avatarType === "shared" && slot === "background" && itemNumber >= 11 && itemNumber <= 14;
  const isLatestProfileBackground = avatarType === "shared" && slot === "background" && itemNumber >= 15 && itemNumber <= 20;
  const isNewestTravelBackground = avatarType === "shared" && slot === "background" && itemNumber >= 21 && itemNumber <= 24;
  const isLatestPet = avatarType === "shared" && slot === "pet" && itemNumber >= 5 && itemNumber <= 7;
  const isLatestClothingAsset = isNewRootsmanClothing || isLatestRootsWomanTop || isLatestRootsWomanBottom || isNewestTop || isNewestRootswomanFwTop || isNewestRootsWomanBottom || isNewestRootswomanFwShoes || isNewestRootsmanBottom || isNewestRootsmanFwTop;
  const isNew = isLatestProfileBackground || isNewestTravelBackground || isLatestPet || isNewestTop || isNewestRootswomanFwTop || isNewestRootsWomanBottom || isNewestRootswomanFwShoes || isNewestRootsmanBottom || isNewestRootsmanFwTop;
  const latestBackgroundPriority = itemId === "shared_background_15"
    ? 1400
    : itemId === "shared_background_20"
      ? 1300
      : itemId === "shared_background_17"
        ? 1200
        : itemId === "shared_background_18"
          ? 1150
          : itemId === "shared_background_19"
            ? 1140
            : itemId === "shared_background_16"
              ? 1130
              : 0;
  const newPriority = itemId === "shared_background_15"
    ? 10000
    : isNewestTravelBackground
      ? 9000 - itemNumber
      : isNewestRootsmanFwTop
        ? 6000 - itemNumber
      : isNewestRootsmanBottom
        ? 5000 - itemNumber
      : isNewestRootswomanFwShoes
        ? 4000 - itemNumber
        : isNewestRootswomanFwTop
          ? 3000 - itemNumber
          : isNewestRootsWomanBottom
            ? 2100 - itemNumber
            : isNewestTop
              ? 2000 - itemNumber
              : isLatestProfileBackground
                ? latestBackgroundPriority
                : isLatestPet
                  ? 1000
                  : 0;
  const sharedDirectory = slot === "background" ? "profile-backgrounds" : config.directory;
  const assetExtension = HEART_SHOP_CHARACTER_ASSET_EXTENSION;
  const profileBackgroundAssetVersion = isNewestTravelBackground
    ? HEART_SHOP_NEW_TRAVEL_BACKGROUND_ASSET_VERSION
    : itemId === "shared_background_20"
      ? HEART_SHOP_BUSAN_BACKGROUND_ASSET_VERSION
      : HEART_SHOP_LATEST_PROFILE_ASSET_VERSION;
  const sharedLayerPath = `/images/heart-shop/character/shared/${sharedDirectory}/${config.filePrefix}-${String(itemNumber).padStart(2, "0")}.${assetExtension}`;
  const characterLayerPath = `/images/heart-shop/character/${avatarType}/${config.directory}/${config.filePrefix}-${String(itemNumber).padStart(2, "0")}.${assetExtension}`;
  const clothingAssetVersion = isNewestRootsmanFwTop
    ? HEART_SHOP_ROOTSMAN_FW_TOP_ASSET_VERSION
    : isNewestRootsmanBottom
    ? HEART_SHOP_ROOTSMAN_FW_BOTTOM_ASSET_VERSION
    : isNewestRootswomanFwShoes
      ? HEART_SHOP_ROOTSWOMAN_FW_SHOES_ASSET_VERSION
    : isNewestRootswomanFwTop
      ? HEART_SHOP_ROOTSWOMAN_FW_TOP_ASSET_VERSION
      : HEART_SHOP_LATEST_CLOTHING_ASSET_VERSION;
  const layerPath = avatarType === "shared"
    ? slot === "background"
      ? `${sharedLayerPath}?v=${isLatestProfileBackground || isNewestTravelBackground ? profileBackgroundAssetVersion : isTravelBackground ? HEART_SHOP_TRAVEL_BACKGROUND_ASSET_VERSION : HEART_SHOP_PROFILE_BACKGROUND_ASSET_VERSION}`
      : sharedLayerPath
    : isLatestClothingAsset
      ? `${characterLayerPath}?v=${clothingAssetVersion}`
      : characterLayerPath;

  return {
    id: itemId,
    category: "character",
    avatarType,
    slot,
    price: isNewestRootsmanFwTop
      ? 50
      : isNewestRootsmanBottom
      ? 40
      : isNewestRootswomanFwShoes
      ? isRootswomanFwBoot ? 40 : 30
      : isNewestRootswomanFwTop
      ? isNewestRootsWomanDress ? 70 : 50
      : isNewestTop
      ? 50
      : itemId === "shared_background_15"
      ? 300
      : itemId === "shared_background_17"
        ? 100
        : itemId === "shared_pet_07"
        ? 100
        : isRootsWomanDress
          ? 50
          : config.price,
    isNew,
    newPriority,
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

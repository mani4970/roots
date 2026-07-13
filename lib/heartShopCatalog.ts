import type { RewardMapKind } from "@/lib/rewardMaps";
import type { HeartShopItemId } from "@/lib/heartShopText";

export type HeartShopCatalogItem = {
  id: HeartShopItemId;
  price: number;
  previewPath: string;
  sourceSpriteSheetPath: string;
  frameCount: number;
  sheetWidth: number;
  sheetHeight: number;
  intervalMs: number;
  mapKinds: readonly RewardMapKind[];
};

const GARDEN_AND_ARK = ["garden", "peaceArk"] as const satisfies readonly RewardMapKind[];

export const HEART_SHOP_CATALOG: readonly HeartShopCatalogItem[] = [
  {
    id: "jjaekjjaek",
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

export function isHeartShopItemAvailableOnMap(itemId: HeartShopItemId, mapKind: RewardMapKind) {
  const item = HEART_SHOP_CATALOG.find(candidate => candidate.id === itemId);
  return !!item?.mapKinds.includes(mapKind);
}

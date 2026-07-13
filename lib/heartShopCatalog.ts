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

const GARDEN_ONLY = ["garden"] as const satisfies readonly RewardMapKind[];

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
    mapKinds: GARDEN_ONLY,
  },
  {
    id: "hindungi",
    price: 60,
    previewPath: "/images/heart-shop/previews/hindungi.webp",
    sourceSpriteSheetPath: "/images/heart-shop/source-sprites/hindungi.png",
    frameCount: 4,
    sheetWidth: 2048,
    sheetHeight: 682,
    intervalMs: 340,
    mapKinds: GARDEN_ONLY,
  },
  {
    id: "choko",
    price: 60,
    previewPath: "/images/heart-shop/previews/choko.webp",
    sourceSpriteSheetPath: "/images/heart-shop/source-sprites/choko.png",
    frameCount: 4,
    sheetWidth: 2048,
    sheetHeight: 512,
    intervalMs: 330,
    mapKinds: GARDEN_ONLY,
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
    mapKinds: GARDEN_ONLY,
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
    mapKinds: GARDEN_ONLY,
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
    mapKinds: GARDEN_ONLY,
  },
] as const;

export function isHeartShopItemAvailableOnMap(itemId: HeartShopItemId, mapKind: RewardMapKind) {
  const item = HEART_SHOP_CATALOG.find(candidate => candidate.id === itemId);
  return !!item?.mapKinds.includes(mapKind);
}

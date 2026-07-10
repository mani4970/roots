import type { HeartShopItemId } from "@/lib/heartShopText";

export type HeartShopCatalogItem = {
  id: HeartShopItemId;
  price: number;
  previewPath: string;
  sourceSpriteSheetPath: string;
  frameCount: 4;
  sheetWidth: number;
  sheetHeight: number;
  intervalMs: number;
};

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
  },
] as const;

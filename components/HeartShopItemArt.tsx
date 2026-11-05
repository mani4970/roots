import type { RootsAvatarType } from "@/lib/avatar";
import { isHeartShopMapCatalogItem, type HeartShopCatalogItem } from "@/lib/heartShopCatalog";
import { isHeartShopBibleItemId, type HeartShopCharacterItemId, type HeartShopCharacterSlot } from "@/lib/heartShopItems";

type CharacterItemPreviewCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const CHARACTER_ITEM_PREVIEW_CROP: Record<
  RootsAvatarType,
  Record<Exclude<HeartShopCharacterSlot, "background" | "hair" | "necklace">, CharacterItemPreviewCrop>
> = {
  rootsman: {
    pet: { x: 665, y: 940, width: 345, height: 345 },
    top: { x: 230, y: 590, width: 626, height: 405 },
    bottom: { x: 350, y: 920, width: 397, height: 360 },
    shoes: { x: 310, y: 1195, width: 480, height: 200 },
    eyewear: { x: 310, y: 400, width: 500, height: 190 },
    hair_accessory: { x: 250, y: 80, width: 610, height: 320 },
    muffler: { x: 350, y: 520, width: 420, height: 470 },
    headwear: { x: 70, y: 0, width: 970, height: 480 },
    bag: { x: 250, y: 520, width: 650, height: 620 },
  },
  rootswoman: {
    pet: { x: 665, y: 940, width: 345, height: 345 },
    top: { x: 230, y: 590, width: 626, height: 405 },
    bottom: { x: 350, y: 810, width: 397, height: 430 },
    shoes: { x: 310, y: 1140, width: 480, height: 220 },
    eyewear: { x: 310, y: 400, width: 500, height: 190 },
    hair_accessory: { x: 250, y: 80, width: 610, height: 320 },
    muffler: { x: 350, y: 520, width: 420, height: 470 },
    headwear: { x: 70, y: 0, width: 970, height: 480 },
    bag: { x: 250, y: 520, width: 650, height: 620 },
  },
};

const CHARACTER_ITEM_PREVIEW_CROP_OVERRIDES: Partial<
  Record<HeartShopCharacterItemId, CharacterItemPreviewCrop>
> = {
  // Yeolmu is a flying pet and sits much higher on the shared 1086×1448 canvas
  // than the ground pets, so the generic pet crop would show an empty tile.
  shared_pet_07: { x: 690, y: 570, width: 330, height: 290 },
  // Long winter coats extend below the shared top crop; keep their hems visible.
  // Preview-only bounds: the wearable assets and character layer layout stay unchanged.
  rootsman_top_31: { x: 230, y: 590, width: 626, height: 580 },
  rootsman_top_32: { x: 230, y: 590, width: 626, height: 580 },

  // Per-item preview bounds measured from the shipped assets. Only clipped edges expand;
  // the shared crops, wearable files, outfit layers and purchase behavior stay unchanged.
  // Trouser hems.
  rootsman_bottom_07: { x: 350, y: 920, width: 397, height: 380 },
  rootsman_bottom_09: { x: 350, y: 920, width: 397, height: 380 },
  rootsman_bottom_10: { x: 350, y: 920, width: 397, height: 380 },
  rootsman_bottom_11: { x: 350, y: 920, width: 397, height: 380 },
  rootsman_bottom_12: { x: 350, y: 920, width: 397, height: 380 },
  rootsman_bottom_14: { x: 350, y: 920, width: 397, height: 380 },
  rootsman_bottom_16: { x: 350, y: 920, width: 397, height: 380 },
  rootsman_bottom_17: { x: 350, y: 920, width: 397, height: 380 },
  rootsman_bottom_19: { x: 350, y: 920, width: 397, height: 380 },
  rootsman_bottom_20: { x: 350, y: 920, width: 397, height: 380 },
  rootsman_bottom_21: { x: 350, y: 920, width: 397, height: 380 },
  rootsman_bottom_22: { x: 350, y: 920, width: 397, height: 380 },
  // Anorak and trench-coat hems.
  rootsman_top_14: { x: 230, y: 590, width: 626, height: 430 },
  rootsman_top_25: { x: 230, y: 590, width: 626, height: 430 },
  rootsman_top_26: { x: 230, y: 590, width: 626, height: 440 },
  // Full boot shafts.
  rootswoman_shoes_09: { x: 310, y: 1070, width: 480, height: 290 },
  // Necklines and dress hems.
  rootswoman_top_01: { x: 230, y: 560, width: 626, height: 435 },
  rootswoman_top_02: { x: 230, y: 560, width: 626, height: 435 },
  rootswoman_top_03: { x: 230, y: 560, width: 626, height: 435 },
  rootswoman_top_04: { x: 230, y: 560, width: 626, height: 435 },
  rootswoman_top_05: { x: 230, y: 560, width: 626, height: 435 },
  rootswoman_top_06: { x: 230, y: 560, width: 626, height: 435 },
  rootswoman_top_07: { x: 230, y: 560, width: 626, height: 435 },
  rootswoman_top_08: { x: 230, y: 560, width: 626, height: 435 },
  rootswoman_top_09: { x: 230, y: 560, width: 626, height: 435 },
  rootswoman_top_10: { x: 230, y: 570, width: 626, height: 425 },
  rootswoman_top_11: { x: 230, y: 560, width: 626, height: 435 },
  rootswoman_top_13: { x: 230, y: 570, width: 626, height: 425 },
  rootswoman_top_15: { x: 230, y: 550, width: 626, height: 445 },
  rootswoman_top_16: { x: 230, y: 550, width: 626, height: 445 },
  rootswoman_top_17: { x: 230, y: 560, width: 626, height: 435 },
  rootswoman_top_18: { x: 230, y: 550, width: 626, height: 445 },
  rootswoman_top_19: { x: 230, y: 550, width: 626, height: 445 },
  rootswoman_top_20: { x: 230, y: 550, width: 626, height: 445 },
  rootswoman_top_21: { x: 230, y: 540, width: 626, height: 455 },
  rootswoman_top_22: { x: 230, y: 540, width: 626, height: 455 },
  rootswoman_top_23: { x: 230, y: 550, width: 626, height: 530 },
  rootswoman_top_24: { x: 230, y: 550, width: 626, height: 445 },
  rootswoman_top_25: { x: 230, y: 550, width: 626, height: 470 },
  rootswoman_top_26: { x: 230, y: 550, width: 626, height: 445 },
  rootswoman_top_27: { x: 230, y: 550, width: 626, height: 445 },
  rootswoman_top_28: { x: 230, y: 530, width: 626, height: 465 },
  rootswoman_top_29: { x: 230, y: 550, width: 626, height: 445 },
  rootswoman_top_30: { x: 230, y: 560, width: 626, height: 435 },
  rootswoman_top_31: { x: 230, y: 560, width: 626, height: 435 },
  rootswoman_top_32: { x: 230, y: 550, width: 626, height: 445 },
  rootswoman_top_33: { x: 230, y: 550, width: 626, height: 445 },
  rootswoman_top_34: { x: 230, y: 550, width: 626, height: 445 },
  rootswoman_top_35: { x: 230, y: 540, width: 626, height: 455 },
  // Upper glasses rim.
  rootswoman_eyewear_02: { x: 310, y: 380, width: 500, height: 210 },
};

export default function HeartShopItemArt({
  item,
  alt,
  maxWidth,
  loading = "eager",
}: {
  item: HeartShopCatalogItem;
  alt: string;
  maxWidth?: number;
  loading?: "eager" | "lazy";
}) {
  if (isHeartShopMapCatalogItem(item)) {
    return <img src={item.previewPath} alt={alt} loading={loading} decoding="async"
      draggable={false} style={{ width: "100%", maxWidth, aspectRatio: "1", objectFit: "contain", imageRendering: "pixelated" }} />;
  }
  if (item.slot === "background" || item.slot === "hair"
    || item.slot === "necklace" || isHeartShopBibleItemId(item.id)) {
    return (
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth,
          aspectRatio: "1 / 1",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <img
          src={item.previewPath ?? item.layerPath}
          alt={alt}
          loading={loading}
          decoding="async"
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            imageRendering: "pixelated",
            userSelect: "none",
            pointerEvents: "none",
          }}
        />
      </div>
    );
  }

  const crop = CHARACTER_ITEM_PREVIEW_CROP_OVERRIDES[item.id]
    ?? (item.avatarType === "shared"
      ? CHARACTER_ITEM_PREVIEW_CROP.rootsman[item.slot]
      : CHARACTER_ITEM_PREVIEW_CROP[item.avatarType][item.slot]);
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth,
        aspectRatio: `${crop.width} / ${crop.height}`,
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <img
        src={item.layerPath}
        alt={alt}
        loading={loading}
        decoding="async"
        draggable={false}
        style={{
          position: "absolute",
          left: `${(-crop.x / crop.width) * 100}%`,
          top: `${(-crop.y / crop.height) * 100}%`,
          width: `${(1086 / crop.width) * 100}%`,
          height: `${(1448 / crop.height) * 100}%`,
          maxWidth: "none",
          imageRendering: "pixelated",
          userSelect: "none",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

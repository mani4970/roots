import { normalizeRootsAvatarType, type RootsAvatarType } from "@/lib/avatar";
import {
  HEART_SHOP_BUSAN_BACKGROUND_ASSET_VERSION,
  HEART_SHOP_LATEST_PROFILE_ASSET_VERSION,
  HEART_SHOP_PROFILE_BACKGROUND_ASSET_VERSION,
  HEART_SHOP_TRAVEL_BACKGROUND_ASSET_VERSION,
  getProfileCharacterLayersForItemIds,
} from "@/lib/heartShopCatalog";
import type { HeartShopItemId } from "@/lib/heartShopItems";
import {
  PROFILE_CHARACTER_CANVAS,
  getProfileCharacterBaseImageSrc,
  type ProfileCharacterLayer,
} from "@/lib/profileCharacter";

export type ProfileAvatarMode = "photo" | "character";

type SaveProfileAvatarDisplayOptions = {
  mode: ProfileAvatarMode;
  effectiveAvatarUrl: string | null;
  photoUrl: string | null;
  characterSignature?: string | null;
  avatarType?: RootsAvatarType | null;
};

const PROFILE_CHARACTER_AVATAR_ASSET_VERSION = "20260722_v1";
const PROFILE_CHARACTER_PET_LAYOUT_VERSION = "20260808_v1";
const PROFILE_AVATAR_OUTPUT_SIZE = 640;
const PROFILE_CHARACTER_AVATAR_MAX_SIZE = 2 * 1024 * 1024;
const PROFILE_CHARACTER_SQUARE_BACKGROUND_DIRECTORY =
  "/images/heart-shop/character/shared/profile-backgrounds";
const JESUS_PHOTO_CHARACTER_RENDER_LEFT_PERCENT = -8;

// Keep these values aligned with ProfileCharacterPreview so the saved square
// avatar matches the live character preview exactly.
const PET_LAYER_SCALE = 1.2;
const PET_LAYER_SHIFT_X = 65;
const PET_LAYER_ORIGIN = { x: 700, y: 1268 } as const;
const BASE_CHARACTER_GROUND_Y: Record<RootsAvatarType, number> = {
  rootsman: 1329,
  rootswoman: 1260,
};
const ROOTSMAN_SHOES_GROUND_Y = 1361;
const ROOTSWOMAN_SHOES_GROUND_Y: Readonly<Record<string, number>> = {
  rootswoman_shoes_01: 1333,
  rootswoman_shoes_02: 1303,
  rootswoman_shoes_03: 1333,
  rootswoman_shoes_04: 1333,
  rootswoman_shoes_05: 1333,
  rootswoman_shoes_06: 1303,
  rootswoman_shoes_07: 1331,
  rootswoman_shoes_08: 1322,
  rootswoman_shoes_09: 1339,
  rootswoman_shoes_10: 1338,
  rootswoman_shoes_11: 1334,
  rootswoman_shoes_12: 1304,
};

function getCharacterGroundY(
  avatarType: RootsAvatarType,
  layers: readonly ProfileCharacterLayer[],
) {
  const shoesLayer = layers.find(layer => layer.slot === "shoes");
  if (!shoesLayer) return BASE_CHARACTER_GROUND_Y[avatarType];
  if (avatarType === "rootsman") return ROOTSMAN_SHOES_GROUND_Y;
  return ROOTSWOMAN_SHOES_GROUND_Y[shoesLayer.id] ?? 1333;
}

function drawCharacterLayer(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  layer: ProfileCharacterLayer,
  avatarType: RootsAvatarType,
  layers: readonly ProfileCharacterLayer[],
) {
  context.save();
  if (layer.slot === "pet") {
    const groundShiftY = getCharacterGroundY(avatarType, layers) - PET_LAYER_ORIGIN.y;
    context.translate(PET_LAYER_SHIFT_X, groundShiftY);
    context.translate(PET_LAYER_ORIGIN.x, PET_LAYER_ORIGIN.y);
    context.scale(PET_LAYER_SCALE, PET_LAYER_SCALE);
    context.translate(-PET_LAYER_ORIGIN.x, -PET_LAYER_ORIGIN.y);
  }
  context.drawImage(
    image,
    0,
    0,
    PROFILE_CHARACTER_CANVAS.width,
    PROFILE_CHARACTER_CANVAS.height,
  );
  context.restore();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load profile character image: ${src}`));
    image.src = src;
  });
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error("Could not create profile character image."));
    }, "image/png");
  });
}

function getSquareProfileBackgroundAsset(layerId: string) {
  const match = /^shared_background_(\d{2})$/.exec(layerId);
  if (!match) return null;

  const itemNumber = Number(match[1]);
  const isBusanBackground = itemNumber === 20;
  const isLatestWebpBackground = itemNumber >= 15 && itemNumber <= 20;
  const isTravelBackground = itemNumber >= 11 && itemNumber <= 14;
  const extension = isLatestWebpBackground ? "webp" : "png";
  const version = isBusanBackground
    ? HEART_SHOP_BUSAN_BACKGROUND_ASSET_VERSION
    : isLatestWebpBackground
      ? HEART_SHOP_LATEST_PROFILE_ASSET_VERSION
      : isTravelBackground
        ? HEART_SHOP_TRAVEL_BACKGROUND_ASSET_VERSION
        : HEART_SHOP_PROFILE_BACKGROUND_ASSET_VERSION;

  return {
    src: `${PROFILE_CHARACTER_SQUARE_BACKGROUND_DIRECTORY}/background-${match[1]}.${extension}?v=${version}`,
    version,
  };
}

export function getProfileCharacterAvatarSignature(
  avatarType: unknown,
  itemIds: readonly HeartShopItemId[],
) {
  const normalizedAvatarType = normalizeRootsAvatarType(avatarType);
  const layers = getProfileCharacterLayersForItemIds(itemIds, normalizedAvatarType)
    .sort((a, b) => (a.zIndex ?? 10) - (b.zIndex ?? 10));
  const layerIds = layers.map(layer => layer.id).sort();
  const squareBackgroundAsset = layers
    .filter(layer => (layer.zIndex ?? 10) < 0)
    .map(layer => getSquareProfileBackgroundAsset(layer.id))
    .filter((asset): asset is NonNullable<typeof asset> => Boolean(asset))
    .at(-1) ?? null;
  const hasPetLayer = layers.some(layer => layer.slot === "pet");
  const assetVersion = [
    PROFILE_CHARACTER_AVATAR_ASSET_VERSION,
    ...(squareBackgroundAsset ? [squareBackgroundAsset.version] : []),
    ...(hasPetLayer ? [PROFILE_CHARACTER_PET_LAYOUT_VERSION] : []),
  ].join(":");
  return [assetVersion, normalizedAvatarType, ...layerIds].join(":");
}

export async function createProfileCharacterAvatarBlob(
  avatarType: unknown,
  itemIds: readonly HeartShopItemId[],
) {
  if (typeof document === "undefined") {
    throw new Error("Profile character images can only be created in the app.");
  }

  const normalizedAvatarType = normalizeRootsAvatarType(avatarType);
  const layers = getProfileCharacterLayersForItemIds(itemIds, normalizedAvatarType)
    .sort((a, b) => (a.zIndex ?? 10) - (b.zIndex ?? 10));
  const backgroundLayers = layers.filter(layer => (layer.zIndex ?? 10) < 0);
  const foregroundLayers = layers.filter(layer => (layer.zIndex ?? 10) >= 0);
  const selectedBackgroundLayer = backgroundLayers[backgroundLayers.length - 1] ?? null;
  const squareBackgroundAsset = selectedBackgroundLayer
    ? getSquareProfileBackgroundAsset(selectedBackgroundLayer.id)
    : null;
  const [squareBackgroundImage, characterImages] = await Promise.all([
    squareBackgroundAsset ? loadImage(squareBackgroundAsset.src) : Promise.resolve(null),
    Promise.all([
      getProfileCharacterBaseImageSrc(normalizedAvatarType),
      ...foregroundLayers.map(layer => layer.src),
    ].map(loadImage)),
  ]);

  const characterCanvas = document.createElement("canvas");
  characterCanvas.width = PROFILE_CHARACTER_CANVAS.width;
  characterCanvas.height = PROFILE_CHARACTER_CANVAS.height;
  const characterContext = characterCanvas.getContext("2d");
  if (!characterContext) throw new Error("Could not prepare the profile character canvas.");
  characterContext.imageSmoothingEnabled = false;
  const [baseCharacterImage, ...foregroundImages] = characterImages;
  characterContext.drawImage(
    baseCharacterImage,
    0,
    0,
    PROFILE_CHARACTER_CANVAS.width,
    PROFILE_CHARACTER_CANVAS.height,
  );
  foregroundLayers.forEach((layer, index) => {
    const image = foregroundImages[index];
    if (!image) return;
    drawCharacterLayer(
      characterContext,
      image,
      layer,
      normalizedAvatarType,
      foregroundLayers,
    );
  });

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = PROFILE_AVATAR_OUTPUT_SIZE;
  outputCanvas.height = PROFILE_AVATAR_OUTPUT_SIZE;
  const outputContext = outputCanvas.getContext("2d");
  if (!outputContext) throw new Error("Could not prepare the profile avatar canvas.");

  outputContext.imageSmoothingEnabled = false;
  if (squareBackgroundImage) {
    outputContext.drawImage(
      squareBackgroundImage,
      0,
      0,
      PROFILE_AVATAR_OUTPUT_SIZE,
      PROFILE_AVATAR_OUTPUT_SIZE,
    );
  } else {
    const background = outputContext.createRadialGradient(320, 235, 45, 320, 320, 450);
    background.addColorStop(0, "#fffdf8");
    background.addColorStop(0.72, "#f4f5ed");
    background.addColorStop(1, "#e8efe3");
    outputContext.fillStyle = background;
    outputContext.fillRect(0, 0, PROFILE_AVATAR_OUTPUT_SIZE, PROFILE_AVATAR_OUTPUT_SIZE);
  }

  const renderHeight = 620;
  const renderWidth = renderHeight * (PROFILE_CHARACTER_CANVAS.width / PROFILE_CHARACTER_CANVAS.height);
  const renderLeft = selectedBackgroundLayer?.id === "shared_background_15"
    ? (JESUS_PHOTO_CHARACTER_RENDER_LEFT_PERCENT / 100) * PROFILE_AVATAR_OUTPUT_SIZE
    : (PROFILE_AVATAR_OUTPUT_SIZE - renderWidth) / 2;
  outputContext.drawImage(
    characterCanvas,
    renderLeft,
    10,
    renderWidth,
    renderHeight,
  );

  const blob = await canvasToPngBlob(outputCanvas);
  if (blob.size > PROFILE_CHARACTER_AVATAR_MAX_SIZE) {
    throw new Error("Profile character image exceeds the 2 MB upload limit.");
  }
  return blob;
}

export async function uploadProfileCharacterAvatar(
  supabase: any,
  userId: string,
  avatarType: unknown,
  itemIds: readonly HeartShopItemId[],
) {
  const normalizedAvatarType = normalizeRootsAvatarType(avatarType);
  const signature = getProfileCharacterAvatarSignature(normalizedAvatarType, itemIds);
  const blob = await createProfileCharacterAvatarBlob(normalizedAvatarType, itemIds);
  const path = `${userId}/character-avatar.png`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, blob, { upsert: true, contentType: "image/png", cacheControl: "3600" });
  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
  return {
    avatarUrl: `${publicUrl}?t=${Date.now()}`,
    signature,
  };
}

export async function saveProfileAvatarDisplay(
  supabase: any,
  options: SaveProfileAvatarDisplayOptions,
) {
  const { data, error } = await supabase.rpc("set_profile_avatar_display", {
    p_mode: options.mode,
    p_effective_avatar_url: options.effectiveAvatarUrl,
    p_photo_url: options.photoUrl,
    p_character_signature: options.characterSignature ?? null,
    p_avatar_type: options.avatarType ?? null,
  });
  if (error) throw error;
  if (!data || data.updated !== true) {
    throw new Error(data?.reason ?? "Could not save the profile avatar display.");
  }
  return data;
}

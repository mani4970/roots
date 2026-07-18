import { normalizeRootsAvatarType, type RootsAvatarType } from "@/lib/avatar";
import { getProfileCharacterLayersForItemIds } from "@/lib/heartShopCatalog";
import type { HeartShopItemId } from "@/lib/heartShopItems";
import {
  PROFILE_CHARACTER_CANVAS,
  getProfileCharacterBaseImageSrc,
} from "@/lib/profileCharacter";

export type ProfileAvatarMode = "photo" | "character";

type SaveProfileAvatarDisplayOptions = {
  mode: ProfileAvatarMode;
  effectiveAvatarUrl: string | null;
  photoUrl: string | null;
  characterSignature?: string | null;
  avatarType?: RootsAvatarType | null;
};

const PROFILE_CHARACTER_AVATAR_ASSET_VERSION = "20260716_v1";
const PROFILE_CHARACTER_SQUARE_BACKGROUND_ASSET_VERSION = "20260718_v1";
const PROFILE_AVATAR_OUTPUT_SIZE = 640;
const PROFILE_CHARACTER_SQUARE_BACKGROUND_DIRECTORY =
  "/images/heart-shop/character/shared/profile-backgrounds";

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

function getSquareProfileBackgroundSrc(layerId: string) {
  const match = /^shared_background_(\d{2})$/.exec(layerId);
  return match
    ? `${PROFILE_CHARACTER_SQUARE_BACKGROUND_DIRECTORY}/background-${match[1]}.png`
    : null;
}

export function getProfileCharacterAvatarSignature(
  avatarType: unknown,
  itemIds: readonly HeartShopItemId[],
) {
  const normalizedAvatarType = normalizeRootsAvatarType(avatarType);
  const layers = getProfileCharacterLayersForItemIds(itemIds, normalizedAvatarType)
    .sort((a, b) => (a.zIndex ?? 10) - (b.zIndex ?? 10));
  const layerIds = layers.map(layer => layer.id).sort();
  const hasSquareProfileBackground = layers.some(
    layer => (layer.zIndex ?? 10) < 0 && getSquareProfileBackgroundSrc(layer.id),
  );
  const assetVersion = hasSquareProfileBackground
    ? `${PROFILE_CHARACTER_AVATAR_ASSET_VERSION}:${PROFILE_CHARACTER_SQUARE_BACKGROUND_ASSET_VERSION}`
    : PROFILE_CHARACTER_AVATAR_ASSET_VERSION;
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
  const squareBackgroundSrc = selectedBackgroundLayer
    ? getSquareProfileBackgroundSrc(selectedBackgroundLayer.id)
    : null;
  const [squareBackgroundImage, characterImages] = await Promise.all([
    squareBackgroundSrc ? loadImage(squareBackgroundSrc) : Promise.resolve(null),
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
  characterImages.forEach(image => {
    characterContext.drawImage(
      image,
      0,
      0,
      PROFILE_CHARACTER_CANVAS.width,
      PROFILE_CHARACTER_CANVAS.height,
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
  outputContext.drawImage(
    characterCanvas,
    (PROFILE_AVATAR_OUTPUT_SIZE - renderWidth) / 2,
    10,
    renderWidth,
    renderHeight,
  );

  return canvasToPngBlob(outputCanvas);
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

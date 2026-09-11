import { normalizeRootsAvatarType, type RootsAvatarType } from "@/lib/avatar";
import type { HeartShopCharacterSlot } from "@/lib/heartShopItems";

export const PROFILE_CHARACTER_CANVAS = {
  width: 1086,
  height: 1448,
} as const;

export type ProfileCharacterSlot = HeartShopCharacterSlot;

export type ProfileCharacterLayer = {
  id: string;
  src: string;
  slot: ProfileCharacterSlot;
  zIndex?: number;
  compatibleAvatarTypes?: readonly RootsAvatarType[];
};

// Share sizing, visible foot anchors and depth between previews and saved images.
// Donki and Chichi stand close to the player, behind the body, clothes and bags.
export function getProfileCharacterPetLayout(
  layerId: string,
) {
  if (layerId === "shared_pet_05") {
    return {
      scale: 1.8,
      shiftX: 45,
      groundY: 1246, // Visible hooves; faint alpha extends another 22 pixels below.
      behindCharacter: true,
      requiresSquareCanvas: true,
      version: "20260911_v3",
    };
  }
  if (layerId === "shared_pet_06") {
    return {
      scale: 1.5,
      shiftX: 65,
      groundY: 1268,
      behindCharacter: true,
      requiresSquareCanvas: true,
      version: "20260911_v3",
    };
  }
  return {
    scale: 1.2,
    shiftX: 65,
    groundY: 1268,
    behindCharacter: false,
    requiresSquareCanvas: false,
    version: "20260808_v1",
  };
}

export function getProfileCharacterBaseImageSrc(avatarType: unknown): string {
  return normalizeRootsAvatarType(avatarType) === "rootswoman"
    ? "/images/profile-characters/rootswoman-profile.webp"
    : "/images/profile-characters/rootsman-profile.webp";
}

export function filterProfileCharacterLayers(
  layers: readonly ProfileCharacterLayer[],
  avatarType: unknown,
): ProfileCharacterLayer[] {
  const normalizedAvatarType = normalizeRootsAvatarType(avatarType);
  return layers
    .filter(layer => !layer.compatibleAvatarTypes || layer.compatibleAvatarTypes.includes(normalizedAvatarType))
    .sort((a, b) => (a.zIndex ?? 10) - (b.zIndex ?? 10));
}

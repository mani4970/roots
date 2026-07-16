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

export function getProfileCharacterBaseImageSrc(avatarType: unknown): string {
  return normalizeRootsAvatarType(avatarType) === "rootswoman"
    ? "/images/profile-characters/rootswoman-profile.png"
    : "/images/profile-characters/rootsman-profile.png";
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

"use client";

import type { CSSProperties } from "react";
import { normalizeRootsAvatarType, type RootsAvatarType } from "@/lib/avatar";
import {
  PROFILE_CHARACTER_CANVAS,
  filterProfileCharacterLayers,
  getProfileCharacterBaseImageSrc,
  type ProfileCharacterLayer,
} from "@/lib/profileCharacter";

type ProfileCharacterPreviewProps = {
  avatarType: unknown;
  alt: string;
  layers?: readonly ProfileCharacterLayer[];
  style?: CSSProperties;
  forceSquareCanvas?: boolean;
};

const SQUARE_CHARACTER_RENDER_HEIGHT_PERCENT = 96.875;
const SQUARE_CHARACTER_RENDER_WIDTH_PERCENT =
  SQUARE_CHARACTER_RENDER_HEIGHT_PERCENT
  * (PROFILE_CHARACTER_CANVAS.width / PROFILE_CHARACTER_CANVAS.height);
const SQUARE_CHARACTER_RENDER_TOP_PERCENT =
  (100 - SQUARE_CHARACTER_RENDER_HEIGHT_PERCENT) / 2;
const SQUARE_CHARACTER_RENDER_LEFT_PERCENT =
  (100 - SQUARE_CHARACTER_RENDER_WIDTH_PERCENT) / 2;
const JESUS_PHOTO_CHARACTER_RENDER_LEFT_PERCENT = -8;

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

function getPetLayerStyle(
  avatarType: RootsAvatarType,
  layers: readonly ProfileCharacterLayer[],
): CSSProperties {
  const groundShiftY = getCharacterGroundY(avatarType, layers) - PET_LAYER_ORIGIN.y;
  return {
    transformOrigin: `${(PET_LAYER_ORIGIN.x / PROFILE_CHARACTER_CANVAS.width) * 100}% ${(PET_LAYER_ORIGIN.y / PROFILE_CHARACTER_CANVAS.height) * 100}%`,
    transform: `translate(${(PET_LAYER_SHIFT_X / PROFILE_CHARACTER_CANVAS.width) * 100}%, ${(groundShiftY / PROFILE_CHARACTER_CANVAS.height) * 100}%) scale(${PET_LAYER_SCALE})`,
  };
}

export default function ProfileCharacterPreview({
  avatarType,
  alt,
  layers = [],
  style,
  forceSquareCanvas = false,
}: ProfileCharacterPreviewProps) {
  const normalizedAvatarType = normalizeRootsAvatarType(avatarType);
  const visibleLayers = filterProfileCharacterLayers(layers, avatarType);
  const backgroundLayers = visibleLayers.filter(layer => (layer.zIndex ?? 10) < 0);
  const foregroundLayers = visibleLayers.filter(layer => (layer.zIndex ?? 10) >= 0);
  const hasSquareBackground = backgroundLayers.some(layer => layer.slot === "background");
  const hasJesusPhotoBackground = backgroundLayers.some(layer => layer.id === "shared_background_15");
  const useSquareCanvas = hasSquareBackground || forceSquareCanvas;
  const characterLayerStyle: CSSProperties = useSquareCanvas
    ? {
      left: `${hasJesusPhotoBackground ? JESUS_PHOTO_CHARACTER_RENDER_LEFT_PERCENT : SQUARE_CHARACTER_RENDER_LEFT_PERCENT}%`,
      top: `${SQUARE_CHARACTER_RENDER_TOP_PERCENT}%`,
      width: `${SQUARE_CHARACTER_RENDER_WIDTH_PERCENT}%`,
      height: `${SQUARE_CHARACTER_RENDER_HEIGHT_PERCENT}%`,
    }
    : {
      inset: 0,
      width: "100%",
      height: "100%",
    };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: useSquareCanvas
          ? "1 / 1"
          : `${PROFILE_CHARACTER_CANVAS.width} / ${PROFILE_CHARACTER_CANVAS.height}`,
        overflow: "hidden",
        isolation: "isolate",
        flexShrink: 0,
        ...style,
      }}
    >
      {backgroundLayers.map(layer => (
        <img
          key={layer.id}
          src={layer.src}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: layer.zIndex ?? -10,
            width: "100%",
            height: "100%",
            objectFit: hasSquareBackground ? "cover" : "contain",
            imageRendering: "pixelated",
            userSelect: "none",
            pointerEvents: "none",
          }}
        />
      ))}
      <img
        src={getProfileCharacterBaseImageSrc(avatarType)}
        alt={alt}
        draggable={false}
        style={{
          position: "absolute",
          ...characterLayerStyle,
          zIndex: 0,
          objectFit: "contain",
          imageRendering: "pixelated",
          userSelect: "none",
          pointerEvents: "none",
        }}
      />
      {foregroundLayers.map(layer => (
        <img
          key={layer.id}
          src={layer.src}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{
            position: "absolute",
            ...characterLayerStyle,
            ...(layer.slot === "pet"
              ? getPetLayerStyle(normalizedAvatarType, foregroundLayers)
              : {}),
            zIndex: layer.zIndex ?? 10,
            objectFit: "contain",
            imageRendering: "pixelated",
            userSelect: "none",
            pointerEvents: "none",
          }}
        />
      ))}
    </div>
  );
}

"use client";

import type { CSSProperties } from "react";
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
};

const SQUARE_CHARACTER_RENDER_HEIGHT_PERCENT = 96.875;
const SQUARE_CHARACTER_RENDER_WIDTH_PERCENT =
  SQUARE_CHARACTER_RENDER_HEIGHT_PERCENT
  * (PROFILE_CHARACTER_CANVAS.width / PROFILE_CHARACTER_CANVAS.height);
const SQUARE_CHARACTER_RENDER_TOP_PERCENT =
  (100 - SQUARE_CHARACTER_RENDER_HEIGHT_PERCENT) / 2;
const SQUARE_CHARACTER_RENDER_LEFT_PERCENT =
  (100 - SQUARE_CHARACTER_RENDER_WIDTH_PERCENT) / 2;

export default function ProfileCharacterPreview({
  avatarType,
  alt,
  layers = [],
  style,
}: ProfileCharacterPreviewProps) {
  const visibleLayers = filterProfileCharacterLayers(layers, avatarType);
  const backgroundLayers = visibleLayers.filter(layer => (layer.zIndex ?? 10) < 0);
  const foregroundLayers = visibleLayers.filter(layer => (layer.zIndex ?? 10) >= 0);
  const hasSquareBackground = backgroundLayers.some(layer => layer.slot === "background");
  const characterLayerStyle: CSSProperties = hasSquareBackground
    ? {
      left: `${SQUARE_CHARACTER_RENDER_LEFT_PERCENT}%`,
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
        aspectRatio: hasSquareBackground
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

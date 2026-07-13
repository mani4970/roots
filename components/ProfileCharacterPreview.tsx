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

export default function ProfileCharacterPreview({
  avatarType,
  alt,
  layers = [],
  style,
}: ProfileCharacterPreviewProps) {
  const visibleLayers = filterProfileCharacterLayers(layers, avatarType);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: `${PROFILE_CHARACTER_CANVAS.width} / ${PROFILE_CHARACTER_CANVAS.height}`,
        overflow: "hidden",
        flexShrink: 0,
        ...style,
      }}
    >
      <img
        src={getProfileCharacterBaseImageSrc(avatarType)}
        alt={alt}
        draggable={false}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "contain",
          imageRendering: "pixelated",
          userSelect: "none",
          pointerEvents: "none",
        }}
      />
      {visibleLayers.map(layer => (
        <img
          key={layer.id}
          src={layer.src}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: layer.zIndex ?? 10,
            width: "100%",
            height: "100%",
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

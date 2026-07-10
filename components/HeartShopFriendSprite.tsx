"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { HEART_SHOP_CATALOG } from "@/lib/heartShopCatalog";
import type { HeartShopItemId } from "@/lib/heartShopText";

type HeartShopFriendSpriteProps = {
  itemId: HeartShopItemId;
  renderWidth: number;
  alt?: string;
  animate?: boolean;
  style?: CSSProperties;
};

export default function HeartShopFriendSprite({
  itemId,
  renderWidth,
  alt = "",
  animate = true,
  style,
}: HeartShopFriendSpriteProps) {
  const item = useMemo(
    () => HEART_SHOP_CATALOG.find(candidate => candidate.id === itemId) ?? HEART_SHOP_CATALOG[0],
    [itemId],
  );
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    setFrame(0);
    if (!animate) return;

    const timer = window.setInterval(() => {
      setFrame(current => (current + 1) % item.frameCount);
    }, item.intervalMs);

    return () => window.clearInterval(timer);
  }, [animate, item.frameCount, item.intervalMs, item.id]);

  const frameWidth = item.sheetWidth / item.frameCount;
  const scale = renderWidth / frameWidth;
  const renderHeight = Math.round(item.sheetHeight * scale);

  return (
    <div
      aria-hidden={alt ? undefined : true}
      style={{
        position: "relative",
        width: renderWidth,
        height: renderHeight,
        overflow: "hidden",
        flexShrink: 0,
        imageRendering: "pixelated",
        ...style,
      }}
    >
      <img
        src={item.sourceSpriteSheetPath}
        alt={alt}
        draggable={false}
        style={{
          position: "absolute",
          top: 0,
          left: -frame * renderWidth,
          width: item.sheetWidth * scale,
          height: renderHeight,
          maxWidth: "none",
          userSelect: "none",
          pointerEvents: "none",
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
}

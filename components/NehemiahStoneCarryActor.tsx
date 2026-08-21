"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RewardMapSpriteSheet } from "./RewardMapSpritePlayer";

type NehemiahStoneCarryActorProps = {
  sprite: RewardMapSpriteSheet;
  fromX: string;
  toX: string;
  durationMs: number;
  bottom: string;
  alt: string;
};


/**
 * Stone-carry entry intentionally uses the original pre-smoothing animation
 * path that was already visually approved: React advances the carry sprite
 * frames on the sprite's fixed interval while CSS linearly moves the actor
 * from right to the shared action point. Keep this isolated from the generic
 * walk renderer and from the shared non-walk sprite player.
 */
export default function NehemiahStoneCarryActor({
  sprite,
  fromX,
  toX,
  durationMs,
  bottom,
  alt,
}: NehemiahStoneCarryActorProps) {
  const [frame, setFrame] = useState(0);
  const [left, setLeft] = useState(fromX);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const moveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const metrics = useMemo(() => {
    const frameWidth = sprite.frameWidthPx ?? sprite.sheetWidth / sprite.frames;
    const scale = sprite.renderWidth / frameWidth;
    return {
      frameWidth,
      scale,
      renderHeight: Math.round(sprite.sheetHeight * scale),
      renderedSheetWidth: sprite.sheetWidth * scale,
      renderedSheetHeight: sprite.sheetHeight * scale,
    };
  }, [sprite]);

  useEffect(() => {
    setFrame(0);
    setLeft(fromX);

    let tick = 0;
    intervalRef.current = setInterval(() => {
      tick = (tick + 1) % sprite.frames;
      setFrame(tick);
    }, sprite.intervalMs);

    moveTimerRef.current = setTimeout(() => {
      setLeft(toX);
    }, 60);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (moveTimerRef.current) {
        clearTimeout(moveTimerRef.current);
        moveTimerRef.current = null;
      }
    };
  }, [fromX, sprite.frames, sprite.intervalMs, toX]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left,
        bottom,
        width: sprite.renderWidth,
        height: metrics.renderHeight,
        overflow: "hidden",
        transform: "translate3d(-50%, 0, 0)",
        transition: `left ${durationMs}ms linear`,
        imageRendering: "pixelated",
        backfaceVisibility: "hidden",
        willChange: "left, transform",
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      <img
        src={sprite.src}
        alt={alt}
        draggable={false}
        style={{
          position: "absolute",
          top: 0,
          left: -frame * metrics.frameWidth * metrics.scale,
          width: metrics.renderedSheetWidth,
          height: metrics.renderedSheetHeight,
          maxWidth: "none",
          imageRendering: "pixelated",
          userSelect: "none",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

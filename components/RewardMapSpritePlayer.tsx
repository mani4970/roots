"use client";

import { useEffect, useRef } from "react";

export type RewardMapSpriteSheet = {
  src: string;
  frames: number;
  sheetWidth: number;
  sheetHeight: number;
  frameWidthPx?: number;
  renderWidth: number;
  intervalMs: number;
};

type RewardMapSpritePlayerProps = {
  sprite: RewardMapSpriteSheet;
  alt: string;
  loop?: boolean;
  loops?: number;
};

export function getRewardMapSpriteMetrics(sprite: RewardMapSpriteSheet) {
  const frameWidth = sprite.frameWidthPx ?? sprite.sheetWidth / sprite.frames;
  const scale = sprite.renderWidth / frameWidth;
  return {
    frameWidth,
    scale,
    renderHeight: Math.round(sprite.sheetHeight * scale),
    renderedSheetWidth: sprite.sheetWidth * scale,
    renderedSheetHeight: sprite.sheetHeight * scale,
  };
}

export default function RewardMapSpritePlayer({
  sprite,
  alt,
  loop = true,
  loops,
}: RewardMapSpritePlayerProps) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const metrics = getRewardMapSpriteMetrics(sprite);

  useEffect(() => {
    const image = imageRef.current;
    if (!image || sprite.frames <= 1) return;

    // Keep sprite-frame playback out of React state/timers. Web Animations lets
    // the browser schedule the strip on its animation clock while the actor's
    // travel transform remains compositor-driven, preventing the visible
    // start-stop cadence caused by setInterval + repeated React paints.
    const finalTranslateX = loop
      ? -metrics.renderedSheetWidth
      : -(metrics.renderedSheetWidth - sprite.renderWidth);
    const stepCount = loop ? sprite.frames : Math.max(1, sprite.frames - 1);
    const duration = (loop ? sprite.frames : Math.max(1, sprite.frames - 1)) * sprite.intervalMs;
    const iterationCount = loop ? (loops ?? Number.POSITIVE_INFINITY) : 1;

    const animation = image.animate(
      [
        { transform: "translate3d(0, 0, 0)" },
        { transform: `translate3d(${finalTranslateX}px, 0, 0)` },
      ],
      {
        duration,
        iterations: iterationCount,
        easing: `steps(${stepCount}, end)`,
        fill: loop ? "none" : "forwards",
      },
    );

    return () => animation.cancel();
  }, [
    loop,
    loops,
    metrics.renderedSheetWidth,
    sprite.frames,
    sprite.intervalMs,
    sprite.renderWidth,
  ]);

  return (
    <div
      style={{
        width: sprite.renderWidth,
        height: metrics.renderHeight,
        overflow: "hidden",
        imageRendering: "pixelated",
        contain: "layout paint",
      }}
    >
      <img
        ref={imageRef}
        src={sprite.src}
        alt={alt}
        draggable={false}
        style={{
          display: "block",
          width: metrics.renderedSheetWidth,
          height: metrics.renderedSheetHeight,
          maxWidth: "none",
          imageRendering: "pixelated",
          transform: "translate3d(0, 0, 0)",
          backfaceVisibility: "hidden",
          willChange: "transform",
          userSelect: "none",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

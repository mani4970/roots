"use client";

import { useEffect, useRef } from "react";
import { normalizeRootsAvatarType, type RootsAvatarType } from "@/lib/avatar";

const WALK_FRAME_COUNT = 6;
const WALK_FRAME_WIDTH = 362;
const WALK_FRAME_HEIGHT = 724;
// This is the proven Garden cadence: one visible pose every 3 × 45 ms.
const WALK_FRAME_INTERVAL_MS = 135;

function getWalkFrameSrc(avatarType: RootsAvatarType, frame: number) {
  return `/images/reward-maps/garden/sprites/frames/${avatarType}/walk_${frame}.webp`;
}

type RewardMapWalkActorProps = {
  avatarType?: RootsAvatarType | null;
  fromX: string;
  toX: string;
  durationMs: number;
  bottom: string;
  renderWidth: number;
  flip?: boolean;
  alt?: string;
};

function parsePercent(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

// The approved Rootsman walk artwork has one frame whose character body sits
// about 31 source pixels too far left inside the 362px canvas. At the reward
// map render size that becomes a visible ~3px sideways jump. Keep the artwork
// unchanged and compensate only that frame in this shared renderer.
function getFrameOffsetPx(avatarType: RootsAvatarType, frame: number, renderWidth: number) {
  if (avatarType === "rootsman" && frame === 4) {
    return (31 / WALK_FRAME_WIDTH) * renderWidth;
  }
  return 0;
}

export default function RewardMapWalkActor({
  avatarType,
  fromX,
  toX,
  durationMs,
  bottom,
  renderWidth,
  flip = false,
  alt = "Roots",
}: RewardMapWalkActorProps) {
  const normalizedAvatarType = normalizeRootsAvatarType(avatarType);
  const actorRef = useRef<HTMLDivElement | null>(null);
  const frameRefs = useRef<Array<HTMLImageElement | null>>([]);
  const renderHeight = Math.round(WALK_FRAME_HEIGHT * (renderWidth / WALK_FRAME_WIDTH));

  useEffect(() => {
    const actor = actorRef.current;
    const frames = frameRefs.current;
    if (!actor || frames.filter(Boolean).length !== WALK_FRAME_COUNT) return;

    const from = parsePercent(fromX);
    const to = parsePercent(toX);
    const safeDuration = Math.max(1, durationMs);
    let animationFrame = 0;
    let startTime: number | null = null;
    let visibleWalkFrame = 0;

    actor.style.transform = `translate3d(${from}%, 0, 0)`;
    frames.forEach((frame, index) => {
      if (frame) frame.style.visibility = index === 0 ? "visible" : "hidden";
    });

    const tick = (now: number) => {
      if (startTime === null) startTime = now;
      const elapsed = Math.max(0, now - startTime);
      const progress = Math.min(1, elapsed / safeDuration);
      const x = from + (to - from) * progress;
      actor.style.transform = `translate3d(${x}%, 0, 0)`;

      // Position and foot pose are driven by the same rAF clock. All six
      // approved Garden frames are already mounted/decoded in the DOM, so
      // changing a pose never waits on an image load and never touches React
      // state while the actor is travelling.
      const nextWalkFrame = Math.floor(elapsed / WALK_FRAME_INTERVAL_MS) % WALK_FRAME_COUNT;
      if (nextWalkFrame !== visibleWalkFrame) {
        const previous = frames[visibleWalkFrame];
        const next = frames[nextWalkFrame];
        if (previous) previous.style.visibility = "hidden";
        if (next) next.style.visibility = "visible";
        visibleWalkFrame = nextWalkFrame;
      }

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(tick);
      }
    };

    animationFrame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [durationMs, fromX, normalizedAvatarType, toX]);

  return (
    <div
      ref={actorRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        transform: `translate3d(${fromX}, 0, 0)`,
        willChange: "transform",
        backfaceVisibility: "hidden",
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom,
          width: renderWidth,
          height: renderHeight,
          transform: `translate3d(-50%, 0, 0)${flip ? " scaleX(-1)" : ""}`,
          transformOrigin: "center bottom",
          backfaceVisibility: "hidden",
          imageRendering: "pixelated",
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        {Array.from({ length: WALK_FRAME_COUNT }, (_, frame) => (
          <img
            key={`${normalizedAvatarType}-${frame}`}
            ref={(node) => {
              frameRefs.current[frame] = node;
            }}
            src={getWalkFrameSrc(normalizedAvatarType, frame)}
            alt={frame === 0 ? alt : ""}
            draggable={false}
            style={{
              position: "absolute",
              inset: 0,
              width: renderWidth,
              height: renderHeight,
              objectFit: "fill",
              visibility: frame === 0 ? "visible" : "hidden",
              transform: `translate3d(${getFrameOffsetPx(normalizedAvatarType, frame, renderWidth)}px, 0, 0)`,
              imageRendering: "pixelated",
              backfaceVisibility: "hidden",
              userSelect: "none",
              pointerEvents: "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}

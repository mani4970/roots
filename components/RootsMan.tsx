"use client";
import { useEffect, useRef, useState } from "react";
import { normalizeRootsAvatarType, type RootsAvatarType } from "@/lib/avatar";

// The preview/production watering animation renders individual transparent frame images.
// Walk frames are normalized to a fixed foot baseline and center point, so the wrapper
// controls the travel motion while the frame cycle only shows the walking pose.
const WALK_FRAME_W = 362;
const WALK_FRAME_H = 724;
const WATER_FRAME_W = 682;
const WATER_FRAME_H = 682;

const WALK_RENDER_W: Record<RootsAvatarType, number> = {
  rootsman: 65,
  rootswoman: 72,
};

const WATER_RENDER_W: Record<RootsAvatarType, number> = {
  rootsman: 124,
  rootswoman: 113,
};

const WATER_BOTTOM_OFFSET: Record<RootsAvatarType, number> = {
  rootsman: 1,
  rootswoman: 19,
};

// Final CSS-pixel anchors for the watering frames.
//
// The watering artwork is much wider than the walking artwork because the can and
// stream extend to the left. Each frame also stores the character at a slightly
// different source X position. Keeping final rendered anchors here avoids fractional
// translate values that can make pixel art shimmer, and keeps the RootsWoman body
// aligned with the neutral walking frame when watering begins and ends.
const WATER_FRAME_RENDER_OFFSET_X: Record<RootsAvatarType, number[]> = {
  // Preserve the already-stable RootsMan alignment.
  rootsman: [0, -5.8, 3.1],
  // Stable body anchor across frames 0/1/2, including the walk -> water transition.
  rootswoman: [-23, -19, -12],
};

const WATER_FRAME_RENDER_OFFSET_Y: Record<RootsAvatarType, number[]> = {
  rootsman: [0, 0, 0],
  rootswoman: [0, 0, 0],
};

const ENTER_START_X = 112;
const WATER_X = 62;
const EXIT_END_X = 116;
const WALK_STEP = 1.15;
const WALK_INTERVAL = 45;
const FRAME_TICK = 3;
const WATER_INTERVAL = 280;
const WATER_CYCLES = 18;
const WALK_SETTLE_FRAME = 3;

const ENTER_FRAMES = [0, 1, 2, 3, 4, 5];
const WATER_FRAMES = [0, 1, 2];
const EXIT_FRAMES = ENTER_FRAMES;

type Phase = "idle" | "enter" | "water" | "exit" | "done";

interface RootsManProps {
  trigger: boolean;
  avatarType?: RootsAvatarType | null;
  startDelayMs?: number;
}

function getFrameSrc(avatarType: RootsAvatarType, kind: "walk" | "water", frame: number) {
  return `/images/reward-maps/garden/sprites/frames/${avatarType}/${kind}_${frame}.webp`;
}

function getAvatarFrameSources(avatarType: RootsAvatarType) {
  return [
    ...ENTER_FRAMES.map(frame => getFrameSrc(avatarType, "walk", frame)),
    ...WATER_FRAMES.map(frame => getFrameSrc(avatarType, "water", frame)),
  ];
}

export default function RootsMan({ trigger, avatarType, startDelayMs = 1200 }: RootsManProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [frame, setFrame] = useState(1);
  const [posX, setPosX] = useState(ENTER_START_X);
  const [flipX, setFlipX] = useState(false);
  const normalizedAvatarType = normalizeRootsAvatarType(avatarType);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // Preload individual frames so walking does not pause the first time a frame is shown.
    getAvatarFrameSources(normalizedAvatarType).forEach(src => {
      const image = new Image();
      image.src = src;
    });
  }, [normalizedAvatarType]);

  useEffect(() => {
    clearTimers();
    clearInv();

    if (!trigger) {
      setPhase("idle");
      return () => {
        clearTimers();
        clearInv();
      };
    }

    // React Strict Mode mounts, cleans up, and mounts again in development.
    // Do not guard this with a hasRun ref, or the first cleanup can cancel the only timer.
    scheduleTimeout(() => startAnimation(), startDelayMs);

    return () => {
      clearTimers();
      clearInv();
    };
  }, [trigger, startDelayMs, normalizedAvatarType]);

  function clearInv() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function clearTimers() {
    timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
    timeoutRefs.current = [];
  }

  function scheduleTimeout(callback: () => void, delay: number) {
    const timeoutId = setTimeout(() => {
      timeoutRefs.current = timeoutRefs.current.filter(id => id !== timeoutId);
      callback();
    }, delay);
    timeoutRefs.current.push(timeoutId);
  }

  function startAnimation() {
    setPhase("enter");
    setFlipX(false);
    setPosX(ENTER_START_X);
    setFrame(ENTER_FRAMES[0]);

    let x = ENTER_START_X;
    let wf = 0;
    let tick = 0;
    clearInv();
    intervalRef.current = setInterval(() => {
      x = Math.max(WATER_X, x - WALK_STEP);
      tick++;
      if (tick % FRAME_TICK === 0) wf = (wf + 1) % ENTER_FRAMES.length;
      setPosX(x);
      setFrame(ENTER_FRAMES[wf]);
      if (x <= WATER_X) {
        clearInv();
        setPosX(WATER_X);
        // Settle on a neutral walk frame before switching to the watering art.
        // This makes the enter -> water transition feel less abrupt.
        setFrame(WALK_SETTLE_FRAME);
        scheduleTimeout(() => startWatering(), 60);
      }
    }, WALK_INTERVAL);
  }

  function startWatering() {
    setPhase("water");
    setFlipX(false);
    setPosX(WATER_X);
    setFrame(WATER_FRAMES[0]);
    let wf = 0;
    let count = 0;
    clearInv();
    intervalRef.current = setInterval(() => {
      wf = (wf + 1) % WATER_FRAMES.length;
      count++;
      setFrame(WATER_FRAMES[wf]);
      if (count >= WATER_CYCLES) {
        clearInv();
        setFrame(WATER_FRAMES[0]);
        scheduleTimeout(() => startExit(), 420);
      }
    }, WATER_INTERVAL);
  }

  function startExit() {
    setPhase("exit");
    setFlipX(true);
    setPosX(WATER_X);
    setFrame(WALK_SETTLE_FRAME);
    let x = WATER_X;
    let wf = WALK_SETTLE_FRAME;
    let tick = 0;
    clearInv();
    intervalRef.current = setInterval(() => {
      x = Math.min(EXIT_END_X, x + WALK_STEP);
      tick++;
      if (tick % FRAME_TICK === 0) wf = (wf + 1) % EXIT_FRAMES.length;
      setPosX(x);
      setFrame(EXIT_FRAMES[wf]);
      if (x >= EXIT_END_X) {
        clearInv();
        setPhase("done");
      }
    }, WALK_INTERVAL);
  }

  if (phase === "idle" || phase === "done") return null;

  const isWatering = phase === "water";
  const sourceFrameW = isWatering ? WATER_FRAME_W : WALK_FRAME_W;
  const sourceFrameH = isWatering ? WATER_FRAME_H : WALK_FRAME_H;
  const renderW = isWatering ? WATER_RENDER_W[normalizedAvatarType] : WALK_RENDER_W[normalizedAvatarType];
  const scale = renderW / sourceFrameW;
  const renderH = Math.round(sourceFrameH * scale);
  const frameSrc = getFrameSrc(normalizedAvatarType, isWatering ? "water" : "walk", frame);
  const frameOffsetX = isWatering
    ? (WATER_FRAME_RENDER_OFFSET_X[normalizedAvatarType][frame] ?? 0)
    : 0;
  const frameOffsetY = isWatering
    ? (WATER_FRAME_RENDER_OFFSET_Y[normalizedAvatarType][frame] ?? 0)
    : 0;
  const bottomOffset = isWatering ? WATER_BOTTOM_OFFSET[normalizedAvatarType] : 0;

  return (
    <div style={{
      position: "absolute",
      bottom: bottomOffset,
      left: `${posX}%`,
      transform: "translate3d(-50%, 0, 0)",
      width: renderW,
      height: renderH,
      overflow: "visible",
      imageRendering: "pixelated",
      backfaceVisibility: "hidden",
      willChange: "left, transform",
      zIndex: 10,
      pointerEvents: "none",
    }}>
      <div style={{
        position: "relative",
        width: renderW,
        height: renderH,
        transform: flipX ? "scaleX(-1)" : "none",
        transformOrigin: "center bottom",
        backfaceVisibility: "hidden",
        imageRendering: "pixelated",
      }}>
        <img
          src={frameSrc}
          alt={normalizedAvatarType}
          draggable={false}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: renderW,
            height: renderH,
            transform: `translate3d(${frameOffsetX}px, ${frameOffsetY}px, 0)`,
            imageRendering: "pixelated",
            backfaceVisibility: "hidden",
            willChange: "transform",
            userSelect: "none",
          }}
        />
      </div>
    </div>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import RootsMan from "./RootsMan";
import type { RewardMapActionKind } from "@/lib/rewardMaps";

interface RewardMapActionProps {
  trigger: boolean;
  action: RewardMapActionKind;
}

type ArkSpriteConfig = {
  src: string;
  frames: number;
  sheetWidth: number;
  sheetHeight: number;
  renderWidth: number;
  bottom: number;
  left: string;
  intervalMs: number;
  loopCount: number;
};

type ArkPhase = "enter" | "action" | "exit";

const ARK_ENTER_MS = 900;
const ARK_EXIT_MS = 820;
const ARK_EXIT_LEFT = "108%";

const ARK_WALK_SPRITE: Omit<ArkSpriteConfig, "left" | "bottom" | "loopCount"> = {
  src: "/images/reward-maps/peace-ark/sprites/rootsman_walk_sheet.png",
  frames: 6,
  sheetWidth: 2172,
  sheetHeight: 724,
  renderWidth: 74,
  intervalMs: 120,
};

const ARK_SPRITES: Partial<Record<RewardMapActionKind, ArkSpriteConfig>> = {
  arkCarryWood: {
    src: "/images/reward-maps/peace-ark/sprites/rootsman_carry_wood_walk_sheet.png",
    frames: 6,
    sheetWidth: 1916,
    sheetHeight: 821,
    renderWidth: 86,
    bottom: 16,
    left: "23%",
    intervalMs: 130,
    loopCount: 4,
  },
  arkHammer: {
    src: "/images/reward-maps/peace-ark/sprites/rootsman_hammer_sheet.png",
    frames: 6,
    sheetWidth: 2172,
    sheetHeight: 724,
    renderWidth: 82,
    bottom: 20,
    left: "26%",
    intervalMs: 120,
    loopCount: 5,
  },
  arkWaveBird: {
    src: "/images/reward-maps/peace-ark/sprites/rootsman_wave_bird_sheet.png",
    frames: 4,
    sheetWidth: 1802,
    sheetHeight: 872,
    renderWidth: 84,
    bottom: 18,
    left: "28%",
    intervalMs: 170,
    loopCount: 5,
  },
  arkPray: {
    src: "/images/reward-maps/peace-ark/sprites/rootsman_pray_kneel_sheet.png",
    frames: 4,
    sheetWidth: 1881,
    sheetHeight: 836,
    renderWidth: 76,
    bottom: 17,
    left: "27%",
    intervalMs: 220,
    loopCount: 5,
  },
};

function ArkSpriteAction({ trigger, config }: { trigger: boolean; config: ArkSpriteConfig }) {
  const [phase, setPhase] = useState<ArkPhase | null>(null);
  const [frame, setFrame] = useState(0);
  const [left, setLeft] = useState(ARK_EXIT_LEFT);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hasRunRef = useRef(false);

  function clearAnimationTimers() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current = [];
  }

  function startFrameLoop(frames: number, intervalMs: number) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    let tick = 0;
    setFrame(0);
    intervalRef.current = setInterval(() => {
      tick += 1;
      setFrame(tick % frames);
    }, intervalMs);
  }

  function schedule(callback: () => void, delay: number) {
    const timer = setTimeout(callback, delay);
    timersRef.current.push(timer);
  }

  useEffect(() => {
    if (!trigger) {
      clearAnimationTimers();
      hasRunRef.current = false;
      setPhase(null);
      setFrame(0);
      setLeft(ARK_EXIT_LEFT);
      return;
    }

    if (hasRunRef.current) return;
    hasRunRef.current = true;
    clearAnimationTimers();

    const actionMs = config.frames * config.loopCount * config.intervalMs;

    setPhase("enter");
    setLeft(ARK_EXIT_LEFT);
    startFrameLoop(ARK_WALK_SPRITE.frames, ARK_WALK_SPRITE.intervalMs);
    schedule(() => setLeft(config.left), 40);

    schedule(() => {
      startFrameLoop(config.frames, config.intervalMs);
      setPhase("action");
      setLeft(config.left);
    }, ARK_ENTER_MS);

    schedule(() => {
      startFrameLoop(ARK_WALK_SPRITE.frames, ARK_WALK_SPRITE.intervalMs);
      setPhase("exit");
      setLeft(config.left);
      schedule(() => setLeft(ARK_EXIT_LEFT), 40);
    }, ARK_ENTER_MS + actionMs);

    schedule(() => {
      clearAnimationTimers();
      setPhase(null);
      setFrame(0);
      setLeft(ARK_EXIT_LEFT);
      hasRunRef.current = false;
    }, ARK_ENTER_MS + actionMs + ARK_EXIT_MS + 80);

    return () => {
      clearAnimationTimers();
    };
  }, [trigger, config]);

  if (!phase) return null;

  const sprite = phase === "action" ? config : ARK_WALK_SPRITE;
  const frameWidth = sprite.sheetWidth / sprite.frames;
  const scale = sprite.renderWidth / frameWidth;
  const renderHeight = Math.round(sprite.sheetHeight * scale);
  const transition = phase === "action" ? undefined : `left ${phase === "enter" ? ARK_ENTER_MS : ARK_EXIT_MS}ms ease-in-out`;
  const isExit = phase === "exit";

  return (
    <div
      style={{
        position: "absolute",
        left,
        bottom: config.bottom,
        transform: `translateX(-50%)${isExit ? " scaleX(-1)" : ""}`,
        transition,
        width: sprite.renderWidth,
        height: renderHeight,
        overflow: "hidden",
        imageRendering: "pixelated",
        zIndex: 10,
        pointerEvents: "none",
      }}
    >
      <img
        src={sprite.src}
        alt="Rootsman"
        style={{
          position: "absolute",
          top: 0,
          left: -frame * frameWidth * scale,
          width: sprite.sheetWidth * scale,
          height: sprite.sheetHeight * scale,
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
}

export default function RewardMapAction({ trigger, action }: RewardMapActionProps) {
  if (action === "gardenWater") return <RootsMan trigger={trigger} />;
  const config = ARK_SPRITES[action];
  if (!config) return null;
  return <ArkSpriteAction trigger={trigger} config={config} />;
}

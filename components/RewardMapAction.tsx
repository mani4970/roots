"use client";
import { useEffect, useRef, useState } from "react";
import RootsMan from "./RootsMan";
import type { RewardMapActionKind } from "@/lib/rewardMaps";

interface RewardMapActionProps {
  trigger: boolean;
  action: RewardMapActionKind;
}

type ArkSpriteSheet = {
  src: string;
  frames: number;
  sheetWidth: number;
  sheetHeight: number;
  renderWidth: number;
  intervalMs: number;
};

type ArkMotionConfig = {
  enterFrom: string;
  actionLeft: string;
  exitTo: string;
  bottom: string;
  enterMs: number;
  exitMs: number;
  actionLoops: number;
  actionPauseMs?: number;
  enterSprite: ArkSpriteSheet;
  actionSprite: ArkSpriteSheet;
  exitSprite: ArkSpriteSheet;
  enterFlip?: boolean;
  actionFlip?: boolean;
  exitFlip?: boolean;
};

type ArkPhase = "enter" | "action" | "exit";

const ARK_WALK_SPRITE: ArkSpriteSheet = {
  src: "/images/reward-maps/peace-ark/sprites/rootsman_walk_sheet.png",
  frames: 6,
  sheetWidth: 2172,
  sheetHeight: 724,
  renderWidth: 46,
  intervalMs: 160,
};

const ARK_CARRY_WOOD_SPRITE: ArkSpriteSheet = {
  src: "/images/reward-maps/peace-ark/sprites/rootsman_carry_wood_walk_sheet.png",
  frames: 6,
  sheetWidth: 1916,
  sheetHeight: 821,
  renderWidth: 50,
  intervalMs: 165,
};

const ARK_HAMMER_SPRITE: ArkSpriteSheet = {
  src: "/images/reward-maps/peace-ark/sprites/rootsman_hammer_sheet.png",
  frames: 6,
  sheetWidth: 2172,
  sheetHeight: 724,
  renderWidth: 50,
  intervalMs: 220,
};

const ARK_WAVE_BIRD_SPRITE: ArkSpriteSheet = {
  src: "/images/reward-maps/peace-ark/sprites/rootsman_wave_bird_sheet.png",
  frames: 4,
  sheetWidth: 1802,
  sheetHeight: 872,
  renderWidth: 52,
  intervalMs: 260,
};

const ARK_PRAY_SPRITE: ArkSpriteSheet = {
  src: "/images/reward-maps/peace-ark/sprites/rootsman_pray_kneel_sheet.png",
  frames: 4,
  sheetWidth: 1881,
  sheetHeight: 836,
  renderWidth: 52,
  intervalMs: 300,
};

const ARK_MOTION_CONFIGS: Partial<Record<RewardMapActionKind, ArkMotionConfig>> = {
  arkCarryWood: {
    enterFrom: "104%",
    actionLeft: "49%",
    exitTo: "104%",
    bottom: "11%",
    enterMs: 2400,
    exitMs: 2100,
    actionLoops: 1,
    actionPauseMs: 520,
    enterSprite: ARK_CARRY_WOOD_SPRITE,
    actionSprite: ARK_WALK_SPRITE,
    exitSprite: ARK_WALK_SPRITE,
    exitFlip: true,
  },
  arkHammer: {
    enterFrom: "104%",
    actionLeft: "50%",
    exitTo: "104%",
    bottom: "12%",
    enterMs: 2300,
    exitMs: 2050,
    actionLoops: 4,
    enterSprite: ARK_WALK_SPRITE,
    actionSprite: ARK_HAMMER_SPRITE,
    exitSprite: ARK_WALK_SPRITE,
    exitFlip: true,
  },
  arkWaveBird: {
    enterFrom: "71%",
    actionLeft: "62%",
    exitTo: "71%",
    bottom: "57%",
    enterMs: 1300,
    exitMs: 1200,
    actionLoops: 5,
    enterSprite: ARK_WALK_SPRITE,
    actionSprite: ARK_WAVE_BIRD_SPRITE,
    exitSprite: ARK_WALK_SPRITE,
    exitFlip: true,
  },
  arkPray: {
    enterFrom: "18%",
    actionLeft: "34%",
    exitTo: "18%",
    bottom: "12%",
    enterMs: 1600,
    exitMs: 1500,
    actionLoops: 5,
    enterSprite: ARK_WALK_SPRITE,
    actionSprite: ARK_PRAY_SPRITE,
    exitSprite: ARK_WALK_SPRITE,
    enterFlip: true,
  },
};

function ArkSpriteAction({ trigger, config }: { trigger: boolean; config: ArkMotionConfig }) {
  const [phase, setPhase] = useState<ArkPhase | null>(null);
  const [frame, setFrame] = useState(0);
  const [left, setLeft] = useState(config.enterFrom);
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

  function startFrameLoop(sprite: ArkSpriteSheet, loop = true) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    let tick = 0;
    setFrame(0);
    intervalRef.current = setInterval(() => {
      tick += 1;
      setFrame(loop ? tick % sprite.frames : Math.min(tick, sprite.frames - 1));
    }, sprite.intervalMs);
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
      setLeft(config.enterFrom);
      return;
    }

    if (hasRunRef.current) return;
    hasRunRef.current = true;
    clearAnimationTimers();

    const actionMs = config.actionPauseMs ?? config.actionSprite.frames * config.actionLoops * config.actionSprite.intervalMs;

    setPhase("enter");
    setLeft(config.enterFrom);
    startFrameLoop(config.enterSprite);
    schedule(() => setLeft(config.actionLeft), 40);

    schedule(() => {
      setPhase("action");
      setLeft(config.actionLeft);
      startFrameLoop(config.actionSprite, !config.actionPauseMs);
    }, config.enterMs);

    schedule(() => {
      setPhase("exit");
      setLeft(config.actionLeft);
      startFrameLoop(config.exitSprite);
      schedule(() => setLeft(config.exitTo), 40);
    }, config.enterMs + actionMs);

    schedule(() => {
      clearAnimationTimers();
      setPhase(null);
      setFrame(0);
      setLeft(config.enterFrom);
      hasRunRef.current = false;
    }, config.enterMs + actionMs + config.exitMs + 120);

    return () => {
      clearAnimationTimers();
    };
  }, [trigger, config]);

  if (!phase) return null;

  const sprite = phase === "enter" ? config.enterSprite : phase === "action" ? config.actionSprite : config.exitSprite;
  const frameWidth = sprite.sheetWidth / sprite.frames;
  const scale = sprite.renderWidth / frameWidth;
  const renderHeight = Math.round(sprite.sheetHeight * scale);
  const transition = phase === "action" ? undefined : `left ${phase === "enter" ? config.enterMs : config.exitMs}ms ease-in-out`;
  const shouldFlip = phase === "enter" ? config.enterFlip : phase === "action" ? config.actionFlip : config.exitFlip;

  return (
    <div
      style={{
        position: "absolute",
        left,
        bottom: config.bottom,
        transform: `translateX(-50%)${shouldFlip ? " scaleX(-1)" : ""}`,
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
  const config = ARK_MOTION_CONFIGS[action];
  if (!config) return null;
  return <ArkSpriteAction trigger={trigger} config={config} />;
}

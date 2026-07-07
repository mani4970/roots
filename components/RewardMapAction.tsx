"use client";
import { useEffect, useRef, useState } from "react";
import RootsMan from "./RootsMan";
import type { RewardMapActionKind } from "@/lib/rewardMaps";
import { normalizeRootsAvatarType, type RootsAvatarType } from "@/lib/avatar";

interface RewardMapActionProps {
  trigger: boolean;
  action: RewardMapActionKind;
  avatarType?: RootsAvatarType | null;
}

type ArkSpriteSheet = {
  src: string;
  frames: number;
  sheetWidth: number;
  sheetHeight: number;
  frameWidthPx?: number;
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

type ArkSpriteSet = {
  walk: ArkSpriteSheet;
  carryWood: ArkSpriteSheet;
  hammer: ArkSpriteSheet;
  waveBird: ArkSpriteSheet;
  pray: ArkSpriteSheet;
  deckWalk: ArkSpriteSheet;
};

const ROOTSMAN_ARK_WALK_SPRITE: ArkSpriteSheet = {
  src: "/images/reward-maps/peace-ark/sprites/rootsman_walk_sheet.png",
  frames: 6,
  sheetWidth: 2172,
  sheetHeight: 724,
  renderWidth: 38,
  intervalMs: 280,
};

const ROOTSMAN_ARK_CARRY_WOOD_SPRITE: ArkSpriteSheet = {
  src: "/images/reward-maps/peace-ark/sprites/rootsman_carry_wood_walk_sheet_clean.png",
  frames: 6,
  sheetWidth: 2160,
  sheetHeight: 821,
  frameWidthPx: 360,
  // The rebuilt Rootsman carry-wood art is slightly smaller than the regular walk sprite.
  // Keep this adjustment local to Rootsman so Rootswoman's already-matched ark scale is unchanged.
  renderWidth: 44,
  intervalMs: 310,
};

const ROOTSMAN_ARK_HAMMER_SPRITE: ArkSpriteSheet = {
  src: "/images/reward-maps/peace-ark/sprites/rootsman_hammer_sheet.png",
  frames: 6,
  sheetWidth: 2172,
  sheetHeight: 724,
  renderWidth: 40,
  intervalMs: 340,
};

const ROOTSMAN_ARK_WAVE_BIRD_SPRITE: ArkSpriteSheet = {
  src: "/images/reward-maps/peace-ark/sprites/rootsman_wave_bird_sheet.png",
  frames: 4,
  sheetWidth: 1802,
  sheetHeight: 872,
  frameWidthPx: 450.5,
  renderWidth: 34,
  intervalMs: 420,
};

const ROOTSMAN_ARK_PRAY_SPRITE: ArkSpriteSheet = {
  src: "/images/reward-maps/peace-ark/sprites/rootsman_pray_kneel_sheet.png",
  frames: 4,
  sheetWidth: 1881,
  sheetHeight: 836,
  frameWidthPx: 470.25,
  renderWidth: 34,
  intervalMs: 450,
};

const ROOTSWOMAN_ARK_WALK_SPRITE: ArkSpriteSheet = {
  src: "/images/reward-maps/peace-ark/sprites/rootswoman_walk_sheet.webp",
  frames: 6,
  sheetWidth: 2172,
  sheetHeight: 724,
  renderWidth: 38,
  intervalMs: 280,
};

const ROOTSWOMAN_ARK_CARRY_WOOD_SPRITE: ArkSpriteSheet = {
  src: "/images/reward-maps/peace-ark/sprites/rootswoman_carry_wood_walk_sheet_clean.webp",
  frames: 6,
  sheetWidth: 2160,
  sheetHeight: 821,
  frameWidthPx: 360,
  renderWidth: 40,
  intervalMs: 310,
};

const ROOTSWOMAN_ARK_HAMMER_SPRITE: ArkSpriteSheet = {
  src: "/images/reward-maps/peace-ark/sprites/rootswoman_hammer_sheet.webp",
  frames: 6,
  sheetWidth: 2172,
  sheetHeight: 724,
  renderWidth: 40,
  intervalMs: 340,
};

const ROOTSWOMAN_ARK_WAVE_BIRD_SPRITE: ArkSpriteSheet = {
  src: "/images/reward-maps/peace-ark/sprites/rootswoman_wave_bird_sheet.webp",
  frames: 4,
  sheetWidth: 1802,
  sheetHeight: 872,
  frameWidthPx: 450.5,
  renderWidth: 34,
  intervalMs: 420,
};

const ROOTSWOMAN_ARK_PRAY_SPRITE: ArkSpriteSheet = {
  src: "/images/reward-maps/peace-ark/sprites/rootswoman_pray_kneel_sheet.webp",
  frames: 4,
  sheetWidth: 1881,
  sheetHeight: 836,
  frameWidthPx: 470.25,
  renderWidth: 34,
  intervalMs: 450,
};

function makeDeckWalkSprite(walkSprite: ArkSpriteSheet): ArkSpriteSheet {
  return {
    ...walkSprite,
    renderWidth: 32,
    intervalMs: 300,
  };
}

const ROOTSMAN_ARK_SPRITES: ArkSpriteSet = {
  walk: ROOTSMAN_ARK_WALK_SPRITE,
  carryWood: ROOTSMAN_ARK_CARRY_WOOD_SPRITE,
  hammer: ROOTSMAN_ARK_HAMMER_SPRITE,
  waveBird: ROOTSMAN_ARK_WAVE_BIRD_SPRITE,
  pray: ROOTSMAN_ARK_PRAY_SPRITE,
  deckWalk: makeDeckWalkSprite(ROOTSMAN_ARK_WALK_SPRITE),
};

const ROOTSWOMAN_ARK_SPRITES: ArkSpriteSet = {
  walk: ROOTSWOMAN_ARK_WALK_SPRITE,
  carryWood: ROOTSWOMAN_ARK_CARRY_WOOD_SPRITE,
  hammer: ROOTSWOMAN_ARK_HAMMER_SPRITE,
  waveBird: ROOTSWOMAN_ARK_WAVE_BIRD_SPRITE,
  pray: ROOTSWOMAN_ARK_PRAY_SPRITE,
  deckWalk: makeDeckWalkSprite(ROOTSWOMAN_ARK_WALK_SPRITE),
};

function createArkMotionConfigs(sprites: ArkSpriteSet): Partial<Record<RewardMapActionKind, ArkMotionConfig>> {
  return {
    arkCarryWood: {
      enterFrom: "104%",
      actionLeft: "58%",
      exitTo: "104%",
      bottom: "7%",
      enterMs: 4600,
      exitMs: 4200,
      actionLoops: 1,
      actionPauseMs: 520,
      enterSprite: sprites.carryWood,
      actionSprite: sprites.walk,
      exitSprite: sprites.walk,
      exitFlip: true,
    },
    arkHammer: {
      enterFrom: "104%",
      actionLeft: "57%",
      exitTo: "104%",
      bottom: "7%",
      enterMs: 4400,
      exitMs: 4000,
      actionLoops: 4,
      enterSprite: sprites.walk,
      actionSprite: sprites.hammer,
      exitSprite: sprites.walk,
      exitFlip: true,
    },
    arkWaveBird: {
      enterFrom: "76%",
      actionLeft: "66%",
      exitTo: "76%",
      bottom: "39%",
      enterMs: 2600,
      exitMs: 2300,
      actionLoops: 5,
      enterSprite: sprites.deckWalk,
      actionSprite: sprites.waveBird,
      exitSprite: sprites.deckWalk,
      exitFlip: true,
    },
    arkPray: {
      enterFrom: "72%",
      actionLeft: "57%",
      exitTo: "72%",
      bottom: "10%",
      enterMs: 2700,
      exitMs: 2400,
      actionLoops: 5,
      enterSprite: sprites.deckWalk,
      actionSprite: sprites.pray,
      exitSprite: sprites.deckWalk,
      exitFlip: true,
    },
  };
}

const ROOTSMAN_ARK_MOTION_CONFIGS = createArkMotionConfigs(ROOTSMAN_ARK_SPRITES);
const ROOTSWOMAN_ARK_MOTION_CONFIGS = createArkMotionConfigs(ROOTSWOMAN_ARK_SPRITES);

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
      // React Strict Mode can run effect cleanup once before re-running the effect.
      // Reset this guard so replayed ark animations can start again cleanly.
      hasRunRef.current = false;
    };
  }, [trigger, config]);

  if (!phase) return null;

  const sprite = phase === "enter" ? config.enterSprite : phase === "action" ? config.actionSprite : config.exitSprite;
  const frameWidth = sprite.frameWidthPx ?? sprite.sheetWidth / sprite.frames;
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

export default function RewardMapAction({ trigger, action, avatarType }: RewardMapActionProps) {
  if (action === "gardenWater") return <RootsMan trigger={trigger} avatarType={avatarType} />;

  const normalizedAvatarType = normalizeRootsAvatarType(avatarType);
  const configs = normalizedAvatarType === "rootswoman" ? ROOTSWOMAN_ARK_MOTION_CONFIGS : ROOTSMAN_ARK_MOTION_CONFIGS;
  const config = configs[action];

  if (!config) return null;
  return <ArkSpriteAction trigger={trigger} config={config} />;
}

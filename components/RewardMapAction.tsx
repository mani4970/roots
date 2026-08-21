"use client";
import { useEffect, useRef, useState } from "react";
import RewardMapSpritePlayer, { type RewardMapSpriteSheet } from "./RewardMapSpritePlayer";
import RewardMapWalkActor from "./RewardMapWalkActor";
import RootsMan from "./RootsMan";
import NehemiahWallAction from "./NehemiahWallAction";
import type { RewardMapActionKind } from "@/lib/rewardMaps";
import type { NehemiahWallActionKind } from "@/lib/nehemiahWall";
import { normalizeRootsAvatarType, type RootsAvatarType } from "@/lib/avatar";

interface RewardMapActionProps {
  trigger: boolean;
  action: RewardMapActionKind;
  avatarType?: RootsAvatarType | null;
  nehemiahAction?: NehemiahWallActionKind;
}

type ArkSpriteSheet = RewardMapSpriteSheet;

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
  intervalMs: 135,
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
  intervalMs: 135,
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
    intervalMs: 150,
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
      actionLoops: 2,
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

function ArkSpriteAction({
  trigger,
  config,
  avatarType,
}: {
  trigger: boolean;
  config: ArkMotionConfig;
  avatarType: RootsAvatarType;
}) {
  const [phase, setPhase] = useState<ArkPhase | null>(null);
  const [positionX, setPositionX] = useState(config.enterFrom);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hasRunRef = useRef(false);

  function clearAnimationTimers() {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current = [];
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
      setPositionX(config.enterFrom);
      return;
    }

    if (hasRunRef.current) return;
    hasRunRef.current = true;
    clearAnimationTimers();

    const actionMs = config.actionPauseMs ?? config.actionSprite.frames * config.actionLoops * config.actionSprite.intervalMs;

    setPhase("enter");
    setPositionX(config.enterFrom);
    schedule(() => setPositionX(config.actionLeft), 40);

    schedule(() => {
      setPhase("action");
      setPositionX(config.actionLeft);
    }, config.enterMs);

    schedule(() => {
      setPhase("exit");
      setPositionX(config.actionLeft);
      schedule(() => setPositionX(config.exitTo), 40);
    }, config.enterMs + actionMs);

    schedule(() => {
      clearAnimationTimers();
      setPhase(null);
      setPositionX(config.enterFrom);
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
  const shouldFlip = phase === "enter" ? config.enterFlip : phase === "action" ? config.actionFlip : config.exitFlip;
  const actionLoops = Math.max(1, config.actionLoops);
  const spriteLoops = phase === "action" && !config.actionPauseMs ? actionLoops : undefined;
  const spriteLoop = phase !== "action" || !config.actionPauseMs;
  const moveDuration = phase === "enter" ? config.enterMs : phase === "exit" ? config.exitMs : 0;
  const isGenericMovingWalk =
    phase !== "action" &&
    (sprite.src.endsWith("/rootsman_walk_sheet.png") ||
      sprite.src.endsWith("/rootswoman_walk_sheet.webp"));

  if (isGenericMovingWalk) {
    return (
      <RewardMapWalkActor
        avatarType={avatarType}
        fromX={phase === "enter" ? config.enterFrom : config.actionLeft}
        toX={phase === "enter" ? config.actionLeft : config.exitTo}
        durationMs={moveDuration}
        bottom={config.bottom}
        renderWidth={sprite.renderWidth}
        flip={Boolean(shouldFlip)}
        alt="Roots"
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        transform: `translate3d(${positionX}, 0, 0)`,
        transition: phase === "action" ? undefined : `transform ${moveDuration}ms linear`,
        willChange: "transform",
        backfaceVisibility: "hidden",
        zIndex: 10,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: config.bottom,
          transform: `translate3d(-50%, 0, 0)${shouldFlip ? " scaleX(-1)" : ""}`,
          transformOrigin: "center bottom",
          imageRendering: "pixelated",
          backfaceVisibility: "hidden",
          pointerEvents: "none",
        }}
      >
        <RewardMapSpritePlayer
          key={`${phase}-${sprite.src}`}
          sprite={sprite}
          alt="Roots"
          loop={spriteLoop}
          loops={spriteLoops}
        />
      </div>
    </div>
  );
}

export default function RewardMapAction({ trigger, action, avatarType, nehemiahAction }: RewardMapActionProps) {
  if (action === "gardenWater") return <RootsMan trigger={trigger} avatarType={avatarType} />;
  if (action === "nehemiah") {
    if (!nehemiahAction) return null;
    return <NehemiahWallAction trigger={trigger} action={nehemiahAction} avatarType={avatarType} />;
  }

  const normalizedAvatarType = normalizeRootsAvatarType(avatarType);
  const configs = normalizedAvatarType === "rootswoman" ? ROOTSWOMAN_ARK_MOTION_CONFIGS : ROOTSMAN_ARK_MOTION_CONFIGS;
  const config = configs[action];

  if (!config) return null;
  return <ArkSpriteAction trigger={trigger} config={config} avatarType={normalizedAvatarType} />;
}

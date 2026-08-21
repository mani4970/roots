"use client";

import { useEffect, useRef, useState } from "react";
import { normalizeRootsAvatarType, type RootsAvatarType } from "@/lib/avatar";
import type { NehemiahWallActionKind } from "@/lib/nehemiahWall";

type SpriteSheet = {
  src: string;
  frames: number;
  sheetWidth: number;
  sheetHeight: number;
  renderWidth: number;
  intervalMs: number;
  bottomOffsetPx?: number;
};

type MotionConfig = {
  mode?: "sequence" | "walkThrough";
  enterSprite: SpriteSheet;
  actionSprite?: SpriteSheet;
  exitSprite?: SpriteSheet;
  enterMs?: number;
  exitMs?: number;
  walkThroughMs?: number;
  actionLoops?: number;
  actionHoldMs?: number;
  actionLoop?: boolean;
  exitTo?: string;
  exitFlip?: boolean;
};

type Phase = "enter" | "action" | "exit";

type AvatarSpriteSet = {
  walk: SpriteSheet;
  pray: SpriteSheet;
  hammer: SpriteSheet;
  letter: SpriteSheet;
  lanternWalk: SpriteSheet;
  carryStone: SpriteSheet;
  placeStone: SpriteSheet;
  wave: SpriteSheet;
  listenNod: SpriteSheet;
  tambourine: SpriteSheet;
};

const ENTER_FROM = "104%";
const ACTION_LEFT = "57%";
const EXIT_LEFT = "-12%";
const EXIT_RIGHT = "104%";
const GROUND_BOTTOM = "7%";
const ENTER_MS = 4300;
const EXIT_MS = 5400;
const WALK_THROUGH_MS = 9000;

const ROOTSMAN_SPRITES: AvatarSpriteSet = {
  walk: {
    src: "/images/reward-maps/peace-ark/sprites/rootsman_walk_sheet.png",
    frames: 6,
    sheetWidth: 2172,
    sheetHeight: 724,
    renderWidth: 38,
    intervalMs: 280,
  },
  pray: {
    src: "/images/reward-maps/peace-ark/sprites/rootsman_pray_kneel_sheet.png",
    frames: 4,
    sheetWidth: 1881,
    sheetHeight: 836,
    renderWidth: 34,
    intervalMs: 450,
    bottomOffsetPx: 4,
  },
  hammer: {
    src: "/images/reward-maps/peace-ark/sprites/rootsman_hammer_sheet.png",
    frames: 6,
    sheetWidth: 2172,
    sheetHeight: 724,
    renderWidth: 40,
    intervalMs: 340,
    bottomOffsetPx: -4,
  },
  letter: {
    src: "/images/reward-maps/nehemiah-wall/sprites/rootsman_sealed_letter_sheet.png",
    frames: 6,
    sheetWidth: 3600,
    sheetHeight: 724,
    renderWidth: 81,
    intervalMs: 320,
    bottomOffsetPx: -12,
  },
  lanternWalk: {
    src: "/images/reward-maps/nehemiah-wall/sprites/rootsman_lantern_walk_sheet.png",
    frames: 6,
    sheetWidth: 3600,
    sheetHeight: 724,
    renderWidth: 81,
    intervalMs: 300,
    bottomOffsetPx: -12,
  },
  carryStone: {
    src: "/images/reward-maps/nehemiah-wall/sprites/rootsman_carry_stone_sheet.png",
    frames: 6,
    sheetWidth: 2048,
    sheetHeight: 411,
    renderWidth: 85,
    intervalMs: 300,
    bottomOffsetPx: -5,
  },
  placeStone: {
    src: "/images/reward-maps/nehemiah-wall/sprites/rootsman_place_stone_sheet.png",
    frames: 6,
    sheetWidth: 2048,
    sheetHeight: 411,
    renderWidth: 98,
    intervalMs: 320,
    bottomOffsetPx: -8,
  },
  wave: {
    src: "/images/reward-maps/nehemiah-wall/sprites/rootsman_wave_sheet.png",
    frames: 4,
    sheetWidth: 800,
    sheetHeight: 180,
    renderWidth: 71,
    intervalMs: 360,
    bottomOffsetPx: 6,
  },
  listenNod: {
    src: "/images/reward-maps/nehemiah-wall/sprites/rootsman_listen_nod_sheet.png",
    frames: 6,
    sheetWidth: 1200,
    sheetHeight: 180,
    renderWidth: 71,
    intervalMs: 360,
    bottomOffsetPx: 6,
  },
  tambourine: {
    src: "/images/reward-maps/nehemiah-wall/sprites/rootsman_tambourine_sheet.png",
    frames: 6,
    sheetWidth: 1200,
    sheetHeight: 180,
    renderWidth: 71,
    intervalMs: 300,
    bottomOffsetPx: 6,
  },
};

const ROOTSWOMAN_SPRITES: AvatarSpriteSet = {
  walk: {
    src: "/images/reward-maps/peace-ark/sprites/rootswoman_walk_sheet.webp",
    frames: 6,
    sheetWidth: 2172,
    sheetHeight: 724,
    renderWidth: 38,
    intervalMs: 280,
  },
  pray: {
    src: "/images/reward-maps/peace-ark/sprites/rootswoman_pray_kneel_sheet.webp",
    frames: 4,
    sheetWidth: 1881,
    sheetHeight: 836,
    renderWidth: 34,
    intervalMs: 450,
    bottomOffsetPx: 7,
  },
  hammer: {
    src: "/images/reward-maps/peace-ark/sprites/rootswoman_hammer_sheet.webp",
    frames: 6,
    sheetWidth: 2172,
    sheetHeight: 724,
    renderWidth: 40,
    intervalMs: 340,
    bottomOffsetPx: -2,
  },
  letter: {
    src: "/images/reward-maps/nehemiah-wall/sprites/rootswoman_sealed_letter_sheet.png",
    frames: 6,
    sheetWidth: 3600,
    sheetHeight: 724,
    renderWidth: 87,
    intervalMs: 320,
    bottomOffsetPx: -14,
  },
  lanternWalk: {
    src: "/images/reward-maps/nehemiah-wall/sprites/rootswoman_lantern_walk_sheet.png",
    frames: 6,
    sheetWidth: 3600,
    sheetHeight: 724,
    renderWidth: 87,
    intervalMs: 300,
    bottomOffsetPx: -14,
  },
  carryStone: {
    src: "/images/reward-maps/nehemiah-wall/sprites/rootswoman_carry_stone_sheet.png",
    frames: 6,
    sheetWidth: 3600,
    sheetHeight: 724,
    renderWidth: 75,
    intervalMs: 300,
    bottomOffsetPx: -1,
  },
  placeStone: {
    src: "/images/reward-maps/nehemiah-wall/sprites/rootswoman_place_stone_sheet.png",
    frames: 6,
    sheetWidth: 3600,
    sheetHeight: 724,
    renderWidth: 87,
    intervalMs: 320,
    bottomOffsetPx: -4,
  },
  wave: {
    src: "/images/reward-maps/nehemiah-wall/sprites/rootswoman_wave_sheet.png",
    frames: 4,
    sheetWidth: 800,
    sheetHeight: 180,
    renderWidth: 62,
    intervalMs: 360,
    bottomOffsetPx: 9,
  },
  listenNod: {
    src: "/images/reward-maps/nehemiah-wall/sprites/rootswoman_listen_nod_sheet.png",
    frames: 6,
    sheetWidth: 1200,
    sheetHeight: 180,
    renderWidth: 65,
    intervalMs: 360,
    bottomOffsetPx: 9,
  },
  tambourine: {
    src: "/images/reward-maps/nehemiah-wall/sprites/rootswoman_tambourine_sheet.png",
    frames: 6,
    sheetWidth: 1200,
    sheetHeight: 180,
    renderWidth: 64,
    intervalMs: 300,
    bottomOffsetPx: 9,
  },
};

function getMotionConfig(action: NehemiahWallActionKind, sprites: AvatarSpriteSet): MotionConfig {
  if (action === "walkThrough") {
    return {
      mode: "walkThrough",
      enterSprite: sprites.walk,
      walkThroughMs: WALK_THROUGH_MS,
      exitTo: EXIT_LEFT,
      exitFlip: false,
    };
  }

  if (action === "lanternWalkThrough") {
    return {
      mode: "walkThrough",
      enterSprite: sprites.lanternWalk,
      walkThroughMs: WALK_THROUGH_MS,
      exitTo: EXIT_LEFT,
      exitFlip: false,
    };
  }

  if (action === "pray") {
    return {
      enterSprite: sprites.walk,
      actionSprite: sprites.pray,
      exitSprite: sprites.walk,
      actionLoops: 3,
    };
  }

  if (action === "sealedLetter") {
    return {
      enterSprite: sprites.walk,
      actionSprite: sprites.letter,
      exitSprite: sprites.walk,
      actionLoops: 1,
      actionLoop: false,
      actionHoldMs: 900,
    };
  }

  if (action === "carryStone") {
    return {
      enterSprite: sprites.carryStone,
      actionSprite: sprites.placeStone,
      exitSprite: sprites.walk,
      actionLoops: 1,
      actionLoop: false,
      actionHoldMs: 520,
    };
  }

  if (action === "hammer") {
    return {
      enterSprite: sprites.walk,
      actionSprite: sprites.hammer,
      exitSprite: sprites.walk,
      actionLoops: 4,
    };
  }

  if (action === "wave") {
    return {
      enterSprite: sprites.walk,
      actionSprite: sprites.wave,
      exitSprite: sprites.walk,
      actionLoops: 3,
    };
  }

  if (action === "listenNod") {
    return {
      enterSprite: sprites.walk,
      actionSprite: sprites.listenNod,
      exitSprite: sprites.walk,
      // The approved Nehemiah motion is two attentive nod cycles before leaving.
      actionLoops: 2,
    };
  }

  return {
    enterSprite: sprites.walk,
    actionSprite: sprites.tambourine,
    exitSprite: sprites.walk,
    actionLoops: action === "tambourineLong" ? 7 : 4,
  };
}

interface NehemiahWallActionProps {
  trigger: boolean;
  action: NehemiahWallActionKind;
  avatarType?: RootsAvatarType | null;
  replayToken?: number | string;
  showGuides?: boolean;
}

export default function NehemiahWallAction({
  trigger,
  action,
  avatarType,
  replayToken = 0,
  showGuides = false,
}: NehemiahWallActionProps) {
  const normalizedAvatarType = normalizeRootsAvatarType(avatarType);
  const sprites = normalizedAvatarType === "rootswoman" ? ROOTSWOMAN_SPRITES : ROOTSMAN_SPRITES;
  const config = getMotionConfig(action, sprites);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [frame, setFrame] = useState(0);
  const [left, setLeft] = useState(ENTER_FROM);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearAnimation() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    timersRef.current.forEach(timer => clearTimeout(timer));
    timersRef.current = [];
  }

  function schedule(callback: () => void, delay: number) {
    const timer = setTimeout(callback, delay);
    timersRef.current.push(timer);
  }

  function startFrames(sprite: SpriteSheet, loop: boolean) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setFrame(0);
    let tick = 0;
    intervalRef.current = setInterval(() => {
      tick += 1;
      setFrame(loop ? tick % sprite.frames : Math.min(tick, sprite.frames - 1));
    }, sprite.intervalMs);
  }

  useEffect(() => {
    clearAnimation();
    setPhase(null);
    setFrame(0);
    setLeft(ENTER_FROM);

    if (!trigger) return () => clearAnimation();

    if (config.mode === "walkThrough") {
      const duration = config.walkThroughMs ?? WALK_THROUGH_MS;
      setPhase("enter");
      startFrames(config.enterSprite, true);
      schedule(() => setLeft(config.exitTo ?? EXIT_LEFT), 60);
      schedule(() => {
        clearAnimation();
        setPhase(null);
      }, duration + 140);
      return () => clearAnimation();
    }

    const actionSprite = config.actionSprite;
    const exitSprite = config.exitSprite;
    if (!actionSprite || !exitSprite) return () => clearAnimation();

    const enterMs = config.enterMs ?? ENTER_MS;
    const exitMs = config.exitMs ?? EXIT_MS;
    const actionLoops = Math.max(1, config.actionLoops ?? 1);
    const actionLoop = config.actionLoop ?? actionLoops > 1;
    const actionMs = actionSprite.frames * actionSprite.intervalMs * actionLoops + (config.actionHoldMs ?? 0);

    setPhase("enter");
    startFrames(config.enterSprite, true);
    schedule(() => setLeft(ACTION_LEFT), 60);

    schedule(() => {
      setPhase("action");
      setLeft(ACTION_LEFT);
      startFrames(actionSprite, actionLoop);
    }, enterMs);

    schedule(() => {
      setPhase("exit");
      setFrame(0);
      startFrames(exitSprite, true);
      schedule(() => setLeft(config.exitTo ?? EXIT_RIGHT), 60);
    }, enterMs + actionMs);

    schedule(() => {
      clearAnimation();
      setPhase(null);
      setFrame(0);
      setLeft(ENTER_FROM);
    }, enterMs + actionMs + exitMs + 160);

    return () => clearAnimation();
  }, [trigger, action, normalizedAvatarType, replayToken]);

  if (!phase) {
    return showGuides ? <MotionGuides /> : null;
  }

  const sprite = phase === "enter" ? config.enterSprite : phase === "action" ? config.actionSprite! : config.exitSprite!;
  const frameWidth = sprite.sheetWidth / sprite.frames;
  const scale = sprite.renderWidth / frameWidth;
  const renderHeight = Math.round(sprite.sheetHeight * scale);
  const moveDuration = config.mode === "walkThrough"
    ? config.walkThroughMs ?? WALK_THROUGH_MS
    : phase === "enter"
      ? config.enterMs ?? ENTER_MS
      : phase === "exit"
        ? config.exitMs ?? EXIT_MS
        : 0;

  return (
    <>
      {showGuides && <MotionGuides />}
      <div
        data-nehemiah-phase={phase}
        style={{
          position: "absolute",
          left,
          bottom: `calc(${GROUND_BOTTOM} + ${sprite.bottomOffsetPx ?? 0}px)`,
          width: sprite.renderWidth,
          height: renderHeight,
          overflow: "hidden",
          transform: `translate3d(-50%, 0, 0)${phase === "exit" && (config.exitFlip ?? true) ? " scaleX(-1)" : ""}`,
          transition: phase === "action" ? undefined : `left ${moveDuration}ms linear`,
          imageRendering: "pixelated",
          backfaceVisibility: "hidden",
          willChange: "left, transform",
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        <img
          src={sprite.src}
          alt={normalizedAvatarType}
          draggable={false}
          style={{
            position: "absolute",
            top: 0,
            left: -frame * frameWidth * scale,
            width: sprite.sheetWidth * scale,
            height: sprite.sheetHeight * scale,
            maxWidth: "none",
            imageRendering: "pixelated",
            userSelect: "none",
            pointerEvents: "none",
          }}
        />
      </div>
    </>
  );
}

function MotionGuides() {
  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: ACTION_LEFT,
          top: 0,
          bottom: 0,
          borderLeft: "1px dashed rgba(224,89,72,.8)",
          zIndex: 9,
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: GROUND_BOTTOM,
          borderTop: "1px dashed rgba(75,129,224,.9)",
          zIndex: 9,
          pointerEvents: "none",
        }}
      />
    </>
  );
}

export const NEHEMIAH_ACTION_LAYOUT = {
  enterFrom: ENTER_FROM,
  actionLeft: ACTION_LEFT,
  exitLeft: EXIT_LEFT,
  exitRight: EXIT_RIGHT,
  groundBottom: GROUND_BOTTOM,
  peaceArkWalkRenderWidth: 38,
} as const;

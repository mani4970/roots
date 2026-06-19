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
  const [visible, setVisible] = useState(false);
  const [frame, setFrame] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (!trigger) {
      hasRunRef.current = false;
      setVisible(false);
      setFrame(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (hasRunRef.current) return;
    hasRunRef.current = true;
    setVisible(true);
    setFrame(0);

    let tick = 0;
    const totalTicks = config.frames * config.loopCount;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      tick += 1;
      setFrame(tick % config.frames);
      if (tick >= totalTicks) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        window.setTimeout(() => {
          setVisible(false);
          hasRunRef.current = false;
        }, 600);
      }
    }, config.intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [trigger, config]);

  if (!visible) return null;

  const frameWidth = config.sheetWidth / config.frames;
  const scale = config.renderWidth / frameWidth;
  const renderHeight = Math.round(config.sheetHeight * scale);

  return (
    <div
      style={{
        position: "absolute",
        left: config.left,
        bottom: config.bottom,
        transform: "translateX(-50%)",
        width: config.renderWidth,
        height: renderHeight,
        overflow: "hidden",
        imageRendering: "pixelated",
        zIndex: 10,
        pointerEvents: "none",
      }}
    >
      <img
        src={config.src}
        alt="Rootsman"
        style={{
          position: "absolute",
          top: 0,
          left: -frame * frameWidth * scale,
          width: config.sheetWidth * scale,
          height: config.sheetHeight * scale,
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

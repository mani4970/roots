"use client";

import HeartShopMapFriends from "@/components/HeartShopMapFriends";
import PeaceArkStaticItems from "@/components/PeaceArkStaticItems";
import type { RootsAvatarType } from "@/lib/avatar";
import type { HeartShopMapItemId } from "@/lib/heartShopItems";
import {
  getRewardMapBackground,
  getRewardMapStage,
  type RewardMapCycle,
  type RewardMapKind,
} from "@/lib/rewardMaps";

type HeartShopMapPreviewKind = Extract<
  RewardMapKind,
  "garden" | "peaceArk" | "nehemiahWall"
>;

type HeartShopMapPreviewProps = {
  cycle: RewardMapCycle;
  mapKind: HeartShopMapPreviewKind;
  label: string;
  avatarType: RootsAvatarType;
  enabledItemIds: readonly HeartShopMapItemId[];
};

function isNightTime() {
  const hour = new Date().getHours();
  return hour >= 19 || hour < 6;
}

export default function HeartShopMapPreview({
  cycle,
  mapKind,
  label,
  avatarType,
  enabledItemIds,
}: HeartShopMapPreviewProps) {
  const isNight = isNightTime();
  const stage = getRewardMapStage(cycle);
  const background = mapKind === "garden" && stage.stageNumber === 0
    ? `/images/reward-maps/garden/avatar-variants/${avatarType}/day0_${isNight ? "evening" : "morning"}.webp`
    : getRewardMapBackground(cycle, isNight);

  return (
    <div
      aria-label={label}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16 / 9",
        overflow: "hidden",
        borderRadius: 20,
        background: "var(--bg3)",
        border: "1px solid rgba(122,157,122,.22)",
        boxShadow: "0 10px 28px rgba(70,60,48,.08)",
      }}
    >
      <img
        src={background}
        alt={label}
        draggable={false}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          imageRendering: "pixelated",
          userSelect: "none",
          pointerEvents: "none",
        }}
      />

      {mapKind === "peaceArk" && (
        <PeaceArkStaticItems
          stageNumber={stage.stageNumber}
          enabledItemIds={enabledItemIds}
        />
      )}

      <HeartShopMapFriends
        itemIds={[...enabledItemIds]}
        mapKind={mapKind}
        stageNumber={stage.stageNumber}
      />

      <div
        style={{
          position: "absolute",
          top: 9,
          left: 9,
          zIndex: 6,
          borderRadius: 999,
          padding: "4px 9px",
          background: "rgba(26,28,30,.68)",
          color: "#fff",
          fontSize: 9,
          fontWeight: 900,
          backdropFilter: "blur(4px)",
        }}
      >
        {label}
      </div>
    </div>
  );
}

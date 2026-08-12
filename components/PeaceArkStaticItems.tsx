"use client";

import {
  HEART_SHOP_PEACE_ARK_STATIC_ITEM_IDS,
  isHeartShopPeaceArkStaticItemId,
  type HeartShopMapItemId,
  type HeartShopPeaceArkStaticItemId,
} from "@/lib/heartShopItems";

type PeaceArkStaticItemsProps = {
  stageNumber: number;
  enabledItemIds: readonly HeartShopMapItemId[];
};

type Placement = {
  src: string;
  left?: string;
  right?: string;
  bottom: string;
  width: string;
};

// Final placement approved in the actual 16:9 Roots preview.
// Supplies and lantern sit above the Rootsman/Rootswoman foot path; the large
// workbench stays lower and left of the hammering area.
const PLACEMENTS: Record<HeartShopPeaceArkStaticItemId, Placement> = {
  ark_supplies: {
    src: "/images/reward-maps/peace-ark/static-items/ark-supplies.webp",
    right: "20.5%",
    bottom: "16.5%",
    width: "8.85%",
  },
  ark_workbench: {
    src: "/images/reward-maps/peace-ark/static-items/ark-workbench.webp",
    left: "19.5%",
    bottom: "5.5%",
    width: "11.1%",
  },
  ark_lantern: {
    src: "/images/reward-maps/peace-ark/static-items/ark-lantern.webp",
    left: "64.5%",
    bottom: "16.5%",
    width: "4.3%",
  },
};

export default function PeaceArkStaticItems({ stageNumber, enabledItemIds }: PeaceArkStaticItemsProps) {
  // Stage 9 is the flood. Enabled state is preserved and the items return on
  // safe ground in stage 10, matching the existing map friends.
  if (stageNumber === 9) return null;

  const enabled = new Set(
    enabledItemIds.filter(isHeartShopPeaceArkStaticItemId),
  );
  if (enabled.size === 0) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 3,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {HEART_SHOP_PEACE_ARK_STATIC_ITEM_IDS.map(itemId => {
        if (!enabled.has(itemId)) return null;
        const placement = PLACEMENTS[itemId];
        return (
          <img
            key={itemId}
            src={placement.src}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              left: placement.left,
              right: placement.right,
              bottom: placement.bottom,
              width: placement.width,
              height: "auto",
              maxWidth: "none",
              userSelect: "none",
              pointerEvents: "none",
              imageRendering: "pixelated",
            }}
          />
        );
      })}
    </div>
  );
}

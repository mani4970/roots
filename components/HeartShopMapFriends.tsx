"use client";

import HeartShopFriendSprite from "@/components/HeartShopFriendSprite";
import { isHeartShopItemAvailableOnMap } from "@/lib/heartShopCatalog";
import type { HeartShopItemId } from "@/lib/heartShopText";
import type { RewardMapKind } from "@/lib/rewardMaps";

type HeartShopMapFriendsProps = {
  itemIds: HeartShopItemId[];
  mapKind: RewardMapKind;
  stageNumber: number;
};

type FriendPlacement = {
  left: string;
  bottom: string;
  renderWidth: number;
};

type GroundFriendPlacements = Record<Exclude<HeartShopItemId, "jjaekjjaek">, FriendPlacement>;

const GARDEN_GROUND_PLACEMENTS: GroundFriendPlacements = {
  // Keep every ground friend on the actual lower ground band. The back-row
  // friends use an 18% baseline for perspective, while the smaller foreground
  // friends stay between 1% and 9%. This avoids the tree canopy/sky area and
  // keeps the right-side watering path clear.
  mongsili: { left: "1%", bottom: "18%", renderWidth: 46 },
  bamtoli: { left: "18%", bottom: "18%", renderWidth: 44 },
  hindungi: { left: "4%", bottom: "1%", renderWidth: 54 },
  choko: { left: "28%", bottom: "8%", renderWidth: 58 },
  // Restore Kkumdeuli's original garden placement near the foreground soil.
  kkumdeuli: { left: "37%", bottom: "9%", renderWidth: 40 },
};

const ARK_GROUND_PLACEMENTS: GroundFriendPlacements = {
  // Ark carry/hammer/prayer actions use the lower-right half of the map. Keep
  // the friends on the real ground plane inside the left foreground safety
  // lane; the 18% row reads as the slightly farther-back ground, not the ark or
  // tree canopy.
  mongsili: { left: "1%", bottom: "18%", renderWidth: 44 },
  bamtoli: { left: "18%", bottom: "18%", renderWidth: 42 },
  hindungi: { left: "4%", bottom: "1%", renderWidth: 50 },
  choko: { left: "28%", bottom: "8%", renderWidth: 54 },
  kkumdeuli: { left: "40%", bottom: "5%", renderWidth: 34 },
};

function getGroundPlacements(mapKind: RewardMapKind) {
  return mapKind === "peaceArk" ? ARK_GROUND_PLACEMENTS : GARDEN_GROUND_PLACEMENTS;
}

function getMotionClassName(itemId: HeartShopItemId) {
  if (itemId === "hindungi") return "roots-heart-shop-dog-drift";
  if (itemId === "choko") return "roots-heart-shop-cat-drift";
  return undefined;
}

export default function HeartShopMapFriends({ itemIds, mapKind, stageNumber }: HeartShopMapFriendsProps) {
  // Ark stage 9 is the flood stage. Ownership and ON/OFF state remain unchanged;
  // the friends are only hidden until stage 10 has safe ground again.
  if (mapKind === "peaceArk" && stageNumber === 9) return null;

  const visible = new Set(itemIds.filter(itemId => isHeartShopItemAvailableOnMap(itemId, mapKind)));
  if (visible.size === 0) return null;

  const placements = getGroundPlacements(mapKind);
  const birdRenderWidth = mapKind === "peaceArk" ? 54 : 58;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 4,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <style>{`
        @keyframes roots-heart-shop-bird-travel {
          0%   { left: -22%; top: 7%; transform: scaleX(1) rotate(-2deg); }
          23%  { top: 14%; }
          47%  { left: 112%; top: 9%; transform: scaleX(1) rotate(2deg); }
          50%  { left: 112%; top: 9%; transform: scaleX(-1) rotate(-2deg); }
          73%  { top: 15%; }
          97%  { left: -22%; top: 7%; transform: scaleX(-1) rotate(2deg); }
          100% { left: -22%; top: 7%; transform: scaleX(1) rotate(-2deg); }
        }
        .roots-heart-shop-bird-travel {
          animation: roots-heart-shop-bird-travel 18s linear infinite;
          will-change: left, top, transform;
        }

        @keyframes roots-heart-shop-dog-drift {
          0%   { transform: translate3d(0, 0, 0); }
          50%  { transform: translate3d(24px, 0, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
        .roots-heart-shop-dog-drift {
          animation: roots-heart-shop-dog-drift 10.2s ease-in-out infinite;
          will-change: transform;
        }

        @keyframes roots-heart-shop-cat-drift {
          0%   { transform: translate3d(0, 0, 0); }
          50%  { transform: translate3d(-22px, 0, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
        .roots-heart-shop-cat-drift {
          animation: roots-heart-shop-cat-drift 10.8s ease-in-out infinite;
          will-change: transform;
        }

        @media (prefers-reduced-motion: reduce) {
          .roots-heart-shop-bird-travel {
            animation: none;
            left: 68% !important;
            top: 10% !important;
            transform: none !important;
          }
          .roots-heart-shop-dog-drift,
          .roots-heart-shop-cat-drift {
            animation: none;
            transform: none !important;
          }
        }
      `}</style>

      {visible.has("jjaekjjaek") && (
        <div
          className="roots-heart-shop-bird-travel"
          style={{ position: "absolute", width: birdRenderWidth, height: birdRenderWidth }}
        >
          <HeartShopFriendSprite itemId="jjaekjjaek" renderWidth={birdRenderWidth} />
        </div>
      )}

      {(Object.keys(placements) as Array<Exclude<HeartShopItemId, "jjaekjjaek">>).map(itemId => {
        if (!visible.has(itemId)) return null;
        const { renderWidth, ...position } = placements[itemId];

        return (
          <div
            key={itemId}
            className={getMotionClassName(itemId)}
            style={{
              position: "absolute",
              ...position,
            }}
          >
            <HeartShopFriendSprite itemId={itemId} renderWidth={renderWidth} />
          </div>
        );
      })}
    </div>
  );
}

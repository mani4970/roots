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

function getBamtoliPosition(stageNumber: number) {
  if (stageNumber >= 7 && stageNumber <= 8) {
    return { left: "51%", bottom: "19%" };
  }
  if (stageNumber >= 9) {
    return { left: "50%", bottom: "18%" };
  }
  return { left: "50%", bottom: "18%" };
}

function getMongsiliPosition(stageNumber: number) {
  if (stageNumber >= 7 && stageNumber <= 8) {
    // tree8/tree9 add a seed/sprout around the right-center. Keep Mongsili
    // farther right and slightly higher so the two visuals remain separate.
    return { right: "2%", bottom: "20%" };
  }
  if (stageNumber >= 9) {
    // The later garden stages add a second tree on the right. Keep Mongsili
    // in the open grass below its outer canopy, above the watering foot path.
    return { right: "1%", bottom: "19%" };
  }
  return { right: "4%", bottom: "18%" };
}

export default function HeartShopMapFriends({ itemIds, mapKind, stageNumber }: HeartShopMapFriendsProps) {
  const visible = new Set(itemIds.filter(itemId => isHeartShopItemAvailableOnMap(itemId, mapKind)));
  if (visible.size === 0) return null;

  const bamtoliPosition = getBamtoliPosition(stageNumber);
  const mongsiliPosition = getMongsiliPosition(stageNumber);

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
          0%   { left: -20%; top: 7%; transform: scaleX(1) rotate(-2deg); }
          23%  { top: 14%; }
          47%  { left: 86%; top: 9%; transform: scaleX(1) rotate(2deg); }
          50%  { left: 86%; top: 9%; transform: scaleX(-1) rotate(-2deg); }
          73%  { top: 15%; }
          97%  { left: -20%; top: 7%; transform: scaleX(-1) rotate(2deg); }
          100% { left: -20%; top: 7%; transform: scaleX(1) rotate(-2deg); }
        }
        .roots-heart-shop-bird-travel {
          animation: roots-heart-shop-bird-travel 15s linear infinite;
          will-change: left, top, transform;
        }

        @keyframes roots-heart-shop-dog-drift {
          0%   { transform: translateX(0); }
          50%  { transform: translateX(24px); }
          100% { transform: translateX(0); }
        }
        .roots-heart-shop-dog-drift {
          animation: roots-heart-shop-dog-drift 8.4s ease-in-out infinite;
          will-change: transform;
        }

        @keyframes roots-heart-shop-cat-drift {
          0%   { transform: translateX(0); }
          50%  { transform: translateX(-22px); }
          100% { transform: translateX(0); }
        }
        .roots-heart-shop-cat-drift {
          animation: roots-heart-shop-cat-drift 8.8s ease-in-out infinite;
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
          style={{ position: "absolute", width: 58, height: 58 }}
        >
          <HeartShopFriendSprite itemId="jjaekjjaek" renderWidth={58} />
        </div>
      )}

      {visible.has("hindungi") && (
        <div
          className="roots-heart-shop-dog-drift"
          style={{ position: "absolute", left: "7%", bottom: "2%" }}
        >
          <HeartShopFriendSprite itemId="hindungi" renderWidth={56} />
        </div>
      )}

      {visible.has("choko") && (
        <div
          className="roots-heart-shop-cat-drift"
          style={{
            position: "absolute",
            left: "24%",
            bottom: "14%",
          }}
        >
          <HeartShopFriendSprite itemId="choko" renderWidth={60} />
        </div>
      )}

      {visible.has("kkumdeuli") && (
        <div style={{ position: "absolute", left: "37%", bottom: "9%" }}>
          <HeartShopFriendSprite itemId="kkumdeuli" renderWidth={40} />
        </div>
      )}

      {visible.has("bamtoli") && (
        <div style={{ position: "absolute", ...bamtoliPosition }}>
          <HeartShopFriendSprite itemId="bamtoli" renderWidth={52} />
        </div>
      )}

      {visible.has("mongsili") && (
        <div style={{ position: "absolute", ...mongsiliPosition }}>
          <HeartShopFriendSprite itemId="mongsili" renderWidth={55} />
        </div>
      )}
    </div>
  );
}

"use client";

import HeartShopFriendSprite from "@/components/HeartShopFriendSprite";
import { isHeartShopItemAvailableOnMap } from "@/lib/heartShopCatalog";
import type { HeartShopMapItemId } from "@/lib/heartShopItems";
import type { RewardMapKind } from "@/lib/rewardMaps";

type HeartShopMapFriendsProps = {
  itemIds: HeartShopMapItemId[];
  mapKind: RewardMapKind;
  stageNumber: number;
};

type FriendPlacement = {
  left?: string;
  right?: string;
  bottom: string;
  renderWidth: number;
};

type MovingFriendId = "jjaekjjaek" | "nabi" | "kkangchongi" | "salgeumi";
type FixedGroundFriendId = Exclude<HeartShopMapItemId, MovingFriendId>;
type GroundFriendPlacements = Record<FixedGroundFriendId, FriendPlacement>;

const GARDEN_GROUND_PLACEMENTS: GroundFriendPlacements = {
  // Keep the moving foreground friends in their already-verified left-side lanes.
  hindungi: { left: "4%", bottom: "1%", renderWidth: 54 },
  choko: { left: "28%", bottom: "8%", renderWidth: 58 },
  kkumdeuli: { left: "37%", bottom: "9%", renderWidth: 40 },

  // Bamtoli and Mongsili sit on the right, farther-back ground row. Their
  // visible character heights are normalized to roughly Hindungi's size. The
  // pixel offsets compensate for transparent space below their actual feet.
  bamtoli: { right: "13%", bottom: "calc(23% - 14px)", renderWidth: 30 },
  mongsili: { right: "2%", bottom: "calc(23% - 12px)", renderWidth: 28 },
};

function getArkGroundPlacements(stageNumber: number): GroundFriendPlacements {
  return {
    // Move Hindungi farther onto the safe land in the final ark scene. Earlier
    // construction stages keep the existing left foreground placement.
    hindungi: { left: stageNumber === 10 ? "10%" : "4%", bottom: "1%", renderWidth: 50 },
    choko: { left: "28%", bottom: "8%", renderWidth: 54 },
    kkumdeuli: { left: "40%", bottom: "5%", renderWidth: 34 },

    // The ark action character uses the lower-right foreground. These two
    // friends stay on the higher rear ground line, so the character can pass
    // in front of them without a foot/ground collision.
    bamtoli: { right: "13%", bottom: "calc(20% - 14px)", renderWidth: 30 },
    mongsili: { right: "2%", bottom: "calc(20% - 12px)", renderWidth: 28 },
  };
}

function getGroundPlacements(mapKind: RewardMapKind, stageNumber: number) {
  return mapKind === "peaceArk" ? getArkGroundPlacements(stageNumber) : GARDEN_GROUND_PLACEMENTS;
}

function getMotionClassName(itemId: HeartShopMapItemId) {
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

  const placements = getGroundPlacements(mapKind, stageNumber);
  const birdRenderWidth = mapKind === "peaceArk" ? 43 : 46;
  const butterflyRenderWidth = mapKind === "peaceArk" ? 17 : 18;
  const rabbitRenderWidth = mapKind === "peaceArk" ? 30 : 33;
  const snailRenderWidth = mapKind === "peaceArk" ? 28 : 30;
  // Hindungi's source sheet contains transparent space below its paws. These
  // offsets put Kkangchongi's standing frames on the same visible ground line
  // while keeping its existing right-side play area unchanged.
  const rabbitBottom = mapKind === "peaceArk" ? "calc(1% + 17px)" : "calc(1% + 18px)";
  const snailBottom = mapKind === "peaceArk" ? "1%" : "3%";

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
          animation: roots-heart-shop-bird-travel 22s linear infinite;
          will-change: left, top, transform;
        }

        @keyframes roots-heart-shop-butterfly-travel {
          0%   { left: -18%; top: 45%; transform: scaleX(1) rotate(-5deg); }
          12%  { top: 36%; transform: scaleX(1) rotate(3deg); }
          24%  { top: 44%; transform: scaleX(1) rotate(-3deg); }
          36%  { top: 33%; transform: scaleX(1) rotate(4deg); }
          47%  { left: 112%; top: 29%; transform: scaleX(1) rotate(0deg); }
          50%  { left: 112%; top: 29%; transform: scaleX(-1) rotate(0deg); }
          62%  { top: 39%; transform: scaleX(-1) rotate(3deg); }
          74%  { top: 32%; transform: scaleX(-1) rotate(-3deg); }
          86%  { top: 43%; transform: scaleX(-1) rotate(4deg); }
          97%  { left: -18%; top: 45%; transform: scaleX(-1) rotate(0deg); }
          100% { left: -18%; top: 45%; transform: scaleX(1) rotate(-5deg); }
        }
        .roots-heart-shop-butterfly-travel {
          animation: roots-heart-shop-butterfly-travel 30s linear infinite;
          will-change: left, top, transform;
        }

        @keyframes roots-heart-shop-rabbit-travel {
          0%   { left: 60%; transform: scaleX(1); }
          42%  { left: 80%; transform: scaleX(1); }
          48%  { left: 80%; transform: scaleX(1); }
          50%  { left: 80%; transform: scaleX(-1); }
          92%  { left: 60%; transform: scaleX(-1); }
          98%  { left: 60%; transform: scaleX(-1); }
          100% { left: 60%; transform: scaleX(1); }
        }
        .roots-heart-shop-rabbit-travel {
          animation: roots-heart-shop-rabbit-travel 16s linear infinite;
          will-change: left, transform;
        }

        @keyframes roots-heart-shop-snail-travel {
          0%   { left: -18%; transform: scaleX(1); }
          47%  { left: 112%; transform: scaleX(1); }
          50%  { left: 112%; transform: scaleX(-1); }
          97%  { left: -18%; transform: scaleX(-1); }
          100% { left: -18%; transform: scaleX(1); }
        }
        .roots-heart-shop-snail-travel {
          animation: roots-heart-shop-snail-travel 68s linear infinite;
          will-change: left, transform;
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
          .roots-heart-shop-butterfly-travel {
            animation: none;
            left: 62% !important;
            top: 38% !important;
            transform: none !important;
          }
          .roots-heart-shop-rabbit-travel {
            animation: none;
            left: 68% !important;
            transform: none !important;
          }
          .roots-heart-shop-snail-travel {
            animation: none;
            left: 45% !important;
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

      {visible.has("nabi") && (
        <div
          className="roots-heart-shop-butterfly-travel"
          style={{ position: "absolute", width: butterflyRenderWidth, height: butterflyRenderWidth }}
        >
          <HeartShopFriendSprite itemId="nabi" renderWidth={butterflyRenderWidth} />
        </div>
      )}

      {visible.has("kkangchongi") && (
        <div
          className="roots-heart-shop-rabbit-travel"
          style={{ position: "absolute", bottom: rabbitBottom }}
        >
          <HeartShopFriendSprite itemId="kkangchongi" renderWidth={rabbitRenderWidth} />
        </div>
      )}

      {visible.has("salgeumi") && (
        <div
          className="roots-heart-shop-snail-travel"
          style={{ position: "absolute", bottom: snailBottom }}
        >
          <HeartShopFriendSprite itemId="salgeumi" renderWidth={snailRenderWidth} />
        </div>
      )}

      {(Object.keys(placements) as FixedGroundFriendId[]).map(itemId => {
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

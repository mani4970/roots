"use client";

import HeartShopFriendSprite from "@/components/HeartShopFriendSprite";
import type { HeartShopItemId } from "@/lib/heartShopText";
import type { RewardMapKind } from "@/lib/rewardMaps";

type HeartShopMapFriendsProps = {
  itemIds: HeartShopItemId[];
  mapKind: RewardMapKind;
};

export default function HeartShopMapFriends({ itemIds, mapKind }: HeartShopMapFriendsProps) {
  if (itemIds.length === 0) return null;

  const visible = new Set(itemIds);
  const isArk = mapKind === "peaceArk";

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
          style={{
            position: "absolute",
            left: isArk ? "6%" : "7%",
            bottom: isArk ? "5%" : "2%",
          }}
        >
          <HeartShopFriendSprite itemId="hindungi" renderWidth={56} />
        </div>
      )}

      {visible.has("choko") && (
        <div
          className="roots-heart-shop-cat-drift"
          style={{
            position: "absolute",
            right: isArk ? "7%" : "8%",
            bottom: isArk ? "7%" : "3%",
          }}
        >
          <HeartShopFriendSprite itemId="choko" renderWidth={60} />
        </div>
      )}

      {visible.has("kkumdeuli") && (
        <div
          style={{
            position: "absolute",
            left: isArk ? "39%" : "37%",
            bottom: isArk ? "10%" : "9%",
          }}
        >
          <HeartShopFriendSprite itemId="kkumdeuli" renderWidth={40} />
        </div>
      )}
    </div>
  );
}

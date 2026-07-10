"use client";

import HeartShopFriendSprite from "@/components/HeartShopFriendSprite";
import { getHeartShopIntroText } from "@/lib/heartShopIntroText";
import { useLang } from "@/lib/useLang";

type HeartShopIntroPopupProps = {
  onOpenShop: () => void;
  onClose: () => void;
};

export default function HeartShopIntroPopup({ onOpenShop, onClose }: HeartShopIntroPopupProps) {
  const lang = useLang();
  const copy = getHeartShopIntroText(lang);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="heart-shop-intro-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 211,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "calc(18px + env(safe-area-inset-top)) 22px calc(18px + env(safe-area-inset-bottom))",
        background: "rgba(26,28,30,0.84)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 350,
          borderRadius: 30,
          border: "1px solid rgba(232,197,71,0.34)",
          background: "var(--bg2)",
          padding: "28px 22px 22px",
          textAlign: "center",
          boxShadow: "0 18px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 150,
            minHeight: 112,
            margin: "0 auto 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 26,
            background: "linear-gradient(180deg, rgba(246,241,232,0.3), rgba(122,157,122,0.1))",
          }}
        >
          <HeartShopFriendSprite itemId="hindungi" renderWidth={118} />
        </div>

        <h2
          id="heart-shop-intro-title"
          style={{
            margin: "0 0 12px",
            color: "var(--text)",
            fontSize: 23,
            fontWeight: 950,
            lineHeight: 1.3,
          }}
        >
          {copy.title}
        </h2>

        <p
          style={{
            margin: "0 0 20px",
            color: "var(--text2)",
            fontSize: 14,
            fontWeight: 700,
            lineHeight: 1.75,
            whiteSpace: "pre-line",
          }}
        >
          {copy.body}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            type="button"
            onClick={onOpenShop}
            className="btn-sage"
            style={{ width: "100%", minHeight: 48, justifyContent: "center" }}
          >
            {copy.openShop}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: "100%",
              minHeight: 44,
              borderRadius: 14,
              border: "1px solid var(--border)",
              background: "var(--bg)",
              color: "var(--text2)",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {copy.close}
          </button>
        </div>
      </div>
    </div>
  );
}

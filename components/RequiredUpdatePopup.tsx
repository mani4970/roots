"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Download } from "lucide-react";
import { useLang } from "@/lib/useLang";
import { getRequiredUpdateText } from "@/lib/requiredUpdateText";
import type { RequiredUpdatePlatform } from "@/lib/requiredUpdate";

type RequiredUpdatePopupProps = {
  platform: RequiredUpdatePlatform;
  onUpdate: () => void;
};

export default function RequiredUpdatePopup({ platform, onUpdate }: RequiredUpdatePopupProps) {
  const lang = useLang();
  const copy = getRequiredUpdateText(lang);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let listener: { remove: () => Promise<void> } | null = null;

    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
      void App.addListener("backButton", () => {
        // This is an intentional one-time mandatory update campaign.
      }).then(handle => {
        if (cancelled) {
          void handle.remove();
          return;
        }
        listener = handle;
      });
    }

    return () => {
      cancelled = true;
      if (listener) void listener.remove();
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="required-update-title"
      data-required-update-platform={platform}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "calc(18px + env(safe-area-inset-top)) 22px calc(18px + env(safe-area-inset-bottom))",
        background: "rgba(26,28,30,0.88)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 350,
          borderRadius: 30,
          border: "1px solid rgba(122,157,122,0.32)",
          background: "var(--bg2)",
          padding: "30px 22px 22px",
          textAlign: "center",
          boxShadow: "0 20px 64px rgba(0,0,0,0.34)",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 82,
            height: 82,
            margin: "0 auto 16px",
            borderRadius: 27,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(180deg, rgba(232,197,71,0.2), rgba(122,157,122,0.12))",
            border: "1px solid rgba(232,197,71,0.3)",
            color: "var(--sage-dark)",
          }}
        >
          <Download size={36} strokeWidth={2.2} />
        </div>

        <h2
          id="required-update-title"
          style={{
            margin: "0 0 13px",
            color: "var(--text)",
            fontSize: 22,
            fontWeight: 950,
            lineHeight: 1.35,
          }}
        >
          {copy.title}
        </h2>

        <p
          style={{
            margin: "0 0 22px",
            color: "var(--text2)",
            fontSize: 14,
            fontWeight: 700,
            lineHeight: 1.75,
            whiteSpace: "pre-line",
          }}
        >
          {copy.body}
        </p>

        <button
          type="button"
          onClick={onUpdate}
          className="btn-sage"
          style={{ width: "100%", minHeight: 50, justifyContent: "center", fontSize: 14, fontWeight: 900 }}
        >
          {copy.updateNow}
        </button>
      </div>
    </div>
  );
}

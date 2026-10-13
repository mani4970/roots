"use client";

import { Loader2, Users } from "lucide-react";
import { useLang } from "@/lib/useLang";
import { getCompanionAcceptanceText } from "@/lib/companionAcceptanceText";

type CompanionAcceptedPopupProps = {
  show: boolean;
  name: string | null;
  additionalCount: number;
  busy?: boolean;
  onViewCompanions: () => void;
  onClose: () => void;
};

export default function CompanionAcceptedPopup({
  show,
  name,
  additionalCount,
  busy = false,
  onViewCompanions,
  onClose,
}: CompanionAcceptedPopupProps) {
  const lang = useLang();
  const copy = getCompanionAcceptanceText(lang);
  if (!show) return null;

  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 276,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "calc(20px + env(safe-area-inset-top)) 20px calc(20px + env(safe-area-inset-bottom))",
        background: "rgba(26,28,30,.82)",
        backdropFilter: "blur(9px)",
        WebkitBackdropFilter: "blur(9px)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="companion-accepted-title"
        aria-describedby="companion-accepted-body"
        style={{
          width: "100%",
          maxWidth: 356,
          borderRadius: 28,
          border: "1px solid var(--border-sage-soft)",
          background: "var(--bg2)",
          boxShadow: "0 22px 68px rgba(0,0,0,.34)",
          padding: "26px 21px 18px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 96,
            height: 96,
            margin: "0 auto 13px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src="/badge_roots_together.webp"
            alt=""
            aria-hidden="true"
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </div>

        <h2
          id="companion-accepted-title"
          style={{
            margin: "0 0 10px",
            color: "var(--text)",
            fontSize: 20,
            fontWeight: 900,
            lineHeight: 1.4,
            wordBreak: "keep-all",
          }}
        >
          {copy.title(name?.trim() || null, additionalCount)}
        </h2>

        <p
          id="companion-accepted-body"
          style={{
            margin: "0 0 20px",
            color: "var(--text2)",
            fontSize: 13.5,
            lineHeight: 1.7,
            wordBreak: "keep-all",
          }}
        >
          {copy.body}
        </p>

        <button
          type="button"
          onClick={onViewCompanions}
          disabled={busy}
          className="btn-sage"
          style={{
            width: "100%",
            minHeight: 47,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            opacity: busy ? 0.65 : 1,
          }}
        >
          {busy ? <Loader2 size={17} className="spin" /> : <Users size={17} />}
          {copy.view}
        </button>

        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          style={{
            width: "100%",
            minHeight: 42,
            marginTop: 6,
            border: 0,
            background: "transparent",
            color: "var(--text3)",
            fontSize: 13,
            fontWeight: 800,
            cursor: busy ? "default" : "pointer",
            opacity: busy ? 0.6 : 1,
          }}
        >
          {copy.close}
        </button>
      </div>
    </div>
  );
}

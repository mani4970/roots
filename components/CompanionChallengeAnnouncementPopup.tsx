"use client";

import { Loader2, Users } from "lucide-react";
import { useLang } from "@/lib/useLang";

import { COMPANION_CHALLENGE_4_BADGE, COMPANION_CHALLENGE_4_COPY } from "@/lib/companionChallengeCampaign";

type CompanionChallengeAnnouncementPopupProps = {
  show: boolean;
  busy?: boolean;
  onManageCompanions: () => void;
  onClose: () => void;
};

export default function CompanionChallengeAnnouncementPopup({
  show,
  busy = false,
  onManageCompanions,
  onClose,
}: CompanionChallengeAnnouncementPopupProps) {
  const lang = useLang();
  if (!show) return null;
  const copy = COMPANION_CHALLENGE_4_COPY[lang] ?? COMPANION_CHALLENGE_4_COPY.ko;

  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 248,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding:
          "calc(20px + env(safe-area-inset-top)) 20px calc(20px + env(safe-area-inset-bottom))",
        background: "rgba(26,28,30,.82)",
        backdropFilter: "blur(9px)",
        WebkitBackdropFilter: "blur(9px)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="companion-challenge-4-announcement-title"
        style={{
          width: "100%",
          maxWidth: 356,
          maxHeight: "100%",
          overflowY: "auto",
          borderRadius: 28,
          border: "1px solid var(--border-gold-soft)",
          background: "var(--bg2)",
          boxShadow: "0 22px 68px rgba(0,0,0,.34)",
          padding: "26px 21px 21px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 112,
            height: 112,
            margin: "0 auto 10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={COMPANION_CHALLENGE_4_BADGE}
            alt={copy.badgeAlt}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </div>

        <h2
          id="companion-challenge-4-announcement-title"
          style={{
            margin: "0 0 4px",
            color: "var(--text)",
            fontSize: 20,
            fontWeight: 950,
            lineHeight: 1.36,
            wordBreak: "keep-all",
          }}
        >
          {copy.title}
        </h2>

        <p
          style={{
            margin: "0 0 13px",
            color: "var(--text3)",
            fontSize: 12.5,
            fontWeight: 800,
            lineHeight: 1.4,
            wordBreak: "keep-all",
          }}
        >
          {copy.period}
        </p>

        <div
          style={{
            borderRadius: 17,
            border: "1px solid var(--border-sage-soft)",
            background: "var(--surface-sage-subtle)",
            padding: "14px 15px",
            marginBottom: 17,
          }}
        >
          <p
            style={{
              margin: 0,
              color: "var(--text2)",
              fontSize: 13.5,
              lineHeight: 1.65,
              fontWeight: 800,
              wordBreak: "keep-all",
            }}
          >
            {copy.body}
          </p>
          <p
            style={{
              margin: "11px 0 0",
              color: "var(--text2)",
              fontSize: 13,
              lineHeight: 1.6,
              fontWeight: 800,
              wordBreak: "keep-all",
            }}
          >
            {copy.nudge}
          </p>
        </div>

        <button
          type="button"
          onClick={onManageCompanions}
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
          {copy.manage}
        </button>

        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          style={{
            width: "100%",
            minHeight: 42,
            marginTop: 8,
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

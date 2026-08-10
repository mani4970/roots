"use client";

import { Star } from "lucide-react";
import ConfettiBurst from "@/components/ConfettiBurst";
import {
  COMPANION_CHALLENGE_BADGE_FALLBACK,
  getCompanionChallengeBadgeImageSrc,
} from "@/lib/companionChallenges";
import {
  getCompanionChallengeDisplayTitle,
  getCompanionChallengeRewardPopupBody,
  getCompanionChallengeText,
} from "@/lib/companionChallengeText";
import {
  GROUP_CHALLENGE_BADGE_FALLBACK,
  getGroupChallengeBadgeImageSrc,
} from "@/lib/groupChallengeBadges";
import type { ChallengeReward } from "@/lib/challengeRewards";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/useLang";

type ChallengeRewardPopupProps = {
  reward: ChallengeReward | null;
  onDismiss: () => void;
  onConfirm: () => void;
};

export default function ChallengeRewardPopup({
  reward,
  onDismiss,
  onConfirm,
}: ChallengeRewardPopupProps) {
  const lang = useLang();
  if (!reward) return null;

  const isCompanion = reward.kind === "companion";
  const companionText = getCompanionChallengeText(lang);
  const title = isCompanion
    ? companionText.popupTitle
    : t("group_challenge_award_popup_title", lang);
  const challengeTitle = isCompanion
    ? getCompanionChallengeDisplayTitle(
        {
          challengeId: reward.challengeId,
          title: reward.challengeTitle,
          badgeName: reward.badgeName,
        },
        lang,
      )
    : reward.challengeTitle;
  const contextName = isCompanion ? reward.companionName : reward.groupName;
  const body = isCompanion
    ? `${getCompanionChallengeRewardPopupBody(
        {
          challengeId: reward.challengeId,
          title: reward.challengeTitle,
          badgeName: reward.badgeName,
        },
        lang,
      )}\n💛 +${reward.rewardHearts} ${companionText.heartsLabel}`
    : t("group_challenge_award_popup_body", lang);
  const button = isCompanion
    ? companionText.popupButton
    : t("group_challenge_award_popup_btn", lang);
  const badgeSrc = isCompanion
    ? getCompanionChallengeBadgeImageSrc(reward.badgeImagePath)
    : getGroupChallengeBadgeImageSrc(reward.badgeImagePath, { fallback: null });
  const fallbackSrc = isCompanion
    ? COMPANION_CHALLENGE_BADGE_FALLBACK
    : GROUP_CHALLENGE_BADGE_FALLBACK;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="challenge-reward-popup-title"
      onClick={onDismiss}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 250,
        background: "rgba(26,28,30,0.92)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "calc(20px + env(safe-area-inset-top)) 24px calc(20px + env(safe-area-inset-bottom))",
      }}
    >
      <ConfettiBurst variant="fixed" zIndex={251} />
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 340,
          borderRadius: 28,
          background: "var(--bg2)",
          border: "1px solid rgba(232,197,71,0.4)",
          boxShadow: "0 18px 60px rgba(0,0,0,0.32)",
          padding: "30px 23px 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 116,
            height: 116,
            margin: "0 auto 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {badgeSrc ? (
            <img
              src={badgeSrc}
              alt={reward.badgeName || challengeTitle}
              onError={(event) => {
                if (event.currentTarget.src.endsWith(fallbackSrc)) return;
                event.currentTarget.src = fallbackSrc;
              }}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          ) : (
            <div
              style={{
                width: 104,
                height: 104,
                borderRadius: 28,
                background: "rgba(232,197,71,0.08)",
                color: "rgba(232,197,71,0.95)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(232,197,71,0.3)",
              }}
            >
              <Star size={48} strokeWidth={1.7} />
            </div>
          )}
        </div>
        <h2
          id="challenge-reward-popup-title"
          style={{
            fontSize: 20,
            fontWeight: 900,
            color: "rgba(232,197,71,0.95)",
            margin: "0 0 8px",
            lineHeight: 1.3,
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontSize: 14,
            fontWeight: 850,
            color: "var(--text)",
            lineHeight: 1.45,
            margin: "0 0 4px",
          }}
        >
          {challengeTitle || reward.badgeName}
        </p>
        {contextName && (
          <p
            style={{
              fontSize: 12,
              color: "var(--text3)",
              lineHeight: 1.45,
              margin: "0 0 14px",
            }}
          >
            {contextName}
          </p>
        )}
        <div
          style={{
            padding: "14px 15px",
            borderRadius: 16,
            background: "rgba(232,197,71,0.08)",
            border: "1px solid rgba(232,197,71,0.25)",
            marginBottom: 18,
          }}
        >
          <p
            style={{
              fontSize: 14,
              color: "var(--text)",
              lineHeight: 1.68,
              margin: 0,
              whiteSpace: "pre-line",
            }}
          >
            {body}
          </p>
        </div>
        <button
          type="button"
          onClick={onConfirm}
          className="btn-sage"
          style={{ width: "100%" }}
        >
          {button}
        </button>
      </div>
    </div>
  );
}

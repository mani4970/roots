"use client";

import { Heart, Sparkles } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import {
  COMMUNITY_REACTIONS,
  getCommunityReactionLabel,
  type CommunityReactionId,
} from "@/lib/communityReactionText";
import styles from "./QtReactions.module.css";

type CommunityReactionButtonsProps = {
  qtId: string;
  counts: Record<string, number>;
  selectedReaction?: string;
  lang: Lang;
  onReact: (qtId: string, reactionId: CommunityReactionId) => void;
};

function ReactionIcon({
  id,
  selected,
}: {
  id: CommunityReactionId;
  selected: boolean;
}) {
  const color = selected
    ? "var(--community-reaction-selected-text)"
    : "currentColor";
  if (id === "cheer") {
    return (
      <Heart
        size={18}
        strokeWidth={1.9}
        fill={selected ? color : "none"}
        style={{ color }}
      />
    );
  }
  if (id === "bless") {
    return <Sparkles size={18} strokeWidth={1.9} style={{ color }} />;
  }
  return (
    <img
      src="/icon-pray.webp"
      alt=""
      aria-hidden="true"
      draggable={false}
      style={{
        width: 20,
        height: 20,
        objectFit: "contain",
        flexShrink: 0,
        opacity: selected ? 1 : 0.82,
      }}
    />
  );
}

export default function CommunityReactionButtons({
  qtId,
  counts,
  selectedReaction,
  lang,
  onReact,
}: CommunityReactionButtonsProps) {
  return (
    <div className={styles.buttons}>
      {COMMUNITY_REACTIONS.map((reactionId) => {
        const count = Number(counts[reactionId] ?? 0);
        const isSelected = selectedReaction === reactionId;
        return (
          <button
            key={reactionId}
            type="button"
            className={styles.button}
            aria-pressed={isSelected}
            onClick={() => onReact(qtId, reactionId)}
            style={{
              border: `1.5px solid ${isSelected ? "var(--community-reaction-selected-border)" : "var(--community-reaction-border)"}`,
              background: isSelected
                ? "var(--community-reaction-selected-surface)"
                : "var(--community-reaction-surface)",
              color: isSelected
                ? "var(--community-reaction-selected-text)"
                : "var(--community-reaction-text)",
              fontWeight: isSelected ? 700 : 500,
            }}
          >
            <ReactionIcon id={reactionId} selected={isSelected} />
            <span>{getCommunityReactionLabel(reactionId, lang)}</span>
            <span
              aria-label={`${count}`}
              className={styles.count}
              style={{
                color: isSelected
                  ? "var(--community-reaction-selected-text)"
                  : "var(--community-reaction-text)",
                opacity: count > 0 ? 1 : 0.58,
              }}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

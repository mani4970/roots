"use client";

import { CheckCircle2, HandHeart, Sparkles } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import {
  COMMUNITY_REACTIONS,
  getCommunityReactionLabel,
  type CommunityReactionId,
} from "@/lib/communityReactionText";

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
  const color = selected ? "var(--sage-dark)" : "currentColor";
  if (id === "cheer") {
    return <CheckCircle2 size={14} strokeWidth={1.9} style={{ color }} />;
  }
  if (id === "bless") {
    return <Sparkles size={14} strokeWidth={1.9} style={{ color }} />;
  }
  return <HandHeart size={14} strokeWidth={1.9} style={{ color }} />;
}

export default function CommunityReactionButtons({
  qtId,
  counts,
  selectedReaction,
  lang,
  onReact,
}: CommunityReactionButtonsProps) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {COMMUNITY_REACTIONS.map((reactionId) => {
        const count = Number(counts[reactionId] ?? 0);
        const isSelected = selectedReaction === reactionId;
        return (
          <button
            key={reactionId}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onReact(qtId, reactionId)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              padding: "6px 10px",
              borderRadius: 20,
              border: `1.5px solid ${isSelected ? "var(--sage)" : "var(--border)"}`,
              background: isSelected ? "var(--sage-light)" : "var(--bg3)",
              cursor: "pointer",
              fontSize: 12,
              color: isSelected ? "var(--sage-dark)" : "var(--text3)",
              fontWeight: isSelected ? 700 : 500,
              transition:
                "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
          >
            <ReactionIcon id={reactionId} selected={isSelected} />
            <span>{getCommunityReactionLabel(reactionId, lang)}</span>
            <span
              aria-label={`${count}`}
              style={{
                minWidth: 14,
                textAlign: "center",
                fontWeight: 750,
                fontVariantNumeric: "tabular-nums",
                color: isSelected ? "var(--sage-dark)" : "var(--text2)",
                opacity: count > 0 ? 1 : 0.58,
                marginLeft: 1,
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

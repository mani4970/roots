import { ArrowRight, Heart, MessageCircle, Sparkles } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { COMMUNITY_REACTIONS, getCommunityReactionLabel } from "@/lib/communityReactionText";
import styles from "./QtReactions.module.css";

const MY_REACTION_LABEL: Record<Lang, string> = {
  ko: "내 반응",
  en: "My reaction",
  de: "Meine Reaktion",
  fr: "Ma réaction",
  es: "Mi reacción",
};
const COMMENT_LABEL: Record<Lang, string> = {
  ko: "댓글",
  en: "Comments",
  de: "Kommentare",
  fr: "Commentaires",
  es: "Comentarios",
};
const MORE_LABEL: Record<Lang, string> = {
  ko: "더보기",
  en: "Read more",
  de: "Weiterlesen",
  fr: "Lire la suite",
  es: "Ver más",
};

function displayCount(value: unknown) {
  const count = Number(value);
  return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
}

/** Read-only counts alongside an explicit reflection detail action. */
export default function QtReactionSummary({
  counts,
  selectedReaction,
  commentCount,
  lang,
  onOpen,
}: {
  counts?: Record<string, number>;
  selectedReaction?: string;
  commentCount?: number;
  lang: Lang;
  onOpen: () => void;
}) {
  const comments = displayCount(commentCount);
  const commentsReady = commentCount !== undefined;
  return (
    <div
      className={styles.summary}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        color: "var(--community-reaction-text)",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <div
        style={{ display: "flex", flex: 1, minWidth: 0, alignItems: "center", flexWrap: "wrap", gap: 12 }}
      >
        {COMMUNITY_REACTIONS.map((id) => {
          const count = displayCount(counts?.[id]);
          const ready = counts !== undefined;
          const isSelected = selectedReaction === id;
          return (
            <span
              key={id}
              role="img"
              aria-label={`${getCommunityReactionLabel(id, lang)}${ready ? `: ${count}` : ""}${isSelected ? ` (${MY_REACTION_LABEL[lang]})` : ""}`}
              data-selected={isSelected || undefined}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0,
                color: isSelected ? "var(--community-reaction-selected-text)" : undefined,
                fontWeight: isSelected ? 750 : undefined }}
            >
              {id === "cheer" ? (
                <Heart size={17} strokeWidth={1.9} fill={isSelected ? "currentColor" : "none"} aria-hidden="true" />
              ) : (
                <Sparkles size={17} strokeWidth={1.9} aria-hidden="true" />
              )}
              <span aria-hidden="true" style={{ minWidth: "2ch", textAlign: "center" }}>{ready ? count : "–"}</span>
            </span>
          );
        })}
        <span
          role="img"
          aria-label={`${COMMENT_LABEL[lang]}${commentsReady ? `: ${comments}` : ""}`}
          style={{ display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0 }}
        >
          <MessageCircle size={17} strokeWidth={1.9} aria-hidden="true" />
          <span aria-hidden="true" style={{ minWidth: "2ch", textAlign: "center", visibility: commentsReady && comments === 0 ? "hidden" : "visible" }}>
            {commentsReady ? comments : "–"}
          </span>
        </span>
      </div>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          flexShrink: 0,
          whiteSpace: "nowrap",
          minHeight: 36,
          padding: "4px 0",
          border: 0,
          background: "transparent",
          color: "var(--text3)",
          fontFamily: "inherit",
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        {MORE_LABEL[lang]}
        <ArrowRight size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

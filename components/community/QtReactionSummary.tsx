import { ArrowRight, Heart, MessageCircle, Sparkles } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { getCommunityReactionLabel, type CommunityReactionId } from "@/lib/communityReactionText";

const ORDER: readonly CommunityReactionId[] = ["cheer", "pray", "bless"];
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
  commentCount,
  lang,
  onOpen,
}: {
  counts: Record<string, number>;
  commentCount?: number;
  lang: Lang;
  onOpen: () => void;
}) {
  const comments = displayCount(commentCount);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        color: "var(--community-reaction-text)",
        fontSize: 14,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <div
        style={{ display: "flex", flex: 1, minWidth: 0, alignItems: "center", flexWrap: "wrap", gap: 12 }}
      >
        {ORDER.map((id) => {
          const count = displayCount(counts[id]);
          return (
            <span
              key={id}
              role="img"
              aria-label={`${getCommunityReactionLabel(id, lang)}: ${count}`}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0 }}
            >
              {id === "cheer" ? (
                <Heart size={17} strokeWidth={1.9} aria-hidden="true" />
              ) : id === "bless" ? (
                <Sparkles size={17} strokeWidth={1.9} aria-hidden="true" />
              ) : (
                <img src="/icon-pray.webp" alt="" aria-hidden="true" draggable={false} style={{ width: 19, height: 19, objectFit: "contain" }} />
              )}
              <span aria-hidden="true">{count}</span>
            </span>
          );
        })}
        <span
          role="img"
          aria-label={`${COMMENT_LABEL[lang]}: ${comments}`}
          style={{ display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0 }}
        >
          <MessageCircle size={17} strokeWidth={1.9} aria-hidden="true" />
          {comments > 0 && <span aria-hidden="true">{comments}</span>}
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

import type { Lang } from "@/lib/i18n";
import { ESV_ATTRIBUTION_URL, ESV_TRANSLATION_ID } from "@/lib/esvBible";
import { getQtFeedPreview } from "@/lib/qtFeedPreview";

const PHOTO_TEXT: Record<Lang, { alt: string; loading: string }> = {
  ko: { alt: "말씀 묵상 사진", loading: "사진을 불러오는 중이에요." },
  en: { alt: "Bible Reflection photo", loading: "Loading photo…" },
  de: { alt: "Foto zur Stillen Zeit", loading: "Foto wird geladen…" },
  fr: { alt: "Photo de méditation biblique", loading: "Chargement de la photo…" },
  es: { alt: "Foto de meditación bíblica", loading: "Cargando la foto…" },
};

export default function QtFeedPreview({
  row,
  photoUrl,
  lang,
}: {
  row: Record<string, unknown>;
  photoUrl?: string;
  lang: Lang;
}) {
  const copy = PHOTO_TEXT[lang];
  if (row.photo_path) {
    return photoUrl ? (
      <img
        src={photoUrl}
        alt={copy.alt}
        loading="lazy"
        decoding="async"
        style={{
          display: "block",
          width: "100%",
          height: 220,
          objectFit: "contain",
          borderRadius: 14,
          background: "var(--bg2)",
          border: "1px solid var(--border)",
          margin: "8px 0 12px",
        }}
      />
    ) : (
      <div
        role="status"
        style={{
          height: 220,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 14,
          background: "var(--bg2)",
          color: "var(--text3)",
          fontSize: 14,
          padding: 16,
          margin: "8px 0 12px",
        }}
      >
        {copy.loading}
      </div>
    );
  }

  const { text, field } = getQtFeedPreview(row);
  if (!text) return null;
  const esvVerse = field === "key_verse" && Number(row.bible_version) === ESV_TRANSLATION_ID;

  return (
    <div style={{ margin: "8px 0 12px" }}>
      <p
        style={{
          fontSize: 16,
          lineHeight: 1.65,
          color: "var(--text2)",
          overflowWrap: "anywhere",
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: 3,
          overflow: "hidden",
          margin: 0,
        }}
      >
        {text}
      </p>
      {esvVerse && (
        <span style={{ fontSize: 12, color: "var(--text3)" }}>
          ESV ·{" "}
          <a
            href={ESV_ATTRIBUTION_URL}
            target="_blank"
            rel="noreferrer noopener"
            onClick={(event) => event.stopPropagation()}
            style={{ color: "inherit", textDecoration: "underline" }}
          >
            ESV.org
          </a>
        </span>
      )}
    </div>
  );
}

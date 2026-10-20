import type { Lang } from "@/lib/i18n";

const TEXT: Record<Lang, { smaller: string; larger: string; title: string }> = {
  ko: { smaller: "묵상 글씨 작게", larger: "묵상 글씨 크게", title: "묵상 글씨 크기" },
  en: { smaller: "Decrease reflection text size", larger: "Increase reflection text size", title: "Reflection text size" },
  de: { smaller: "Schrift der Stillen Zeit verkleinern", larger: "Schrift der Stillen Zeit vergrößern", title: "Schriftgröße der Stillen Zeit" },
  fr: { smaller: "Réduire la taille du texte de la méditation", larger: "Augmenter la taille du texte de la méditation", title: "Taille du texte de la méditation" },
  es: { smaller: "Reducir el tamaño del texto de la meditación", larger: "Aumentar el tamaño del texto de la meditación", title: "Tamaño del texto de la meditación" },
};

export default function QtDetailTextSizeControls({
  lang,
  canDecrease,
  canIncrease,
  onChange,
}: {
  lang: Lang;
  canDecrease: boolean;
  canIncrease: boolean;
  onChange: (direction: -1 | 1) => void;
}) {
  const text = TEXT[lang];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => onChange(-1)}
        disabled={!canDecrease}
        aria-label={text.smaller}
        title={text.title}
        style={{ minWidth: 24, height: 22, borderRadius: 999, border: "1px solid var(--qt-option-border)", background: !canDecrease ? "var(--qt-field-surface)" : "var(--qt-card-surface)", color: !canDecrease ? "var(--text3)" : "var(--qt-sage-text)", fontSize: 10, fontWeight: 800, cursor: !canDecrease ? "default" : "pointer", opacity: !canDecrease ? 0.45 : 1, padding: "0 5px" }}
      >
        A-
      </button>
      <button
        type="button"
        onClick={() => onChange(1)}
        disabled={!canIncrease}
        aria-label={text.larger}
        title={text.title}
        style={{ minWidth: 24, height: 22, borderRadius: 999, border: "1px solid var(--qt-option-border)", background: !canIncrease ? "var(--qt-field-surface)" : "var(--qt-card-surface)", color: !canIncrease ? "var(--text3)" : "var(--qt-sage-text)", fontSize: 10, fontWeight: 800, cursor: !canIncrease ? "default" : "pointer", opacity: !canIncrease ? 0.45 : 1, padding: "0 5px" }}
      >
        A+
      </button>
    </div>
  );
}

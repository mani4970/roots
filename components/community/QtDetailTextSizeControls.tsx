import type { Lang } from "@/lib/i18n";
import styles from "./QtDetailTextSizeControls.module.css";

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
    <div className={styles.controls}>
      <button
        type="button"
        onClick={() => onChange(-1)}
        disabled={!canDecrease}
        aria-label={text.smaller}
        title={text.title}
        className={styles.button}
      >
        A-
      </button>
      <button
        type="button"
        onClick={() => onChange(1)}
        disabled={!canIncrease}
        aria-label={text.larger}
        title={text.title}
        className={styles.button}
      >
        A+
      </button>
    </div>
  );
}

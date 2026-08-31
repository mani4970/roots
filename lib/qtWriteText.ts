import type { Lang } from "@/lib/i18n";

type QTWriteText = {
  loadingPassage: string;
};

const QT_WRITE_TEXT: Record<Lang, QTWriteText> = {
  ko: {
    loadingPassage: "본문을 불러오고 있어요...",
  },
  de: {
    loadingPassage: "Der Bibeltext wird geladen...",
  },
  en: {
    loadingPassage: "Loading the Bible passage...",
  },
  fr: {
    loadingPassage: "Chargement du passage biblique...",
  },
  es: {
    loadingPassage: "Cargando el pasaje bíblico...",
  },
};

export function getQTWriteText(lang: Lang): QTWriteText {
  return QT_WRITE_TEXT[lang] ?? QT_WRITE_TEXT.ko;
}

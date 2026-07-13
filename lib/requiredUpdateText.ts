import type { Lang } from "@/lib/i18n";

type RequiredUpdateText = {
  title: string;
  body: string;
  updateNow: string;
};

const TEXT: Record<Lang, RequiredUpdateText> = {
  ko: {
    title: "최신 버전으로 업데이트해주세요",
    body: "더 안정적인 앱 사용과 새로운 기능을 위해\nChristian Roots 2.0.1 업데이트가 필요해요.",
    updateNow: "지금 업데이트하기",
  },
  en: {
    title: "Please update to the latest version",
    body: "For a more stable app experience and new features,\nplease update to Christian Roots 2.0.1.",
    updateNow: "Update now",
  },
  de: {
    title: "Bitte aktualisiere auf die neueste Version",
    body: "Für eine stabilere Nutzung und neue Funktionen\nist das Update auf Christian Roots 2.0.1 erforderlich.",
    updateNow: "Jetzt aktualisieren",
  },
  fr: {
    title: "Veuillez mettre l’application à jour",
    body: "Pour une utilisation plus stable et de nouvelles fonctionnalités,\nmettez Christian Roots à jour vers la version 2.0.1.",
    updateNow: "Mettre à jour",
  },
};

export function getRequiredUpdateText(lang: Lang | string): RequiredUpdateText {
  return TEXT[(lang === "en" || lang === "de" || lang === "fr" ? lang : "ko") as Lang];
}

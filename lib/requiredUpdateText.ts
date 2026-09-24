import type { Lang } from "@/lib/i18n";

type UpdatePopupText = {
  title: string;
  body: string;
  updateNow: string;
  later?: string;
};

type UpdateCopyLang = Lang | "es";

const REQUIRED_TEXT: Record<UpdateCopyLang, UpdatePopupText> = {
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
  es: {
    title: "Actualiza a la versión más reciente",
    body: "Para disfrutar de una app más estable y de nuevas funciones,\nactualiza Christian Roots a la versión 2.0.1.",
    updateNow: "Actualizar ahora",
  },
};

const OPTIONAL_TEXT: Record<UpdateCopyLang, UpdatePopupText> = {
  ko: {
    title: "새로운 버전이 출시됐어요",
    body: "더 안정적인 사용과 개선된 기능을 위해\nChristian Roots를 최신 버전으로 업데이트해보세요.",
    updateNow: "업데이트 하러 가기",
    later: "나중에",
  },
  en: {
    title: "A new version is available",
    body: "Update Christian Roots to the latest version\nfor improved stability and a better experience.",
    updateNow: "Go to update",
    later: "Later",
  },
  de: {
    title: "Eine neue Version ist verfügbar",
    body: "Aktualisiere Christian Roots auf die neueste Version\nfür mehr Stabilität und eine verbesserte Nutzung.",
    updateNow: "Zum Update",
    later: "Später",
  },
  fr: {
    title: "Une nouvelle version est disponible",
    body: "Mettez Christian Roots à jour vers la dernière version\npour plus de stabilité et une meilleure expérience.",
    updateNow: "Mettre à jour",
    later: "Plus tard",
  },
  es: {
    title: "Hay una nueva versión disponible",
    body: "Actualiza Christian Roots a la última versión\npara disfrutar de mayor estabilidad y una mejor experiencia.",
    updateNow: "Ir a actualizar",
    later: "Más tarde",
  },
};

export function getRequiredUpdateText(lang: Lang | string, mandatory = true): UpdatePopupText {
  const normalized: UpdateCopyLang =
    lang === "en" || lang === "de" || lang === "fr" || lang === "es" ? lang : "ko";
  return (mandatory ? REQUIRED_TEXT : OPTIONAL_TEXT)[normalized];
}

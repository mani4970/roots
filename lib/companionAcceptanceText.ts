export type CompanionAcceptanceTextLang = "ko" | "en" | "de" | "fr" | "es";

type CompanionAcceptanceText = {
  title: (name: string | null, additionalCount: number) => string;
  body: string;
  view: string;
  close: string;
};

const TEXT: Record<CompanionAcceptanceTextLang, CompanionAcceptanceText> = {
  ko: {
    title: (name, additionalCount) => {
      if (!name) {
        return additionalCount > 0
          ? `새로운 동역자 ${additionalCount + 1}명이 생겼어요!`
          : "새로운 동역자가 생겼어요!";
      }
      return additionalCount > 0
        ? `${name}님 외 ${additionalCount}명이 새로운 동역자가 되었어요!`
        : `${name}님이 새로운 동역자가 되었어요!`;
    },
    body: "이제 함께 말씀 묵상과 기도 제목을 나누어보세요.",
    view: "동역자 보러가기",
    close: "닫기",
  },
  en: {
    title: (name, additionalCount) => {
      if (!name) {
        return additionalCount > 0
          ? `You have ${additionalCount + 1} new faith partners!`
          : "You have a new faith partner!";
      }
      return additionalCount > 0
        ? `${name} and ${additionalCount} others are now your new faith partners!`
        : `${name} is now your new faith partner!`;
    },
    body: "Now share Bible Reflections and prayer requests together.",
    view: "View faith partners",
    close: "Close",
  },
  de: {
    title: (name, additionalCount) => {
      if (!name) {
        return additionalCount > 0
          ? `Du hast ${additionalCount + 1} neue Glaubenspartner!`
          : "Du hast einen neuen Glaubenspartner!";
      }
      return additionalCount > 0
        ? `${name} und ${additionalCount} weitere Personen sind jetzt deine neuen Glaubenspartner!`
        : `${name} ist jetzt dein neuer Glaubenspartner!`;
    },
    body: "Teilt jetzt gemeinsam eure Stille Zeit und Gebetsanliegen.",
    view: "Glaubenspartner ansehen",
    close: "Schließen",
  },
  fr: {
    title: (name, additionalCount) => {
      if (!name) {
        return additionalCount > 0
          ? `Vous avez ${additionalCount + 1} nouveaux partenaires de foi !`
          : "Vous avez un nouveau partenaire de foi !";
      }
      return additionalCount > 0
        ? `${name} et ${additionalCount} autres personnes sont maintenant vos partenaires de foi !`
        : `${name} est maintenant votre partenaire de foi !`;
    },
    body: "Partagez maintenant vos méditations bibliques et vos sujets de prière.",
    view: "Voir les partenaires",
    close: "Fermer",
  },
  es: {
    title: (name, additionalCount) => {
      if (!name) {
        return additionalCount > 0
          ? `¡Tienes ${additionalCount + 1} nuevos compañeros de fe!`
          : "¡Tienes un nuevo compañero de fe!";
      }
      return additionalCount > 0
        ? `¡${name} y ${additionalCount} personas más ahora son tus compañeros de fe!`
        : `¡${name} ahora es tu nuevo compañero de fe!`;
    },
    body: "Ahora compartan meditaciones bíblicas y peticiones de oración.",
    view: "Ver compañeros",
    close: "Cerrar",
  },
};

function normalizeLang(lang: string): CompanionAcceptanceTextLang {
  if (lang === "ko" || lang === "en" || lang === "de" || lang === "fr" || lang === "es") {
    return lang;
  }
  return "ko";
}

export function getCompanionAcceptanceText(
  lang: string,
): CompanionAcceptanceText {
  return TEXT[normalizeLang(lang)];
}

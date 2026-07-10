type HeartShopIntroLang = "ko" | "en" | "de" | "fr";

type HeartShopIntroText = {
  title: string;
  body: string;
  openShop: string;
  close: string;
};

const HEART_SHOP_INTRO_TEXT: Record<HeartShopIntroLang, HeartShopIntroText> = {
  ko: {
    title: "하트 많이 모으셨나요?",
    body: "이제 사랑 상점에서 지금까지 모은 하트로 신앙의 친구들을 초대해보세요!",
    openShop: "사랑 상점 둘러보기",
    close: "닫기",
  },
  en: {
    title: "Have you collected lots of Hearts?",
    body: "Visit the Love Shop and use the Hearts you have gathered to welcome new friends into your faith journey!",
    openShop: "Explore the Love Shop",
    close: "Close",
  },
  de: {
    title: "Hast du viele Herzen gesammelt?",
    body: "Besuche jetzt den Herzenshop und lade mit deinen gesammelten Herzen neue Freunde auf deine Glaubensreise ein!",
    openShop: "Herzenshop entdecken",
    close: "Schließen",
  },
  fr: {
    title: "Avez-vous récolté beaucoup de cœurs ?",
    body: "Découvrez la Boutique d’amour et utilisez les cœurs récoltés pour inviter de nouveaux amis sur votre chemin de foi !",
    openShop: "Découvrir la Boutique d’amour",
    close: "Fermer",
  },
};

function normalizeLang(lang: string): HeartShopIntroLang {
  if (lang === "en" || lang === "de" || lang === "fr") return lang;
  return "ko";
}

export function getHeartShopIntroText(lang: string): HeartShopIntroText {
  return HEART_SHOP_INTRO_TEXT[normalizeLang(lang)];
}

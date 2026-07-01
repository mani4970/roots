type LoveHeartIntroLang = "ko" | "en" | "de" | "fr";

type LoveHeartIntroPopupText = {
  title: string;
  body: string;
  futureHint: string;
  button: string;
};

const LOVE_HEART_INTRO_POPUP_TEXT: Record<LoveHeartIntroLang, LoveHeartIntroPopupText> = {
  ko: {
    title: "하트를 모아보세요! 💛",
    body: "묵상에 축복의 마음을 남기고,\n기도 소원에 함께 기도하고,\n기도 응답에 함께 감사하면 하트가 쌓여요.\n\n예수님의 사랑을 전하며 하트를 모아보세요.",
    futureHint: "모아둔 하트는 앞으로의 특별한 여정에 쓰일 거예요.",
    button: "확인했어요",
  },
  en: {
    title: "Collect hearts! 💛",
    body: "Leave a blessing on a reflection,\npray with someone’s prayer request,\nand give thanks for an answered prayer to collect hearts.\n\nShare the love of Jesus and keep gathering hearts.",
    futureHint: "The hearts you collect will become part of a special journey ahead.",
    button: "Got it",
  },
  de: {
    title: "Sammle Herzen! 💛",
    body: "Hinterlasse einen Segen bei einer Stille-Zeit-Reflexion,\nbete für ein Gebetsanliegen mit\nund danke gemeinsam für ein erhörtes Gebet – so sammelst du Herzen.\n\nGib Jesu Liebe weiter und sammle Herzen.",
    futureHint: "Die Herzen, die du sammelst, werden Teil einer besonderen Reise sein.",
    button: "Verstanden",
  },
  fr: {
    title: "Collectez des cœurs ! 💛",
    body: "Laissez une bénédiction sur une méditation,\npriez avec quelqu’un pour un sujet de prière,\net rendez grâce pour une prière exaucée afin de collecter des cœurs.\n\nPartagez l’amour de Jésus et continuez à collecter des cœurs.",
    futureHint: "Les cœurs collectés feront partie d’un chemin particulier à venir.",
    button: "J’ai compris",
  },
};

export function getLoveHeartIntroPopupText(lang: string): LoveHeartIntroPopupText {
  if (lang === "ko" || lang === "en" || lang === "de" || lang === "fr") {
    return LOVE_HEART_INTRO_POPUP_TEXT[lang];
  }
  return LOVE_HEART_INTRO_POPUP_TEXT.ko;
}

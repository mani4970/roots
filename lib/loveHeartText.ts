import type { LoveHeartSourceType } from "@/lib/loveHearts";

type LoveHeartToastLang = "ko" | "en" | "de" | "fr";

type LoveHeartToastMap = Record<LoveHeartSourceType, Record<LoveHeartToastLang, string>>;

const LOVE_HEART_TOASTS: LoveHeartToastMap = {
  qt_reaction: {
    ko: "축복의 마음을 남겼어요 💛 +1",
    en: "You left a blessing 💛 +1",
    de: "Du hast einen Segen hinterlassen 💛 +1",
    fr: "Vous avez laissé une bénédiction 💛 +1",
  },
  prayer_intercession: {
    ko: "중보기도 결단했어요 💛 +1",
    en: "You committed to pray 💛 +1",
    de: "Du hast Fürbitte zugesagt 💛 +1",
    fr: "Vous vous êtes engagé à prier 💛 +1",
  },
  answered_prayer_gratitude: {
    ko: "함께 감사했어요 💛 +1",
    en: "You gave thanks together 💛 +1",
    de: "Du hast mitgedankt 💛 +1",
    fr: "Vous avez rendu grâce ensemble 💛 +1",
  },
};

function normalizeLoveHeartToastLang(lang: string): LoveHeartToastLang {
  if (lang === "ko" || lang === "en" || lang === "de" || lang === "fr") return lang;
  return "en";
}

export function getLoveHeartToastText(sourceType: LoveHeartSourceType, lang: string): string {
  return LOVE_HEART_TOASTS[sourceType][normalizeLoveHeartToastLang(lang)];
}

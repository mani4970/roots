import type { Lang } from "@/lib/i18n";

export type ProfileCharacterCategory = "all" | "tops" | "bottoms" | "shoes" | "accessories";

type ProfileCharacterLang = "ko" | "en" | "de" | "fr";

export type ProfileCharacterText = {
  previewLabel: string;
  emptyTitle: string;
  emptyBody: string;
  openFullViewLabel: string;
  closeFullViewLabel: string;
  categories: Record<ProfileCharacterCategory, string>;
};

const TEXT: Record<ProfileCharacterLang, ProfileCharacterText> = {
  ko: {
    previewLabel: "미리보기",
    emptyTitle: "꾸미기 아이템을 준비하고 있어요",
    emptyBody: "새로운 아이템이 준비되면 이곳에서 바로 미리 볼 수 있어요.",
    openFullViewLabel: "내 캐릭터 전체 보기",
    closeFullViewLabel: "캐릭터 전체 보기 닫기",
    categories: {
      all: "전체",
      tops: "상의",
      bottoms: "하의",
      shoes: "신발",
      accessories: "액세서리",
    },
  },
  en: {
    previewLabel: "Preview",
    emptyTitle: "Customization items are coming",
    emptyBody: "When new items arrive, you can preview them here right away.",
    openFullViewLabel: "View my character",
    closeFullViewLabel: "Close character view",
    categories: {
      all: "All",
      tops: "Tops",
      bottoms: "Bottoms",
      shoes: "Shoes",
      accessories: "Accessories",
    },
  },
  de: {
    previewLabel: "Vorschau",
    emptyTitle: "Neue Styling-Items sind in Vorbereitung",
    emptyBody: "Sobald neue Items verfügbar sind, kannst du sie hier direkt ansehen.",
    openFullViewLabel: "Meinen Charakter ansehen",
    closeFullViewLabel: "Charakteransicht schließen",
    categories: {
      all: "Alle",
      tops: "Oberteile",
      bottoms: "Unterteile",
      shoes: "Schuhe",
      accessories: "Accessoires",
    },
  },
  fr: {
    previewLabel: "Aperçu",
    emptyTitle: "De nouveaux objets de personnalisation arrivent",
    emptyBody: "Dès que de nouveaux objets seront disponibles, vous pourrez les essayer ici.",
    openFullViewLabel: "Voir mon personnage",
    closeFullViewLabel: "Fermer la vue du personnage",
    categories: {
      all: "Tout",
      tops: "Hauts",
      bottoms: "Bas",
      shoes: "Chaussures",
      accessories: "Accessoires",
    },
  },
};

function normalizeLang(lang: Lang | string): ProfileCharacterLang {
  return lang === "en" || lang === "de" || lang === "fr" ? lang : "ko";
}

export function getProfileCharacterText(lang: Lang | string): ProfileCharacterText {
  return TEXT[normalizeLang(lang)];
}

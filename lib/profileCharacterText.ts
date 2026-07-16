import type { Lang } from "@/lib/i18n";
import {
  getCharacterItemAvatarType,
  getCharacterItemSlot,
  type HeartShopCharacterItemId,
  type HeartShopCharacterSlot,
} from "@/lib/heartShopItems";
import type { RootsAvatarType } from "@/lib/avatar";

export type ProfileCharacterCategory = "all" | "tops" | "bottoms" | "shoes" | "eyewear" | "headwear";

type ProfileCharacterLang = "ko" | "en" | "de" | "fr";

export type ProfileCharacterText = {
  previewLabel: string;
  restoreOutfitLabel: string;
  emptyTitle: string;
  emptyBody: string;
  openFullViewLabel: string;
  closeFullViewLabel: string;
  categories: Record<ProfileCharacterCategory, string>;
};

type ItemNames = Record<RootsAvatarType, Record<HeartShopCharacterSlot, readonly string[]>>;

const TEXT: Record<ProfileCharacterLang, ProfileCharacterText> = {
  ko: {
    previewLabel: "미리보기",
    restoreOutfitLabel: "현재 코디로 복원",
    emptyTitle: "이 카테고리에는 아이템이 없어요",
    emptyBody: "다른 카테고리를 선택해보세요.",
    openFullViewLabel: "내 캐릭터 전체 보기",
    closeFullViewLabel: "캐릭터 전체 보기 닫기",
    categories: {
      all: "전체",
      tops: "상의",
      bottoms: "하의",
      shoes: "신발",
      eyewear: "안경·선글라스",
      headwear: "모자",
    },
  },
  en: {
    previewLabel: "Preview",
    restoreOutfitLabel: "Restore current outfit",
    emptyTitle: "No items in this category",
    emptyBody: "Try another category.",
    openFullViewLabel: "View my character",
    closeFullViewLabel: "Close character view",
    categories: {
      all: "All",
      tops: "Tops",
      bottoms: "Bottoms",
      shoes: "Shoes",
      eyewear: "Glasses & shades",
      headwear: "Hats",
    },
  },
  de: {
    previewLabel: "Vorschau",
    restoreOutfitLabel: "Aktuelles Outfit wiederherstellen",
    emptyTitle: "Keine Items in dieser Kategorie",
    emptyBody: "Wähle eine andere Kategorie.",
    openFullViewLabel: "Meinen Charakter ansehen",
    closeFullViewLabel: "Charakteransicht schließen",
    categories: {
      all: "Alle",
      tops: "Oberteile",
      bottoms: "Unterteile",
      shoes: "Schuhe",
      eyewear: "Brillen & Sonnenbrillen",
      headwear: "Mützen & Hüte",
    },
  },
  fr: {
    previewLabel: "Aperçu",
    restoreOutfitLabel: "Restaurer la tenue actuelle",
    emptyTitle: "Aucun objet dans cette catégorie",
    emptyBody: "Choisissez une autre catégorie.",
    openFullViewLabel: "Voir mon personnage",
    closeFullViewLabel: "Fermer la vue du personnage",
    categories: {
      all: "Tout",
      tops: "Hauts",
      bottoms: "Bas",
      shoes: "Chaussures",
      eyewear: "Lunettes",
      headwear: "Chapeaux",
    },
  },
};

const ITEM_NAMES: Record<ProfileCharacterLang, ItemNames> = {
  ko: {
    rootsman: {
      bottom: ["차콜 원턱 버뮤다", "연청 데님 버뮤다", "올리브 카고 쇼츠", "블랙 와이드 슬랙스", "에크루 스트레이트 치노", "인디고 와이드 데님"],
      shoes: ["레트로 스니커즈", "실버 그레이 러너", "블랙 청키 로퍼", "새싹 하트 샌드 클로그"],
      top: ["오트밀 GRACE 맨투맨", "파우더 GOD IS GOOD 니트", "차콜 AMEN 후디", "세이지 JESUS IS LOVE 티", "네이비 십자가 폴로", "아이보리 캠프 셔츠"],
      eyewear: ["버건디 브로라인 안경", "네이비 라운드 안경", "브라운 스퀘어 안경", "블루 오벌 선글라스", "블랙 렉탱글 선글라스", "앰버 스퀘어 선글라스"],
      headwear: ["라피아 네이비 버킷햇", "워시드 차콜 볼캡", "오트밀 뉴스보이캡", "딥 포레스트 비니"],
    },
    rootswoman: {
      bottom: ["차콜 플리츠 미니스커트", "연청 테일러드 쇼츠", "아이보리 랩 미니스커트", "블랙 세미와이드 슬랙스", "다크 인디고 부츠컷 데님", "딥 네이비 맥시스커트"],
      shoes: ["아이보리 핑크 레트로 스니커즈", "블랙 더블 스트랩 메리제인", "실버 라일락 러너", "버건디 페니 로퍼"],
      top: ["워시드 네이비 JESUS LOVES ME 티", "코랄 AMEN 카디건", "세이지 GOD IS GOOD 니트", "오트밀 하트 후디", "라벤더 JESUS 폴로", "차콜 GRACE 맨투맨"],
      eyewear: ["로즈 캣아이 안경", "라벤더 라운드 안경", "골드 라운드 스퀘어 안경", "아이보리 캣아이 선글라스", "레드 하트 선글라스", "라일락 오버사이즈 선글라스"],
      headwear: ["아이보리 리본 클로슈", "네이비 하트 볼캡", "차콜 플라워 베레", "라벤더 데이지 버킷햇"],
    },
  },
  en: {
    rootsman: {
      bottom: ["Charcoal Bermuda Shorts", "Light-Wash Denim Bermudas", "Olive Cargo Shorts", "Black Wide Slacks", "Ecru Straight Chinos", "Indigo Wide Denim"],
      shoes: ["Retro Sneakers", "Silver Gray Runners", "Black Chunky Loafers", "Sprout Heart Sand Clogs"],
      top: ["Oatmeal GRACE Sweatshirt", "Powder GOD IS GOOD Knit", "Charcoal AMEN Hoodie", "Sage JESUS IS LOVE Tee", "Navy Cross Polo", "Ivory Camp Shirt"],
      eyewear: ["Burgundy Browline Glasses", "Navy Round Glasses", "Brown Square Glasses", "Blue Oval Sunglasses", "Black Rectangle Sunglasses", "Amber Square Sunglasses"],
      headwear: ["Raffia Navy Bucket Hat", "Washed Charcoal Cap", "Oatmeal Newsboy Cap", "Deep Forest Beanie"],
    },
    rootswoman: {
      bottom: ["Charcoal Pleated Mini", "Light-Wash Tailored Shorts", "Ivory Wrap Mini", "Black Semi-Wide Slacks", "Dark Indigo Bootcut Denim", "Deep Navy Maxi Skirt"],
      shoes: ["Ivory Pink Retro Sneakers", "Black Double-Strap Mary Janes", "Silver Lilac Runners", "Burgundy Penny Loafers"],
      top: ["Navy JESUS LOVES ME Tee", "Coral AMEN Cardigan", "Sage GOD IS GOOD Knit", "Oatmeal Heart Hoodie", "Lavender JESUS Polo", "Charcoal GRACE Sweatshirt"],
      eyewear: ["Rose Cat-Eye Glasses", "Lavender Round Glasses", "Gold Rounded-Square Glasses", "Ivory Cat-Eye Sunglasses", "Red Heart Sunglasses", "Lilac Oversized Sunglasses"],
      headwear: ["Ivory Ribbon Cloche", "Navy Heart Cap", "Charcoal Flower Beret", "Lavender Daisy Bucket Hat"],
    },
  },
  de: {
    rootsman: {
      bottom: ["Anthrazit-Bermudas", "Helle Denim-Bermudas", "Olivgrüne Cargo-Shorts", "Schwarze weite Hose", "Ecru-Chinos", "Weite Indigo-Jeans"],
      shoes: ["Retro-Sneaker", "Silbergraue Laufschuhe", "Schwarze Chunky-Loafer", "Sand-Clogs mit Herz"],
      top: ["GRACE-Sweatshirt in Oatmeal", "GOD IS GOOD Strickpullover", "AMEN-Hoodie in Anthrazit", "JESUS IS LOVE Shirt in Salbei", "Marineblaues Kreuz-Polo", "Elfenbeinfarbenes Camp-Shirt"],
      eyewear: ["Burgunder Browline-Brille", "Runde marineblaue Brille", "Braune eckige Brille", "Blaue ovale Sonnenbrille", "Schwarze rechteckige Sonnenbrille", "Bernsteinfarbene Sonnenbrille"],
      headwear: ["Raffia-Bucket-Hat", "Anthrazitfarbene Kappe", "Oatmeal-Schiebermütze", "Waldgrüne Beanie"],
    },
    rootswoman: {
      bottom: ["Anthrazitfarbener Faltenrock", "Helle Tailored Shorts", "Elfenbeinfarbener Wickelrock", "Schwarze Semi-Wide-Hose", "Dunkle Bootcut-Jeans", "Marineblauer Maxirock"],
      shoes: ["Retro-Sneaker in Elfenbeinrosa", "Schwarze Mary Janes", "Silber-lilafarbene Laufschuhe", "Burgunderfarbene Pennyloafer"],
      top: ["JESUS LOVES ME Shirt in Navy", "AMEN-Cardigan in Koralle", "GOD IS GOOD Strick in Salbei", "Oatmeal-Herz-Hoodie", "JESUS-Polo in Lavendel", "GRACE-Sweatshirt in Anthrazit"],
      eyewear: ["Roséfarbene Cateye-Brille", "Runde Lavendel-Brille", "Goldene Rundquadrat-Brille", "Elfenbeinfarbene Cateye-Sonnenbrille", "Rote Herz-Sonnenbrille", "Große lilafarbene Sonnenbrille"],
      headwear: ["Elfenbeinfarbener Glockenhut", "Marineblaue Herz-Kappe", "Anthrazit-Baskenmütze mit Blume", "Lavendel-Bucket-Hat mit Gänseblümchen"],
    },
  },
  fr: {
    rootsman: {
      bottom: ["Bermuda anthracite", "Bermuda en denim clair", "Short cargo olive", "Pantalon large noir", "Chino droit écru", "Jean large indigo"],
      shoes: ["Baskets rétro", "Baskets argent et gris", "Mocassins noirs épais", "Sabots sable cœur et pousse"],
      top: ["Sweat GRACE avoine", "Pull GOD IS GOOD poudré", "Sweat à capuche AMEN anthracite", "T-shirt JESUS IS LOVE sauge", "Polo croix marine", "Chemise camp ivoire"],
      eyewear: ["Lunettes browline bordeaux", "Lunettes rondes marine", "Lunettes carrées brunes", "Lunettes de soleil ovales bleues", "Lunettes de soleil rectangulaires noires", "Lunettes de soleil carrées ambre"],
      headwear: ["Bob raphia marine", "Casquette anthracite délavée", "Casquette gavroche avoine", "Bonnet vert forêt"],
    },
    rootswoman: {
      bottom: ["Minijupe plissée anthracite", "Short ajusté en denim clair", "Minijupe portefeuille ivoire", "Pantalon semi-large noir", "Jean bootcut indigo foncé", "Jupe longue bleu marine"],
      shoes: ["Baskets rétro ivoire et rose", "Mary Janes noires à double bride", "Baskets argent et lilas", "Mocassins bordeaux"],
      top: ["T-shirt JESUS LOVES ME marine", "Cardigan AMEN corail", "Pull GOD IS GOOD sauge", "Sweat à capuche cœur avoine", "Polo JESUS lavande", "Sweat GRACE anthracite"],
      eyewear: ["Lunettes œil-de-chat roses", "Lunettes rondes lavande", "Lunettes carrées arrondies dorées", "Lunettes de soleil œil-de-chat ivoire", "Lunettes de soleil cœur rouges", "Lunettes de soleil lilas oversize"],
      headwear: ["Cloche ivoire à ruban", "Casquette cœur marine", "Béret anthracite à fleur", "Bob lavande à marguerites"],
    },
  },
};

function normalizeLang(lang: Lang | string): ProfileCharacterLang {
  return lang === "en" || lang === "de" || lang === "fr" ? lang : "ko";
}

export function getProfileCharacterText(lang: Lang | string): ProfileCharacterText {
  return TEXT[normalizeLang(lang)];
}

export function getProfileCharacterItemText(itemId: HeartShopCharacterItemId, lang: Lang | string) {
  const normalizedLang = normalizeLang(lang);
  const avatarType = getCharacterItemAvatarType(itemId);
  const slot = getCharacterItemSlot(itemId);
  const itemIndex = Math.max(0, Number(itemId.slice(-2)) - 1);
  const category: ProfileCharacterCategory = slot === "top" ? "tops" : slot === "bottom" ? "bottoms" : slot;
  return {
    name: ITEM_NAMES[normalizedLang][avatarType][slot][itemIndex] ?? `${TEXT[normalizedLang].categories[category]} ${itemIndex + 1}`,
    description: TEXT[normalizedLang].categories[category],
  };
}

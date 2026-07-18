import type { Lang } from "@/lib/i18n";
import {
  getCharacterItemAvatarType,
  getCharacterItemSlot,
  type HeartShopCharacterItemId,
  type HeartShopCharacterSlot,
} from "@/lib/heartShopItems";
import type { RootsAvatarType } from "@/lib/avatar";

export type ProfileCharacterCategory =
  | "all"
  | "backgrounds"
  | "tops"
  | "bottoms"
  | "shoes"
  | "eyewear"
  | "headwear"
  | "accessories"
  | "bags";

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

type WearableCharacterSlot = Exclude<HeartShopCharacterSlot, "background">;
type ItemNames = Record<RootsAvatarType, Record<WearableCharacterSlot, readonly string[]>>;

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
      backgrounds: "배경",
      tops: "상의",
      bottoms: "하의",
      shoes: "신발",
      eyewear: "안경·선글라스",
      headwear: "모자",
      accessories: "헤어 액세서리",
      bags: "가방",
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
      backgrounds: "Backgrounds",
      tops: "Tops",
      bottoms: "Bottoms",
      shoes: "Shoes",
      eyewear: "Glasses & shades",
      headwear: "Hats",
      accessories: "Hair accessories",
      bags: "Bags",
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
      backgrounds: "Hintergründe",
      tops: "Oberteile",
      bottoms: "Unterteile",
      shoes: "Schuhe",
      eyewear: "Brillen & Sonnenbrillen",
      headwear: "Mützen & Hüte",
      accessories: "Haarschmuck",
      bags: "Taschen",
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
      backgrounds: "Arrière-plans",
      tops: "Hauts",
      bottoms: "Bas",
      shoes: "Chaussures",
      eyewear: "Lunettes",
      headwear: "Chapeaux",
      accessories: "Accessoires cheveux",
      bags: "Sacs",
    },
  },
};

const BACKGROUND_NAMES: Record<ProfileCharacterLang, readonly string[]> = {
  ko: ["햇살 정원", "여름 바다", "포근한 책방", "노을빛 도시 옥상", "라벤더 별빛 밤", "고요한 교회", "스위스 알프스", "파리 에펠탑", "뉴욕 항구", "서울 한강"],
  en: ["Sunlit Garden", "Summer Beach", "Cozy Bookroom", "Sunset City Rooftop", "Lavender Starry Night", "Peaceful Church", "Swiss Alps", "Paris Eiffel Tower", "New York Harbor", "Seoul Han River"],
  de: ["Sonniger Garten", "Sommerstrand", "Gemütliches Bücherzimmer", "Dachterrasse bei Sonnenuntergang", "Lavendelfarbene Sternennacht", "Ruhiger Kirchenraum", "Schweizer Alpen", "Pariser Eiffelturm", "New Yorker Hafen", "Han-Fluss in Seoul"],
  fr: ["Jardin ensoleillé", "Plage d’été", "Bibliothèque chaleureuse", "Toit urbain au coucher du soleil", "Nuit étoilée lavande", "Église paisible", "Alpes suisses", "Tour Eiffel à Paris", "Port de New York", "Fleuve Han à Séoul"],
};

const ITEM_NAMES: Record<ProfileCharacterLang, ItemNames> = {
  ko: {
    rootsman: {
      bottom: ["차콜 원턱 버뮤다", "연청 데님 버뮤다", "올리브 카고 쇼츠", "블랙 와이드 슬랙스", "에크루 스트레이트 치노", "인디고 와이드 데님"],
      shoes: ["레트로 스니커즈", "실버 그레이 러너", "블랙 청키 로퍼", "새싹 하트 샌드 클로그"],
      top: ["오트밀 GRACE 맨투맨", "파우더 GOD IS GOOD 니트", "차콜 AMEN 후디", "세이지 JESUS IS LOVE 티", "네이비 십자가 폴로", "아이보리 캠프 셔츠", "오트밀 오픈 린넨 셔츠", "스카이 캠프 칼라 셔츠", "세이지 니트 오픈 폴로", "워시드 차콜 JESUS 티"],
      bag: [],
      eyewear: ["버건디 브로라인 안경", "네이비 라운드 안경", "브라운 스퀘어 안경", "블루 오벌 선글라스", "블랙 렉탱글 선글라스", "앰버 스퀘어 선글라스"],
      hair_accessory: [],
      headwear: ["라피아 네이비 버킷햇", "워시드 차콜 볼캡", "오트밀 뉴스보이캡", "딥 포레스트 비니"],
    },
    rootswoman: {
      bottom: ["차콜 플리츠 미니스커트", "연청 테일러드 쇼츠", "아이보리 랩 미니스커트", "블랙 세미와이드 슬랙스", "다크 인디고 부츠컷 데님", "딥 네이비 맥시스커트"],
      shoes: ["아이보리 핑크 레트로 스니커즈", "블랙 더블 스트랩 메리제인", "실버 라일락 러너", "버건디 페니 로퍼"],
      top: ["워시드 네이비 JESUS LOVES ME 티", "코랄 AMEN 카디건", "세이지 GOD IS GOOD 니트", "오트밀 하트 후디", "라벤더 JESUS 폴로", "차콜 GRACE 맨투맨", "아이보리 레이스 레이어드 블라우스", "버터 옐로 로맨틱 블라우스", "네이비 블록코어 풋볼 저지", "워시드 데님 크롭 베스트 레이어드"],
      bag: ["블랙 컴팩트 크레센트 크로스백", "버건디 미니 크로스백", "블랙 스트럭처드 핸드백", "아이보리 미니 보스턴백"],
      eyewear: ["로즈 캣아이 안경", "라벤더 라운드 안경", "골드 라운드 스퀘어 안경", "아이보리 캣아이 선글라스", "레드 하트 선글라스", "라일락 오버사이즈 선글라스"],
      hair_accessory: ["아이보리 리본 헤어핀", "진주 플라워 헤어핀", "블랙 벨벳 리본 헤어핀", "슬림 펄 헤어밴드", "블랙 패디드 헤어밴드", "더스티 핑크 트위스트 헤어밴드"],
      headwear: ["아이보리 리본 클로슈", "네이비 하트 볼캡", "차콜 플라워 베레", "라벤더 데이지 버킷햇"],
    },
  },
  en: {
    rootsman: {
      bottom: ["Charcoal Bermuda Shorts", "Light-Wash Denim Bermudas", "Olive Cargo Shorts", "Black Wide Slacks", "Ecru Straight Chinos", "Indigo Wide Denim"],
      shoes: ["Retro Sneakers", "Silver Gray Runners", "Black Chunky Loafers", "Sprout Heart Sand Clogs"],
      top: ["Oatmeal GRACE Sweatshirt", "Powder GOD IS GOOD Knit", "Charcoal AMEN Hoodie", "Sage JESUS IS LOVE Tee", "Navy Cross Polo", "Ivory Camp Shirt", "Oatmeal Open Linen Shirt", "Sky Camp-Collar Shirt", "Sage Knit Open Polo", "Washed Charcoal JESUS Tee"],
      bag: [],
      eyewear: ["Burgundy Browline Glasses", "Navy Round Glasses", "Brown Square Glasses", "Blue Oval Sunglasses", "Black Rectangle Sunglasses", "Amber Square Sunglasses"],
      hair_accessory: [],
      headwear: ["Raffia Navy Bucket Hat", "Washed Charcoal Cap", "Oatmeal Newsboy Cap", "Deep Forest Beanie"],
    },
    rootswoman: {
      bottom: ["Charcoal Pleated Mini", "Light-Wash Tailored Shorts", "Ivory Wrap Mini", "Black Semi-Wide Slacks", "Dark Indigo Bootcut Denim", "Deep Navy Maxi Skirt"],
      shoes: ["Ivory Pink Retro Sneakers", "Black Double-Strap Mary Janes", "Silver Lilac Runners", "Burgundy Penny Loafers"],
      top: ["Navy JESUS LOVES ME Tee", "Coral AMEN Cardigan", "Sage GOD IS GOOD Knit", "Oatmeal Heart Hoodie", "Lavender JESUS Polo", "Charcoal GRACE Sweatshirt", "Ivory Lace Layered Blouse", "Butter Yellow Romantic Blouse", "Navy Blockcore Football Jersey", "Washed Denim Cropped Layered Vest"],
      bag: ["Black Compact Crescent Crossbody", "Burgundy Mini Crossbody", "Black Structured Handbag", "Ivory Mini Boston Bag"],
      eyewear: ["Rose Cat-Eye Glasses", "Lavender Round Glasses", "Gold Rounded-Square Glasses", "Ivory Cat-Eye Sunglasses", "Red Heart Sunglasses", "Lilac Oversized Sunglasses"],
      hair_accessory: ["Ivory Bow Hair Clip", "Pearl Flower Barrette", "Black Velvet Bow Hair Clip", "Slim Pearl Headband", "Black Padded Headband", "Dusty Pink Twist Headband"],
      headwear: ["Ivory Ribbon Cloche", "Navy Heart Cap", "Charcoal Flower Beret", "Lavender Daisy Bucket Hat"],
    },
  },
  de: {
    rootsman: {
      bottom: ["Anthrazit-Bermudas", "Helle Denim-Bermudas", "Olivgrüne Cargo-Shorts", "Schwarze weite Hose", "Ecru-Chinos", "Weite Indigo-Jeans"],
      shoes: ["Retro-Sneaker", "Silbergraue Laufschuhe", "Schwarze Chunky-Loafer", "Sand-Clogs mit Herz"],
      top: ["GRACE-Sweatshirt in Oatmeal", "GOD IS GOOD Strickpullover", "AMEN-Hoodie in Anthrazit", "JESUS IS LOVE Shirt in Salbei", "Marineblaues Kreuz-Polo", "Elfenbeinfarbenes Camp-Shirt", "Offenes Leinenhemd in Oatmeal", "Himmelblaues Camp-Kragen-Hemd", "Offenes Strickpolo in Salbei", "Verwaschenes JESUS-Shirt in Anthrazit"],
      bag: [],
      eyewear: ["Burgunder Browline-Brille", "Runde marineblaue Brille", "Braune eckige Brille", "Blaue ovale Sonnenbrille", "Schwarze rechteckige Sonnenbrille", "Bernsteinfarbene Sonnenbrille"],
      hair_accessory: [],
      headwear: ["Raffia-Bucket-Hat", "Anthrazitfarbene Kappe", "Oatmeal-Schiebermütze", "Waldgrüne Beanie"],
    },
    rootswoman: {
      bottom: ["Anthrazitfarbener Faltenrock", "Helle Tailored Shorts", "Elfenbeinfarbener Wickelrock", "Schwarze Semi-Wide-Hose", "Dunkle Bootcut-Jeans", "Marineblauer Maxirock"],
      shoes: ["Retro-Sneaker in Elfenbeinrosa", "Schwarze Mary Janes", "Silber-lilafarbene Laufschuhe", "Burgunderfarbene Pennyloafer"],
      top: ["JESUS LOVES ME Shirt in Navy", "AMEN-Cardigan in Koralle", "GOD IS GOOD Strick in Salbei", "Oatmeal-Herz-Hoodie", "JESUS-Polo in Lavendel", "GRACE-Sweatshirt in Anthrazit", "Elfenbeinfarbene Spitzen-Layering-Bluse", "Buttergelbe romantische Bluse", "Marineblaues Blockcore-Footballtrikot", "Cropped Layering-Weste aus verwaschenem Denim"],
      bag: ["Kompakte schwarze Halbmond-Umhängetasche", "Burgunderrote Mini-Umhängetasche", "Schwarze strukturierte Handtasche", "Elfenbeinfarbene Mini-Boston-Tasche"],
      eyewear: ["Roséfarbene Cateye-Brille", "Runde Lavendel-Brille", "Goldene Rundquadrat-Brille", "Elfenbeinfarbene Cateye-Sonnenbrille", "Rote Herz-Sonnenbrille", "Große lilafarbene Sonnenbrille"],
      hair_accessory: ["Elfenbeinfarbene Schleifen-Haarspange", "Haarspange mit Perlenblume", "Schwarze Samt-Schleifen-Haarspange", "Schmaler Perlen-Haarreif", "Schwarzer gepolsterter Haarreif", "Altrosa Twist-Haarreif"],
      headwear: ["Elfenbeinfarbener Glockenhut", "Marineblaue Herz-Kappe", "Anthrazit-Baskenmütze mit Blume", "Lavendel-Bucket-Hat mit Gänseblümchen"],
    },
  },
  fr: {
    rootsman: {
      bottom: ["Bermuda anthracite", "Bermuda en denim clair", "Short cargo olive", "Pantalon large noir", "Chino droit écru", "Jean large indigo"],
      shoes: ["Baskets rétro", "Baskets argent et gris", "Mocassins noirs épais", "Sabots sable cœur et pousse"],
      top: ["Sweat GRACE avoine", "Pull GOD IS GOOD poudré", "Sweat à capuche AMEN anthracite", "T-shirt JESUS IS LOVE sauge", "Polo croix marine", "Chemise camp ivoire", "Chemise ouverte en lin avoine", "Chemise col cubain bleu ciel", "Polo ouvert en maille sauge", "T-shirt JESUS anthracite délavé"],
      bag: [],
      eyewear: ["Lunettes browline bordeaux", "Lunettes rondes marine", "Lunettes carrées brunes", "Lunettes de soleil ovales bleues", "Lunettes de soleil rectangulaires noires", "Lunettes de soleil carrées ambre"],
      hair_accessory: [],
      headwear: ["Bob raphia marine", "Casquette anthracite délavée", "Casquette gavroche avoine", "Bonnet vert forêt"],
    },
    rootswoman: {
      bottom: ["Minijupe plissée anthracite", "Short ajusté en denim clair", "Minijupe portefeuille ivoire", "Pantalon semi-large noir", "Jean bootcut indigo foncé", "Jupe longue bleu marine"],
      shoes: ["Baskets rétro ivoire et rose", "Mary Janes noires à double bride", "Baskets argent et lilas", "Mocassins bordeaux"],
      top: ["T-shirt JESUS LOVES ME marine", "Cardigan AMEN corail", "Pull GOD IS GOOD sauge", "Sweat à capuche cœur avoine", "Polo JESUS lavande", "Sweat GRACE anthracite", "Blouse ivoire superposée en dentelle", "Blouse romantique jaune beurre", "Maillot de football blockcore marine", "Gilet court superposé en denim délavé"],
      bag: ["Petit sac bandoulière demi-lune noir", "Mini sac bandoulière bordeaux", "Sac à main structuré noir", "Mini sac Boston ivoire"],
      eyewear: ["Lunettes œil-de-chat roses", "Lunettes rondes lavande", "Lunettes carrées arrondies dorées", "Lunettes de soleil œil-de-chat ivoire", "Lunettes de soleil cœur rouges", "Lunettes de soleil lilas oversize"],
      hair_accessory: ["Barrette nœud ivoire", "Barrette fleur perlée", "Barrette nœud en velours noir", "Serre-tête fin perlé", "Serre-tête rembourré noir", "Serre-tête torsadé rose poudré"],
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

  if (slot === "background") {
    return {
      name: BACKGROUND_NAMES[normalizedLang][itemIndex] || `${TEXT[normalizedLang].categories.backgrounds} ${itemIndex + 1}`,
      description: TEXT[normalizedLang].categories.backgrounds,
    };
  }

  const categoryBySlot: Record<HeartShopCharacterSlot, ProfileCharacterCategory> = {
    background: "backgrounds",
    bottom: "bottoms",
    shoes: "shoes",
    top: "tops",
    bag: "bags",
    eyewear: "eyewear",
    hair_accessory: "accessories",
    headwear: "headwear",
  };
  const category = categoryBySlot[slot];
  const wearableAvatarType: RootsAvatarType = avatarType === "rootswoman" ? "rootswoman" : "rootsman";
  return {
    name: ITEM_NAMES[normalizedLang][wearableAvatarType][slot][itemIndex] || `${TEXT[normalizedLang].categories[category]} ${itemIndex + 1}`,
    description: TEXT[normalizedLang].categories[category],
  };
}

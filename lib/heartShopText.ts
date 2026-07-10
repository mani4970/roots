import type { Lang } from "@/lib/i18n";

export type HeartShopTab = "map" | "character" | "owned";
export type HeartShopItemId = "jjaekjjaek" | "hindungi" | "choko" | "kkumdeuli";

type ShopLang = "ko" | "en" | "de" | "fr";

type HeartShopItemText = {
  name: string;
  description: string;
};

type HeartShopText = {
  openButton: string;
  title: string;
  balanceLabel: string;
  closeLabel: string;
  mapTab: string;
  characterTab: string;
  ownedTab: string;
  purchaseButton: string;
  purchaseComingSoon: string;
  characterComingSoonTitle: string;
  characterComingSoonBody: string;
  ownedEmptyTitle: string;
  ownedEmptyBody: string;
  mapIntro: string;
  items: Record<HeartShopItemId, HeartShopItemText>;
};

const TEXT: Record<ShopLang, HeartShopText> = {
  ko: {
    openButton: "🛍️ 사랑 상점",
    title: "사랑 상점",
    balanceLabel: "보유 하트",
    closeLabel: "사랑 상점 닫기",
    mapTab: "맵 꾸미기",
    characterTab: "캐릭터 꾸미기",
    ownedTab: "내 아이템",
    purchaseButton: "아이템 구매",
    purchaseComingSoon: "안전한 구매 기능은 다음 단계에서 연결돼요.",
    characterComingSoonTitle: "캐릭터 꾸미기 준비 중",
    characterComingSoonBody: "루츠맨과 루츠우먼을 위한 특별한 꾸미기 아이템이 곧 찾아올 거예요.",
    ownedEmptyTitle: "아직 구매한 아이템이 없어요",
    ownedEmptyBody: "움직이는 친구를 만나면 이곳에서 ON / OFF로 관리할 수 있어요.",
    mapIntro: "사랑 하트로 말씀동행 여정에 함께할 친구를 만나보세요.",
    items: {
      jjaekjjaek: { name: "짹짹이", description: "하늘을 파닥파닥 날아다녀요" },
      hindungi: { name: "흰둥이", description: "꼬리를 흔들며 반겨줘요" },
      choko: { name: "쪼코", description: "꼬리를 살랑이며 함께 있어줘요" },
      kkumdeuli: { name: "꿈틀이", description: "흙에서 쏙 올라와 꿈틀거려요" },
    },
  },
  en: {
    openButton: "🛍️ Love Shop",
    title: "Love Shop",
    balanceLabel: "Love Hearts",
    closeLabel: "Close Love Shop",
    mapTab: "Map Decor",
    characterTab: "Character Decor",
    ownedTab: "My Items",
    purchaseButton: "Buy item",
    purchaseComingSoon: "Secure purchases will be connected in the next step.",
    characterComingSoonTitle: "Character decor is coming",
    characterComingSoonBody: "Special items for Rootsman and Rootswoman will arrive soon.",
    ownedEmptyTitle: "You have no items yet",
    ownedEmptyBody: "After meeting a moving friend, you can turn it ON or OFF here.",
    mapIntro: "Use Love Hearts to invite a new friend into your Word-walk journey.",
    items: {
      jjaekjjaek: { name: "Chirpy", description: "Flutters freely through the sky" },
      hindungi: { name: "Snowy", description: "Greets you with a happy wagging tail" },
      choko: { name: "Choco", description: "Stays close with a gentle swish of its tail" },
      kkumdeuli: { name: "Wiggles", description: "Pops out of the soil and wiggles around" },
    },
  },
  de: {
    openButton: "🛍️ Herzenshop",
    title: "Herzenshop",
    balanceLabel: "Liebesherzen",
    closeLabel: "Herzenshop schließen",
    mapTab: "Karte gestalten",
    characterTab: "Figur gestalten",
    ownedTab: "Meine Items",
    purchaseButton: "Item kaufen",
    purchaseComingSoon: "Die sichere Kauf-Funktion wird im nächsten Schritt verbunden.",
    characterComingSoonTitle: "Figuren-Deko kommt bald",
    characterComingSoonBody: "Besondere Items für Rootsman und Rootswoman folgen bald.",
    ownedEmptyTitle: "Du hast noch keine Items",
    ownedEmptyBody: "Gekaufte Freunde kannst du hier später einfach EIN- oder AUSschalten.",
    mapIntro: "Lade mit Liebesherzen einen neuen Freund auf deinen Weg mit dem Wort ein.",
    items: {
      jjaekjjaek: { name: "Piepsi", description: "Flattert fröhlich durch den Himmel" },
      hindungi: { name: "Flocki", description: "Begrüßt dich mit wedelndem Schwanz" },
      choko: { name: "Choco", description: "Bleibt mit sanftem Schwanzwedeln bei dir" },
      kkumdeuli: { name: "Wurmi", description: "Schaut aus der Erde und kringelt sich" },
    },
  },
  fr: {
    openButton: "🛍️ Boutique d’amour",
    title: "Boutique d’amour",
    balanceLabel: "Cœurs d’amour",
    closeLabel: "Fermer la boutique d’amour",
    mapTab: "Décorer la carte",
    characterTab: "Décorer le personnage",
    ownedTab: "Mes objets",
    purchaseButton: "Acheter l’objet",
    purchaseComingSoon: "Les achats sécurisés seront connectés à la prochaine étape.",
    characterComingSoonTitle: "La personnalisation arrive bientôt",
    characterComingSoonBody: "Des objets spéciaux pour Rootsman et Rootswoman arriveront bientôt.",
    ownedEmptyTitle: "Vous n’avez pas encore d’objet",
    ownedEmptyBody: "Après avoir accueilli un ami animé, vous pourrez l’activer ou le désactiver ici.",
    mapIntro: "Utilisez vos Cœurs d’amour pour inviter un ami dans votre chemin avec la Parole.",
    items: {
      jjaekjjaek: { name: "Cui-Cui", description: "Vole joyeusement dans le ciel" },
      hindungi: { name: "Neige", description: "Vous accueille en remuant la queue" },
      choko: { name: "Choco", description: "Reste près de vous en balançant doucement la queue" },
      kkumdeuli: { name: "Tortille", description: "Sort de la terre et se tortille" },
    },
  },
};

function safeLang(lang: Lang | string): ShopLang {
  return lang === "de" || lang === "en" || lang === "fr" ? lang : "ko";
}

export function getHeartShopText(lang: Lang | string): HeartShopText {
  return TEXT[safeLang(lang)];
}

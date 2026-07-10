import type { Lang } from "@/lib/i18n";

export type HeartShopTab = "map" | "character" | "owned";
export type HeartShopItemId = "jjaekjjaek" | "hindungi" | "choko" | "kkumdeuli";

type ShopLang = "ko" | "en" | "de" | "fr";

type HeartShopItemText = {
  name: string;
  description: string;
  purchaseTitle: string;
  purchaseBody: string;
  completeTitle: string;
  completeBody: string;
};

export type HeartShopText = {
  openButton: string;
  title: string;
  balanceLabel: string;
  closeLabel: string;
  mapTab: string;
  characterTab: string;
  ownedTab: string;
  purchaseButton: string;
  ownedButton: string;
  previewBadge: string;
  previewTitle: string;
  closePreviewButton: string;
  cancelButton: string;
  purchaseAction: string;
  purchasingLabel: string;
  continueShoppingButton: string;
  viewOwnedButton: string;
  insufficientHearts: string;
  purchaseFailed: string;
  shopUnavailable: string;
  alreadyOwned: string;
  loadingOwned: string;
  toggleFailed: string;
  enabledLabel: string;
  disabledLabel: string;
  characterComingSoonTitle: string;
  characterComingSoonBody: string;
  ownedEmptyTitle: string;
  ownedEmptyBody: string;
  ownedIntro: string;
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
    ownedButton: "구매 완료",
    previewBadge: "움직임 보기",
    previewTitle: "움직이는 친구 미리보기",
    closePreviewButton: "닫기",
    cancelButton: "취소",
    purchaseAction: "💛 {price}으로 구매",
    purchasingLabel: "구매 중...",
    continueShoppingButton: "계속 둘러보기",
    viewOwnedButton: "내 아이템 보기",
    insufficientHearts: "하트가 {needed}개 부족해요.",
    purchaseFailed: "아이템을 구매하지 못했어요. 잠시 후 다시 시도해주세요.",
    shopUnavailable: "사랑 상점 정보를 불러오지 못했어요.",
    alreadyOwned: "이미 구매한 아이템이에요.",
    loadingOwned: "내 아이템을 불러오고 있어요",
    toggleFailed: "아이템 표시 설정을 저장하지 못했어요.",
    enabledLabel: "ON",
    disabledLabel: "OFF",
    characterComingSoonTitle: "캐릭터 꾸미기 준비 중",
    characterComingSoonBody: "루츠맨과 루츠우먼을 위한 특별한 꾸미기 아이템이 곧 찾아올 거예요.",
    ownedEmptyTitle: "아직 구매한 아이템이 없어요",
    ownedEmptyBody: "움직이는 친구를 만나면 이곳에서 ON / OFF로 관리할 수 있어요.",
    ownedIntro: "구매한 친구를 홈 맵에 보이거나 숨길 수 있어요.",
    mapIntro: "사랑 하트로 말씀동행 여정에 함께할 친구를 만나보세요.",
    items: {
      jjaekjjaek: {
        name: "짹짹이",
        description: "하늘을 파닥파닥 날아다녀요",
        purchaseTitle: "짹짹이를 당신의 신앙 여정에 초대할까요?",
        purchaseBody: "하트 40개가 사용되며, 구매 후 현재 맵의 하늘에서 날아다니게 됩니다.",
        completeTitle: "짹짹이가 말씀동행 여정에 함께하게 되었어요!",
        completeBody: "이제 현재 맵의 하늘에서 자유롭게 날아다닐 거예요.",
      },
      hindungi: {
        name: "흰둥이",
        description: "꼬리를 흔들며 반겨줘요",
        purchaseTitle: "흰둥이를 당신의 신앙 여정에 초대할까요?",
        purchaseBody: "하트 60개가 사용되며, 구매 후 현재 맵에서 꼬리를 흔들며 반겨줍니다.",
        completeTitle: "흰둥이가 말씀동행 여정에 함께하게 되었어요!",
        completeBody: "이제 현재 맵에서 반갑게 꼬리를 흔들며 함께할 거예요.",
      },
      choko: {
        name: "쪼코",
        description: "꼬리를 살랑이며 함께 있어줘요",
        purchaseTitle: "쪼코를 당신의 신앙 여정에 초대할까요?",
        purchaseBody: "하트 60개가 사용되며, 구매 후 현재 맵에서 꼬리를 살랑이며 함께합니다.",
        completeTitle: "쪼코가 말씀동행 여정에 함께하게 되었어요!",
        completeBody: "이제 현재 맵에서 조용하고 다정하게 함께할 거예요.",
      },
      kkumdeuli: {
        name: "꿈틀이",
        description: "흙에서 쏙 올라와 꿈틀거려요",
        purchaseTitle: "꿈틀이를 당신의 신앙 여정에 초대할까요?",
        purchaseBody: "하트 25개가 사용되며, 구매 후 현재 맵의 흙에서 쏙 올라와 꿈틀거립니다.",
        completeTitle: "꿈틀이가 말씀동행 여정에 함께하게 되었어요!",
        completeBody: "이제 현재 맵의 흙에서 귀엽게 꿈틀거리며 함께할 거예요.",
      },
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
    ownedButton: "Purchased",
    previewBadge: "See movement",
    previewTitle: "Animated friend preview",
    closePreviewButton: "Close",
    cancelButton: "Cancel",
    purchaseAction: "Buy for 💛 {price}",
    purchasingLabel: "Purchasing...",
    continueShoppingButton: "Keep browsing",
    viewOwnedButton: "View my items",
    insufficientHearts: "You need {needed} more Love Hearts.",
    purchaseFailed: "Could not purchase the item. Please try again shortly.",
    shopUnavailable: "Could not load the Love Shop.",
    alreadyOwned: "You already own this item.",
    loadingOwned: "Loading your items",
    toggleFailed: "Could not save the item display setting.",
    enabledLabel: "ON",
    disabledLabel: "OFF",
    characterComingSoonTitle: "Character decor is coming",
    characterComingSoonBody: "Special items for Rootsman and Rootswoman will arrive soon.",
    ownedEmptyTitle: "You have no items yet",
    ownedEmptyBody: "After welcoming a moving friend, you can turn it ON or OFF here.",
    ownedIntro: "Choose which purchased friends appear on your Home map.",
    mapIntro: "Use Love Hearts to invite a new friend into your Word-walk journey.",
    items: {
      jjaekjjaek: {
        name: "Chirpy",
        description: "Flutters freely through the sky",
        purchaseTitle: "Invite Chirpy into your faith journey?",
        purchaseBody: "This uses 40 Love Hearts. After purchase, Chirpy will fly through the sky on your current map.",
        completeTitle: "Chirpy has joined your Word-walk journey!",
        completeBody: "Chirpy will now fly freely through the sky on your current map.",
      },
      hindungi: {
        name: "Snowy",
        description: "Greets you with a happy wagging tail",
        purchaseTitle: "Invite Snowy into your faith journey?",
        purchaseBody: "This uses 60 Love Hearts. After purchase, Snowy will greet you with a wagging tail on your current map.",
        completeTitle: "Snowy has joined your Word-walk journey!",
        completeBody: "Snowy will now happily wag its tail alongside you on your current map.",
      },
      choko: {
        name: "Choco",
        description: "Stays close with a gentle swish of its tail",
        purchaseTitle: "Invite Choco into your faith journey?",
        purchaseBody: "This uses 60 Love Hearts. After purchase, Choco will stay close on your current map.",
        completeTitle: "Choco has joined your Word-walk journey!",
        completeBody: "Choco will now stay quietly and warmly beside you on your current map.",
      },
      kkumdeuli: {
        name: "Wiggles",
        description: "Pops out of the soil and wiggles around",
        purchaseTitle: "Invite Wiggles into your faith journey?",
        purchaseBody: "This uses 25 Love Hearts. After purchase, Wiggles will pop out of the soil on your current map.",
        completeTitle: "Wiggles has joined your Word-walk journey!",
        completeBody: "Wiggles will now pop up and wiggle around the soil on your current map.",
      },
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
    ownedButton: "Gekauft",
    previewBadge: "Bewegung ansehen",
    previewTitle: "Animierte Vorschau",
    closePreviewButton: "Schließen",
    cancelButton: "Abbrechen",
    purchaseAction: "Für 💛 {price} kaufen",
    purchasingLabel: "Kauf läuft...",
    continueShoppingButton: "Weiterstöbern",
    viewOwnedButton: "Meine Items ansehen",
    insufficientHearts: "Dir fehlen noch {needed} Liebesherzen.",
    purchaseFailed: "Das Item konnte nicht gekauft werden. Bitte versuche es gleich noch einmal.",
    shopUnavailable: "Der Herzenshop konnte nicht geladen werden.",
    alreadyOwned: "Dieses Item gehört dir bereits.",
    loadingOwned: "Deine Items werden geladen",
    toggleFailed: "Die Anzeige-Einstellung konnte nicht gespeichert werden.",
    enabledLabel: "AN",
    disabledLabel: "AUS",
    characterComingSoonTitle: "Figuren-Deko kommt bald",
    characterComingSoonBody: "Besondere Items für Rootsman und Rootswoman folgen bald.",
    ownedEmptyTitle: "Du hast noch keine Items",
    ownedEmptyBody: "Gekaufte Freunde kannst du hier einfach AN- oder AUSschalten.",
    ownedIntro: "Wähle aus, welche gekauften Freunde auf deiner Home-Karte erscheinen.",
    mapIntro: "Lade mit Liebesherzen einen neuen Freund auf deinen Weg mit dem Wort ein.",
    items: {
      jjaekjjaek: {
        name: "Piepsi",
        description: "Flattert fröhlich durch den Himmel",
        purchaseTitle: "Möchtest du Piepsi auf deine Glaubensreise einladen?",
        purchaseBody: "Dafür werden 40 Liebesherzen verwendet. Danach fliegt Piepsi durch den Himmel deiner aktuellen Karte.",
        completeTitle: "Piepsi begleitet jetzt deinen Weg mit dem Wort!",
        completeBody: "Piepsi fliegt nun frei durch den Himmel deiner aktuellen Karte.",
      },
      hindungi: {
        name: "Flocki",
        description: "Begrüßt dich mit wedelndem Schwanz",
        purchaseTitle: "Möchtest du Flocki auf deine Glaubensreise einladen?",
        purchaseBody: "Dafür werden 60 Liebesherzen verwendet. Danach begrüßt dich Flocki auf deiner aktuellen Karte.",
        completeTitle: "Flocki begleitet jetzt deinen Weg mit dem Wort!",
        completeBody: "Flocki freut sich nun auf deiner aktuellen Karte mit dir.",
      },
      choko: {
        name: "Choco",
        description: "Bleibt mit sanftem Schwanzwedeln bei dir",
        purchaseTitle: "Möchtest du Choco auf deine Glaubensreise einladen?",
        purchaseBody: "Dafür werden 60 Liebesherzen verwendet. Danach bleibt Choco auf deiner aktuellen Karte bei dir.",
        completeTitle: "Choco begleitet jetzt deinen Weg mit dem Wort!",
        completeBody: "Choco bleibt nun ruhig und liebevoll auf deiner aktuellen Karte bei dir.",
      },
      kkumdeuli: {
        name: "Wurmi",
        description: "Schaut aus der Erde und kringelt sich",
        purchaseTitle: "Möchtest du Wurmi auf deine Glaubensreise einladen?",
        purchaseBody: "Dafür werden 25 Liebesherzen verwendet. Danach schaut Wurmi aus der Erde deiner aktuellen Karte.",
        completeTitle: "Wurmi begleitet jetzt deinen Weg mit dem Wort!",
        completeBody: "Wurmi schaut nun auf deiner aktuellen Karte aus der Erde und kringelt sich fröhlich.",
      },
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
    ownedButton: "Acheté",
    previewBadge: "Voir le mouvement",
    previewTitle: "Aperçu animé",
    closePreviewButton: "Fermer",
    cancelButton: "Annuler",
    purchaseAction: "Acheter pour 💛 {price}",
    purchasingLabel: "Achat en cours...",
    continueShoppingButton: "Continuer à découvrir",
    viewOwnedButton: "Voir mes objets",
    insufficientHearts: "Il vous manque {needed} Cœurs d’amour.",
    purchaseFailed: "Impossible d’acheter l’objet. Veuillez réessayer dans un instant.",
    shopUnavailable: "Impossible de charger la Boutique d’amour.",
    alreadyOwned: "Vous possédez déjà cet objet.",
    loadingOwned: "Chargement de vos objets",
    toggleFailed: "Impossible d’enregistrer le réglage d’affichage.",
    enabledLabel: "ON",
    disabledLabel: "OFF",
    characterComingSoonTitle: "La personnalisation arrive bientôt",
    characterComingSoonBody: "Des objets spéciaux pour Rootsman et Rootswoman arriveront bientôt.",
    ownedEmptyTitle: "Vous n’avez pas encore d’objet",
    ownedEmptyBody: "Après avoir accueilli un ami animé, vous pourrez l’activer ou le désactiver ici.",
    ownedIntro: "Choisissez les amis achetés qui apparaîtront sur votre carte d’accueil.",
    mapIntro: "Utilisez vos Cœurs d’amour pour inviter un ami dans votre chemin avec la Parole.",
    items: {
      jjaekjjaek: {
        name: "Cui-Cui",
        description: "Vole joyeusement dans le ciel",
        purchaseTitle: "Inviter Cui-Cui dans votre chemin de foi ?",
        purchaseBody: "40 Cœurs d’amour seront utilisés. Après l’achat, Cui-Cui volera dans le ciel de votre carte actuelle.",
        completeTitle: "Cui-Cui a rejoint votre chemin avec la Parole !",
        completeBody: "Cui-Cui volera désormais librement dans le ciel de votre carte actuelle.",
      },
      hindungi: {
        name: "Neige",
        description: "Vous accueille en remuant la queue",
        purchaseTitle: "Inviter Neige dans votre chemin de foi ?",
        purchaseBody: "60 Cœurs d’amour seront utilisés. Après l’achat, Neige vous accueillera sur votre carte actuelle.",
        completeTitle: "Neige a rejoint votre chemin avec la Parole !",
        completeBody: "Neige remuera désormais joyeusement la queue à vos côtés sur votre carte actuelle.",
      },
      choko: {
        name: "Choco",
        description: "Reste près de vous en balançant doucement la queue",
        purchaseTitle: "Inviter Choco dans votre chemin de foi ?",
        purchaseBody: "60 Cœurs d’amour seront utilisés. Après l’achat, Choco restera près de vous sur votre carte actuelle.",
        completeTitle: "Choco a rejoint votre chemin avec la Parole !",
        completeBody: "Choco restera désormais calmement et tendrement près de vous sur votre carte actuelle.",
      },
      kkumdeuli: {
        name: "Tortille",
        description: "Sort de la terre et se tortille",
        purchaseTitle: "Inviter Tortille dans votre chemin de foi ?",
        purchaseBody: "25 Cœurs d’amour seront utilisés. Après l’achat, Tortille sortira de la terre sur votre carte actuelle.",
        completeTitle: "Tortille a rejoint votre chemin avec la Parole !",
        completeBody: "Tortille sortira désormais de la terre et se tortillera sur votre carte actuelle.",
      },
    },
  },
};

function safeLang(lang: Lang | string): ShopLang {
  return lang === "de" || lang === "en" || lang === "fr" ? lang : "ko";
}

export function getHeartShopText(lang: Lang | string): HeartShopText {
  return TEXT[safeLang(lang)];
}

export function formatHeartShopText(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

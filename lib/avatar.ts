export type RootsAvatarType = "rootsman" | "rootswoman";

export const ROOTS_AVATAR_TYPES: readonly RootsAvatarType[] = ["rootsman", "rootswoman"] as const;

export function normalizeRootsAvatarType(value: unknown): RootsAvatarType {
  return value === "rootswoman" ? "rootswoman" : "rootsman";
}

export function getRootsAvatarImageSrc(avatarType: unknown): string {
  return normalizeRootsAvatarType(avatarType) === "rootswoman" ? "/rootswoman.webp" : "/rootsman.webp";
}


type SupportedLang = "ko" | "en" | "de" | "fr";

function safeLang(lang: string): SupportedLang {
  return lang === "en" || lang === "de" || lang === "fr" ? lang : "ko";
}

const AVATAR_LABELS: Record<RootsAvatarType, Record<SupportedLang, string>> = {
  rootsman: {
    ko: "루츠맨",
    en: "Rootsman",
    de: "RootsMan",
    fr: "RootsMan",
  },
  rootswoman: {
    ko: "루츠우먼",
    en: "Rootswoman",
    de: "RootsWoman",
    fr: "RootsWoman",
  },
};

const AVATAR_CHOICE_TEXT = {
  introTitle: {
    ko: "당신의 캐릭터를 선택해주세요",
    en: "Choose your character",
    de: "Wählen Sie Ihren Charakter",
    fr: "Choisissez votre personnage",
  },
  changeTitle: {
    ko: "당신의 캐릭터를 선택해주세요",
    en: "Choose your character",
    de: "Wählen Sie Ihren Charakter",
    fr: "Choisissez votre personnage",
  },
  introBody: {
    ko: "말씀 여정을 함께할 캐릭터를 선택해보세요. 캐릭터는 프로필에서 바꿀 수 있습니다.",
    en: "Choose the character who will walk with you through your Bible reflection journey. You can change this later in your profile.",
    de: "Wählen Sie den Charakter, der Sie auf Ihrer Stille-Zeit-Reise begleitet. Sie können ihn später im Profil ändern.",
    fr: "Choisissez le personnage qui vous accompagnera dans votre méditation biblique. Vous pourrez le changer plus tard dans votre profil.",
  },
  changeBody: {
    ko: "말씀 여정을 함께할 캐릭터를 선택해보세요.",
    en: "Choose the character who will walk with you through your Bible reflection journey.",
    de: "Wählen Sie den Charakter, der Sie auf Ihrer Stille-Zeit-Reise begleitet.",
    fr: "Choisissez le personnage qui vous accompagnera dans votre méditation biblique.",
  },
  select: {
    ko: "선택하기",
    en: "Choose",
    de: "Auswählen",
    fr: "Choisir",
  },
  selected: {
    ko: "선택됨",
    en: "Selected",
    de: "Ausgewählt",
    fr: "Sélectionné",
  },
  confirm: {
    ko: "확인",
    en: "Confirm",
    de: "Bestätigen",
    fr: "Confirmer",
  },
  later: {
    ko: "나중에 하기",
    en: "Later",
    de: "Später",
    fr: "Plus tard",
  },
  close: {
    ko: "닫기",
    en: "Close",
    de: "Schließen",
    fr: "Fermer",
  },
  profileTitle: {
    ko: "내 캐릭터",
    en: "My character",
    de: "Mein Charakter",
    fr: "Mon personnage",
  },
  change: {
    ko: "캐릭터 변경",
    en: "Change character",
    de: "Charakter ändern",
    fr: "Changer de personnage",
  },
  customizeSoon: {
    ko: "꾸미기 준비 중",
    en: "Customization coming",
    de: "Anpassung folgt",
    fr: "Personnalisation à venir",
  },
  popupGardenTitleRootsman: {
    ko: "루츠맨이 물을 주고 있어요",
    en: "Rootsman is watering the garden",
    de: "RootsMan gießt den Garten",
    fr: "RootsMan arrose le jardin",
  },
  popupGardenTitleRootswoman: {
    ko: "루츠우먼이 물을 주고 있어요",
    en: "Rootswoman is watering the garden",
    de: "RootsWoman gießt den Garten",
    fr: "RootsWoman arrose le jardin",
  },
};

export function getRootsAvatarLabel(avatarType: unknown, lang: string): string {
  return AVATAR_LABELS[normalizeRootsAvatarType(avatarType)][safeLang(lang)];
}

export function getRootsAvatarChoiceText(key: keyof typeof AVATAR_CHOICE_TEXT, lang: string): string {
  return AVATAR_CHOICE_TEXT[key][safeLang(lang)];
}

export function adaptRootsAvatarNameInText(text: string, avatarType: unknown): string {
  if (normalizeRootsAvatarType(avatarType) !== "rootswoman") return text;
  return text
    .replaceAll("루츠맨", "루츠우먼")
    .replaceAll("RootsMan", "RootsWoman")
    .replaceAll("Rootsman", "Rootswoman")
    .replaceAll("rootsman", "rootswoman");
}

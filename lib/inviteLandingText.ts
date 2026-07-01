import { FALLBACK_LANG, isLang, type Lang } from "@/lib/i18n";

export type InviteLandingLang = Lang;

export const INVITE_LANDING_LANG_OPTIONS: Array<{
  value: InviteLandingLang;
  label: string;
  shortLabel: string;
}> = [
  { value: "ko", label: "한국어", shortLabel: "KO" },
  { value: "en", label: "English", shortLabel: "EN" },
  { value: "de", label: "Deutsch", shortLabel: "DE" },
  { value: "fr", label: "Français", shortLabel: "FR" },
];

export function normalizeInviteLandingLang(
  value: string | null | undefined,
): InviteLandingLang | null {
  return isLang(value) ? value : null;
}

export function resolveInviteLandingLang(
  urlLang: string | null | undefined,
  savedLang: Lang,
  browserLanguage?: string | null,
): InviteLandingLang {
  const fromUrl = normalizeInviteLandingLang(urlLang);
  if (fromUrl) return fromUrl;

  const browserPrimary = browserLanguage?.split("-")[0]?.toLowerCase();
  if (isLang(browserPrimary)) return browserPrimary;

  return isLang(savedLang) ? savedLang : FALLBACK_LANG;
}

type InviteLandingText = {
  brandTagline: string;
  languageAria: string;
  privateGroupName: string;
  groupTitle: (name: string) => string;
  groupBody: string;
  groupMembers: (count: number) => string;
  groupJoinButton: string;
  groupJoinAuthButton: string;
  groupAfterAuthHint: string;
  groupAppDownloadHint: string;
  companionTitle: string;
  companionBody: string;
  companionPrimary: string;
  companionAfterAuthHint: string;
  companionAppDownloadHint: string;
  inAppBrowserHint: string;
};

const INVITE_LANDING_TEXT: Record<InviteLandingLang, InviteLandingText> = {
  ko: {
    brandTagline: "말씀에 뿌리내리고, 함께 자라다",
    languageAria: "초대 페이지 언어 선택",
    privateGroupName: "비공개 그룹",
    groupTitle: (name) => `${name}에 초대받았어요`,
    groupBody: "함께 말씀을 나누고 서로를 위해 기도하는 Roots 그룹이에요.",
    groupMembers: (count) => `${count}명이 함께하고 있어요`,
    groupJoinButton: "참여하기",
    groupJoinAuthButton: "회원가입/로그인하고 참여하기",
    groupAfterAuthHint: "가입 혹은 로그인 후 참여할 수 있어요",
    groupAppDownloadHint:
      "앱 설치 후에도 이 초대 링크로 다시 들어오면 그룹에 참여할 수 있어요.",
    companionTitle: "신앙의 동역자로 초대받았어요",
    companionBody:
      "함께 말씀을 나누고 서로를 위해 기도하는 동역을 시작해볼까요?",
    companionPrimary: "회원가입/로그인하고 동역자 되기",
    companionAfterAuthHint: "가입 혹은 로그인 후 수락할 수 있어요",
    companionAppDownloadHint:
      "앱 설치 후에도 이 초대 링크로 다시 들어오면 동역자 초대를 수락할 수 있어요.",
    inAppBrowserHint:
      "카카오톡 안에서 로그인이 잘 되지 않으면, 외부 브라우저로 열어주세요.",
  },
  en: {
    brandTagline: "Rooted in the Word, growing together",
    languageAria: "Choose invitation page language",
    privateGroupName: "Private group",
    groupTitle: (name) => `You’re invited to ${name}`,
    groupBody:
      "A Roots group where you can share Bible reflections and pray for one another.",
    groupMembers: (count) => `${count} people are already together`,
    groupJoinButton: "Join group",
    groupJoinAuthButton: "Sign up or log in to join",
    groupAfterAuthHint: "You can join after signing up or logging in.",
    groupAppDownloadHint:
      "After installing the app, open this invite link again to join the group.",
    companionTitle: "You’re invited to become faith partners",
    companionBody:
      "Start a faith partnership to share Bible reflections and pray for one another.",
    companionPrimary: "Sign up or log in to connect",
    companionAfterAuthHint: "You can accept after signing up or logging in.",
    companionAppDownloadHint:
      "After installing the app, open this invite link again to accept the invitation.",
    inAppBrowserHint:
      "If sign-in does not work inside KakaoTalk, please open this page in an external browser.",
  },
  de: {
    brandTagline: "Im Wort verwurzelt, gemeinsam wachsen",
    languageAria: "Sprache der Einladungsseite auswählen",
    privateGroupName: "Private Gruppe",
    groupTitle: (name) => `Du wurdest zu ${name} eingeladen`,
    groupBody:
      "Eine Roots Gruppe, in der ihr Bibelreflexionen teilen und füreinander beten könnt.",
    groupMembers: (count) => `${count} Personen sind schon dabei`,
    groupJoinButton: "Beitreten",
    groupJoinAuthButton: "Registrieren/anmelden und beitreten",
    groupAfterAuthHint:
      "Nach der Registrierung oder Anmeldung kannst du beitreten.",
    groupAppDownloadHint:
      "Nach der App-Installation kannst du diesen Einladungslink erneut öffnen, um der Gruppe beizutreten.",
    companionTitle: "Du wurdest als Glaubenspartner eingeladen",
    companionBody:
      "Beginne eine Glaubenspartnerschaft, um Bibelreflexionen zu teilen und füreinander zu beten.",
    companionPrimary: "Registrieren/anmelden und verbinden",
    companionAfterAuthHint:
      "Nach der Registrierung oder Anmeldung kannst du die Einladung annehmen.",
    companionAppDownloadHint:
      "Nach der App-Installation kannst du diesen Einladungslink erneut öffnen, um die Einladung anzunehmen.",
    inAppBrowserHint:
      "Wenn die Anmeldung in KakaoTalk nicht funktioniert, öffne diese Seite bitte in einem externen Browser.",
  },
  fr: {
    brandTagline: "S’enraciner dans la Parole, grandir ensemble",
    languageAria: "Choisir la langue de la page d’invitation",
    privateGroupName: "Groupe privé",
    groupTitle: (name) => `Vous êtes invité(e) à rejoindre ${name}`,
    groupBody:
      "Un groupe Roots pour partager des méditations bibliques et prier les uns pour les autres.",
    groupMembers: (count) => `${count} personnes sont déjà réunies`,
    groupJoinButton: "Rejoindre le groupe",
    groupJoinAuthButton: "S’inscrire/se connecter pour rejoindre",
    groupAfterAuthHint:
      "Vous pourrez rejoindre le groupe après inscription ou connexion.",
    groupAppDownloadHint:
      "Après avoir installé l’application, ouvrez de nouveau ce lien d’invitation pour rejoindre le groupe.",
    companionTitle: "Vous êtes invité(e) à devenir partenaire de foi",
    companionBody:
      "Commencez un partenariat de foi pour partager des méditations bibliques et prier les uns pour les autres.",
    companionPrimary: "S’inscrire/se connecter pour accepter",
    companionAfterAuthHint:
      "Vous pourrez accepter après inscription ou connexion.",
    companionAppDownloadHint:
      "Après avoir installé l’application, ouvrez de nouveau ce lien d’invitation pour accepter l’invitation.",
    inAppBrowserHint:
      "Si la connexion ne fonctionne pas dans KakaoTalk, veuillez ouvrir cette page dans un navigateur externe.",
  },
};

export function getInviteLandingText(
  lang: InviteLandingLang,
): InviteLandingText {
  return INVITE_LANDING_TEXT[lang] ?? INVITE_LANDING_TEXT.ko;
}

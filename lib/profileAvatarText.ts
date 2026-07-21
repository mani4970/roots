import type { Lang } from "@/lib/i18n";

type ProfileAvatarText = {
  useCharacterButton: string;
  characterActiveLabel: string;
  savingLabel: string;
  characterSaved: string;
  saveFailed: string;
  autoUpdateFailed: string;
};

const TEXT: Record<Lang, ProfileAvatarText> = {
  ko: {
    useCharacterButton: "프로필로 지정",
    characterActiveLabel: "캐릭터 프로필 사용 중",
    savingLabel: "프로필 저장 중…",
    characterSaved: "현재 코디를 프로필로 지정했어요.",
    saveFailed: "프로필 표시를 변경하지 못했어요.",
    autoUpdateFailed: "현재 코디를 프로필에 반영하지 못했어요.",
  },
  en: {
    useCharacterButton: "Use as profile",
    characterActiveLabel: "Character profile active",
    savingLabel: "Saving profile…",
    characterSaved: "Your current look is now your profile image.",
    saveFailed: "Could not change your profile image.",
    autoUpdateFailed: "Could not update your profile with the current look.",
  },
  de: {
    useCharacterButton: "Als Profil verwenden",
    characterActiveLabel: "Charakterprofil ist aktiv",
    savingLabel: "Profil wird gespeichert…",
    characterSaved: "Dein aktuelles Outfit ist jetzt dein Profilbild.",
    saveFailed: "Das Profilbild konnte nicht geändert werden.",
    autoUpdateFailed: "Das aktuelle Outfit konnte nicht im Profil aktualisiert werden.",
  },
  fr: {
    useCharacterButton: "Définir comme profil",
    characterActiveLabel: "Profil personnage actif",
    savingLabel: "Enregistrement du profil…",
    characterSaved: "Votre tenue actuelle est maintenant votre image de profil.",
    saveFailed: "Impossible de modifier l’image de profil.",
    autoUpdateFailed: "Impossible d’actualiser le profil avec la tenue actuelle.",
  },
};

export function getProfileAvatarText(lang: Lang | string): ProfileAvatarText {
  return TEXT[lang === "en" || lang === "de" || lang === "fr" ? lang : "ko"];
}

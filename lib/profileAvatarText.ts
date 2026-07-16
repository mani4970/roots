import type { Lang } from "@/lib/i18n";

type ProfileAvatarText = {
  useCharacterButton: string;
  usePhotoButton: string;
  useDefaultButton: string;
  characterActiveLabel: string;
  savingLabel: string;
  characterSaved: string;
  photoRestored: string;
  defaultRestored: string;
  saveFailed: string;
  autoUpdateFailed: string;
};

const TEXT: Record<Lang, ProfileAvatarText> = {
  ko: {
    useCharacterButton: "프로필로 지정",
    usePhotoButton: "기존 사진 사용",
    useDefaultButton: "기본 프로필 사용",
    characterActiveLabel: "캐릭터 프로필 사용 중",
    savingLabel: "프로필 저장 중…",
    characterSaved: "현재 코디를 프로필로 지정했어요.",
    photoRestored: "기존 프로필 사진으로 돌아왔어요.",
    defaultRestored: "기본 프로필로 돌아왔어요.",
    saveFailed: "프로필 표시를 변경하지 못했어요.",
    autoUpdateFailed: "현재 코디를 프로필에 반영하지 못했어요.",
  },
  en: {
    useCharacterButton: "Use as profile",
    usePhotoButton: "Use previous photo",
    useDefaultButton: "Use default profile",
    characterActiveLabel: "Character profile active",
    savingLabel: "Saving profile…",
    characterSaved: "Your current look is now your profile image.",
    photoRestored: "Your previous profile photo is back.",
    defaultRestored: "Your default profile image is back.",
    saveFailed: "Could not change your profile image.",
    autoUpdateFailed: "Could not update your profile with the current look.",
  },
  de: {
    useCharacterButton: "Als Profil verwenden",
    usePhotoButton: "Bisheriges Foto verwenden",
    useDefaultButton: "Standardprofil verwenden",
    characterActiveLabel: "Charakterprofil ist aktiv",
    savingLabel: "Profil wird gespeichert…",
    characterSaved: "Dein aktuelles Outfit ist jetzt dein Profilbild.",
    photoRestored: "Dein bisheriges Profilfoto ist wieder aktiv.",
    defaultRestored: "Dein Standardprofil ist wieder aktiv.",
    saveFailed: "Das Profilbild konnte nicht geändert werden.",
    autoUpdateFailed: "Das aktuelle Outfit konnte nicht im Profil aktualisiert werden.",
  },
  fr: {
    useCharacterButton: "Définir comme profil",
    usePhotoButton: "Utiliser l’ancienne photo",
    useDefaultButton: "Utiliser le profil par défaut",
    characterActiveLabel: "Profil personnage actif",
    savingLabel: "Enregistrement du profil…",
    characterSaved: "Votre tenue actuelle est maintenant votre image de profil.",
    photoRestored: "Votre ancienne photo de profil est de nouveau active.",
    defaultRestored: "Votre profil par défaut est de nouveau actif.",
    saveFailed: "Impossible de modifier l’image de profil.",
    autoUpdateFailed: "Impossible d’actualiser le profil avec la tenue actuelle.",
  },
};

export function getProfileAvatarText(lang: Lang | string): ProfileAvatarText {
  return TEXT[lang === "en" || lang === "de" || lang === "fr" ? lang : "ko"];
}

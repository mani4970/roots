import type { Lang } from "@/lib/i18n";

type ReflectionNudgeText = {
  sendPartner: (name: string) => string;
  sendGroup: (name: string) => string;
  partnerCompleted: (name: string) => string;
  groupCompleted: (name: string) => string;
  alreadySent: string;
  loading: string;
  sending: string;
  partnerSuccess: (name: string) => string;
  groupSuccess: (name: string) => string;
  completedNotice: string;
  groupCompletedNotice: string;
  alreadySentNotice: string;
  failed: string;
};

const REFLECTION_NUDGE_TEXT: Record<Lang, ReflectionNudgeText> = {
  ko: {
    sendPartner: (name) => `${name}님에게 같이 묵상하자고 넛지 보내기`,
    sendGroup: (name) => `${name} 그룹에 같이 묵상하자고 넛지 보내기`,
    partnerCompleted: (name) => `${name}님은 오늘 묵상을 완료했어요`,
    groupCompleted: (name) =>
      `${name} 그룹에는 오늘 묵상을 기다리는 그룹원이 없어요`,
    alreadySent: "오늘 이미 넛지를 보냈어요",
    loading: "오늘의 넛지 상태를 확인하고 있어요",
    sending: "묵상 넛지를 보내고 있어요",
    partnerSuccess: (name) => `${name}님에게 묵상 넛지를 보냈어요! 👋`,
    groupSuccess: (name) => `${name} 그룹에 묵상 넛지를 보냈어요! 👋`,
    completedNotice: "동역자가 오늘 묵상을 완료했어요.",
    groupCompletedNotice: "오늘 묵상을 기다리는 그룹원이 없어요.",
    alreadySentNotice: "오늘 이미 넛지를 보냈어요.",
    failed: "넛지를 보내지 못했어요. 잠시 후 다시 시도해주세요.",
  },
  de: {
    sendPartner: (name) =>
      `${name} zu einer gemeinsamen Stillen Zeit einladen`,
    sendGroup: (name) =>
      `Die Gruppe ${name} zu einer gemeinsamen Stillen Zeit einladen`,
    partnerCompleted: (name) =>
      `${name} hat die heutige Stille Zeit bereits abgeschlossen`,
    groupCompleted: (name) =>
      `In der Gruppe ${name} wartet heute niemand mehr auf seine Stille Zeit`,
    alreadySent: "Du hast heute bereits einen Impuls gesendet",
    loading: "Der heutige Impuls-Status wird geprüft",
    sending: "Der Impuls wird gesendet",
    partnerSuccess: (name) => `Der Impuls wurde an ${name} gesendet! 👋`,
    groupSuccess: (name) =>
      `Der Impuls wurde an die Gruppe ${name} gesendet! 👋`,
    completedNotice: "Dein Glaubenspartner hat die heutige Stille Zeit beendet.",
    groupCompletedNotice:
      "Heute wartet kein Gruppenmitglied mehr auf seine Stille Zeit.",
    alreadySentNotice: "Du hast heute bereits einen Impuls gesendet.",
    failed:
      "Der Impuls konnte nicht gesendet werden. Bitte versuche es später erneut.",
  },
  en: {
    sendPartner: (name) => `Nudge ${name} to reflect on the Word together`,
    sendGroup: (name) => `Nudge ${name} to reflect on the Word together`,
    partnerCompleted: (name) =>
      `${name} has completed today’s Bible Reflection`,
    groupCompleted: (name) =>
      `No one in ${name} is still waiting to complete today’s Bible Reflection`,
    alreadySent: "You already sent a nudge today",
    loading: "Checking today’s nudge status",
    sending: "Sending the Bible Reflection nudge",
    partnerSuccess: (name) => `You invited ${name} to reflect on the Word together! 👋`,
    groupSuccess: (name) => `You invited ${name} to reflect on the Word together! 👋`,
    completedNotice:
      "Your faith partner has completed today’s Bible Reflection.",
    groupCompletedNotice:
      "No group members are still waiting to complete today’s Bible Reflection.",
    alreadySentNotice: "You already sent a nudge today.",
    failed: "Could not send the nudge. Please try again shortly.",
  },
  fr: {
    sendPartner: (name) => `Inviter ${name} à méditer la Parole ensemble`,
    sendGroup: (name) => `Inviter le groupe ${name} à méditer la Parole ensemble`,
    partnerCompleted: (name) =>
      `${name} a terminé la méditation biblique d’aujourd’hui`,
    groupCompleted: (name) =>
      `Dans le groupe ${name}, personne n’attend encore pour faire sa méditation biblique aujourd’hui`,
    alreadySent: "Vous avez déjà envoyé une invitation aujourd’hui",
    loading: "Vérification de l’invitation du jour",
    sending: "Envoi de l’invitation à méditer la Parole",
    partnerSuccess: (name) =>
      `Vous avez envoyé une invitation à ${name} ! 👋`,
    groupSuccess: (name) =>
      `Vous avez envoyé une invitation au groupe ${name} ! 👋`,
    completedNotice:
      "Votre partenaire de foi a terminé la méditation biblique d’aujourd’hui.",
    groupCompletedNotice:
      "Aucun membre du groupe n’attend encore pour faire sa méditation biblique aujourd’hui.",
    alreadySentNotice:
      "Vous avez déjà envoyé une invitation aujourd’hui.",
    failed:
      "L’invitation n’a pas pu être envoyée. Veuillez réessayer dans un instant.",
  },
};

export function getReflectionNudgeText(lang: Lang): ReflectionNudgeText {
  return REFLECTION_NUDGE_TEXT[lang] ?? REFLECTION_NUDGE_TEXT.ko;
}

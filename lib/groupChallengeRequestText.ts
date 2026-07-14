import type { Lang } from "@/lib/i18n";

type GroupChallengeRequestText = {
  leadTimeNotice: string;
  endDateLabel: string;
  requiredError: string;
  startTooSoonError: string;
  invalidDateRangeError: string;
  maxDurationError: string;
  preparingSchedule: string;
};

const TEXT: Record<Lang, GroupChallengeRequestText> = {
  ko: {
    leadTimeNotice: "챌린지는 시작일 기준 최소 15일 전에 신청해주세요.",
    endDateLabel: "희망 종료일",
    requiredError: "챌린지 이름, 시작일, 종료일, 이메일을 확인해주세요.",
    startTooSoonError: "희망 시작일은 신청일로부터 15일 이후로 선택해주세요.",
    invalidDateRangeError: "종료일은 시작일과 같거나 이후여야 해요.",
    maxDurationError: "챌린지 기간은 최대 120일까지 신청할 수 있어요.",
    preparingSchedule: "{start}부터 {end}까지 진행 예정이에요.",
  },
  en: {
    leadTimeNotice: "Please submit the request at least 15 days before the challenge starts.",
    endDateLabel: "Preferred end date",
    requiredError: "Please check the challenge name, start date, end date, and email.",
    startTooSoonError: "The preferred start date must be at least 15 days from today.",
    invalidDateRangeError: "The end date must be the same as or later than the start date.",
    maxDurationError: "A challenge can be requested for up to 120 days.",
    preparingSchedule: "Planned from {start} to {end}.",
  },
  de: {
    leadTimeNotice: "Bitte reiche den Antrag mindestens 15 Tage vor dem geplanten Start ein.",
    endDateLabel: "Gewünschtes Enddatum",
    requiredError: "Bitte prüfe Name, Startdatum, Enddatum und E-Mail.",
    startTooSoonError: "Der gewünschte Start muss mindestens 15 Tage ab heute liegen.",
    invalidDateRangeError: "Das Enddatum muss am oder nach dem Startdatum liegen.",
    maxDurationError: "Eine Challenge kann höchstens 120 Tage dauern.",
    preparingSchedule: "Geplant vom {start} bis {end}.",
  },
  fr: {
    leadTimeNotice: "Merci d’envoyer la demande au moins 15 jours avant le début du défi.",
    endDateLabel: "Date de fin souhaitée",
    requiredError: "Veuillez vérifier le nom, la date de début, la date de fin et l’e-mail.",
    startTooSoonError: "La date de début souhaitée doit être au moins 15 jours après aujourd’hui.",
    invalidDateRangeError: "La date de fin doit être égale ou postérieure à la date de début.",
    maxDurationError: "Un défi peut durer au maximum 120 jours.",
    preparingSchedule: "Prévu du {start} au {end}.",
  },
};

export function getGroupChallengeRequestText(lang: Lang) {
  return TEXT[lang] ?? TEXT.ko;
}

export function formatGroupChallengeRequestText(
  template: string,
  values: Record<string, string | number>,
) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

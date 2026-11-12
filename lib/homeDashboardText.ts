import type { Lang } from "@/lib/i18n";

type HomeDashboardText = {
  routineTitle: string;
  routineCardTitle: readonly string[];
  challengeTitle: string;
  decisionsTitle: string;
  decisionsCardTitle: readonly string[];
  decisionsDescription: string;
  decisionsBeforeReflection: string;
  noChallenge: string;
  noChallengeShort: string;
  challengeProgress: (current: number, target: number) => string;
  decisionProgress: (current: number, target: number) => string;
  decisionProgressLabel: string;
  routineProgress: (current: number) => string;
  close: string;
  loading: string;
  retry: string;
  challengeComplete: string;
  challengeMissed: string;
  challengeLoadError: string;
  decisionsEmpty: string;
  decisionsEmptyShort: string;
  routineStart: string;
};

const TEXT: Record<Lang, HomeDashboardText> = {
  ko: {
    routineTitle: "영적 루틴", challengeTitle: "챌린지", decisionsTitle: "오늘의 결단",
    routineCardTitle: ["영적 루틴"], decisionsCardTitle: ["오늘의 결단"],
    decisionsDescription: "하나님이 주신 말씀에 작은 것부터 하나씩 순종해보세요.",
    decisionsBeforeReflection: "말씀을 묵상하며 작은 결단 하나를 세워보세요.",
    noChallenge: "현재 진행 중인 챌린지가 없어요.", noChallengeShort: "진행 중인 챌린지 없음",
    challengeProgress: (current, target) => `${current} / ${target}일`,
    decisionProgress: (current, target) => `${current} / ${target} 실천`,
    decisionProgressLabel: "실천",
    routineProgress: current => `${current} / 2 완료`,
    close: "닫기", loading: "불러오는 중", retry: "다시 시도",
    challengeComplete: "완주했어요!", challengeMissed: "미완료 날짜 있음",
    challengeLoadError: "챌린지를 불러오지 못했어요.",
    decisionsEmpty: "작은 순종을 시작해요", routineStart: "오늘의 루틴을 시작해요",
    decisionsEmptyShort: "작은 것부터",
  },
  en: {
    routineTitle: "Spiritual routine", challengeTitle: "Challenge", decisionsTitle: "Today’s commitment",
    routineCardTitle: ["Spiritual", "routine"], decisionsCardTitle: ["Today’s", "commitment"],
    decisionsDescription: "Put God’s Word into practice, one small step of obedience at a time.",
    decisionsBeforeReflection: "As you reflect on God’s Word, make one small commitment.",
    noChallenge: "There is no active challenge right now.", noChallengeShort: "No active challenge",
    challengeProgress: (current, target) => `${current} / ${target} days`,
    decisionProgress: (current, target) => `${current} / ${target} practiced`,
    decisionProgressLabel: "practiced",
    routineProgress: current => `${current} / 2 completed`,
    close: "Close", loading: "Loading", retry: "Try again",
    challengeComplete: "Challenge complete!", challengeMissed: "A day was missed",
    challengeLoadError: "Could not load the challenge.",
    decisionsEmpty: "Take a small step", routineStart: "Begin today’s routine",
    decisionsEmptyShort: "Start small",
  },
  de: {
    routineTitle: "Geistliche Routine", challengeTitle: "Challenge", decisionsTitle: "Heutiger Vorsatz",
    routineCardTitle: ["Geistliche", "Routine"], decisionsCardTitle: ["Heutiger", "Vorsatz"],
    decisionsDescription: "Setze Gottes Wort Schritt für Schritt im Kleinen in die Tat um.",
    decisionsBeforeReflection: "Fasse in deiner Stillen Zeit einen kleinen Vorsatz.",
    noChallenge: "Zurzeit gibt es keine laufende Challenge.", noChallengeShort: "Keine aktive Challenge",
    challengeProgress: (current, target) => `${current} / ${target} Tage`,
    decisionProgress: (current, target) => `${current} / ${target} umgesetzt`,
    decisionProgressLabel: "umgesetzt",
    routineProgress: current => `${current} / 2 abgeschlossen`,
    close: "Schließen", loading: "Wird geladen", retry: "Erneut versuchen",
    challengeComplete: "Challenge geschafft!", challengeMissed: "Ein Tag wurde verpasst",
    challengeLoadError: "Die Challenge konnte nicht geladen werden.",
    decisionsEmpty: "Ein kleiner Schritt", routineStart: "Starte deine heutige Routine",
    decisionsEmptyShort: "Klein anfangen",
  },
  fr: {
    routineTitle: "Routine spirituelle", challengeTitle: "Défi", decisionsTitle: "Engagement du jour",
    routineCardTitle: ["Routine", "spirituelle"], decisionsCardTitle: ["Engagement", "du jour"],
    decisionsDescription: "Mets la Parole de Dieu en pratique, un petit pas d’obéissance à la fois.",
    decisionsBeforeReflection: "En méditant la Parole de Dieu, prends un petit engagement.",
    noChallenge: "Aucun défi n’est en cours pour le moment.", noChallengeShort: "Aucun défi en cours",
    challengeProgress: (current, target) => `${current} / ${target} jours`,
    decisionProgress: (current, target) => `${current} / ${target} réalisés`,
    decisionProgressLabel: "réalisés",
    routineProgress: current => `${current} / 2 terminés`,
    close: "Fermer", loading: "Chargement", retry: "Réessayer",
    challengeComplete: "Défi réussi !", challengeMissed: "Un jour a été manqué",
    challengeLoadError: "Impossible de charger le défi.",
    decisionsEmpty: "Fais un petit pas", routineStart: "Commence ta routine du jour",
    decisionsEmptyShort: "Un petit pas",
  },
  es: {
    routineTitle: "Rutina espiritual", challengeTitle: "Reto", decisionsTitle: "Compromiso de hoy",
    routineCardTitle: ["Rutina", "espiritual"], decisionsCardTitle: ["Compromiso", "de hoy"],
    decisionsDescription: "Pon en práctica la Palabra de Dios, con pequeños pasos de obediencia.",
    decisionsBeforeReflection: "Al meditar en la Palabra de Dios, haz un pequeño compromiso.",
    noChallenge: "No hay ningún reto activo en este momento.", noChallengeShort: "No hay retos activos",
    challengeProgress: (current, target) => `${current} / ${target} días`,
    decisionProgress: (current, target) => `${current} / ${target} cumplidos`,
    decisionProgressLabel: "cumplidos",
    routineProgress: current => `${current} / 2 completados`,
    close: "Cerrar", loading: "Cargando", retry: "Reintentar",
    challengeComplete: "¡Reto completado!", challengeMissed: "Hay un día sin completar",
    challengeLoadError: "No se pudo cargar el reto.",
    decisionsEmpty: "Da un pequeño paso", routineStart: "Empieza tu rutina de hoy",
    decisionsEmptyShort: "Paso a paso",
  },
};

export function getHomeDashboardText(lang: Lang): HomeDashboardText {
  return TEXT[lang] ?? TEXT.ko;
}

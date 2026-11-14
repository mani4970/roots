import type { Lang } from "@/lib/i18n";

type HomeDashboardText = {
  routineTitle: string;
  routineCardTitle: readonly string[];
  challengeTitle: string;
  gratitudeTitle: string;
  gratitudeCardTitle: readonly string[];
  noChallenge: string;
  noChallengeShort: string;
  challengeProgress: (current: number, target: number) => string;
  routineProgress: (current: number) => string;
  close: string;
  loading: string;
  retry: string;
  challengeComplete: string;
  challengeMissed: string;
  challengeLoadError: string;
};

const TEXT: Record<Lang, HomeDashboardText> = {
  ko: {
    routineTitle: "묵상과 기도", challengeTitle: "챌린지", gratitudeTitle: "감사 노트",
    routineCardTitle: ["묵상과 기도"], gratitudeCardTitle: ["감사 노트"],
    noChallenge: "현재 진행 중인 챌린지가 없어요.", noChallengeShort: "진행 중인 챌린지 없음",
    challengeProgress: (current, target) => `${current} / ${target}일`,
    routineProgress: current => `${current} / 2 완료`,
    close: "닫기", loading: "불러오는 중", retry: "다시 시도",
    challengeComplete: "완주했어요!", challengeMissed: "미완료 날짜 있음",
    challengeLoadError: "챌린지를 불러오지 못했어요.",
  },
  en: {
    routineTitle: "Reflection and prayer", challengeTitle: "Challenge", gratitudeTitle: "Gratitude journal",
    routineCardTitle: ["Reflection &", "prayer"], gratitudeCardTitle: ["Gratitude", "journal"],
    noChallenge: "There is no active challenge right now.", noChallengeShort: "No active challenge",
    challengeProgress: (current, target) => `${current} / ${target} days`,
    routineProgress: current => `${current} / 2 completed`,
    close: "Close", loading: "Loading", retry: "Try again",
    challengeComplete: "Challenge complete!", challengeMissed: "A day was missed",
    challengeLoadError: "Could not load the challenge.",
  },
  de: {
    routineTitle: "Stille Zeit und Gebet", challengeTitle: "Challenge", gratitudeTitle: "Dankbarkeitstagebuch",
    routineCardTitle: ["Stille Zeit &", "Gebet"], gratitudeCardTitle: ["Dankbarkeits-", "tagebuch"],
    noChallenge: "Zurzeit gibt es keine laufende Challenge.", noChallengeShort: "Keine aktive Challenge",
    challengeProgress: (current, target) => `${current} / ${target} Tage`,
    routineProgress: current => `${current} / 2 abgeschlossen`,
    close: "Schließen", loading: "Wird geladen", retry: "Erneut versuchen",
    challengeComplete: "Challenge geschafft!", challengeMissed: "Ein Tag wurde verpasst",
    challengeLoadError: "Die Challenge konnte nicht geladen werden.",
  },
  fr: {
    routineTitle: "Méditation et prière", challengeTitle: "Défi", gratitudeTitle: "Carnet de gratitude",
    routineCardTitle: ["Méditation &", "prière"], gratitudeCardTitle: ["Carnet de", "gratitude"],
    noChallenge: "Aucun défi n’est en cours pour le moment.", noChallengeShort: "Aucun défi en cours",
    challengeProgress: (current, target) => `${current} / ${target} jours`,
    routineProgress: current => `${current} / 2 terminés`,
    close: "Fermer", loading: "Chargement", retry: "Réessayer",
    challengeComplete: "Défi réussi !", challengeMissed: "Un jour a été manqué",
    challengeLoadError: "Impossible de charger le défi.",
  },
  es: {
    routineTitle: "Devocional y oración", challengeTitle: "Reto", gratitudeTitle: "Diario de gratitud",
    routineCardTitle: ["Devocional &", "oración"], gratitudeCardTitle: ["Diario de", "gratitud"],
    noChallenge: "No hay ningún reto activo en este momento.", noChallengeShort: "No hay retos activos",
    challengeProgress: (current, target) => `${current} / ${target} días`,
    routineProgress: current => `${current} / 2 completados`,
    close: "Cerrar", loading: "Cargando", retry: "Reintentar",
    challengeComplete: "¡Reto completado!", challengeMissed: "Hay un día sin completar",
    challengeLoadError: "No se pudo cargar el reto.",
  },
};

export function getHomeDashboardText(lang: Lang): HomeDashboardText {
  return TEXT[lang] ?? TEXT.ko;
}

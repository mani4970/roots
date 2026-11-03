import type { Lang } from "@/lib/i18n";

export const PERSONAL_REFLECTION_CHALLENGE_BADGE = "/images/personal-challenges/november-2026-gratitude.webp";
export const PERSONAL_REFLECTION_CHALLENGE_MYSTERY_BADGE = "/images/group-challenges/mystery-badge.webp";

export type PersonalChallengeText = {
  title: string;
  genericTitle: string;
  period: string;
  rule: string;
  reward: string;
  badgeName: string;
  mystery: string;
  heartsLabel: string;
  confirm: string;
  close: string;
  viewBadge: string;
  details: string;
  upcoming: string;
  active: string;
  complete: string;
  ended: string;
  missed: string;
  empty: string;
  loading: string;
  loadError: string;
  retry: string;
  rewardTitle: string;
  goal: (days: number) => string;
  consecutive: (days: number) => string;
  completed: (days: number) => string;
  ruleFor: (days: number) => string;
  rewardFor: (hearts: number) => string;
  awarded: (hearts: number) => string;
};

const TEXT: Record<Lang, PersonalChallengeText> = {
  ko: {
    title: "11월 묵상 챌린지", genericTitle: "묵상 챌린지", period: "11월 9일 - 19일까지",
    rule: "11일간 매일 묵상 완료 시,", reward: "스페셜 배지와 하트 30개가 지급됩니다!",
    badgeName: "감사의 편지", mystery: "미스테리 배지", heartsLabel: "하트",
    confirm: "확인", close: "닫기", viewBadge: "배지 보기", details: "11월 묵상 챌린지 조건과 보상 보기",
    upcoming: "진행 예정", active: "진행 중", complete: "달성 완료 🎉", ended: "기간 종료", missed: "미완료 날짜 있음",
    empty: "현재 진행 중인 챌린지가 없어요.", loading: "챌린지 불러오는 중", loadError: "챌린지를 불러오지 못했어요.", retry: "다시 시도",
    rewardTitle: "챌린지 완주 🎉",
    goal: days => `${days}일 매일 묵상하기`, consecutive: days => `${days}일 연속 묵상 완료`, completed: days => `${days}일 묵상 완료`,
    ruleFor: days => `${days}일간 매일 묵상 완료 시,`, rewardFor: hearts => `스페셜 배지와 하트 ${hearts}개가 지급됩니다!`,
    awarded: hearts => `스페셜 배지와 하트 ${hearts}개를 받았어요!`,
  },
  en: {
    title: "November Challenge", genericTitle: "Reflection Challenge", period: "November 9–19",
    rule: "Complete Reflection on all 11 days.", reward: "Special badge + 30 hearts!",
    badgeName: "Letter of Gratitude", mystery: "Mystery badge", heartsLabel: "hearts",
    confirm: "Got it", close: "Close", viewBadge: "View badge", details: "View November challenge conditions and rewards",
    upcoming: "Upcoming", active: "In progress", complete: "Completed 🎉", ended: "Ended", missed: "Day missed",
    empty: "No active challenge", loading: "Loading challenge", loadError: "Couldn’t load the challenge.", retry: "Try again",
    rewardTitle: "Challenge complete 🎉",
    goal: days => `${days} days of Reflection`, consecutive: days => `${days} days in a row`, completed: days => `${days} days completed`,
    ruleFor: days => `Complete Reflection on all ${days} days.`, rewardFor: hearts => `Special badge + ${hearts} hearts!`,
    awarded: hearts => `You received a special badge + ${hearts} hearts!`,
  },
  de: {
    title: "November-Challenge", genericTitle: "Stille-Zeit-Challenge", period: "9.–19. November",
    rule: "11 Tage täglich Stille Zeit abschließen.", reward: "Spezialabzeichen + 30 Herzen!",
    badgeName: "Dankesbrief", mystery: "Geheimnisvolles Abzeichen", heartsLabel: "Herzen",
    confirm: "Verstanden", close: "Schließen", viewBadge: "Abzeichen ansehen", details: "Bedingungen und Belohnungen der November-Challenge ansehen",
    upcoming: "Geplant", active: "Läuft", complete: "Geschafft 🎉", ended: "Beendet", missed: "Tag verpasst",
    empty: "Keine aktive Challenge", loading: "Challenge wird geladen", loadError: "Challenge nicht geladen.", retry: "Erneut versuchen",
    rewardTitle: "Challenge geschafft 🎉",
    goal: days => `${days} Tage Stille Zeit`, consecutive: days => `${days} Tage in Folge`, completed: days => `${days} Tage abgeschlossen`,
    ruleFor: days => `${days} Tage täglich Stille Zeit abschließen.`, rewardFor: hearts => `Spezialabzeichen + ${hearts} Herzen!`,
    awarded: hearts => `Spezialabzeichen + ${hearts} Herzen erhalten!`,
  },
  fr: {
    title: "Défi de novembre", genericTitle: "Défi de méditation", period: "Du 9 au 19 novembre",
    rule: "Terminez la méditation 11 jours de suite.", reward: "Badge spécial + 30 cœurs !",
    badgeName: "Lettre de gratitude", mystery: "Badge mystère", heartsLabel: "cœurs",
    confirm: "Compris", close: "Fermer", viewBadge: "Voir le badge", details: "Voir les conditions et récompenses du défi de novembre",
    upcoming: "À venir", active: "En cours", complete: "Réussi 🎉", ended: "Terminé", missed: "Jour manqué",
    empty: "Aucun défi en cours", loading: "Chargement du défi", loadError: "Défi indisponible.", retry: "Réessayer",
    rewardTitle: "Défi réussi 🎉",
    goal: days => `${days} jours de méditation`, consecutive: days => `${days} jours de suite`, completed: days => `${days} jours accomplis`,
    ruleFor: days => `Terminez la méditation ${days} jours de suite.`, rewardFor: hearts => `Badge spécial + ${hearts} cœurs !`,
    awarded: hearts => `Vous avez reçu un badge spécial + ${hearts} cœurs !`,
  },
  es: {
    title: "Reto de noviembre", genericTitle: "Reto devocional", period: "Del 9 al 19 de noviembre",
    rule: "Completa tu devocional los 11 días.", reward: "¡Insignia especial + 30 corazones!",
    badgeName: "Carta de gratitud", mystery: "Insignia misteriosa", heartsLabel: "corazones",
    confirm: "Entendido", close: "Cerrar", viewBadge: "Ver insignia", details: "Ver las condiciones y recompensas del desafío de noviembre",
    upcoming: "Próximo", active: "En curso", complete: "Logrado 🎉", ended: "Finalizado", missed: "Día sin completar",
    empty: "No hay retos activos", loading: "Cargando reto", loadError: "No se pudo cargar el reto.", retry: "Reintentar",
    rewardTitle: "¡Reto completado! 🎉",
    goal: days => `${days} días de devocional`, consecutive: days => `${days} días seguidos`, completed: days => `${days} días completados`,
    ruleFor: days => `Completa tu devocional los ${days} días.`, rewardFor: hearts => `¡Insignia especial + ${hearts} corazones!`,
    awarded: hearts => `¡Has recibido una insignia especial + ${hearts} corazones!`,
  },
};

export function getPersonalChallengeText(lang: Lang | string): PersonalChallengeText {
  return TEXT[lang as Lang] ?? TEXT.ko;
}

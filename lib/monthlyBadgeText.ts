export type MonthlyBadgeTextLang = "ko" | "en" | "de" | "fr" | "es";

const COPY = {
  ko: {
    title: "월별 배지",
    galleryTitle: "월별 배지",
    gallerySubtitle: "그 달 안에 모든 날짜의 말씀 묵상을 완료하면 배지를 받을 수 있어요.",
    earned: "획득",
    missed: "미획득",
    mystery: "미스터리",
    mysteryAlt: "아직 공개되지 않은 월별 배지",
    loadFailed: "월별 배지 기록을 불러오지 못했어요.",
    awardTitle: (month: string) => `${month} 배지를 받았어요!`,
    awardBody: (month: string) => `${month}에도 매일 말씀 묵상하며 하나님과 동행한 당신을 축복합니다!`,
    awardCta: (month: string) => `${month} 배지 확인하러 가기`,
    awardConfirm: "확인",
    awardClose: "닫기",
    awardBadgeAlt: (month: string) => `${month} 월별 배지`,
  },
  en: {
    title: "Monthly badges",
    galleryTitle: "Monthly badges",
    gallerySubtitle: "Complete every dated Bible Reflection before the month ends to earn its badge.",
    earned: "Earned",
    missed: "Not earned",
    mystery: "Mystery",
    mysteryAlt: "Monthly badge not revealed yet",
    loadFailed: "Could not load monthly badge records.",
    awardTitle: (month: string) => `You earned the ${month} badge!`,
    awardBody: (month: string) => `We bless you for walking with God through daily Bible Reflection throughout ${month}!`,
    awardCta: (month: string) => `View your ${month} badge`,
    awardConfirm: "View",
    awardClose: "Close",
    awardBadgeAlt: (month: string) => `${month} monthly badge`,
  },
  de: {
    title: "Monatsabzeichen",
    galleryTitle: "Monatsabzeichen",
    gallerySubtitle: "Schließe bis zum Monatsende die Stille Zeit für jeden Tag ab, um das Abzeichen zu erhalten.",
    earned: "Erhalten",
    missed: "Nicht erhalten",
    mystery: "Geheimnis",
    mysteryAlt: "Noch nicht enthülltes Monatsabzeichen",
    loadFailed: "Die Monatsabzeichen konnten nicht geladen werden.",
    awardTitle: (month: string) => `Du hast das Abzeichen für ${month} erhalten!`,
    awardBody: (month: string) => `Wir segnen dich dafür, dass du auch im ${month} jeden Tag in der Stillen Zeit mit Gott unterwegs warst!`,
    awardCta: (month: string) => `Abzeichen für ${month} ansehen`,
    awardConfirm: "Ansehen",
    awardClose: "Schließen",
    awardBadgeAlt: (month: string) => `Monatsabzeichen für ${month}`,
  },
  fr: {
    title: "Badges mensuels",
    galleryTitle: "Badges mensuels",
    gallerySubtitle: "Termine la méditation biblique de chaque date avant la fin du mois pour obtenir le badge.",
    earned: "Obtenu",
    missed: "Non obtenu",
    mystery: "Mystère",
    mysteryAlt: "Badge mensuel pas encore révélé",
    loadFailed: "Impossible de charger les badges mensuels.",
    awardTitle: (month: string) => `Tu as obtenu le badge du mois de ${month} !`,
    awardBody: (month: string) => `Nous te bénissons pour avoir marché avec Dieu chaque jour dans la méditation biblique pendant le mois de ${month} !`,
    awardCta: (month: string) => `Voir le badge de ${month}`,
    awardConfirm: "Voir",
    awardClose: "Fermer",
    awardBadgeAlt: (month: string) => `Badge mensuel de ${month}`,
  },
  es: {
    title: "Insignias mensuales",
    galleryTitle: "Insignias mensuales",
    gallerySubtitle: "Completa la meditación bíblica de cada fecha antes de que termine el mes para obtener la insignia.",
    earned: "Obtenida",
    missed: "No obtenida",
    mystery: "Misterio",
    mysteryAlt: "Insignia mensual aún no revelada",
    loadFailed: "No se pudieron cargar las insignias mensuales.",
    awardTitle: (month: string) => `¡Has obtenido la insignia de ${month}!`,
    awardBody: (month: string) => `¡Te bendecimos por caminar con Dios cada día mediante la meditación bíblica durante ${month}!`,
    awardCta: (month: string) => `Ver tu insignia de ${month}`,
    awardConfirm: "Ver",
    awardClose: "Cerrar",
    awardBadgeAlt: (month: string) => `Insignia mensual de ${month}`,
  },
} as const;

function normalizeLang(lang: string): MonthlyBadgeTextLang {
  return lang === "ko" || lang === "en" || lang === "de" || lang === "fr" || lang === "es"
    ? lang
    : "ko";
}

export function getMonthlyBadgeText(lang: string) {
  return COPY[normalizeLang(lang)];
}

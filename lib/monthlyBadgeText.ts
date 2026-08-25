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

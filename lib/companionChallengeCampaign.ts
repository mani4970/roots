// September 2026 companion challenge. Dates use the device's local calendar.
export const COMPANION_CHALLENGE_3_ID = "548e06a4-456f-4ed9-9ea0-4708828fe383";
export const COMPANION_CHALLENGE_3_BADGE =
  "/images/companion-challenges/companion-challenge-3.webp";
export const COMPANION_CHALLENGE_3_ANNOUNCEMENT_KEY =
  "companion_challenge_3_announcement_20260909";
export const COMPANION_CHALLENGE_3_END_DATE = "2026-09-19";

export function isCompanionChallenge3AnnouncementWindow(localDate: string) {
  return localDate >= "2026-09-09" && localDate < "2026-09-11";
}

export const COMPANION_CHALLENGE_3_COPY = {
  ko: {
    title: "우리의 묵상 테이프",
    lead: "곧 새로운 동역자 챌린지가 시작돼요!",
    body: "9월 11일부터 9월 19일까지 총 9일간, 매일 빠짐없이 동역자끼리 묵상을 나누어보세요!",
    reward: "스페셜 배지와 하트 30개를 선물 받습니다.",
    manage: "동역자 관리",
    close: "닫기",
    viewBadge: "배지 확인하러 가기",
    badgeAlt: "우리의 묵상 테이프 스페셜 배지",
  },
  en: {
    title: "Our Bible Reflection Tape",
    lead: "A new Companion Challenge is starting soon!",
    body: "From September 11 to 19, share a Bible Reflection with your companion every day for all 9 days!",
    reward: "Receive a special badge and 30 Love Hearts.",
    manage: "Manage companions",
    close: "Close",
    viewBadge: "View badge",
    badgeAlt: "Our Bible Reflection Tape special badge",
  },
  de: {
    title: "Unsere Stille-Zeit-Kassette",
    lead: "Bald beginnt eine neue Glaubenspartner-Challenge!",
    body: "Teilt vom 11. bis 19. September an allen 9 Tagen eure Stille Zeit miteinander!",
    reward: "Ihr erhaltet ein besonderes Abzeichen und 30 Liebesherzen.",
    manage: "Glaubenspartner verwalten",
    close: "Schließen",
    viewBadge: "Abzeichen ansehen",
    badgeAlt: "Unsere Stille-Zeit-Kassette – besonderes Abzeichen",
  },
  fr: {
    title: "Notre cassette de méditation biblique",
    lead: "Un nouveau défi avec partenaire commence bientôt !",
    body: "Du 11 au 19 septembre, partagez votre méditation biblique avec votre partenaire chaque jour, pendant les 9 jours !",
    reward: "Vous recevrez un badge spécial et 30 cœurs d’amour.",
    manage: "Gérer les partenaires",
    close: "Fermer",
    viewBadge: "Voir le badge",
    badgeAlt: "Notre cassette de méditation biblique – badge spécial",
  },
  es: {
    title: "Nuestra cinta de meditación bíblica",
    lead: "¡Pronto comienza un nuevo desafío con compañero de fe!",
    body: "Del 11 al 19 de septiembre, compartan su meditación bíblica con su compañero de fe cada día, ¡durante los 9 días completos!",
    reward: "Recibirán una insignia especial y 30 corazones de amor.",
    manage: "Gestionar compañeros de fe",
    close: "Cerrar",
    viewBadge: "Ver insignia",
    badgeAlt: "Nuestra cinta de meditación bíblica – insignia especial",
  },
};

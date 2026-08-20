import type { Lang } from "@/lib/i18n";
import type { CompanionChallengeStatus } from "@/lib/companionChallenges";

type CompanionChallengeLang = "ko" | "en" | "de" | "fr" | "es";

type CompanionChallengeText = {
  sectionTitle: string;
  loadingTitle: string;
  scheduledLabel: string;
  activeLabel: string;
  completedLabel: string;
  scheduledMessage: string;
  cardDescription: string;
  todayTogetherDone: string;
  todayWaitingPartner: string;
  todayWaitingMe: string;
  todayNotStarted: string;
  progressLabel: string;
  myStatusLabel: string;
  partnerStatusLabel: string;
  doneLabel: string;
  waitingLabel: string;
  rewardTeaser: string;
  claimButton: string;
  awardedLabel: string;
  popupTitle: string;
  popupBody: string;
  popupButton: string;
  heartsLabel: string;
};

const TEXT: Record<CompanionChallengeLang, CompanionChallengeText> = {
  ko: {
    sectionTitle: "동역자 말씀동행 챌린지",
    loadingTitle: "동역자 챌린지를 확인하고 있어요",
    scheduledLabel: "예정",
    activeLabel: "진행 중",
    completedLabel: "완료",
    scheduledMessage: "동역자와 매일 함께 말씀 묵상을 완료해보세요.",
    cardDescription: "동역자와 매일 함께 말씀 묵상을 완료해보세요.",
    todayTogetherDone: "오늘 함께 말씀 묵상을 완료했어요",
    todayWaitingPartner: "나는 완료했어요. 동역자를 기다리고 있어요",
    todayWaitingMe: "동역자가 완료했어요. 오늘 말씀 묵상을 해보세요",
    todayNotStarted: "오늘은 아직 함께 완료하지 않았어요",
    progressLabel: "함께 완료한 날",
    myStatusLabel: "나",
    partnerStatusLabel: "동역자",
    doneLabel: "완료",
    waitingLabel: "아직",
    rewardTeaser: "성공하면 특별 배지와 하트를 받아요.",
    claimButton: "배지 받기",
    awardedLabel: "배지 지급 완료",
    popupTitle: "동역자 챌린지 완료!",
    popupBody: "말씀 안에서 함께 걸어온 여러분의 발걸음을 축복해요.",
    popupButton: "배지 확인하기",
    heartsLabel: "사랑 하트",
  },
  en: {
    sectionTitle: "Companion Word Walk Challenge",
    loadingTitle: "Checking your companion challenge",
    scheduledLabel: "Scheduled",
    activeLabel: "Active",
    completedLabel: "Completed",
    scheduledMessage: "Complete a Bible Reflection together with a companion every day.",
    cardDescription: "Complete a Bible Reflection together with a companion every day.",
    todayTogetherDone: "You both completed today’s Bible Reflection",
    todayWaitingPartner: "You completed today. Waiting for your companion",
    todayWaitingMe: "Your companion completed today’s Bible Reflection. Start yours",
    todayNotStarted: "You have not completed today together yet",
    progressLabel: "Days completed together",
    myStatusLabel: "Me",
    partnerStatusLabel: "Companion",
    doneLabel: "Done",
    waitingLabel: "Waiting",
    rewardTeaser: "Complete it together to receive a special badge and Love Hearts.",
    claimButton: "Receive badge",
    awardedLabel: "Badge awarded",
    popupTitle: "Companion Challenge completed!",
    popupBody: "Blessings on the steps you walked together in the Word.",
    popupButton: "View badge",
    heartsLabel: "Love Hearts",
  },
  de: {
    sectionTitle: "Glaubenspartner-Wortweg-Challenge",
    loadingTitle: "Die Partner-Challenge wird geprüft",
    scheduledLabel: "Geplant",
    activeLabel: "Aktiv",
    completedLabel: "Abgeschlossen",
    scheduledMessage: "Schließt täglich gemeinsam mit einem Glaubenspartner die Stille Zeit ab.",
    cardDescription: "Schließt täglich gemeinsam mit einem Glaubenspartner die Stille Zeit ab.",
    todayTogetherDone: "Ihr habt heute beide die Stille Zeit abgeschlossen",
    todayWaitingPartner: "Du bist heute fertig. Dein Partner fehlt noch",
    todayWaitingMe: "Dein Partner ist heute fertig. Beginne deine Stille Zeit",
    todayNotStarted: "Heute ist noch kein gemeinsamer Abschluss erreicht",
    progressLabel: "Gemeinsam abgeschlossene Tage",
    myStatusLabel: "Ich",
    partnerStatusLabel: "Partner",
    doneLabel: "Fertig",
    waitingLabel: "Offen",
    rewardTeaser: "Wenn ihr gemeinsam abschließt, erhaltet ihr ein besonderes Abzeichen und Liebesherzen.",
    claimButton: "Abzeichen erhalten",
    awardedLabel: "Abzeichen erhalten",
    popupTitle: "Partner-Challenge abgeschlossen!",
    popupBody: "Gesegnet seien eure Schritte, die ihr gemeinsam im Wort gegangen seid.",
    popupButton: "Abzeichen ansehen",
    heartsLabel: "Liebesherzen",
  },
  fr: {
    sectionTitle: "Défi de marche biblique avec partenaire",
    loadingTitle: "Vérification du défi avec partenaire",
    scheduledLabel: "Prévu",
    activeLabel: "En cours",
    completedLabel: "Terminé",
    scheduledMessage: "Terminez chaque jour une méditation biblique avec un partenaire.",
    cardDescription: "Terminez chaque jour une méditation biblique avec un partenaire.",
    todayTogetherDone: "Vous avez tous les deux terminé la méditation biblique d’aujourd’hui",
    todayWaitingPartner: "Vous avez terminé aujourd’hui. Votre partenaire n’a pas encore terminé",
    todayWaitingMe: "Votre partenaire a terminé la méditation biblique d’aujourd’hui. Commencez la vôtre",
    todayNotStarted: "Aujourd’hui n’est pas encore terminé ensemble",
    progressLabel: "Jours terminés ensemble",
    myStatusLabel: "Moi",
    partnerStatusLabel: "Partenaire",
    doneLabel: "Terminé",
    waitingLabel: "En attente",
    rewardTeaser: "Terminez-le ensemble pour recevoir un badge spécial et des cœurs d’amour.",
    claimButton: "Recevoir le badge",
    awardedLabel: "Badge reçu",
    popupTitle: "Défi avec partenaire terminé !",
    popupBody: "Que les pas que vous avez faits ensemble dans la Parole soient bénis.",
    popupButton: "Voir le badge",
    heartsLabel: "Cœurs d’amour",
  },
  es: {
    sectionTitle: "Desafío Caminar con la Palabra con un compañero de fe",
    loadingTitle: "Comprobando el desafío con tu compañero de fe",
    scheduledLabel: "Programado",
    activeLabel: "En curso",
    completedLabel: "Completado",
    scheduledMessage: "Completen juntos una meditación bíblica cada día.",
    cardDescription: "Completen juntos una meditación bíblica cada día.",
    todayTogetherDone: "Hoy completaron juntos la meditación bíblica",
    todayWaitingPartner: "Ya completaste la de hoy. Esperando a tu compañero de fe",
    todayWaitingMe: "Tu compañero de fe ya completó la meditación bíblica de hoy. Empieza la tuya",
    todayNotStarted: "Aún no han completado juntos la meditación bíblica de hoy",
    progressLabel: "Días completados juntos",
    myStatusLabel: "Yo",
    partnerStatusLabel: "Compañero de fe",
    doneLabel: "Completado",
    waitingLabel: "Pendiente",
    rewardTeaser: "Completen el desafío juntos para recibir una insignia especial y corazones de amor.",
    claimButton: "Recibir insignia",
    awardedLabel: "Insignia recibida",
    popupTitle: "¡Desafío con compañero de fe completado!",
    popupBody: "Bendecimos los pasos que dieron juntos en la Palabra.",
    popupButton: "Ver insignia",
    heartsLabel: "Corazones de amor",
  },
};

function normalizeLang(lang: string): CompanionChallengeLang {
  if (lang === "ko" || lang === "en" || lang === "de" || lang === "fr" || lang === "es") return lang;
  return "en";
}

export const COMPANION_CHALLENGE_1_ID = "0d92d123-3fbd-48a7-b7f2-ebeee368f660";
export const COMPANION_CHALLENGE_2_ID = "f7dbeeac-d739-425b-b26e-536650e5e20f";

const CHALLENGE_TITLE_TEXT: Record<
  CompanionChallengeLang,
  { companionChallenge1: string; companionChallenge2: string }
> = {
  ko: {
    companionChallenge1: "우리의 신앙 여정 Part 1",
    companionChallenge2: "우리의 신앙 여정 Part 2",
  },
  en: {
    companionChallenge1: "Our Faith Journey Part 1",
    companionChallenge2: "Our Faith Journey Part 2",
  },
  de: {
    companionChallenge1: "Unsere Glaubensreise Teil 1",
    companionChallenge2: "Unsere Glaubensreise Teil 2",
  },
  fr: {
    companionChallenge1: "Notre chemin de foi Partie 1",
    companionChallenge2: "Notre chemin de foi Partie 2",
  },
  es: {
    companionChallenge1: "Nuestro camino de fe Parte 1",
    companionChallenge2: "Nuestro camino de fe Parte 2",
  },
};

type CompanionChallengeTitleInput = {
  challengeId?: string | null;
  title?: string | null;
  badgeName?: string | null;
};

function normalizeTitleValue(value?: string | null) {
  return String(value ?? "").trim().toLowerCase();
}

function isCompanionChallenge1Title(value?: string | null) {
  const normalized = normalizeTitleValue(value);
  return (
    normalized === "우리의 신앙 여정 part 1" ||
    normalized === "our faith journey part 1" ||
    normalized === "unsere glaubensreise teil 1" ||
    normalized === "notre chemin de foi partie 1" ||
    normalized === "nuestro camino de fe parte 1"
  );
}

function isCompanionChallenge2Title(value?: string | null) {
  const normalized = normalizeTitleValue(value);
  return (
    normalized === "우리의 신앙 여정 part 2" ||
    normalized === "our faith journey part 2" ||
    normalized === "unsere glaubensreise teil 2" ||
    normalized === "notre chemin de foi partie 2" ||
    normalized === "nuestro camino de fe parte 2"
  );
}

function getKnownChallengePart(
  challenge: CompanionChallengeTitleInput | string | null | undefined,
): 1 | 2 | null {
  if (typeof challenge === "string") {
    if (isCompanionChallenge1Title(challenge)) return 1;
    if (isCompanionChallenge2Title(challenge)) return 2;
    return null;
  }

  const challengeId = String(challenge?.challengeId ?? "").trim();
  const title = String(challenge?.title ?? "").trim();
  const badgeName = String(challenge?.badgeName ?? "").trim();

  if (
    challengeId === COMPANION_CHALLENGE_1_ID ||
    isCompanionChallenge1Title(title) ||
    isCompanionChallenge1Title(badgeName)
  ) {
    return 1;
  }

  if (
    challengeId === COMPANION_CHALLENGE_2_ID ||
    isCompanionChallenge2Title(title) ||
    isCompanionChallenge2Title(badgeName)
  ) {
    return 2;
  }

  return null;
}

export function getCompanionChallengeDisplayTitle(
  challenge: CompanionChallengeTitleInput | string | null | undefined,
  lang: Lang | string,
) {
  const normalizedLang = normalizeLang(String(lang));
  const part = getKnownChallengePart(challenge);

  if (part === 1) return CHALLENGE_TITLE_TEXT[normalizedLang].companionChallenge1;
  if (part === 2) return CHALLENGE_TITLE_TEXT[normalizedLang].companionChallenge2;

  if (typeof challenge === "string") return challenge;

  const title = String(challenge?.title ?? "").trim();
  const badgeName = String(challenge?.badgeName ?? "").trim();
  return title || badgeName || TEXT[normalizedLang].sectionTitle;
}

export function getCompanionChallengeRewardTeaser(
  rewardHearts: number,
  lang: Lang | string,
) {
  const normalizedLang = normalizeLang(String(lang));
  const hearts = Math.max(0, Math.round(Number(rewardHearts) || 0));

  if (normalizedLang === "ko") {
    return `성공하면 특별 배지와 하트 ${hearts}개를 받아요.`;
  }
  if (normalizedLang === "de") {
    return `Wenn ihr gemeinsam abschließt, erhaltet ihr ein besonderes Abzeichen und ${hearts} Liebesherzen.`;
  }
  if (normalizedLang === "fr") {
    return `Terminez-le ensemble pour recevoir un badge spécial et ${hearts} cœurs d’amour.`;
  }
  if (normalizedLang === "es") {
    return `Al completarlo juntos, recibirán una insignia especial y ${hearts} corazones de amor.`;
  }
  return `Complete it together to receive a special badge and ${hearts} Love Hearts.`;
}

export function getCompanionChallengeRewardPopupBody(
  challenge: CompanionChallengeTitleInput | string | null | undefined,
  lang: Lang | string,
) {
  const normalizedLang = normalizeLang(String(lang));
  const part = getKnownChallengePart(challenge);
  const days = part === 1 ? 15 : part === 2 ? 17 : null;

  if (!days) return TEXT[normalizedLang].popupBody;
  if (normalizedLang === "ko") {
    return `${days}일 동안 말씀 안에서 함께 걸어온 여러분의 발걸음을 축복해요.`;
  }
  if (normalizedLang === "de") {
    return `Gesegnet seien eure Schritte, die ihr ${days} Tage lang gemeinsam im Wort gegangen seid.`;
  }
  if (normalizedLang === "fr") {
    return `Que les pas que vous avez faits ensemble dans la Parole pendant ${days} jours soient bénis.`;
  }
  if (normalizedLang === "es") {
    return `Bendecimos los pasos que dieron juntos en la Palabra durante ${days} días.`;
  }
  return `Blessings on the steps you walked together in the Word for ${days} days.`;
}

export function getCompanionChallengeText(lang: Lang | string): CompanionChallengeText {
  return TEXT[normalizeLang(String(lang))];
}

export function getCompanionChallengeStatusLabel(
  status: CompanionChallengeStatus,
  lang: Lang | string,
) {
  const text = getCompanionChallengeText(lang);
  if (status.status === "scheduled") return text.scheduledLabel;
  if (status.status === "completed") return text.completedLabel;
  return text.activeLabel;
}

export function getCompanionChallengeTodayMessage(
  status: CompanionChallengeStatus,
  lang: Lang | string,
) {
  const text = getCompanionChallengeText(lang);
  if (status.status === "scheduled") return text.scheduledMessage;
  if (status.todayPairCompleted) return text.todayTogetherDone;
  if (status.todayUserCompleted) return text.todayWaitingPartner;
  if (status.todayPartnerCompleted) return text.todayWaitingMe;
  return text.todayNotStarted;
}

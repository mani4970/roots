type NotificationIntroLang = "ko" | "de" | "en" | "fr";

type NotificationIntroPopupText = {
  title: string;
  body: string;
  openSettings: string;
  later: string;
};

const NOTIFICATION_INTRO_POPUP_TEXT: Record<NotificationIntroLang, NotificationIntroPopupText> = {
  ko: {
    title: "새로운 알림 기능이 추가되었어요",
    body: "이제 동역자들과 그룹원들의 묵상과 기도 소원을 놓치지 마세요!",
    openSettings: "알림 설정하러 가기",
    later: "나중에",
  },
  de: {
    title: "Die neue Benachrichtigungsfunktion ist da",
    body: "Verpasse jetzt weder die Stille Zeit noch die Gebetsanliegen deiner Glaubenspartner und Gruppenmitglieder!",
    openSettings: "Zu den Benachrichtigungseinstellungen",
    later: "Später",
  },
  en: {
    title: "A new notification feature has arrived",
    body: "Don't miss your companions' and group members' reflections and prayer requests anymore!",
    openSettings: "Go to notification settings",
    later: "Later",
  },
  fr: {
    title: "La nouvelle fonction de notification est arrivée",
    body: "Ne manquez plus les méditations et sujets de prière de vos compagnons et des membres de votre groupe !",
    openSettings: "Aller aux réglages des notifications",
    later: "Plus tard",
  },
};

export function getNotificationIntroPopupText(lang: string): NotificationIntroPopupText {
  if (lang === "ko" || lang === "de" || lang === "en" || lang === "fr") {
    return NOTIFICATION_INTRO_POPUP_TEXT[lang];
  }
  return NOTIFICATION_INTRO_POPUP_TEXT.ko;
}

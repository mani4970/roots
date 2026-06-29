type NotificationIntroLang = "ko" | "de" | "en" | "fr";

type NotificationIntroPopupText = {
  title: string;
  body: string;
  updateNotice: string;
  openSettings: string;
  later: string;
  dismissForever: string;
};

const NOTIFICATION_INTRO_POPUP_TEXT: Record<NotificationIntroLang, NotificationIntroPopupText> = {
  ko: {
    title: "새로운 알림 기능이 추가되었어요",
    body: "이제 동역자들과 그룹원들의 묵상과 기도 소원을 놓치지 마세요!",
    updateNotice: "푸시 알림은 최신 앱에서 사용할 수 있어요.\nApp Store 혹은 Google Play에서 업데이트 해주세요.",
    openSettings: "알림 설정하러 가기",
    later: "나중에",
    dismissForever: "다시 보지 않기",
  },
  de: {
    title: "Die neue Benachrichtigungsfunktion ist da",
    body: "Verpasse jetzt weder die Stille Zeit noch die Gebetsanliegen deiner Glaubenspartner und Gruppenmitglieder!",
    updateNotice: "Push-Benachrichtigungen sind in der neuesten App verfügbar.\nBitte aktualisiere Roots im App Store oder bei Google Play.",
    openSettings: "Zu den Benachrichtigungseinstellungen",
    later: "Später",
    dismissForever: "Nicht mehr anzeigen",
  },
  en: {
    title: "A new notification feature has arrived",
    body: "Don't miss your companions' and group members' reflections and prayer requests anymore!",
    updateNotice: "Push notifications are available in the latest app.\nPlease update Roots from the App Store or Google Play.",
    openSettings: "Go to notification settings",
    later: "Later",
    dismissForever: "Don’t show again",
  },
  fr: {
    title: "La nouvelle fonction de notification est arrivée",
    body: "Ne manquez plus les méditations et sujets de prière de vos compagnons et des membres de votre groupe !",
    updateNotice: "Les notifications push sont disponibles dans la dernière version de l’app.\nMettez Roots à jour depuis l’App Store ou Google Play.",
    openSettings: "Aller aux réglages des notifications",
    later: "Plus tard",
    dismissForever: "Ne plus afficher",
  },
};

export function getNotificationIntroPopupText(lang: string): NotificationIntroPopupText {
  if (lang === "ko" || lang === "de" || lang === "en" || lang === "fr") {
    return NOTIFICATION_INTRO_POPUP_TEXT[lang];
  }
  return NOTIFICATION_INTRO_POPUP_TEXT.ko;
}

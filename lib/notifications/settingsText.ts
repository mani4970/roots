import type { Lang } from "@/lib/i18n";

type NotificationSettingsText = {
  modalDescription: string;
  devicePermissionDescription: string;
  eveningReminderDescription: string;
  loadFailed: string;
  pushTitle: string;
  pushDescription: string;
  groupTitle: string;
  groupDescription: string;
  partnerTitle: string;
  partnerDescription: string;
};

const NOTIFICATION_SETTINGS_TEXT: Record<Lang, NotificationSettingsText> = {
  ko: {
    modalDescription: "말씀 묵상과 기도의 시간, 그리고 커뮤니티의 알림을 설정해보세요.",
    devicePermissionDescription: "기기 알림 권한을 설정합니다",
    eveningReminderDescription: "하루가 끝나기 전, 오늘의 묵상 리마인드 해드려요",
    loadFailed: "동역자/그룹 알림 설정을 불러오지 못했어요.",
    pushTitle: "동역자/그룹 알림",
    pushDescription: "새 말씀 묵상, 기도 제목, 기도 응답 소식을 핸드폰 알림으로 받을지 설정해요.",
    groupTitle: "그룹 알림",
    groupDescription: "내가 참여한 그룹의 묵상과 기도 소식을 받아요.",
    partnerTitle: "동역자 알림",
    partnerDescription: "나의 동역자가 나눈 묵상과 기도 소식을 받아요.",
  },
  de: {
    modalDescription: "Lege Zeiten für Stille Zeit und Gebet fest und verwalte Community-Hinweise.",
    devicePermissionDescription: "Richte die Benachrichtigungsberechtigung des Geräts ein.",
    eveningReminderDescription: "Vor Tagesende erinnern wir dich an die heutige Stille Zeit.",
    loadFailed: "Einstellungen für Partner- und Gruppenbenachrichtigungen konnten nicht geladen werden.",
    pushTitle: "Partner- und Gruppenhinweise",
    pushDescription: "Lege fest, ob du Hinweise zu Stille Zeit, Gebetsanliegen und erhörten Gebeten auf deinem Handy erhältst.",
    groupTitle: "Gruppenbenachrichtigungen",
    groupDescription: "Erhalte Hinweise zu Stille Zeit und Gebet in deinen Gruppen.",
    partnerTitle: "Partnerbenachrichtigungen",
    partnerDescription: "Erhalte Hinweise zu Stille Zeit und Gebet deiner Glaubenspartner.",
  },
  en: {
    modalDescription: "Set your Bible Reflection and prayer times, and manage community notifications.",
    devicePermissionDescription: "Set your device notification permission.",
    eveningReminderDescription: "Before the day ends, we’ll remind you about today’s reflection.",
    loadFailed: "Could not load partner and group notification settings.",
    pushTitle: "Partner and group notifications",
    pushDescription: "Choose whether to receive Bible Reflection, prayer request, and answered-prayer updates on your phone.",
    groupTitle: "Group notifications",
    groupDescription: "Receive Bible Reflection and prayer updates from groups you joined.",
    partnerTitle: "Faith partner notifications",
    partnerDescription: "Receive Bible Reflection and prayer updates from your faith partners.",
  },
  fr: {
    modalDescription: "Définissez vos temps de méditation biblique et de prière, et gérez les notifications de la communauté.",
    devicePermissionDescription: "Configurez l’autorisation de notification de l’appareil.",
    eveningReminderDescription: "Avant la fin de la journée, nous vous rappellerons la méditation du jour.",
    loadFailed: "Impossible de charger les notifications de partenaires et de groupes.",
    pushTitle: "Notifications partenaires et groupes",
    pushDescription: "Choisissez si vous souhaitez recevoir les méditations, sujets de prière et prières exaucées sur votre téléphone.",
    groupTitle: "Notifications de groupe",
    groupDescription: "Recevez les méditations et prières des groupes que vous avez rejoints.",
    partnerTitle: "Notifications de partenaires",
    partnerDescription: "Recevez les méditations et prières de vos partenaires de foi.",
  },
};

export function getNotificationSettingsText(lang: Lang): NotificationSettingsText {
  return NOTIFICATION_SETTINGS_TEXT[lang] ?? NOTIFICATION_SETTINGS_TEXT.ko;
}

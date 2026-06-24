import type { Lang } from "@/lib/i18n";

type NotificationSettingsText = {
  loadFailed: string;
  pushTitle: string;
  pushDescription: string;
  groupTitle: string;
  groupDescription: string;
  groupQtTitle: string;
  groupQtDescription: string;
  groupPrayerTitle: string;
  groupPrayerDescription: string;
  groupAnsweredPrayerTitle: string;
  groupAnsweredPrayerDescription: string;
  partnerTitle: string;
  partnerDescription: string;
  partnerQtTitle: string;
  partnerQtDescription: string;
  partnerPrayerTitle: string;
  partnerPrayerDescription: string;
  partnerAnsweredPrayerTitle: string;
  partnerAnsweredPrayerDescription: string;
};

const NOTIFICATION_SETTINGS_TEXT: Record<Lang, NotificationSettingsText> = {
  ko: {
    loadFailed: "동역자/그룹 알림 설정을 불러오지 못했어요.",
    pushTitle: "동역자/그룹 알림",
    pushDescription: "새 말씀 묵상, 기도 제목, 기도 응답을 핸드폰 알림으로 받을 준비를 해요.",
    groupTitle: "그룹 알림",
    groupDescription: "내가 참여한 그룹의 묵상과 기도 소식을 받아요.",
    groupQtTitle: "그룹 새 말씀 묵상",
    groupQtDescription: "그룹에 새 말씀 묵상이 올라오면 알려드려요.",
    groupPrayerTitle: "그룹 새 기도 제목",
    groupPrayerDescription: "그룹에 함께 중보할 기도 제목이 올라오면 알려드려요.",
    groupAnsweredPrayerTitle: "그룹 기도 응답",
    groupAnsweredPrayerDescription: "그룹에 응답된 기도 소원이 올라오면 알려드려요.",
    partnerTitle: "동역자 알림",
    partnerDescription: "나의 동역자가 나눈 묵상과 기도 소식을 받아요.",
    partnerQtTitle: "동역자 새 말씀 묵상",
    partnerQtDescription: "동역자가 말씀 묵상을 나누면 알려드려요.",
    partnerPrayerTitle: "동역자 새 기도 제목",
    partnerPrayerDescription: "동역자가 기도 제목을 나누면 알려드려요.",
    partnerAnsweredPrayerTitle: "동역자 기도 응답",
    partnerAnsweredPrayerDescription: "동역자의 기도 응답 소식이 올라오면 알려드려요.",
  },
  de: {
    loadFailed: "Einstellungen für Partner- und Gruppenbenachrichtigungen konnten nicht geladen werden.",
    pushTitle: "Partner- und Gruppenhinweise",
    pushDescription: "Wähle aus, welche neuen Stille-Zeit-, Gebets- und Gebetserhörungs-Hinweise du auf dem Handy erhalten möchtest.",
    groupTitle: "Gruppenbenachrichtigungen",
    groupDescription: "Erhalte Hinweise zu Stille Zeit und Gebet in deinen Gruppen.",
    groupQtTitle: "Neue Stille Zeit in Gruppen",
    groupQtDescription: "Wir benachrichtigen dich, wenn in einer Gruppe eine neue Stille Zeit geteilt wird.",
    groupPrayerTitle: "Neue Gebetsanliegen in Gruppen",
    groupPrayerDescription: "Wir benachrichtigen dich, wenn in einer Gruppe ein Gebetsanliegen geteilt wird.",
    groupAnsweredPrayerTitle: "Erhörte Gebete in Gruppen",
    groupAnsweredPrayerDescription: "Wir benachrichtigen dich, wenn in einer Gruppe ein erhörtes Gebet geteilt wird.",
    partnerTitle: "Partnerbenachrichtigungen",
    partnerDescription: "Erhalte Hinweise zu Stille Zeit und Gebet deiner Glaubenspartner.",
    partnerQtTitle: "Neue Stille Zeit von Partnern",
    partnerQtDescription: "Wir benachrichtigen dich, wenn ein Glaubenspartner eine Stille Zeit teilt.",
    partnerPrayerTitle: "Neue Gebetsanliegen von Partnern",
    partnerPrayerDescription: "Wir benachrichtigen dich, wenn ein Glaubenspartner ein Gebetsanliegen teilt.",
    partnerAnsweredPrayerTitle: "Erhörte Gebete von Partnern",
    partnerAnsweredPrayerDescription: "Wir benachrichtigen dich, wenn ein Glaubenspartner ein erhörtes Gebet teilt.",
  },
  en: {
    loadFailed: "Could not load partner and group notification settings.",
    pushTitle: "Partner and group notifications",
    pushDescription: "Choose which Bible Reflection, prayer request, and answered-prayer updates you want to receive on your phone.",
    groupTitle: "Group notifications",
    groupDescription: "Receive Bible Reflection and prayer updates from groups you joined.",
    groupQtTitle: "Group Bible Reflections",
    groupQtDescription: "Get notified when a new Bible Reflection is shared in a group.",
    groupPrayerTitle: "Group prayer requests",
    groupPrayerDescription: "Get notified when a prayer request is shared in a group.",
    groupAnsweredPrayerTitle: "Group answered prayers",
    groupAnsweredPrayerDescription: "Get notified when an answered prayer is shared in a group.",
    partnerTitle: "Faith partner notifications",
    partnerDescription: "Receive Bible Reflection and prayer updates from your faith partners.",
    partnerQtTitle: "Partner Bible Reflections",
    partnerQtDescription: "Get notified when a faith partner shares a Bible Reflection.",
    partnerPrayerTitle: "Partner prayer requests",
    partnerPrayerDescription: "Get notified when a faith partner shares a prayer request.",
    partnerAnsweredPrayerTitle: "Partner answered prayers",
    partnerAnsweredPrayerDescription: "Get notified when a faith partner shares an answered prayer.",
  },
  fr: {
    loadFailed: "Impossible de charger les notifications de partenaires et de groupes.",
    pushTitle: "Notifications partenaires et groupes",
    pushDescription: "Choisissez les méditations, sujets de prière et prières exaucées à recevoir sur votre téléphone.",
    groupTitle: "Notifications de groupe",
    groupDescription: "Recevez les méditations et prières des groupes que vous avez rejoints.",
    groupQtTitle: "Méditations de groupe",
    groupQtDescription: "Recevez une notification lorsqu’une méditation est partagée dans un groupe.",
    groupPrayerTitle: "Sujets de prière de groupe",
    groupPrayerDescription: "Recevez une notification lorsqu’un sujet de prière est partagé dans un groupe.",
    groupAnsweredPrayerTitle: "Prières exaucées de groupe",
    groupAnsweredPrayerDescription: "Recevez une notification lorsqu’une prière exaucée est partagée dans un groupe.",
    partnerTitle: "Notifications de partenaires",
    partnerDescription: "Recevez les méditations et prières de vos partenaires de foi.",
    partnerQtTitle: "Méditations de partenaires",
    partnerQtDescription: "Recevez une notification lorsqu’un partenaire partage une méditation.",
    partnerPrayerTitle: "Sujets de prière de partenaires",
    partnerPrayerDescription: "Recevez une notification lorsqu’un partenaire partage un sujet de prière.",
    partnerAnsweredPrayerTitle: "Prières exaucées de partenaires",
    partnerAnsweredPrayerDescription: "Recevez une notification lorsqu’un partenaire partage une prière exaucée.",
  },
};

export function getNotificationSettingsText(lang: Lang): NotificationSettingsText {
  return NOTIFICATION_SETTINGS_TEXT[lang] ?? NOTIFICATION_SETTINGS_TEXT.ko;
}

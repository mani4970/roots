import type { Lang } from "@/lib/i18n";

type NotificationSettingsText = {
  remindersTitle: string;
  remindersDescription: string;
  morningReminderTitle: string;
  eveningReminderTitle: string;
  prayerReminderTitle: string;
  loadFailed: string;
  pushTitle: string;
  pushDescription: string;
  pushPermissionDenied: string;
  pushRegistrationFailed: string;
  save: string;
};

const NOTIFICATION_SETTINGS_TEXT: Record<Lang, NotificationSettingsText> = {
  ko: {
    remindersTitle: "묵상·기도 리마인드",
    remindersDescription: "정한 시간에 알림을 받아요.",
    morningReminderTitle: "아침 묵상",
    eveningReminderTitle: "저녁 묵상",
    prayerReminderTitle: "기도",
    loadFailed: "소식 알림 설정을 불러오지 못했어요. 다시 열어주세요.",
    pushTitle: "소식 알림",
    pushDescription: "그룹·동역자·댓글·선물 소식을 받아요.",
    pushPermissionDenied: "기기 설정에서 Roots 알림을 허용해주세요.",
    pushRegistrationFailed: "알림을 준비하지 못했어요. 잠시 후 다시 시도해주세요.",
    save: "저장",
  },
  de: {
    remindersTitle: "Stille Zeit & Gebet",
    remindersDescription: "Erinnerungen zu deinen Zeiten.",
    morningReminderTitle: "Am Morgen",
    eveningReminderTitle: "Am Abend",
    prayerReminderTitle: "Gebet",
    loadFailed: "Hinweise konnten nicht geladen werden. Öffne die Einstellungen erneut.",
    pushTitle: "Neuigkeiten",
    pushDescription: "Neuigkeiten zu Gruppen, Glaubenspartnern, Kommentaren und Geschenken.",
    pushPermissionDenied: "Erlaube Roots-Mitteilungen in den Geräteeinstellungen.",
    pushRegistrationFailed: "Hinweise sind gerade nicht verfügbar. Versuche es später erneut.",
    save: "Speichern",
  },
  en: {
    remindersTitle: "Bible Reflection & prayer",
    remindersDescription: "Reminders at your chosen times.",
    morningReminderTitle: "Morning",
    eveningReminderTitle: "Evening",
    prayerReminderTitle: "Prayer",
    loadFailed: "Could not load notification settings. Reopen settings to try again.",
    pushTitle: "Updates",
    pushDescription: "Updates from groups, faith partners, comments and gifts.",
    pushPermissionDenied: "Allow Roots notifications in your device settings.",
    pushRegistrationFailed: "Could not prepare notifications. Try again later.",
    save: "Save",
  },
  fr: {
    remindersTitle: "Méditation et prière",
    remindersDescription: "Des rappels aux heures choisies.",
    morningReminderTitle: "Le matin",
    eveningReminderTitle: "Le soir",
    prayerReminderTitle: "Prière",
    loadFailed: "Impossible de charger les notifications. Rouvrez les réglages.",
    pushTitle: "Actualités",
    pushDescription: "Nouvelles des groupes, partenaires, commentaires et cadeaux.",
    pushPermissionDenied: "Autorisez les notifications Roots dans les réglages de l’appareil.",
    pushRegistrationFailed: "Notifications indisponibles. Réessayez plus tard.",
    save: "Enregistrer",
  },
  es: {
    remindersTitle: "Meditación y oración",
    remindersDescription: "Recordatorios a las horas elegidas.",
    morningReminderTitle: "Por la mañana",
    eveningReminderTitle: "Por la noche",
    prayerReminderTitle: "Oración",
    loadFailed: "No se pudo cargar la configuración. Vuelve a abrir los ajustes.",
    pushTitle: "Novedades",
    pushDescription: "Novedades de grupos, compañeros de fe, comentarios y regalos.",
    pushPermissionDenied: "Permite las notificaciones de Roots en los ajustes del dispositivo.",
    pushRegistrationFailed: "No se pudieron preparar los avisos. Inténtalo más tarde.",
    save: "Guardar",
  },
};

export function getNotificationSettingsText(lang: Lang): NotificationSettingsText {
  return NOTIFICATION_SETTINGS_TEXT[lang] ?? NOTIFICATION_SETTINGS_TEXT.ko;
}

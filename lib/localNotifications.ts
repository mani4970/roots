"use client";

import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { Lang } from "@/lib/i18n";
import { storageGetJson, storageSet, storageSetJson } from "@/lib/clientStorage";

export type NotificationTarget = "home" | "reflection" | "prayer";

export type NotificationTime = {
  hour: number;
  minute: number;
};

export type RootsNotificationSettings = {
  enabled: boolean;
  morningEnabled: boolean;
  morningTime: NotificationTime;
  eveningEnabled: boolean;
  eveningTime: NotificationTime;
  prayerEnabled: boolean;
  prayerTime: NotificationTime;
};

export type NotificationApplyResult = {
  ok: boolean;
  permission: "granted" | "denied" | "prompt" | "unavailable";
};

const SETTINGS_KEY = "roots_local_notification_settings_v1";
const COMPLETED_DATES_KEY = "roots_local_notification_completed_reflections_v1";
const NOTIFICATION_IDS = {
  morning: 11001,
  prayer: 11003,
  eveningBase: 11200,
};
const EVENING_LOOKAHEAD_DAYS = 14;

export const DEFAULT_NOTIFICATION_SETTINGS: RootsNotificationSettings = {
  enabled: false,
  morningEnabled: true,
  morningTime: { hour: 8, minute: 0 },
  eveningEnabled: true,
  eveningTime: { hour: 20, minute: 30 },
  prayerEnabled: true,
  prayerTime: { hour: 21, minute: 30 },
};

function isValidTime(value: unknown): value is NotificationTime {
  if (!value || typeof value !== "object") return false;
  const time = value as NotificationTime;
  return Number.isInteger(time.hour) && Number.isInteger(time.minute) && time.hour >= 0 && time.hour <= 23 && time.minute >= 0 && time.minute <= 59;
}

function normalizeSettings(value: Partial<RootsNotificationSettings> | null | undefined): RootsNotificationSettings {
  return {
    enabled: Boolean(value?.enabled ?? DEFAULT_NOTIFICATION_SETTINGS.enabled),
    morningEnabled: Boolean(value?.morningEnabled ?? DEFAULT_NOTIFICATION_SETTINGS.morningEnabled),
    morningTime: isValidTime(value?.morningTime) ? value!.morningTime! : DEFAULT_NOTIFICATION_SETTINGS.morningTime,
    eveningEnabled: Boolean(value?.eveningEnabled ?? DEFAULT_NOTIFICATION_SETTINGS.eveningEnabled),
    eveningTime: isValidTime(value?.eveningTime) ? value!.eveningTime! : DEFAULT_NOTIFICATION_SETTINGS.eveningTime,
    prayerEnabled: Boolean(value?.prayerEnabled ?? DEFAULT_NOTIFICATION_SETTINGS.prayerEnabled),
    prayerTime: isValidTime(value?.prayerTime) ? value!.prayerTime! : DEFAULT_NOTIFICATION_SETTINGS.prayerTime,
  };
}

export function getNotificationSettings(): RootsNotificationSettings {
  return normalizeSettings(storageGetJson<Partial<RootsNotificationSettings> | null>(SETTINGS_KEY, null));
}

export function saveNotificationSettings(settings: RootsNotificationSettings) {
  storageSetJson(SETTINGS_KEY, normalizeSettings(settings));
}

export function isLocalNotificationsAvailable() {
  if (typeof window === "undefined") return false;
  try {
    if (!Capacitor.isNativePlatform()) return false;
    if (typeof Capacitor.isPluginAvailable === "function") {
      return Capacitor.isPluginAvailable("LocalNotifications");
    }
    return true;
  } catch {
    return false;
  }
}

function isNativeNotificationsAvailable() {
  return isLocalNotificationsAvailable();
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function timeToInputValue(time: NotificationTime) {
  return `${pad(time.hour)}:${pad(time.minute)}`;
}

export function inputValueToTime(value: string, fallback: NotificationTime): NotificationTime {
  const [hourRaw, minuteRaw] = value.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return fallback;
  return { hour, minute };
}

function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function nextDateForTime(time: NotificationTime, dayOffset = 0) {
  const now = new Date();
  const target = addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate(), time.hour, time.minute, 0, 0), dayOffset);
  if (dayOffset === 0 && target <= now) {
    target.setDate(target.getDate() + 1);
  }
  return target;
}

function dateForTimeOnDay(time: NotificationTime, dayOffset: number) {
  const now = new Date();
  return addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate(), time.hour, time.minute, 0, 0), dayOffset);
}

type LocalNotificationSchedule = NonNullable<
  Parameters<typeof LocalNotifications.schedule>[0]["notifications"][number]["schedule"]
>;

function scheduleAt(at: Date, repeats = false): LocalNotificationSchedule {
  const schedule: LocalNotificationSchedule = repeats ? { at, repeats: true } : { at };

  // Android can delay short local-notification tests while the device is idle or the screen is off.
  // Use allowWhileIdle for Roots' low-frequency reminders without requesting exact-alarm privileges.
  if (Capacitor.getPlatform() === "android") {
    schedule.allowWhileIdle = true;
  }

  return schedule;
}

async function rememberPendingNotificationDebugInfo(): Promise<void> {
  if (!isNativeNotificationsAvailable()) {
    return;
  }

  try {
    const pending = await LocalNotifications.getPending();
    storageSet("roots_notifications_pending_count", String(pending.notifications.length));
    storageSet(
      "roots_notifications_pending_ids",
      pending.notifications.map((notification) => String(notification.id)).join(",")
    );
  } catch (error) {
    console.warn("Roots notification pending inspection failed", error);
  }
}

function getCompletedReflectionDates() {
  const values = storageGetJson<string[]>(COMPLETED_DATES_KEY, []);
  return new Set(values.filter(value => /^\d{4}-\d{2}-\d{2}$/.test(value)).slice(-90));
}

function saveCompletedReflectionDates(dates: Set<string>) {
  storageSetJson(COMPLETED_DATES_KEY, Array.from(dates).sort().slice(-90));
}

function notificationText(lang: Lang) {
  const messages = {
    ko: {
      roots: "Roots",
      morning: "오늘도 말씀 묵상으로 하나님과 하루를 시작해봐요 🌱",
      eveningTitle: "말씀 앞에 머무는 시간",
      evening: "하루가 끝나기 전, 잠시 말씀 앞에 나아가볼까요?",
      prayerTitle: "기도할 시간이에요",
      prayer: "기도할 시간이에요! 하나님께 찾고 구해보세요 💛",
    },
    en: {
      roots: "Roots",
      morning: "Start today with God through Bible Reflection 🌱",
      eveningTitle: "A moment before the Word",
      evening: "Before the day ends, shall we come before the Word for a moment?",
      prayerTitle: "Time to pray",
      prayer: "It’s time to pray! Seek and ask God 💛",
    },
    de: {
      roots: "Roots",
      morning: "Beginne den Tag mit Gott durch Stille Zeit 🌱",
      eveningTitle: "Zeit vor Gottes Wort",
      evening: "Bevor der Tag endet, möchtest du kurz vor Gottes Wort kommen?",
      prayerTitle: "Zeit zum Beten",
      prayer: "Es ist Zeit zu beten! Suche Gott und bitte ihn 💛",
    },
    fr: {
      roots: "Roots",
      morning: "Commence ta journée avec Dieu par la méditation biblique 🌱",
      eveningTitle: "Un moment devant la Parole",
      evening: "Avant la fin de la journée, veux-tu venir un instant devant la Parole ?",
      prayerTitle: "C’est le moment de prier",
      prayer: "C’est le moment de prier ! Cherche Dieu et demande-lui 💛",
    },
  } as const;
  return messages[lang] ?? messages.ko;
}

async function cancelRootsNotifications() {
  if (!isNativeNotificationsAvailable()) return;
  const notifications = [
    { id: NOTIFICATION_IDS.morning },
    { id: NOTIFICATION_IDS.prayer },
    ...Array.from({ length: EVENING_LOOKAHEAD_DAYS }, (_unused, index) => ({ id: NOTIFICATION_IDS.eveningBase + index })),
  ];
  try {
    await LocalNotifications.cancel({ notifications });
  } catch {
    // Ignore cancellation failures; a fresh schedule will be attempted next.
  }
}

async function ensureNotificationPermission(): Promise<NotificationApplyResult> {
  if (!isNativeNotificationsAvailable()) return { ok: false, permission: "unavailable" };

  try {
    const current = await LocalNotifications.checkPermissions();
    if (current.display === "granted") return { ok: true, permission: "granted" };

    const requested = await LocalNotifications.requestPermissions();
    if (requested.display === "granted") return { ok: true, permission: "granted" };

    return { ok: false, permission: requested.display === "denied" ? "denied" : "prompt" };
  } catch (error) {
    console.warn("Roots notification permission unavailable", error);
    return { ok: false, permission: "unavailable" };
  }
}

export async function applyNotificationSettings(settings: RootsNotificationSettings, lang: Lang): Promise<NotificationApplyResult> {
  const normalized = normalizeSettings(settings);
  saveNotificationSettings(normalized);

  if (!isNativeNotificationsAvailable()) return { ok: false, permission: "unavailable" };

  await cancelRootsNotifications();
  if (!normalized.enabled) return { ok: true, permission: "granted" };

  const permission = await ensureNotificationPermission();
  if (!permission.ok) return permission;

  const text = notificationText(lang);
  const notifications: Parameters<typeof LocalNotifications.schedule>[0]["notifications"] = [];

  if (normalized.morningEnabled) {
    notifications.push({
      id: NOTIFICATION_IDS.morning,
      title: text.roots,
      body: text.morning,
      schedule: scheduleAt(nextDateForTime(normalized.morningTime), true),
      extra: { target: "reflection" satisfies NotificationTarget, kind: "morning_reflection" },
      autoCancel: true,
    });
  }

  if (normalized.prayerEnabled) {
    notifications.push({
      id: NOTIFICATION_IDS.prayer,
      title: text.prayerTitle,
      body: text.prayer,
      schedule: scheduleAt(nextDateForTime(normalized.prayerTime), true),
      extra: { target: "prayer" satisfies NotificationTarget, kind: "prayer" },
      autoCancel: true,
    });
  }

  if (normalized.eveningEnabled) {
    const completedDates = getCompletedReflectionDates();
    const now = new Date();
    for (let offset = 0; offset < EVENING_LOOKAHEAD_DAYS; offset += 1) {
      const at = dateForTimeOnDay(normalized.eveningTime, offset);
      if (at <= now) continue;
      const key = todayKey(at);
      if (completedDates.has(key)) continue;
      notifications.push({
        id: NOTIFICATION_IDS.eveningBase + offset,
        title: text.eveningTitle,
        body: text.evening,
        schedule: scheduleAt(at),
        extra: { target: "reflection" satisfies NotificationTarget, kind: "evening_reflection" },
        autoCancel: true,
      });
    }
  }

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
  }

  await rememberPendingNotificationDebugInfo();

  storageSet("roots_notifications_last_scheduled_at", new Date().toISOString());
  return { ok: true, permission: "granted" };
}

export async function refreshNotificationSchedule(lang: Lang) {
  const settings = getNotificationSettings();
  if (!settings.enabled) return;
  try {
    await applyNotificationSettings(settings, lang);
  } catch (error) {
    console.warn("Roots notification schedule refresh failed", error);
  }
}

export async function markBibleReflectionCompletedForNotifications(completedDate: string, lang: Lang) {
  const dates = getCompletedReflectionDates();
  dates.add(completedDate);
  saveCompletedReflectionDates(dates);
  await refreshNotificationSchedule(lang);
}

export async function setupNotificationTapRouting(navigate: (target: NotificationTarget) => void) {
  if (!isNativeNotificationsAvailable()) return () => {};

  try {
    const listener = await LocalNotifications.addListener("localNotificationActionPerformed", (event) => {
      const target = event.notification.extra?.target as NotificationTarget | undefined;
      if (target === "reflection" || target === "prayer" || target === "home") {
        navigate(target);
      }
    });

    return () => {
      void listener.remove();
    };
  } catch (error) {
    console.warn("Roots notification tap routing unavailable", error);
    return () => {};
  }
}

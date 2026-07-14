"use client";

import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { Lang } from "@/lib/i18n";
import { storageGetJson, storageSet, storageSetJson } from "@/lib/clientStorage";
import { createClient } from "@/lib/supabase";
import { getLocalDateString } from "@/lib/date";

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
  morningBase: 11000,
  prayerBase: 11100,
  eveningBase: 11200,
};
const NOTIFICATION_LOOKAHEAD_DAYS = 14;
const ROOTS_NOTIFICATION_CHANNEL_ID = "roots-daily-reminders";
const ROOTS_NOTIFICATION_SMALL_ICON = "ic_stat_roots_notification";
const ROOTS_NOTIFICATION_ICON_COLOR = "#6B8E5A";

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

async function getPendingRootsNotificationIds() {
  const pending = await LocalNotifications.getPending();
  return pending.notifications
    .filter(notification => notification.id >= NOTIFICATION_IDS.morningBase && notification.id < NOTIFICATION_IDS.eveningBase + 100)
    .map(notification => ({ id: notification.id }));
}

async function cancelRootsNotifications() {
  if (!isNativeNotificationsAvailable()) return;

  try {
    const pendingRoots = await getPendingRootsNotificationIds();
    if (pendingRoots.length > 0) {
      await LocalNotifications.cancel({ notifications: pendingRoots });
    }
    return;
  } catch (pendingError) {
    console.warn("Roots pending notification lookup failed; using id-range fallback", pendingError);
  }

  // Fallback for older native builds or a temporary getPending failure.
  const notifications = Array.from({ length: 300 }, (_unused, index) => ({ id: NOTIFICATION_IDS.morningBase + index }));
  try {
    await LocalNotifications.cancel({ notifications });
  } catch (cancelError) {
    console.warn("Roots notification cancellation failed", cancelError);
  }
}

async function cancelPendingEveningReflectionNotifications() {
  if (!isNativeNotificationsAvailable()) return;

  try {
    const pending = await LocalNotifications.getPending();
    const eveningNotifications = pending.notifications
      .filter(notification => {
        const kind = notification.extra?.kind;
        return kind === "evening_reflection" || (
          notification.id >= NOTIFICATION_IDS.eveningBase &&
          notification.id < NOTIFICATION_IDS.eveningBase + 100
        );
      })
      .map(notification => ({ id: notification.id }));

    if (eveningNotifications.length > 0) {
      await LocalNotifications.cancel({ notifications: eveningNotifications });
    }
  } catch (error) {
    console.warn("Roots evening reminder cancellation failed", error);
  }
}

async function ensureAndroidNotificationChannel(lang: Lang) {
  if (!isNativeNotificationsAvailable() || Capacitor.getPlatform() !== "android") return;

  const text = notificationText(lang);
  try {
    await LocalNotifications.createChannel({
      id: ROOTS_NOTIFICATION_CHANNEL_ID,
      name: text.roots,
      description: text.morning,
      importance: 4,
      visibility: 1,
      lights: true,
      lightColor: ROOTS_NOTIFICATION_ICON_COLOR,
      vibration: true,
    });
  } catch (error) {
    console.warn("Roots notification channel setup failed", error);
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

function exactScheduleAt(at: Date): Parameters<typeof LocalNotifications.schedule>[0]["notifications"][number]["schedule"] {
  // allowWhileIdle helps Android deliver scheduled reminders closer to the selected
  // time instead of delaying them heavily while the device is idle or optimizing battery.
  return { at, allowWhileIdle: true } as Parameters<typeof LocalNotifications.schedule>[0]["notifications"][number]["schedule"];
}

function rootsNotificationVisuals() {
  if (Capacitor.getPlatform() !== "android") return {};
  return {
    smallIcon: ROOTS_NOTIFICATION_SMALL_ICON,
    iconColor: ROOTS_NOTIFICATION_ICON_COLOR,
  } as Partial<Parameters<typeof LocalNotifications.schedule>[0]["notifications"][number]>;
}

export async function applyNotificationSettings(settings: RootsNotificationSettings, lang: Lang): Promise<NotificationApplyResult> {
  const normalized = normalizeSettings(settings);
  saveNotificationSettings(normalized);

  if (!isNativeNotificationsAvailable()) return { ok: false, permission: "unavailable" };

  await cancelRootsNotifications();
  if (!normalized.enabled) return { ok: true, permission: "granted" };

  const permission = await ensureNotificationPermission();
  if (!permission.ok) return permission;

  await ensureAndroidNotificationChannel(lang);

  const text = notificationText(lang);
  const notifications: Parameters<typeof LocalNotifications.schedule>[0]["notifications"] = [];
  const now = new Date();
  const completedDates = getCompletedReflectionDates();
  const androidChannel = Capacitor.getPlatform() === "android" ? ROOTS_NOTIFICATION_CHANNEL_ID : undefined;
  const androidVisuals = rootsNotificationVisuals();

  for (let offset = 0; offset < NOTIFICATION_LOOKAHEAD_DAYS; offset += 1) {
    if (normalized.morningEnabled) {
      const at = dateForTimeOnDay(normalized.morningTime, offset);
      if (at > now) {
        notifications.push({
          id: NOTIFICATION_IDS.morningBase + offset,
          title: text.roots,
          body: text.morning,
          schedule: exactScheduleAt(at),
          extra: { target: "reflection" satisfies NotificationTarget, kind: "morning_reflection" },
          autoCancel: true,
          channelId: androidChannel,
          ...androidVisuals,
        });
      }
    }

    if (normalized.prayerEnabled) {
      const at = dateForTimeOnDay(normalized.prayerTime, offset);
      if (at > now) {
        notifications.push({
          id: NOTIFICATION_IDS.prayerBase + offset,
          title: text.prayerTitle,
          body: text.prayer,
          schedule: exactScheduleAt(at),
          extra: { target: "prayer" satisfies NotificationTarget, kind: "prayer" },
          autoCancel: true,
          channelId: androidChannel,
          ...androidVisuals,
        });
      }
    }

    if (normalized.eveningEnabled) {
      const at = dateForTimeOnDay(normalized.eveningTime, offset);
      if (at > now) {
        const key = todayKey(at);
        if (!completedDates.has(key)) {
          notifications.push({
            id: NOTIFICATION_IDS.eveningBase + offset,
            title: text.eveningTitle,
            body: text.evening,
            schedule: exactScheduleAt(at),
            extra: { target: "reflection" satisfies NotificationTarget, kind: "evening_reflection" },
            autoCancel: true,
            channelId: androidChannel,
            ...androidVisuals,
          });
        }
      }
    }
  }

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
  }

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

  // Cancel all pending evening reminders first. The fresh schedule below will
  // recreate future dates while excluding the completed date.
  await cancelPendingEveningReflectionNotifications();
  await refreshNotificationSchedule(lang);
}

/**
 * Reconciles today's local reminder state with the server source of truth.
 * This covers app relaunch/resume and a reflection completed on another device.
 * A local notification cannot know about another device until this device opens
 * or resumes, so this sync runs whenever the native app becomes active.
 */
export async function syncTodayBibleReflectionCompletionForNotifications(lang: Lang) {
  const settings = getNotificationSettings();
  if (!settings.enabled || !isNativeNotificationsAvailable()) return;

  const today = getLocalDateString();
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data, error } = await supabase
        .from("qt_records")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", today)
        .eq("is_draft", false)
        .limit(1);

      if (error) throw error;
      if ((data ?? []).length > 0) {
        const dates = getCompletedReflectionDates();
        if (!dates.has(today)) {
          dates.add(today);
          saveCompletedReflectionDates(dates);
        }
        await cancelPendingEveningReflectionNotifications();
      }
    }
  } catch (error) {
    // Scheduling should remain available even if the reconciliation query fails.
    console.warn("Roots reflection reminder reconciliation failed", error);
  }

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

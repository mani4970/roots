"use client";

import { createClient } from "@/lib/supabase";

export type RootsPushNotificationPreferences = {
  pushEnabled: boolean;
  groupNotificationsEnabled: boolean;
  partnerNotificationsEnabled: boolean;
  groupQtEnabled: boolean;
  groupPrayerEnabled: boolean;
  groupAnsweredPrayerEnabled: boolean;
  partnerQtEnabled: boolean;
  partnerPrayerEnabled: boolean;
  partnerAnsweredPrayerEnabled: boolean;
};

type NotificationPreferenceRow = {
  push_enabled: boolean | null;
  group_notifications_enabled: boolean | null;
  partner_notifications_enabled: boolean | null;
  group_qt_enabled: boolean | null;
  group_prayer_enabled: boolean | null;
  group_answered_prayer_enabled: boolean | null;
  partner_qt_enabled: boolean | null;
  partner_prayer_enabled: boolean | null;
  partner_answered_prayer_enabled: boolean | null;
};

export const DEFAULT_PUSH_NOTIFICATION_PREFERENCES: RootsPushNotificationPreferences = {
  pushEnabled: true,
  groupNotificationsEnabled: true,
  partnerNotificationsEnabled: true,
  groupQtEnabled: true,
  groupPrayerEnabled: true,
  groupAnsweredPrayerEnabled: true,
  partnerQtEnabled: true,
  partnerPrayerEnabled: true,
  partnerAnsweredPrayerEnabled: true,
};

function rowToPreferences(row: NotificationPreferenceRow | null | undefined): RootsPushNotificationPreferences {
  if (!row) return DEFAULT_PUSH_NOTIFICATION_PREFERENCES;
  return {
    pushEnabled: row.push_enabled ?? DEFAULT_PUSH_NOTIFICATION_PREFERENCES.pushEnabled,
    groupNotificationsEnabled: row.group_notifications_enabled ?? DEFAULT_PUSH_NOTIFICATION_PREFERENCES.groupNotificationsEnabled,
    partnerNotificationsEnabled: row.partner_notifications_enabled ?? DEFAULT_PUSH_NOTIFICATION_PREFERENCES.partnerNotificationsEnabled,
    groupQtEnabled: row.group_qt_enabled ?? DEFAULT_PUSH_NOTIFICATION_PREFERENCES.groupQtEnabled,
    groupPrayerEnabled: row.group_prayer_enabled ?? DEFAULT_PUSH_NOTIFICATION_PREFERENCES.groupPrayerEnabled,
    groupAnsweredPrayerEnabled: row.group_answered_prayer_enabled ?? DEFAULT_PUSH_NOTIFICATION_PREFERENCES.groupAnsweredPrayerEnabled,
    partnerQtEnabled: row.partner_qt_enabled ?? DEFAULT_PUSH_NOTIFICATION_PREFERENCES.partnerQtEnabled,
    partnerPrayerEnabled: row.partner_prayer_enabled ?? DEFAULT_PUSH_NOTIFICATION_PREFERENCES.partnerPrayerEnabled,
    partnerAnsweredPrayerEnabled: row.partner_answered_prayer_enabled ?? DEFAULT_PUSH_NOTIFICATION_PREFERENCES.partnerAnsweredPrayerEnabled,
  };
}

function preferencesToRow(userId: string, preferences: RootsPushNotificationPreferences) {
  return {
    user_id: userId,
    push_enabled: preferences.pushEnabled,
    group_notifications_enabled: preferences.groupNotificationsEnabled,
    partner_notifications_enabled: preferences.partnerNotificationsEnabled,
    group_qt_enabled: preferences.groupQtEnabled,
    group_prayer_enabled: preferences.groupPrayerEnabled,
    group_answered_prayer_enabled: preferences.groupAnsweredPrayerEnabled,
    partner_qt_enabled: preferences.partnerQtEnabled,
    partner_prayer_enabled: preferences.partnerPrayerEnabled,
    partner_answered_prayer_enabled: preferences.partnerAnsweredPrayerEnabled,
    updated_at: new Date().toISOString(),
  };
}

export async function loadPushNotificationPreferences(): Promise<RootsPushNotificationPreferences> {
  const supabase = createClient();
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = userResult.user?.id;
  if (!userId) return DEFAULT_PUSH_NOTIFICATION_PREFERENCES;

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("push_enabled, group_notifications_enabled, partner_notifications_enabled, group_qt_enabled, group_prayer_enabled, group_answered_prayer_enabled, partner_qt_enabled, partner_prayer_enabled, partner_answered_prayer_enabled")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return rowToPreferences(data as NotificationPreferenceRow | null);
}

export async function savePushNotificationPreferences(preferences: RootsPushNotificationPreferences) {
  const supabase = createClient();
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = userResult.user?.id;
  if (!userId) throw new Error("Missing authenticated user for notification preferences.");

  const { error } = await supabase
    .from("notification_preferences")
    .upsert(preferencesToRow(userId, preferences), { onConflict: "user_id" });

  if (error) throw error;
}

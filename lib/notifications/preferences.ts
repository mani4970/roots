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
  commentNotificationsEnabled: boolean;
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
  comment_notifications_enabled: boolean | null;
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
  commentNotificationsEnabled: true,
};

/** One news switch controls every news category, including gift arrivals. */
export function normalizeNewsNotificationPreferences(preferences: RootsPushNotificationPreferences): RootsPushNotificationPreferences {
  const enabled = preferences.pushEnabled;
  return {
    pushEnabled: enabled,
    groupNotificationsEnabled: enabled,
    partnerNotificationsEnabled: enabled,
    groupQtEnabled: enabled,
    groupPrayerEnabled: enabled,
    groupAnsweredPrayerEnabled: enabled,
    partnerQtEnabled: enabled,
    partnerPrayerEnabled: enabled,
    partnerAnsweredPrayerEnabled: enabled,
    commentNotificationsEnabled: enabled,
  };
}

function rowToPreferences(row: NotificationPreferenceRow | null | undefined): RootsPushNotificationPreferences {
  if (!row) return DEFAULT_PUSH_NOTIFICATION_PREFERENCES;
  // Match SQL 182 before and during rollout: a previous explicit OFF must not
  // become ON merely because individual switches have been combined.
  const enabled = Object.values(row).every(value => value !== false);
  return normalizeNewsNotificationPreferences({ ...DEFAULT_PUSH_NOTIFICATION_PREFERENCES, pushEnabled: enabled });
}

function preferencesToRow(userId: string, preferences: RootsPushNotificationPreferences) {
  const normalized = normalizeNewsNotificationPreferences(preferences);
  return {
    user_id: userId,
    push_enabled: normalized.pushEnabled,
    group_notifications_enabled: normalized.groupNotificationsEnabled,
    partner_notifications_enabled: normalized.partnerNotificationsEnabled,
    group_qt_enabled: normalized.groupQtEnabled,
    group_prayer_enabled: normalized.groupPrayerEnabled,
    group_answered_prayer_enabled: normalized.groupAnsweredPrayerEnabled,
    partner_qt_enabled: normalized.partnerQtEnabled,
    partner_prayer_enabled: normalized.partnerPrayerEnabled,
    partner_answered_prayer_enabled: normalized.partnerAnsweredPrayerEnabled,
    comment_notifications_enabled: normalized.commentNotificationsEnabled,
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
    .select("push_enabled, group_notifications_enabled, partner_notifications_enabled, group_qt_enabled, group_prayer_enabled, group_answered_prayer_enabled, partner_qt_enabled, partner_prayer_enabled, partner_answered_prayer_enabled, comment_notifications_enabled")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return rowToPreferences(data as NotificationPreferenceRow | null);
}

export async function ensureDefaultPushNotificationPreferences(): Promise<RootsPushNotificationPreferences | null> {
  const supabase = createClient();
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = userResult.user?.id;
  if (!userId) return null;

  const { data: existing, error: selectError } = await supabase
    .from("notification_preferences")
    .select("push_enabled, group_notifications_enabled, partner_notifications_enabled, group_qt_enabled, group_prayer_enabled, group_answered_prayer_enabled, partner_qt_enabled, partner_prayer_enabled, partner_answered_prayer_enabled, comment_notifications_enabled")
    .eq("user_id", userId)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return rowToPreferences(existing as NotificationPreferenceRow);

  const { data: inserted, error: insertError } = await supabase
    .from("notification_preferences")
    .insert(preferencesToRow(userId, DEFAULT_PUSH_NOTIFICATION_PREFERENCES))
    .select("push_enabled, group_notifications_enabled, partner_notifications_enabled, group_qt_enabled, group_prayer_enabled, group_answered_prayer_enabled, partner_qt_enabled, partner_prayer_enabled, partner_answered_prayer_enabled, comment_notifications_enabled")
    .single();

  if (!insertError) return rowToPreferences(inserted as NotificationPreferenceRow);

  // Another app session may have created the row between the SELECT and INSERT.
  // Reload it instead of overwriting a choice the user made in that session.
  if (insertError.code === "23505") {
    const { data: current, error: reloadError } = await supabase
      .from("notification_preferences")
      .select("push_enabled, group_notifications_enabled, partner_notifications_enabled, group_qt_enabled, group_prayer_enabled, group_answered_prayer_enabled, partner_qt_enabled, partner_prayer_enabled, partner_answered_prayer_enabled, comment_notifications_enabled")
      .eq("user_id", userId)
      .single();

    if (reloadError) throw reloadError;
    return rowToPreferences(current as NotificationPreferenceRow);
  }

  throw insertError;
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

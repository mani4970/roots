"use client";

import type { NotificationEventType } from "@/lib/notifications/templates";

export type CreateShareNotificationsPayload = {
  type: NotificationEventType;
  qtRecordId?: string | null;
  prayerItemId?: string | null;
  groupIds?: string[];
  partnerRecipientIds?: string[];
};

export type CreateShareNotificationsResult = {
  ok: boolean;
  inserted?: number;
  skipped?: number;
  error?: string;
};

export async function createShareNotifications(payload: CreateShareNotificationsPayload): Promise<CreateShareNotificationsResult> {
  try {
    const response = await fetch("/api/notifications/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, error: typeof data?.error === "string" ? data.error : "Notification creation failed" };
    }

    return {
      ok: true,
      inserted: typeof data?.inserted === "number" ? data.inserted : 0,
      skipped: typeof data?.skipped === "number" ? data.skipped : 0,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Notification creation failed" };
  }
}

export async function createShareNotificationsBestEffort(payload: CreateShareNotificationsPayload) {
  const result = await createShareNotifications(payload);
  if (!result.ok) {
    console.warn("Roots notification creation skipped", result.error);
  }
  return result;
}

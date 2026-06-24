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
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch("/api/notifications/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
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
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function createShareNotificationsBestEffort(payload: CreateShareNotificationsPayload) {
  const result = await createShareNotifications(payload);
  if (!result.ok) {
    console.warn("Roots notification creation skipped", result.error);
  }
  return result;
}

function groupIdsFromVisibility(visibility?: string | null) {
  return Array.from(new Set((visibility ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.startsWith("group_"))
    .map((part) => part.replace(/^group_/, ""))
    .filter(Boolean)));
}

function uniqueIds(ids?: string[] | null) {
  return Array.from(new Set((ids ?? []).filter(Boolean)));
}

export async function createBibleReflectionShareNotificationsBestEffort({
  qtRecordId,
  visibility,
  partnerRecipientIds,
}: {
  qtRecordId: string;
  visibility?: string | null;
  partnerRecipientIds?: string[] | null;
}) {
  const groupIds = groupIdsFromVisibility(visibility);
  const partners = uniqueIds(partnerRecipientIds);

  const tasks: Promise<CreateShareNotificationsResult>[] = [];
  if (groupIds.length > 0) {
    tasks.push(createShareNotificationsBestEffort({
      type: "group_qt_shared",
      qtRecordId,
      groupIds,
    }));
  }
  if (partners.length > 0) {
    tasks.push(createShareNotificationsBestEffort({
      type: "partner_qt_shared",
      qtRecordId,
      partnerRecipientIds: partners,
    }));
  }
  return Promise.all(tasks);
}

export async function createPrayerShareNotificationsBestEffort({
  prayerItemId,
  visibility,
  partnerRecipientIds,
}: {
  prayerItemId: string;
  visibility?: string | null;
  partnerRecipientIds?: string[] | null;
}) {
  const groupIds = groupIdsFromVisibility(visibility);
  const partners = uniqueIds(partnerRecipientIds);

  const tasks: Promise<CreateShareNotificationsResult>[] = [];
  if (groupIds.length > 0) {
    tasks.push(createShareNotificationsBestEffort({
      type: "group_prayer_shared",
      prayerItemId,
      groupIds,
    }));
  }
  if (partners.length > 0) {
    tasks.push(createShareNotificationsBestEffort({
      type: "partner_prayer_shared",
      prayerItemId,
      partnerRecipientIds: partners,
    }));
  }
  return Promise.all(tasks);
}

export async function createAnsweredPrayerNotificationsBestEffort({
  prayerItemId,
  visibility,
  partnerRecipientIds,
}: {
  prayerItemId: string;
  visibility?: string | null;
  partnerRecipientIds?: string[] | null;
}) {
  const groupIds = groupIdsFromVisibility(visibility);
  const partners = uniqueIds(partnerRecipientIds);

  const tasks: Promise<CreateShareNotificationsResult>[] = [];
  if (groupIds.length > 0) {
    tasks.push(createShareNotificationsBestEffort({
      type: "group_prayer_answered",
      prayerItemId,
      groupIds,
    }));
  }
  if (partners.length > 0) {
    tasks.push(createShareNotificationsBestEffort({
      type: "partner_prayer_answered",
      prayerItemId,
      partnerRecipientIds: partners,
    }));
  }
  return Promise.all(tasks);
}

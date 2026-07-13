import type { NotificationEventType } from "@/lib/notifications/templates";

export type CommunityNotificationScope = "group" | "partner";
export type CommunityNotificationSection = "qt" | "praying" | "answered";
export type CommunityNotificationContentKind = "qt" | "prayer";

export type CommunityNotificationDirectTarget = {
  scope: CommunityNotificationScope;
  scopeTargetId: string;
  section: CommunityNotificationSection;
  contentKind: CommunityNotificationContentKind;
  contentId: string;
};

type SearchParamsReader = {
  get(name: string): string | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string | null): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function notificationSectionForEventType(
  type: NotificationEventType,
): CommunityNotificationSection {
  if (type.endsWith("prayer_answered")) return "answered";
  if (type.endsWith("prayer_shared")) return "praying";
  return "qt";
}

export function buildCommunityNotificationDeepLink({
  type,
  scope,
  scopeTargetId,
  contentId,
}: {
  type: NotificationEventType;
  scope: CommunityNotificationScope;
  scopeTargetId: string;
  contentId: string;
}) {
  const section = notificationSectionForEventType(type);
  const params = new URLSearchParams({ tab: scope, section });

  if (scope === "group") params.set("groupId", scopeTargetId);
  else params.set("partnerId", scopeTargetId);

  if (section === "qt") params.set("qtRecordId", contentId);
  else params.set("prayerItemId", contentId);

  return `/community?${params.toString()}`;
}

export function parseCommunityNotificationDirectTarget(
  params: SearchParamsReader,
): CommunityNotificationDirectTarget | null {
  const scope = params.get("tab");
  if (scope !== "group" && scope !== "partner") return null;

  const sectionValue = params.get("section");
  const section: CommunityNotificationSection =
    sectionValue === "praying" || sectionValue === "answered"
      ? sectionValue
      : "qt";

  const scopeTargetId =
    scope === "group" ? params.get("groupId") : params.get("partnerId");
  if (!isUuid(scopeTargetId)) return null;

  const qtRecordId = params.get("qtRecordId");
  if (section === "qt" && isUuid(qtRecordId)) {
    return {
      scope,
      scopeTargetId,
      section,
      contentKind: "qt",
      contentId: qtRecordId,
    };
  }

  const prayerItemId = params.get("prayerItemId");
  if (section !== "qt" && isUuid(prayerItemId)) {
    return {
      scope,
      scopeTargetId,
      section,
      contentKind: "prayer",
      contentId: prayerItemId,
    };
  }

  return null;
}

export function communityNotificationTargetSignature(
  target: CommunityNotificationDirectTarget,
) {
  return [
    target.scope,
    target.scopeTargetId,
    target.section,
    target.contentKind,
    target.contentId,
  ].join(":");
}

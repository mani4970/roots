import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import type { Lang } from "@/lib/i18n";
import {
  getNotificationTemplate,
  NOTIFICATION_EVENT_TYPES,
  type NotificationEventType,
} from "@/lib/notifications/templates";

export const dynamic = "force-dynamic";

type NotificationScope = "group" | "partner";

type CreateNotificationPayload = {
  type?: string;
  qtRecordId?: string | null;
  prayerItemId?: string | null;
  groupIds?: string[];
  partnerRecipientIds?: string[];
};

type NotificationPreferenceRow = {
  user_id: string;
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

type ProfileRow = {
  id: string;
  name: string | null;
  preferred_language: string | null;
};

type GroupRow = {
  id: string;
  name: string | null;
};

type NotificationInsertRow = {
  recipient_id: string;
  actor_id: string;
  type: NotificationEventType;
  scope: NotificationScope;
  group_id: string | null;
  companion_user_id: string | null;
  qt_record_id: string | null;
  prayer_item_id: string | null;
  locale: Lang;
  title: string;
  body: string;
  deep_link: string;
  push_status: "pending";
};

const VALID_EVENT_TYPES = new Set<string>(NOTIFICATION_EVENT_TYPES);
const VALID_LANGS = new Set<string>(["ko", "de", "en", "fr"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_TARGETS = 80;

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

function normalizeUuidList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((item): item is string => typeof item === "string" && UUID_PATTERN.test(item)))).slice(0, MAX_TARGETS);
}

function normalizeUuid(value: unknown) {
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : null;
}

function normalizeLang(value: unknown): Lang {
  return typeof value === "string" && VALID_LANGS.has(value) ? (value as Lang) : "ko";
}

function isNotificationEventType(value: unknown): value is NotificationEventType {
  return typeof value === "string" && VALID_EVENT_TYPES.has(value);
}

function isGroupType(type: NotificationEventType) {
  return type.startsWith("group_");
}

function isPartnerType(type: NotificationEventType) {
  return type.startsWith("partner_");
}

function isQtType(type: NotificationEventType) {
  return type.endsWith("qt_shared");
}

function isPrayerType(type: NotificationEventType) {
  return type.includes("prayer");
}

function isAnsweredPrayerType(type: NotificationEventType) {
  return type.endsWith("prayer_answered");
}

function visibilityIncludesGroup(visibility: string | null | undefined, groupId: string) {
  if (!visibility) return false;
  return visibility.split(",").map((part) => part.trim()).includes(`group_${groupId}`);
}

function preferencesAllowNotification(row: NotificationPreferenceRow | null, type: NotificationEventType) {
  const pushEnabled = row?.push_enabled ?? true;
  if (!pushEnabled) return false;

  if (isGroupType(type)) {
    if ((row?.group_notifications_enabled ?? true) === false) return false;
    if (type === "group_qt_shared") return row?.group_qt_enabled ?? true;
    if (type === "group_prayer_shared") return row?.group_prayer_enabled ?? true;
    if (type === "group_prayer_answered") return row?.group_answered_prayer_enabled ?? true;
  }

  if (isPartnerType(type)) {
    if ((row?.partner_notifications_enabled ?? true) === false) return false;
    if (type === "partner_qt_shared") return row?.partner_qt_enabled ?? true;
    if (type === "partner_prayer_shared") return row?.partner_prayer_enabled ?? true;
    if (type === "partner_prayer_answered") return row?.partner_answered_prayer_enabled ?? true;
  }

  return false;
}

function duplicateKey(recipientId: string, scopeTargetId: string) {
  return `${recipientId}:${scopeTargetId}`;
}

function deepLinkFor(scope: NotificationScope) {
  return scope === "group" ? "/community?tab=group" : "/community?tab=partner";
}

async function createServerSupabaseClient() {
  const cookieStore = cookies();
  return createServerClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );
}

function createAdminClient() {
  return createSupabaseAdminClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SECRET_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

async function loadProfiles(admin: ReturnType<typeof createAdminClient>, ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return new Map<string, ProfileRow>();

  const { data, error } = await admin
    .from("profiles")
    .select("id, name, preferred_language")
    .in("id", uniqueIds);

  if (error) throw error;
  return new Map((data ?? []).map((row: any) => [String(row.id), row as ProfileRow]));
}

async function loadPreferences(admin: ReturnType<typeof createAdminClient>, recipientIds: string[]) {
  if (recipientIds.length === 0) return new Map<string, NotificationPreferenceRow>();

  const { data, error } = await admin
    .from("notification_preferences")
    .select("user_id, push_enabled, group_notifications_enabled, partner_notifications_enabled, group_qt_enabled, group_prayer_enabled, group_answered_prayer_enabled, partner_qt_enabled, partner_prayer_enabled, partner_answered_prayer_enabled")
    .in("user_id", recipientIds);

  if (error) throw error;
  return new Map((data ?? []).map((row: any) => [String(row.user_id), row as NotificationPreferenceRow]));
}

async function loadExistingNotificationKeys(
  admin: ReturnType<typeof createAdminClient>,
  type: NotificationEventType,
  contentColumn: "qt_record_id" | "prayer_item_id",
  contentId: string,
  scope: NotificationScope
) {
  const { data, error } = await admin
    .from("notifications")
    .select("recipient_id, group_id, companion_user_id")
    .eq("type", type)
    .eq(contentColumn, contentId)
    .eq("scope", scope);

  if (error) throw error;

  return new Set(
    (data ?? []).map((row: any) => duplicateKey(
      String(row.recipient_id),
      scope === "group" ? String(row.group_id) : String(row.companion_user_id)
    ))
  );
}

export async function POST(request: NextRequest) {
  let payload: CreateNotificationPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isNotificationEventType(payload.type)) {
    return NextResponse.json({ error: "Invalid notification type" }, { status: 400 });
  }

  const eventType = payload.type;
  const qtRecordId = normalizeUuid(payload.qtRecordId);
  const prayerItemId = normalizeUuid(payload.prayerItemId);
  const groupIds = normalizeUuidList(payload.groupIds);
  const partnerRecipientIds = normalizeUuidList(payload.partnerRecipientIds);

  if (isQtType(eventType) && !qtRecordId) {
    return NextResponse.json({ error: "Missing qtRecordId" }, { status: 400 });
  }
  if (isPrayerType(eventType) && !prayerItemId) {
    return NextResponse.json({ error: "Missing prayerItemId" }, { status: 400 });
  }
  if (isGroupType(eventType) && groupIds.length === 0) {
    return NextResponse.json({ error: "Missing groupIds" }, { status: 400 });
  }
  if (isPartnerType(eventType) && partnerRecipientIds.length === 0) {
    return NextResponse.json({ error: "Missing partnerRecipientIds" }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = createAdminClient();
    const actorId = user.id;
    const contentColumn = isQtType(eventType) ? "qt_record_id" : "prayer_item_id";
    const contentId = isQtType(eventType) ? qtRecordId! : prayerItemId!;

    let visibility: string | null = null;

    if (isQtType(eventType)) {
      const { data: record, error } = await admin
        .from("qt_records")
        .select("id, user_id, visibility")
        .eq("id", contentId)
        .maybeSingle();
      if (error) throw error;
      if (!record || record.user_id !== actorId) {
        return NextResponse.json({ error: "Bible Reflection not found" }, { status: 404 });
      }
      visibility = record.visibility ?? null;
    } else {
      const { data: prayer, error } = await admin
        .from("prayer_items")
        .select("id, user_id, visibility, is_answered")
        .eq("id", contentId)
        .maybeSingle();
      if (error) throw error;
      if (!prayer || prayer.user_id !== actorId) {
        return NextResponse.json({ error: "Prayer item not found" }, { status: 404 });
      }
      if (isAnsweredPrayerType(eventType) && prayer.is_answered !== true) {
        return NextResponse.json({ error: "Prayer item is not answered" }, { status: 400 });
      }
      visibility = prayer.visibility ?? null;
    }

    const actorProfiles = await loadProfiles(admin, [actorId]);
    const actorProfile = actorProfiles.get(actorId);
    const actorName = actorProfile?.name?.trim() || "Roots";
    const existingKeys = await loadExistingNotificationKeys(admin, eventType, contentColumn, contentId, isGroupType(eventType) ? "group" : "partner");

    const rows: NotificationInsertRow[] = [];
    let skipped = 0;

    if (isGroupType(eventType)) {
      const { data: groupRows, error: groupError } = await admin
        .from("groups")
        .select("id, name")
        .in("id", groupIds);
      if (groupError) throw groupError;

      const groups = new Map((groupRows ?? []).map((row: any) => [String(row.id), row as GroupRow]));
      const validGroupIds = Array.from(groups.keys()).filter((groupId) => visibilityIncludesGroup(visibility, groupId));

      if (validGroupIds.length > 0) {
        const { data: actorMemberships, error: actorMembershipError } = await admin
          .from("group_members")
          .select("group_id")
          .eq("user_id", actorId)
          .in("group_id", validGroupIds);
        if (actorMembershipError) throw actorMembershipError;

        const actorGroupIds = new Set((actorMemberships ?? []).map((row: any) => String(row.group_id)));
        const allowedGroupIds = validGroupIds.filter((groupId) => actorGroupIds.has(groupId));

        if (allowedGroupIds.length > 0) {
          const { data: memberRows, error: memberError } = await admin
            .from("group_members")
            .select("group_id, user_id")
            .in("group_id", allowedGroupIds);
          if (memberError) throw memberError;

          const recipientIds = Array.from(new Set((memberRows ?? [])
            .map((row: any) => String(row.user_id))
            .filter((recipientId) => recipientId && recipientId !== actorId)
          ));
          const [recipientProfiles, preferences] = await Promise.all([
            loadProfiles(admin, recipientIds),
            loadPreferences(admin, recipientIds),
          ]);

          for (const member of memberRows ?? []) {
            const groupId = String((member as any).group_id);
            const recipientId = String((member as any).user_id);
            if (recipientId === actorId || !allowedGroupIds.includes(groupId)) {
              skipped += 1;
              continue;
            }
            if (!preferencesAllowNotification(preferences.get(recipientId) ?? null, eventType)) {
              skipped += 1;
              continue;
            }
            if (existingKeys.has(duplicateKey(recipientId, groupId))) {
              skipped += 1;
              continue;
            }

            const profile = recipientProfiles.get(recipientId);
            const locale = normalizeLang(profile?.preferred_language);
            const groupName = groups.get(groupId)?.name?.trim() || "Roots";
            const template = getNotificationTemplate(eventType, locale, { groupName });

            rows.push({
              recipient_id: recipientId,
              actor_id: actorId,
              type: eventType,
              scope: "group",
              group_id: groupId,
              companion_user_id: null,
              qt_record_id: isQtType(eventType) ? contentId : null,
              prayer_item_id: isPrayerType(eventType) ? contentId : null,
              locale,
              title: template.title,
              body: template.body,
              deep_link: deepLinkFor("group"),
              push_status: "pending",
            });
          }
        }
      }
    } else {
      const recipientIds = partnerRecipientIds.filter((recipientId) => recipientId !== actorId);
      const recipientTable = isQtType(eventType) ? "qt_record_recipients" : "prayer_item_recipients";
      const recipientContentColumn = isQtType(eventType) ? "qt_record_id" : "prayer_item_id";

      if (recipientIds.length > 0) {
        const { data: recipientRows, error: recipientError } = await admin
          .from(recipientTable)
          .select("recipient_id")
          .eq(recipientContentColumn, contentId)
          .eq("owner_id", actorId)
          .in("recipient_id", recipientIds);
        if (recipientError) throw recipientError;

        const contentRecipientIds = Array.from(new Set((recipientRows ?? []).map((row: any) => String(row.recipient_id))));

        if (contentRecipientIds.length > 0) {
          const { data: companionRows, error: companionError } = await admin
            .from("companions")
            .select("requester_id, receiver_id")
            .eq("status", "accepted")
            .or(`and(requester_id.eq.${actorId},receiver_id.in.(${contentRecipientIds.join(",")})),and(receiver_id.eq.${actorId},requester_id.in.(${contentRecipientIds.join(",")}))`);
          if (companionError) throw companionError;

          const companionRecipientIds = new Set((companionRows ?? []).map((row: any) => {
            const requesterId = String(row.requester_id);
            const receiverId = String(row.receiver_id);
            return requesterId === actorId ? receiverId : requesterId;
          }));
          const allowedRecipientIds = contentRecipientIds.filter((recipientId) => companionRecipientIds.has(recipientId));
          const [recipientProfiles, preferences] = await Promise.all([
            loadProfiles(admin, allowedRecipientIds),
            loadPreferences(admin, allowedRecipientIds),
          ]);

          for (const recipientId of allowedRecipientIds) {
            if (!preferencesAllowNotification(preferences.get(recipientId) ?? null, eventType)) {
              skipped += 1;
              continue;
            }
            if (existingKeys.has(duplicateKey(recipientId, actorId))) {
              skipped += 1;
              continue;
            }

            const profile = recipientProfiles.get(recipientId);
            const locale = normalizeLang(profile?.preferred_language);
            const template = getNotificationTemplate(eventType, locale, { name: actorName });

            rows.push({
              recipient_id: recipientId,
              actor_id: actorId,
              type: eventType,
              scope: "partner",
              group_id: null,
              companion_user_id: actorId,
              qt_record_id: isQtType(eventType) ? contentId : null,
              prayer_item_id: isPrayerType(eventType) ? contentId : null,
              locale,
              title: template.title,
              body: template.body,
              deep_link: deepLinkFor("partner"),
              push_status: "pending",
            });
          }
        }
      }
    }

    if (rows.length > 0) {
      const { error: insertError } = await admin.from("notifications").insert(rows);
      if (insertError) throw insertError;
    }

    return NextResponse.json({ ok: true, inserted: rows.length, skipped });
  } catch (error) {
    console.error("Roots notification creation failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Notification creation failed" },
      { status: 500 }
    );
  }
}

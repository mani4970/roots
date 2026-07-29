import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { after, NextRequest, NextResponse } from "next/server";
import type { Lang } from "@/lib/i18n";
import { dispatchNotificationsByIds } from "@/lib/notifications/serverPush";
import { getReflectionNudgeNotificationTemplate } from "@/lib/notifications/reflectionNudgeTemplates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ReflectionNudgeScope = "group" | "partner";

type ReflectionNudgePayload = {
  scope?: string;
  targetId?: string;
  localDate?: string;
};

type NotificationPreferenceRow = {
  user_id: string;
  push_enabled: boolean | null;
  group_notifications_enabled: boolean | null;
  partner_notifications_enabled: boolean | null;
};

type ProfileRow = {
  id: string;
  name: string | null;
  preferred_language: string | null;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const VALID_LANGS = new Set<string>(["ko", "de", "en", "fr"]);
const QUERY_CHUNK_SIZE = 100;
const PUSH_DISPATCH_CHUNK_SIZE = 80;

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

function normalizeScope(value: unknown): ReflectionNudgeScope | null {
  return value === "group" || value === "partner" ? value : null;
}

function normalizeUuid(value: unknown) {
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : null;
}

function normalizeLang(value: unknown): Lang {
  return typeof value === "string" && VALID_LANGS.has(value)
    ? (value as Lang)
    : "ko";
}

function normalizeLocalDate(value: unknown) {
  if (typeof value !== "string" || !LOCAL_DATE_PATTERN.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const utcDay = Date.UTC(year, month - 1, day);
  if (new Date(utcDay).toISOString().slice(0, 10) !== value) return null;

  // A device-local calendar day can be one day ahead of or behind UTC.
  const todayUtc = new Date().toISOString().slice(0, 10);
  const [todayYear, todayMonth, todayDay] = todayUtc.split("-").map(Number);
  const todayUtcDay = Date.UTC(todayYear, todayMonth - 1, todayDay);
  if (Math.abs(utcDay - todayUtcDay) > 86400000) return null;
  return value;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values.filter(
        (value): value is string =>
          typeof value === "string" && value.length > 0,
      ),
    ),
  );
}

function chunkArray<T>(items: T[], size = QUERY_CHUNK_SIZE) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
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
    },
  );
}

async function getAuthenticatedUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return error || !user ? null : user;
}

async function loadCompletedUserIds(
  admin: ReturnType<typeof createAdminClient>,
  userIds: string[],
  localDate: string,
) {
  const completedUserIds = new Set<string>();
  const chunks = chunkArray(uniqueStrings(userIds));

  const results = await Promise.all(
    chunks.map((userIdChunk) =>
      admin
        .from("qt_records")
        .select("user_id")
        .eq("date", localDate)
        .eq("is_draft", false)
        .in("user_id", userIdChunk),
    ),
  );

  results.forEach(({ data, error }) => {
    if (error) throw error;
    (data ?? []).forEach((row: any) => {
      if (row.user_id) completedUserIds.add(String(row.user_id));
    });
  });

  return completedUserIds;
}

async function loadProfiles(
  admin: ReturnType<typeof createAdminClient>,
  userIds: string[],
) {
  const profileMap = new Map<string, ProfileRow>();
  const chunks = chunkArray(uniqueStrings(userIds));
  const results = await Promise.all(
    chunks.map((userIdChunk) =>
      admin
        .from("profiles")
        .select("id,name,preferred_language")
        .in("id", userIdChunk),
    ),
  );

  results.forEach(({ data, error }) => {
    if (error) throw error;
    (data ?? []).forEach((row: any) => {
      profileMap.set(String(row.id), row as ProfileRow);
    });
  });
  return profileMap;
}

async function loadPreferences(
  admin: ReturnType<typeof createAdminClient>,
  userIds: string[],
) {
  const preferenceMap = new Map<string, NotificationPreferenceRow>();
  const chunks = chunkArray(uniqueStrings(userIds));
  const results = await Promise.all(
    chunks.map((userIdChunk) =>
      admin
        .from("notification_preferences")
        .select(
          "user_id,push_enabled,group_notifications_enabled,partner_notifications_enabled",
        )
        .in("user_id", userIdChunk),
    ),
  );

  results.forEach(({ data, error }) => {
    if (error) throw error;
    (data ?? []).forEach((row: any) => {
      preferenceMap.set(String(row.user_id), row as NotificationPreferenceRow);
    });
  });
  return preferenceMap;
}

function preferencesAllowNudge(
  row: NotificationPreferenceRow | undefined,
  scope: ReflectionNudgeScope,
) {
  if ((row?.push_enabled ?? true) === false) return false;
  return scope === "group"
    ? (row?.group_notifications_enabled ?? true)
    : (row?.partner_notifications_enabled ?? true);
}

async function dispatchNudgePushes(
  admin: ReturnType<typeof createAdminClient>,
  notificationIds: string[],
) {
  for (const notificationIdChunk of chunkArray(
    notificationIds,
    PUSH_DISPATCH_CHUNK_SIZE,
  )) {
    try {
      await dispatchNotificationsByIds(admin, notificationIdChunk);
    } catch (error) {
      console.warn("Roots reflection nudge push dispatch failed", error);
    }
  }
}

async function loadAcceptedPartnerIds(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
) {
  const { data, error } = await admin
    .from("companions")
    .select("requester_id,receiver_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);
  if (error) throw error;

  return uniqueStrings(
    (data ?? []).map((row: any) =>
      String(row.requester_id) === userId
        ? String(row.receiver_id)
        : String(row.requester_id),
    ),
  );
}

async function loadJoinedGroupIds(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
) {
  const { data, error } = await admin
    .from("group_members")
    .select("group_id")
    .eq("user_id", userId);
  if (error) throw error;
  return uniqueStrings((data ?? []).map((row: any) => String(row.group_id)));
}

async function loadGroupMembers(
  admin: ReturnType<typeof createAdminClient>,
  groupIds: string[],
) {
  const rows: Array<{ group_id: string; user_id: string }> = [];
  const results = await Promise.all(
    chunkArray(uniqueStrings(groupIds)).map((groupIdChunk) =>
      admin
        .from("group_members")
        .select("group_id,user_id")
        .in("group_id", groupIdChunk),
    ),
  );

  results.forEach(({ data, error }) => {
    if (error) throw error;
    (data ?? []).forEach((row: any) => {
      if (row.group_id && row.user_id) {
        rows.push({
          group_id: String(row.group_id),
          user_id: String(row.user_id),
        });
      }
    });
  });
  return rows;
}

async function loadSentNudgeStatus(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  groupIds: string[],
  localDate: string,
) {
  const partnerRequest = admin
    .from("reflection_nudge_sends")
    .select("recipient_id")
    .eq("scope", "partner")
    .eq("sender_id", userId)
    .eq("local_date", localDate);

  const groupRequests =
    groupIds.length > 0
      ? chunkArray(groupIds).map((groupIdChunk) =>
          admin
            .from("reflection_nudge_sends")
            .select("group_id")
            .eq("scope", "group")
            .eq("local_date", localDate)
            .in("group_id", groupIdChunk),
        )
      : [];

  const [partnerResult, groupResults] = await Promise.all([
    partnerRequest,
    Promise.all(groupRequests),
  ]);
  if (partnerResult.error) throw partnerResult.error;
  groupResults.forEach(({ error }) => {
    if (error) throw error;
  });

  return {
    partnerSentIds: uniqueStrings(
      (partnerResult.data ?? []).map((row: any) =>
        row.recipient_id ? String(row.recipient_id) : null,
      ),
    ),
    groupSentIds: uniqueStrings(
      groupResults.flatMap(({ data }) =>
        (data ?? []).map((row: any) =>
          row.group_id ? String(row.group_id) : null,
        ),
      ),
    ),
  };
}

export async function GET(request: NextRequest) {
  const localDate = normalizeLocalDate(
    request.nextUrl.searchParams.get("localDate"),
  );
  if (!localDate) {
    return NextResponse.json(
      { error: "Invalid local date" },
      { status: 400 },
    );
  }

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 },
      );
    }

    const admin = createAdminClient();
    const [partnerIds, groupIds] = await Promise.all([
      loadAcceptedPartnerIds(admin, user.id),
      loadJoinedGroupIds(admin, user.id),
    ]);
    const groupMembers = await loadGroupMembers(admin, groupIds);
    const relevantUserIds = uniqueStrings([
      ...partnerIds,
      ...groupMembers.map((row) => row.user_id),
    ]);
    const [completedUserIds, sentStatus] = await Promise.all([
      loadCompletedUserIds(admin, relevantUserIds, localDate),
      loadSentNudgeStatus(admin, user.id, groupIds, localDate),
    ]);

    const groupMemberIds = new Map<string, string[]>();
    groupMembers.forEach((row) => {
      const memberIds = groupMemberIds.get(row.group_id) ?? [];
      memberIds.push(row.user_id);
      groupMemberIds.set(row.group_id, memberIds);
    });

    const groupUnavailableIds = groupIds.filter((groupId) => {
      const possibleRecipients = (groupMemberIds.get(groupId) ?? []).filter(
        (memberId) => memberId !== user.id,
      );
      return (
        possibleRecipients.length === 0 ||
        possibleRecipients.every((memberId) =>
          completedUserIds.has(memberId),
        )
      );
    });

    return NextResponse.json({
      ok: true,
      localDate,
      partnerCompletedIds: partnerIds.filter((partnerId) =>
        completedUserIds.has(partnerId),
      ),
      groupUnavailableIds,
      partnerSentIds: sentStatus.partnerSentIds,
      groupSentIds: sentStatus.groupSentIds,
    });
  } catch (error) {
    console.error("Roots reflection nudge status failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Reflection nudge status failed",
      },
      { status: 500 },
    );
  }
}

async function verifyPartnerRelationship(
  admin: ReturnType<typeof createAdminClient>,
  senderId: string,
  recipientId: string,
) {
  const { data, error } = await admin
    .from("companions")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(requester_id.eq.${senderId},receiver_id.eq.${recipientId}),and(requester_id.eq.${recipientId},receiver_id.eq.${senderId})`,
    )
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

async function loadNudgeTarget(
  admin: ReturnType<typeof createAdminClient>,
  scope: ReflectionNudgeScope,
  senderId: string,
  targetId: string,
  localDate: string,
) {
  if (scope === "partner") {
    if (targetId === senderId) {
      return { errorCode: "invalid_target" as const, recipientIds: [] };
    }
    const accepted = await verifyPartnerRelationship(
      admin,
      senderId,
      targetId,
    );
    if (!accepted) {
      return { errorCode: "not_allowed" as const, recipientIds: [] };
    }
    const completed = await loadCompletedUserIds(
      admin,
      [targetId],
      localDate,
    );
    if (completed.has(targetId)) {
      return { errorCode: "completed" as const, recipientIds: [] };
    }
    return {
      errorCode: null,
      recipientIds: [targetId],
      groupName: null,
    };
  }

  const [{ data: membership, error: membershipError }, groupResult] =
    await Promise.all([
      admin
        .from("group_members")
        .select("group_id")
        .eq("group_id", targetId)
        .eq("user_id", senderId)
        .maybeSingle(),
      admin.from("groups").select("id,name").eq("id", targetId).maybeSingle(),
    ]);
  if (membershipError) throw membershipError;
  if (groupResult.error) throw groupResult.error;
  if (!membership || !groupResult.data) {
    return { errorCode: "not_allowed" as const, recipientIds: [] };
  }

  const { data: memberRows, error: memberError } = await admin
    .from("group_members")
    .select("user_id")
    .eq("group_id", targetId);
  if (memberError) throw memberError;

  const possibleRecipientIds = uniqueStrings(
    (memberRows ?? [])
      .map((row: any) => (row.user_id ? String(row.user_id) : null))
      .filter((memberId: string | null) => memberId !== senderId),
  );
  const completed = await loadCompletedUserIds(
    admin,
    possibleRecipientIds,
    localDate,
  );
  const waitingRecipientIds = possibleRecipientIds.filter(
    (recipientId) => !completed.has(recipientId),
  );
  if (waitingRecipientIds.length === 0) {
    return { errorCode: "all_completed" as const, recipientIds: [] };
  }

  return {
    errorCode: null,
    recipientIds: waitingRecipientIds,
    groupName: String(groupResult.data.name ?? "").trim() || "Roots",
  };
}

function isUniqueViolation(error: any) {
  return error?.code === "23505";
}

export async function POST(request: NextRequest) {
  let payload: ReflectionNudgePayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const scope = normalizeScope(payload.scope);
  const targetId = normalizeUuid(payload.targetId);
  const localDate = normalizeLocalDate(payload.localDate);
  if (!scope || !targetId || !localDate) {
    return NextResponse.json(
      { error: "Invalid reflection nudge request" },
      { status: 400 },
    );
  }

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 },
      );
    }

    const admin = createAdminClient();
    const target = await loadNudgeTarget(
      admin,
      scope,
      user.id,
      targetId,
      localDate,
    );
    if (target.errorCode) {
      const status =
        target.errorCode === "completed" ||
        target.errorCode === "all_completed"
          ? 409
          : 403;
      return NextResponse.json(
        { error: target.errorCode, code: target.errorCode },
        { status },
      );
    }

    const sendInsert = {
      sender_id: user.id,
      scope,
      group_id: scope === "group" ? targetId : null,
      recipient_id: scope === "partner" ? targetId : null,
      local_date: localDate,
    };
    const { data: sendRow, error: sendError } = await admin
      .from("reflection_nudge_sends")
      .insert(sendInsert)
      .select("id")
      .single();

    if (sendError) {
      if (isUniqueViolation(sendError)) {
        return NextResponse.json(
          { error: "already_sent", code: "already_sent" },
          { status: 409 },
        );
      }
      throw sendError;
    }

    try {
      const actorAndRecipientIds = uniqueStrings([
        user.id,
        ...target.recipientIds,
      ]);
      const [profiles, preferences] = await Promise.all([
        loadProfiles(admin, actorAndRecipientIds),
        loadPreferences(admin, target.recipientIds),
      ]);
      const actorName = profiles.get(user.id)?.name?.trim() || "Roots";

      const notificationRows = target.recipientIds.flatMap((recipientId) => {
        if (
          !preferencesAllowNudge(preferences.get(recipientId), scope)
        ) {
          return [];
        }
        const recipientProfile = profiles.get(recipientId);
        const locale = normalizeLang(recipientProfile?.preferred_language);
        const template = getReflectionNudgeNotificationTemplate(scope, locale, {
          actorName,
          groupName: target.groupName,
        });

        return [
          {
            recipient_id: recipientId,
            actor_id: user.id,
            type:
              scope === "group"
                ? "group_reflection_nudge"
                : "partner_reflection_nudge",
            scope,
            group_id: scope === "group" ? targetId : null,
            companion_user_id: scope === "partner" ? user.id : null,
            qt_record_id: null,
            prayer_item_id: null,
            locale,
            title: template.title,
            body: template.body,
            deep_link: "/qt",
            push_status: "pending",
          },
        ];
      });

      let notificationIds: string[] = [];
      if (notificationRows.length > 0) {
        const { data: insertedRows, error: notificationError } = await admin
          .from("notifications")
          .insert(notificationRows)
          .select("id");
        if (notificationError) throw notificationError;
        notificationIds = uniqueStrings(
          (insertedRows ?? []).map((row: any) =>
            row.id ? String(row.id) : null,
          ),
        );
      }

      if (notificationIds.length > 0) {
        after(() => dispatchNudgePushes(admin, notificationIds));
      }

      return NextResponse.json({
        ok: true,
        scope,
        targetId,
        localDate,
        recipients: notificationRows.length,
      });
    } catch (error) {
      const { error: cleanupError } = await admin
        .from("reflection_nudge_sends")
        .delete()
        .eq("id", sendRow.id);
      if (cleanupError) {
        console.error(
          "Roots reflection nudge rollback failed",
          cleanupError,
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Roots reflection nudge creation failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Reflection nudge creation failed",
      },
      { status: 500 },
    );
  }
}

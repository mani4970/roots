import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type GroupManagementAction =
  | "update_group"
  | "remove_member"
  | "transfer_leadership"
  | "delete_group"
  | "request_challenge";

type GroupManagementPayload = {
  action?: unknown;
  groupId?: unknown;
  targetUserId?: unknown;
  name?: unknown;
  description?: unknown;
  isPublic?: unknown;
  requesterEmail?: unknown;
  title?: unknown;
  requestedStartDate?: unknown;
  durationDays?: unknown;
  badgeIdea?: unknown;
  extraQuestions?: unknown;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const VALID_ACTIONS = new Set<GroupManagementAction>([
  "update_group",
  "remove_member",
  "transfer_leadership",
  "delete_group",
  "request_challenge",
]);

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

function normalizeUuid(value: unknown) {
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : null;
}

function normalizeAction(value: unknown): GroupManagementAction | null {
  return typeof value === "string" &&
    VALID_ACTIONS.has(value as GroupManagementAction)
    ? (value as GroupManagementAction)
    : null;
}

function normalizeDateInput(value: unknown) {
  if (typeof value !== "string" || !DATE_INPUT_PATTERN.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? value
    : null;
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

function errorResponse(
  code: string,
  status: number,
  details?: Record<string, unknown>,
) {
  return NextResponse.json({ ok: false, error: code, ...details }, { status });
}

export async function POST(request: NextRequest) {
  let payload: GroupManagementPayload;
  try {
    payload = (await request.json()) as GroupManagementPayload;
  } catch {
    return errorResponse("invalid_payload", 400);
  }

  const action = normalizeAction(payload.action);
  const groupId = normalizeUuid(payload.groupId);
  if (!action || !groupId) {
    return errorResponse("invalid_payload", 400);
  }

  let userId: string;
  let admin: ReturnType<typeof createAdminClient>;
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return errorResponse("not_authenticated", 401);
    }

    userId = user.id;
    admin = createAdminClient();
  } catch (error) {
    console.error("group management authentication failed", error);
    return errorResponse("server_configuration_error", 500);
  }

  try {
    if (action === "request_challenge") {
      const requesterEmail =
        typeof payload.requesterEmail === "string"
          ? payload.requesterEmail.trim()
          : "";
      const title =
        typeof payload.title === "string" ? payload.title.trim() : "";
      const requestedStartDate = normalizeDateInput(
        payload.requestedStartDate,
      );
      const durationDays =
        typeof payload.durationDays === "number" &&
        Number.isInteger(payload.durationDays)
          ? payload.durationDays
          : null;
      const description =
        typeof payload.description === "string"
          ? payload.description.trim()
          : "";
      const badgeIdea =
        typeof payload.badgeIdea === "string" ? payload.badgeIdea.trim() : "";
      const extraQuestions =
        typeof payload.extraQuestions === "string"
          ? payload.extraQuestions.trim()
          : "";

      if (
        requesterEmail.length < 3 ||
        requesterEmail.length > 320 ||
        title.length < 1 ||
        title.length > 120 ||
        !requestedStartDate ||
        durationDays === null ||
        durationDays < 1 ||
        durationDays > 120
      ) {
        return errorResponse("invalid_challenge_request", 400);
      }

      const { data, error } = await admin.rpc(
        "request_group_challenge_as_leader",
        {
          p_group_id: groupId,
          p_actor_id: userId,
          p_requester_email: requesterEmail,
          p_title: title,
          p_requested_start_date: requestedStartDate,
          p_duration_days: durationDays,
          p_description: description || null,
          p_badge_idea: badgeIdea || null,
          p_extra_questions: extraQuestions || null,
        },
      );

      if (error) throw error;
      const result =
        data && typeof data === "object" && !Array.isArray(data)
          ? (data as Record<string, unknown>)
          : null;
      if (result?.created !== true) {
        const reason =
          typeof result?.reason === "string"
            ? result.reason
            : "challenge_request_not_allowed";
        const status =
          reason === "request_already_active"
            ? 409
            : reason === "invalid_challenge_request"
              ? 400
              : 403;
        return errorResponse(reason, status);
      }

      return NextResponse.json({
        ok: true,
        requestId:
          typeof result.request_id === "string" ? result.request_id : null,
        createdAt:
          typeof result.created_at === "string" ? result.created_at : null,
      });
    }

    if (action === "update_group") {
      const name =
        typeof payload.name === "string" ? payload.name.trim() : "";
      const description =
        typeof payload.description === "string"
          ? payload.description.trim()
          : "";
      const isPublic =
        typeof payload.isPublic === "boolean" ? payload.isPublic : null;

      if (
        name.length < 1 ||
        name.length > 80 ||
        description.length > 500 ||
        isPublic === null
      ) {
        return errorResponse("invalid_group_details", 400);
      }

      const { data, error } = await admin.rpc("update_group_as_leader", {
        p_group_id: groupId,
        p_actor_id: userId,
        p_name: name,
        p_description: description,
        p_is_public: isPublic,
      });

      if (error) throw error;
      if (data !== true) return errorResponse("not_group_leader", 403);

      return NextResponse.json({
        ok: true,
        group: {
          id: groupId,
          name,
          description: description || null,
          is_public: isPublic,
        },
      });
    }

    if (action === "delete_group") {
      const { data, error } = await admin.rpc("delete_group_as_leader", {
        p_group_id: groupId,
        p_actor_id: userId,
      });

      if (error) throw error;
      if (data !== true) return errorResponse("not_group_leader", 403);
      return NextResponse.json({ ok: true, deletedGroupId: groupId });
    }

    const targetUserId = normalizeUuid(payload.targetUserId);
    if (!targetUserId) {
      return errorResponse("invalid_target_user", 400);
    }

    const rpcName =
      action === "remove_member"
        ? "remove_group_member_as_leader"
        : "transfer_group_leadership_as_leader";

    const { data, error } = await admin.rpc(rpcName, {
      p_group_id: groupId,
      p_actor_id: userId,
      p_target_user_id: targetUserId,
    });

    if (error) throw error;
    if (data !== true) {
      return errorResponse("group_action_not_allowed", 403);
    }

    return NextResponse.json({
      ok: true,
      groupId,
      targetUserId,
      action,
    });
  } catch (error) {
    console.error(`group management action failed: ${action}`, error);
    return errorResponse("group_action_failed", 500);
  }
}

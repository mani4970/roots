import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type GroupManagementAction =
  | "update_group"
  | "remove_member"
  | "allow_rejoin"
  | "transfer_leadership"
  | "delete_group";

type GroupManagementPayload = {
  action?: unknown;
  groupId?: unknown;
  targetUserId?: unknown;
  name?: unknown;
  description?: unknown;
  isPublic?: unknown;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_ACTIONS = new Set<GroupManagementAction>([
  "update_group",
  "remove_member",
  "allow_rejoin",
  "transfer_leadership",
  "delete_group",
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
        : action === "allow_rejoin"
          ? "allow_group_rejoin_as_leader"
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

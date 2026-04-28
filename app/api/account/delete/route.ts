import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type DeleteStepResult = {
  step: string;
  error: string;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

async function runStep(
  errors: DeleteStepResult[],
  step: string,
  action: () => Promise<{ error: { message?: string } | null } | void>
) {
  try {
    const result = await action();
    if (result && result.error) {
      errors.push({ step, error: result.error.message ?? "Unknown Supabase error" });
    }
  } catch (error) {
    errors.push({ step, error: error instanceof Error ? error.message : "Unknown error" });
  }
}

function removeCacheSuffix(url: string | null | undefined) {
  return (url ?? "").split("?")[0];
}

function avatarPathFromPublicUrl(publicUrl: string | null | undefined, userId: string) {
  const cleanUrl = removeCacheSuffix(publicUrl);
  const marker = "/storage/v1/object/public/avatars/";
  const markerIndex = cleanUrl.indexOf(marker);
  if (markerIndex === -1) return null;

  const path = decodeURIComponent(cleanUrl.slice(markerIndex + marker.length));
  return path.startsWith(`${userId}/`) ? path : null;
}

export async function POST() {
  const cookieStore = cookies();

  const supabase = createServerClient(
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

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let admin: any;
  try {
    admin = createSupabaseAdminClient(
      getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server configuration error" },
      { status: 500 }
    );
  }

  const errors: DeleteStepResult[] = [];
  const userId = user.id;

  const [{ data: profile }, { data: prayers }, { data: qts }, { data: ownedGroups }] = await Promise.all([
    admin.from("profiles").select("avatar_url").eq("id", userId).maybeSingle(),
    admin.from("prayer_items").select("id").eq("user_id", userId),
    admin.from("qt_records").select("id").eq("user_id", userId),
    admin.from("groups").select("id").eq("created_by", userId),
  ]);

  const prayerIds = (prayers ?? []).map((row: any) => row.id).filter(Boolean);
  const qtIds = (qts ?? []).map((row: any) => row.id).filter(Boolean);
  const ownedGroupIds = (ownedGroups ?? []).map((row: any) => row.id).filter(Boolean);

  const avatarPaths = new Set<string>();
  const avatarPath = avatarPathFromPublicUrl((profile as any)?.avatar_url, userId);
  if (avatarPath) avatarPaths.add(avatarPath);

  const { data: avatarFiles } = await admin.storage.from("avatars").list(userId);
  (avatarFiles ?? []).forEach((file: any) => {
    if (file?.name) avatarPaths.add(`${userId}/${file.name}`);
  });

  if (avatarPaths.size > 0) {
    await runStep(errors, "delete avatar files", () =>
      admin.storage.from("avatars").remove(Array.from(avatarPaths))
    );
  }

  await runStep(errors, "delete prayer likes by user", () =>
    admin.from("prayer_likes").delete().eq("user_id", userId)
  );
  if (prayerIds.length > 0) {
    await runStep(errors, "delete prayer likes on user prayers", () =>
      admin.from("prayer_likes").delete().in("prayer_id", prayerIds)
    );
  }

  await runStep(errors, "delete prayer logs by user", () =>
    admin.from("user_prayer_logs").delete().eq("user_id", userId)
  );
  if (prayerIds.length > 0) {
    await runStep(errors, "delete prayer logs on user prayers", () =>
      admin.from("user_prayer_logs").delete().in("prayer_id", prayerIds)
    );
  }

  await runStep(errors, "delete qt reactions by user", () =>
    admin.from("qt_reactions").delete().eq("user_id", userId)
  );
  if (qtIds.length > 0) {
    await runStep(errors, "delete qt reactions on user qts", () =>
      admin.from("qt_reactions").delete().in("qt_id", qtIds)
    );
  }

  await runStep(errors, "delete daily prayer completions", () =>
    admin.from("daily_prayer_completions").delete().eq("user_id", userId)
  );
  await runStep(errors, "delete daily checkins", () =>
    admin.from("daily_checkins").delete().eq("user_id", userId)
  );
  await runStep(errors, "delete feedback", () =>
    admin.from("feedback").delete().eq("user_id", userId)
  );

  await runStep(errors, "delete group memberships by user", () =>
    admin.from("group_members").delete().eq("user_id", userId)
  );
  if (ownedGroupIds.length > 0) {
    await runStep(errors, "delete memberships of owned groups", () =>
      admin.from("group_members").delete().in("group_id", ownedGroupIds)
    );
    await runStep(errors, "delete owned groups", () =>
      admin.from("groups").delete().in("id", ownedGroupIds)
    );
  }

  await runStep(errors, "delete prayer items", () =>
    admin.from("prayer_items").delete().eq("user_id", userId)
  );
  await runStep(errors, "delete qt records", () =>
    admin.from("qt_records").delete().eq("user_id", userId)
  );
  await runStep(errors, "delete profile", () =>
    admin.from("profiles").delete().eq("id", userId)
  );

  if (errors.length > 0) {
    return NextResponse.json({ error: "Account deletion failed", details: errors }, { status: 500 });
  }

  const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId);
  if (authDeleteError) {
    return NextResponse.json(
      { error: "Auth user deletion failed", details: [{ step: "delete auth user", error: authDeleteError.message }] },
      { status: 500 }
    );
  }

  try {
    await supabase.auth.signOut();
  } catch {
    // The Auth user has already been deleted. Cookie cleanup is best-effort here.
  }

  return NextResponse.json({ ok: true });
}

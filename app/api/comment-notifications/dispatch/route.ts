import { timingSafeEqual } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { after, NextRequest, NextResponse } from "next/server";
import {
  commentNotificationAdmin,
  dispatchCommentNotifications,
} from "@/lib/notifications/commentNotificationServer";
import { isCommentNotificationId } from "@/lib/notifications/commentNotifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Durable fallback when the writer closes the app immediately after saving.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const actual = Buffer.from(request.headers.get("authorization") ?? ""),
    expected = Buffer.from(`Bearer ${secret ?? ""}`);
  if (
    !secret ||
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected)
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({
      ok: true,
      ...(await dispatchCommentNotifications(commentNotificationAdmin())),
    });
  } catch {
    return NextResponse.json(
      { error: "Comment notification dispatch failed" },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  // Cookie-authenticated same-origin requests only; no caller-supplied recipients.
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let id: unknown;
  try {
    id = (await request.json()).commentId;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!isCommentNotificationId(id))
    return NextResponse.json({ error: "Invalid comment" }, { status: 400 });
  try {
    const jar = await cookies();
    const client = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => jar.getAll(),
          setAll: (values) =>
            values.forEach(({ name, value, options }) =>
              jar.set(name, value, options),
            ),
        },
      },
    );
    const {
      data: { user },
      error,
    } = await client.auth.getUser();
    if (error || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const comment = await client
      .from("qt_comments")
      .select("author_id")
      .eq("id", id)
      .maybeSingle();
    if (comment.error || comment.data?.author_id !== user.id)
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    const commentId = id;
    after(async () => {
      try {
        await dispatchCommentNotifications(
          commentNotificationAdmin(),
          commentId,
        );
      } catch {
        /* The scheduled job retries persisted events. */
      }
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Comment notification dispatch unavailable" },
      { status: 503 },
    );
  }
}

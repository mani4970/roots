import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { after, NextRequest, NextResponse } from "next/server";
import { commentNotificationAdmin } from "@/lib/notifications/commentNotificationServer";
import { dispatchGiftNotifications } from "@/lib/notifications/giftNotificationServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let requestId: unknown;
  try { requestId = (await request.json()).requestId; }
  catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  if (typeof requestId !== "string" || !UUID.test(requestId)) return NextResponse.json({ error: "Invalid gift request" }, { status: 400 });
  try {
    const jar = await cookies();
    const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: { getAll: () => jar.getAll(), setAll: values => values.forEach(({ name, value, options }) => jar.set(name, value, options)) },
    });
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const target = { senderId: user.id, requestId };
    after(async () => {
      try { await dispatchGiftNotifications(commentNotificationAdmin(), target); }
      catch { /* The existing minute cron scans the committed gift again. */ }
    });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Gift notification dispatch unavailable" }, { status: 503 }); }
}

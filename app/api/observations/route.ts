import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  OBSERVATION_BUILD, OBSERVATION_CAMPAIGN, OBSERVATION_MAX_BYTES,
  isObservationCampaignActive, normalizeObservationBatch,
  type ObservationCampaign,
} from "@/lib/observationSchema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const RESPONSE_HEADERS = { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" };
const RATE_LIMIT_EVENTS_PER_MINUTE = 240;
const DISABLED_CONFIG: ObservationCampaign = { enabled: false, starts_at: null, ends_at: null, build_tag: OBSERVATION_BUILD };

function respond(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: RESPONSE_HEADERS });
}
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
async function loadCampaign(admin: NonNullable<ReturnType<typeof adminClient>>) {
  return admin.from("app_observation_campaigns")
    .select("enabled,starts_at,ends_at,build_tag").eq("campaign_key", OBSERVATION_CAMPAIGN).maybeSingle();
}
function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  return origin === null || origin === request.nextUrl.origin;
}

// Read the stream with a byte limit even when Content-Length is absent or forged.
async function readBody(request: NextRequest): Promise<{ body: unknown } | { error: "body_too_large" | "invalid_json" }> {
  const declaredSize = request.headers.get("content-length");
  if (declaredSize && Number(declaredSize) > OBSERVATION_MAX_BYTES) return { error: "body_too_large" };
  if (!request.body) return { error: "invalid_json" };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > OBSERVATION_MAX_BYTES) {
        await reader.cancel();
        return { error: "body_too_large" };
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return { body: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) };
  } catch {
    return { error: "invalid_json" };
  } finally {
    reader.releaseLock();
  }
}

export async function GET() {
  try {
    const admin = adminClient();
    if (!admin) return respond(DISABLED_CONFIG, 503);
    const { data, error } = await loadCampaign(admin);
    if (error) return respond(DISABLED_CONFIG, 503);
    const campaign = data as ObservationCampaign | null;
    if (!campaign) return respond(DISABLED_CONFIG);
    return respond({
      enabled: isObservationCampaignActive(campaign),
      starts_at: campaign.starts_at, ends_at: campaign.ends_at, build_tag: campaign.build_tag,
    });
  } catch {
    return respond(DISABLED_CONFIG, 503);
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return respond({ ok: false, error: "invalid_origin" }, 403);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return respond({ ok: false, error: "unsupported_content_type" }, 415);
  }
  const parsed = await readBody(request);
  if ("error" in parsed) return respond({ ok: false, error: parsed.error }, parsed.error === "body_too_large" ? 413 : 400);
  const batch = normalizeObservationBatch(parsed.body);
  if (!batch) return respond({ ok: false, error: "invalid_batch" }, 400);
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const admin = adminClient();
    if (!url || !anonKey || !admin) return respond({ ok: false, error: "unavailable" }, 503);
    const cookieStore = await cookies();
    const authClient = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (updates) => updates.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    });
    const { data: auth, error: authError } = await authClient.auth.getUser();
    if (authError || !auth.user) return respond({ ok: false, error: "unauthorized" }, 401);
    if (auth.user.id.toLowerCase() !== batch.user_id) return respond({ ok: false, error: "user_mismatch" }, 403);
    const { data, error: campaignError } = await loadCampaign(admin);
    if (campaignError) return respond({ ok: false, error: "unavailable" }, 503);
    const campaign = data as ObservationCampaign | null;
    const now = Date.now();
    if (!isObservationCampaignActive(campaign, now)) return respond({ ok: true, accepted: 0, disabled: true });

    // Use server receive time for limits. Client timestamps are advisory and never
    // prove an action happened. This count is a soft limit across concurrent workers.
    const { count, error: rateError } = await admin.from("app_observation_events")
      .select("event_id", { count: "exact", head: true }).eq("campaign_key", OBSERVATION_CAMPAIGN)
      .eq("user_id", auth.user.id).gte("received_at", new Date(now - 60000).toISOString());
    if (rateError) return respond({ ok: false, error: "unavailable" }, 503);
    const events = Array.from(new Map(batch.events.map((event) => [event.event_id, event])).values());
    if ((count ?? 0) + events.length > RATE_LIMIT_EVENTS_PER_MINUTE) {
      return respond({ ok: false, error: "rate_limited" }, 429);
    }
    const rows = events.map((event) => ({
      event_id: event.event_id, campaign_key: OBSERVATION_CAMPAIGN, user_id: auth.user.id,
      flow_id: event.flow_id, scope: event.scope, event_name: event.event_name,
      client_kind: event.client_kind, build_tag: OBSERVATION_BUILD, record_id: event.record_id,
      client_at: event.client_at, elapsed_ms: event.elapsed_ms, details: event.details,
    }));
    // Ignore duplicates so a resent event_id cannot rewrite the original evidence.
    const { error: insertError } = await admin.from("app_observation_events")
      .upsert(rows, { onConflict: "event_id", ignoreDuplicates: true });
    if (insertError) return respond({ ok: false, error: "unavailable" }, 503);
    // accepted acknowledges receipt, including previously ingested duplicate IDs.
    return respond({ ok: true, accepted: events.length });
  } catch {
    // Do not print payloads, user identifiers, auth tokens or raw upstream errors.
    return respond({ ok: false, error: "unavailable" }, 503);
  }
}

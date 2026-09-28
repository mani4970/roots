import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { OBSERVATION_BUILD, OBSERVATION_MAX_BYTES } from "@/lib/observationSchema";
import { normalizeOpsBatch, basicOpsEvent, OPS_PROTOCOL } from "@/lib/operationalSchema";
import { issueOpsTicket, readOpsTicket, opsNetworkBucket } from "@/lib/operationalTicket";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const COOKIE = "roots_ops_session_v3";
const HEADERS = { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" };
const DISABLED = { enabled: false, protocol: OPS_PROTOCOL, build_tag: OBSERVATION_BUILD, detail_enabled: false };
function respond(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: HEADERS }); }
// Bound diagnostics network work without changing the app's shared auth client.
const boundedFetch: typeof fetch = (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(3500) });
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: boundedFetch } }) : null;
}
async function settings(admin: NonNullable<ReturnType<typeof adminClient>>) {
  return admin.from("app_ops_settings").select("enabled,protocol,detail_until").eq("id", true).maybeSingle();
}
function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return request.headers.get("sec-fetch-site") !== "cross-site" && (origin === null || origin === request.nextUrl.origin);
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

export async function GET(request: NextRequest) {
  if (!sameOrigin(request)) return respond(DISABLED, 403);
  try {
    const admin = adminClient();
    const secret = process.env.SUPABASE_SECRET_KEY;
    if (!admin || !secret) return respond(DISABLED, 503);
    const { data, error } = await settings(admin);
    if (error) return respond(DISABLED, 503);
    if (!data || !data.enabled || data.protocol !== OPS_PROTOCOL) return respond(DISABLED);
    const cookieStore = await cookies();
    const response = respond({ ...DISABLED, enabled: true, detail_enabled: Boolean(data.detail_until && Date.parse(data.detail_until) > Date.now()) });
    if (!readOpsTicket(cookieStore.get(COOKIE)?.value, secret)) {
      response.cookies.set(COOKIE, issueOpsTicket(secret), { httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "strict", path: "/api/operational-observations", maxAge: 7200 });
    }
    return response;
  } catch { return respond(DISABLED, 503); }
}
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return respond({ ok: false, error: "invalid_origin" }, 403);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return respond({ ok: false }, 415);
  const parsed = await readBody(request);
  if ("error" in parsed) return respond({ ok: false, error: parsed.error }, parsed.error === "body_too_large" ? 413 : 400);
  const batch = normalizeOpsBatch(parsed.body);
  if (!batch) return respond({ ok: false, error: "invalid_batch" }, 400);
  try {
    const admin = adminClient();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const secret = process.env.SUPABASE_SECRET_KEY;
    if (!admin || !url || !anonKey || !secret) return respond({ ok: false }, 503);
    const cookieStore = await cookies();
    const sessionId = readOpsTicket(cookieStore.get(COOKIE)?.value, secret);
    if (!sessionId) return respond({ ok: false, error: "ticket_required" }, 428);
    // Anonymous auth failures are never attributed to an email/account supplied by the client.
    if (batch.user_id !== null) {
      const authClient = createServerClient(url, anonKey, {
        global: { fetch: boundedFetch },
        cookies: { getAll: () => cookieStore.getAll(), setAll: updates => updates.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
      });
      const { data, error } = await authClient.auth.getUser();
      if (error || !data.user) return respond({ ok: false, error: "unauthorized" }, 401);
      if (data.user.id.toLowerCase() !== batch.user_id) return respond({ ok: false, error: "user_mismatch" }, 403);
    }
    const { data: config, error: configError } = await settings(admin);
    if (configError) return respond({ ok: false }, 503);
    if (!config?.enabled || config.protocol !== OPS_PROTOCOL) return respond({ ok: true, disabled: true });
    const detailed = Boolean(config.detail_until && Date.parse(config.detail_until) > Date.now());
    const events = Array.from(new Map(batch.events.map(event => [event.event_id, basicOpsEvent(event, detailed)])).values());
    const { data, error } = await admin.rpc("ingest_app_ops", {
      p_user_id: batch.user_id, p_session_id: sessionId,
      p_network_bucket: opsNetworkBucket(request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, secret),
      p_events: events,
    });
    if (error) return respond({ ok: false, error: error.code === "PT429" ? "rate_limited" : "unavailable" }, error.code === "PT429" ? 429 : 503);
    return respond(data);
  } catch { return respond({ ok: false, error: "unavailable" }, 503); }
}

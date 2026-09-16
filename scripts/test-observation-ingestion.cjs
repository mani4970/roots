/* Telemetry privacy/auth boundaries. Mocks storage; never calls a live project. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
function load(relative, imports) {
  const source = fs.readFileSync(path.join(root, relative), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(js, { module, exports: module.exports, require: (key) => {
    if (Object.hasOwn(imports, key)) return imports[key];
    throw new Error(`Unexpected import ${key}`);
  }, process: { env: { NEXT_PUBLIC_SUPABASE_URL: "https://test.invalid", NEXT_PUBLIC_SUPABASE_ANON_KEY: "mock", SUPABASE_SECRET_KEY: "mock" } }, TextDecoder, Uint8Array, Date, Map, Set }, { filename: relative });
  return module.exports;
}
const schema = load("lib/observationSchema.ts", {});
const userId = "11111111-1111-4111-8111-111111111111";
const eventId = "22222222-2222-4222-8222-222222222222";
const event = {
  event_id: eventId, flow_id: "33333333-3333-4333-8333-333333333333",
  scope: "qt_write", event_name: "retry_clicked", client_kind: "web-desktop",
  build_tag: schema.OBSERVATION_BUILD, record_id: null,
  client_at: new Date().toISOString(), elapsed_ms: 100, details: { mode: "free", retry: true },
};
const state = { authId: userId, authError: null, campaign: null, rows: new Map(), count: null, dbError: false, storageCalls: 0 };
function active() {
  return { enabled: true, starts_at: new Date(Date.now() - 60000).toISOString(), ends_at: new Date(Date.now() + 60000).toISOString(), build_tag: schema.OBSERVATION_BUILD };
}
function storage() {
  return { from(table) {
    state.storageCalls++;
    const query = {
      select() { return query; }, eq() { return query; }, gte() { return query; },
      maybeSingle: async () => ({ data: state.campaign, error: state.dbError ? {} : null }),
      then(resolve) { return Promise.resolve({ count: state.count ?? state.rows.size, error: state.dbError ? {} : null }).then(resolve); },
      async upsert(rows, options) {
        assert.equal(table, "app_observation_events");
        assert.equal(options.ignoreDuplicates, true);
        assert.equal(options.onConflict, "event_id");
        if (!state.dbError) for (const row of rows) if (!state.rows.has(row.event_id)) state.rows.set(row.event_id, JSON.parse(JSON.stringify(row)));
        return { error: state.dbError ? {} : null };
      },
    };
    return query;
  } };
}
const route = load("app/api/observations/route.ts", {
  "@/lib/observationSchema": schema,
  "@supabase/ssr": { createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: state.authId ? { id: state.authId } : null }, error: state.authError }) } }) },
  "@supabase/supabase-js": { createClient: storage },
  "next/headers": { cookies: async () => ({ getAll: () => [], set() {} }) },
  "next/server": { NextResponse: { json: (body, options) => ({ body, status: options.status, headers: options.headers }) } },
});
function request(body, headers = {}, raw = false) {
  const req = new Request("https://roots.test/api/observations", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: raw ? body : JSON.stringify(body) });
  req.nextUrl = new URL(req.url);
  return req;
}
const batch = (change = {}) => ({ user_id: userId, events: [{ ...event, ...change }] });
function reset() {
  state.authId = userId; state.authError = null; state.campaign = active(); state.rows.clear(); state.count = null; state.dbError = false; state.storageCalls = 0;
}
let checks = 0;
async function check(name, run) { reset(); await run(); checks++; console.log(`PASS ${name}`); }
(async () => {
  await check("details discard text, URL, recipient IDs, arbitrary error messages and prototype properties", () => {
    const input = JSON.parse('{"mode":"free","count":2,"retry":true,"text":"private prayer","url":"https://private.invalid","recipient_id":"someone","error_code":"private words","__proto__":{"polluted":true},"constructor":"private"}');
    assert.equal(JSON.stringify(schema.sanitizeObservationDetails(input)), '{"mode":"free","count":2,"retry":true}');
    assert.equal(schema.sanitizeObservationErrorCode("42501"), "42501");
    assert.equal(schema.sanitizeObservationErrorCode("PGRST204"), "PGRST204");
  });
  await check("invalid identity, timestamp, event, elapsed time, and unknown top fields rejected", () => {
    for (const change of [{ event_id: "wrong" }, { client_at: "2026-02-31T00:00:00.000Z" }, { elapsed_ms: Infinity }, { elapsed_ms: -1 }, { event_name: "private text" }, { body: "secret" }]) assert.equal(schema.normalizeObservationEvent({ ...event, ...change }), null);
    assert.equal(schema.normalizeObservationBatch({ ...batch(), user_id: "fake" }), null);
    assert.equal(schema.normalizeObservationBatch({ ...batch(), events: Array(31).fill(event) }), null);
  });
  await check("origin and content type rejected before auth or storage", async () => {
    assert.equal((await route.POST(request(batch(), { Origin: "https://other.test" }))).status, 403);
    assert.equal((await route.POST(request(batch(), { "Sec-Fetch-Site": "cross-site" }))).status, 403);
    assert.equal((await route.POST(request(batch(), { "Content-Type": "text/plain" }))).status, 415);
    assert.equal(state.storageCalls, 0);
  });
  await check("body size enforced without a Content-Length and malformed JSON rejected", async () => {
    assert.equal((await route.POST(request("a".repeat(32769), {}, true))).status, 413);
    assert.equal((await route.POST(request("{", {}, true))).status, 400);
    assert.equal(state.storageCalls, 0);
  });
  await check("unauthenticated or spoofed user cannot ingest", async () => {
    state.authId = null;
    assert.equal((await route.POST(request(batch()))).status, 401);
    state.authId = "44444444-4444-4444-8444-444444444444";
    assert.equal((await route.POST(request(batch()))).status, 403);
    assert.equal(state.rows.size, 0);
  });
  await check("disabled, missing, future and expired campaigns never ingest", async () => {
    for (const campaign of [null, { ...active(), enabled: false }, { ...active(), starts_at: new Date(Date.now() + 30000).toISOString() }, { ...active(), ends_at: new Date(Date.now() - 1).toISOString() }, { ...active(), build_tag: "wrong" }]) {
      state.campaign = campaign;
      const response = await route.POST(request(batch()));
      assert.equal(response.status, 200); assert.equal(response.body.disabled, true);
      assert.equal((await route.GET()).body.enabled, false);
    }
    assert.equal(state.rows.size, 0);
  });
  await check("ingestion uses authenticated identity and sanitized fields; duplicates cannot overwrite", async () => {
    const first = await route.POST(request(batch({ details: { mode: "free", body: "secret", error_code: "PGRST204" } })));
    assert.equal(first.status, 200);
    assert.equal(first.headers["Cache-Control"], "no-store, max-age=0");
    assert.equal(state.rows.get(eventId).user_id, userId);
    assert.equal(state.rows.get(eventId).campaign_key, schema.OBSERVATION_CAMPAIGN);
    assert.equal(JSON.stringify(state.rows.get(eventId).details), '{"mode":"free","error_code":"PGRST204"}');
    await route.POST(request(batch({ event_name: "save_ok", details: { mode: "photo" } })));
    assert.equal(state.rows.size, 1);
    assert.equal(state.rows.get(eventId).event_name, "retry_clicked");
  });
  await check("database failures and per-user receive rate fail closed", async () => {
    state.dbError = true;
    assert.equal((await route.POST(request(batch()))).status, 503);
    state.dbError = false; state.count = 240;
    assert.equal((await route.POST(request(batch()))).status, 429);
    assert.equal(state.rows.size, 0);
  });
  console.log(`${checks} ingestion boundary checks passed; no live database used.`);
})().catch((error) => { console.error(error); process.exitCode = 1; });

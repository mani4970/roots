/* Isolated storage regression checks: real PostgREST SDK, fake transport only. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { createClient } = require("@supabase/supabase-js");

const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const id = "33333333-3333-4333-8333-333333333333";
const base = { id, user_id: owner, entry_date: "2026-11-14", items: ["Private note"], revision: 1,
  created_at: "2026-11-14T08:00:00Z", updated_at: "2026-11-14T08:00:00Z" };
let sessionOwner = owner;
let sessionDelay;
let responses = [];
let requests = [];
let deadlineMs = 12000;
const realClient = createClient("https://gratitude.invalid", "test-anon-key", {
  accessToken: async () => "test-access-token",
  global: { fetch: async (input, init) => {
    const request = { url: new URL(String(input)), ...init };
    requests.push(request);
    const response = responses.shift();
    assert.ok(response, "unexpected SDK request");
    if (typeof response === "function") return response(request);
    return new Response(JSON.stringify(response.body), {
      status: response.status ?? 200, headers: { "content-type": "application/json" },
    });
  } },
});
const client = {
  auth: { getSession: async () => {
    if (sessionDelay) await sessionDelay;
    return { data: { session: sessionOwner ? { user: { id: sessionOwner } } : null }, error: null };
  } },
  from: (...args) => realClient.from(...args),
};
const moduleObject = { exports: {} };
const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, "../lib/gratitude.ts"), "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
vm.runInNewContext(source, {
  module: moduleObject, exports: moduleObject.exports,
  require: name => name === "@/lib/supabase" ? { createClient: () => client } : require(name),
  AbortController,
  setTimeout: (callback, ms) => setTimeout(callback, ms === 12000 ? deadlineMs : ms), clearTimeout,
});
const api = moduleObject.exports;
const reset = () => { responses = []; requests = []; sessionOwner = owner; sessionDelay = undefined; deadlineMs = 12000; };
const rejectCode = (promise, code) => assert.rejects(promise, error => error.name === "GratitudeError" && error.code === code);
let passed = 0;
async function check(name, run) { reset(); await run(); assert.equal(responses.length, 0); passed++; console.log(`PASS ${name}`); }

(async () => {
  await check("account switch blocks both reads and writes before transport", async () => {
    sessionOwner = other;
    await rejectCode(api.getGratitudeEntry(owner, base.entry_date), "auth");
    await rejectCode(api.saveGratitudeEntry(owner, base.entry_date, ["Note"], null), "auth");
    assert.equal(requests.length, 0);
  });
  await check("empty day is distinct from load failure and reads are owner/date scoped", async () => {
    responses.push({ body: [] });
    assert.equal(await api.getGratitudeEntry(owner, base.entry_date), null);
    assert.equal(requests[0].url.searchParams.get("user_id"), `eq.${owner}`);
    assert.equal(requests[0].url.searchParams.get("entry_date"), "eq.2026-11-14");
    responses.push({ status: 500, body: { message: "private server detail" } });
    await rejectCode(api.getGratitudeEntry(owner, base.entry_date), "load");
  });
  await check("history excludes today and paginates strictly by date newest first", async () => {
    responses.push({ body: [{ ...base, entry_date: "2026-11-13" }, { ...base, entry_date: "2026-11-12" }] });
    const entries = await api.listGratitudeEntries(owner, base.entry_date, 2);
    assert.equal(entries.length, 2);
    assert.equal(requests[0].url.searchParams.get("entry_date"), "lt.2026-11-14");
    assert.equal(requests[0].url.searchParams.get("order"), "entry_date.desc");
    assert.equal(requests[0].url.searchParams.get("limit"), "2");
  });
  await check("new save trims entries, skips empty added fields, and never upserts", async () => {
    responses.push({ status: 201, body: [{ ...base, items: ["First", "Second"] }] });
    await api.saveGratitudeEntry(owner, base.entry_date, [" First ", "  ", "Second"], null);
    assert.equal(requests[0].method, "POST");
    assert.deepEqual(JSON.parse(requests[0].body), { user_id: owner, entry_date: base.entry_date, items: ["First", "Second"] });
    assert.ok(!String(new Headers(requests[0].headers).get("Prefer")).includes("merge-duplicates"));
  });
  await check("updates only write items and require the read row id and revision", async () => {
    responses.push({ body: [{ ...base, items: ["Changed"], revision: 2 }] });
    const entry = await api.saveGratitudeEntry(owner, base.entry_date, ["Changed"], base);
    assert.equal(entry.revision, 2);
    assert.equal(requests[0].method, "PATCH");
    assert.deepEqual(JSON.parse(requests[0].body), { items: ["Changed"] });
    assert.equal(requests[0].url.searchParams.get("id"), `eq.${id}`);
    assert.equal(requests[0].url.searchParams.get("revision"), "eq.1");
  });
  await check("stale updates and concurrent first saves report conflict without overwriting", async () => {
    responses.push({ body: [] });
    await rejectCode(api.saveGratitudeEntry(owner, base.entry_date, ["Changed"], base), "conflict");
    responses.push({ status: 409, body: { code: "23505", message: "duplicate" } });
    await rejectCode(api.saveGratitudeEntry(owner, base.entry_date, ["Changed"], null), "conflict");
  });
  await check("deletion is conditional and an already-changed entry is not silently removed", async () => {
    responses.push({ body: [] });
    await rejectCode(api.deleteGratitudeEntry(owner, base), "conflict");
    assert.equal(requests[0].url.searchParams.get("revision"), "eq.1");
    responses.push({ body: [{ id }] });
    await api.deleteGratitudeEntry(owner, base);
    assert.equal(requests[1].method, "DELETE");
  });
  await check("invalid date, owner, empty content and oversized content never issue writes", async () => {
    await rejectCode(api.saveGratitudeEntry(owner, "2026-02-30", ["Note"], null), "invalid");
    await rejectCode(api.saveGratitudeEntry(owner, base.entry_date, [" "], null), "invalid");
    await rejectCode(api.saveGratitudeEntry(owner, base.entry_date, ["x".repeat(2001)], null), "invalid");
    await rejectCode(api.saveGratitudeEntry(owner, base.entry_date, ["Note"], { ...base, user_id: other }), "invalid");
    assert.equal(requests.length, 0);
  });
  await check("untrusted response ownership or ordering is rejected", async () => {
    responses.push({ body: [{ ...base, user_id: other }] });
    await rejectCode(api.getGratitudeEntry(owner, base.entry_date), "load");
    responses.push({ body: [{ ...base, entry_date: "2026-11-13" }, { ...base, entry_date: "2026-11-13" }] });
    await rejectCode(api.listGratitudeEntries(owner, base.entry_date), "load");
  });
  await check("request deadline aborts the actual SDK transport and releases the caller", async () => {
    deadlineMs = 15;
    let aborted = false;
    responses.push(request => new Promise((resolve, reject) => request.signal.addEventListener("abort", () => {
      aborted = true; reject(new Error("aborted"));
    })));
    await rejectCode(api.getGratitudeEntry(owner, base.entry_date), "load");
    assert.equal(aborted, true);
  });
  await check("late auth completion cannot start a write after its deadline", async () => {
    deadlineMs = 15;
    let release;
    sessionDelay = new Promise(resolve => { release = resolve; });
    await rejectCode(api.saveGratitudeEntry(owner, base.entry_date, ["Note"], null), "save");
    release();
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(requests.length, 0);
  });
  console.log(`${passed} gratitude storage checks passed; only transport and cached session are mocked. No live database calls.`);
})().catch(error => { console.error(error); process.exitCode = 1; });

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
let cacheNow;
let sessionReads = 0;
const realClient = createClient("https://gratitude.invalid", "test-anon-key", {
  accessToken: async () => "test-access-token",
  global: { fetch: async (input, init) => {
    const request = { url: new URL(String(input)), ...init };
    requests.push(request);
    const response = responses.shift();
    assert.ok(response, "unexpected SDK request");
    if (typeof response === "function") return response(request);
    return new Response(request.method === "HEAD" ? null : JSON.stringify(response.body), {
      status: response.status ?? 200, headers: { "content-type": "application/json", ...response.headers },
    });
  } },
});
const client = {
  auth: { getSession: async () => {
    sessionReads++;
    if (sessionDelay) await sessionDelay;
    return { data: { session: sessionOwner ? { user: { id: sessionOwner } } : null }, error: null };
  } },
  from: (...args) => realClient.from(...args),
};
const moduleObject = { exports: {} };
const cacheModule = { exports: {} };
const cacheSource = ts.transpileModule(fs.readFileSync(path.join(__dirname, "../lib/gratitudeEntryCache.ts"), "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
vm.runInNewContext(cacheSource, {
  module: cacheModule, exports: cacheModule.exports, require,
  Date: class extends Date { static now() { return cacheNow ?? Date.now(); } },
});
const cache = cacheModule.exports;
const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, "../lib/gratitude.ts"), "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
vm.runInNewContext(source, {
  module: moduleObject, exports: moduleObject.exports,
  require: name => name === "@/lib/supabase" ? { createClient: () => client }
    : name === "@/lib/gratitudeEntryCache" ? cache : require(name),
  AbortController,
  setTimeout: (callback, ms) => setTimeout(callback, ms === 12000 ? deadlineMs : ms), clearTimeout,
});
const api = moduleObject.exports;
const reset = () => {
  responses = []; requests = []; sessionOwner = owner; sessionDelay = undefined; deadlineMs = 12000;
  cacheNow = undefined; sessionReads = 0; cache.setGratitudeCacheOwner(null);
};
const rejectCode = (promise, code) => assert.rejects(promise, error => error.name === "GratitudeError" && error.code === code);
let passed = 0;
async function check(name, run) { reset(); await run(); assert.equal(responses.length, 0); passed++; console.log(`PASS ${name}`); }

(async () => {
  await check("account switch blocks both reads and writes before transport", async () => {
    sessionOwner = other;
    await rejectCode(api.getGratitudeEntry(owner, base.entry_date), "auth");
    await rejectCode(api.countGratitudeEntries(owner), "auth");
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
  await check("saved-day count uses owner-scoped exact HEAD and returns no gratitude contents", async () => {
    responses.push({ headers: { "content-range": "0-2/3" } });
    assert.equal(await api.countGratitudeEntries(owner), 3);
    const request = requests[0];
    assert.equal(request.method, "HEAD");
    assert.equal(request.url.searchParams.get("user_id"), `eq.${owner}`);
    assert.equal(request.url.searchParams.get("select"), "id");
    assert.equal(request.url.searchParams.has("entry_date"), false);
    assert.equal(request.url.searchParams.has("limit"), false);
    assert.ok(new Headers(request.headers).get("Prefer").includes("count=exact"));
    assert.equal(request.body, undefined);
  });
  await check("zero saved days is valid while absent, invalid, and failed counts are errors", async () => {
    responses.push({ headers: { "content-range": "*/0" } });
    assert.equal(await api.countGratitudeEntries(owner), 0);
    for (const headers of [{}, { "content-range": "*/invalid" }, { "content-range": "*/-1" },
      { "content-range": "*/9007199254740992" }]) {
      responses.push({ headers });
      await rejectCode(api.countGratitudeEntries(owner), "load");
    }
    responses.push({ status: 500 });
    await rejectCode(api.countGratitudeEntries(owner), "load");
  });
  await check("invalid count owner is rejected without a database request", async () => {
    await rejectCode(api.countGratitudeEntries("not-a-user"), "invalid");
    assert.equal(requests.length, 0);
  });
  await check("count deadline aborts HEAD transport instead of becoming a false zero", async () => {
    deadlineMs = 15;
    let aborted = false;
    responses.push(request => new Promise((resolve, reject) => request.signal.addEventListener("abort", () => {
      aborted = true; reject(new Error("aborted"));
    })));
    await rejectCode(api.countGratitudeEntries(owner), "load");
    assert.equal(requests[0].method, "HEAD");
    assert.equal(aborted, true);
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
  const responseFor = body => new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
  const tick = () => new Promise(resolve => setImmediate(resolve));
  await check("prefetch and two editors share one request; confirmed empty skips transport but not auth", async () => {
    cache.setGratitudeCacheOwner(owner);
    let release;
    responses.push(() => new Promise(resolve => { release = resolve; }));
    const first = api.getGratitudeEntry(owner, base.entry_date);
    const second = api.getGratitudeEntry(owner, base.entry_date);
    await tick();
    assert.equal(requests.length, 1);
    release(responseFor([]));
    assert.deepEqual(await Promise.all([first, second]), [null, null]);
    assert.equal(cache.readGratitudeEntryCache(owner, base.entry_date).entry, null);
    assert.equal(await api.getGratitudeEntry(owner, base.entry_date), null);
    assert.equal(requests.length, 1);
    assert.equal(sessionReads, 3);
  });
  await check("a shared read timeout releases every consumer and a later retry can succeed", async () => {
    cache.setGratitudeCacheOwner(owner);
    deadlineMs = 15;
    let aborted = false;
    responses.push(request => new Promise((resolve, reject) => request.signal.addEventListener("abort", () => {
      aborted = true; reject(new Error("aborted"));
    })));
    await Promise.all([
      rejectCode(api.getGratitudeEntry(owner, base.entry_date), "load"),
      rejectCode(api.getGratitudeEntry(owner, base.entry_date), "load"),
    ]);
    assert.equal(aborted, true);
    assert.equal(requests.length, 1);
    assert.equal(api.readGratitudeEntryCache(owner, base.entry_date), null);
    deadlineMs = 12000;
    responses.push({ body: [] });
    assert.equal(await api.getGratitudeEntry(owner, base.entry_date), null);
  });
  await check("cache TTL, explicit force reload, and copied items cannot expose stale mutable data", async () => {
    cache.setGratitudeCacheOwner(owner);
    cacheNow = 1000;
    responses.push({ body: [base] });
    const loaded = await api.getGratitudeEntry(owner, base.entry_date);
    loaded.items[0] = "caller edit";
    const snapshot = api.readGratitudeEntryCache(owner, base.entry_date);
    snapshot.entry.items[0] = "snapshot edit";
    assert.equal((await api.getGratitudeEntry(owner, base.entry_date)).items[0], base.items[0]);
    responses.push({ body: [{ ...base, revision: 2, items: ["Remote edit"] }] });
    assert.equal((await api.getGratitudeEntry(owner, base.entry_date, { force: true })).revision, 2);
    cacheNow += cache.GRATITUDE_ENTRY_CACHE_TTL_MS;
    assert.equal(api.readGratitudeEntryCache(owner, base.entry_date), null);
    responses.push({ body: [] });
    assert.equal(await api.getGratitudeEntry(owner, base.entry_date), null);
    assert.equal(requests.length, 3);
  });
  await check("cached reads still reject a changed session and clear private snapshots", async () => {
    cache.setGratitudeCacheOwner(owner);
    responses.push({ body: [base] });
    await api.getGratitudeEntry(owner, base.entry_date);
    sessionOwner = other;
    await rejectCode(api.getGratitudeEntry(owner, base.entry_date), "auth");
    assert.equal(api.readGratitudeEntryCache(owner, base.entry_date), null);
    assert.equal(requests.length, 1);
  });
  await check("failed reads are not cached and another date never reuses today's entry", async () => {
    cache.setGratitudeCacheOwner(owner);
    responses.push({ status: 500, body: {} });
    await rejectCode(api.getGratitudeEntry(owner, base.entry_date), "load");
    assert.equal(api.readGratitudeEntryCache(owner, base.entry_date), null);
    responses.push({ body: [base] });
    await api.getGratitudeEntry(owner, base.entry_date);
    assert.equal(api.readGratitudeEntryCache(owner, "2026-11-15"), null);
    responses.push({ body: [] });
    assert.equal(await api.getGratitudeEntry(owner, "2026-11-15"), null);
  });
  await check("late prefetch cannot replace a successful edit or restore a deleted day", async () => {
    cache.setGratitudeCacheOwner(owner);
    let release;
    responses.push(() => new Promise(resolve => { release = resolve; }));
    const pending = api.getGratitudeEntry(owner, base.entry_date);
    await tick();
    responses.push({ body: [{ ...base, items: ["New edit"], revision: 2 }] });
    const saved = await api.saveGratitudeEntry(owner, base.entry_date, ["New edit"], base);
    release(responseFor([base]));
    assert.equal((await pending).revision, 2);
    assert.equal(api.readGratitudeEntryCache(owner, base.entry_date).entry.items[0], "New edit");
    cache.clearGratitudeEntryCache(owner);
    responses.push(() => new Promise(resolve => { release = resolve; }));
    const beforeDelete = api.getGratitudeEntry(owner, base.entry_date);
    await tick();
    responses.push({ body: [{ id }] });
    await api.deleteGratitudeEntry(owner, saved);
    release(responseFor([saved]));
    assert.equal(await beforeDelete, null);
    assert.equal(api.readGratitudeEntryCache(owner, base.entry_date).entry, null);
  });
  await check("a read started during a write cannot overwrite the completed write", async () => {
    cache.setGratitudeCacheOwner(owner);
    let releaseWrite, releaseRead;
    responses.push(() => new Promise(resolve => { releaseWrite = resolve; }));
    const saving = api.saveGratitudeEntry(owner, base.entry_date, ["Updated"], base);
    await tick();
    responses.push(() => new Promise(resolve => { releaseRead = resolve; }));
    const reading = api.getGratitudeEntry(owner, base.entry_date);
    await tick();
    releaseWrite(responseFor([{ ...base, items: ["Updated"], revision: 2 }]));
    await saving;
    releaseRead(responseFor([base]));
    assert.equal((await reading).revision, 2);
    assert.equal(api.readGratitudeEntryCache(owner, base.entry_date).entry.revision, 2);
  });
  await check("resume invalidation joins the new request, even if the stale request fails", async () => {
    for (const failOld of [false, true]) {
      cache.clearGratitudeEntryCache(owner);
      cache.setGratitudeCacheOwner(owner);
      let releaseOld, releaseNew;
      responses.push(() => new Promise(resolve => { releaseOld = resolve; }));
      const oldRead = api.getGratitudeEntry(owner, base.entry_date);
      await tick();
      cache.clearGratitudeEntryCache(owner);
      responses.push(() => new Promise(resolve => { releaseNew = resolve; }));
      const newRead = api.getGratitudeEntry(owner, base.entry_date);
      await tick();
      releaseOld(failOld ? new Response("{}", { status: 500 }) : responseFor([]));
      releaseNew(responseFor([{ ...base, revision: 3 }]));
      assert.equal((await oldRead).revision, 3);
      assert.equal((await newRead).revision, 3);
    }
    assert.equal(requests.length, 4);
  });
  await check("a write completing across resume invalidation wins over the resumed prefetch", async () => {
    cache.setGratitudeCacheOwner(owner);
    let releaseWrite, releaseRead;
    responses.push(() => new Promise(resolve => { releaseWrite = resolve; }));
    const saving = api.saveGratitudeEntry(owner, base.entry_date, ["Updated on resume"], base);
    await tick();
    cache.clearGratitudeEntryCache(owner);
    responses.push(() => new Promise(resolve => { releaseRead = resolve; }));
    const reading = api.getGratitudeEntry(owner, base.entry_date);
    await tick();
    releaseWrite(responseFor([{ ...base, items: ["Updated on resume"], revision: 2 }]));
    await saving;
    releaseRead(responseFor([base]));
    assert.equal((await reading).revision, 2);
    assert.equal(api.readGratitudeEntryCache(owner, base.entry_date).entry.revision, 2);
  });
  await check("logout and A-to-B-to-A switching cannot revive an older account epoch", async () => {
    cache.setGratitudeCacheOwner(owner);
    let release;
    responses.push(() => new Promise(resolve => { release = resolve; }));
    const pending = api.getGratitudeEntry(owner, base.entry_date);
    const rejected = rejectCode(pending, "load");
    await tick();
    cache.setGratitudeCacheOwner(null);
    cache.setGratitudeCacheOwner(other);
    assert.equal(api.readGratitudeEntryCache(owner, base.entry_date), null);
    cache.setGratitudeCacheOwner(owner);
    release(responseFor([base]));
    await rejected;
    assert.equal(api.readGratitudeEntryCache(owner, base.entry_date), null);
  });
  await check("a stale write conflict leaves no cached copy and force reload gets latest revision", async () => {
    cache.setGratitudeCacheOwner(owner);
    responses.push({ body: [base] });
    await api.getGratitudeEntry(owner, base.entry_date);
    responses.push({ body: [] });
    await rejectCode(api.saveGratitudeEntry(owner, base.entry_date, ["Changed"], base), "conflict");
    assert.equal(api.readGratitudeEntryCache(owner, base.entry_date), null);
    responses.push({ body: [{ ...base, revision: 4 }] });
    assert.equal((await api.getGratitudeEntry(owner, base.entry_date, { force: true })).revision, 4);
  });
  console.log(`${passed} gratitude storage checks passed; only transport and cached session are mocked. No live database calls.`);
})().catch(error => { console.error(error); process.exitCode = 1; });

/* Use the real cache module with isolated browser storage and controlled reads. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, "../lib/gratitudeCountCache.ts"), "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;

function createBrowser() {
  let now = Date.parse("2026-11-17T10:00:00Z");
  const storage = new Map();
  const localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  };
  return {
    advance(ms) { now += ms; },
    load() {
      const module = { exports: {} };
      vm.runInNewContext(source, {
        module, exports: module.exports, window: { localStorage },
        Date: class extends Date { static now() { return now; } },
      });
      return module.exports;
    },
  };
}

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

test("an app reload restores +3 before the first background request resolves", async () => {
  const browser = createBrowser();
  await browser.load().refreshCachedGratitudeCount(owner, async () => 3);
  const cache = browser.load();
  const response = deferred();
  const next = cache.refreshCachedGratitudeCount(owner, () => response.promise);
  assert.equal(cache.readCachedGratitudeCount(owner)?.days, 3);
  assert.equal(cache.readCachedGratitudeCount(other), null);
  response.resolve(4);
  assert.equal((await next)?.days, 4);
});

test("a fresh in-memory count survives home remount without another fetch", async () => {
  const browser = createBrowser();
  const cache = browser.load();
  let reads = 0;
  const read = async () => ++reads + 2;
  await cache.refreshCachedGratitudeCount(owner, read);
  assert.equal((await cache.refreshCachedGratitudeCount(owner, read))?.days, 3);
  assert.equal(reads, 1);
  browser.advance(60_000);
  assert.equal((await cache.refreshCachedGratitudeCount(owner, read))?.days, 4);
  assert.equal(reads, 2);
});

test("simultaneous foreground reads share one request even when forced", async () => {
  const cache = createBrowser().load();
  let reads = 0;
  const response = deferred();
  const read = () => { reads++; return response.promise; };
  const first = cache.refreshCachedGratitudeCount(owner, read, { force: true });
  const second = cache.refreshCachedGratitudeCount(owner, read, { force: true });
  response.resolve(3);
  assert.equal((await first)?.days, 3);
  assert.equal((await second)?.days, 3);
  assert.equal(reads, 1);
});

test("a read started before saving cannot replace the updated count", async () => {
  const cache = createBrowser().load();
  await cache.refreshCachedGratitudeCount(owner, async () => 3);
  const previous = deferred();
  const olderRead = cache.refreshCachedGratitudeCount(owner, () => previous.promise, { force: true });
  cache.invalidateGratitudeCount(owner);
  assert.equal(cache.readCachedGratitudeCount(owner)?.days, 3);
  assert.equal((await cache.refreshCachedGratitudeCount(owner, async () => 4))?.days, 4);
  previous.resolve(3);
  await olderRead;
  assert.equal(cache.readCachedGratitudeCount(owner)?.days, 4);
});

test("a failed background read preserves +3 and a successful deletion can reach zero", async () => {
  const cache = createBrowser().load();
  await cache.refreshCachedGratitudeCount(owner, async () => 3);
  await assert.rejects(cache.refreshCachedGratitudeCount(owner, async () => { throw new Error("offline"); }, { force: true }), /offline/);
  assert.equal(cache.readCachedGratitudeCount(owner)?.days, 3);
  cache.invalidateGratitudeCount(owner);
  await cache.refreshCachedGratitudeCount(owner, async () => 0);
  assert.equal(cache.readCachedGratitudeCount(owner)?.days, 0);
});

test("clearing one owner wipes its persisted estimate and discards its pending read", async () => {
  const browser = createBrowser();
  const cache = browser.load();
  await cache.refreshCachedGratitudeCount(owner, async () => 3);
  await cache.refreshCachedGratitudeCount(other, async () => 9);
  const previous = deferred();
  const olderRead = cache.refreshCachedGratitudeCount(owner, () => previous.promise, { force: true });
  cache.clearGratitudeCount(owner);
  previous.resolve(4);
  await olderRead;
  assert.equal(cache.readCachedGratitudeCount(owner), null);
  const reloaded = browser.load();
  assert.equal(reloaded.readCachedGratitudeCount(owner), null);
  assert.equal(reloaded.readCachedGratitudeCount(other)?.days, 9);
});

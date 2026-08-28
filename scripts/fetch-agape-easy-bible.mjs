#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import {
  AGAPE_EASY_BIBLE_BOOKS,
  AGAPE_EASY_BIBLE_CACHE_DIR,
  AGAPE_EASY_BIBLE_COPYRIGHT_NOTICE,
  AGAPE_EASY_BIBLE_DATA_DIR,
  AGAPE_EASY_BIBLE_EXPECTED_BOOKS,
  AGAPE_EASY_BIBLE_EXPECTED_CHAPTERS,
  AGAPE_EASY_BIBLE_EXPECTED_ROWS,
  AGAPE_EASY_BIBLE_EXPECTED_VERSES,
  AGAPE_EASY_BIBLE_MANUAL_OVERRIDES_PATH,
  AGAPE_EASY_BIBLE_MANUAL_VERSES,
  AGAPE_EASY_BIBLE_NAME,
  AGAPE_EASY_BIBLE_SOURCE_BRIDGES,
  AGAPE_EASY_BIBLE_TRANSLATION_CODE,
  AGAPE_EASY_BIBLE_TRANSLATION_ID,
  canonicalEasyBibleRow,
  getManualVersesForChapter,
  getSourceBridge,
  normalizeEasyBibleText,
  readIntegerOption,
  readStringOption,
  sha256File,
  validateEasyBibleChapterCoverage,
  validateEasyBibleRow,
} from "./agape-easy-bible-common.mjs";

const DEFAULT_API_BASE_URL = "https://bible.asher.design/api/v1";
const FETCH_TIMEOUT_MS = 30_000;
const MAX_FETCH_ATTEMPTS = 5;

const apiBaseUrl = (process.env.BIBLE_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL).replace(/\/+$/, "");
const outputDir = resolve(readStringOption("output", AGAPE_EASY_BIBLE_DATA_DIR));
const cacheDir = resolve(readStringOption("cache", AGAPE_EASY_BIBLE_CACHE_DIR));
const manualOverridesPath = resolve(
  readStringOption("manual-overrides", AGAPE_EASY_BIBLE_MANUAL_OVERRIDES_PATH),
);
const concurrency = readIntegerOption("concurrency", 4, { min: 1, max: 16 });
const requestDelayMs = readIntegerOption("delay-ms", 80, { min: 0, max: 10_000 });
const force = process.argv.includes("--force");
const probe = readStringOption("probe", "");
const inspect = readStringOption("inspect", "");
const inspectFull = process.argv.includes("--inspect-full");
const scanVersification = process.argv.includes("--scan-versification");
const prepareManualOverrides = process.argv.includes("--prepare-manual-overrides");

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function getApiHeaders() {
  const authorization = process.env.BIBLE_API_AUTHORIZATION?.trim();
  if (!authorization) {
    throw new Error(
      "Missing BIBLE_API_AUTHORIZATION. Run with Node --env-file=.env.local or export the server API secret first.",
    );
  }

  return {
    Accept: "application/json",
    "X-API-Key-ID": process.env.BIBLE_API_KEY_ID?.trim() || "roots-puce",
    Authorization: authorization,
    "X-Client-Type": process.env.BIBLE_API_CLIENT_TYPE?.trim() || "local-corpus-import",
    "X-App-Name": process.env.BIBLE_API_APP_NAME?.trim() || "Christian Roots",
    "X-App-Version": process.env.BIBLE_API_APP_VERSION?.trim() || "2.2.0",
  };
}

function buildVerseRangeUrl(book, chapter, startVerse, endVerse) {
  const url = new URL("verse.php", `${apiBaseUrl}/`);
  url.searchParams.set("translation", String(AGAPE_EASY_BIBLE_TRANSLATION_ID));
  url.searchParams.set("book", String(book.number));
  url.searchParams.set("chapter", String(chapter));
  url.searchParams.set("verse", String(startVerse));
  if (endVerse > startVerse) {
    url.searchParams.set("verse_to", String(endVerse));
  }
  return url.toString();
}

function buildChapterUrl(book, chapter, maxVerse) {
  return buildVerseRangeUrl(book, chapter, 1, maxVerse);
}

async function fetchJsonWithRetry(url) {
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        headers: getApiHeaders(),
        redirect: "follow",
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`HTTP ${response.status}: ${body.slice(0, 240)}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < MAX_FETCH_ATTEMPTS) {
        await sleep(500 * 2 ** (attempt - 1));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(`Failed after ${MAX_FETCH_ATTEMPTS} attempts: ${String(lastError)}`);
}


function getMissingVerseNumbers(payload, maxVerse) {
  if (!payload || payload.ok !== true || !Array.isArray(payload.data?.gospel)) return [];
  const present = new Set(
    payload.data.gospel
      .map((item) => Number(item?.verse))
      .filter((verse) => Number.isSafeInteger(verse) && verse >= 1 && verse <= maxVerse),
  );
  return Array.from({ length: maxVerse }, (_, index) => index + 1)
    .filter((verse) => !present.has(verse));
}

async function recoverMissingVerses(payload, book, chapter, maxVerse) {
  const missing = getMissingVerseNumbers(payload, maxVerse);
  if (missing.length === 0) return payload;
  if (missing.length > 8) return payload;

  const recoveredItems = [];
  for (const verse of missing) {
    const verseUrl = buildVerseRangeUrl(book, chapter, verse, verse);
    const versePayload = await fetchJsonWithRetry(verseUrl);
    if (!versePayload || versePayload.ok !== true || !Array.isArray(versePayload.data?.gospel)) {
      continue;
    }
    const item = versePayload.data.gospel.find((candidate) => Number(candidate?.verse) === verse);
    if (item) recoveredItems.push(item);
  }

  if (recoveredItems.length === 0) return payload;
  return {
    ...payload,
    data: {
      ...payload.data,
      gospel: [...payload.data.gospel, ...recoveredItems],
    },
  };
}


async function loadManualOverrides() {
  if (!await pathExists(manualOverridesPath)) return new Map();
  const payload = JSON.parse(await readFile(manualOverridesPath, "utf8"));
  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    throw new Error(`Unexpected Easy Bible manual override file: ${manualOverridesPath}`);
  }

  const result = new Map();
  for (const item of AGAPE_EASY_BIBLE_MANUAL_VERSES) {
    const text = normalizeEasyBibleText(payload[item.key]);
    if (text) result.set(item.key, text);
  }
  return result;
}

function assertRequiredManualOverrides(manualOverrides) {
  const missing = AGAPE_EASY_BIBLE_MANUAL_VERSES
    .filter((item) => !manualOverrides.get(item.key))
    .map((item) => item.key);
  if (missing.length > 0) {
    throw new Error(
      `Missing purchased Easy Bible manual verse override(s): ${missing.join(", ")}. ` +
      `Run npm run bible:fetch:easy -- --prepare-manual-overrides, paste the exact purchased text into ${manualOverridesPath}, then retry.`,
    );
  }
}

async function runPrepareManualOverrides() {
  if (!prepareManualOverrides) return false;
  await mkdir(dirname(manualOverridesPath), { recursive: true });
  if (!await pathExists(manualOverridesPath)) {
    const template = Object.fromEntries(
      AGAPE_EASY_BIBLE_MANUAL_VERSES.map((item) => [item.key, ""]),
    );
    await writeFile(manualOverridesPath, `${JSON.stringify(template, null, 2)}\n`, "utf8");
    console.log(`Created Easy Bible manual override template: ${manualOverridesPath}`);
  } else {
    console.log(`Easy Bible manual override file already exists: ${manualOverridesPath}`);
  }
  console.log("Paste only the exact purchased Easy Bible text for the listed verse(s). This file stays under .cache and must not be committed.");
  return true;
}

function mapSourceVerseRange(book, chapter, sourceVerse) {
  const bridge = getSourceBridge(book.number, chapter);
  if (bridge) {
    const width = bridge.verse_end - bridge.verse_start;
    if (sourceVerse < bridge.source_verse) return [sourceVerse, sourceVerse];
    if (sourceVerse === bridge.source_verse) return [bridge.verse_start, bridge.verse_end];
    return [sourceVerse + width, sourceVerse + width];
  }

  const manualVerses = getManualVersesForChapter(book.number, chapter);
  if (manualVerses.length > 0) {
    const firstManualVerse = manualVerses[0].verse_start;
    const shift = manualVerses.length;
    if (sourceVerse < firstManualVerse) return [sourceVerse, sourceVerse];
    return [sourceVerse + shift, sourceVerse + shift];
  }

  return [sourceVerse, sourceVerse];
}

function getExpectedSourceItemCount(book, chapter, maxVerse) {
  const bridge = getSourceBridge(book.number, chapter);
  if (bridge) return maxVerse - (bridge.verse_end - bridge.verse_start);
  return maxVerse - getManualVersesForChapter(book.number, chapter).length;
}

function normalizeApiChapter(payload, book, chapter, maxVerse, sourceUrl, manualOverrides = new Map()) {
  if (!payload || payload.ok !== true || !Array.isArray(payload.data?.gospel)) {
    throw new Error(`Unexpected Easy Bible API payload at ${sourceUrl}`);
  }

  const expectedSourceItems = getExpectedSourceItemCount(book, chapter, maxVerse);
  const bySourceVerse = new Map();
  for (const item of payload.data.gospel) {
    const sourceVerse = Number(item?.verse);
    const text = normalizeEasyBibleText(item?.text);
    if (
      !Number.isSafeInteger(sourceVerse) ||
      sourceVerse < 1 ||
      sourceVerse > expectedSourceItems ||
      !text
    ) {
      throw new Error(
        `Invalid Easy Bible API verse at ${book.code}.${chapter}: ${JSON.stringify(item).slice(0, 400)}`,
      );
    }
    if (bySourceVerse.has(sourceVerse)) {
      throw new Error(`Duplicate Easy Bible source verse ${book.code}.${chapter}.${sourceVerse}`);
    }
    bySourceVerse.set(sourceVerse, text);
  }

  if (bySourceVerse.size !== expectedSourceItems) {
    throw new Error(
      `Unexpected Easy Bible source chapter size for ${book.code}.${chapter}: ${bySourceVerse.size}/${expectedSourceItems}`,
    );
  }

  const rows = [];
  for (let sourceVerse = 1; sourceVerse <= expectedSourceItems; sourceVerse += 1) {
    const text = bySourceVerse.get(sourceVerse);
    if (!text) {
      throw new Error(`Missing Easy Bible source item ${book.code}.${chapter}.${sourceVerse}`);
    }
    const [verseStart, verseEnd] = mapSourceVerseRange(book, chapter, sourceVerse);
    rows.push(validateEasyBibleRow({
      translation_id: AGAPE_EASY_BIBLE_TRANSLATION_ID,
      translation_code: AGAPE_EASY_BIBLE_TRANSLATION_CODE,
      book_number: book.number,
      book_code: book.code,
      chapter,
      verse_start: verseStart,
      verse_end: verseEnd,
      text,
    }, {
      bookNumber: book.number,
      bookCode: book.code,
      chapter,
      verseStart,
      verseEnd,
    }));
  }

  for (const manualVerse of getManualVersesForChapter(book.number, chapter)) {
    const text = normalizeEasyBibleText(manualOverrides.get(manualVerse.key));
    if (!text) {
      throw new Error(
        `Missing required purchased-text override ${manualVerse.key} in ${manualOverridesPath}`,
      );
    }
    rows.push(validateEasyBibleRow({
      translation_id: AGAPE_EASY_BIBLE_TRANSLATION_ID,
      translation_code: AGAPE_EASY_BIBLE_TRANSLATION_CODE,
      book_number: book.number,
      book_code: book.code,
      chapter,
      verse_start: manualVerse.verse_start,
      verse_end: manualVerse.verse_end,
      text,
    }, {
      bookNumber: book.number,
      bookCode: book.code,
      chapter,
      verseStart: manualVerse.verse_start,
      verseEnd: manualVerse.verse_end,
    }));
  }

  rows.sort((left, right) => left.verse_start - right.verse_start);
  return validateEasyBibleChapterCoverage(rows, book, chapter);
}

function chapterCachePath(book, chapter) {
  return join(
    cacheDir,
    String(book.number).padStart(2, "0"),
    `${book.code}.${String(chapter).padStart(3, "0")}.json`,
  );
}

async function readCachedChapter(path, book, chapter, maxVerse) {
  const payload = JSON.parse(await readFile(path, "utf8"));
  if (
    payload?.translation_id !== AGAPE_EASY_BIBLE_TRANSLATION_ID ||
    payload?.book_number !== book.number ||
    payload?.chapter !== chapter ||
    !Array.isArray(payload?.rows)
  ) {
    throw new Error(`Unexpected Easy Bible chapter cache: ${path}`);
  }
  const rows = payload.rows.map((row) => validateEasyBibleRow(row, {
    bookNumber: book.number,
    bookCode: book.code,
    chapter,
  }));
  validateEasyBibleChapterCoverage(rows, book, chapter);
  if (payload.expected_verses !== maxVerse) {
    throw new Error(`Unexpected cached canonical verse count at ${path}: ${payload.expected_verses}/${maxVerse}`);
  }
  return rows;
}

async function fetchChapter(book, chapter, { ignoreCache = false, manualOverrides = new Map() } = {}) {
  const maxVerse = book.verseCounts[chapter - 1];
  const cachePath = chapterCachePath(book, chapter);

  if (!force && !ignoreCache && await pathExists(cachePath)) {
    try {
      return await readCachedChapter(cachePath, book, chapter, maxVerse);
    } catch (error) {
      console.warn(`Ignoring invalid Easy Bible cache for ${book.code}.${chapter}: ${String(error)}`);
      await rm(cachePath, { force: true });
    }
  }

  const sourceUrl = buildChapterUrl(book, chapter, maxVerse);
  let rows = null;
  let lastValidationError = null;

  for (let validationAttempt = 1; validationAttempt <= MAX_FETCH_ATTEMPTS; validationAttempt += 1) {
    const payload = await fetchJsonWithRetry(sourceUrl);
    try {
      rows = normalizeApiChapter(payload, book, chapter, maxVerse, sourceUrl, manualOverrides);
      break;
    } catch (error) {
      lastValidationError = error;
      const missing = getMissingVerseNumbers(payload, maxVerse);
      if (missing.length > 0) {
        console.warn(
          `Incomplete Easy Bible chapter ${book.code}.${chapter} on validation attempt ${validationAttempt}/${MAX_FETCH_ATTEMPTS}; missing: ${missing.join(",")}`,
        );
        const recoveredPayload = await recoverMissingVerses(payload, book, chapter, maxVerse);
        try {
          rows = normalizeApiChapter(recoveredPayload, book, chapter, maxVerse, sourceUrl, manualOverrides);
          console.log(`Recovered Easy Bible chapter ${book.code}.${chapter} with direct verse fetch`);
          break;
        } catch (recoveryError) {
          lastValidationError = recoveryError;
        }
      }

      if (validationAttempt < MAX_FETCH_ATTEMPTS) {
        await sleep(500 * 2 ** (validationAttempt - 1));
      }
    }
  }

  if (!rows) {
    throw new Error(
      `Easy Bible chapter validation failed after ${MAX_FETCH_ATTEMPTS} attempts for ${book.code}.${chapter}: ${String(lastValidationError)}`,
    );
  }

  if (!ignoreCache) {
    await mkdir(dirname(cachePath), { recursive: true });
    const temporaryPath = `${cachePath}.tmp-${process.pid}`;
    await writeFile(temporaryPath, `${JSON.stringify({
      translation_id: AGAPE_EASY_BIBLE_TRANSLATION_ID,
      translation_code: AGAPE_EASY_BIBLE_TRANSLATION_CODE,
      book_number: book.number,
      book_code: book.code,
      book_name: book.name,
      chapter,
      expected_verses: maxVerse,
      fetched_at: new Date().toISOString(),
      rows,
    })}\n`, "utf8");
    await rename(temporaryPath, cachePath);
  }

  if (requestDelayMs > 0) await sleep(requestDelayMs);
  return rows;
}


function parseInspect(value) {
  if (!value) return null;
  const match = value.match(/^(\d{1,2}):(\d{1,3})$/);
  if (!match) throw new Error(`Invalid --inspect value: ${value}. Use --inspect=7:20`);
  const bookNumber = Number(match[1]);
  const chapter = Number(match[2]);
  const book = AGAPE_EASY_BIBLE_BOOKS[bookNumber - 1];
  if (!book || chapter < 1 || chapter > book.chapters) {
    throw new Error(`Inspect target is outside the Bible canon: ${value}`);
  }
  return { book, chapter };
}

function summarizeApiItems(payload) {
  if (!payload || payload.ok !== true || !Array.isArray(payload.data?.gospel)) {
    return { ok: false, markers: [], items: [] };
  }
  const items = payload.data.gospel.map((item) => ({
    verse: item?.verse ?? null,
    text: normalizeEasyBibleText(item?.text).slice(0, 120),
  }));
  return {
    ok: true,
    markers: items.map((item) => String(item.verse)),
    items,
  };
}

async function runInspect() {
  const parsed = parseInspect(inspect);
  if (!parsed) return false;

  const { book, chapter } = parsed;
  const maxVerse = book.verseCounts[chapter - 1];
  const chapterUrl = buildChapterUrl(book, chapter, maxVerse);
  const payload = await fetchJsonWithRetry(chapterUrl);
  const summary = summarizeApiItems(payload);
  const missing = getMissingVerseNumbers(payload, maxVerse);

  console.log("Easy Bible API raw inspect");
  console.log(`Book: ${book.number} ${book.name} (${book.code})`);
  console.log(`Chapter: ${chapter}`);
  console.log(`Canonical verses expected: ${maxVerse}`);
  console.log(`API items returned: ${summary.items.length}`);
  console.log(`Verse markers returned: ${summary.markers.join(", ") || "none"}`);
  console.log(`Missing canonical verses: ${missing.length ? missing.join(", ") : "none"}`);
  console.log(inspectFull ? "All API items:" : "Last API items:");
  const displayedItems = inspectFull ? summary.items : summary.items.slice(-6);
  for (const item of displayedItems) {
    console.log(`  verse=${JSON.stringify(item.verse)} text=${JSON.stringify(item.text)}`);
  }

  for (const verse of missing) {
    const directUrl = buildVerseRangeUrl(book, chapter, verse, verse);
    const directPayload = await fetchJsonWithRetry(directUrl);
    const directSummary = summarizeApiItems(directPayload);
    console.log(`Direct request ${book.code}.${chapter}.${verse}:`);
    console.log(`  items=${directSummary.items.length}`);
    console.log(`  markers=${directSummary.markers.join(", ") || "none"}`);
    for (const item of directSummary.items.slice(0, 6)) {
      console.log(`  verse=${JSON.stringify(item.verse)} text=${JSON.stringify(item.text)}`);
    }
  }

  return true;
}


async function runVersificationScan() {
  if (!scanVersification) return false;

  const jobs = AGAPE_EASY_BIBLE_BOOKS.flatMap((book) =>
    Array.from({ length: book.chapters }, (_, index) => ({
      book,
      chapter: index + 1,
    })),
  );
  const mismatches = [];
  let completed = 0;
  let cachedComplete = 0;
  let apiComplete = 0;
  let nextJobIndex = 0;

  console.log("Easy Bible versification scan");
  console.log(`API host: ${new URL(apiBaseUrl).host}`);
  console.log(`Jobs: ${jobs.length}`);
  console.log(`Concurrency: ${concurrency}`);
  console.log(`Cache: ${cacheDir}`);
  console.log("This scan does not create the final corpus.");

  async function scanJob(job) {
    const maxVerse = job.book.verseCounts[job.chapter - 1];
    const cachePath = chapterCachePath(job.book, job.chapter);

    if (!force && await pathExists(cachePath)) {
      try {
        await readCachedChapter(cachePath, job.book, job.chapter, maxVerse);
        cachedComplete += 1;
        return;
      } catch {
        // Fall through to the source API. Do not delete cache during a read-only scan.
      }
    }

    const sourceUrl = buildChapterUrl(job.book, job.chapter, maxVerse);
    const payload = await fetchJsonWithRetry(sourceUrl);
    const summary = summarizeApiItems(payload);
    const missing = getMissingVerseNumbers(payload, maxVerse);

    if (!summary.ok) {
      mismatches.push({
        book_number: job.book.number,
        book_code: job.book.code,
        book_name: job.book.name,
        chapter: job.chapter,
        expected_verses: maxVerse,
        api_items: 0,
        markers: [],
        missing: Array.from({ length: maxVerse }, (_, index) => index + 1),
        kind: "invalid_payload",
      });
      return;
    }

    if (missing.length === 0 && summary.items.length === maxVerse) {
      apiComplete += 1;
      return;
    }

    mismatches.push({
      book_number: job.book.number,
      book_code: job.book.code,
      book_name: job.book.name,
      chapter: job.chapter,
      expected_verses: maxVerse,
      api_items: summary.items.length,
      markers: summary.markers,
      missing,
      kind: "versification_mismatch",
    });
  }

  async function worker() {
    while (true) {
      const index = nextJobIndex;
      nextJobIndex += 1;
      if (index >= jobs.length) return;
      await scanJob(jobs[index]);
      completed += 1;
      if (completed === jobs.length || completed % 25 === 0) {
        console.log(`Scanned ${completed}/${jobs.length} chapters; mismatches=${mismatches.length}`);
      }
      if (requestDelayMs > 0) await sleep(requestDelayMs);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  mismatches.sort((left, right) =>
    left.book_number - right.book_number || left.chapter - right.chapter,
  );

  await mkdir(outputDir, { recursive: true });
  const reportPath = join(outputDir, "versification-report.json");
  const temporaryReportPath = `${reportPath}.tmp-${process.pid}`;
  await writeFile(temporaryReportPath, `${JSON.stringify({
    created_at: new Date().toISOString(),
    translation_id: AGAPE_EASY_BIBLE_TRANSLATION_ID,
    translation_code: AGAPE_EASY_BIBLE_TRANSLATION_CODE,
    total_chapters: jobs.length,
    cached_complete_chapters: cachedComplete,
    api_complete_chapters: apiComplete,
    mismatch_count: mismatches.length,
    mismatches,
  }, null, 2)}\n`, "utf8");
  await rename(temporaryReportPath, reportPath);

  console.log("Easy Bible versification scan complete");
  console.log(`Complete from cache: ${cachedComplete}`);
  console.log(`Complete from API: ${apiComplete}`);
  console.log(`Mismatched chapters: ${mismatches.length}`);
  for (const item of mismatches) {
    console.log(
      `  ${item.book_code}.${item.chapter}: expected=${item.expected_verses} api_items=${item.api_items} missing=${item.missing.join(",") || "none"}`,
    );
  }
  console.log(`Report: ${reportPath}`);
  return true;
}

function parseProbe(value) {
  if (!value) return null;
  const match = value.match(/^(\d{1,2}):(\d{1,3})$/);
  if (!match) throw new Error(`Invalid --probe value: ${value}. Use --probe=43:3`);
  const bookNumber = Number(match[1]);
  const chapter = Number(match[2]);
  const book = AGAPE_EASY_BIBLE_BOOKS[bookNumber - 1];
  if (!book || chapter < 1 || chapter > book.chapters) {
    throw new Error(`Probe is outside the Bible canon: ${value}`);
  }
  return { book, chapter };
}

async function runProbe() {
  const parsed = parseProbe(probe);
  if (!parsed) return false;
  const manualOverrides = await loadManualOverrides();
  if (getManualVersesForChapter(parsed.book.number, parsed.chapter).length > 0) {
    assertRequiredManualOverrides(manualOverrides);
  }
  const rows = await fetchChapter(parsed.book, parsed.chapter, {
    ignoreCache: true,
    manualOverrides,
  });
  console.log("Easy Bible API probe passed");
  console.log(`Book: ${parsed.book.number} ${parsed.book.name} (${parsed.book.code})`);
  console.log(`Chapter: ${parsed.chapter}`);
  console.log(`Rows: ${rows.length}`);
  console.log(`Canonical verse coverage: ${rows.reduce((sum, row) => sum + row.verse_end - row.verse_start + 1, 0)}`);
  const bridgeLabels = rows
    .filter((row) => row.verse_end > row.verse_start)
    .map((row) => `${row.verse_start}-${row.verse_end}`);
  console.log(`Verse bridges: ${bridgeLabels.join(", ") || "none"}`);
  console.log(`First: ${rows[0].verse_start} ${rows[0].text}`);
  console.log(`Last: ${rows.at(-1).verse_start === rows.at(-1).verse_end ? rows.at(-1).verse_start : `${rows.at(-1).verse_start}-${rows.at(-1).verse_end}`} ${rows.at(-1).text}`);
  return true;
}

async function writeCorpus(rows) {
  await mkdir(outputDir, { recursive: true });

  const jsonl = `${rows.map(canonicalEasyBibleRow).join("\n")}\n`;
  const contentHash = createHash("sha256").update(jsonl).digest("hex");
  const archive = gzipSync(Buffer.from(jsonl, "utf8"), { level: 9, mtime: 0 });
  const archivePath = join(outputDir, `${AGAPE_EASY_BIBLE_TRANSLATION_CODE}.jsonl.gz`);
  const temporaryArchivePath = `${archivePath}.tmp-${process.pid}`;
  await writeFile(temporaryArchivePath, archive);
  await rename(temporaryArchivePath, archivePath);

  const archiveHash = await sha256File(archivePath);
  const books = AGAPE_EASY_BIBLE_BOOKS.map((book) => {
    const bookRows = rows.filter((row) => row.book_number === book.number);
    return {
      number: book.number,
      code: book.code,
      name: book.name,
      chapters: book.chapters,
      rows: bookRows.length,
      canonical_verses: bookRows.reduce(
        (sum, row) => sum + row.verse_end - row.verse_start + 1,
        0,
      ),
    };
  });

  const manifest = {
    format_version: 1,
    created_at: new Date().toISOString(),
    source: {
      kind: "Christian Roots private Bible API",
      host: new URL(apiBaseUrl).host,
      endpoint: "verse.php",
      credentials_included: false,
    },
    translation: {
      id: AGAPE_EASY_BIBLE_TRANSLATION_ID,
      code: AGAPE_EASY_BIBLE_TRANSLATION_CODE,
      name: AGAPE_EASY_BIBLE_NAME,
      copyright_notice: AGAPE_EASY_BIBLE_COPYRIGHT_NOTICE,
    },
    total_books: books.length,
    total_chapters: AGAPE_EASY_BIBLE_EXPECTED_CHAPTERS,
    total_rows: rows.length,
    canonical_verse_coverage: rows.reduce(
      (sum, row) => sum + row.verse_end - row.verse_start + 1,
      0,
    ),
    source_bridge_count: AGAPE_EASY_BIBLE_SOURCE_BRIDGES.length,
    manual_verse_count: AGAPE_EASY_BIBLE_MANUAL_VERSES.length,
    expected_books: AGAPE_EASY_BIBLE_EXPECTED_BOOKS,
    expected_chapters: AGAPE_EASY_BIBLE_EXPECTED_CHAPTERS,
    expected_rows: AGAPE_EASY_BIBLE_EXPECTED_ROWS,
    expected_canonical_verses: AGAPE_EASY_BIBLE_EXPECTED_VERSES,
    content_sha256: contentHash,
    archive_sha256: archiveHash,
    archive_file: `${AGAPE_EASY_BIBLE_TRANSLATION_CODE}.jsonl.gz`,
    books,
  };

  const manifestPath = join(outputDir, "manifest.json");
  const temporaryManifestPath = `${manifestPath}.tmp-${process.pid}`;
  await writeFile(temporaryManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await rename(temporaryManifestPath, manifestPath);

  console.log("Easy Bible corpus created");
  console.log(`Rows: ${rows.length}`);
  console.log(`Canonical verse coverage: ${AGAPE_EASY_BIBLE_EXPECTED_VERSES}`);
  console.log(`Books: ${books.length}`);
  console.log(`Chapters: ${AGAPE_EASY_BIBLE_EXPECTED_CHAPTERS}`);
  console.log(`Content SHA-256: ${contentHash}`);
  console.log(`Archive: ${archivePath}`);
  console.log(`Manifest: ${manifestPath}`);
}

async function main() {
  if (await runPrepareManualOverrides()) return;
  if (await runInspect()) return;
  if (await runVersificationScan()) return;
  if (await runProbe()) return;

  const manualOverrides = await loadManualOverrides();
  assertRequiredManualOverrides(manualOverrides);

  const jobs = AGAPE_EASY_BIBLE_BOOKS.flatMap((book) =>
    Array.from({ length: book.chapters }, (_, index) => ({
      book,
      chapter: index + 1,
    })),
  );
  const rowsByJob = new Array(jobs.length);
  let nextJobIndex = 0;
  let completed = 0;

  console.log("Agape Easy Bible fetch");
  console.log(`API host: ${new URL(apiBaseUrl).host}`);
  console.log(`Jobs: ${jobs.length}`);
  console.log(`Concurrency: ${concurrency}`);
  console.log(`Cache: ${cacheDir}`);
  console.log(`Output: ${outputDir}`);

  async function worker() {
    while (true) {
      const jobIndex = nextJobIndex;
      nextJobIndex += 1;
      if (jobIndex >= jobs.length) return;
      const job = jobs[jobIndex];
      rowsByJob[jobIndex] = await fetchChapter(job.book, job.chapter, { manualOverrides });
      completed += 1;
      if (completed === jobs.length || completed % 25 === 0) {
        console.log(`Fetched/validated ${completed}/${jobs.length} chapters`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const rows = rowsByJob.flat();
  if (rows.length !== AGAPE_EASY_BIBLE_EXPECTED_ROWS) {
    throw new Error(`Unexpected Easy Bible row count: ${rows.length}/${AGAPE_EASY_BIBLE_EXPECTED_ROWS}`);
  }
  const canonicalVerseCoverage = rows.reduce(
    (sum, row) => sum + row.verse_end - row.verse_start + 1,
    0,
  );
  if (canonicalVerseCoverage !== AGAPE_EASY_BIBLE_EXPECTED_VERSES) {
    throw new Error(
      `Unexpected Easy Bible canonical verse coverage: ${canonicalVerseCoverage}/${AGAPE_EASY_BIBLE_EXPECTED_VERSES}`,
    );
  }

  const uniqueKeys = new Set(rows.map((row) =>
    `${row.translation_id}:${row.book_number}:${row.chapter}:${row.verse_start}`,
  ));
  if (uniqueKeys.size !== rows.length) {
    throw new Error(`Duplicate Easy Bible keys: ${rows.length - uniqueKeys.size}`);
  }

  await writeCorpus(rows);
}

main().catch(async (error) => {
  console.error(error);
  try {
    await rm(join(outputDir, `${AGAPE_EASY_BIBLE_TRANSLATION_CODE}.jsonl.gz.tmp-${process.pid}`), { force: true });
    await rm(join(outputDir, `manifest.json.tmp-${process.pid}`), { force: true });
  } catch {
    // Best-effort cleanup only.
  }
  process.exitCode = 1;
});

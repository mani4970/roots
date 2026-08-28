#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  AGAPE_EASY_BIBLE_BOOKS,
  AGAPE_EASY_BIBLE_DATA_DIR,
  AGAPE_EASY_BIBLE_EXPECTED_BOOKS,
  AGAPE_EASY_BIBLE_EXPECTED_CHAPTERS,
  AGAPE_EASY_BIBLE_EXPECTED_ROWS,
  AGAPE_EASY_BIBLE_EXPECTED_VERSES,
  AGAPE_EASY_BIBLE_MANUAL_VERSES,
  AGAPE_EASY_BIBLE_SOURCE_BRIDGES,
  AGAPE_EASY_BIBLE_TABLE,
  canonicalEasyBibleRow,
  getRequiredEnv,
  getSourceBridge,
  readEasyBibleRows,
  readStringOption,
  sha256File,
  validateEasyBibleRow,
} from "./agape-easy-bible-common.mjs";

const dataDir = resolve(readStringOption("data", AGAPE_EASY_BIBLE_DATA_DIR));
const live = process.argv.includes("--live");
const activation = process.argv.includes("--activation");
const PAGE_SIZE = 1_000;

function fail(message) {
  throw new Error(message);
}

async function loadManifest() {
  const path = join(dataDir, "manifest.json");
  const manifest = JSON.parse(await readFile(path, "utf8"));
  if (
    manifest?.translation?.id !== 88 ||
    manifest?.translation?.code !== "EASY" ||
    manifest?.total_books !== AGAPE_EASY_BIBLE_EXPECTED_BOOKS ||
    manifest?.total_chapters !== AGAPE_EASY_BIBLE_EXPECTED_CHAPTERS ||
    manifest?.total_rows !== AGAPE_EASY_BIBLE_EXPECTED_ROWS ||
    manifest?.expected_rows !== AGAPE_EASY_BIBLE_EXPECTED_ROWS ||
    manifest?.canonical_verse_coverage !== AGAPE_EASY_BIBLE_EXPECTED_VERSES ||
    manifest?.expected_canonical_verses !== AGAPE_EASY_BIBLE_EXPECTED_VERSES ||
    manifest?.source_bridge_count !== AGAPE_EASY_BIBLE_SOURCE_BRIDGES.length ||
    manifest?.manual_verse_count !== AGAPE_EASY_BIBLE_MANUAL_VERSES.length ||
    typeof manifest?.content_sha256 !== "string" ||
    typeof manifest?.archive_sha256 !== "string" ||
    typeof manifest?.archive_file !== "string"
  ) {
    fail(`Unexpected Easy Bible manifest: ${path}`);
  }
  return { manifest, path };
}

async function auditRows(rowsIterable, expectedContentHash = null) {
  const contentHash = createHash("sha256");
  const seenKeys = new Set();
  const seenBooks = new Set();
  const seenChapters = new Set();
  const seenBridges = new Set();
  const seenManualVerses = new Set();
  const suspicious = {
    doubleQuestion: [],
    zeroWidth: [],
    unusuallyLong: [],
  };

  let rowCount = 0;
  let canonicalVerseCoverage = 0;
  let expectedBookIndex = 0;
  let expectedChapter = 1;
  let expectedVerse = 1;

  for await (const row of rowsIterable) {
    const expectedBook = AGAPE_EASY_BIBLE_BOOKS[expectedBookIndex];
    if (!expectedBook) fail(`Unexpected extra Easy Bible row at index ${rowCount}`);

    validateEasyBibleRow(row, {
      bookNumber: expectedBook.number,
      bookCode: expectedBook.code,
      chapter: expectedChapter,
    });

    if (row.verse_start !== expectedVerse) {
      fail(
        `Easy Bible canonical coverage gap/overlap at ${expectedBook.code}.${expectedChapter}: ` +
        `expected ${expectedVerse}, got ${row.verse_start}-${row.verse_end}`,
      );
    }

    const maxVerse = expectedBook.verseCounts[expectedChapter - 1];
    if (row.verse_end > maxVerse) {
      fail(
        `Easy Bible verse range exceeds chapter at ${expectedBook.code}.${expectedChapter}: ` +
        `${row.verse_start}-${row.verse_end}/${maxVerse}`,
      );
    }

    if (row.verse_end > row.verse_start) {
      const bridge = getSourceBridge(expectedBook.number, expectedChapter);
      if (
        !bridge ||
        row.verse_start !== bridge.verse_start ||
        row.verse_end !== bridge.verse_end
      ) {
        fail(
          `Unexpected Easy Bible verse bridge ${expectedBook.code}.${expectedChapter}.` +
          `${row.verse_start}-${row.verse_end}`,
        );
      }
      seenBridges.add(`${expectedBook.code}.${expectedChapter}.${row.verse_start}-${row.verse_end}`);
    }

    for (const manualVerse of AGAPE_EASY_BIBLE_MANUAL_VERSES) {
      if (
        manualVerse.book_number === row.book_number &&
        manualVerse.chapter === row.chapter &&
        manualVerse.verse_start === row.verse_start &&
        manualVerse.verse_end === row.verse_end
      ) {
        seenManualVerses.add(manualVerse.key);
      }
    }

    const key = `${row.translation_id}:${row.book_number}:${row.chapter}:${row.verse_start}`;
    if (seenKeys.has(key)) fail(`Duplicate Easy Bible row: ${key}`);
    seenKeys.add(key);
    seenBooks.add(row.book_number);
    seenChapters.add(`${row.book_number}:${row.chapter}`);

    const displayVerse = row.verse_start === row.verse_end
      ? String(row.verse_start)
      : `${row.verse_start}-${row.verse_end}`;
    if (row.text.includes("??") && suspicious.doubleQuestion.length < 20) {
      suspicious.doubleQuestion.push(`${expectedBook.code}.${row.chapter}.${displayVerse}`);
    }
    if (/[\u200B-\u200D\u2060\uFEFF]/.test(row.text) && suspicious.zeroWidth.length < 20) {
      suspicious.zeroWidth.push(`${expectedBook.code}.${row.chapter}.${displayVerse}`);
    }
    if (row.text.length > 1_500 && suspicious.unusuallyLong.length < 20) {
      suspicious.unusuallyLong.push(`${expectedBook.code}.${row.chapter}.${displayVerse}`);
    }

    contentHash.update(`${canonicalEasyBibleRow(row)}\n`);
    rowCount += 1;
    canonicalVerseCoverage += row.verse_end - row.verse_start + 1;
    expectedVerse = row.verse_end + 1;

    if (expectedVerse > maxVerse) {
      if (expectedVerse !== maxVerse + 1) {
        fail(`Easy Bible chapter ended outside canon at ${expectedBook.code}.${expectedChapter}`);
      }
      if (expectedChapter < expectedBook.chapters) {
        expectedChapter += 1;
        expectedVerse = 1;
      } else {
        expectedBookIndex += 1;
        expectedChapter = 1;
        expectedVerse = 1;
      }
    }
  }

  const digest = contentHash.digest("hex");
  if (rowCount !== AGAPE_EASY_BIBLE_EXPECTED_ROWS) {
    fail(`Unexpected Easy Bible row count: ${rowCount}/${AGAPE_EASY_BIBLE_EXPECTED_ROWS}`);
  }
  if (canonicalVerseCoverage !== AGAPE_EASY_BIBLE_EXPECTED_VERSES) {
    fail(
      `Unexpected Easy Bible canonical verse coverage: ` +
      `${canonicalVerseCoverage}/${AGAPE_EASY_BIBLE_EXPECTED_VERSES}`,
    );
  }
  if (expectedBookIndex !== AGAPE_EASY_BIBLE_BOOKS.length) {
    fail(`Easy Bible corpus ended before the final canonical verse`);
  }
  if (seenBooks.size !== AGAPE_EASY_BIBLE_EXPECTED_BOOKS) {
    fail(`Unexpected Easy Bible book count: ${seenBooks.size}/${AGAPE_EASY_BIBLE_EXPECTED_BOOKS}`);
  }
  if (seenChapters.size !== AGAPE_EASY_BIBLE_EXPECTED_CHAPTERS) {
    fail(`Unexpected Easy Bible chapter count: ${seenChapters.size}/${AGAPE_EASY_BIBLE_EXPECTED_CHAPTERS}`);
  }
  if (seenBridges.size !== AGAPE_EASY_BIBLE_SOURCE_BRIDGES.length) {
    fail(`Unexpected Easy Bible bridge count: ${seenBridges.size}/${AGAPE_EASY_BIBLE_SOURCE_BRIDGES.length}`);
  }
  if (seenManualVerses.size !== AGAPE_EASY_BIBLE_MANUAL_VERSES.length) {
    fail(`Missing purchased-text manual verse(s): ${seenManualVerses.size}/${AGAPE_EASY_BIBLE_MANUAL_VERSES.length}`);
  }
  if (expectedContentHash && digest !== expectedContentHash) {
    fail(`Easy Bible content hash mismatch: ${digest} != ${expectedContentHash}`);
  }
  if (suspicious.zeroWidth.length > 0) {
    fail(`Zero-width characters found: ${suspicious.zeroWidth.join(", ")}`);
  }

  return {
    rowCount,
    canonicalVerseCoverage,
    bookCount: seenBooks.size,
    chapterCount: seenChapters.size,
    bridgeCount: seenBridges.size,
    manualVerseCount: seenManualVerses.size,
    contentSha256: digest,
    suspicious,
  };
}

async function auditLocal() {
  const { manifest, path: manifestPath } = await loadManifest();
  const archivePath = join(dataDir, manifest.archive_file);
  const archiveSha256 = await sha256File(archivePath);
  if (archiveSha256 !== manifest.archive_sha256) {
    fail(`Easy Bible archive hash mismatch: ${archiveSha256} != ${manifest.archive_sha256}`);
  }

  const summary = await auditRows(readEasyBibleRows(archivePath), manifest.content_sha256);
  console.log("Local Easy Bible corpus audit passed");
  console.log(`Manifest: ${manifestPath}`);
  console.log(`Rows: ${summary.rowCount}`);
  console.log(`Canonical verse coverage: ${summary.canonicalVerseCoverage}`);
  console.log(`Books: ${summary.bookCount}`);
  console.log(`Chapters: ${summary.chapterCount}`);
  console.log(`Verse bridges: ${summary.bridgeCount}`);
  console.log(`Purchased-text manual verses: ${summary.manualVerseCount}`);
  console.log(`Content SHA-256: ${summary.contentSha256}`);
  console.log(`Double-question candidates: ${summary.suspicious.doubleQuestion.length}`);
  if (summary.suspicious.doubleQuestion.length > 0) {
    console.log(`  ${summary.suspicious.doubleQuestion.join(", ")}`);
  }
  console.log(`Unusually long verses: ${summary.suspicious.unusuallyLong.length}`);
  if (summary.suspicious.unusuallyLong.length > 0) {
    console.log(`  ${summary.suspicious.unusuallyLong.join(", ")}`);
  }
  return { manifest, summary };
}

async function* readLiveRows(supabase) {
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from(AGAPE_EASY_BIBLE_TABLE)
      .select("translation_id,translation_code,book_number,book_code,chapter,verse_start,verse_end,text")
      .eq("translation_id", 88)
      .order("book_number", { ascending: true })
      .order("chapter", { ascending: true })
      .order("verse_start", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) fail(`Live Easy Bible query failed: ${error.message}`);
    const rows = data ?? [];
    for (const row of rows) yield row;
    if (rows.length < PAGE_SIZE) return;
    offset += rows.length;
  }
}

async function auditActivationCode() {
  const [bibleData, bibleCopyright, bibleRoute, activationSql] = await Promise.all([
    readFile(resolve("lib/bibleData.ts"), "utf8"),
    readFile(resolve("lib/bibleCopyright.ts"), "utf8"),
    readFile(resolve("app/api/bible/route.ts"), "utf8"),
    readFile(resolve("supabase/135_enable_agape_easy_bible_2_2.sql"), "utf8"),
  ]);

  const legacyBlock = bibleData.match(
    /const LEGACY_TRANSLATIONS\s*=\s*\[([\s\S]*?)\]\s*as const;/,
  )?.[1] ?? "";

  const checks = [
    [
      "Easy Bible ID 88 is selectable in the Korean translation group",
      /group:\s*"한국어"[\s\S]*?\{\s*id:\s*88,\s*name:\s*"쉬운성경"\s*\}/.test(bibleData),
    ],
    [
      "Easy Bible ID 88 is no longer in LEGACY_TRANSLATIONS",
      !/\bid:\s*88\b/.test(legacyBlock),
    ],
    [
      "The exact Agape copyright notice is registered",
      bibleCopyright.includes(
        "『아가페 쉬운성경』의 저작권은 ㈜아가페출판사에 있으며, ㈜아가페출판사의 허락을 받아 사용하였습니다.",
      ),
    ],
    [
      "The server Bible route maps ID 88 to the Agape server-only table",
      bibleRoute.includes('[88, "agape_bible_verses"]'),
    ],
    [
      "Easy Bible responses require an authenticated user",
      bibleRoute.includes("getAuthenticatedBibleUserId")
        && bibleRoute.includes("로그인이 필요한 번역본이에요."),
    ],
    [
      "Easy Bible responses use private no-store caching",
      bibleRoute.includes('AGAPE_EASY_BIBLE_RESPONSE_CACHE_CONTROL = "private, no-store, max-age=0"'),
    ],
    [
      "The activation SQL requires complete bridge-aware corpus coverage",
      activationSql.includes("v_row_count <> 31098")
        && activationSql.includes("v_verse_coverage <> 31102")
        && activationSql.includes("v_bridge_count <> 4")
        && activationSql.includes("v_book_count <> 66")
        && activationSql.includes("v_chapter_count <> 1189"),
    ],
    [
      "The activation SQL preserves Spanish and adds only ID 88",
      activationSql.includes("p_preferred_language not in ('ko', 'de', 'en', 'fr', 'es')")
        && activationSql.includes("84, 88, 89, 92, 97, 98, 100, 101"),
    ],
  ];

  let failed = 0;
  console.log("Easy Bible activation code audit");
  for (const [label, passed] of checks) {
    console.log(`${passed ? "PASS" : "FAIL"}  ${label}`);
    if (!passed) failed += 1;
  }
  if (failed > 0) fail(`Easy Bible activation code audit failed: ${failed}`);
}

async function auditLive(expectedContentHash) {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SECRET_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  const { count, error } = await supabase
    .from(AGAPE_EASY_BIBLE_TABLE)
    .select("translation_id", { count: "exact", head: true })
    .eq("translation_id", 88);
  if (error) fail(`Live Easy Bible count failed: ${error.message}`);
  if (count !== AGAPE_EASY_BIBLE_EXPECTED_ROWS) {
    fail(`Live Easy Bible count mismatch: ${count}/${AGAPE_EASY_BIBLE_EXPECTED_ROWS}`);
  }

  const summary = await auditRows(readLiveRows(supabase), expectedContentHash);
  console.log("Live Easy Bible corpus audit passed");
  console.log(`Rows: ${summary.rowCount}`);
  console.log(`Canonical verse coverage: ${summary.canonicalVerseCoverage}`);
  console.log(`Books: ${summary.bookCount}`);
  console.log(`Chapters: ${summary.chapterCount}`);
  console.log(`Verse bridges: ${summary.bridgeCount}`);
  console.log(`Purchased-text manual verses: ${summary.manualVerseCount}`);
  console.log(`Content SHA-256: ${summary.contentSha256}`);
  return summary;
}

async function main() {
  console.log("Agape Easy Bible audit (read-only)");
  const { manifest } = await auditLocal();
  if (live) await auditLive(manifest.content_sha256);
  if (activation) await auditActivationCode();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  AGAPE_EASY_BIBLE_BOOKS,
  AGAPE_EASY_BIBLE_DATA_DIR,
  AGAPE_EASY_BIBLE_EXPECTED_ROWS,
  AGAPE_EASY_BIBLE_EXPECTED_VERSES,
  AGAPE_EASY_BIBLE_MANUAL_VERSES,
  AGAPE_EASY_BIBLE_SOURCE_BRIDGES,
  AGAPE_EASY_BIBLE_TABLE,
  canonicalEasyBibleRow,
  getRequiredEnv,
  getSourceBridge,
  readEasyBibleRows,
  readIntegerOption,
  readStringOption,
  sha256File,
  validateEasyBibleRow,
} from "./agape-easy-bible-common.mjs";

const dataDir = resolve(readStringOption("data", AGAPE_EASY_BIBLE_DATA_DIR));
const batchSize = readIntegerOption("batch-size", 250, { min: 1, max: 250 });
const confirmImport = process.argv.includes("--confirm-import");

function fail(message) {
  throw new Error(message);
}

async function loadAndValidateCorpus() {
  const manifestPath = join(dataDir, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (
    manifest?.translation?.id !== 88 ||
    manifest?.translation?.code !== "EASY" ||
    manifest?.total_rows !== AGAPE_EASY_BIBLE_EXPECTED_ROWS ||
    manifest?.expected_rows !== AGAPE_EASY_BIBLE_EXPECTED_ROWS ||
    manifest?.canonical_verse_coverage !== AGAPE_EASY_BIBLE_EXPECTED_VERSES ||
    manifest?.expected_canonical_verses !== AGAPE_EASY_BIBLE_EXPECTED_VERSES ||
    manifest?.source_bridge_count !== AGAPE_EASY_BIBLE_SOURCE_BRIDGES.length ||
    manifest?.manual_verse_count !== AGAPE_EASY_BIBLE_MANUAL_VERSES.length ||
    typeof manifest?.archive_file !== "string" ||
    typeof manifest?.archive_sha256 !== "string" ||
    typeof manifest?.content_sha256 !== "string"
  ) {
    fail(`Unexpected Easy Bible manifest: ${manifestPath}`);
  }

  const archivePath = join(dataDir, manifest.archive_file);
  const archiveSha256 = await sha256File(archivePath);
  if (archiveSha256 !== manifest.archive_sha256) {
    fail(`Archive hash mismatch: ${archiveSha256} != ${manifest.archive_sha256}`);
  }

  const rows = [];
  const contentHash = createHash("sha256");
  let expectedBookIndex = 0;
  let expectedChapter = 1;
  let expectedVerse = 1;
  let canonicalVerseCoverage = 0;
  let bridgeCount = 0;
  const manualSeen = new Set();

  for await (const row of readEasyBibleRows(archivePath)) {
    const expectedBook = AGAPE_EASY_BIBLE_BOOKS[expectedBookIndex];
    if (!expectedBook) fail(`Unexpected extra row at ${rows.length}`);

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
      fail(`Easy Bible verse range exceeds chapter at ${expectedBook.code}.${expectedChapter}`);
    }

    if (row.verse_end > row.verse_start) {
      const bridge = getSourceBridge(expectedBook.number, expectedChapter);
      if (
        !bridge ||
        bridge.verse_start !== row.verse_start ||
        bridge.verse_end !== row.verse_end
      ) {
        fail(
          `Unexpected Easy Bible bridge ${expectedBook.code}.${expectedChapter}.` +
          `${row.verse_start}-${row.verse_end}`,
        );
      }
      bridgeCount += 1;
    }

    for (const manualVerse of AGAPE_EASY_BIBLE_MANUAL_VERSES) {
      if (
        manualVerse.book_number === row.book_number &&
        manualVerse.chapter === row.chapter &&
        manualVerse.verse_start === row.verse_start &&
        manualVerse.verse_end === row.verse_end
      ) {
        manualSeen.add(manualVerse.key);
      }
    }

    contentHash.update(`${canonicalEasyBibleRow(row)}\n`);
    rows.push(row);
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

  if (rows.length !== AGAPE_EASY_BIBLE_EXPECTED_ROWS) {
    fail(`Unexpected Easy Bible row count: ${rows.length}/${AGAPE_EASY_BIBLE_EXPECTED_ROWS}`);
  }
  if (canonicalVerseCoverage !== AGAPE_EASY_BIBLE_EXPECTED_VERSES) {
    fail(
      `Unexpected Easy Bible canonical verse coverage: ` +
      `${canonicalVerseCoverage}/${AGAPE_EASY_BIBLE_EXPECTED_VERSES}`,
    );
  }
  if (expectedBookIndex !== AGAPE_EASY_BIBLE_BOOKS.length) {
    fail("Easy Bible corpus ended before the final canonical verse");
  }
  if (bridgeCount !== AGAPE_EASY_BIBLE_SOURCE_BRIDGES.length) {
    fail(`Unexpected Easy Bible bridge count: ${bridgeCount}/${AGAPE_EASY_BIBLE_SOURCE_BRIDGES.length}`);
  }
  if (manualSeen.size !== AGAPE_EASY_BIBLE_MANUAL_VERSES.length) {
    fail(`Missing purchased-text manual verse(s): ${manualSeen.size}/${AGAPE_EASY_BIBLE_MANUAL_VERSES.length}`);
  }

  const contentSha256 = contentHash.digest("hex");
  if (contentSha256 !== manifest.content_sha256) {
    fail(`Content hash mismatch: ${contentSha256} != ${manifest.content_sha256}`);
  }

  return {
    manifest,
    rows,
    canonicalVerseCoverage,
    bridgeCount,
    manualVerseCount: manualSeen.size,
    archivePath,
    manifestPath,
  };
}

async function main() {
  console.log("Agape Easy Bible import");
  console.log(`Mode: ${confirmImport ? "CONFIRMED UPSERT" : "VALIDATE ONLY"}`);
  console.log(`Batch size: ${batchSize}`);

  const {
    manifest,
    rows,
    canonicalVerseCoverage,
    bridgeCount,
    manualVerseCount,
    archivePath,
    manifestPath,
  } = await loadAndValidateCorpus();
  console.log("Local corpus validation passed");
  console.log(`Manifest: ${manifestPath}`);
  console.log(`Archive: ${archivePath}`);
  console.log(`Rows: ${rows.length}`);
  console.log(`Canonical verse coverage: ${canonicalVerseCoverage}`);
  console.log(`Verse bridges: ${bridgeCount}`);
  console.log(`Purchased-text manual verses: ${manualVerseCount}`);
  console.log(`Content SHA-256: ${manifest.content_sha256}`);

  if (!confirmImport) {
    console.log("No database rows were changed.");
    console.log("Add --confirm-import only after supabase/134_agape_easy_bible_corpus_2_2.sql has been applied.");
    return;
  }

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

  const { count: beforeCount, error: beforeError } = await supabase
    .from(AGAPE_EASY_BIBLE_TABLE)
    .select("translation_id", { count: "exact", head: true })
    .eq("translation_id", 88);
  if (beforeError) {
    fail(
      `Easy Bible table precheck failed: ${beforeError.message}. ` +
      "Apply supabase/134_agape_easy_bible_corpus_2_2.sql first.",
    );
  }
  console.log(`Existing translation 88 rows: ${beforeCount ?? 0}`);

  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize);
    const { error } = await supabase
      .from(AGAPE_EASY_BIBLE_TABLE)
      .upsert(batch, {
        onConflict: "translation_id,book_number,chapter,verse_start",
        ignoreDuplicates: false,
      });
    if (error) {
      fail(`Easy Bible upsert failed at ${offset + 1}-${offset + batch.length}: ${error.message}`);
    }
    console.log(`Upserted ${offset + batch.length}/${rows.length}`);
  }

  const { count: afterCount, error: afterError } = await supabase
    .from(AGAPE_EASY_BIBLE_TABLE)
    .select("translation_id", { count: "exact", head: true })
    .eq("translation_id", 88);
  if (afterError) fail(`Easy Bible final count failed: ${afterError.message}`);
  if (afterCount !== AGAPE_EASY_BIBLE_EXPECTED_ROWS) {
    fail(`Easy Bible final count mismatch: ${afterCount}/${AGAPE_EASY_BIBLE_EXPECTED_ROWS}`);
  }

  console.log("Easy Bible upsert completed");
  console.log(`Rows: ${afterCount}`);
  console.log(`Canonical verse coverage: ${AGAPE_EASY_BIBLE_EXPECTED_VERSES}`);
  console.log("Run npm run bible:audit:easy -- --live to compare the full live DB hash with the local corpus.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

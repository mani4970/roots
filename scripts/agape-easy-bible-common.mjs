import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { BIBLE_CHAPTERS, NT_BOOKS, OT_BOOKS } from "../lib/bibleData.ts";

export const AGAPE_EASY_BIBLE_TRANSLATION_ID = 88;
export const AGAPE_EASY_BIBLE_TRANSLATION_CODE = "EASY";
export const AGAPE_EASY_BIBLE_NAME = "아가페 쉬운성경";
export const AGAPE_EASY_BIBLE_COPYRIGHT_NOTICE =
  "『아가페 쉬운성경』의 저작권은 ㈜아가페출판사에 있으며, ㈜아가페출판사의 허락을 받아 사용하였습니다.";
export const AGAPE_EASY_BIBLE_TABLE = "agape_bible_verses";
export const AGAPE_EASY_BIBLE_DATA_DIR = ".cache/agape-easy-bible/output";
export const AGAPE_EASY_BIBLE_CACHE_DIR = ".cache/agape-easy-bible/chapters";
export const AGAPE_EASY_BIBLE_MANUAL_OVERRIDES_PATH =
  ".cache/agape-easy-bible/manual-overrides.json";

const USFM_BOOK_CODES = [
  "GEN", "EXO", "LEV", "NUM", "DEU", "JOS", "JDG", "RUT", "1SA", "2SA", "1KI", "2KI", "1CH",
  "2CH", "EZR", "NEH", "EST", "JOB", "PSA", "PRO", "ECC", "SNG", "ISA", "JER", "LAM", "EZK",
  "DAN", "HOS", "JOL", "AMO", "OBA", "JON", "MIC", "NAM", "HAB", "ZEP", "HAG", "ZEC", "MAL",
  "MAT", "MRK", "LUK", "JHN", "ACT", "ROM", "1CO", "2CO", "GAL", "EPH", "PHP", "COL", "1TH",
  "2TH", "1TI", "2TI", "TIT", "PHM", "HEB", "JAS", "1PE", "2PE", "1JN", "2JN", "3JN", "JUD",
  "REV",
];

const KOREAN_BOOK_NAMES = [...OT_BOOKS, ...NT_BOOKS];

if (KOREAN_BOOK_NAMES.length !== 66 || USFM_BOOK_CODES.length !== 66) {
  throw new Error("Unexpected Bible canon configuration");
}

export const AGAPE_EASY_BIBLE_BOOKS = KOREAN_BOOK_NAMES.map((name, index) => {
  const verseCounts = BIBLE_CHAPTERS[name];
  if (!Array.isArray(verseCounts) || verseCounts.length === 0) {
    throw new Error(`Missing chapter/verse canon for ${name}`);
  }
  return {
    number: index + 1,
    code: USFM_BOOK_CODES[index],
    name,
    chapters: verseCounts.length,
    verseCounts,
  };
});

// The Roots private source API was exhaustively scanned on 2026-08-28.
// 1,185/1,189 chapters use one API item per canonical verse. The four
// exceptions below are intentional Easy Bible verse bridges confirmed against
// the Easy Bible verse structure. Preserve each publisher/source unit as
// verse_start..verse_end instead of inventing a sentence split.
export const AGAPE_EASY_BIBLE_SOURCE_BRIDGES = Object.freeze([
  Object.freeze({
    book_number: 7,
    book_code: "JDG",
    chapter: 20,
    source_verse: 22,
    verse_start: 22,
    verse_end: 23,
  }),
  Object.freeze({
    book_number: 9,
    book_code: "1SA",
    chapter: 30,
    source_verse: 30,
    verse_start: 30,
    verse_end: 31,
  }),
  Object.freeze({
    book_number: 10,
    book_code: "2SA",
    chapter: 4,
    source_verse: 6,
    verse_start: 6,
    verse_end: 7,
  }),
  Object.freeze({
    book_number: 11,
    book_code: "1KI",
    chapter: 8,
    source_verse: 41,
    verse_start: 41,
    verse_end: 42,
  }),
]);

// No purchased-text manual verse override is required for the current source
// corpus. Keep the hook empty so the pipeline can support a future explicitly
// verified manual correction without changing the import format.
export const AGAPE_EASY_BIBLE_MANUAL_VERSES = Object.freeze([]);

export const AGAPE_EASY_BIBLE_EXPECTED_BOOKS = 66;
export const AGAPE_EASY_BIBLE_EXPECTED_CHAPTERS = AGAPE_EASY_BIBLE_BOOKS.reduce(
  (sum, book) => sum + book.chapters,
  0,
);
export const AGAPE_EASY_BIBLE_EXPECTED_VERSES = AGAPE_EASY_BIBLE_BOOKS.reduce(
  (sum, book) => sum + book.verseCounts.reduce((bookSum, verseCount) => bookSum + verseCount, 0),
  0,
);
export const AGAPE_EASY_BIBLE_EXPECTED_ROWS =
  AGAPE_EASY_BIBLE_EXPECTED_VERSES - AGAPE_EASY_BIBLE_SOURCE_BRIDGES.reduce(
    (sum, bridge) => sum + (bridge.verse_end - bridge.verse_start),
    0,
  );

if (AGAPE_EASY_BIBLE_EXPECTED_CHAPTERS !== 1_189) {
  throw new Error(`Unexpected chapter total: ${AGAPE_EASY_BIBLE_EXPECTED_CHAPTERS}`);
}
if (AGAPE_EASY_BIBLE_EXPECTED_VERSES !== 31_102) {
  throw new Error(`Unexpected canonical verse total: ${AGAPE_EASY_BIBLE_EXPECTED_VERSES}`);
}
if (AGAPE_EASY_BIBLE_EXPECTED_ROWS !== 31_098) {
  throw new Error(`Unexpected physical row total: ${AGAPE_EASY_BIBLE_EXPECTED_ROWS}`);
}

export function readStringOption(name, fallback = "") {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) || fallback;
}

export function readIntegerOption(name, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const raw = readStringOption(name, "");
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`Invalid --${name} value: ${raw}`);
  }
  return parsed;
}

export function getRequiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function normalizeEasyBibleText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/\u00a0/g, " ")
    .replace(/[\t\r\n\f\v]+/g, " ")
    .replace(/ {2,}/g, " ")
    .trim();
}

export function canonicalEasyBibleRow(row) {
  return JSON.stringify({
    translation_id: row.translation_id,
    translation_code: row.translation_code,
    book_number: row.book_number,
    book_code: row.book_code,
    chapter: row.chapter,
    verse_start: row.verse_start,
    verse_end: row.verse_end,
    text: row.text,
  });
}

export function validateEasyBibleRow(row, expected = null) {
  const failures = [];
  if (row?.translation_id !== AGAPE_EASY_BIBLE_TRANSLATION_ID) failures.push("translation_id");
  if (row?.translation_code !== AGAPE_EASY_BIBLE_TRANSLATION_CODE) failures.push("translation_code");
  if (!Number.isSafeInteger(row?.book_number) || row.book_number < 1 || row.book_number > 66) failures.push("book_number");
  if (typeof row?.book_code !== "string" || !/^[1-3]?[A-Z]{2,3}$/.test(row.book_code)) failures.push("book_code");
  if (!Number.isSafeInteger(row?.chapter) || row.chapter < 1 || row.chapter > 150) failures.push("chapter");
  if (!Number.isSafeInteger(row?.verse_start) || row.verse_start < 1 || row.verse_start > 176) failures.push("verse_start");
  if (
    !Number.isSafeInteger(row?.verse_end) ||
    row.verse_end < row.verse_start ||
    row.verse_end > 176
  ) failures.push("verse_end");
  if (typeof row?.text !== "string" || !row.text.trim()) failures.push("text");
  if (row?.text !== normalizeEasyBibleText(row?.text)) failures.push("text_normalization");
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(row?.text ?? "")) failures.push("control_character");
  if ((row?.text ?? "").includes("\uFFFD")) failures.push("replacement_character");
  if (/<\/?[a-z][^>]*>/i.test(row?.text ?? "")) failures.push("html_markup");

  if (expected) {
    if (row.book_number !== expected.bookNumber) failures.push("expected_book_number");
    if (row.book_code !== expected.bookCode) failures.push("expected_book_code");
    if (row.chapter !== expected.chapter) failures.push("expected_chapter");
    if (
      Number.isSafeInteger(expected.verseStart) &&
      row.verse_start !== expected.verseStart
    ) failures.push("expected_verse_start");
    if (
      Number.isSafeInteger(expected.verseEnd) &&
      row.verse_end !== expected.verseEnd
    ) failures.push("expected_verse_end");
  }

  if (failures.length > 0) {
    throw new Error(
      `Invalid Easy Bible row (${failures.join(", ")}): ${JSON.stringify(row).slice(0, 500)}`,
    );
  }
  return row;
}

export function getSourceBridge(bookNumber, chapter) {
  return AGAPE_EASY_BIBLE_SOURCE_BRIDGES.find(
    (bridge) => bridge.book_number === bookNumber && bridge.chapter === chapter,
  ) ?? null;
}

export function getManualVersesForChapter(bookNumber, chapter) {
  return AGAPE_EASY_BIBLE_MANUAL_VERSES.filter(
    (item) => item.book_number === bookNumber && item.chapter === chapter,
  );
}

export function getExpectedPhysicalRowsForChapter(bookNumber, chapter) {
  const book = AGAPE_EASY_BIBLE_BOOKS[bookNumber - 1];
  const canonicalVerses = book?.verseCounts?.[chapter - 1];
  if (!Number.isSafeInteger(canonicalVerses)) return null;
  const bridge = getSourceBridge(bookNumber, chapter);
  return canonicalVerses - (bridge ? bridge.verse_end - bridge.verse_start : 0);
}

export function validateEasyBibleChapterCoverage(rows, book, chapter) {
  const maxVerse = book.verseCounts[chapter - 1];
  const expectedPhysicalRows = getExpectedPhysicalRowsForChapter(book.number, chapter);
  if (!Number.isSafeInteger(expectedPhysicalRows)) {
    throw new Error(`Missing expected Easy Bible chapter size for ${book.code}.${chapter}`);
  }
  if (!Array.isArray(rows) || rows.length !== expectedPhysicalRows) {
    throw new Error(
      `Unexpected Easy Bible chapter row count for ${book.code}.${chapter}: ${rows?.length ?? 0}/${expectedPhysicalRows}`,
    );
  }

  const bridge = getSourceBridge(book.number, chapter);
  let expectedVerse = 1;
  let bridgeSeen = false;

  for (const row of rows) {
    validateEasyBibleRow(row, {
      bookNumber: book.number,
      bookCode: book.code,
      chapter,
    });
    if (row.verse_start !== expectedVerse) {
      throw new Error(
        `Easy Bible canonical coverage gap/overlap at ${book.code}.${chapter}: expected ${expectedVerse}, got ${row.verse_start}-${row.verse_end}`,
      );
    }
    if (row.verse_end > row.verse_start) {
      if (
        !bridge ||
        row.verse_start !== bridge.verse_start ||
        row.verse_end !== bridge.verse_end
      ) {
        throw new Error(
          `Unexpected Easy Bible verse bridge ${book.code}.${chapter}.${row.verse_start}-${row.verse_end}`,
        );
      }
      bridgeSeen = true;
    }
    expectedVerse = row.verse_end + 1;
  }

  if (expectedVerse !== maxVerse + 1) {
    throw new Error(
      `Incomplete Easy Bible canonical coverage for ${book.code}.${chapter}: ended at ${expectedVerse - 1}/${maxVerse}`,
    );
  }
  if (Boolean(bridge) !== bridgeSeen) {
    throw new Error(`Expected Easy Bible bridge missing for ${book.code}.${chapter}`);
  }

  return rows;
}

export function createContentHash() {
  return createHash("sha256");
}

export async function sha256File(path) {
  const hash = createHash("sha256");
  await new Promise((resolvePromise, reject) => {
    const stream = createReadStream(path);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolvePromise);
  });
  return hash.digest("hex");
}

export async function* readEasyBibleRows(path) {
  const input = createReadStream(path).pipe(createGunzip());
  const lines = createInterface({ input, crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) continue;
    yield JSON.parse(line);
  }
}

export function getBookByNumber(bookNumber) {
  return AGAPE_EASY_BIBLE_BOOKS[bookNumber - 1] ?? null;
}

export function getExpectedChapterVerseCount(bookNumber, chapter) {
  const book = getBookByNumber(bookNumber);
  return book?.verseCounts?.[chapter - 1] ?? null;
}

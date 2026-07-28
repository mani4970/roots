#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createGzip } from "node:zlib";

const SOURCE_BASE_URL = "https://bible.bskorea.or.kr/bible";
const DEFAULT_OUTPUT_DIR = resolve("scripts/kbs-bible-data");
const DEFAULT_CACHE_DIR = resolve(".cache/kbs-bible");
const FETCH_TIMEOUT_MS = 30_000;
const MAX_FETCH_ATTEMPTS = 4;
const USER_AGENT =
  "Mozilla/5.0 (compatible; ChristianRoots/2.1; licensed Korean Bible data import)";

const TRANSLATIONS = [
  { id: 92, code: "NKRV", name: "개역개정" },
  { id: 84, code: "KRV", name: "개역한글" },
  { id: 98, code: "RNKSV", name: "새번역" },
];

const BOOKS = [
  ["GEN", 50], ["EXO", 40], ["LEV", 27], ["NUM", 36], ["DEU", 34],
  ["JOS", 24], ["JDG", 21], ["RUT", 4], ["1SA", 31], ["2SA", 24],
  ["1KI", 22], ["2KI", 25], ["1CH", 29], ["2CH", 36], ["EZR", 10],
  ["NEH", 13], ["EST", 10], ["JOB", 42], ["PSA", 150], ["PRO", 31],
  ["ECC", 12], ["SNG", 8], ["ISA", 66], ["JER", 52], ["LAM", 5],
  ["EZK", 48], ["DAN", 12], ["HOS", 14], ["JOL", 3], ["AMO", 9],
  ["OBA", 1], ["JON", 4], ["MIC", 7], ["NAM", 3], ["HAB", 3],
  ["ZEP", 3], ["HAG", 2], ["ZEC", 14], ["MAL", 4], ["MAT", 28],
  ["MRK", 16], ["LUK", 24], ["JHN", 21], ["ACT", 28], ["ROM", 16],
  ["1CO", 16], ["2CO", 13], ["GAL", 6], ["EPH", 6], ["PHP", 4],
  ["COL", 4], ["1TH", 5], ["2TH", 3], ["1TI", 6], ["2TI", 4],
  ["TIT", 3], ["PHM", 1], ["HEB", 13], ["JAS", 5], ["1PE", 5],
  ["2PE", 3], ["1JN", 5], ["2JN", 1], ["3JN", 1], ["JUD", 1],
  ["REV", 22],
].map(([code, chapters], index) => ({
  number: index + 1,
  code,
  chapters,
}));

function readIntegerOption(name, fallback) {
  const prefix = `--${name}=`;
  const raw = process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`Invalid --${name} value: ${raw}`);
  }
  return parsed;
}

function readStringOption(name, fallback) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) || fallback;
}

const concurrency = readIntegerOption("concurrency", 4);
const outputDir = resolve(readStringOption("output", DEFAULT_OUTPUT_DIR));
const cacheDir = resolve(readStringOption("cache", DEFAULT_CACHE_DIR));
const requestedTranslationCode = readStringOption("translation", "").toUpperCase();
const selectedTranslations = requestedTranslationCode
  ? TRANSLATIONS.filter((translation) => translation.code === requestedTranslationCode)
  : TRANSLATIONS;

if (selectedTranslations.length === 0) {
  throw new Error(`Unsupported --translation value: ${requestedTranslationCode}`);
}

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

async function fetchPage(url) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": USER_AGENT,
        },
        redirect: "follow",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < MAX_FETCH_ATTEMPTS) {
        await sleep(500 * 2 ** (attempt - 1));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(`Failed to fetch ${url}: ${String(lastError)}`);
}

function extractTransferState(html, sourceUrl) {
  const match = html.match(
    /<script id="IBEP-main-state" type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (!match) {
    throw new Error(`Missing IBEP transfer state: ${sourceUrl}`);
  }

  try {
    return JSON.parse(match[1]);
  } catch (error) {
    throw new Error(`Invalid IBEP transfer state at ${sourceUrl}: ${String(error)}`);
  }
}

function normalizeVerseText(parts) {
  let normalizedText = "";
  let previousPart = null;
  let pendingWhitespace = false;

  for (const part of parts) {
    const rawText = String(part.text);
    const normalizedPart = rawText.replace(/\s+/g, " ").trim();
    if (!normalizedPart) {
      pendingWhitespace ||= /\s/.test(rawText);
      continue;
    }

    const needsSeparator =
      previousPart !== null &&
      (
        pendingWhitespace ||
        previousPart.blockIndex !== part.blockIndex ||
        /\s$/.test(previousPart.text) ||
        /^\s/.test(rawText)
      );

    normalizedText += `${needsSeparator ? " " : ""}${normalizedPart}`;
    previousPart = part;
    pendingWhitespace = false;
  }

  return normalizedText
    .replace(/\s+([,.;:!?%)\]}”’])/g, "$1")
    .replace(/([(\[“‘])\s+/g, "$1")
    .trim();
}

function parseChapter(html, translation, book, chapterNumber, sourceUrl) {
  const chapterId = `${book.code}.${chapterNumber}`;
  const state = extractTransferState(html, sourceUrl);
  const stateKey = Object.keys(state).find((key) =>
    key.includes(`/chapters/${chapterId}/with-study-content`),
  );
  const chapter = stateKey ? state[stateKey]?.data?.chapter : null;

  if (!chapter || chapter.id !== chapterId || !Array.isArray(chapter.content)) {
    throw new Error(`Missing chapter data for ${translation.code} ${chapterId}`);
  }

  const verseParts = new Map();

  function parseVerseNumbers(value) {
    const usesVerseId = typeof value.verseId === "string" && value.verseId;
    const ids = usesVerseId
      ? value.verseId.split("-")
      : Array.isArray(value.verseOrgId)
        ? value.verseOrgId
        : [];
    const parsedNumbers = ids.map((id) => {
      const [idBook, idChapter, idVerse] = String(id).split(".");
      const verse = Number(idVerse);
      if (
        idBook !== book.code ||
        Number(idChapter) !== chapterNumber ||
        !Number.isSafeInteger(verse) ||
        verse < 1
      ) {
        throw new Error(`Invalid verse ID in ${translation.code} ${chapterId}: ${id}`);
      }
      return verse;
    });

    if (parsedNumbers.length === 0) {
      throw new Error(`Missing verse ID in ${translation.code} ${chapterId}`);
    }
    if (usesVerseId && parsedNumbers.length === 2 && parsedNumbers[1] < parsedNumbers[0]) {
      throw new Error(`Reversed verse bridge in ${translation.code} ${chapterId}`);
    }

    const numbers = usesVerseId && parsedNumbers.length === 2
      ? Array.from(
          { length: parsedNumbers[1] - parsedNumbers[0] + 1 },
          (_, index) => parsedNumbers[0] + index,
        )
      : parsedNumbers;

    for (let index = 1; index < numbers.length; index += 1) {
      if (numbers[index] !== numbers[index - 1] + 1) {
        throw new Error(`Non-contiguous verse bridge in ${translation.code} ${chapterId}`);
      }
    }

    return numbers;
  }

  function visit(value, blockIndex) {
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, blockIndex));
      return;
    }
    if (!value || typeof value !== "object") return;

    if (value.type === "verse-text") {
      const verseNumbers = parseVerseNumbers(value);
      const verseStart = verseNumbers[0];
      const verseEnd = verseNumbers.at(-1);
      const verseKey = `${verseStart}-${verseEnd}`;
      const text = typeof value.content === "string" ? value.content : "";

      if (!text) {
        throw new Error(`Invalid verse node in ${translation.code} ${chapterId}`);
      }

      const parts = verseParts.get(verseKey) ?? {
        verseStart,
        verseEnd,
        textParts: [],
      };
      parts.textParts.push({ text, blockIndex });
      verseParts.set(verseKey, parts);
      return;
    }

    Object.values(value).forEach((item) => visit(item, blockIndex));
  }

  chapter.content.forEach((block, blockIndex) => visit(block, blockIndex));

  // A small number of legacy chapters (currently KRV Psalm 92) expose the
  // verse number and its following text as sibling nodes instead of using
  // `verse-text` nodes. Preserve the displayed verse ranges in that shape too.
  if (verseParts.size === 0) {
    function collectSiblingVerses(value, blockIndex) {
      if (!Array.isArray(value)) {
        if (value && typeof value === "object") {
          Object.values(value).forEach((item) =>
            collectSiblingVerses(item, blockIndex),
          );
        }
        return;
      }

      let activeVerseKey = null;
      for (const item of value) {
        if (!item || typeof item !== "object") continue;

        if (item.type === "verse-number") {
          const verseNumbers = parseVerseNumbers(item);
          const verseStart = verseNumbers[0];
          const verseEnd = verseNumbers.at(-1);
          activeVerseKey = `${verseStart}-${verseEnd}`;
          verseParts.set(activeVerseKey, {
            verseStart,
            verseEnd,
            textParts: [],
          });
          continue;
        }

        if (
          activeVerseKey &&
          item.type === "text" &&
          typeof item.content === "string"
        ) {
          verseParts.get(activeVerseKey).textParts.push({
            text: item.content,
            blockIndex,
          });
          continue;
        }

        collectSiblingVerses(item, blockIndex);
      }
    }

    chapter.content.forEach((block, blockIndex) =>
      collectSiblingVerses(block, blockIndex),
    );
  }

  const declaredVerseCount = Number(chapter.verseCount);
  if (!Number.isSafeInteger(declaredVerseCount) || declaredVerseCount < 1) {
    throw new Error(`Invalid verse count for ${translation.code} ${chapterId}`);
  }

  const verses = Array.from(verseParts.entries())
    .map(([, value]) => value)
    .sort((left, right) => left.verseStart - right.verseStart)
    .map(({ verseStart, verseEnd, textParts }) => ({
      translation_id: translation.id,
      translation_code: translation.code,
      book_number: book.number,
      book_code: book.code,
      chapter: chapterNumber,
      verse_start: verseStart,
      verse_end: verseEnd,
      text: normalizeVerseText(textParts),
    }));

  if (verses.length !== declaredVerseCount) {
    throw new Error(
      `Verse count mismatch for ${translation.code} ${chapterId}: ` +
      `parsed ${verses.length}, expected ${declaredVerseCount}`,
    );
  }

  const coveredVerses = verses.flatMap((verse) =>
    Array.from(
      { length: verse.verse_end - verse.verse_start + 1 },
      (_, index) => verse.verse_start + index,
    ),
  );

  const omittedVerses = [];
  let expectedVerse = 1;
  for (const verse of coveredVerses) {
    while (expectedVerse < verse) {
      omittedVerses.push(expectedVerse);
      expectedVerse += 1;
    }
    if (verse !== expectedVerse) {
      throw new Error(`Overlapping verse range in ${translation.code} ${chapterId}`);
    }
    expectedVerse += 1;
  }

  if (verses.some((verse) => !verse.text)) {
    throw new Error(`Empty verse text in ${translation.code} ${chapterId}`);
  }

  return {
    copyright: String(chapter.copyright ?? "").trim(),
    omittedVerses,
    verses,
  };
}

async function loadChapter(translation, book, chapterNumber) {
  const chapterId = `${book.code}.${chapterNumber}`;
  const cachePath = join(cacheDir, translation.code, `${chapterId}.html`);
  const sourceUrl = `${SOURCE_BASE_URL}/${translation.code}/${chapterId}`;
  let html;

  if (await pathExists(cachePath)) {
    html = await readFile(cachePath, "utf8");
  } else {
    html = await fetchPage(sourceUrl);
    await mkdir(dirname(cachePath), { recursive: true });
    const temporaryPath = `${cachePath}.tmp-${process.pid}`;
    await writeFile(temporaryPath, html, "utf8");
    await rename(temporaryPath, cachePath);
  }

  return parseChapter(html, translation, book, chapterNumber, sourceUrl);
}

async function runPool(items, worker, onCompleted) {
  let cursor = 0;
  let firstError = null;

  async function runWorker() {
    while (!firstError) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      try {
        const result = await worker(items[index], index);
        onCompleted(result, index);
      } catch (error) {
        firstError = error;
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()),
  );
  if (firstError) throw firstError;
}

async function writeGzip(inputPath, outputPath) {
  const { createReadStream } = await import("node:fs");
  await new Promise((resolveGzip, rejectGzip) => {
    const input = createReadStream(inputPath);
    const gzip = createGzip({ level: 9 });
    const output = createWriteStream(outputPath);
    input.on("error", rejectGzip);
    gzip.on("error", rejectGzip);
    output.on("error", rejectGzip);
    output.on("finish", resolveGzip);
    input.pipe(gzip).pipe(output);
  });
}

async function sha256(path) {
  const hash = createHash("sha256");
  const { createReadStream } = await import("node:fs");

  await new Promise((resolveHash, rejectHash) => {
    const input = createReadStream(path);
    input.on("data", (chunk) => hash.update(chunk));
    input.on("error", rejectHash);
    input.on("end", resolveHash);
  });

  return hash.digest("hex");
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  await mkdir(cacheDir, { recursive: true });

  const jobs = selectedTranslations.flatMap((translation) =>
    BOOKS.flatMap((book) =>
      Array.from({ length: book.chapters }, (_, index) => ({
        translation,
        book,
        chapter: index + 1,
      })),
    ),
  );

  const chaptersByTranslation = new Map(
    selectedTranslations.map((translation) => [translation.id, []]),
  );
  const copyrightsByTranslation = new Map(
    selectedTranslations.map((translation) => [translation.id, new Set()]),
  );
  const omissionsByTranslation = new Map(
    selectedTranslations.map((translation) => [translation.id, []]),
  );
  let completed = 0;

  await runPool(
    jobs,
    async ({ translation, book, chapter }) => {
      const parsed = await loadChapter(translation, book, chapter);
      return { translation, book, chapter, parsed };
    },
    ({ translation, book, chapter, parsed }) => {
      chaptersByTranslation.get(translation.id).push({
        book,
        chapter,
        verses: parsed.verses,
      });
      if (parsed.copyright) {
        copyrightsByTranslation.get(translation.id).add(parsed.copyright);
      }
      if (parsed.omittedVerses.length > 0) {
        omissionsByTranslation.get(translation.id).push({
          book_code: book.code,
          chapter,
          verses: parsed.omittedVerses,
        });
      }

      completed += 1;
      if (completed % 50 === 0 || completed === jobs.length) {
        process.stdout.write(`Fetched and validated ${completed}/${jobs.length} chapters\n`);
      }
    },
  );

  const manifest = {
    generated_at: new Date().toISOString(),
    source: SOURCE_BASE_URL,
    total_chapters: jobs.length,
    translations: [],
  };

  for (const translation of selectedTranslations) {
    const chapters = chaptersByTranslation.get(translation.id);
    chapters.sort((left, right) =>
      left.book.number - right.book.number || left.chapter - right.chapter,
    );

    const jsonlPath = join(outputDir, `${translation.code}.jsonl`);
    const gzipPath = `${jsonlPath}.gz`;
    const lines = chapters.flatMap((chapter) =>
      chapter.verses.map((verse) => JSON.stringify(verse)),
    );
    await writeFile(jsonlPath, `${lines.join("\n")}\n`, "utf8");
    await writeGzip(jsonlPath, gzipPath);
    await unlink(jsonlPath);

    const gzipStats = await stat(gzipPath);
    manifest.translations.push({
      id: translation.id,
      code: translation.code,
      name: translation.name,
      chapters: chapters.length,
      verses: lines.length,
      file: `${translation.code}.jsonl.gz`,
      bytes: gzipStats.size,
      sha256: await sha256(gzipPath),
      omitted_verses: omissionsByTranslation.get(translation.id).sort((left, right) => {
        const leftBook = BOOKS.find((book) => book.code === left.book_code)?.number ?? 0;
        const rightBook = BOOKS.find((book) => book.code === right.book_code)?.number ?? 0;
        return leftBook - rightBook || left.chapter - right.chapter;
      }),
      source_copyrights: Array.from(copyrightsByTranslation.get(translation.id)).sort(),
    });
  }

  await writeFile(
    join(outputDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  process.stdout.write(
    `Completed ${manifest.total_chapters} chapters across ${manifest.translations.length} translations.\n`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

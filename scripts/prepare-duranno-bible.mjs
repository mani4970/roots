#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { createGzip } from "node:zlib";

const TRANSLATION = {
  id: 89,
  code: "WKB",
  name: "우리말성경",
};
const EXPECTED_BOOKS = 66;
const EXPECTED_CHAPTERS = 1_189;
const EXPECTED_ROWS = 31_102;
const DEFAULT_OUTPUT_DIR = resolve("scripts/duranno-bible-data");
const BOOK_CODES = [
  "GEN", "EXO", "LEV", "NUM", "DEU", "JOS", "JDG", "RUT", "1SA", "2SA",
  "1KI", "2KI", "1CH", "2CH", "EZR", "NEH", "EST", "JOB", "PSA", "PRO",
  "ECC", "SNG", "ISA", "JER", "LAM", "EZK", "DAN", "HOS", "JOL", "AMO",
  "OBA", "JON", "MIC", "NAM", "HAB", "ZEP", "HAG", "ZEC", "MAL", "MAT",
  "MRK", "LUK", "JHN", "ACT", "ROM", "1CO", "2CO", "GAL", "EPH", "PHP",
  "COL", "1TH", "2TH", "1TI", "2TI", "TIT", "PHM", "HEB", "JAS", "1PE",
  "2PE", "1JN", "2JN", "3JN", "JUD", "REV",
];
const SOURCE_BOOK_ALIASES = new Map([
  ["출이집트기", "출애굽기"],
  ["아가서", "아가"],
]);
const TRANSLATION_MAX_VERSE_OVERRIDES = new Map([
  ["아가:6", 14],
]);
const SOURCE_TEXT_REPAIRS = [
  ["용서해? 주십시오", "용서해 주십시오"],
  ["죽어도 참 지혜 없이 죽는다네.’?”", "죽어도 참 지혜 없이 죽는다네.’”"],
  ["악에서 떠나는 것이 명철이다.’?”", "악에서 떠나는 것이 명철이다.’”"],
  ["너는 쓸모없는 인간이다?’?,", "너는 쓸모없는 인간이다’,"],
  ["너는 쓸모없는 인간이다?’,", "너는 쓸모없는 인간이다’,"],
  ["눈에게 ‘땅에 떨어지라?’고", "눈에게 ‘땅에 떨어지라’고"],
  ["‘기쁨을 주는 포도원?’", "‘기쁨을 주는 포도원’"],
  ["‘거룩한 길?’", "‘거룩한 길’"],
  ["거둔다?’", "거둔다’"],
  ["것이다?’", "것이다’"],
  ["기록되기를? “", "기록되기를 “"],
  ["맛단은 야곱을 낳고?", "맛단은 야곱을 낳고"],
  ["놓겠다?’", "놓겠다’"],
  ["‘더럽게?’", "‘더럽게’"],
  ["된다?’", "된다’"],
  ["밤빌리아에 들어갔다가?", "밤빌리아에 들어갔다가"],
  ["보응이 되게 하시고?", "보응이 되게 하시고"],
  ["음행을 멀리하고?", "음행을 멀리하고"],
  ["사랑하라?’", "사랑하라’"],
  ["“아멘?”", "“아멘”"],
  ["‘여호와의 언약궤?’", "‘여호와의 언약궤’"],
  ["오후? 4시", "오후 4시"],
  ["왔다?’", "왔다’"],
  ["한다?’", "한다’"],
];

function readOption(name, fallback = "") {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) || fallback;
}

function normalizeText(value) {
  let normalized = String(value)
    .replace(/\?\?+/g, "?")
    .replace(/([“‘])\?\s*(?=[“‘가-힣])/g, "$1")
    .replace(/\?(?=[“‘])/g, "")
    .replace(/([.,!;:])\?/g, "$1")
    .replace(/\?(?=[,.;:!])/g, "")
    .replace(/([”’])\?(?=[,가-힣])/g, "$1")
    .replace(/([”’])\?$/g, "$1")
    .replace(/([가-힣])\?(\d)/g, "$1$2")
    .replace(/([가-힣])\?([가-힣])/g, "$1 $2");
  for (const [source, replacement] of SOURCE_TEXT_REPAIRS) {
    normalized = normalized.replaceAll(source, replacement);
  }
  return normalized
    .replace(/\s+/g, " ")
    .trim();
}

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function sha256File(path) {
  const hash = createHash("sha256");
  await new Promise((resolveHash, rejectHash) => {
    const input = createReadStream(path);
    input.on("data", (chunk) => hash.update(chunk));
    input.on("error", rejectHash);
    input.on("end", resolveHash);
  });
  return hash.digest("hex");
}

function sha256Content(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function parseBibleChapters(source) {
  const match = source.match(
    /export const BIBLE_CHAPTERS:[\s\S]*?= (\{[\s\S]*?\});\n\nconst TRANSLATION_MAX_VERSE_OVERRIDES/,
  );
  if (!match) throw new Error("Could not read BIBLE_CHAPTERS from lib/bibleData.ts");
  return JSON.parse(match[1]);
}

async function listSourceFiles(directory, testament) {
  const files = (await readdir(directory))
    .filter((name) => name.toLowerCase().endsWith(".txt"))
    .map((name) => {
      const match = name.match(new RegExp(`_${testament}(\\d{2})`));
      if (!match) throw new Error(`Unexpected source filename: ${name}`);
      const testamentNumber = Number(match[1]);
      const bookNumber = testament === "OT" ? testamentNumber : 39 + testamentNumber;
      return { path: join(directory, name), name, bookNumber };
    })
    .sort((left, right) => left.bookNumber - right.bookNumber);
  return files;
}

function parseVerseSpec(value, context) {
  const parts = value.split("-").map(Number);
  const verseStart = parts[0];
  const verseEnd = parts.length === 2 ? parts[1] : verseStart;
  if (
    parts.length > 2 ||
    !Number.isSafeInteger(verseStart) ||
    !Number.isSafeInteger(verseEnd) ||
    verseStart < 1 ||
    verseEnd < verseStart ||
    verseEnd > 176
  ) {
    throw new Error(`Invalid verse marker ${value} at ${context}`);
  }
  return { verseStart, verseEnd };
}

function makeRow(bookNumber, chapter, verseStart, verseEnd, text) {
  return {
    translation_id: TRANSLATION.id,
    translation_code: TRANSLATION.code,
    book_number: bookNumber,
    book_code: BOOK_CODES[bookNumber - 1],
    chapter,
    verse_start: verseStart,
    verse_end: verseEnd,
    text,
  };
}

function parseBook({ decoded, sourceName, bookNumber, expectedChapters }) {
  const lines = decoded.replace(/^\uFEFF/, "").split(/\r?\n/);
  const sourceBookName = normalizeText(lines[0]);
  const bookName = SOURCE_BOOK_ALIASES.get(sourceBookName) ?? sourceBookName;
  const expectedVerseCounts = expectedChapters[bookName];
  if (!Array.isArray(expectedVerseCounts)) {
    throw new Error(`Unknown book name in ${sourceName}: ${sourceBookName}`);
  }

  const rows = [];
  const rowKeys = new Set();
  const chapterMarkers = new Set();
  const ignoredLines = [];
  const repairedMarkers = [];
  let currentChapter = 0;
  let currentVerseEnd = 0;
  let currentRows = [];

  function addVerse(verseMarker, text, lineNumber, repaired = false) {
    if (currentChapter < 1) {
      throw new Error(`Verse before chapter marker at ${sourceName}:${lineNumber}`);
    }
    const { verseStart, verseEnd } = parseVerseSpec(
      verseMarker,
      `${sourceName}:${lineNumber}`,
    );
    const expectedMaxVerse = TRANSLATION_MAX_VERSE_OVERRIDES.get(
      `${bookName}:${currentChapter}`,
    ) ?? expectedVerseCounts[currentChapter - 1];
    if (!Number.isSafeInteger(expectedMaxVerse) || verseEnd > expectedMaxVerse) {
      throw new Error(
        `Out-of-range verse at ${sourceName}:${lineNumber}: ` +
        `${currentChapter}:${verseMarker} (max ${expectedMaxVerse})`,
      );
    }
    if (verseStart !== currentVerseEnd + 1) {
      throw new Error(
        `Non-contiguous verse at ${sourceName}:${lineNumber}: ` +
        `${currentChapter}:${verseMarker} after ${currentVerseEnd}`,
      );
    }
    const normalized = normalizeText(text);
    if (!normalized) {
      throw new Error(`Empty verse at ${sourceName}:${lineNumber}`);
    }

    const row = makeRow(
      bookNumber,
      currentChapter,
      verseStart,
      verseEnd,
      normalized,
    );
    rows.push(row);
    currentRows = [row];
    for (let verse = verseStart; verse <= verseEnd; verse += 1) {
      const key = `${currentChapter}:${verse}`;
      if (rowKeys.has(key)) {
        throw new Error(`Duplicate verse at ${sourceName}:${lineNumber}: ${key}`);
      }
      rowKeys.add(key);
    }
    currentVerseEnd = verseEnd;
    if (repaired) {
      repairedMarkers.push({ line: lineNumber, chapter: currentChapter, verse: verseMarker });
    }
  }

  for (let index = 1; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const line = lines[index];
    if (!line.trim()) continue;

    const chapterMatch = line.match(/^(\d+)\?(.*)$/);
    if (chapterMatch) {
      const chapter = Number(chapterMatch[1]);
      if (chapter !== currentChapter + 1) {
        throw new Error(
          `Non-contiguous chapter at ${sourceName}:${lineNumber}: ${chapter} after ${currentChapter}`,
        );
      }
      currentChapter = chapter;
      currentVerseEnd = 0;
      currentRows = [];
      chapterMarkers.add(chapter);
      addVerse("1", chapterMatch[2], lineNumber);
      continue;
    }

    const tabVerseMatch = line.match(/^[\t ]+(\d+(?:-\d+)?)[\t ]+(.*)$/);
    if (tabVerseMatch) {
      addVerse(tabVerseMatch[1], tabVerseMatch[2], lineNumber, !/^\t\d+\t/.test(line));
      continue;
    }

    const repairedVerseMatch = line.match(/^\??(\d+(?:-\d+)?)\s+(.*)$/);
    if (repairedVerseMatch) {
      const { verseStart } = parseVerseSpec(
        repairedVerseMatch[1],
        `${sourceName}:${lineNumber}`,
      );
      if (currentChapter > 0 && verseStart === currentVerseEnd + 1) {
        addVerse(repairedVerseMatch[1], repairedVerseMatch[2], lineNumber, true);
        continue;
      }
    }

    const continuationMatch = line.match(/^\t\t(.*)$/);
    if (continuationMatch && currentRows.length > 0) {
      const continuation = normalizeText(continuationMatch[1]);
      if (continuation) {
        for (const row of currentRows) {
          row.text = normalizeText(`${row.text} ${continuation}`);
        }
      }
      continue;
    }

    ignoredLines.push({ line: lineNumber, text: normalizeText(line).slice(0, 160) });
  }

  if (currentChapter !== expectedVerseCounts.length) {
    throw new Error(
      `Chapter count mismatch for ${bookName}: ${currentChapter}/${expectedVerseCounts.length}`,
    );
  }
  for (let chapter = 1; chapter <= expectedVerseCounts.length; chapter += 1) {
    if (!chapterMarkers.has(chapter)) {
      throw new Error(`Missing chapter ${bookName} ${chapter}`);
    }
    const expectedMaxVerse = TRANSLATION_MAX_VERSE_OVERRIDES.get(
      `${bookName}:${chapter}`,
    ) ?? expectedVerseCounts[chapter - 1];
    for (let verse = 1; verse <= expectedMaxVerse; verse += 1) {
      if (!rowKeys.has(`${chapter}:${verse}`)) {
        throw new Error(`Missing verse ${bookName} ${chapter}:${verse}`);
      }
    }
  }

  return {
    rows,
    audit: {
      book_number: bookNumber,
      book_code: BOOK_CODES[bookNumber - 1],
      book_name: bookName,
      source_book_name: sourceBookName,
      chapters: currentChapter,
      rows: rows.length,
      repaired_markers: repairedMarkers,
      ignored_lines: ignoredLines.length,
    },
  };
}

function canonicalContent(rows) {
  return rows
    .map((row) => [
      row.translation_id,
      row.translation_code,
      row.book_number,
      row.book_code,
      row.chapter,
      row.verse_start,
      row.verse_end,
      row.text,
    ].join("\x1f"))
    .join("\x1e");
}

async function writeGzipJsonl(rows, outputPath) {
  const temporaryPath = `${outputPath}.tmp`;
  await unlink(temporaryPath).catch(() => {});

  await new Promise((resolveWrite, rejectWrite) => {
    const output = createWriteStream(temporaryPath, { flags: "wx" });
    const gzip = createGzip({ level: 9 });
    output.on("error", rejectWrite);
    gzip.on("error", rejectWrite);
    output.on("finish", resolveWrite);
    gzip.pipe(output);
    for (const row of rows) gzip.write(`${JSON.stringify(row)}\n`);
    gzip.end();
  });

  await rename(temporaryPath, outputPath);
}

async function main() {
  const otDirectory = resolve(readOption("ot"));
  const ntDirectory = resolve(readOption("nt"));
  const outputDirectory = resolve(readOption("output", DEFAULT_OUTPUT_DIR));
  if (!readOption("ot") || !readOption("nt")) {
    throw new Error("Provide --ot=<directory> and --nt=<directory>");
  }
  if (!(await pathExists(otDirectory)) || !(await pathExists(ntDirectory))) {
    throw new Error("Duranno source directory not found");
  }

  const bibleDataSource = await readFile(resolve("lib/bibleData.ts"), "utf8");
  const expectedChapters = parseBibleChapters(bibleDataSource);
  const files = [
    ...(await listSourceFiles(otDirectory, "OT")),
    ...(await listSourceFiles(ntDirectory, "NT")),
  ];
  if (files.length !== EXPECTED_BOOKS) {
    throw new Error(`Unexpected source book count: ${files.length}/${EXPECTED_BOOKS}`);
  }
  files.forEach((file, index) => {
    if (file.bookNumber !== index + 1) {
      throw new Error(`Missing or duplicate source book before ${file.name}`);
    }
  });

  const decoder = new TextDecoder("euc-kr", { fatal: true });
  const rows = [];
  const books = [];
  const sourceFiles = [];
  for (const file of files) {
    const bytes = await readFile(file.path);
    const decoded = decoder.decode(bytes);
    const parsed = parseBook({
      decoded,
      sourceName: basename(file.path),
      bookNumber: file.bookNumber,
      expectedChapters,
    });
    rows.push(...parsed.rows);
    books.push(parsed.audit);
    sourceFiles.push({
      book_number: file.bookNumber,
      file: file.name,
      bytes: bytes.length,
      sha256: sha256Content(bytes),
    });
  }

  const chapterCount = new Set(rows.map((row) => `${row.book_number}:${row.chapter}`)).size;
  if (
    rows.length !== EXPECTED_ROWS ||
    books.length !== EXPECTED_BOOKS ||
    chapterCount !== EXPECTED_CHAPTERS
  ) {
    throw new Error(
      `Corpus shape mismatch: ${rows.length} rows, ${books.length} books, ${chapterCount} chapters`,
    );
  }

  const fullContentSha256 = sha256Content(canonicalContent(rows));
  const prefixRows = Number(readOption("prefix-rows", "0"));
  if (!Number.isSafeInteger(prefixRows) || prefixRows < 0 || prefixRows > rows.length) {
    throw new Error(`Invalid --prefix-rows value: ${readOption("prefix-rows")}`);
  }
  const prefixContentSha256 = prefixRows
    ? sha256Content(canonicalContent(rows.slice(0, prefixRows)))
    : null;

  await mkdir(outputDirectory, { recursive: true });
  const dataFile = "WKB.jsonl.gz";
  const dataPath = join(outputDirectory, dataFile);
  await writeGzipJsonl(rows, dataPath);
  const dataStats = await stat(dataPath);
  const manifest = {
    generated_at: new Date().toISOString(),
    source: "Duranno Woorimal Bible fifth-edition licensed text files",
    translation: {
      ...TRANSLATION,
      books: books.length,
      chapters: chapterCount,
      rows: rows.length,
      file: dataFile,
      bytes: dataStats.size,
      sha256: await sha256File(dataPath),
      content_sha256: fullContentSha256,
      prefix_rows: prefixRows || undefined,
      prefix_content_sha256: prefixContentSha256 || undefined,
    },
    parser_audit: {
      repaired_marker_count: books.reduce(
        (sum, book) => sum + book.repaired_markers.length,
        0,
      ),
      ignored_heading_line_count: books.reduce(
        (sum, book) => sum + book.ignored_lines,
        0,
      ),
      books,
    },
    source_files: sourceFiles,
  };
  await writeFile(
    join(outputDirectory, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  process.stdout.write(
    `${JSON.stringify({
      rows: rows.length,
      books: books.length,
      chapters: chapterCount,
      content_sha256: fullContentSha256,
      prefix_rows: prefixRows,
      prefix_content_sha256: prefixContentSha256,
      repaired_marker_count: manifest.parser_audit.repaired_marker_count,
      data_sha256: manifest.translation.sha256,
    }, null, 2)}\n`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

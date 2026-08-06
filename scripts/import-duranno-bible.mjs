#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_DATA_DIR = resolve("scripts/duranno-bible-data");
const BATCH_SIZE = 250;
const EXPECTED = {
  id: 89,
  code: "WKB",
  books: 66,
  chapters: 1_189,
  rows: 31_102,
};

function readOption(name, fallback = "") {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) || fallback;
}

function getRequiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
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

function validateRow(row) {
  if (
    row.translation_id !== EXPECTED.id ||
    row.translation_code !== EXPECTED.code ||
    !Number.isSafeInteger(row.book_number) ||
    row.book_number < 1 ||
    row.book_number > 66 ||
    typeof row.book_code !== "string" ||
    !Number.isSafeInteger(row.chapter) ||
    row.chapter < 1 ||
    row.chapter > 150 ||
    !Number.isSafeInteger(row.verse_start) ||
    row.verse_start < 1 ||
    row.verse_start > 176 ||
    !Number.isSafeInteger(row.verse_end) ||
    row.verse_end < row.verse_start ||
    row.verse_end > 176 ||
    typeof row.text !== "string" ||
    !row.text.trim()
  ) {
    throw new Error(`Invalid corpus row: ${JSON.stringify(row).slice(0, 240)}`);
  }

  return {
    translation_id: row.translation_id,
    translation_code: row.translation_code,
    book_number: row.book_number,
    book_code: row.book_code,
    chapter: row.chapter,
    verse_start: row.verse_start,
    verse_end: row.verse_end,
    text: row.text.trim(),
  };
}

function canonicalRow(row) {
  return [
    row.translation_id,
    row.translation_code,
    row.book_number,
    row.book_code,
    row.chapter,
    row.verse_start,
    row.verse_end,
    row.text,
  ].join("\x1f");
}

async function main() {
  const verifyOnly = process.argv.includes("--verify-only");
  if (!verifyOnly && !process.argv.includes("--confirm-import")) {
    throw new Error("Add --confirm-import to import the validated corpus.");
  }

  const dataDirectory = resolve(readOption("data", DEFAULT_DATA_DIR));
  const manifest = JSON.parse(await readFile(join(dataDirectory, "manifest.json"), "utf8"));
  const translation = manifest.translation;
  if (
    translation?.id !== EXPECTED.id ||
    translation?.code !== EXPECTED.code ||
    translation?.books !== EXPECTED.books ||
    translation?.chapters !== EXPECTED.chapters ||
    translation?.rows !== EXPECTED.rows ||
    typeof translation?.file !== "string" ||
    typeof translation?.sha256 !== "string" ||
    typeof translation?.content_sha256 !== "string"
  ) {
    throw new Error("Unexpected Duranno Bible manifest.");
  }

  const dataPath = join(dataDirectory, translation.file);
  const dataHash = await sha256File(dataPath);
  if (dataHash !== translation.sha256) {
    throw new Error(`Corpus checksum mismatch: ${dataHash}`);
  }

  const lines = createInterface({
    input: createReadStream(dataPath).pipe(createGunzip()),
    crlfDelay: Infinity,
  });
  const contentHash = createHash("sha256");
  let firstRow = true;
  const rows = [];

  for await (const line of lines) {
    if (!line.trim()) continue;
    const row = validateRow(JSON.parse(line));
    if (!firstRow) contentHash.update("\x1e");
    contentHash.update(canonicalRow(row), "utf8");
    firstRow = false;
    rows.push(row);
  }

  const actualContentHash = contentHash.digest("hex");
  if (rows.length !== EXPECTED.rows || actualContentHash !== translation.content_sha256) {
    throw new Error(
      `Corpus validation failed: rows=${rows.length}, content_sha256=${actualContentHash}`,
    );
  }
  if (verifyOnly) {
    process.stdout.write(
      `WKB: locally verified ${rows.length} rows; content_sha256=${actualContentHash}\n`,
    );
    return;
  }

  const supabase = createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SECRET_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  let processed = 0;

  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const batch = rows.slice(offset, offset + BATCH_SIZE);
    if (batch.length > BATCH_SIZE) throw new Error("Safety stop: batch exceeds 250 rows");

    const { error } = await supabase
      .from("duranno_bible_verses")
      .upsert(batch, { onConflict: "translation_id,book_number,chapter,verse_start" });
    if (error) throw new Error(`Import failed: ${error.message}`);

    processed += batch.length;
    if (processed % 2_500 === 0) {
      process.stdout.write(`WKB: upserted ${processed}/${EXPECTED.rows}\n`);
    }
  }

  const { count, error } = await supabase
    .from("duranno_bible_verses")
    .select("*", { count: "exact", head: true })
    .eq("translation_id", EXPECTED.id);
  if (error) throw new Error(`Database verification failed: ${error.message}`);
  if (count !== EXPECTED.rows) {
    throw new Error(`Database row mismatch: ${count}/${EXPECTED.rows}`);
  }

  process.stdout.write(
    `WKB: verified ${count} rows; content_sha256=${actualContentHash}\n`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

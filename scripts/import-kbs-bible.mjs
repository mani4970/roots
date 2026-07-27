#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";
import { createClient } from "@supabase/supabase-js";

const DATA_DIR = resolve("scripts/kbs-bible-data");
const BATCH_SIZE = 500;
const EXPECTED_TRANSLATIONS = new Map([
  [92, "NKRV"],
  [84, "KRV"],
  [98, "RNKSV"],
]);

function readStringOption(name, fallback) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) || fallback;
}

function getRequiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function sha256(path) {
  const hash = createHash("sha256");

  await new Promise((resolveHash, rejectHash) => {
    const input = createReadStream(path);
    input.on("data", (chunk) => hash.update(chunk));
    input.on("error", rejectHash);
    input.on("end", resolveHash);
  });

  return hash.digest("hex");
}

function validateRow(row, translation) {
  if (
    row.translation_id !== translation.id ||
    row.translation_code !== translation.code ||
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
    throw new Error(
      `Invalid corpus row for ${translation.code}: ${JSON.stringify(row).slice(0, 240)}`,
    );
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

async function importTranslation(supabase, translation) {
  const filePath = join(DATA_DIR, translation.file);
  const actualHash = await sha256(filePath);
  if (actualHash !== translation.sha256) {
    throw new Error(
      `Corpus checksum mismatch for ${translation.code}: ${actualHash}`,
    );
  }

  const lines = createInterface({
    input: createReadStream(filePath).pipe(createGunzip()),
    crlfDelay: Infinity,
  });
  let batch = [];
  let imported = 0;

  async function flush() {
    if (batch.length === 0) return;

    const { error } = await supabase
      .from("kbs_bible_verses")
      .upsert(batch, {
        onConflict: "translation_id,book_number,chapter,verse_start",
      });

    if (error) {
      throw new Error(`Import failed for ${translation.code}: ${error.message}`);
    }

    imported += batch.length;
    batch = [];
    if (imported % 5_000 === 0) {
      process.stdout.write(`${translation.code}: imported ${imported}/${translation.verses}\n`);
    }
  }

  for await (const line of lines) {
    if (!line.trim()) continue;
    batch.push(validateRow(JSON.parse(line), translation));
    if (batch.length >= BATCH_SIZE) await flush();
  }
  await flush();

  if (imported !== translation.verses) {
    throw new Error(
      `Imported row mismatch for ${translation.code}: ${imported}/${translation.verses}`,
    );
  }

  const { count, error } = await supabase
    .from("kbs_bible_verses")
    .select("*", { count: "exact", head: true })
    .eq("translation_id", translation.id);

  if (error) {
    throw new Error(`Verification failed for ${translation.code}: ${error.message}`);
  }
  if (count !== translation.verses) {
    throw new Error(
      `Database row mismatch for ${translation.code}: ${count}/${translation.verses}`,
    );
  }

  process.stdout.write(`${translation.code}: verified ${count} verses\n`);
}

async function main() {
  if (!process.argv.includes("--confirm-import")) {
    throw new Error("Add --confirm-import to import the validated corpus.");
  }

  const requestedTranslationCode = readStringOption("translation", "").toUpperCase();
  if (
    requestedTranslationCode &&
    !Array.from(EXPECTED_TRANSLATIONS.values()).includes(requestedTranslationCode)
  ) {
    throw new Error(`Unsupported --translation value: ${requestedTranslationCode}`);
  }

  const manifest = JSON.parse(
    await readFile(join(DATA_DIR, "manifest.json"), "utf8"),
  );
  if (!Array.isArray(manifest.translations)) {
    throw new Error("Unexpected Korean Bible corpus manifest.");
  }

  const translations = manifest.translations;
  const expectedTranslationCount = requestedTranslationCode ? 1 : EXPECTED_TRANSLATIONS.size;
  const expectedChapterCount = 1_189 * expectedTranslationCount;

  if (
    manifest.total_chapters !== expectedChapterCount ||
    translations.length !== expectedTranslationCount
  ) {
    throw new Error("Unexpected number of Korean Bible translations.");
  }

  for (const translation of translations) {
    if (EXPECTED_TRANSLATIONS.get(translation.id) !== translation.code) {
      throw new Error(`Unexpected translation in manifest: ${JSON.stringify(translation)}`);
    }
    if (requestedTranslationCode && translation.code !== requestedTranslationCode) {
      throw new Error(`Unexpected translation selection: ${translation.code}`);
    }
  }

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

  for (const translation of translations) {
    await importTranslation(supabase, translation);
  }

  process.stdout.write("Korean Bible corpus import and verification completed.\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

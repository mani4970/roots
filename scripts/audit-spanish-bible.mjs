#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const REQUIRE_LIVE = process.argv.includes("--live");
const ROOTS_TRANSLATION_ID = 101;
const YOUVERSION_BIBLE_ID = 128;
const EXPECTED_DISPLAY_NAME = "Nueva Versión Internacional 2025";
const OFFICIAL_COPYRIGHT =
  "La Santa Biblia, Nueva Versión Internacional® NVI® Copyright © 1999, 2015, 2022 by Biblica, Inc. Used by permission. All rights reserved worldwide.";
const API_BASE = "https://api.youversion.com/v1";
const FETCH_TIMEOUT_MS = 20_000;

const EXPECTED_BOOK_NAMES = [
  "Génesis", "Éxodo", "Levítico", "Números", "Deuteronomio", "Josué", "Jueces", "Rut",
  "1 Samuel", "2 Samuel", "1 Reyes", "2 Reyes", "1 Crónicas", "2 Crónicas", "Esdras", "Nehemías",
  "Ester", "Job", "Salmos", "Proverbios", "Eclesiastés", "Cantares", "Isaías", "Jeremías",
  "Lamentaciones", "Ezequiel", "Daniel", "Oseas", "Joel", "Amós", "Abdías", "Jonás", "Miqueas",
  "Nahúm", "Habacuc", "Sofonías", "Hageo", "Zacarías", "Malaquías", "Mateo", "Marcos", "Lucas",
  "Juan", "Hechos", "Romanos", "1 Corintios", "2 Corintios", "Gálatas", "Efesios", "Filipenses",
  "Colosenses", "1 Tesalonicenses", "2 Tesalonicenses", "1 Timoteo", "2 Timoteo", "Tito", "Filemón",
  "Hebreos", "Santiago", "1 Pedro", "2 Pedro", "1 Juan", "2 Juan", "3 Juan", "Judas", "Apocalipsis",
];

const EXPECTED_USFM_CODES = [
  "GEN", "EXO", "LEV", "NUM", "DEU", "JOS", "JDG", "RUT", "1SA", "2SA", "1KI", "2KI", "1CH",
  "2CH", "EZR", "NEH", "EST", "JOB", "PSA", "PRO", "ECC", "SNG", "ISA", "JER", "LAM", "EZK",
  "DAN", "HOS", "JOL", "AMO", "OBA", "JON", "MIC", "NAM", "HAB", "ZEP", "HAG", "ZEC", "MAL",
  "MAT", "MRK", "LUK", "JHN", "ACT", "ROM", "1CO", "2CO", "GAL", "EPH", "PHP", "COL", "1TH",
  "2TH", "1TI", "2TI", "TIT", "PHM", "HEB", "JAS", "1PE", "2PE", "1JN", "2JN", "3JN", "JUD",
  "REV",
];

// NVI 128 keeps these traditional verse numbers only in textual notes (or as
// empty references). Roots requests passages with include_notes=false, so the
// picker must not offer them as standalone verses.
const EXPECTED_OMITTED_VERSES = [
  { koBook: "마태복음", usfm: "MAT", chapter: 17, verse: 21 },
  { koBook: "마태복음", usfm: "MAT", chapter: 18, verse: 11 },
  { koBook: "마태복음", usfm: "MAT", chapter: 23, verse: 14 },
  { koBook: "마가복음", usfm: "MRK", chapter: 7, verse: 16 },
  { koBook: "마가복음", usfm: "MRK", chapter: 9, verse: 44 },
  { koBook: "마가복음", usfm: "MRK", chapter: 9, verse: 46 },
  { koBook: "마가복음", usfm: "MRK", chapter: 11, verse: 26 },
  { koBook: "마가복음", usfm: "MRK", chapter: 15, verse: 28 },
  { koBook: "누가복음", usfm: "LUK", chapter: 17, verse: 36 },
  { koBook: "누가복음", usfm: "LUK", chapter: 23, verse: 17 },
  { koBook: "요한복음", usfm: "JHN", chapter: 5, verse: 4 },
  { koBook: "사도행전", usfm: "ACT", chapter: 8, verse: 37 },
  { koBook: "사도행전", usfm: "ACT", chapter: 15, verse: 34 },
  { koBook: "사도행전", usfm: "ACT", chapter: 24, verse: 7 },
  { koBook: "사도행전", usfm: "ACT", chapter: 28, verse: 29 },
  { koBook: "로마서", usfm: "ROM", chapter: 16, verse: 24 },
];

const failures = [];
const checks = [];

function read(relativePath) {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");
}

function normalizeWhitespace(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function check(label, condition, detail = "") {
  const ok = Boolean(condition);
  checks.push({ label, ok, detail });
  if (!ok) failures.push(detail ? `${label}: ${detail}` : label);
}

function arraysEqual(left, right) {
  return Array.isArray(left) && Array.isArray(right) &&
    left.length === right.length && left.every((value, index) => value === right[index]);
}

function expectedRange(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function verseNumbers(verses) {
  return verses.map((verse) => Number(verse.num));
}

function omissionKey(item) {
  return `${item.koBook}:${item.chapter}:${item.verse}`;
}

function loadLocalEnv() {
  for (const name of [".env.local", ".env"]) {
    const filePath = path.join(PROJECT_ROOT, name);
    if (!fs.existsSync(filePath)) continue;

    for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match || process.env[match[1]]) continue;

      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      } else {
        value = value.replace(/\s+#.*$/, "").trim();
      }
      process.env[match[1]] = value;
    }
  }
}

function unwrapObject(payload) {
  if (Array.isArray(payload?.data)) return payload.data[0] ?? null;
  if (payload?.data && typeof payload.data === "object") return payload.data;
  return payload && typeof payload === "object" ? payload : null;
}

function unwrapArray(payload) {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

async function fetchJson(url, appKey) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-YVP-App-Key": appKey,
      },
      cache: "no-store",
      signal: controller.signal,
    });
    const body = await response.text();
    if (!response.ok) {
      throw new Error(`${response.status} ${body.slice(0, 220)}`);
    }
    return JSON.parse(body);
  } finally {
    clearTimeout(timeout);
  }
}

function buildPassageUrl(passageId) {
  const url = new URL(`${API_BASE}/bibles/${YOUVERSION_BIBLE_ID}/passages/${encodeURIComponent(passageId)}`);
  url.searchParams.set("format", "html");
  url.searchParams.set("include_headings", "false");
  url.searchParams.set("include_notes", "false");
  return url;
}

function collectConfiguredOmissions(bibleDataModule) {
  const found = [];
  for (const [koBook, chapterVerseCounts] of Object.entries(bibleDataModule.BIBLE_CHAPTERS)) {
    chapterVerseCounts.forEach((maxVerse, chapterIndex) => {
      const chapter = chapterIndex + 1;
      const available = new Set(
        bibleDataModule.getBibleVerseNumbers(koBook, chapter, ROOTS_TRANSLATION_ID),
      );
      for (let verse = 1; verse <= maxVerse; verse += 1) {
        if (!available.has(verse)) found.push({ koBook, chapter, verse });
      }
    });
  }
  return found;
}

function groupOmissionsForLiveAudit() {
  const grouped = new Map();
  for (const item of EXPECTED_OMITTED_VERSES) {
    const key = `${item.usfm}.${item.chapter}`;
    const group = grouped.get(key) ?? {
      usfm: item.usfm,
      chapter: item.chapter,
      omitted: [],
    };
    group.omitted.push(item.verse);
    grouped.set(key, group);
  }
  return [...grouped.values()].map((group) => ({
    ...group,
    omitted: [...group.omitted].sort((a, b) => a - b),
    start: Math.max(1, Math.min(...group.omitted) - 1),
    end: Math.max(...group.omitted) + 1,
  }));
}

async function main() {
  const bibleDataSource = read("lib/bibleData.ts");
  const bibleBooksSource = read("lib/bibleBooks.ts");
  const defaultsSource = read("lib/translationDefaults.ts");
  const verseRouteSource = read("app/api/verse/route.ts");
  const apiBibleSource = read("app/api/bible/route.ts");
  const photoSource = read("app/qt/photo/page.tsx");

  const bibleDataModule = await import(
    pathToFileURL(path.join(PROJECT_ROOT, "lib/bibleData.ts")).href
  );
  const bibleBooksModule = await import(
    pathToFileURL(path.join(PROJECT_ROOT, "lib/bibleBooks.ts")).href
  );
  const parserModule = await import(
    pathToFileURL(path.join(PROJECT_ROOT, "lib/youVersionBible.ts")).href
  );

  const {
    ROOTS_END_OF_CHAPTER_SENTINEL,
    buildYouVersionPassageId,
    getYouVersionBibleSource,
    getYouVersionBookCode,
    parseYouVersionHtmlVerses,
  } = parserModule;

  const spanishGroups = bibleDataModule.TRANSLATIONS.filter((group) => group.group === "Español");
  const spanishItems = spanishGroups.flatMap((group) => group.items);
  const nviSource = getYouVersionBibleSource(ROOTS_TRANSLATION_ID);

  check("There is exactly one Spanish translation group", spanishGroups.length === 1, `found ${spanishGroups.length}`);
  check(
    "NVI is the only Spanish selectable translation",
    spanishItems.length === 1 && spanishItems[0]?.id === ROOTS_TRANSLATION_ID && spanishItems[0]?.name === "NVI",
    JSON.stringify(spanishItems),
  );
  check("Roots translation 101 is selectable", bibleDataModule.isSelectableBibleTranslationId(ROOTS_TRANSLATION_ID));
  check("Roots translation 101 maps to ES", bibleDataModule.TRANSLATION_LANG[ROOTS_TRANSLATION_ID] === "ES");
  check("Spanish default is Roots translation 101", /\bes\s*:\s*101\b/.test(defaultsSource));
  check("Today’s Word accepts Spanish", /value\s*===\s*["']es["']/.test(verseRouteSource));
  check("Bible route indexes every localized book name", /Object\.values\(BOOK_NAMES\)/.test(apiBibleSource));
  check("Bible route rejects combined YouVersion verse markers", /YouVersion passage contained a combined or non-numeric verse marker/.test(apiBibleSource));
  check("Photo Bible Reflection maps NVI to Spanish book names", /bibleLang\s*===\s*["']ES["']\)\s*return\s*["']es["']/.test(photoSource));
  check("Photo Bible Reflection accepts Spanish as a fallback language", /fallbackLang[\s\S]{0,220}["']es["']/.test(photoSource));
  check("Photo Bible Reflection uses translation-specific verse lists", (photoSource.match(/getBibleVerseNumbers\(/g) ?? []).length >= 3);

  const bibleDataBooks = bibleDataModule.BOOK_NAMES.ES ?? [];
  const bibleBooksBooks = bibleBooksModule.BOOK_NAMES.ES ?? [];
  check("lib/bibleData.ts has exactly 66 Spanish books", bibleDataBooks.length === 66, `found ${bibleDataBooks.length}`);
  check("lib/bibleBooks.ts has exactly 66 Spanish books", bibleBooksBooks.length === 66, `found ${bibleBooksBooks.length}`);
  check("Spanish book order matches the approved 66-book list", arraysEqual(bibleDataBooks, EXPECTED_BOOK_NAMES));
  check("Both Spanish book arrays are identical", arraysEqual(bibleDataBooks, bibleBooksBooks));
  check("Spanish reference localization works", bibleBooksModule.translateBibleRef("요한복음 3:16-18", "es") === "Juan 3:16-18");
  check("Spanish UI language maps to ES Bible names", /\bes\s*:\s*["']ES["']/.test(bibleBooksSource));

  check("Roots 101 resolves to a YouVersion source", Boolean(nviSource));
  check("Roots 101 maps to YouVersion Bible 128", nviSource?.youVersionBibleId === YOUVERSION_BIBLE_ID);
  check("NVI display name is the licensed 2025 entry", nviSource?.displayName === EXPECTED_DISPLAY_NAME, String(nviSource?.displayName));
  check("NVI source is Biblica licensed", nviSource?.license === "biblica");
  check("NVI source abbreviation is NVI-S", nviSource?.abbreviation === "NVI-S");
  check("NVI attribution points to YouVersion 128", nviSource?.attributionUrl === "https://www.bible.com/versions/128");
  check("NVI copyright notice is exact", nviSource?.copyrightNotice === OFFICIAL_COPYRIGHT);

  const usfmCodes = EXPECTED_USFM_CODES.map((_, index) => getYouVersionBookCode(index + 1));
  check("YouVersion USFM mapping contains 66 books", usfmCodes.length === 66 && usfmCodes.every(Boolean));
  check("YouVersion USFM mapping order is canonical", arraysEqual(usfmCodes, EXPECTED_USFM_CODES));
  check("Single-verse passage ID is correct", buildYouVersionPassageId({ bookNum: 43, chapter: 3, startVerse: 16, endVerse: 16 }) === "JHN.3.16");
  check("Verse-range passage ID is correct", buildYouVersionPassageId({ bookNum: 16, chapter: 4, startVerse: 14, endVerse: 18 }) === "NEH.4.14-18");
  check("End-of-chapter sentinel requests the whole chapter", buildYouVersionPassageId({ bookNum: 19, chapter: 119, startVerse: 1, endVerse: ROOTS_END_OF_CHAPTER_SENTINEL }) === "PSA.119");

  const configuredOmissions = collectConfiguredOmissions(bibleDataModule);
  const configuredOmissionKeys = configuredOmissions.map(omissionKey).sort();
  const expectedOmissionKeys = EXPECTED_OMITTED_VERSES.map(omissionKey).sort();
  check(
    "NVI verse picker omits exactly the 16 note-only/empty verse numbers",
    arraysEqual(configuredOmissionKeys, expectedOmissionKeys),
    `configured=${configuredOmissionKeys.join(",")}`,
  );
  for (const item of EXPECTED_OMITTED_VERSES) {
    const numbers = bibleDataModule.getBibleVerseNumbers(item.koBook, item.chapter, ROOTS_TRANSLATION_ID);
    check(
      `NVI picker excludes ${item.usfm}.${item.chapter}.${item.verse}`,
      !numbers.includes(item.verse),
    );
  }

  const fixtureHtml = [
    '<div class="p"><span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>&iquest;Qui&eacute;n dijo: &laquo;&iexcl;Se&ntilde;or, gu&iacute;ame!&raquo;? 1.&ordm;<span class="yv-note">nota que no debe mostrarse</span></div>',
    '<div class="p"><span class="yv-v" v="2"></span><span class="yv-vlbl">2</span>La ni&ntilde;a respondi&oacute;: Am&eacute;n.</div>',
    '<div class="p"><span class="yv-v" v="3"></span><span class="yv-vlbl">3</span>Primera parte.</div>',
    '<div class="p"><span class="yv-v" v="3"></span><span class="yv-vlbl">3</span>Segunda parte.</div>',
  ].join("");
  const fixtureVerses = parseYouVersionHtmlVerses(fixtureHtml, 1, 3);
  check("Parser separates fixture into verses 1, 2, and 3", arraysEqual(verseNumbers(fixtureVerses), [1, 2, 3]));
  check("Parser decodes Spanish punctuation, accents, and ordinal entities", fixtureVerses[0]?.text === "¿Quién dijo: «¡Señor, guíame!»? 1.º");
  check("Parser removes YouVersion note labels", !fixtureVerses.some((verse) => verse.text.includes("nota que no debe mostrarse")));
  check("Parser merges duplicate fragments for the same official marker", fixtureVerses[2]?.text === "Primera parte. Segunda parte.");

  const combinedFixture = '<div><span class="yv-v" v="1-2"></span><span class="yv-vlbl">1-2</span>Texto combinado.</div>';
  const combinedVerses = parseYouVersionHtmlVerses(combinedFixture, 1, 2);
  check("Parser preserves a combined marker so the Bible route can reject it", combinedVerses.length === 1 && combinedVerses[0]?.num === "1-2");

  let liveChecksRun = false;
  if (REQUIRE_LIVE) {
    loadLocalEnv();
    const appKey = (process.env.YVP_APP_KEY || process.env.YOUVERSION_APP_KEY || "").trim();
    check("YouVersion App Key is available for live audit", Boolean(appKey), "YVP_APP_KEY was not found in the environment or .env.local");

    if (appKey) {
      liveChecksRun = true;
      const metadataPayload = await fetchJson(`${API_BASE}/bibles/${YOUVERSION_BIBLE_ID}`, appKey);
      const metadata = unwrapObject(metadataPayload);
      const metadataBooks = Array.isArray(metadata?.books) ? metadata.books : [];
      const languageTag = String(metadata?.language_tag ?? metadata?.language?.iso_639_1 ?? "");
      const title = String(metadata?.localized_title ?? metadata?.title ?? "");
      const abbreviation = String(metadata?.localized_abbreviation ?? metadata?.abbreviation ?? "");
      const copyright = normalizeWhitespace(metadata?.copyright);

      check("Live NVI metadata returns Bible ID 128", Number(metadata?.id) === YOUVERSION_BIBLE_ID);
      check("Live NVI metadata is Spanish", languageTag.toLowerCase().startsWith("es"), `language_tag=${languageTag || "missing"}`);
      check("Live NVI title identifies Nueva Versión Internacional", /Nueva\s+Versi[oó]n\s+Internacional/i.test(title), `title=${title || "missing"}`);
      check("Live NVI abbreviation contains NVI", /NVI/i.test(abbreviation), `abbreviation=${abbreviation || "missing"}`);
      check("Live NVI metadata exposes the canonical 66 books", arraysEqual(metadataBooks, EXPECTED_USFM_CODES), `books=${metadataBooks.length}`);

      // YouVersion documents Bible.copyright as the publisher-provided short
      // copyright field. It may omit permission/reservation sentences that
      // Roots must still display from the licensed full notice above. Validate
      // the live field only as provider identity/version evidence, while the
      // exact in-app notice remains protected by the static equality check.
      check("Live copyright is non-empty", copyright.length > 0);
      for (const fragment of ["Nueva Versión Internacional", "Biblica", "1999", "2015", "2022"]) {
        check(`Live copyright contains “${fragment}”`, copyright.includes(fragment));
      }
      check("App copyright contains “Used by permission”", nviSource?.copyrightNotice?.includes("Used by permission"));
      check("App copyright contains “All rights reserved worldwide”", nviSource?.copyrightNotice?.includes("All rights reserved worldwide"));

      const booksPayload = await fetchJson(`${API_BASE}/bibles/${YOUVERSION_BIBLE_ID}/books`, appKey);
      const liveBooks = unwrapArray(booksPayload);
      const liveBookIds = liveBooks.map((book) => String(book?.id ?? ""));
      check("Live NVI book collection contains 66 canonical books", arraysEqual(liveBookIds, EXPECTED_USFM_CODES), `books=${liveBookIds.length}`);
      check("Live NVI book collection has non-empty titles", liveBooks.length === 66 && liveBooks.every((book) => normalizeWhitespace(book?.title ?? book?.full_title).length > 0));

      const liveCases = [
        { label: "single verse", id: "JHN.3.16", start: 16, end: 16, expected: [16] },
        { label: "short range", id: "PSA.23.1-6", start: 1, end: 6, expected: expectedRange(1, 6) },
        { label: "Spanish punctuation range", id: "NEH.4.14-18", start: 14, end: 18, expected: expectedRange(14, 18) },
        { label: "poetry range", id: "SNG.1.1-7", start: 1, end: 7, expected: expectedRange(1, 7) },
        { label: "full chapter", id: "GEN.1", start: 1, end: ROOTS_END_OF_CHAPTER_SENTINEL, expected: expectedRange(1, 31) },
        { label: "176-verse chapter", id: "PSA.119", start: 1, end: ROOTS_END_OF_CHAPTER_SENTINEL, expected: expectedRange(1, 176) },
        { label: "cross-chapter first segment", id: "2CO.4.16-18", start: 16, end: 18, expected: expectedRange(16, 18), crossChapter: true },
        { label: "cross-chapter second segment", id: "2CO.5.1-5", start: 1, end: 5, expected: expectedRange(1, 5), crossChapter: true },
      ];

      let representativeVerseTotal = 0;
      let crossChapterVerseTotal = 0;
      for (const test of liveCases) {
        const passagePayload = await fetchJson(buildPassageUrl(test.id).toString(), appKey);
        const passage = unwrapObject(passagePayload);
        const content = typeof passage?.content === "string" ? passage.content : "";
        const verses = parseYouVersionHtmlVerses(content, test.start, test.end);
        const numbers = verseNumbers(verses);
        representativeVerseTotal += verses.length;
        if (test.crossChapter) crossChapterVerseTotal += verses.length;

        check(`Live ${test.label} separates every verse`, arraysEqual(numbers, test.expected), `${test.id}: ${numbers.join(",")}`);
        check(`Live ${test.label} has non-empty text`, verses.length > 0 && verses.every((verse) => normalizeWhitespace(verse.text).length > 0));
        check(`Live ${test.label} contains no HTML or unresolved entities`, verses.every((verse) => !/<[^>]+>|&(?:#\d+|#x[0-9a-f]+|[a-z][a-z0-9]+);/i.test(verse.text)));
      }
      check("Representative live passages preserve all 234 expected verses", representativeVerseTotal === 234, `found ${representativeVerseTotal}`);
      check("Cross-chapter simulation preserves all eight verses", crossChapterVerseTotal === 8, `found ${crossChapterVerseTotal}`);

      for (const group of groupOmissionsForLiveAudit()) {
        const passageId = `${group.usfm}.${group.chapter}.${group.start}-${group.end}`;
        const passagePayload = await fetchJson(buildPassageUrl(passageId).toString(), appKey);
        const passage = unwrapObject(passagePayload);
        const content = typeof passage?.content === "string" ? passage.content : "";
        const verses = parseYouVersionHtmlVerses(content, group.start, group.end);
        const numbers = verseNumbers(verses);
        const expected = expectedRange(group.start, group.end).filter(
          (verse) => !group.omitted.includes(verse),
        );
        check(
          `Live ${group.usfm}.${group.chapter} excludes note-only verse numbers ${group.omitted.join(",")}`,
          arraysEqual(numbers, expected),
          `${passageId}: ${numbers.join(",")}`,
        );
        check(
          `Live ${group.usfm}.${group.chapter} neighboring verses remain non-empty`,
          verses.length === expected.length && verses.every((verse) => normalizeWhitespace(verse.text).length > 0),
        );
      }
    }
  }

  console.log("Spanish Bible audit (read-only)");
  console.log(`Project: ${PROJECT_ROOT}`);
  console.log(`Mode: ${REQUIRE_LIVE ? "static + live YouVersion" : "static + parser fixtures"}`);
  console.log(`Roots translation: ${ROOTS_TRANSLATION_ID} → YouVersion Bible: ${YOUVERSION_BIBLE_ID}`);
  console.log(`Checks: ${checks.length - failures.length}/${checks.length} passed`);
  for (const item of checks) {
    console.log(`  - ${item.ok ? "PASS" : "FAIL"} ${item.label}${item.detail && !item.ok ? ` — ${item.detail}` : ""}`);
  }
  if (REQUIRE_LIVE) {
    console.log(`Live provider checks: ${liveChecksRun ? "completed" : "not completed"}`);
  }

  if (failures.length > 0) {
    console.error(`\nSpanish Bible audit failed: ${failures.length} issue(s).`);
    process.exitCode = 1;
  } else {
    console.log("\nSpanish Bible audit passed.");
  }
}

main().catch((error) => {
  console.error("Spanish Bible audit could not complete:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

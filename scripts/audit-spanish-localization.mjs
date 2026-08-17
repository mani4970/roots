#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const STRICT = process.argv.includes("--strict");

const SOURCE_ROOTS = ["app", "components", "lib", "android", "ios", "supabase"];
const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".swift",
  ".java",
  ".sql",
  ".plist",
  ".xml",
]);

function read(relativePath) {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split("\n").length;
}

function skipQuoted(source, index) {
  const quote = source[index];
  let cursor = index + 1;
  let escaped = false;

  while (cursor < source.length) {
    const char = source[cursor];
    if (escaped) {
      escaped = false;
    } else if (char === "\\") {
      escaped = true;
    } else if (char === quote) {
      return cursor + 1;
    }
    cursor += 1;
  }

  return source.length;
}

function skipLineComment(source, index) {
  const newline = source.indexOf("\n", index + 2);
  return newline === -1 ? source.length : newline + 1;
}

function skipBlockComment(source, index) {
  const close = source.indexOf("*/", index + 2);
  return close === -1 ? source.length : close + 2;
}

function skipTrivia(source, index, limit = source.length) {
  let cursor = index;
  while (cursor < limit) {
    const char = source[cursor];
    if (/\s/.test(char)) {
      cursor += 1;
      continue;
    }
    if (char === "/" && source[cursor + 1] === "/") {
      cursor = skipLineComment(source, cursor);
      continue;
    }
    if (char === "/" && source[cursor + 1] === "*") {
      cursor = skipBlockComment(source, cursor);
      continue;
    }
    break;
  }
  return cursor;
}

function findMatchingDelimiter(source, openIndex, openChar = "{", closeChar = "}") {
  let depth = 0;
  let cursor = openIndex;

  while (cursor < source.length) {
    const char = source[cursor];
    if (char === '"' || char === "'" || char === "`") {
      cursor = skipQuoted(source, cursor);
      continue;
    }
    if (char === "/" && source[cursor + 1] === "/") {
      cursor = skipLineComment(source, cursor);
      continue;
    }
    if (char === "/" && source[cursor + 1] === "*") {
      cursor = skipBlockComment(source, cursor);
      continue;
    }
    if (char === openChar) depth += 1;
    if (char === closeChar) {
      depth -= 1;
      if (depth === 0) return cursor;
    }
    cursor += 1;
  }

  throw new Error(`Could not find matching ${closeChar} for ${openChar} at index ${openIndex}`);
}

function findObjectByMarker(source, marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex === -1) throw new Error(`Marker not found: ${marker}`);

  const assignmentIndex = source.indexOf("=", markerIndex + marker.length);
  if (assignmentIndex === -1) throw new Error(`Assignment not found after marker: ${marker}`);

  const openIndex = source.indexOf("{", assignmentIndex + 1);
  if (openIndex === -1) throw new Error(`Object opening brace not found after marker: ${marker}`);

  const closeIndex = findMatchingDelimiter(source, openIndex, "{", "}");
  return { openIndex, closeIndex };
}

function parsePropertyKey(source, index, limit) {
  const cursor = skipTrivia(source, index, limit);
  const char = source[cursor];

  if (char === '"' || char === "'") {
    const end = skipQuoted(source, cursor);
    return {
      key: source.slice(cursor + 1, end - 1),
      end,
      start: cursor,
    };
  }

  const match = source.slice(cursor, limit).match(/^[$A-Z_a-z][$\w]*/);
  if (!match) return null;
  return {
    key: match[0],
    end: cursor + match[0].length,
    start: cursor,
  };
}

function findTopLevelValueEnd(source, index, limit) {
  let cursor = index;
  let braceDepth = 0;
  let bracketDepth = 0;
  let parenDepth = 0;

  while (cursor < limit) {
    const char = source[cursor];
    if (char === '"' || char === "'" || char === "`") {
      cursor = skipQuoted(source, cursor);
      continue;
    }
    if (char === "/" && source[cursor + 1] === "/") {
      cursor = skipLineComment(source, cursor);
      continue;
    }
    if (char === "/" && source[cursor + 1] === "*") {
      cursor = skipBlockComment(source, cursor);
      continue;
    }

    if (char === "{") braceDepth += 1;
    else if (char === "}") braceDepth -= 1;
    else if (char === "[") bracketDepth += 1;
    else if (char === "]") bracketDepth -= 1;
    else if (char === "(") parenDepth += 1;
    else if (char === ")") parenDepth -= 1;
    else if (char === "," && braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
      return cursor;
    }

    cursor += 1;
  }

  return limit;
}

function parseTopLevelObjectEntries(source, objectRange) {
  const entries = [];
  let cursor = objectRange.openIndex + 1;

  while (cursor < objectRange.closeIndex) {
    cursor = skipTrivia(source, cursor, objectRange.closeIndex);
    while (source[cursor] === ",") {
      cursor = skipTrivia(source, cursor + 1, objectRange.closeIndex);
    }
    if (cursor >= objectRange.closeIndex) break;

    const property = parsePropertyKey(source, cursor, objectRange.closeIndex);
    if (!property) {
      cursor += 1;
      continue;
    }

    let colonIndex = skipTrivia(source, property.end, objectRange.closeIndex);
    if (source[colonIndex] !== ":") {
      cursor = property.end;
      continue;
    }

    const valueStart = skipTrivia(source, colonIndex + 1, objectRange.closeIndex);
    const valueEnd = findTopLevelValueEnd(source, valueStart, objectRange.closeIndex);
    entries.push({
      key: property.key,
      line: lineNumberAt(source, property.start),
      value: source.slice(valueStart, valueEnd).trim(),
    });
    cursor = valueEnd + 1;
  }

  return entries;
}

function getLanguageKeys(value) {
  const openIndex = value.indexOf("{");
  if (openIndex === -1) return new Set();

  let closeIndex;
  try {
    closeIndex = findMatchingDelimiter(value, openIndex, "{", "}");
  } catch {
    return new Set();
  }

  return new Set(parseTopLevelObjectEntries(value, { openIndex, closeIndex }).map((entry) => entry.key));
}

function auditTranslationObject(relativePath, marker) {
  const source = read(relativePath);
  const objectRange = findObjectByMarker(source, marker);
  const entries = parseTopLevelObjectEntries(source, objectRange);
  const missingSpanish = entries.filter((entry) => !getLanguageKeys(entry.value).has("es"));

  return {
    relativePath,
    total: entries.length,
    missingSpanish,
  };
}

function auditStandaloneLanguageRecord(relativePath, marker) {
  const source = read(relativePath);
  const objectRange = findObjectByMarker(source, marker);
  const entries = parseTopLevelObjectEntries(source, objectRange);
  const koreanEntry = entries.find((entry) => entry.key === "ko");
  const spanishEntry = entries.find((entry) => entry.key === "es");
  const expectedFields = koreanEntry ? getLanguageKeys(koreanEntry.value) : new Set();
  const spanishFields = spanishEntry ? getLanguageKeys(spanishEntry.value) : new Set();
  const missingFields = [...expectedFields].filter((field) => !spanishFields.has(field));
  const extraFields = [...spanishFields].filter((field) => !expectedFields.has(field));

  return {
    relativePath,
    expected: expectedFields.size,
    translated: expectedFields.size - missingFields.length,
    missingFields,
    extraFields,
    spanishPresent: Boolean(spanishEntry),
  };
}

function walk(relativeRoot) {
  const absoluteRoot = path.join(PROJECT_ROOT, relativeRoot);
  if (!fs.existsSync(absoluteRoot)) return [];

  const output = [];
  const stack = [absoluteRoot];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolutePath);
      } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
        output.push(absolutePath);
      }
    }
  }
  return output;
}

function collectHardcodedFourLanguageSurfaces() {
  const findings = [];
  const seen = new Set();
  const allFiles = SOURCE_ROOTS.flatMap(walk);

  for (const absolutePath of allFiles) {
    const relativePath = path.relative(PROJECT_ROOT, absolutePath).split(path.sep).join("/");
    const source = fs.readFileSync(absolutePath, "utf8");
    const lines = source.split("\n");

    lines.forEach((line, index) => {
      const hasKo = /["']ko["']/.test(line);
      const hasDe = /["']de["']/.test(line);
      const hasEn = /["']en["']/.test(line);
      const hasFr = /["']fr["']/.test(line);
      const hasEs = /["']es["']/.test(line);
      const comparisonCount = ["ko", "de", "en", "fr"].filter((lang) =>
        new RegExp(`(?:lang|locale|language|value|stored)\\s*===?\\s*["']${lang}["']`).test(line),
      ).length;

      const looksLikeFourLanguageList = hasKo && hasDe && hasEn && hasFr && !hasEs;
      const looksLikeLanguageNormalizer = comparisonCount >= 2 && !hasEs;
      const looksLikeStaticDocumentLang = /<html\s+lang=["']ko["']/.test(line);

      if (!looksLikeFourLanguageList && !looksLikeLanguageNormalizer && !looksLikeStaticDocumentLang) {
        return;
      }

      const key = `${relativePath}:${index + 1}`;
      if (seen.has(key)) return;
      seen.add(key);
      findings.push({
        relativePath,
        line: index + 1,
        snippet: line.trim().replace(/\s+/g, " ").slice(0, 180),
      });
    });

    const isNativeOfflineFile =
      relativePath === "ios/App/App/AppDelegate.swift" ||
      relativePath === "android/app/src/main/java/com/rootspuce/app/MainActivity.java";
    if (isNativeOfflineFile && /case\s+["']fr["']/.test(source) && !/case\s+["']es["']/.test(source)) {
      const match = source.match(/case\s+["']fr["']/);
      const line = match ? lineNumberAt(source, match.index ?? 0) : 1;
      const key = `${relativePath}:${line}:native`;
      if (!seen.has(key)) {
        seen.add(key);
        findings.push({
          relativePath,
          line,
          snippet: "Native offline-language switch has fr but no es case",
        });
      }
    }
  }

  return findings.sort((a, b) =>
    a.relativePath.localeCompare(b.relativePath) || a.line - b.line,
  );
}

function countArrayStringItems(value) {
  const openIndex = value.indexOf("[");
  if (openIndex === -1) return 0;
  let closeIndex;
  try {
    closeIndex = findMatchingDelimiter(value, openIndex, "[", "]");
  } catch {
    return 0;
  }

  let cursor = openIndex + 1;
  let count = 0;
  while (cursor < closeIndex) {
    cursor = skipTrivia(value, cursor, closeIndex);
    const char = value[cursor];
    if (char === '"' || char === "'") {
      count += 1;
      cursor = skipQuoted(value, cursor);
      continue;
    }
    cursor += 1;
  }
  return count;
}

function auditSpanishBibleBooks(relativePath) {
  const source = read(relativePath);
  const objectRange = findObjectByMarker(source, "BOOK_NAMES");
  const entries = parseTopLevelObjectEntries(source, objectRange);
  const spanish = entries.find((entry) => entry.key === "ES");
  return {
    relativePath,
    count: spanish ? countArrayStringItems(spanish.value) : 0,
  };
}

function printFindingList(title, findings, limit = 30) {
  console.log(`\n${title}: ${findings.length}`);
  findings.slice(0, limit).forEach((finding) => {
    console.log(`  - ${finding.relativePath}:${finding.line} ${finding.snippet}`);
  });
  if (findings.length > limit) {
    console.log(`  ... ${findings.length - limit} more`);
  }
}

const central = auditTranslationObject("lib/i18n.ts", "export const T");
const qtWrite = auditTranslationObject("app/qt/write/page.tsx", "const QT_WRITE_TRANSLATIONS");
const photo = auditTranslationObject("app/qt/photo/page.tsx", "const PHOTO_COPY");
const notificationSettings = auditStandaloneLanguageRecord(
  "lib/notifications/settingsText.ts",
  "const NOTIFICATION_SETTINGS_TEXT",
);
const hardcoded = collectHardcodedFourLanguageSurfaces();
const bibleDataBooks = auditSpanishBibleBooks("lib/bibleData.ts");
const bibleBooksBooks = auditSpanishBibleBooks("lib/bibleBooks.ts");

const i18nSource = read("lib/i18n.ts");
const supportedLangsHasSpanish = /SUPPORTED_LANGS\s*=\s*\[[^\]]*["']es["']/.test(i18nSource);
const defaultTranslationSource = read("lib/translationDefaults.ts");
const spanishDefaultIs101 = /\bes\s*:\s*101\b/.test(defaultTranslationSource);
const youVersionSource = read("lib/youVersionBible.ts");
const nviMappingIsPresent = /\b101\s*:\s*\{[\s\S]*?rootsTranslationId\s*:\s*101[\s\S]*?youVersionBibleId\s*:\s*128/.test(youVersionSource);

console.log("Spanish localization audit (read-only)");
console.log(`Mode: ${STRICT ? "strict" : "report"}`);
console.log(`Project: ${PROJECT_ROOT}`);
console.log("\nTranslation dictionaries");
console.log(`  - lib/i18n.ts: ${central.total} total, ${central.missingSpanish.length} missing es`);
console.log(`  - app/qt/write/page.tsx: ${qtWrite.total} total, ${qtWrite.missingSpanish.length} missing es`);
console.log(`  - app/qt/photo/page.tsx: ${photo.total} total, ${photo.missingSpanish.length} missing es`);
console.log("\nStaged standalone dictionaries");
console.log(
  `  - lib/notifications/settingsText.ts: ${notificationSettings.translated}/${notificationSettings.expected} Spanish fields`,
);
if (notificationSettings.missingFields.length > 0) {
  console.log(`    missing: ${notificationSettings.missingFields.join(", ")}`);
}
if (notificationSettings.extraFields.length > 0) {
  console.log(`    extra: ${notificationSettings.extraFields.join(", ")}`);
}
console.log("\nFoundation status");
console.log(`  - SUPPORTED_LANGS includes es: ${supportedLangsHasSpanish ? "yes" : "no"}`);
console.log(`  - Spanish default translation is Roots ID 101: ${spanishDefaultIs101 ? "yes" : "no"}`);
console.log(`  - Roots 101 -> YouVersion 128 mapping: ${nviMappingIsPresent ? "yes" : "no"}`);
console.log(`  - lib/bibleData.ts Spanish book names: ${bibleDataBooks.count}/66`);
console.log(`  - lib/bibleBooks.ts Spanish book names: ${bibleBooksBooks.count}/66`);
printFindingList("Four-language hardcoded surfaces", hardcoded);

const strictFailures = [
  central.missingSpanish.length > 0,
  qtWrite.missingSpanish.length > 0,
  photo.missingSpanish.length > 0,
  !notificationSettings.spanishPresent,
  notificationSettings.missingFields.length > 0,
  notificationSettings.extraFields.length > 0,
  hardcoded.length > 0,
  !supportedLangsHasSpanish,
  !spanishDefaultIs101,
  !nviMappingIsPresent,
  bibleDataBooks.count !== 66,
  bibleBooksBooks.count !== 66,
];

if (STRICT && strictFailures.some(Boolean)) {
  console.error("\nSpanish localization audit failed in strict mode.");
  process.exitCode = 1;
} else if (STRICT) {
  console.log("\nSpanish localization audit passed in strict mode.");
} else {
  console.log("\nReport mode does not change files and does not fail the build.");
  console.log("Use --strict only after the Spanish implementation is complete.");
}

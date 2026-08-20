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

  const match = source.slice(cursor, limit).match(/^(?:[$A-Z_a-z][$\w]*|\d+)/);
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

function getLanguageValueMap(value) {
  const openIndex = value.indexOf("{");
  if (openIndex === -1) return new Map();

  let closeIndex;
  try {
    closeIndex = findMatchingDelimiter(value, openIndex, "{", "}");
  } catch {
    return new Map();
  }

  return new Map(
    parseTopLevelObjectEntries(value, { openIndex, closeIndex })
      .map((entry) => [entry.key, entry.value]),
  );
}

function extractPlaceholders(value) {
  return new Set(value.match(/\{[A-Za-z_][A-Za-z0-9_]*\}/g) ?? []);
}

function isEmptyStringLiteral(value) {
  const trimmed = value.trim();
  return trimmed === '""' || trimmed === "''" || trimmed === "``";
}

function getSourceTranslationValue(entry, languageValues, sourceLang, useEntryKeyAsSourceFallback) {
  if (languageValues.has(sourceLang)) return languageValues.get(sourceLang);
  return useEntryKeyAsSourceFallback ? JSON.stringify(entry.key) : null;
}

function auditTranslationEmptyParity(
  relativePath,
  marker,
  sourceLang = "ko",
  targetLang = "es",
  useEntryKeyAsSourceFallback = false,
) {
  const source = read(relativePath);
  const objectRange = findObjectByMarker(source, marker);
  const entries = parseTopLevelObjectEntries(source, objectRange);
  const blankTargets = [];
  let compared = 0;

  for (const entry of entries) {
    const languageValues = getLanguageValueMap(entry.value);
    const sourceValue = getSourceTranslationValue(entry, languageValues, sourceLang, useEntryKeyAsSourceFallback);
    if (sourceValue === null || !languageValues.has(targetLang)) continue;
    compared += 1;
    const sourceIsEmpty = isEmptyStringLiteral(sourceValue);
    const targetIsEmpty = isEmptyStringLiteral(languageValues.get(targetLang));
    if (!sourceIsEmpty && targetIsEmpty) {
      blankTargets.push({ key: entry.key, line: entry.line });
    }
  }

  return { relativePath, compared, blankTargets };
}

function auditTranslationPlaceholderParity(
  relativePath,
  marker,
  sourceLang = "ko",
  targetLang = "es",
  useEntryKeyAsSourceFallback = false,
) {
  const source = read(relativePath);
  const objectRange = findObjectByMarker(source, marker);
  const entries = parseTopLevelObjectEntries(source, objectRange);
  const mismatches = [];
  let compared = 0;

  for (const entry of entries) {
    const languageValues = getLanguageValueMap(entry.value);
    const sourceValue = getSourceTranslationValue(entry, languageValues, sourceLang, useEntryKeyAsSourceFallback);
    if (sourceValue === null || !languageValues.has(targetLang)) continue;
    compared += 1;

    const sourcePlaceholders = extractPlaceholders(sourceValue);
    const targetPlaceholders = extractPlaceholders(languageValues.get(targetLang));
    const missing = [...sourcePlaceholders].filter((placeholder) => !targetPlaceholders.has(placeholder));
    const extra = [...targetPlaceholders].filter((placeholder) => !sourcePlaceholders.has(placeholder));
    if (missing.length > 0 || extra.length > 0) {
      mismatches.push({ key: entry.key, line: entry.line, missing, extra });
    }
  }

  return { relativePath, compared, mismatches };
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

function collectValueShape(value, prefix = "") {
  const trimmed = value.trim();
  if (trimmed.startsWith("{")) {
    let closeIndex;
    try {
      closeIndex = findMatchingDelimiter(trimmed, 0, "{", "}");
    } catch {
      return [`${prefix}:invalid-object`];
    }
    return parseTopLevelObjectEntries(trimmed, { openIndex: 0, closeIndex }).flatMap((entry) =>
      collectValueShape(entry.value, prefix ? `${prefix}.${entry.key}` : entry.key),
    );
  }
  if (trimmed.startsWith("[")) {
    return [`${prefix}[]:${countArrayStringItems(trimmed)}`];
  }
  return [prefix];
}

function countStringLeaves(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith("{")) {
    let closeIndex;
    try {
      closeIndex = findMatchingDelimiter(trimmed, 0, "{", "}");
    } catch {
      return 0;
    }
    return parseTopLevelObjectEntries(trimmed, { openIndex: 0, closeIndex })
      .reduce((sum, entry) => sum + countStringLeaves(entry.value), 0);
  }
  if (trimmed.startsWith("[")) return countArrayStringItems(trimmed);
  return trimmed.startsWith('"') || trimmed.startsWith("'") || trimmed.startsWith("`") ? 1 : 0;
}

function auditDeepStandaloneLanguageRecord(relativePath, marker) {
  const source = read(relativePath);
  const objectRange = findObjectByMarker(source, marker);
  const entries = parseTopLevelObjectEntries(source, objectRange);
  const koreanEntry = entries.find((entry) => entry.key === "ko");
  const spanishEntry = entries.find((entry) => entry.key === "es");
  const expectedShape = new Set(koreanEntry ? collectValueShape(koreanEntry.value) : []);
  const spanishShape = new Set(spanishEntry ? collectValueShape(spanishEntry.value) : []);
  const missingPaths = [...expectedShape].filter((field) => !spanishShape.has(field));
  const extraPaths = [...spanishShape].filter((field) => !expectedShape.has(field));

  return {
    relativePath,
    expected: expectedShape.size,
    translated: expectedShape.size - missingPaths.length,
    missingPaths,
    extraPaths,
    spanishPresent: Boolean(spanishEntry),
    expectedStrings: koreanEntry ? countStringLeaves(koreanEntry.value) : 0,
    translatedStrings: spanishEntry ? countStringLeaves(spanishEntry.value) : 0,
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

function parseTopLevelArrayItems(value) {
  const openIndex = value.indexOf("[");
  if (openIndex === -1) return [];

  let closeIndex;
  try {
    closeIndex = findMatchingDelimiter(value, openIndex, "[", "]");
  } catch {
    return [];
  }

  const items = [];
  let cursor = openIndex + 1;
  let itemStart = cursor;
  let braceDepth = 0;
  let bracketDepth = 0;
  let parenDepth = 0;

  while (cursor < closeIndex) {
    const char = value[cursor];
    if (char === '"' || char === "'" || char === "`") {
      cursor = skipQuoted(value, cursor);
      continue;
    }
    if (char === "/" && value[cursor + 1] === "/") {
      cursor = skipLineComment(value, cursor);
      continue;
    }
    if (char === "/" && value[cursor + 1] === "*") {
      cursor = skipBlockComment(value, cursor);
      continue;
    }

    if (char === "{") braceDepth += 1;
    else if (char === "}") braceDepth -= 1;
    else if (char === "[") bracketDepth += 1;
    else if (char === "]") bracketDepth -= 1;
    else if (char === "(") parenDepth += 1;
    else if (char === ")") parenDepth -= 1;
    else if (char === "," && braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
      const item = value.slice(itemStart, cursor).trim();
      if (item) items.push(item);
      itemStart = cursor + 1;
    }
    cursor += 1;
  }

  const finalItem = value.slice(itemStart, closeIndex).trim();
  if (finalItem) items.push(finalItem);
  return items;
}

function auditLegalDocumentSections(relativePath, marker) {
  const source = read(relativePath);
  const objectRange = findObjectByMarker(source, marker);
  const languageEntries = parseTopLevelObjectEntries(source, objectRange);
  const koreanEntry = languageEntries.find((entry) => entry.key === "ko");
  const spanishEntry = languageEntries.find((entry) => entry.key === "es");

  const result = {
    relativePath,
    spanishPresent: Boolean(spanishEntry),
    expectedSections: 0,
    translatedSections: 0,
    mismatches: [],
  };
  if (!koreanEntry || !spanishEntry) return result;

  const koFields = getLanguageValueMap(koreanEntry.value);
  const esFields = getLanguageValueMap(spanishEntry.value);
  const koSections = parseTopLevelArrayItems(koFields.get("sections") ?? "");
  const esSections = parseTopLevelArrayItems(esFields.get("sections") ?? "");
  result.expectedSections = koSections.length;
  result.translatedSections = esSections.length;

  if (koSections.length !== esSections.length) {
    result.mismatches.push(`section count ${koSections.length} != ${esSections.length}`);
  }

  const sharedLength = Math.min(koSections.length, esSections.length);
  for (let index = 0; index < sharedLength; index += 1) {
    const koSection = koSections[index];
    const esSection = esSections[index];
    if (!koSection.startsWith("{") || !esSection.startsWith("{")) {
      result.mismatches.push(`section ${index + 1}: expected object structure`);
      continue;
    }

    let koClose;
    let esClose;
    try {
      koClose = findMatchingDelimiter(koSection, 0, "{", "}");
      esClose = findMatchingDelimiter(esSection, 0, "{", "}");
    } catch {
      result.mismatches.push(`section ${index + 1}: invalid object syntax`);
      continue;
    }

    const koSectionFields = new Map(
      parseTopLevelObjectEntries(koSection, { openIndex: 0, closeIndex: koClose })
        .map((entry) => [entry.key, entry.value]),
    );
    const esSectionFields = new Map(
      parseTopLevelObjectEntries(esSection, { openIndex: 0, closeIndex: esClose })
        .map((entry) => [entry.key, entry.value]),
    );
    const koKeys = [...koSectionFields.keys()].sort();
    const esKeys = [...esSectionFields.keys()].sort();
    if (koKeys.join("|") !== esKeys.join("|")) {
      result.mismatches.push(
        `section ${index + 1}: fields ${koKeys.join(",")} != ${esKeys.join(",")}`,
      );
    }

    for (const field of ["paragraphs", "items"]) {
      if (!koSectionFields.has(field) && !esSectionFields.has(field)) continue;
      const koCount = parseTopLevelArrayItems(koSectionFields.get(field) ?? "").length;
      const esCount = parseTopLevelArrayItems(esSectionFields.get(field) ?? "").length;
      if (koCount !== esCount) {
        result.mismatches.push(
          `section ${index + 1} ${field}: ${koCount} != ${esCount}`,
        );
      }
    }
  }

  return result;
}

function parseSimpleStringLiteral(value) {
  const trimmed = value.trim();
  const quote = trimmed[0];
  if ((quote !== '"' && quote !== "'") || trimmed.at(-1) !== quote) return null;
  if (quote === '"') {
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  return trimmed
    .slice(1, -1)
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, "\\");
}

function parseStringArray(value) {
  return parseTopLevelArrayItems(value)
    .map(parseSimpleStringLiteral)
    .filter((item) => item !== null);
}

function arraysEqual(left, right) {
  return Array.isArray(left) && Array.isArray(right) &&
    left.length === right.length && left.every((value, index) => value === right[index]);
}

function auditSpanishBibleBooks(relativePath) {
  const source = read(relativePath);
  const objectRange = findObjectByMarker(source, "export const BOOK_NAMES");
  const entries = parseTopLevelObjectEntries(source, objectRange);
  const spanish = entries.find((entry) => entry.key === "ES");
  const values = spanish ? parseStringArray(spanish.value) : [];
  return {
    relativePath,
    count: values.length,
    values,
  };
}

function auditNviOmittedVerses() {
  const source = read("lib/bibleData.ts");
  const objectRange = findObjectByMarker(source, "const TRANSLATION_OMITTED_VERSES");
  const translations = parseTopLevelObjectEntries(source, objectRange);
  const nvi = translations.find((entry) => entry.key === "101");
  const keys = [];
  if (!nvi || !nvi.value.startsWith("{")) return keys;

  const nviClose = findMatchingDelimiter(nvi.value, 0, "{", "}");
  const books = parseTopLevelObjectEntries(nvi.value, { openIndex: 0, closeIndex: nviClose });
  for (const book of books) {
    if (!book.value.startsWith("{")) continue;
    const bookClose = findMatchingDelimiter(book.value, 0, "{", "}");
    const chapters = parseTopLevelObjectEntries(book.value, { openIndex: 0, closeIndex: bookClose });
    for (const chapter of chapters) {
      for (const verseValue of parseTopLevelArrayItems(chapter.value)) {
        const verse = Number(verseValue.trim());
        if (Number.isSafeInteger(verse)) keys.push(`${book.key}:${chapter.key}:${verse}`);
      }
    }
  }
  return keys.sort();
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

const forbiddenDirectUiLiterals = [
  {
    relativePath: "app/qt/write/page.tsx",
    label: "hardcoded translation picker title",
    pattern: />\s*번역본 선택\s*<\/h3>/g,
  },
  {
    relativePath: "app/qt/write/page.tsx",
    label: "hardcoded date picker title",
    pattern: />\s*날짜 선택\s*<\/h3>/g,
  },
  {
    relativePath: "app/qt/record/page.tsx",
    label: "hardcoded Bible Reflection photo alt",
    pattern: /alt=["']Bible Reflection photo["']/g,
  },
  {
    relativePath: "app/qt/record/page.tsx",
    label: "hardcoded Korean photo-loading copy",
    pattern: />\s*사진을 불러오는 중이에요\.\s*</g,
  },
  {
    relativePath: "app/community/page.tsx",
    label: "hardcoded content-management label",
    pattern: /aria-label=["']Manage content["']/g,
  },
  {
    relativePath: "app/community/page.tsx",
    label: "hardcoded close label",
    pattern: /aria-label=["']Close["']/g,
  },
  {
    relativePath: "app/community/page.tsx",
    label: "hardcoded Bible Reflection photo alt",
    pattern: /alt:\s*["']Bible Reflection photo["']/g,
  },
  {
    relativePath: "app/community/page.tsx",
    label: "hardcoded Bible Reflection photo fallback",
    pattern: /alt\s*\|\|\s*["']Bible Reflection photo["']/g,
  },
  {
    relativePath: "app/community/page.tsx",
    label: "hardcoded Korean profile image fallback",
    pattern: /name\s*\?\?\s*["']프로필["']/g,
  },
  {
    relativePath: "app/community/page.tsx",
    label: "hardcoded Korean photo-loading copy",
    pattern: />\s*사진을 불러오는 중이에요\.\s*</g,
  },
  {
    relativePath: "app/profile/page.tsx",
    label: "hardcoded close label",
    pattern: /aria-label=["']Close["']/g,
  },
  {
    relativePath: "app/profile/page.tsx",
    label: "hardcoded Love Hearts label",
    pattern: /aria-label=["']Love Hearts["']/g,
  },
  {
    relativePath: "app/profile/page.tsx",
    label: "four-language spirit-fruit locked copy fallback",
    pattern: /const\s+lockedDesc\s*=\s*lang\s*===/g,
  },
  {
    relativePath: "components/HeartShopModal.tsx",
    label: "hardcoded New label",
    pattern: /aria-label=["']New["']|>\s*New\s*</g,
  },
  {
    relativePath: "components/HeartShopModal.tsx",
    label: "hardcoded Best/New map label",
    pattern: /item\.isBest\s*\?\s*["']Best["']\s*:\s*["']New["']/g,
  },
  {
    relativePath: "components/PetShopAnnouncementPopup.tsx",
    label: "hardcoded NEW label",
    pattern: />\s*NEW\s*</g,
  },
  {
    relativePath: "app/qt/complete/page.tsx",
    label: "legacy QT image alt",
    pattern: /alt=["']QT["']/g,
  },
  {
    relativePath: "app/page.tsx",
    label: "legacy QT celebration icon alt",
    pattern: /iconAlt=["']QT["']/g,
  },
  {
    relativePath: "app/prayer/page.tsx",
    label: "hardcoded prayer celebration icon alt",
    pattern: /iconAlt=["']Prayer["']/g,
  },
  {
    relativePath: "app/community/page.tsx",
    label: "unlocalized profile image fallback",
    pattern: /name\s*\?\?\s*["']Roots["']/g,
  },
  ...[
    "app/checkin/result/page.tsx",
    "app/prayer/page.tsx",
    "app/page.tsx",
    "app/qt/record/page.tsx",
    "app/community/page.tsx",
    "app/companions/page.tsx",
  ].map((relativePath) => ({
    relativePath,
    label: "generic badge image alt",
    pattern: /alt=["']badge["']/g,
  })),
];

function auditForbiddenDirectUiLiterals() {
  const findings = [];
  for (const check of forbiddenDirectUiLiterals) {
    const source = read(check.relativePath);
    check.pattern.lastIndex = 0;
    let match = check.pattern.exec(source);
    while (match) {
      findings.push({
        relativePath: check.relativePath,
        line: lineNumberAt(source, match.index),
        label: check.label,
        snippet: match[0].trim().replace(/\s+/g, " ").slice(0, 140),
      });
      if (match[0].length === 0) check.pattern.lastIndex += 1;
      match = check.pattern.exec(source);
    }
  }
  return findings;
}

const central = auditTranslationObject("lib/i18n.ts", "export const T");
const qtWrite = auditTranslationObject("app/qt/write/page.tsx", "const QT_WRITE_TRANSLATIONS");
const photo = auditTranslationObject("app/qt/photo/page.tsx", "const PHOTO_COPY");
const centralPlaceholderParity = auditTranslationPlaceholderParity("lib/i18n.ts", "export const T");
const qtWritePlaceholderParity = auditTranslationPlaceholderParity(
  "app/qt/write/page.tsx",
  "const QT_WRITE_TRANSLATIONS",
  "ko",
  "es",
  true,
);
const photoPlaceholderParity = auditTranslationPlaceholderParity(
  "app/qt/photo/page.tsx",
  "const PHOTO_COPY",
);
const centralEmptyParity = auditTranslationEmptyParity("lib/i18n.ts", "export const T");
const qtWriteEmptyParity = auditTranslationEmptyParity(
  "app/qt/write/page.tsx",
  "const QT_WRITE_TRANSLATIONS",
  "ko",
  "es",
  true,
);
const photoEmptyParity = auditTranslationEmptyParity(
  "app/qt/photo/page.tsx",
  "const PHOTO_COPY",
);
const notificationSettings = auditStandaloneLanguageRecord(
  "lib/notifications/settingsText.ts",
  "const NOTIFICATION_SETTINGS_TEXT",
);

const remainingCopyStandaloneRecords = [
  {
    label: "app/welcome/page.tsx",
    audit: auditDeepStandaloneLanguageRecord("app/welcome/page.tsx", "const TEXTS"),
  },
  {
    label: "lib/requiredUpdateText.ts",
    audit: auditDeepStandaloneLanguageRecord("lib/requiredUpdateText.ts", "const TEXT"),
  },
  {
    label: "lib/inAppBrowser.ts",
    audit: auditDeepStandaloneLanguageRecord("lib/inAppBrowser.ts", "const copy"),
  },
  {
    label: "app/qt/record/page.tsx local photo copy",
    audit: auditDeepStandaloneLanguageRecord("app/qt/record/page.tsx", "const QT_RECORD_LOCAL_TEXT"),
  },
  {
    label: "app/community/page.tsx local profile/photo copy",
    audit: auditDeepStandaloneLanguageRecord("app/community/page.tsx", "const COMMUNITY_LOCAL_TEXT"),
  },
  {
    label: "components/PhotoViewerModal.tsx",
    audit: auditDeepStandaloneLanguageRecord("components/PhotoViewerModal.tsx", "const PHOTO_VIEWER_COPY"),
  },
  {
    label: "components/notifications/NotificationDirectOpenOverlay.tsx",
    audit: auditDeepStandaloneLanguageRecord(
      "components/notifications/NotificationDirectOpenOverlay.tsx",
      "const NOTIFICATION_DIRECT_OPEN_COPY",
    ),
  },
  {
    label: "app/checkin/result/page.tsx",
    audit: auditDeepStandaloneLanguageRecord("app/checkin/result/page.tsx", "const CHECKIN_RESULT_TEXT"),
  },
  {
    label: "app/page.tsx local copy",
    audit: auditDeepStandaloneLanguageRecord("app/page.tsx", "const HOME_LOCAL_TEXT"),
  },
  {
    label: "app/profile/page.tsx local copy",
    audit: auditDeepStandaloneLanguageRecord("app/profile/page.tsx", "const PROFILE_LOCAL_TEXT"),
  },
  {
    label: "app/profile/page.tsx heart guide",
    audit: auditDeepStandaloneLanguageRecord("app/profile/page.tsx", "const PROFILE_HEART_GUIDE_TEXT"),
  },
  {
    label: "app/profile/page.tsx month locale",
    audit: auditDeepStandaloneLanguageRecord("app/profile/page.tsx", "const PROFILE_MONTH_LOCALE"),
  },
];

const remainingCopyTranslationObjects = [
  {
    label: "app/page.tsx chapter labels",
    audit: auditTranslationObject("app/page.tsx", "const HOME_CHAPTER_LABELS"),
  },
];

const legalDocumentRecords = [
  {
    label: "app/privacy/page.tsx",
    deep: auditDeepStandaloneLanguageRecord("app/privacy/page.tsx", "const COPY"),
    sections: auditLegalDocumentSections("app/privacy/page.tsx", "const COPY"),
  },
  {
    label: "app/terms/page.tsx",
    deep: auditDeepStandaloneLanguageRecord("app/terms/page.tsx", "const COPY"),
    sections: auditLegalDocumentSections("app/terms/page.tsx", "const COPY"),
  },
  {
    label: "app/impressum/page.tsx",
    deep: auditDeepStandaloneLanguageRecord("app/impressum/page.tsx", "const COPY"),
    sections: auditLegalDocumentSections("app/impressum/page.tsx", "const COPY"),
  },
  {
    label: "app/support/page.tsx",
    deep: auditDeepStandaloneLanguageRecord("app/support/page.tsx", "const COPY"),
    sections: auditLegalDocumentSections("app/support/page.tsx", "const COPY"),
  },
  {
    label: "app/account-deletion/page.tsx",
    deep: auditDeepStandaloneLanguageRecord("app/account-deletion/page.tsx", "const COPY"),
    sections: auditLegalDocumentSections("app/account-deletion/page.tsx", "const COPY"),
  },
];

const rewardStandaloneRecords = [
  {
    label: "lib/heartShopText.ts",
    audit: auditDeepStandaloneLanguageRecord("lib/heartShopText.ts", "const TEXT"),
  },
  {
    label: "lib/profileCharacterText.ts UI",
    audit: auditDeepStandaloneLanguageRecord("lib/profileCharacterText.ts", "const TEXT"),
  },
  {
    label: "lib/profileCharacterText.ts backgrounds",
    audit: auditDeepStandaloneLanguageRecord("lib/profileCharacterText.ts", "const BACKGROUND_NAMES"),
  },
  {
    label: "lib/profileCharacterText.ts item names",
    audit: auditDeepStandaloneLanguageRecord("lib/profileCharacterText.ts", "const ITEM_NAMES"),
  },
  {
    label: "lib/profileAvatarText.ts",
    audit: auditDeepStandaloneLanguageRecord("lib/profileAvatarText.ts", "const TEXT"),
  },
];

const rewardTranslationObjects = [
  {
    label: "lib/avatar.ts labels",
    audit: auditTranslationObject("lib/avatar.ts", "const AVATAR_LABELS"),
  },
  {
    label: "lib/avatar.ts choice copy",
    audit: auditTranslationObject("lib/avatar.ts", "const AVATAR_CHOICE_TEXT"),
  },
  {
    label: "lib/loveHeartText.ts",
    audit: auditTranslationObject("lib/loveHeartText.ts", "const LOVE_HEART_TOASTS"),
  },
];

const stagedStandaloneRecords = [
  {
    label: "lib/localNotifications.ts",
    audit: auditStandaloneLanguageRecord("lib/localNotifications.ts", "const messages"),
  },
  {
    label: "lib/reflectionNudgeText.ts",
    audit: auditStandaloneLanguageRecord("lib/reflectionNudgeText.ts", "const REFLECTION_NUDGE_TEXT"),
  },
  {
    label: "lib/companionChallengeText.ts",
    audit: auditStandaloneLanguageRecord("lib/companionChallengeText.ts", "const TEXT"),
  },
  {
    label: "lib/companionChallengeText.ts titles",
    audit: auditStandaloneLanguageRecord("lib/companionChallengeText.ts", "const CHALLENGE_TITLE_TEXT"),
  },
  {
    label: "lib/groupChallengeRequestText.ts",
    audit: auditStandaloneLanguageRecord("lib/groupChallengeRequestText.ts", "const TEXT"),
  },
  {
    label: "lib/groupLeaderText.ts",
    audit: auditStandaloneLanguageRecord("lib/groupLeaderText.ts", "const GROUP_LEADER_TEXT"),
  },
  {
    label: "lib/inviteLandingText.ts",
    audit: auditStandaloneLanguageRecord("lib/inviteLandingText.ts", "const INVITE_LANDING_TEXT"),
  },
  {
    label: "lib/sharePromptOptions.ts",
    audit: auditStandaloneLanguageRecord("lib/sharePromptOptions.ts", "const SHARE_PROMPT_BULK_SELECTION_LABELS"),
  },
  {
    label: "components/CompanionChallengeAnnouncementPopup.tsx",
    audit: auditStandaloneLanguageRecord("components/CompanionChallengeAnnouncementPopup.tsx", "const COPY"),
  },
  {
    label: "components/PetShopAnnouncementPopup.tsx",
    audit: auditStandaloneLanguageRecord("components/PetShopAnnouncementPopup.tsx", "const COPY"),
  },
  {
    label: "components/FeedbackSuccessPopup.tsx",
    audit: auditStandaloneLanguageRecord("components/FeedbackSuccessPopup.tsx", "const FEEDBACK_SUCCESS_COPY"),
  },
];

const stagedTranslationObjects = [
  {
    label: "lib/notifications/templates.ts",
    audit: auditTranslationObject("lib/notifications/templates.ts", "export const NOTIFICATION_TEMPLATES"),
  },
  {
    label: "lib/communityReactionText.ts",
    audit: auditTranslationObject("lib/communityReactionText.ts", "const LABELS"),
  },
];

const stagedBranchChecks = [
  {
    label: "lib/notifications/reflectionNudgeTemplates.ts Spanish branch",
    ok: /if\s*\(lang\s*===\s*["']es["']\)/.test(read("lib/notifications/reflectionNudgeTemplates.ts")),
  },
  {
    label: "app/profile/page.tsx localized spirit-fruit locked copy",
    ok: /PROFILE_LOCAL_TEXT\[lang\]\.spiritFruitLocked/.test(read("app/profile/page.tsx")),
  },
  {
    label: "components/HeartShopModal.tsx localized Best and New labels",
    ok:
      /item\.isBest\s*\?\s*text\.bestLabel\s*:\s*text\.newLabel/.test(
        read("components/HeartShopModal.tsx"),
      ),
  },
];

const criticalSpanishCopyChecks = [
  {
    label: "Welcome Spanish faith copy and Psalm reference",
    relativePath: "app/welcome/page.tsx",
    fragments: ["Meditación bíblica", "Salmo 1:2", "Ley del SEÑOR", "Caminar con la Palabra"],
  },
  {
    label: "Privacy protected service identifiers",
    relativePath: "app/privacy/page.tsx",
    fragments: [
      "support@christian-roots.com",
      "eu-west-2",
      "lhr1",
      "https://datenschutz.hessen.de",
    ],
  },
  {
    label: "Terms copyright and contact references",
    relativePath: "app/terms/page.tsx",
    fragments: ["ESV_FULL_COPYRIGHT_NOTICE", "support@christian-roots.com"],
  },
  {
    label: "Impressum provider references",
    relativePath: "app/impressum/page.tsx",
    fragments: ["DDG", "Hauptstraße 11", "support@christian-roots.com"],
  },
  {
    label: "Support contact reference",
    relativePath: "app/support/page.tsx",
    fragments: ["SUPPORT_EMAIL"],
  },
  {
    label: "Account deletion support reference",
    relativePath: "app/account-deletion/page.tsx",
    fragments: ["${SUPPORT_EMAIL}"],
  },
  {
    label: "Required update version reference",
    relativePath: "lib/requiredUpdateText.ts",
    fragments: ["Christian Roots 2.0.1", "Actualizar ahora"],
  },
  {
    label: "Localized celebration accessibility labels",
    relativePath: "app/page.tsx",
    fragments: ['iconAlt={t("qt_complete_title", lang)}'],
  },
  {
    label: "Localized prayer accessibility label",
    relativePath: "app/prayer/page.tsx",
    fragments: ['iconAlt={c("nav_prayer")}'],
  },
  {
    label: "Localized community profile fallback",
    relativePath: "app/community/page.tsx",
    fragments: ["COMMUNITY_LOCAL_TEXT[lang].profileAlt"],
  },
].map((check) => {
  const source = read(check.relativePath);
  const missing = check.fragments.filter((fragment) => !source.includes(fragment));
  return { ...check, missing, ok: missing.length === 0 };
});

const allHardcoded = collectHardcodedFourLanguageSurfaces();
const runtimeHardcoded = allHardcoded.filter((finding) => !finding.relativePath.startsWith("supabase/"));
const historicalSqlHardcoded = allHardcoded.filter((finding) => finding.relativePath.startsWith("supabase/"));
const EXPECTED_HISTORICAL_SQL_SURFACES = [
  "supabase/100_kbs_bible_verses_and_translation_options_2_1.sql",
  "supabase/103_easy_bible_translation_option_2_1.sql",
  "supabase/129_remove_unlicensed_bible_options_2_1.sql",
  "supabase/50_notifications_foundation_1_6.sql",
  "supabase/87_profiles_user_preferences_rpc_2_1.sql",
].sort();
const historicalSqlPaths = [...new Set(historicalSqlHardcoded.map((finding) => finding.relativePath))].sort();
const historicalSqlSnapshotsAreExpected = arraysEqual(historicalSqlPaths, EXPECTED_HISTORICAL_SQL_SURFACES);
const directUiLiterals = auditForbiddenDirectUiLiterals();
const bibleDataBooks = auditSpanishBibleBooks("lib/bibleData.ts");
const bibleBooksBooks = auditSpanishBibleBooks("lib/bibleBooks.ts");

const EXPECTED_NVI_OMISSION_KEYS = [
  "마태복음:17:21", "마태복음:18:11", "마태복음:23:14",
  "마가복음:7:16", "마가복음:9:44", "마가복음:9:46", "마가복음:11:26", "마가복음:15:28",
  "누가복음:17:36", "누가복음:23:17", "요한복음:5:4",
  "사도행전:8:37", "사도행전:15:34", "사도행전:24:7", "사도행전:28:29",
  "로마서:16:24",
].sort();

const i18nSource = read("lib/i18n.ts");
const supportedLangsHasSpanish = /SUPPORTED_LANGS\s*=\s*\[[^\]]*["']es["']/.test(i18nSource);
const langMetaHasSpanish = /\bes\s*:\s*\{\s*flag:\s*["']🇪🇸["'][\s\S]*?nativeName:\s*["']Español["'][\s\S]*?englishName:\s*["']Spanish["']/.test(i18nSource);
const centralTranslationsRequireEveryLanguage = /type\s+Translation\s*=\s*Record<Lang,\s*string>/.test(i18nSource);
const dateSource = read("lib/date.ts");
const spanishDateLocaleIsConfigured = /\bes\s*:\s*["']es-ES["']/.test(dateSource);
const welcomeSource = read("app/welcome/page.tsx");
const welcomeSelectorIncludesSpanish = /WELCOME_LANG_ORDER\s*=\s*\[[^\]]*["']es["']/.test(welcomeSource) && /if\s*\(isLang\(stored\)\)/.test(welcomeSource);
const inviteLandingSource = read("lib/inviteLandingText.ts");
const inviteSelectorIncludesSpanish = /value:\s*["']es["'][\s\S]*?label:\s*["']Español["'][\s\S]*?shortLabel:\s*["']ES["']/.test(inviteLandingSource);
const authCallbackSource = read("app/auth/callback/route.ts");
const oauthCallbackAcceptsSpanish = /SUPPORTED_LANGS\s*=\s*\[[^\]]*["']es["']/.test(authCallbackSource);
const capacitorAuthSource = read("components/CapacitorAuthBridge.tsx");
const capacitorOAuthAcceptsSpanish = /SUPPORTED_LANGS\s*=\s*new Set<Lang>\(\[[^\]]*["']es["']/.test(capacitorAuthSource);
const notificationCreateSource = read("app/api/notifications/create/route.ts");
const notificationApiAcceptsSpanish = /VALID_LANGS\s*=\s*new Set<string>\(\[[^\]]*["']es["']/.test(notificationCreateSource);
const reflectionNudgesSource = read("app/api/reflection-nudges/route.ts");
const reflectionNudgeApiAcceptsSpanish = /VALID_LANGS\s*=\s*new Set<string>\(\[[^\]]*["']es["']/.test(reflectionNudgesSource);
const layoutSource = read("app/layout.tsx");
const useLangSource = read("lib/useLang.ts");
const documentLanguageIsSynchronized = layoutSource.includes("document.documentElement.lang = savedLang") && useLangSource.includes("document.documentElement.lang = lang");
const homeSource = read("app/page.tsx");
const homeChapterSupportsSpanish = /function\s+formatChapterReference\([^)]*lang:\s*Lang\)/.test(homeSource);
const photoDateUsesLanguageLocale = /toLocaleDateString\(getDateLocale\(lang\)\)/.test(read("app/qt/photo/page.tsx"));
const androidOfflineSource = read("android/app/src/main/java/com/rootspuce/app/MainActivity.java");
const iosOfflineSource = read("ios/App/App/AppDelegate.swift");
const androidOfflineHasSpanish = /case\s+["']es["'][\s\S]*?Se necesita conexión a Internet/.test(androidOfflineSource);
const iosOfflineHasSpanish = /case\s+["']es["'][\s\S]*?Se necesita conexión a Internet/.test(iosOfflineSource);
const iosInfoPlistSource = read("ios/App/App/Info.plist");
const iosDeclaresFiveLocalizations = /<key>CFBundleLocalizations<\/key>[\s\S]*?<string>ko<\/string>[\s\S]*?<string>en<\/string>[\s\S]*?<string>de<\/string>[\s\S]*?<string>fr<\/string>[\s\S]*?<string>es<\/string>/.test(iosInfoPlistSource);
const bibleDataSource = read("lib/bibleData.ts");
const spanishNviIsSelectable = /group:\s*["']Español["'][\s\S]*?id:\s*101[\s\S]*?name:\s*["']NVI["']/.test(bibleDataSource);
const spanishNviMapsToEs = /\b101\s*:\s*["']ES["']/.test(bibleDataSource);
const defaultTranslationSource = read("lib/translationDefaults.ts");
const spanishDefaultIs101 = /\bes\s*:\s*101\b/.test(defaultTranslationSource);
const youVersionSource = read("lib/youVersionBible.ts");
const nviMappingIsPresent = /\b101\s*:\s*\{[\s\S]*?rootsTranslationId\s*:\s*101[\s\S]*?youVersionBibleId\s*:\s*128/.test(youVersionSource);
const nviDisplayNameIsExact = /displayName:\s*["']Nueva Versión Internacional 2025["']/.test(youVersionSource);
const nviCopyrightIsExact = youVersionSource.includes(
  "La Santa Biblia, Nueva Versión Internacional® NVI® Copyright © 1999, 2015, 2022 by Biblica, Inc. Used by permission. All rights reserved worldwide.",
);
const verseRouteSource = read("app/api/verse/route.ts");
const todayWordAcceptsSpanish = /value\s*===\s*["']es["']/.test(verseRouteSource);
const photoQtSource = read("app/qt/photo/page.tsx");
const photoQtMapsNviToSpanish = /bibleLang\s*===\s*["']ES["']\)\s*return\s*["']es["']/.test(photoQtSource);
const photoQtUsesTranslationVerseLists = (photoQtSource.match(/getBibleVerseNumbers\(/g) ?? []).length >= 3;
const bibleBookArraysMatch = arraysEqual(bibleDataBooks.values, bibleBooksBooks.values);
const nviOmissionKeys = auditNviOmittedVerses();
const nviOmissionsAreExact = arraysEqual(nviOmissionKeys, EXPECTED_NVI_OMISSION_KEYS);

const translationStorageSurfaces = ["app", "components", "lib"]
  .flatMap(walk)
  .filter((absolutePath) => fs.readFileSync(absolutePath, "utf8").includes("roots_default_translation"))
  .map((absolutePath) => path.relative(PROJECT_ROOT, absolutePath).split(path.sep).join("/"))
  .sort();
const translationStorageIsCentralized = arraysEqual(translationStorageSurfaces, ["lib/useLang.ts"]);
const translationPreferenceHasLanguageOwner = useLangSource.includes("roots_default_translation_lang");
const languageChangeResetsToItsDefault = /previousLang\s*===\s*lang[\s\S]*?getDefaultTranslationId\(lang\)/.test(useLangSource);
const freshTranslationResolverSupportsExplicitCrossLanguageChoice =
  defaultTranslationSource.includes("localLanguage === safeLang") &&
  defaultTranslationSource.includes("profileLanguage === safeLang");
const legacyPreferenceIsLanguageChecked =
  defaultTranslationSource.includes("isTranslationNativeToLanguage") &&
  defaultTranslationSource.includes("resolveFreshBibleTranslationId");
const staleLocalPreferenceCannotBeReintroducedByProfile =
  /if \(localId != null\)[\s\S]*?return getDefaultTranslationId\(safeLang\);[\s\S]*?const profileId/.test(defaultTranslationSource);
const homeFreshTranslationFollowsLanguage =
  homeSource.includes("getPreferredTranslationForLang") &&
  homeSource.includes("homeQTState.hasDraft") &&
  homeSource.includes("savePreferredTranslationLocally");
const qtOverviewSource = read("app/qt/page.tsx");
const qtOverviewFreshTranslationFollowsLanguage =
  qtOverviewSource.includes("draftCheckPending || hasDraft") &&
  qtOverviewSource.includes("preferred_language,preferred_translation") &&
  qtOverviewSource.includes("getPreferredTranslationForLang");
const qtWriteSource = read("app/qt/write/page.tsx");
const qtWritePreservesStoredDraftTranslation =
  qtWriteSource.includes("getSupportedBibleTranslationId(draft.bible_version)") &&
  !qtWriteSource.includes('storageSet("roots_default_translation"');
const qtWriteFreshTranslationFollowsLanguage =
  qtWriteSource.includes("applyFreshTranslationPreference") &&
  qtWriteSource.includes("savePreferredTranslationLocally(getStoredLang() ?? lang, newTranslationId)");
const photoFreshTranslationFollowsLanguage =
  photoQtSource.includes("if (isEditMode) return") &&
  photoQtSource.includes("getPreferredTranslationForLang(lang)") &&
  photoQtSource.includes("savePreferredTranslationLocally(getStoredLang() ?? lang, next)");
const authLanguageSelectionSetsTranslationOwner =
  read("components/LanguagePicker.tsx").includes("saveLangLocally(selected)") &&
  read("app/login/page.tsx").includes("saveLangLocally(lang)") &&
  read("app/signup/page.tsx").includes("saveLangLocally(lang)") &&
  capacitorAuthSource.includes("saveLangLocally(lang)");

console.log("Spanish localization audit (read-only)");
console.log(`Mode: ${STRICT ? "strict" : "report"}`);
console.log(`Project: ${PROJECT_ROOT}`);
console.log("\nTranslation dictionaries");
console.log(`  - lib/i18n.ts: ${central.total} total, ${central.missingSpanish.length} missing es`);
console.log(`  - app/qt/write/page.tsx: ${qtWrite.total} total, ${qtWrite.missingSpanish.length} missing es`);
console.log(`  - app/qt/photo/page.tsx: ${photo.total} total, ${photo.missingSpanish.length} missing es`);
console.log("\nPlaceholder parity (ko → es)");
for (const audit of [centralPlaceholderParity, qtWritePlaceholderParity, photoPlaceholderParity]) {
  console.log(
    `  - ${audit.relativePath}: ${audit.compared} compared, ${audit.mismatches.length} mismatches`,
  );
  for (const mismatch of audit.mismatches.slice(0, 20)) {
    const details = [
      mismatch.missing.length > 0 ? `missing ${mismatch.missing.join(", ")}` : "",
      mismatch.extra.length > 0 ? `extra ${mismatch.extra.join(", ")}` : "",
    ].filter(Boolean).join("; ");
    console.log(`    ${mismatch.key} (line ${mismatch.line}): ${details}`);
  }
}
console.log("\nNon-empty copy parity (ko → es)");
for (const audit of [centralEmptyParity, qtWriteEmptyParity, photoEmptyParity]) {
  console.log(
    `  - ${audit.relativePath}: ${audit.compared} compared, ${audit.blankTargets.length} unexpected blank es values`,
  );
  for (const blank of audit.blankTargets.slice(0, 20)) {
    console.log(`    ${blank.key} (line ${blank.line})`);
  }
}
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
for (const entry of remainingCopyStandaloneRecords) {
  const { audit } = entry;
  console.log(
    `  - ${entry.label}: ${audit.translated}/${audit.expected} Spanish paths, ` +
      `${audit.translatedStrings}/${audit.expectedStrings} Spanish strings`,
  );
  if (audit.missingPaths.length > 0) {
    console.log(`    missing: ${audit.missingPaths.join(", ")}`);
  }
  if (audit.extraPaths.length > 0) {
    console.log(`    extra: ${audit.extraPaths.join(", ")}`);
  }
}
for (const entry of remainingCopyTranslationObjects) {
  const translated = entry.audit.total - entry.audit.missingSpanish.length;
  console.log(`  - ${entry.label}: ${translated}/${entry.audit.total} Spanish entries`);
}
for (const entry of legalDocumentRecords) {
  const { deep, sections } = entry;
  console.log(
    `  - ${entry.label}: ${deep.translated}/${deep.expected} Spanish paths, ` +
      `${deep.translatedStrings}/${deep.expectedStrings} Spanish strings, ` +
      `${sections.translatedSections}/${sections.expectedSections} sections`,
  );
  if (deep.missingPaths.length > 0) {
    console.log(`    missing: ${deep.missingPaths.join(", ")}`);
  }
  if (deep.extraPaths.length > 0) {
    console.log(`    extra: ${deep.extraPaths.join(", ")}`);
  }
  if (sections.mismatches.length > 0) {
    console.log(`    structure: ${sections.mismatches.join("; ")}`);
  }
}
for (const entry of rewardStandaloneRecords) {
  const { audit } = entry;
  console.log(
    `  - ${entry.label}: ${audit.translated}/${audit.expected} Spanish paths, ` +
      `${audit.translatedStrings}/${audit.expectedStrings} Spanish strings`,
  );
  if (audit.missingPaths.length > 0) {
    console.log(`    missing: ${audit.missingPaths.join(", ")}`);
  }
  if (audit.extraPaths.length > 0) {
    console.log(`    extra: ${audit.extraPaths.join(", ")}`);
  }
}
for (const entry of rewardTranslationObjects) {
  const translated = entry.audit.total - entry.audit.missingSpanish.length;
  console.log(`  - ${entry.label}: ${translated}/${entry.audit.total} Spanish entries`);
}
for (const entry of stagedStandaloneRecords) {
  const { audit } = entry;
  console.log(`  - ${entry.label}: ${audit.translated}/${audit.expected} Spanish fields`);
  if (audit.missingFields.length > 0) {
    console.log(`    missing: ${audit.missingFields.join(", ")}`);
  }
  if (audit.extraFields.length > 0) {
    console.log(`    extra: ${audit.extraFields.join(", ")}`);
  }
}
for (const entry of stagedTranslationObjects) {
  const translated = entry.audit.total - entry.audit.missingSpanish.length;
  console.log(`  - ${entry.label}: ${translated}/${entry.audit.total} Spanish entries`);
}
for (const entry of stagedBranchChecks) {
  console.log(`  - ${entry.label}: ${entry.ok ? "yes" : "no"}`);
}
console.log("\nCritical Spanish copy guards");
for (const check of criticalSpanishCopyChecks) {
  console.log(`  - ${check.label}: ${check.ok ? "yes" : "no"}`);
  if (!check.ok) console.log(`    missing: ${check.missing.join(", ")}`);
}
printFindingList(
  "Unlocalized direct UI literals",
  directUiLiterals.map((finding) => ({
    relativePath: finding.relativePath,
    line: finding.line,
    snippet: `${finding.label}: ${finding.snippet}`,
  })),
);
console.log("\nActivation status");
console.log(`  - SUPPORTED_LANGS includes es: ${supportedLangsHasSpanish ? "yes" : "no"}`);
console.log(`  - LANG_META includes Español: ${langMetaHasSpanish ? "yes" : "no"}`);
console.log(`  - Central translations require all five languages: ${centralTranslationsRequireEveryLanguage ? "yes" : "no"}`);
console.log(`  - Spanish date locale is es-ES: ${spanishDateLocaleIsConfigured ? "yes" : "no"}`);
console.log(`  - Welcome selector includes Español: ${welcomeSelectorIncludesSpanish ? "yes" : "no"}`);
console.log(`  - Invite selector includes Español: ${inviteSelectorIncludesSpanish ? "yes" : "no"}`);
console.log(`  - Web OAuth callback accepts es: ${oauthCallbackAcceptsSpanish ? "yes" : "no"}`);
console.log(`  - Capacitor OAuth callback accepts es: ${capacitorOAuthAcceptsSpanish ? "yes" : "no"}`);
console.log(`  - Notification API accepts es: ${notificationApiAcceptsSpanish ? "yes" : "no"}`);
console.log(`  - Reflection nudge API accepts es: ${reflectionNudgeApiAcceptsSpanish ? "yes" : "no"}`);
console.log(`  - Document <html lang> follows the selected language: ${documentLanguageIsSynchronized ? "yes" : "no"}`);
console.log(`  - Home chapter references accept Spanish: ${homeChapterSupportsSpanish ? "yes" : "no"}`);
console.log(`  - Photo catch-up date uses the selected locale: ${photoDateUsesLanguageLocale ? "yes" : "no"}`);
console.log(`  - Android offline screen includes Spanish: ${androidOfflineHasSpanish ? "yes" : "no"}`);
console.log(`  - iOS offline screen includes Spanish: ${iosOfflineHasSpanish ? "yes" : "no"}`);
console.log(`  - iOS declares ko/en/de/fr/es localizations: ${iosDeclaresFiveLocalizations ? "yes" : "no"}`);
console.log("\nFresh Bible Reflection translation preference");
console.log(`  - Translation storage is centralized: ${translationStorageIsCentralized ? "yes" : "no"}`);
if (!translationStorageIsCentralized) {
  console.log(`    surfaces: ${translationStorageSurfaces.join(", ")}`);
}
console.log(`  - Stored translation records its app-language owner: ${translationPreferenceHasLanguageOwner ? "yes" : "no"}`);
console.log(`  - Changing app language resets to that language default: ${languageChangeResetsToItsDefault ? "yes" : "no"}`);
console.log(`  - Explicit cross-language Bible choices remain possible: ${freshTranslationResolverSupportsExplicitCrossLanguageChoice ? "yes" : "no"}`);
console.log(`  - Legacy mismatched preferences are repaired: ${legacyPreferenceIsLanguageChecked ? "yes" : "no"}`);
console.log(`  - A stale local Bible cannot be reintroduced by the profile: ${staleLocalPreferenceCannotBeReintroducedByProfile ? "yes" : "no"}`);
console.log(`  - Home new-reflection entry follows current language: ${homeFreshTranslationFollowsLanguage ? "yes" : "no"}`);
console.log(`  - Bible Reflection tab follows current language when no draft exists: ${qtOverviewFreshTranslationFollowsLanguage ? "yes" : "no"}`);
console.log(`  - Writer preserves a draft's stored Bible translation: ${qtWritePreservesStoredDraftTranslation ? "yes" : "no"}`);
console.log(`  - Writer fresh entry follows current language: ${qtWriteFreshTranslationFollowsLanguage ? "yes" : "no"}`);
console.log(`  - Photo fresh entry follows current language while edit keeps its record: ${photoFreshTranslationFollowsLanguage ? "yes" : "no"}`);
console.log(`  - Welcome/login/signup/native auth initialize the paired preference: ${authLanguageSelectionSetsTranslationOwner ? "yes" : "no"}`);
console.log("\nBible foundation status");
console.log(`  - NVI is selectable as Roots ID 101: ${spanishNviIsSelectable ? "yes" : "no"}`);
console.log(`  - Roots ID 101 maps to Bible language ES: ${spanishNviMapsToEs ? "yes" : "no"}`);
console.log(`  - Spanish default translation is Roots ID 101: ${spanishDefaultIs101 ? "yes" : "no"}`);
console.log(`  - Roots 101 -> YouVersion 128 mapping: ${nviMappingIsPresent ? "yes" : "no"}`);
console.log(`  - NVI display name is Nueva Versión Internacional 2025: ${nviDisplayNameIsExact ? "yes" : "no"}`);
console.log(`  - NVI official copyright is exact: ${nviCopyrightIsExact ? "yes" : "no"}`);
console.log(`  - Today’s Word accepts es and uses its language default: ${todayWordAcceptsSpanish ? "yes" : "no"}`);
console.log(`  - lib/bibleData.ts Spanish book names: ${bibleDataBooks.count}/66`);
console.log(`  - lib/bibleBooks.ts Spanish book names: ${bibleBooksBooks.count}/66`);
console.log(`  - Spanish book arrays are identical: ${bibleBookArraysMatch ? "yes" : "no"}`);
console.log(`  - NVI note-only/empty verse exclusions: ${nviOmissionKeys.length}/16 (${nviOmissionsAreExact ? "exact" : "mismatch"})`);
console.log(`  - Photo Bible Reflection maps NVI references to Spanish: ${photoQtMapsNviToSpanish ? "yes" : "no"}`);
console.log(`  - Photo Bible Reflection uses translation-specific verse lists: ${photoQtUsesTranslationVerseLists ? "yes" : "no"}`);
printFindingList("Runtime four-language hardcoded surfaces", runtimeHardcoded);
printFindingList("Historical SQL snapshots kept unchanged", historicalSqlHardcoded);
console.log(`Historical SQL snapshot set is exact: ${historicalSqlSnapshotsAreExpected ? "yes" : "no"}`);

const strictFailures = [
  central.missingSpanish.length > 0,
  qtWrite.missingSpanish.length > 0,
  photo.missingSpanish.length > 0,
  centralPlaceholderParity.mismatches.length > 0,
  qtWritePlaceholderParity.mismatches.length > 0,
  photoPlaceholderParity.mismatches.length > 0,
  centralEmptyParity.blankTargets.length > 0,
  qtWriteEmptyParity.blankTargets.length > 0,
  photoEmptyParity.blankTargets.length > 0,
  !notificationSettings.spanishPresent,
  notificationSettings.missingFields.length > 0,
  notificationSettings.extraFields.length > 0,
  ...remainingCopyStandaloneRecords.flatMap(({ audit }) => [
    !audit.spanishPresent,
    audit.missingPaths.length > 0,
    audit.extraPaths.length > 0,
    audit.translatedStrings !== audit.expectedStrings,
  ]),
  ...remainingCopyTranslationObjects.map(({ audit }) => audit.missingSpanish.length > 0),
  ...legalDocumentRecords.flatMap(({ deep, sections }) => [
    !deep.spanishPresent,
    deep.missingPaths.length > 0,
    deep.extraPaths.length > 0,
    deep.translatedStrings !== deep.expectedStrings,
    !sections.spanishPresent,
    sections.mismatches.length > 0,
  ]),
  ...rewardStandaloneRecords.flatMap(({ audit }) => [
    !audit.spanishPresent,
    audit.missingPaths.length > 0,
    audit.extraPaths.length > 0,
    audit.translatedStrings !== audit.expectedStrings,
  ]),
  ...rewardTranslationObjects.map(({ audit }) => audit.missingSpanish.length > 0),
  ...stagedStandaloneRecords.flatMap(({ audit }) => [
    !audit.spanishPresent,
    audit.missingFields.length > 0,
    audit.extraFields.length > 0,
  ]),
  ...stagedTranslationObjects.map(({ audit }) => audit.missingSpanish.length > 0),
  ...stagedBranchChecks.map(({ ok }) => !ok),
  ...criticalSpanishCopyChecks.map(({ ok }) => !ok),
  directUiLiterals.length > 0,
  runtimeHardcoded.length > 0,
  !historicalSqlSnapshotsAreExpected,
  !supportedLangsHasSpanish,
  !langMetaHasSpanish,
  !centralTranslationsRequireEveryLanguage,
  !spanishDateLocaleIsConfigured,
  !welcomeSelectorIncludesSpanish,
  !inviteSelectorIncludesSpanish,
  !oauthCallbackAcceptsSpanish,
  !capacitorOAuthAcceptsSpanish,
  !notificationApiAcceptsSpanish,
  !reflectionNudgeApiAcceptsSpanish,
  !documentLanguageIsSynchronized,
  !homeChapterSupportsSpanish,
  !photoDateUsesLanguageLocale,
  !androidOfflineHasSpanish,
  !iosOfflineHasSpanish,
  !iosDeclaresFiveLocalizations,
  !translationStorageIsCentralized,
  !translationPreferenceHasLanguageOwner,
  !languageChangeResetsToItsDefault,
  !freshTranslationResolverSupportsExplicitCrossLanguageChoice,
  !legacyPreferenceIsLanguageChecked,
  !staleLocalPreferenceCannotBeReintroducedByProfile,
  !homeFreshTranslationFollowsLanguage,
  !qtOverviewFreshTranslationFollowsLanguage,
  !qtWritePreservesStoredDraftTranslation,
  !qtWriteFreshTranslationFollowsLanguage,
  !photoFreshTranslationFollowsLanguage,
  !authLanguageSelectionSetsTranslationOwner,
  !spanishNviIsSelectable,
  !spanishNviMapsToEs,
  !spanishDefaultIs101,
  !nviMappingIsPresent,
  !nviDisplayNameIsExact,
  !nviCopyrightIsExact,
  !todayWordAcceptsSpanish,
  bibleDataBooks.count !== 66,
  bibleBooksBooks.count !== 66,
  !bibleBookArraysMatch,
  !nviOmissionsAreExact,
  !photoQtMapsNviToSpanish,
  !photoQtUsesTranslationVerseLists,
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

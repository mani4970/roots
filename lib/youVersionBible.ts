export type YouVersionLicenseKind = "lockman" | "public-domain";

export type YouVersionBibleSource = {
  rootsTranslationId: number;
  youVersionBibleId: number;
  displayName: string;
  abbreviation: string;
  license: YouVersionLicenseKind;
  copyrightNotice: string;
  attributionUrl: string;
  attributionLabel: string;
};

export type BibleVerse = {
  num: number | string;
  text: string;
};

export const ROOTS_END_OF_CHAPTER_SENTINEL = 176;

/**
 * Roots keeps its existing translation IDs so saved profile preferences and
 * reflection records remain compatible. Only the upstream Bible source changes.
 */
const YOUVERSION_BIBLE_BY_ROOTS_TRANSLATION_ID: Readonly<Record<number, YouVersionBibleSource>> = {
  // English — Lockman Fast-Track Bible License
  62: {
    rootsTranslationId: 62,
    youVersionBibleId: 100,
    displayName: "NASB 1995",
    abbreviation: "NASB1995",
    license: "lockman",
    copyrightNotice:
      "Scripture quotations from the New American Standard Bible – NASB 1995 Copyright © 1960, 1971, 1977, 1995 by The Lockman Foundation. All rights reserved. Used by permission.",
    attributionUrl: "https://www.lockman.org",
    attributionLabel: "Lockman.org",
  },

  // German — Public Domain and Creative Commons Fast-Track Bible License
  29: {
    rootsTranslationId: 29,
    youVersionBibleId: 51,
    displayName: "Lutherbibel 1912",
    abbreviation: "DELUT",
    license: "public-domain",
    copyrightNotice: "Lutherbibel 1912 (DELUT) · Gemeinfrei · Bereitgestellt über YouVersion.",
    attributionUrl: "https://www.bible.com/versions/51",
    attributionLabel: "YouVersion",
  },
  27: {
    rootsTranslationId: 27,
    youVersionBibleId: 58,
    displayName: "Elberfelder 1871",
    abbreviation: "ELB71",
    license: "public-domain",
    copyrightNotice: "Elberfelder 1871 (ELB71) · Gemeinfrei · Bereitgestellt über YouVersion.",
    attributionUrl: "https://www.bible.com/versions/58",
    attributionLabel: "YouVersion",
  },

  // French — Public Domain and Creative Commons Fast-Track Bible License
  26: {
    rootsTranslationId: 26,
    youVersionBibleId: 93,
    displayName: "Louis Segond 1910",
    abbreviation: "LSG",
    license: "public-domain",
    copyrightNotice:
      "La Sainte Bible par Louis Segond 1910 (LSG) · Domaine public · Fournie via YouVersion.",
    attributionUrl: "https://www.bible.com/versions/93",
    attributionLabel: "YouVersion",
  },
};

const USFM_BOOK_CODES: readonly string[] = [
  "GEN", "EXO", "LEV", "NUM", "DEU", "JOS", "JDG", "RUT", "1SA", "2SA", "1KI", "2KI", "1CH",
  "2CH", "EZR", "NEH", "EST", "JOB", "PSA", "PRO", "ECC", "SNG", "ISA", "JER", "LAM", "EZK",
  "DAN", "HOS", "JOL", "AMO", "OBA", "JON", "MIC", "NAM", "HAB", "ZEP", "HAG", "ZEC", "MAL",
  "MAT", "MRK", "LUK", "JHN", "ACT", "ROM", "1CO", "2CO", "GAL", "EPH", "PHP", "COL", "1TH",
  "2TH", "1TI", "2TI", "TIT", "PHM", "HEB", "JAS", "1PE", "2PE", "1JN", "2JN", "3JN", "JUD",
  "REV",
];

export function getYouVersionBibleSource(rootsTranslationId: number): YouVersionBibleSource | null {
  return YOUVERSION_BIBLE_BY_ROOTS_TRANSLATION_ID[rootsTranslationId] ?? null;
}

export function getYouVersionBookCode(bookNumber: number): string | null {
  if (!Number.isInteger(bookNumber) || bookNumber < 1 || bookNumber > USFM_BOOK_CODES.length) return null;
  return USFM_BOOK_CODES[bookNumber - 1] ?? null;
}

export function isYouVersionBibleTranslation(rootsTranslationId: number): boolean {
  return getYouVersionBibleSource(rootsTranslationId) !== null;
}

export function buildYouVersionPassageId(params: {
  bookNum: number;
  chapter: number;
  startVerse: number;
  endVerse: number;
}): string {
  const bookCode = getYouVersionBookCode(params.bookNum);
  if (!bookCode) throw new Error(`Unsupported Bible book number: ${params.bookNum}`);

  // Roots uses 176 as a provider-neutral "through the end of the chapter"
  // sentinel in the Home chapter viewer and cross-chapter loaders. YouVersion
  // expects the canonical chapter reference instead of a possibly invalid
  // ending verse such as 176; the parser applies startVerse afterwards.
  if (params.endVerse === ROOTS_END_OF_CHAPTER_SENTINEL) {
    return `${bookCode}.${params.chapter}`;
  }

  const versePart = params.endVerse > params.startVerse
    ? `${params.startVerse}-${params.endVerse}`
    : String(params.startVerse);

  return `${bookCode}.${params.chapter}.${versePart}`;
}

function getHtmlAttribute(attributes: string, name: string): string | null {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = attributes.match(new RegExp(`(?:^|\\s)${escapedName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

function decodeHtmlEntities(value: string): string {
  const named: Readonly<Record<string, string>> = {
    aacute: "á",
    acirc: "â",
    agrave: "à",
    amp: "&",
    apos: "'",
    auml: "ä",
    ccedil: "ç",
    copy: "©",
    eacute: "é",
    ecirc: "ê",
    egrave: "è",
    euml: "ë",
    gt: ">",
    hellip: "…",
    icirc: "î",
    iuml: "ï",
    laquo: "«",
    ldquo: "“",
    lsquo: "‘",
    lt: "<",
    mdash: "—",
    middot: "·",
    nbsp: " ",
    ndash: "–",
    oacute: "ó",
    ocirc: "ô",
    ouml: "ö",
    quot: '"',
    raquo: "»",
    rdquo: "”",
    reg: "®",
    rsquo: "’",
    szlig: "ß",
    trade: "™",
    uacute: "ú",
    ucirc: "û",
    ugrave: "ù",
    uuml: "ü",
  };

  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (entity, token: string) => {
    if (token.startsWith("#x") || token.startsWith("#X")) {
      const codePoint = Number.parseInt(token.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }
    if (token.startsWith("#")) {
      const codePoint = Number.parseInt(token.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }
    return named[token.toLowerCase()] ?? entity;
  });
}

export function youVersionHtmlToPlainText(fragment: string): string {
  const withoutLabels = fragment
    .replace(/<span\b[^>]*class=(?:"[^"]*\byv-vlbl\b[^"]*"|'[^']*\byv-vlbl\b[^']*')[^>]*>[\s\S]*?<\/span>/gi, " ")
    .replace(/<span\b[^>]*class=(?:"[^"]*\byv-note\b[^"]*"|'[^']*\byv-note\b[^']*')[^>]*>[\s\S]*?<\/span>/gi, " ")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(?:div|p|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  return decodeHtmlEntities(withoutLabels)
    .replace(/\u00a0/g, " ")
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/\s*\n\s*/g, " ")
    .trim();
}

type YouVersionVerseMarker = {
  start: number;
  end: number;
  number: string;
};

export function parseYouVersionHtmlVerses(
  html: string,
  startVerse: number,
  endVerse: number,
): BibleVerse[] {
  const markers: YouVersionVerseMarker[] = [];
  const emptySpanPattern = /<span\b([^>]*?)>\s*<\/span>|<span\b([^>]*?)\s*\/>/gi;
  let markerMatch: RegExpExecArray | null;

  while ((markerMatch = emptySpanPattern.exec(html)) !== null) {
    const attributes = markerMatch[1] ?? markerMatch[2] ?? "";
    const className = getHtmlAttribute(attributes, "class") ?? "";
    if (!className.split(/\s+/).includes("yv-v")) continue;

    const verseNumber = getHtmlAttribute(attributes, "v");
    if (!verseNumber) continue;

    markers.push({
      start: markerMatch.index,
      end: emptySpanPattern.lastIndex,
      number: verseNumber,
    });
  }

  if (markers.length === 0) return [];

  const verses: BibleVerse[] = [];
  for (let index = 0; index < markers.length; index += 1) {
    const marker = markers[index];
    const numericVerse = Number.parseInt(marker.number, 10);
    if (!Number.isFinite(numericVerse) || numericVerse < startVerse || numericVerse > endVerse) continue;

    const nextMarker = markers[index + 1];
    const fragment = html.slice(marker.end, nextMarker?.start ?? html.length);
    const text = youVersionHtmlToPlainText(fragment);
    if (!text) continue;

    const normalizedNumber: number | string = /^\d+$/.test(marker.number) ? numericVerse : marker.number;
    const previous = verses[verses.length - 1];
    if (previous && String(previous.num) === String(normalizedNumber)) {
      previous.text = `${previous.text} ${text}`.trim();
    } else {
      verses.push({ num: normalizedNumber, text });
    }
  }

  return verses;
}

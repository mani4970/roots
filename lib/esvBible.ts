export type EsvBibleVerse = {
  num: number | string;
  text: string;
};

export const ESV_TRANSLATION_ID = 100;
export const ESV_API_BASE = "https://api.esv.org/v3";
export const ESV_ATTRIBUTION_URL = "https://www.esv.org";
export const ESV_ATTRIBUTION_LABEL = "ESV.org";
export const ESV_SHORT_COPYRIGHT_NOTICE =
  "Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved.";

export const ESV_FULL_COPYRIGHT_NOTICE =
  "Scripture quotations marked “ESV” are from the ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved. The ESV text may not be quoted in any publication made available to the public by a Creative Commons license. The ESV may not be translated into any other language. Users may not copy or download more than 500 verses of the ESV Bible or more than one half of any book of the ESV Bible.";

const ESV_BOOK_NAMES: readonly string[] = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth",
  "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah",
  "Esther", "Job", "Psalm", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah",
  "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum",
  "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi", "Matthew", "Mark", "Luke", "John", "Acts",
  "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians",
  "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James",
  "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation",
];

export function isEsvTranslation(translationId: number): boolean {
  return translationId === ESV_TRANSLATION_ID;
}

export function buildEsvPassageQuery(params: {
  bookNum: number;
  chapter: number;
  startVerse: number;
  endVerse: number;
  endOfChapterSentinel: number;
}): string {
  const book = ESV_BOOK_NAMES[params.bookNum - 1];
  if (!book) throw new Error(`Unsupported ESV Bible book number: ${params.bookNum}`);

  if (params.endVerse === params.endOfChapterSentinel) {
    return `${book} ${params.chapter}`;
  }

  const versePart = params.endVerse > params.startVerse
    ? `${params.startVerse}-${params.endVerse}`
    : String(params.startVerse);

  return `${book} ${params.chapter}:${versePart}`;
}

function decodeHtmlEntities(value: string): string {
  const named: Readonly<Record<string, string>> = {
    amp: "&",
    apos: "'",
    gt: ">",
    hellip: "…",
    ldquo: "“",
    lsquo: "‘",
    lt: "<",
    mdash: "—",
    middot: "·",
    nbsp: " ",
    ndash: "–",
    quot: '"',
    rdquo: "”",
    rsquo: "’",
  };

  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    const lowered = entity.toLowerCase();
    if (lowered.startsWith("#x")) {
      const codePoint = Number.parseInt(lowered.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    if (lowered.startsWith("#")) {
      const codePoint = Number.parseInt(lowered.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    return named[lowered] ?? match;
  });
}

function stripHtml(value: string): string {
  return decodeHtmlEntities(
    value
      .replace(/\(\s*<a\b[^>]*class=(?:"[^"]*\bcopyright\b[^"]*"|'[^']*\bcopyright\b[^']*')[^>]*>[\s\S]*?<\/a>\s*\)/gi, " ")
      .replace(/<a\b[^>]*class=(?:"[^"]*\bcopyright\b[^"]*"|'[^']*\bcopyright\b[^']*')[^>]*>[\s\S]*?<\/a>/gi, " ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/p\s*>/gi, " ")
      .replace(/<\/div\s*>/gi, " ")
      .replace(/<[^>]*>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

type EsvVerseMarker = {
  number: number;
  start: number;
  end: number;
};

/**
 * Crossway's HTML endpoint marks each verse with a `verse-num` element.
 * Roots only splits on those official markers; it never rewrites ESV words.
 */
export function parseEsvHtmlVerses(
  html: string,
  startVerse: number,
  endVerse: number,
  endOfChapterSentinel: number,
): EsvBibleVerse[] {
  const markerPattern = /<b\b([^>]*)class=(?:"[^"]*\bverse-num\b[^"]*"|'[^']*\bverse-num\b[^']*')[^>]*>([\s\S]*?)<\/b>/gi;
  const markers: EsvVerseMarker[] = [];

  let match: RegExpExecArray | null;
  while ((match = markerPattern.exec(html)) !== null) {
    const rawNumber = stripHtml(match[2] ?? "");
    const numberMatch = rawNumber.match(/\d+/);
    if (!numberMatch) continue;
    const number = Number(numberMatch[0]);
    if (!Number.isSafeInteger(number) || number <= 0) continue;

    markers.push({
      number,
      start: match.index,
      end: markerPattern.lastIndex,
    });
  }

  const verses: EsvBibleVerse[] = [];
  for (let i = 0; i < markers.length; i += 1) {
    const marker = markers[i];
    const nextStart = markers[i + 1]?.start ?? html.length;
    if (marker.number < startVerse) continue;
    if (endVerse !== endOfChapterSentinel && marker.number > endVerse) continue;

    const text = stripHtml(html.slice(marker.end, nextStart));
    if (!text) continue;

    const previous = verses[verses.length - 1];
    if (previous && Number(previous.num) === marker.number) {
      previous.text = `${previous.text} ${text}`.replace(/\s+/g, " ").trim();
    } else {
      verses.push({ num: marker.number, text });
    }
  }

  return verses;
}

import { NextRequest, NextResponse } from "next/server";
import {
  buildEsvPassageQuery,
  ESV_API_BASE,
  ESV_ATTRIBUTION_LABEL,
  ESV_ATTRIBUTION_URL,
  ESV_SHORT_COPYRIGHT_NOTICE,
  isEsvTranslation,
  parseEsvHtmlVerses,
} from "@/lib/esvBible";
import {
  buildYouVersionPassageId,
  getYouVersionBibleSource,
  parseYouVersionHtmlVerses,
  ROOTS_END_OF_CHAPTER_SENTINEL,
  type BibleVerse,
  type YouVersionBibleSource,
} from "@/lib/youVersionBible";
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { BOOK_NAMES, isSelectableBibleTranslationId } from "@/lib/bibleData";

// Keep one canonical book-name source for every supported UI language.
const BOOK_NUMBER_BY_NAME = new Map<string, number>(
  Object.values(BOOK_NAMES).flatMap((names) =>
    names.map((name, index) => [name, index + 1] as const),
  ),
);

function getBookNum(book: string): number | null {
  return BOOK_NUMBER_BY_NAME.get(book.trim()) ?? null;
}

const YOUVERSION_API_BASE = "https://api.youversion.com/v1";
type LicensedBibleTable = "kbs_bible_verses" | "duranno_bible_verses";
const LICENSED_BIBLE_TABLE_BY_TRANSLATION_ID = new Map<number, LicensedBibleTable>([
  [92, "kbs_bible_verses"],
  [84, "kbs_bible_verses"],
  [98, "kbs_bible_verses"],
  [89, "duranno_bible_verses"],
]);
const MAX_VERSE = ROOTS_END_OF_CHAPTER_SENTINEL;
const MAX_VERSE_RANGE = 176;
const FETCH_TIMEOUT_MS = 10_000;
const BIBLE_CACHE_CONTROL = "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800";
const YOUVERSION_RESPONSE_CACHE_CONTROL = "private, max-age=300, must-revalidate";
const ESV_RESPONSE_CACHE_CONTROL = "private, no-store, max-age=0";
let licensedBibleClient: SupabaseClient | null = null;

function readServerEnv(name: string, fallback = "") {
  const value = process.env[name] ?? fallback;
  return value.trim().replace(/^([\"'])(.*)\1$/, "$2");
}

function getLicensedBibleClient() {
  if (licensedBibleClient) return licensedBibleClient;

  const url = readServerEnv("NEXT_PUBLIC_SUPABASE_URL");
  const secretKey = readServerEnv("SUPABASE_SECRET_KEY");

  if (!url || !secretKey) {
    throw new Error("Missing Supabase server configuration");
  }

  licensedBibleClient = createSupabaseClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return licensedBibleClient;
}


function parsePositiveInteger(value: string | null, fallback: number): number | null {
  if (value == null || value === "") return fallback;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}


function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}


function getEsvApiHeaders(): HeadersInit {
  const apiKey = readServerEnv("ESV_API_KEY");

  if (!apiKey) {
    throw new Error("Missing ESV_API_KEY");
  }

  return {
    Accept: "application/json",
    Authorization: `Token ${apiKey}`,
  };
}

async function fetchEsvWithTimeout(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, {
      headers: getEsvApiHeaders(),
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchEsvPassage(params: {
  bookNum: number;
  chapter: number;
  startVerse: number;
  endVerse: number;
}): Promise<BibleVerse[]> {
  const query = buildEsvPassageQuery({
    ...params,
    endOfChapterSentinel: ROOTS_END_OF_CHAPTER_SENTINEL,
  });
  const url = new URL("passage/html/", `${ESV_API_BASE}/`);
  url.searchParams.set("q", query);
  url.searchParams.set("include-passage-references", "false");
  url.searchParams.set("include-verse-numbers", "true");
  url.searchParams.set("include-first-verse-numbers", "true");
  url.searchParams.set("include-footnotes", "false");
  url.searchParams.set("include-footnote-body", "false");
  url.searchParams.set("include-headings", "false");
  url.searchParams.set("include-short-copyright", "false");
  url.searchParams.set("include-copyright", "false");
  url.searchParams.set("include-audio-link", "false");
  url.searchParams.set("include-crossrefs", "false");
  url.searchParams.set("include-subheadings", "false");
  url.searchParams.set("include-chapter-numbers", "false");

  const response = await fetchEsvWithTimeout(url.toString());
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`ESV passage request failed (${response.status}): ${body.slice(0, 240)}`);
  }

  const payload = await response.json() as { passages?: unknown };
  const passages = Array.isArray(payload.passages) ? payload.passages : [];
  const content = typeof passages[0] === "string" ? passages[0] : "";
  if (!content) throw new Error("ESV passage response was empty");

  const verses = parseEsvHtmlVerses(
    content,
    params.startVerse,
    params.endVerse,
    ROOTS_END_OF_CHAPTER_SENTINEL,
  );
  if (verses.length === 0) {
    throw new Error("ESV passage could not be split into individual verses");
  }

  const hasCombinedVerse = verses.some((verse) => !/^\d+$/.test(String(verse.num)));
  if (hasCombinedVerse) {
    throw new Error("ESV passage contained a combined or non-numeric verse marker");
  }

  return verses;
}

function getYouVersionApiHeaders(): HeadersInit {
  const appKey = readServerEnv("YVP_APP_KEY") || readServerEnv("YOUVERSION_APP_KEY");

  if (!appKey) {
    throw new Error("Missing YVP_APP_KEY");
  }

  return {
    Accept: "application/json",
    "X-YVP-App-Key": appKey,
  };
}

async function fetchYouVersionWithTimeout(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, {
      headers: getYouVersionApiHeaders(),
      next: { revalidate: 86400 },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchYouVersionPassage(params: {
  bookNum: number;
  chapter: number;
  startVerse: number;
  endVerse: number;
}, source: YouVersionBibleSource): Promise<BibleVerse[]> {
  const passageId = buildYouVersionPassageId(params);
  const url = new URL(
    `bibles/${source.youVersionBibleId}/passages/${encodeURIComponent(passageId)}`,
    `${YOUVERSION_API_BASE}/`,
  );
  url.searchParams.set("format", "html");
  url.searchParams.set("include_headings", "false");
  url.searchParams.set("include_notes", "false");

  const response = await fetchYouVersionWithTimeout(url.toString());
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`YouVersion passage request failed (${response.status}): ${body.slice(0, 240)}`);
  }

  const payload = await response.json() as { content?: unknown };
  const content = typeof payload.content === "string" ? payload.content : "";
  if (!content) throw new Error("YouVersion passage response was empty");

  const verses = parseYouVersionHtmlVerses(content, params.startVerse, params.endVerse);
  if (verses.length === 0) {
    throw new Error("YouVersion passage could not be split into individual verses");
  }

  const hasCombinedVerse = verses.some((verse) => !/^\d+$/.test(String(verse.num)));
  if (hasCombinedVerse) {
    throw new Error("YouVersion passage contained a combined or non-numeric verse marker");
  }

  return verses;
}

async function fetchLicensedPassage(params: {
  translationId: number;
  bookNum: number;
  chapter: number;
  startVerse: number;
  endVerse: number;
}, table: LicensedBibleTable) {
  const { data, error } = await getLicensedBibleClient()
    .from(table)
    .select("verse_start,verse_end,text")
    .eq("translation_id", params.translationId)
    .eq("book_number", params.bookNum)
    .eq("chapter", params.chapter)
    .lte("verse_start", params.endVerse)
    .gte("verse_end", params.startVerse)
    .order("verse_start", { ascending: true });

  if (error) {
    throw new Error(`Licensed Bible query failed: ${error.message}`);
  }

  return (data ?? [])
    .map((row) => {
      // Some licensed Korean editions publish intentional verse bridges (for
      // example 18-19) as one source unit. Preserve that publisher structure
      // instead of inventing a split that is not present in the licensed text.
      const verseStart = Number(row.verse_start);
      const verseEnd = Number(row.verse_end);
      return {
        num: verseStart === verseEnd ? verseStart : `${verseStart}-${verseEnd}`,
        text: String(row.text ?? "").trim(),
        valid:
          Number.isFinite(verseStart) &&
          Number.isFinite(verseEnd) &&
          verseEnd >= verseStart,
      };
    })
    .filter((verse) => verse.valid && verse.text)
    .map(({ num, text }) => ({ num, text }));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const book = (searchParams.get("book") ?? "요한복음").trim();
  const chapter = parsePositiveInteger(searchParams.get("chapter"), 3);
  const startVerse = parsePositiveInteger(searchParams.get("startVerse"), 16);
  const endVerse = parsePositiveInteger(searchParams.get("endVerse"), startVerse ?? 16);
  const translationId = parsePositiveInteger(searchParams.get("translation"), 92);

  if (!book) return jsonError("책 이름이 비어 있어요.", 400);
  if (chapter == null || chapter > 150) return jsonError("장 번호가 올바르지 않아요.", 400);
  if (startVerse == null || startVerse > MAX_VERSE) return jsonError("시작 절 번호가 올바르지 않아요.", 400);
  if (endVerse == null || endVerse > MAX_VERSE) return jsonError("끝 절 번호가 올바르지 않아요.", 400);
  if (translationId == null || translationId > 9999) return jsonError("번역본 ID가 올바르지 않아요.", 400);
  if (!isSelectableBibleTranslationId(translationId)) return jsonError("현재 사용할 수 없는 번역본이에요.", 404);
  if (endVerse < startVerse) return jsonError("끝 절은 시작 절보다 작을 수 없어요.", 400);
  if (endVerse - startVerse + 1 > MAX_VERSE_RANGE) return jsonError("요청한 본문 범위가 너무 길어요.", 400);

  const bookNum = getBookNum(book);
  if (!bookNum) {
    return jsonError(`책 이름을 찾을 수 없어요: ${book}`, 400);
  }

  try {
    let verses: BibleVerse[];
    const licensedBibleTable = LICENSED_BIBLE_TABLE_BY_TRANSLATION_ID.get(translationId);
    const esvSource = isEsvTranslation(translationId);
    const youVersionSource = getYouVersionBibleSource(translationId);

    if (licensedBibleTable) {
      verses = await fetchLicensedPassage({
        translationId,
        bookNum,
        chapter,
        startVerse,
        endVerse,
      }, licensedBibleTable);
    } else if (esvSource) {
      verses = await fetchEsvPassage({
        bookNum,
        chapter,
        startVerse,
        endVerse,
      });
    } else if (youVersionSource) {
      verses = await fetchYouVersionPassage({
        bookNum,
        chapter,
        startVerse,
        endVerse,
      }, youVersionSource);
    } else {
      return jsonError("현재 사용할 수 없는 번역본이에요.", 404);
    }

    if (verses.length === 0) {
      return jsonError("본문을 불러올 수 없어요.", 404);
    }

    const reference = endVerse > startVerse
      ? `${book} ${chapter}:${startVerse}-${endVerse}`
      : `${book} ${chapter}:${startVerse}`;

    const fullText = verses.map((v) => `${v.num} ${v.text}`).join("\n");

    return NextResponse.json(
      {
        text: fullText,
        verses,
        reference,
        version: String(translationId),
        source: esvSource ? "esv-api" : youVersionSource ? "youversion" : "licensed-database",
        providerVersion: esvSource ? "ESV API v3" : youVersionSource ? String(youVersionSource.youVersionBibleId) : String(translationId),
        versionName: esvSource ? "English Standard Version" : youVersionSource?.displayName ?? null,
        copyright: esvSource ? ESV_SHORT_COPYRIGHT_NOTICE : youVersionSource?.copyrightNotice ?? null,
        attributionUrl: esvSource ? ESV_ATTRIBUTION_URL : youVersionSource?.attributionUrl ?? null,
        attributionLabel: esvSource ? ESV_ATTRIBUTION_LABEL : youVersionSource?.attributionLabel ?? null,
      },
      {
        headers: {
          "Cache-Control": esvSource
            ? ESV_RESPONSE_CACHE_CONTROL
            : youVersionSource
              ? YOUVERSION_RESPONSE_CACHE_CONTROL
              : BIBLE_CACHE_CONTROL,
        },
      },
    );

  } catch (e) {
    console.error("Bible API proxy error:", e);
    return jsonError("네트워크 오류가 발생했어요", 500);
  }
}

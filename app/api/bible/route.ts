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
import { isSelectableBibleTranslationId } from "@/lib/bibleData";

// 언어별 책 이름 → 번호 매핑
const BOOK_MAP_KO: Record<string, number> = {
  "창세기":1,"출애굽기":2,"레위기":3,"민수기":4,"신명기":5,"여호수아":6,"사사기":7,"룻기":8,
  "사무엘상":9,"사무엘하":10,"열왕기상":11,"열왕기하":12,"역대상":13,"역대하":14,"에스라":15,
  "느헤미야":16,"에스더":17,"욥기":18,"시편":19,"잠언":20,"전도서":21,"아가":22,"이사야":23,
  "예레미야":24,"예레미야애가":25,"에스겔":26,"다니엘":27,"호세아":28,"요엘":29,"아모스":30,
  "오바댜":31,"요나":32,"미가":33,"나훔":34,"하박국":35,"스바냐":36,"학개":37,"스가랴":38,"말라기":39,
  "마태복음":40,"마가복음":41,"누가복음":42,"요한복음":43,"사도행전":44,"로마서":45,
  "고린도전서":46,"고린도후서":47,"갈라디아서":48,"에베소서":49,"빌립보서":50,"골로새서":51,
  "데살로니가전서":52,"데살로니가후서":53,"디모데전서":54,"디모데후서":55,"디도서":56,
  "빌레몬서":57,"히브리서":58,"야고보서":59,"베드로전서":60,"베드로후서":61,
  "요한일서":62,"요한이서":63,"요한삼서":64,"유다서":65,"요한계시록":66,
};
const BOOK_MAP_EN: Record<string, number> = {
  "Genesis":1,"Exodus":2,"Leviticus":3,"Numbers":4,"Deuteronomy":5,"Joshua":6,"Judges":7,"Ruth":8,
  "1 Samuel":9,"2 Samuel":10,"1 Kings":11,"2 Kings":12,"1 Chronicles":13,"2 Chronicles":14,
  "Ezra":15,"Nehemiah":16,"Esther":17,"Job":18,"Psalms":19,"Proverbs":20,"Ecclesiastes":21,
  "Song of Solomon":22,"Isaiah":23,"Jeremiah":24,"Lamentations":25,"Ezekiel":26,"Daniel":27,
  "Hosea":28,"Joel":29,"Amos":30,"Obadiah":31,"Jonah":32,"Micah":33,"Nahum":34,
  "Habakkuk":35,"Zephaniah":36,"Haggai":37,"Zechariah":38,"Malachi":39,
  "Matthew":40,"Mark":41,"Luke":42,"John":43,"Acts":44,"Romans":45,
  "1 Corinthians":46,"2 Corinthians":47,"Galatians":48,"Ephesians":49,"Philippians":50,"Colossians":51,
  "1 Thessalonians":52,"2 Thessalonians":53,"1 Timothy":54,"2 Timothy":55,"Titus":56,
  "Philemon":57,"Hebrews":58,"James":59,"1 Peter":60,"2 Peter":61,
  "1 John":62,"2 John":63,"3 John":64,"Jude":65,"Revelation":66,
};
const BOOK_MAP_DE: Record<string, number> = {
  "1. Mose":1,"2. Mose":2,"3. Mose":3,"4. Mose":4,"5. Mose":5,"Josua":6,"Richter":7,"Rut":8,
  "1. Samuel":9,"2. Samuel":10,"1. Könige":11,"2. Könige":12,"1. Chronik":13,"2. Chronik":14,
  "Esra":15,"Nehemia":16,"Ester":17,"Hiob":18,"Psalmen":19,"Sprüche":20,"Prediger":21,
  "Hoheslied":22,"Jesaja":23,"Jeremia":24,"Klagelieder":25,"Hesekiel":26,"Daniel":27,
  "Hosea":28,"Joel":29,"Amos":30,"Obadja":31,"Jona":32,"Micha":33,"Nahum":34,
  "Habakuk":35,"Zefanja":36,"Haggai":37,"Sacharja":38,"Maleachi":39,
  "Matthäus":40,"Markus":41,"Lukas":42,"Johannes":43,"Apostelgeschichte":44,"Römer":45,
  "1. Korinther":46,"2. Korinther":47,"Galater":48,"Epheser":49,"Philipper":50,"Kolosser":51,
  "1. Thessalonicher":52,"2. Thessalonicher":53,"1. Timotheus":54,"2. Timotheus":55,"Titus":56,
  "Philemon":57,"Hebräer":58,"Jakobus":59,"1. Petrus":60,"2. Petrus":61,
  "1. Johannes":62,"2. Johannes":63,"3. Johannes":64,"Judas":65,"Offenbarung":66,
};
const BOOK_MAP_FR: Record<string, number> = {
  "Genèse":1,"Exode":2,"Lévitique":3,"Nombres":4,"Deutéronome":5,"Josué":6,"Juges":7,"Ruth":8,
  "1 Samuel":9,"2 Samuel":10,"1 Rois":11,"2 Rois":12,"1 Chroniques":13,"2 Chroniques":14,
  "Esdras":15,"Néhémie":16,"Esther":17,"Job":18,"Psaumes":19,"Proverbes":20,"Ecclésiaste":21,
  "Cantique":22,"Ésaïe":23,"Jérémie":24,"Lamentations":25,"Ézéchiel":26,"Daniel":27,
  "Osée":28,"Joël":29,"Amos":30,"Abdias":31,"Jonas":32,"Michée":33,"Nahum":34,
  "Habacuc":35,"Sophonie":36,"Aggée":37,"Zacharie":38,"Malachie":39,
  "Matthieu":40,"Marc":41,"Luc":42,"Jean":43,"Actes":44,"Romains":45,
  "1 Corinthiens":46,"2 Corinthiens":47,"Galates":48,"Éphésiens":49,"Philippiens":50,"Colossiens":51,
  "1 Thessaloniciens":52,"2 Thessaloniciens":53,"1 Timothée":54,"2 Timothée":55,"Tite":56,
  "Philémon":57,"Hébreux":58,"Jacques":59,"1 Pierre":60,"2 Pierre":61,
  "1 Jean":62,"2 Jean":63,"3 Jean":64,"Jude":65,"Apocalypse":66,
};

function getBookNum(book: string): number | null {
  const normalized = book.trim();
  return BOOK_MAP_KO[normalized] ?? BOOK_MAP_EN[normalized] ?? BOOK_MAP_DE[normalized] ?? BOOK_MAP_FR[normalized] ?? null;
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

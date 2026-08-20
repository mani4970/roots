import { NextRequest, NextResponse } from "next/server";
import { translateBibleRef, type BibleDisplayLang } from "@/lib/bibleBooks";
import { getDefaultTranslationId } from "@/lib/translationDefaults";
import { ESV_TRANSLATION_ID } from "@/lib/esvBible";
import {
  formatKoReference,
  pickEmotionVerseRef,
  type EmotionVerseRef,
} from "@/lib/emotionVerseRefs";

function normalizeLang(value: unknown): BibleDisplayLang {
  return value === "de" || value === "en" || value === "fr" || value === "es" || value === "ko" ? value : "ko";
}

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeEmotionKey(value: unknown): string | null {
  if (Array.isArray(value)) return normalizeOptionalString(value[0]);
  return normalizeOptionalString(value);
}

function getTodayVerseFetchOptions(translationId: number) {
  return translationId === ESV_TRANSLATION_ID
    ? ({ cache: "no-store" } as const)
    : ({ next: { revalidate: 86400 } } as const);
}

async function fetchBiblePassage(origin: string, refItem: EmotionVerseRef, translationId: number) {
  const fetchOptions = getTodayVerseFetchOptions(translationId);
  if (refItem.startChapter === refItem.endChapter) {
    const url = new URL("/api/bible", origin);
    url.searchParams.set("translation", String(translationId));
    url.searchParams.set("book", refItem.book);
    url.searchParams.set("chapter", String(refItem.startChapter));
    url.searchParams.set("startVerse", String(refItem.startVerse));
    url.searchParams.set("endVerse", String(refItem.endVerse));

    const res = await fetch(url.toString(), fetchOptions);
    if (!res.ok) throw new Error("Bible API failed");
    const data = await res.json();
    const verses = Array.isArray(data.verses) ? data.verses : [];
    return verses.map((v: any) => String(v.text ?? "").trim()).filter(Boolean).join("\n");
  }

  // Future-proofing for cross-chapter references. The current pool mostly uses same-chapter refs.
  const firstUrl = new URL("/api/bible", origin);
  firstUrl.searchParams.set("translation", String(translationId));
  firstUrl.searchParams.set("book", refItem.book);
  firstUrl.searchParams.set("chapter", String(refItem.startChapter));
  firstUrl.searchParams.set("startVerse", String(refItem.startVerse));
  firstUrl.searchParams.set("endVerse", "176");

  const secondUrl = new URL("/api/bible", origin);
  secondUrl.searchParams.set("translation", String(translationId));
  secondUrl.searchParams.set("book", refItem.book);
  secondUrl.searchParams.set("chapter", String(refItem.endChapter));
  secondUrl.searchParams.set("startVerse", "1");
  secondUrl.searchParams.set("endVerse", String(refItem.endVerse));

  const [firstRes, secondRes] = await Promise.all([
    fetch(firstUrl.toString(), fetchOptions),
    fetch(secondUrl.toString(), fetchOptions),
  ]);

  if (!firstRes.ok || !secondRes.ok) throw new Error("Bible API failed");
  const [firstData, secondData] = await Promise.all([firstRes.json(), secondRes.json()]);
  const firstVerses = Array.isArray(firstData.verses) ? firstData.verses : [];
  const secondVerses = Array.isArray(secondData.verses) ? secondData.verses : [];

  return [...firstVerses, ...secondVerses]
    .map((v: any) => String(v.text ?? "").trim())
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: NextRequest) {
  const origin = new URL(req.url).origin;
  let lang: BibleDisplayLang = "ko";

  try {
    const body = await req.json();
    lang = normalizeLang(body?.lang);
    const emotionKey = normalizeEmotionKey(body?.emotions);
    // Today's Word is intentionally fixed to the language default and must not
    // follow the translation a user chose for a regular Bible Reflection.
    const translationId = getDefaultTranslationId(lang);

    const picked = pickEmotionVerseRef({
      emotionKey,
      userId: normalizeOptionalString(body?.userId ?? body?.user_id),
      date: normalizeOptionalString(body?.date),
      prevVerseRefId: normalizeOptionalString(body?.prevVerseRefId ?? body?.prev_verse_ref_id),
      prevReference: normalizeOptionalString(body?.prevReference ?? body?.prev_reference),
    });

    const koReference = formatKoReference(picked);
    const localizedReference = translateBibleRef(koReference, lang);
    const verseText = await fetchBiblePassage(origin, picked, translationId);

    if (!verseText) throw new Error("Empty Bible text");

    return NextResponse.json({
      verse: verseText,
      reference: localizedReference,
      verse_id: picked.id,
      verseRefId: picked.id,
      emotion_key: picked.emotionKey,
      emotionKey: picked.emotionKey,
      book: picked.book,
      start_chapter: picked.startChapter,
      start_verse: picked.startVerse,
      end_chapter: picked.endChapter,
      end_verse: picked.endVerse,
      translation_id: translationId,
      verse_lang: lang,
      ko_reference: koReference,
    });
  } catch (e) {
    console.error("Fixed verse API error:", e);
    return NextResponse.json(
      { error: "오늘의 말씀을 불러오지 못했어요." },
      { status: 500 },
    );
  }
}

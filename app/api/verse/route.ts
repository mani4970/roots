import { NextRequest, NextResponse } from "next/server";
import type { Lang } from "@/lib/i18n";
import { translateBibleRef } from "@/lib/bibleBooks";
import { getDefaultTranslationId } from "@/lib/translationDefaults";
import {
  formatKoReference,
  pickEmotionVerseRef,
  type EmotionVerseRef,
} from "@/lib/emotionVerseRefs";

function normalizeLang(value: unknown): Lang {
  return value === "de" || value === "en" || value === "fr" || value === "ko" ? value : "ko";
}

function normalizeTranslationId(value: unknown, lang: Lang): number {
  const fallback = getDefaultTranslationId(lang);

  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0 && value <= 9999) {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 9999) return parsed;
  }

  return fallback;
}

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeEmotionKey(value: unknown): string | null {
  if (Array.isArray(value)) return normalizeOptionalString(value[0]);
  return normalizeOptionalString(value);
}

async function fetchBiblePassage(origin: string, refItem: EmotionVerseRef, translationId: number) {
  if (refItem.startChapter === refItem.endChapter) {
    const url = new URL("/api/bible", origin);
    url.searchParams.set("translation", String(translationId));
    url.searchParams.set("book", refItem.book);
    url.searchParams.set("chapter", String(refItem.startChapter));
    url.searchParams.set("startVerse", String(refItem.startVerse));
    url.searchParams.set("endVerse", String(refItem.endVerse));

    const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
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
    fetch(firstUrl.toString(), { next: { revalidate: 86400 } }),
    fetch(secondUrl.toString(), { next: { revalidate: 86400 } }),
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

function fallbackVerse(lang: Lang) {
  if (lang === "de") {
    return {
      verse: "Kommt her zu mir, alle, die ihr mühselig und beladen seid; ich will euch erquicken.",
      reference: "Matthäus 11:28",
    };
  }
  if (lang === "fr") {
    return {
      verse: "Venez à moi, vous tous qui êtes fatigués et chargés, et je vous donnerai du repos.",
      reference: "Matthieu 11:28",
    };
  }
  if (lang === "en") {
    return {
      verse: "Come to me, all who labor and are heavy laden, and I will give you rest.",
      reference: "Matthew 11:28",
    };
  }
  return {
    verse: "수고하고 무거운 짐 진 자들아 다 내게로 오라 내가 너희를 쉬게 하리라",
    reference: "마태복음 11:28",
  };
}

export async function POST(req: NextRequest) {
  const origin = new URL(req.url).origin;
  let lang: Lang = "ko";

  try {
    const body = await req.json();
    lang = normalizeLang(body?.lang);
    const emotionKey = normalizeEmotionKey(body?.emotions);
    const translationId = normalizeTranslationId(body?.translationId ?? body?.translation_id, lang);

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
    const fallback = fallbackVerse(lang);
    return NextResponse.json({
      ...fallback,
      verse_id: "fallback_matthew_11_28",
      verseRefId: "fallback_matthew_11_28",
      emotion_key: "tired",
      emotionKey: "tired",
      book: "마태복음",
      start_chapter: 11,
      start_verse: 28,
      end_chapter: 11,
      end_verse: 28,
      translation_id: getDefaultTranslationId(lang),
      verse_lang: lang,
      ko_reference: "마태복음 11:28",
    });
  }
}

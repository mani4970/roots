import { NextResponse } from "next/server";

const TRANSLATIONS_API_URL = "https://bible.asher.design/api/v1/translations.php";
const FETCH_TIMEOUT_MS = 10_000;

function fallbackTranslations() {
  return {
    ok: true,
    data: [
      { id: 92, name: "개역개정", language: "ko" },
      { id: 1, name: "개역한글", language: "ko" },
    ],
  };
}

async function fetchWithTimeout(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, {
      next: { revalidate: 86400 * 30 },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  try {
    const res = await fetchWithTimeout(TRANSLATIONS_API_URL);
    if (!res.ok) return NextResponse.json(fallbackTranslations());

    const json = await res.json();
    if (!json?.ok || !Array.isArray(json.data)) {
      return NextResponse.json(fallbackTranslations());
    }

    return NextResponse.json(json);
  } catch {
    // API 실패 시 기본 번역본 목록 반환
    return NextResponse.json(fallbackTranslations());
  }
}

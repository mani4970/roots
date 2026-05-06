import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TRANSLATIONS_API_URL = "https://bible.asher.design/api/v1/translations.php";
const FETCH_TIMEOUT_MS = 10_000;

function readServerEnv(name: string, fallback = "") {
  const value = process.env[name] ?? fallback;
  return value.trim().replace(/^([\"'])(.*)\1$/, "$2");
}

function getBibleApiHeaders(): HeadersInit {
  const authorization = readServerEnv("BIBLE_API_AUTHORIZATION");

  if (!authorization) {
    throw new Error("Missing BIBLE_API_AUTHORIZATION");
  }

  return {
    Accept: "application/json",
    "X-API-Key-ID": readServerEnv("BIBLE_API_KEY_ID", "roots-puce"),
    Authorization: authorization,
    "X-Client-Type": readServerEnv("BIBLE_API_CLIENT_TYPE", "vercel-server"),
    "X-App-Name": readServerEnv("BIBLE_API_APP_NAME", "Roots Puce"),
    "X-App-Version": readServerEnv("BIBLE_API_APP_VERSION", "1.0.0"),
  };
}

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
      headers: getBibleApiHeaders(),
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
    if (!res.ok) {
      console.error("Bible translations API request failed", { status: res.status });
      return NextResponse.json(fallbackTranslations());
    }

    const json = await res.json();
    if (!json?.ok || !Array.isArray(json.data)) {
      return NextResponse.json(fallbackTranslations());
    }

    return NextResponse.json(json);
  } catch (e) {
    console.error("Bible translations API proxy error:", e);
    // API 실패 시 기본 번역본 목록 반환
    return NextResponse.json(fallbackTranslations());
  }
}

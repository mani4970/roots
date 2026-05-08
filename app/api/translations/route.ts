import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TRANSLATIONS_API_URL = "https://bible.asher.design/api/v1/translations.php";
const FETCH_TIMEOUT_MS = 10_000;

type TranslationOption = {
  id: number;
  name: string;
  language: string;
};

function readServerEnv(name: string, fallback = "") {
  const value = process.env[name] ?? fallback;
  return value.trim().replace(/^([\"'])(.*)\1$/, "$2");
}

function getBibleApiEnvInfo() {
  const authorization = readServerEnv("BIBLE_API_AUTHORIZATION");
  return {
    authorization,
    keyId: readServerEnv("BIBLE_API_KEY_ID", "roots-puce"),
    clientType: readServerEnv("BIBLE_API_CLIENT_TYPE", "vercel-server"),
    appName: readServerEnv("BIBLE_API_APP_NAME", "Roots Puce"),
    appVersion: readServerEnv("BIBLE_API_APP_VERSION", "1.0.0"),
  };
}

function getBibleApiHeaders(): HeadersInit {
  const env = getBibleApiEnvInfo();

  if (!env.authorization) {
    throw new Error("Missing BIBLE_API_AUTHORIZATION");
  }

  return {
    Accept: "application/json",
    "X-API-Key-ID": env.keyId,
    Authorization: env.authorization,
    "X-Client-Type": env.clientType,
    "X-App-Name": env.appName,
    "X-App-Version": env.appVersion,
  };
}

function getSafeDebugEnvInfo() {
  const env = getBibleApiEnvInfo();
  return {
    authorizationPresent: Boolean(env.authorization),
    authorizationLooksBearer: env.authorization.startsWith("Bearer "),
    authorizationLength: env.authorization.length,
    keyId: env.keyId,
    clientType: env.clientType,
    appName: env.appName,
    appVersion: env.appVersion,
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

function toTranslationOption(item: unknown): TranslationOption | null {
  if (!item || typeof item !== "object") return null;
  const entry = item as Record<string, unknown>;
  const rawId = entry.id ?? entry.translation_id ?? entry.translationId;
  const rawName = entry.name ?? entry.title ?? entry.translation ?? entry.label;
  const rawLanguage = entry.language ?? entry.lang ?? entry.locale;

  const id = typeof rawId === "number" ? rawId : Number(rawId);
  const name = typeof rawName === "string" ? rawName.trim() : "";
  const language = typeof rawLanguage === "string" ? rawLanguage.trim() : "";

  if (!Number.isSafeInteger(id) || id <= 0 || !name || !language) return null;
  return { id, name, language };
}

function normalizeTranslations(json: unknown): TranslationOption[] | null {
  const payload = json as Record<string, unknown> | null;
  const candidates = [
    Array.isArray(json) ? json : null,
    Array.isArray(payload?.data) ? payload?.data : null,
    payload?.data && typeof payload.data === "object" && Array.isArray((payload.data as Record<string, unknown>).translations)
      ? (payload.data as Record<string, unknown>).translations
      : null,
    Array.isArray(payload?.translations) ? payload?.translations : null,
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    const translations = candidate
      .map(toTranslationOption)
      .filter((item): item is TranslationOption => Boolean(item));
    if (translations.length > 0) return translations;
  }

  return null;
}

async function fetchWithTimeout(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, {
      cache: "no-store",
      headers: getBibleApiHeaders(),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function buildDebugResponse(res: Response) {
  const body = await res.text().catch(() => "");
  return NextResponse.json(
    {
      ok: false,
      source: "asher-translations",
      status: res.status,
      statusText: res.statusText,
      env: getSafeDebugEnvInfo(),
      bodyPreview: body.slice(0, 500),
    },
    { status: 502 }
  );
}

export async function GET(req: NextRequest) {
  const debug = new URL(req.url).searchParams.get("debug") === "1";

  try {
    const res = await fetchWithTimeout(TRANSLATIONS_API_URL);
    if (!res.ok) {
      console.error("Bible translations API request failed", { status: res.status, statusText: res.statusText });
      if (debug) return buildDebugResponse(res);
      return NextResponse.json(fallbackTranslations());
    }

    const json = await res.json();
    const translations = normalizeTranslations(json);
    if (!translations) {
      console.error("Bible translations API returned unexpected payload shape");
      if (debug) {
        return NextResponse.json(
          {
            ok: false,
            source: "asher-translations",
            status: 200,
            env: getSafeDebugEnvInfo(),
            payloadPreview: JSON.stringify(json).slice(0, 500),
          },
          { status: 502 }
        );
      }
      return NextResponse.json(fallbackTranslations());
    }

    return NextResponse.json({ ok: true, data: translations });
  } catch (e) {
    console.error("Bible translations API proxy error:", e);
    if (debug) {
      return NextResponse.json(
        {
          ok: false,
          source: "asher-translations",
          env: getSafeDebugEnvInfo(),
          error: e instanceof Error ? e.message : "Unknown error",
        },
        { status: 500 }
      );
    }
    return NextResponse.json(fallbackTranslations());
  }
}

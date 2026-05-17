"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { App, type URLOpenListenerEvent } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { createClient } from "@/lib/supabase";
import { storageGet, storageRemove, storageSet } from "@/lib/clientStorage";
import type { Lang } from "@/lib/i18n";

const SUPPORTED_LANGS = new Set<Lang>(["ko", "de", "en", "fr"]);
const ROOTS_WEB_HOSTS = new Set([
  "www.christian-roots.com",
  "christian-roots.com",
]);

function normalizeLang(value: string | null): Lang {
  return SUPPORTED_LANGS.has(value as Lang) ? (value as Lang) : "ko";
}

function isRootsSchemeAuthCallback(rawUrl: string) {
  const value = rawUrl.trim();

  // Android can deliver the same custom-scheme redirect as roots:////auth/callback
  // even when Supabase was given roots://auth/callback. Handle the custom scheme
  // before URL parsing so platform-specific URL normalization cannot turn it false.
  return /^roots:\/+(?:auth\/callback)\/?(?:[?#]|$)/i.test(value);
}

function isRootsAuthCallback(rawUrl: string) {
  if (isRootsSchemeAuthCallback(rawUrl)) return true;

  try {
    const url = new URL(rawUrl);
    const normalizedPath = url.pathname.replace(/\/$/, "");

    if (url.protocol === "roots:") {
      const rootsPath = `${url.host}${normalizedPath}`
        .replace(/^\/+/, "")
        .replace(/\/+$/, "");

      return rootsPath === "auth/callback";
    }

    if (
      (url.protocol === "https:" || url.protocol === "http:") &&
      ROOTS_WEB_HOSTS.has(url.host) &&
      normalizedPath === "/auth/callback"
    ) {
      return true;
    }

    return false;
  } catch {
    return rawUrl.includes("christian-roots.com/auth/callback");
  }
}


function getRootsInAppPath(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const normalizedPath = url.pathname.replace(/\/$/, "") || "/";

    if (url.protocol === "roots:") {
      const rootsPath = `${url.host}${normalizedPath}`
        .replace(/^\/+/, "")
        .replace(/\/+$/, "");
      if (rootsPath === "join") return `/join${url.search}${url.hash}`;
      return null;
    }

    if (
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      !ROOTS_WEB_HOSTS.has(url.host)
    ) {
      return null;
    }

    if (normalizedPath === "/auth/callback") return null;
    if (normalizedPath === "/") return `/${url.search}${url.hash}`;
    if (normalizedPath === "/join") return `/join${url.search}${url.hash}`;

    return null;
  } catch {
    return null;
  }
}

function getSearchParams(rawUrl: string) {
  try {
    return new URL(rawUrl).searchParams;
  } catch {
    const query = rawUrl.split("?")[1] ?? "";
    return new URLSearchParams(query);
  }
}

function getSafeNext(value: string | null) {
  if (!value) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function safeJson(value: Record<string, unknown>) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

const DEBUG_OAUTH = process.env.NODE_ENV !== "production";

function debugOAuth(message: string, details?: Record<string, unknown>) {
  if (!DEBUG_OAUTH) return;
  const suffix = details ? ` ${safeJson(details)}` : "";
  console.info(`[Roots OAuth] ${message}${suffix}`);
}

function maskCallbackUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const params = url.searchParams;
    const code = params.get("code");
    if (code) params.set("code", `${code.slice(0, 6)}…(${code.length})`);
    const query = params.toString();
    return `${url.protocol}//${url.host}${url.pathname}${query ? `?${query}` : ""}`;
  } catch {
    return rawUrl.includes("code=")
      ? rawUrl.replace(
          /code=([^&]+)/,
          (_match, code: string) => `code=${code.slice(0, 6)}…(${code.length})`,
        )
      : rawUrl;
  }
}

export default function CapacitorAuthBridge() {
  const router = useRouter();
  const handledUrls = useRef(new Set<string>());
  const handlingRef = useRef(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let active = true;
    let listener: { remove: () => Promise<void> } | undefined;

    async function handleOpenUrl(rawUrl: string, source: "appUrlOpen" | "launchUrl") {
      if (!rawUrl) {
        debugOAuth("empty url ignored", { source });
        return;
      }

      const callback = isRootsAuthCallback(rawUrl);
      const inAppPath = getRootsInAppPath(rawUrl);
      debugOAuth("url received", {
        source,
        isCallback: callback,
        hasInAppPath: Boolean(inAppPath),
        platform: Capacitor.getPlatform(),
        url: maskCallbackUrl(rawUrl),
      });

      if (!callback) {
        if (inAppPath) {
          debugOAuth("routing universal link", { source, href: inAppPath });
          try {
            await Browser.close();
          } catch {
            // Browser may not be open. Ignore and route inside the app.
          }
          router.replace(inAppPath);
          router.refresh();
        }
        return;
      }

      debugOAuth("callback received", {
        source,
        platform: Capacitor.getPlatform(),
        url: maskCallbackUrl(rawUrl),
      });

      const params = getSearchParams(rawUrl);
      const lang = normalizeLang(params.get("lang") || storageGet("roots_lang"));
      const code = params.get("code");
      const next = getSafeNext(params.get("next") || storageGet("roots_native_oauth_next"));
      const error = params.get("error") || params.get("error_description");
      const handledCodeKey = code ? `roots_native_oauth_code_${code}` : "";

      debugOAuth("callback params", {
        source,
        hasCode: Boolean(code),
        codeLength: code?.length ?? 0,
        hasError: Boolean(error),
        error,
        next,
        lang,
        duplicateUrl: handledUrls.current.has(rawUrl),
        isHandling: handlingRef.current,
        handledCodeStored: Boolean(handledCodeKey && storageGet(handledCodeKey)),
      });

      storageSet("roots_lang", lang);
      storageSet("roots_lang_selected", "true");

      try {
        await Browser.close();
        debugOAuth("browser close requested", { source });
      } catch (closeError) {
        debugOAuth("browser close failed", {
          source,
          message:
            closeError instanceof Error ? closeError.message : String(closeError),
        });
      }

      const supabase = createClient();

      if (error || !code) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        debugOAuth("callback missing code or has provider error", {
          source,
          hasSession: Boolean(session),
          error,
        });
        if (session) {
          router.replace(next);
          router.refresh();
        } else {
          router.replace(`/login?lang=${encodeURIComponent(lang)}`);
        }
        return;
      }

      if (
        handledUrls.current.has(rawUrl) ||
        handlingRef.current ||
        (handledCodeKey && storageGet(handledCodeKey))
      ) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        debugOAuth("duplicate callback skipped", {
          source,
          hasSession: Boolean(session),
          next,
        });
        if (session) {
          storageRemove("roots_native_oauth_next");
          const separator = next.includes("?") ? "&" : "?";
          router.replace(`${next}${separator}lang=${encodeURIComponent(lang)}`);
          router.refresh();
        }
        return;
      }

      handledUrls.current.add(rawUrl);
      handlingRef.current = true;

      try {
        const { data: beforeExchange } = await supabase.auth.getSession();
        debugOAuth("before exchange", {
          source,
          hasSession: Boolean(beforeExchange.session),
        });

        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        debugOAuth("exchange completed", {
          source,
          hasError: Boolean(exchangeError),
          errorMessage: exchangeError?.message,
          errorName: exchangeError?.name,
          errorStatus:
            "status" in (exchangeError ?? {})
              ? (exchangeError as { status?: number }).status
              : undefined,
        });

        if (exchangeError) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          debugOAuth("after failed exchange session check", {
            source,
            hasSession: Boolean(session),
          });
          if (session) {
            console.warn(
              "Capacitor OAuth callback was already handled; keeping existing session.",
            );
          } else {
            console.error(
              "Capacitor OAuth session exchange failed",
              exchangeError.message,
            );
            router.replace(`/login?lang=${encodeURIComponent(lang)}`);
            return;
          }
        }

        if (handledCodeKey) storageSet(handledCodeKey, String(Date.now()));
        storageRemove("roots_native_oauth_next");

        const { data: afterExchange } = await supabase.auth.getSession();
        debugOAuth("after exchange", {
          source,
          hasSession: Boolean(afterExchange.session),
          next,
        });

        const separator = next.includes("?") ? "&" : "?";
        const href = `${next}${separator}lang=${encodeURIComponent(lang)}`;
        debugOAuth("routing after callback", { source, href });
        router.replace(href);
        router.refresh();
      } finally {
        handlingRef.current = false;
      }
    }

    App.addListener("appUrlOpen", (event: URLOpenListenerEvent) => {
      debugOAuth("appUrlOpen event", { url: maskCallbackUrl(event.url) });
      void handleOpenUrl(event.url, "appUrlOpen");
    }).then((handle) => {
      if (!active) {
        void handle.remove();
        return;
      }
      listener = handle;
    });

    App.getLaunchUrl().then((launchUrl) => {
      if (launchUrl?.url) {
        debugOAuth("launch url found", { url: maskCallbackUrl(launchUrl.url) });
        void handleOpenUrl(launchUrl.url, "launchUrl");
      } else {
        debugOAuth("launch url empty");
      }
    });

    return () => {
      active = false;
      if (listener) void listener.remove();
    };
  }, [router]);

  return null;
}

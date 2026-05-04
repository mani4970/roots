import type { Lang } from "@/lib/i18n";

const DEFAULT_CAPACITOR_AUTH_CALLBACK = "roots://auth/callback";

function appendLang(url: string, lang: Lang) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}lang=${encodeURIComponent(lang)}`;
}

export function isCapacitorApp() {
  if (typeof window === "undefined") return false;

  const maybeWindow = window as typeof window & {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      getPlatform?: () => string;
    };
  };

  if (!maybeWindow.Capacitor) return false;

  try {
    if (typeof maybeWindow.Capacitor.isNativePlatform === "function") {
      return maybeWindow.Capacitor.isNativePlatform();
    }
    if (typeof maybeWindow.Capacitor.getPlatform === "function") {
      return maybeWindow.Capacitor.getPlatform() !== "web";
    }
  } catch {
    return false;
  }

  return false;
}

export function getOAuthRedirectTo(lang: Lang) {
  if (typeof window === "undefined") return undefined;

  if (isCapacitorApp()) {
    const capacitorCallback =
      process.env.NEXT_PUBLIC_CAPACITOR_AUTH_CALLBACK || DEFAULT_CAPACITOR_AUTH_CALLBACK;
    return appendLang(capacitorCallback, lang);
  }

  return `${window.location.origin}/auth/callback?lang=${encodeURIComponent(lang)}`;
}

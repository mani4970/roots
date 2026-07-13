import { Capacitor } from "@capacitor/core";

export type RequiredUpdatePlatform = "ios" | "android";

const APP_STORE_URL = "https://apps.apple.com/app/christian-roots/id6769063816";
const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=com.rootspuce.app";

function isLocalPreviewRuntime() {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) ||
    hostname.endsWith(".local")
  );
}

function getLocalPreviewPlatform(): RequiredUpdatePlatform | null {
  if (!isLocalPreviewRuntime()) return null;
  const value = new URLSearchParams(window.location.search).get("previewRequiredUpdate");
  return value === "ios" || value === "android" ? value : null;
}

export function isOneTimeUpdatePreview() {
  return getLocalPreviewPlatform() !== null;
}

export function detectOneTimeUpdatePopupPlatform(): RequiredUpdatePlatform | null {
  const previewPlatform = getLocalPreviewPlatform();
  if (previewPlatform) return previewPlatform;

  try {
    if (!Capacitor.isNativePlatform()) return null;
    const platform = Capacitor.getPlatform();
    return platform === "ios" || platform === "android" ? platform : null;
  } catch {
    return null;
  }
}

export function openRequiredUpdateStore(platform: RequiredUpdatePlatform) {
  if (typeof window === "undefined") return;
  window.location.href = platform === "ios" ? APP_STORE_URL : GOOGLE_PLAY_URL;
}

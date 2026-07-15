import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

export type RequiredUpdatePlatform = "ios" | "android";

const APP_STORE_URL = "https://apps.apple.com/app/christian-roots/id6769063816";
const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=com.rootspuce.app";

const REQUIRED_NATIVE_VERSION: Record<RequiredUpdatePlatform, { version: string; build: number }> = {
  ios: { version: "2.0.1", build: 12 },
  android: { version: "2.0.1", build: 12 },
};

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

function compareVersions(left: string, right: string): number | null {
  const parse = (value: string) => {
    const normalized = value.trim().split(/[+-]/, 1)[0];
    if (!/^\d+(?:\.\d+)*$/.test(normalized)) return null;
    return normalized.split(".").map(Number);
  };

  const leftParts = parse(left);
  const rightParts = parse(right);
  if (!leftParts || !rightParts) return null;

  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts[index] ?? 0;
    const rightPart = rightParts[index] ?? 0;
    if (leftPart < rightPart) return -1;
    if (leftPart > rightPart) return 1;
  }
  return 0;
}

export async function detectOneTimeUpdatePopupPlatform(): Promise<RequiredUpdatePlatform | null> {
  const previewPlatform = getLocalPreviewPlatform();
  if (previewPlatform) return previewPlatform;

  try {
    if (!Capacitor.isNativePlatform()) return null;
    const platform = Capacitor.getPlatform();
    if (platform !== "ios" && platform !== "android") return null;

    const appInfo = await App.getInfo();
    const required = REQUIRED_NATIVE_VERSION[platform];
    const versionComparison = compareVersions(appInfo.version, required.version);

    if (versionComparison === null || versionComparison > 0) return null;
    if (versionComparison < 0) return platform;

    const installedBuild = Number.parseInt(appInfo.build, 10);
    if (!Number.isFinite(installedBuild)) return null;
    return installedBuild < required.build ? platform : null;
  } catch {
    // Never block the app when native version information cannot be read.
    return null;
  }
}

export function openRequiredUpdateStore(platform: RequiredUpdatePlatform) {
  if (typeof window === "undefined") return;
  window.location.href = platform === "ios" ? APP_STORE_URL : GOOGLE_PLAY_URL;
}

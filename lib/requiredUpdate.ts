import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

export type RequiredUpdatePlatform = "ios" | "android";

export type NativeUpdatePrompt = {
  platform: RequiredUpdatePlatform;
  mandatory: boolean;
  campaignId: string;
};

// Keep this off until 2.2.2 (17) is available to download from the App Store.
export const IPHONE_222_REQUIRED_UPDATE_ENABLED = true;
export const IPHONE_222_UPDATE_CAMPAIGN_ID = "2026-10-iphone-native-2.2.2-17";
const IPHONE_222_NATIVE_VERSION = { version: "2.2.2", build: 17 };

const APP_STORE_URL = "https://apps.apple.com/app/christian-roots/id6769063816";
const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=com.rootspuce.app";

// Preserve the older hard-stop floor. Users below this version must still update.
const MIN_SUPPORTED_NATIVE_VERSION: Record<RequiredUpdatePlatform, { version: string; build: number }> = {
  ios: { version: "2.0.1", build: 12 },
  android: { version: "2.0.1", build: 12 },
};

// September 2026 one-time update campaign. Only users below the currently
// published native version are invited to update; users already current never
// see the popup. Android and iOS intentionally have different latest versions.
const LATEST_NATIVE_VERSION: Record<RequiredUpdatePlatform, { version: string; build: number }> = {
  ios: { version: "2.2.1", build: 16 },
  android: { version: "2.2.0", build: 15 },
};

const OPTIONAL_UPDATE_CAMPAIGN_ID = "2026-09-native-2.2";
const OPTIONAL_UPDATE_SEEN_PREFIX = "roots:optional-native-update:";

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

function getLocalPreviewPrompt(): NativeUpdatePrompt | null {
  if (!isLocalPreviewRuntime()) return null;
  const params = new URLSearchParams(window.location.search);
  if (params.get("previewIPhoneUpdate") === "1") {
    return { platform: "ios", mandatory: true, campaignId: IPHONE_222_UPDATE_CAMPAIGN_ID };
  }
  const required = params.get("previewRequiredUpdate");
  if (required === "ios" || required === "android") {
    return { platform: required, mandatory: true, campaignId: "preview-required" };
  }
  const optional = params.get("previewOptionalUpdate");
  if (optional === "ios" || optional === "android") {
    return { platform: optional, mandatory: false, campaignId: OPTIONAL_UPDATE_CAMPAIGN_ID };
  }
  return null;
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

function isInstalledBelow(
  installedVersion: string,
  installedBuildRaw: string,
  target: { version: string; build: number },
): boolean | null {
  const versionComparison = compareVersions(installedVersion, target.version);
  if (versionComparison === null) return null;
  if (versionComparison < 0) return true;
  if (versionComparison > 0) return false;

  const installedBuild = Number.parseInt(installedBuildRaw, 10);
  if (!Number.isFinite(installedBuild)) return null;
  return installedBuild < target.build;
}

// Older binaries cannot expose the new status-bar capability flag. Require
// explicit phone evidence and leave iPad, Mac and ambiguous runtimes unchanged.
export function shouldCheckIPhone222RequiredUpdate(): boolean {
  if (!IPHONE_222_REQUIRED_UPDATE_ENABLED || typeof window === "undefined") return false;
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") return false;
  const { userAgent, platform, maxTouchPoints } = window.navigator;
  if (!/iPhone/i.test(userAgent) || /iPad|Macintosh/i.test(userAgent) || /iPad|Mac/i.test(platform)) return false;
  const width = window.screen?.width;
  const height = window.screen?.height;
  return maxTouchPoints > 0 && Number.isFinite(width) && Number.isFinite(height)
    && width > 0 && height > 0 && Math.min(width, height) < 700;
}

function getIPhone222RequiredUpdate(appInfo: { version: string; build: string }): NativeUpdatePrompt | null {
  if (isInstalledBelow(appInfo.version, appInfo.build, IPHONE_222_NATIVE_VERSION) !== true) return null;
  return { platform: "ios", mandatory: true, campaignId: IPHONE_222_UPDATE_CAMPAIGN_ID };
}

/** New iPhone campaign only. Used outside Home without changing legacy rules. */
export async function detectIPhone222RequiredUpdatePopup(): Promise<NativeUpdatePrompt | null> {
  const previewPrompt = getLocalPreviewPrompt();
  if (previewPrompt?.campaignId === IPHONE_222_UPDATE_CAMPAIGN_ID) return previewPrompt;
  try {
    if (!shouldCheckIPhone222RequiredUpdate()) return null;
    return getIPhone222RequiredUpdate(await App.getInfo());
  } catch {
    return null;
  }
}

function optionalSeenKey(userId: string, platform: RequiredUpdatePlatform, campaignId: string) {
  return `${OPTIONAL_UPDATE_SEEN_PREFIX}${campaignId}:${platform}:${userId}`;
}

function hasSeenOptionalUpdate(userId: string, platform: RequiredUpdatePlatform, campaignId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(optionalSeenKey(userId, platform, campaignId)) === "1";
  } catch {
    return false;
  }
}

export function markOptionalUpdateSeen(userId: string | null | undefined, prompt: NativeUpdatePrompt): void {
  if (!userId || prompt.mandatory || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(optionalSeenKey(userId, prompt.platform, prompt.campaignId), "1");
  } catch {
    // Storage is best-effort. Never block navigation to the store.
  }
}

export async function detectOneTimeUpdatePopup(userId: string): Promise<NativeUpdatePrompt | null> {
  const previewPrompt = getLocalPreviewPrompt();
  if (previewPrompt) return previewPrompt;

  try {
    if (!Capacitor.isNativePlatform()) return null;
    const platform = Capacitor.getPlatform();
    if (platform !== "ios" && platform !== "android") return null;

    const appInfo = await App.getInfo();
    if (shouldCheckIPhone222RequiredUpdate()) {
      const iPhonePrompt = getIPhone222RequiredUpdate(appInfo);
      if (iPhonePrompt) return iPhonePrompt;
    }
    const belowMinimum = isInstalledBelow(appInfo.version, appInfo.build, MIN_SUPPORTED_NATIVE_VERSION[platform]);
    if (belowMinimum === true) {
      return { platform, mandatory: true, campaignId: "minimum-2.0.1" };
    }
    if (belowMinimum === null) return null;

    const belowLatest = isInstalledBelow(appInfo.version, appInfo.build, LATEST_NATIVE_VERSION[platform]);
    if (belowLatest !== true) return null;
    if (hasSeenOptionalUpdate(userId, platform, OPTIONAL_UPDATE_CAMPAIGN_ID)) return null;

    return { platform, mandatory: false, campaignId: OPTIONAL_UPDATE_CAMPAIGN_ID };
  } catch {
    // Never block the app when native version information cannot be read.
    return null;
  }
}

export function openRequiredUpdateStore(platform: RequiredUpdatePlatform) {
  if (typeof window === "undefined") return;
  window.location.href = platform === "ios" ? APP_STORE_URL : GOOGLE_PLAY_URL;
}

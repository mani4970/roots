"use client";

import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { PushNotifications, type PermissionStatus, type Token } from "@capacitor/push-notifications";
import { createClient } from "@/lib/supabase";

export type RootsPushTokenRegistrationStatus =
  | "registered"
  | "unavailable"
  | "permission_denied"
  | "registration_failed"
  | "missing_user";

export type RootsPushTokenRegistrationResult = {
  ok: boolean;
  status: RootsPushTokenRegistrationStatus;
  permission?: PermissionStatus["receive"];
  platform?: "ios" | "android";
  tokenProvider?: "apns" | "fcm";
  error?: string;
};

const PUSH_REGISTRATION_TIMEOUT_MS = 18000;

function getNativePushPlatform(): "ios" | "android" | null {
  if (typeof window === "undefined") return null;

  try {
    if (!Capacitor.isNativePlatform()) return null;
    const platform = Capacitor.getPlatform();
    if (platform === "ios" || platform === "android") return platform;
    return null;
  } catch {
    return null;
  }
}

export function isNativePushNotificationsAvailable() {
  const platform = getNativePushPlatform();
  if (!platform) return false;

  try {
    if (typeof Capacitor.isPluginAvailable === "function") {
      return Capacitor.isPluginAvailable("PushNotifications");
    }
    return true;
  } catch {
    return false;
  }
}

function tokenProviderForPlatform(platform: "ios" | "android"): "apns" | "fcm" {
  return platform === "ios" ? "apns" : "fcm";
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown push notification error.";
  }
}

async function getCurrentUserId() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user?.id ?? null;
}

async function ensurePushPermission(): Promise<PermissionStatus> {
  const current = await PushNotifications.checkPermissions();
  if (current.receive === "granted") return current;
  return PushNotifications.requestPermissions();
}

async function waitForRegistrationToken(): Promise<string> {
  let registrationHandle: PluginListenerHandle | null = null;
  let errorHandle: PluginListenerHandle | null = null;
  let timeoutId: number | null = null;

  const cleanup = () => {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }
    void registrationHandle?.remove();
    void errorHandle?.remove();
  };

  return new Promise<string>(async (resolve, reject) => {
    timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("Push registration timed out."));
    }, PUSH_REGISTRATION_TIMEOUT_MS);

    try {
      registrationHandle = await PushNotifications.addListener("registration", (token: Token) => {
        cleanup();
        if (token.value) {
          resolve(token.value);
        } else {
          reject(new Error("Push registration returned an empty token."));
        }
      });

      errorHandle = await PushNotifications.addListener("registrationError", (error) => {
        cleanup();
        reject(new Error(error?.error || "Push registration failed."));
      });

      await PushNotifications.register();
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}

async function upsertPushToken(userId: string, platform: "ios" | "android", token: string) {
  const tokenProvider = tokenProviderForPlatform(platform);
  const supabase = createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("notification_push_tokens")
    .upsert(
      {
        user_id: userId,
        platform,
        token_provider: tokenProvider,
        token,
        enabled: true,
        last_seen_at: now,
        updated_at: now,
      },
      { onConflict: "user_id,token_provider,token" }
    );

  if (error) throw error;
  return tokenProvider;
}

export async function registerCurrentDeviceForPushNotifications(): Promise<RootsPushTokenRegistrationResult> {
  const platform = getNativePushPlatform();
  if (!platform || !isNativePushNotificationsAvailable()) {
    return { ok: false, status: "unavailable" };
  }

  try {
    const userId = await getCurrentUserId();
    if (!userId) return { ok: false, status: "missing_user", platform };

    const permission = await ensurePushPermission();
    if (permission.receive !== "granted") {
      return {
        ok: false,
        status: "permission_denied",
        permission: permission.receive,
        platform,
        tokenProvider: tokenProviderForPlatform(platform),
      };
    }

    const token = await waitForRegistrationToken();
    const tokenProvider = await upsertPushToken(userId, platform, token);

    return {
      ok: true,
      status: "registered",
      permission: "granted",
      platform,
      tokenProvider,
    };
  } catch (error) {
    console.warn("Roots push token registration failed", error);
    return {
      ok: false,
      status: "registration_failed",
      platform,
      tokenProvider: tokenProviderForPlatform(platform),
      error: errorMessage(error),
    };
  }
}

export async function disableCurrentUserPushTokens() {
  const supabase = createClient();
  const { data, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = data.user?.id;
  if (!userId) return;

  const { error } = await supabase
    .from("notification_push_tokens")
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("enabled", true);

  if (error) throw error;

  if (isNativePushNotificationsAvailable()) {
    try {
      await PushNotifications.unregister();
    } catch (error) {
      // Keep the saved preference even if the native platform cannot unregister
      // immediately. The DB token is already disabled and future sends will skip it.
      console.warn("Roots push unregister failed", error);
    }
  }
}

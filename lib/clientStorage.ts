"use client";

/**
 * Small browser-storage wrapper for Roots.
 *
 * Today this uses window.localStorage for the web/PWA build.
 * Later, when the app is converted with Capacitor, this file is the one place
 * where we can switch persistent keys to @capacitor/preferences without
 * touching every page again.
 */
function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function storageGet(key: string): string | null {
  try {
    return getLocalStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function storageSet(key: string, value: string): void {
  try {
    getLocalStorage()?.setItem(key, value);
  } catch {
    // Storage can be unavailable in private mode, restricted webviews,
    // or future native app environments. App flow should keep working.
  }
}

export function storageRemove(key: string): void {
  try {
    getLocalStorage()?.removeItem(key);
  } catch {
    // Ignore storage failures; Supabase remains the source of truth for user data.
  }
}

export function storageHas(key: string): boolean {
  return storageGet(key) !== null;
}

export function storageGetJson<T>(key: string, fallback: T): T {
  const raw = storageGet(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function storageSetJson(key: string, value: unknown): void {
  try {
    storageSet(key, JSON.stringify(value));
  } catch {
    // Ignore serialization/storage failures.
  }
}

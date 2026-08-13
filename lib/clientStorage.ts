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

const ACCOUNT_SCOPED_STORAGE_PREFIXES = [
  "onboarding_done_",
  "roots_qt_draft_backup_v1_",
  "qt_pending_awarded_badges_",
  "qt_completion_pending_watering_",
  "celebrated_",
  "roots_group_favorites_",
  "roots_community_all_section_seen_",
  "comm_prayed_",
  "roots_campaign_seen_",
] as const;

const UUID_IN_STORAGE_KEY =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function getAccountScopedStorageUserId(key: string): string | null {
  if (!ACCOUNT_SCOPED_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
    return null;
  }
  return key.match(UUID_IN_STORAGE_KEY)?.[0] ?? null;
}

/**
 * Clears device-local state after an account is permanently deleted without
 * erasing local state that belongs to a different Roots account on the same
 * device. Shared/device-level settings are still cleared, and every known
 * account-scoped key belonging to the deleted user is removed.
 */
export function storageClearAfterAccountDeletion(deletedUserId: string): void {
  try {
    const storage = getLocalStorage();
    if (!storage) return;

    const normalizedDeletedUserId = deletedUserId.trim().toLowerCase();
    if (!normalizedDeletedUserId) {
      storage.clear();
      return;
    }

    const preservedOtherAccountEntries: Array<[string, string]> = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key) continue;

      const scopedUserId = getAccountScopedStorageUserId(key)?.toLowerCase() ?? null;
      if (!scopedUserId || scopedUserId === normalizedDeletedUserId) continue;

      const value = storage.getItem(key);
      if (value !== null) preservedOtherAccountEntries.push([key, value]);
    }

    storage.clear();
    preservedOtherAccountEntries.forEach(([key, value]) => {
      storage.setItem(key, value);
    });
  } catch {
    // Account deletion remains successful even if browser storage is unavailable.
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

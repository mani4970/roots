"use client";

import { storageGetJson, storageRemove, storageSetJson } from "@/lib/clientStorage";

export type QTDraftBackupMode = "6step" | "sunday" | "free";

export type QTDraftBackup = {
  userId: string;
  date: string;
  mode: QTDraftBackupMode;
  translationId: number | null;
  currentStep: number;
  bibleRef: string;
  keyVerse: string;
  answers: Record<string, string>;
  decisions: string[];
  freeText: string;
  sermonTitle: string;
  passageRefs: string[];
  updatedAt: string;
};

function backupKey(userId: string, date: string) {
  return `roots_qt_draft_backup_v1_${userId}_${date}`;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every(item => typeof item === "string");
}

function normalizeBackup(value: unknown, userId: string, date: string): QTDraftBackup | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<QTDraftBackup>;
  if (raw.userId !== userId || raw.date !== date) return null;
  const mode: QTDraftBackupMode = raw.mode === "free" || raw.mode === "sunday" || raw.mode === "6step" ? raw.mode : "6step";
  const answers = isStringRecord(raw.answers) ? raw.answers : {};
  const decisions = Array.isArray(raw.decisions) ? raw.decisions.filter((item): item is string => typeof item === "string") : [""];
  const passageRefs = Array.isArray(raw.passageRefs) ? raw.passageRefs.filter((item): item is string => typeof item === "string") : [];
  const parsedTranslationId = Number(raw.translationId);
  const translationId = Number.isSafeInteger(parsedTranslationId) && parsedTranslationId > 0
    ? parsedTranslationId
    : null;

  return {
    userId,
    date,
    mode,
    translationId,
    currentStep: Number.isFinite(Number(raw.currentStep)) ? Number(raw.currentStep) : 0,
    bibleRef: typeof raw.bibleRef === "string" ? raw.bibleRef : "",
    keyVerse: typeof raw.keyVerse === "string" ? raw.keyVerse : "",
    answers,
    decisions: decisions.length > 0 ? decisions : [""],
    freeText: typeof raw.freeText === "string" ? raw.freeText : "",
    sermonTitle: typeof raw.sermonTitle === "string" ? raw.sermonTitle : "",
    passageRefs,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : "",
  };
}

function parseTimestamp(value: unknown) {
  const timestamp = Date.parse(String(value ?? ""));
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function buildSundayBibleRef(backup: QTDraftBackup) {
  const title = backup.sermonTitle.trim();
  const refs = Array.from(new Set(
    [backup.bibleRef, ...backup.passageRefs]
      .map(ref => ref.trim())
      .filter(Boolean),
  ));

  if (!title && refs.length === 0) return "";
  if (refs.length > 0) return `설교: ${title} (${refs.join(", ")})`;
  return `설교: ${title}`;
}

export function hasMeaningfulQTDraftBackup(backup: QTDraftBackup | null) {
  if (!backup) return false;
  return Boolean(
    backup.bibleRef.trim() ||
    backup.keyVerse.trim() ||
    backup.freeText.trim() ||
    (backup.mode === "sunday" && backup.sermonTitle.trim()) ||
    backup.passageRefs.some(ref => ref.trim()) ||
    Object.values(backup.answers).some(value => value.trim()) ||
    backup.decisions.some(value => value.trim())
  );
}

export function loadQTDraftBackup(userId: string, date: string) {
  const raw = storageGetJson<unknown>(backupKey(userId, date), null);
  const backup = normalizeBackup(raw, userId, date);
  return hasMeaningfulQTDraftBackup(backup) ? backup : null;
}

/**
 * Writes the full latest snapshot and verifies it can be read back. Returning a
 * boolean lets autosave distinguish a real device backup from storage that is
 * unavailable in a restricted browser/WebView.
 */
export function saveQTDraftBackup(backup: QTDraftBackup) {
  const key = backupKey(backup.userId, backup.date);
  if (!hasMeaningfulQTDraftBackup(backup)) {
    storageRemove(key);
    return storageGetJson<unknown>(key, null) === null;
  }

  storageSetJson(key, backup);
  const saved = normalizeBackup(storageGetJson<unknown>(key, null), backup.userId, backup.date);
  return Boolean(saved && saved.updatedAt === backup.updatedAt);
}

export function removeQTDraftBackup(userId: string, date: string) {
  const key = backupKey(userId, date);
  storageRemove(key);
  return storageGetJson<unknown>(key, null) === null;
}

/**
 * Chooses one coherent snapshot instead of combining individual fields by
 * length. The old "longer string wins" rule could revive older text after the
 * user intentionally shortened or rewrote it. A newer device backup now wins
 * as a whole; otherwise the newer server row remains authoritative.
 */
export function mergeQtDraftRowWithBackup<T extends Record<string, unknown>>(
  draft: T,
  backup: QTDraftBackup | null,
): T {
  if (!backup) return draft;

  const serverClientTimestamp = parseTimestamp(draft.draft_client_updated_at);
  const backupTimestamp = parseTimestamp(backup.updatedAt);

  // Compare timestamps attached to the actual snapshots, not when the network
  // request happened to finish. A slow save of an older snapshot can finish
  // after a newer local edit; server updated_at alone would then be misleading.
  // Legacy rows without a client timestamp intentionally defer to a verified
  // device snapshot when one exists.
  if (
    serverClientTimestamp > 0
    && (backupTimestamp <= 0 || serverClientTimestamp >= backupTimestamp)
  ) {
    return draft;
  }

  const merged: Record<string, unknown> = { ...draft };
  const isFree = backup.mode === "free";

  merged.qt_mode = backup.mode;
  merged.current_step = Math.max(0, backup.currentStep);
  merged.draft_client_updated_at = backup.updatedAt;
  if (backup.translationId) merged.bible_version = String(backup.translationId);
  merged.bible_ref = backup.mode === "sunday"
    ? buildSundayBibleRef(backup)
    : backup.bibleRef;
  merged.key_verse = backup.keyVerse;
  merged.opening_prayer = isFree ? "" : (backup.answers.opening_prayer ?? "");
  merged.summary = isFree ? "" : (backup.answers.summary ?? "");
  merged.meditation = isFree ? backup.freeText : (backup.answers.meditation ?? "");
  merged.application = isFree ? "" : (backup.answers.application ?? "");
  merged.decision = backup.decisions.filter(item => item.trim()).join("\n");
  merged.closing_prayer = isFree ? "" : (backup.answers.closing_prayer ?? "");

  return merged as T;
}

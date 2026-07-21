"use client";

import { storageGetJson, storageRemove, storageSetJson } from "@/lib/clientStorage";

export type QTDraftBackupMode = "6step" | "sunday" | "free";

export type QTDraftBackup = {
  userId: string;
  date: string;
  mode: QTDraftBackupMode;
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

  return {
    userId,
    date,
    mode,
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

export function saveQTDraftBackup(backup: QTDraftBackup) {
  if (!hasMeaningfulQTDraftBackup(backup)) return;
  storageSetJson(backupKey(backup.userId, backup.date), backup);
}

export function removeQTDraftBackup(userId: string, date: string) {
  storageRemove(backupKey(userId, date));
}

export function mergeQtDraftRowWithBackup<T extends Record<string, unknown>>(draft: T, backup: QTDraftBackup | null): T {
  if (!backup) return draft;
  const merged: Record<string, unknown> = { ...draft };

  const useLonger = (column: string, backupValue: string) => {
    const saved = String(merged[column] ?? "");
    if (backupValue.trim().length > saved.trim().length) {
      merged[column] = backupValue;
    }
  };

  useLonger("bible_ref", backup.bibleRef);
  useLonger("key_verse", backup.keyVerse);
  useLonger("opening_prayer", backup.answers.opening_prayer ?? "");
  useLonger("summary", backup.answers.summary ?? "");
  useLonger("meditation", backup.mode === "free" ? backup.freeText : (backup.answers.meditation ?? ""));
  useLonger("application", backup.answers.application ?? "");
  useLonger("closing_prayer", backup.answers.closing_prayer ?? "");

  const backupDecision = backup.decisions.filter(item => item.trim()).join("\n");
  useLonger("decision", backupDecision);

  if (backup.mode === "sunday" && backup.sermonTitle.trim()) {
    const currentRef = String(merged.bible_ref ?? "");
    if (!currentRef.trim() || currentRef.startsWith("설교:")) {
      const refs = Array.from(new Set([backup.bibleRef, ...backup.passageRefs].map(ref => ref.trim()).filter(Boolean)));
      merged.bible_ref = refs.length > 0
        ? `설교: ${backup.sermonTitle.trim()} (${refs.join(", ")})`
        : `설교: ${backup.sermonTitle.trim()}`;
    }
  }

  if (backup.mode && !merged.qt_mode) merged.qt_mode = backup.mode;
  if (Number.isFinite(backup.currentStep) && backup.currentStep > Number(merged.current_step ?? 0)) {
    merged.current_step = backup.currentStep;
  }

  return merged as T;
}

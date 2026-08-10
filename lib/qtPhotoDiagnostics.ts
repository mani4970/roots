"use client";

import { Capacitor } from "@capacitor/core";
import { storageGetJson, storageSetJson } from "@/lib/clientStorage";
import { createClient } from "@/lib/supabase";

const PENDING_KEY = "roots_qt_photo_diagnostics_pending_v2";
const MAX_PENDING = 30;

type SupabaseBrowserClient = ReturnType<typeof createClient>;

export type QTPhotoSource = "camera" | "gallery" | "web-file" | "existing" | "unknown";
export type QTPhotoDiagnosticOperation = "create" | "edit";
export type QTPhotoDiagnosticStatus = "started" | "ok" | "warning" | "failed";

export type QTPhotoDiagnosticInput = {
  attemptId: string;
  targetDate: string;
  operation: QTPhotoDiagnosticOperation;
  stage: string;
  status: QTPhotoDiagnosticStatus;
  photoSource?: QTPhotoSource | null;
  mimeType?: string | null;
  fileSize?: number | null;
  width?: number | null;
  height?: number | null;
  wasTransformed?: boolean | null;
  storagePath?: string | null;
  qtRecordId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
};

type PendingDiagnostic = QTPhotoDiagnosticInput & {
  userId?: string | null;
  clientKind: string;
  online: boolean | null;
  updatedAt: string;
};

const attemptChains = new Map<string, Promise<void>>();

function getClientKind() {
  if (Capacitor.isNativePlatform()) return `native-${Capacitor.getPlatform()}`;
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return "web-android";
  if (/iphone|ipad|ipod/.test(ua)) return "web-ios";
  return "web-desktop";
}

function getOnlineState() {
  if (typeof navigator === "undefined" || typeof navigator.onLine !== "boolean") return null;
  return navigator.onLine;
}

function sanitizeText(value: unknown, maxLength = 500) {
  return String(value ?? "")
    .replace(/([?&](?:token|access_token|refresh_token|apikey|api_key)=)[^&\s]+/gi, "$1[redacted]")
    .replace(/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, "[redacted-jwt]")
    .replace(/(?:Bearer\s+)[A-Za-z0-9._~-]+/gi, "Bearer [redacted]")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength) || null;
}

function sanitizeMetadata(value: Record<string, unknown> | null | undefined) {
  if (!value) return null;
  try {
    const encoded = JSON.stringify(value);
    if (encoded.length <= 2_000) return JSON.parse(encoded) as Record<string, unknown>;
    return { truncated: true };
  } catch {
    return { invalid: true };
  }
}

function readPending() {
  return storageGetJson<PendingDiagnostic[]>(PENDING_KEY, []);
}

function writePending(rows: PendingDiagnostic[]) {
  storageSetJson(PENDING_KEY, rows.slice(-MAX_PENDING));
}

function queuePending(row: PendingDiagnostic) {
  const rows = readPending().filter(item => item.attemptId !== row.attemptId);
  rows.push(row);
  writePending(rows);
}

function removePending(attemptId: string) {
  writePending(readPending().filter(item => item.attemptId !== attemptId));
}

function bindPendingUser(attemptId: string, userId: string) {
  writePending(readPending().map(item =>
    item.attemptId === attemptId ? { ...item, userId } : item
  ));
}

export function createQTPhotoAttemptId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, character => {
    const random = Math.floor(Math.random() * 16);
    return (character === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}

async function getSessionUserId(supabase: SupabaseBrowserClient) {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

function toDatabaseRow(row: PendingDiagnostic, userId: string) {
  return {
    attempt_id: row.attemptId,
    user_id: userId,
    record_date: row.targetDate,
    operation: row.operation,
    stage: sanitizeText(row.stage, 80) ?? "unknown",
    status: row.status,
    client_kind: row.clientKind,
    photo_source: row.photoSource ?? null,
    online: row.online,
    mime_type: sanitizeText(row.mimeType, 120),
    file_size: Number.isFinite(row.fileSize) ? row.fileSize : null,
    width: Number.isFinite(row.width) ? row.width : null,
    height: Number.isFinite(row.height) ? row.height : null,
    was_transformed: typeof row.wasTransformed === "boolean" ? row.wasTransformed : null,
    storage_path: sanitizeText(row.storagePath, 500),
    qt_record_id: row.qtRecordId ?? null,
    error_code: sanitizeText(row.errorCode, 120),
    error_message: sanitizeText(row.errorMessage, 500),
    metadata: sanitizeMetadata(row.metadata),
    updated_at: row.updatedAt,
  };
}

async function sendDiagnostic(
  supabase: SupabaseBrowserClient,
  row: PendingDiagnostic,
  explicitUserId?: string | null,
) {
  const userId = explicitUserId ?? row.userId ?? await getSessionUserId(supabase);
  if (!userId) return false;

  const { error } = await supabase
    .from("qt_photo_save_attempts")
    .upsert(toDatabaseRow(row, userId), { onConflict: "attempt_id" });
  return !error;
}

export async function flushQTPhotoDiagnostics(supabase = createClient()) {
  const rows = readPending();
  if (rows.length === 0) return;
  const userId = await getSessionUserId(supabase);
  if (!userId) return;

  const remaining: PendingDiagnostic[] = [];
  for (const row of rows) {
    // Never attribute an unbound diagnostic to whichever account happens to
    // log in later on the same device. Normal signed-in attempts are bound in
    // persistDiagnostic as soon as getSession returns the current user.
    if (!row.userId || row.userId !== userId) {
      remaining.push(row);
      continue;
    }
    try {
      const sent = await sendDiagnostic(supabase, row, userId);
      if (!sent) remaining.push(row);
    } catch {
      remaining.push(row);
    }
  }
  writePending(remaining);
}

async function persistDiagnostic(row: PendingDiagnostic) {
  const supabase = createClient();
  try {
    const userId = row.userId ?? await getSessionUserId(supabase);
    if (!userId) return;
    bindPendingUser(row.attemptId, userId);
    const boundRow = { ...row, userId };
    const sent = await sendDiagnostic(supabase, boundRow, userId);
    if (sent) {
      // Do not remove a newer locally queued stage for the same attempt.
      const current = readPending().find(item => item.attemptId === row.attemptId);
      if (!current || current.updatedAt === row.updatedAt) removePending(row.attemptId);
    }
  } catch {
    // The row was queued before this attempt and will be retried later.
  }
}

/**
 * Records a content-free diagnostic stage. This is intentionally fire-and-
 * forget so diagnostics can never block a user's save operation.
 */
export function recordQTPhotoDiagnostic(input: QTPhotoDiagnosticInput) {
  const row: PendingDiagnostic = {
    ...input,
    errorCode: sanitizeText(input.errorCode, 120),
    errorMessage: sanitizeText(input.errorMessage, 500),
    metadata: sanitizeMetadata(input.metadata),
    clientKind: getClientKind(),
    online: getOnlineState(),
    updatedAt: new Date().toISOString(),
  };

  queuePending(row);
  const previous = attemptChains.get(row.attemptId) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(() => persistDiagnostic(row))
    .catch(() => undefined);
  attemptChains.set(row.attemptId, next);
  void next.then(() => {
    if (attemptChains.get(row.attemptId) === next) attemptChains.delete(row.attemptId);
  });
}

export function getQTPhotoDiagnosticError(error: unknown) {
  const objectValue = error && typeof error === "object"
    ? error as { code?: unknown; status?: unknown; statusCode?: unknown; name?: unknown; message?: unknown }
    : null;
  const code = sanitizeText(
    objectValue?.code ?? objectValue?.statusCode ?? objectValue?.status ?? objectValue?.name ?? "unknown",
    120,
  );
  const message = sanitizeText(
    error instanceof Error ? error.message : objectValue?.message ?? error,
    500,
  );
  return {
    errorCode: code,
    errorMessage: message,
  };
}

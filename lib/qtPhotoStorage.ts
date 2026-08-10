"use client";

import { createClient } from "@/lib/supabase";
import { verifyQTPhotoBlob, type PreparedQTPhoto } from "@/lib/qtPhotoProcessing";

const PHOTO_BUCKET = "qt-photos";
const RETRY_DELAYS_MS = [0, 450, 1200] as const;
const STORAGE_REQUEST_TIMEOUT_MS = 25_000;

type SupabaseBrowserClient = ReturnType<typeof createClient>;
type SupabaseResult<T> = { data: T; error: unknown };

export type QTPhotoStorageErrorCode =
  | "upload_failed"
  | "upload_verification_failed";

export class QTPhotoStorageError extends Error {
  readonly code: QTPhotoStorageErrorCode;
  readonly causeValue: unknown;

  constructor(code: QTPhotoStorageErrorCode, message?: string, causeValue?: unknown) {
    super(message ?? code);
    this.name = "QTPhotoStorageError";
    this.code = code;
    this.causeValue = causeValue;
  }
}

function wait(ms: number) {
  if (ms <= 0) return Promise.resolve();
  return new Promise<void>(resolve => window.setTimeout(resolve, ms));
}

function withTimeout<T>(operation: PromiseLike<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error(`${label} timed out`)),
      STORAGE_REQUEST_TIMEOUT_MS,
    );
    Promise.resolve(operation).then(
      value => {
        window.clearTimeout(timer);
        resolve(value);
      },
      error => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function readStatus(error: unknown) {
  if (!error || typeof error !== "object") return 0;
  const value = error as { status?: unknown; statusCode?: unknown; code?: unknown };
  const candidate = Number(value.status ?? value.statusCode ?? value.code ?? 0);
  return Number.isFinite(candidate) ? candidate : 0;
}

function readCode(error: unknown) {
  if (!error || typeof error !== "object") return "";
  const value = error as { code?: unknown; error?: unknown; name?: unknown };
  return String(value.code ?? value.error ?? value.name ?? "").toLowerCase();
}

function readMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "");
  }
  return String(error ?? "");
}

function isTransientError(error: unknown) {
  const status = readStatus(error);
  if (status === 0 || status === 408 || status === 409 || status === 425 || status === 429 || status >= 500) {
    return true;
  }
  const text = `${readCode(error)} ${readMessage(error)}`.toLowerCase();
  return /network|fetch|timeout|timed out|connection|offline|load failed|failed to fetch|abort/.test(text);
}

function isAuthError(error: unknown) {
  const status = readStatus(error);
  if (status === 401 || status === 403) return true;
  const text = `${readCode(error)} ${readMessage(error)}`.toLowerCase();
  return /jwt|token|not authenticated|auth session missing|refresh_token/.test(text);
}

async function refreshSessionBestEffort(supabase: SupabaseBrowserClient) {
  try {
    await supabase.auth.refreshSession();
  } catch {
    // The next Storage request will expose an actionable error when refresh fails.
  }
}

async function verifyStoredPhoto(
  supabase: SupabaseBrowserClient,
  path: string,
  photo: PreparedQTPhoto,
) {
  const { data, error } = await withTimeout(
    supabase.storage.from(PHOTO_BUCKET).download(path) as unknown as PromiseLike<SupabaseResult<Blob | null>>,
    "photo download verification",
  );
  if (error || !data) throw error ?? new Error("uploaded photo could not be downloaded");

  if (data.size !== photo.blob.size) {
    throw new QTPhotoStorageError(
      "upload_verification_failed",
      `uploaded photo size mismatch (${data.size} != ${photo.blob.size})`,
    );
  }

  // Direct uploads preserve the exact bytes already decoded for the preview.
  // On some Android browsers a second decode of the same valid file can fail
  // because of transient memory pressure, so exact byte-size verification is
  // sufficient for direct uploads. Canvas-generated files receive the stronger
  // black/blank pixel check again after their Storage round-trip.
  if (photo.wasTransformed) {
    await verifyQTPhotoBlob(data, { checkPixels: true });
  }

  return data;
}

/**
 * Uploads a photo to one deterministic path and verifies the committed bytes.
 * A lost mobile response is recovered by downloading that same path before a
 * retry. This function deliberately never deletes an ambiguous object: an
 * orphan is safer than deleting a photo that may already be linked to a row.
 */
export async function uploadQTPhotoDurably(
  supabase: SupabaseBrowserClient,
  path: string,
  photo: PreparedQTPhoto,
  onAttempt?: (attemptNumber: number) => void | Promise<void>,
) {
  let lastUploadError: unknown = null;
  let lastVerificationError: unknown = null;

  for (let index = 0; index < RETRY_DELAYS_MS.length; index += 1) {
    await wait(RETRY_DELAYS_MS[index]);
    await onAttempt?.(index + 1);

    let uploadError: unknown = null;
    try {
      const result = await withTimeout(
        supabase.storage.from(PHOTO_BUCKET).upload(path, photo.blob, {
          contentType: photo.contentType,
          cacheControl: "3600",
          upsert: true,
        }) as unknown as PromiseLike<SupabaseResult<unknown>>,
        "photo upload",
      );
      uploadError = result.error;
    } catch (error) {
      uploadError = error;
    }
    lastUploadError = uploadError;

    if (uploadError && isAuthError(uploadError)) {
      await refreshSessionBestEffort(supabase);
    }

    try {
      await verifyStoredPhoto(supabase, path, photo);
      return { path };
    } catch (verificationError) {
      lastVerificationError = verificationError;
      if (isAuthError(verificationError)) {
        await refreshSessionBestEffort(supabase);
      }
    }

    const retryReason = uploadError ?? lastVerificationError;
    const shouldRetry = isTransientError(retryReason)
      || isAuthError(uploadError)
      || isAuthError(lastVerificationError);
    if (index === RETRY_DELAYS_MS.length - 1 || !shouldRetry) break;
  }

  if (lastVerificationError instanceof QTPhotoStorageError) throw lastVerificationError;

  const verificationMessage = readMessage(lastVerificationError);
  const uploadMessage = readMessage(lastUploadError);
  const verificationFailed = /size mismatch|decode|blank|black|stored_too_large/i.test(verificationMessage);
  const code: QTPhotoStorageErrorCode = verificationFailed
    ? "upload_verification_failed"
    : "upload_failed";
  const cause = lastUploadError ?? lastVerificationError;
  throw new QTPhotoStorageError(code, uploadMessage || verificationMessage || code, cause);
}

export async function removeQTPhotoBestEffort(
  supabase: SupabaseBrowserClient,
  path: string | null | undefined,
) {
  if (!path) return;
  try {
    const { error } = await supabase.storage.from(PHOTO_BUCKET).remove([path]);
    if (error) console.warn("qt photo cleanup failed", error);
  } catch (error) {
    console.warn("qt photo cleanup failed", error);
  }
}

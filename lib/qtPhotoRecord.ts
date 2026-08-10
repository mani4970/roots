"use client";

import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";

type SupabaseBrowserClient = ReturnType<typeof createClient>;
type SupabaseResult<T> = { data: T; error: unknown };
type SessionRefreshData = { session: { user: User } | null };
type AuthUserData = { user: User | null };

export type QTPhotoRecordRow = {
  id: string;
  user_id: string;
  date: string;
  qt_mode: string | null;
  reflection_type: string;
  bible_ref: string | null;
  bible_version: string | null;
  meditation: string | null;
  photo_caption: string | null;
  photo_path: string | null;
  photo_url: string | null;
  visibility: string | null;
  is_draft: boolean | null;
};

export type QTPhotoRecordErrorCode =
  | "auth_failed"
  | "load_failed"
  | "not_owned_photo_record"
  | "duplicate_completed"
  | "insert_failed"
  | "insert_verification_failed"
  | "update_failed"
  | "update_verification_failed";

export class QTPhotoRecordError extends Error {
  readonly code: QTPhotoRecordErrorCode;
  readonly causeValue: unknown;

  constructor(code: QTPhotoRecordErrorCode, message?: string, causeValue?: unknown) {
    super(message ?? code);
    this.name = "QTPhotoRecordError";
    this.code = code;
    this.causeValue = causeValue;
  }
}

export type NewQTPhotoRecord = {
  id?: string;
  user_id: string;
  date: string;
  qt_mode: "photo";
  reflection_type: "photo";
  bible_ref: string;
  bible_version: string;
  meditation: string;
  photo_caption: string;
  photo_path: string;
  photo_url: null;
  visibility: string;
  is_draft: false;
};

export type QTPhotoRecordPatch = Partial<Pick<QTPhotoRecordRow,
  | "bible_ref"
  | "bible_version"
  | "meditation"
  | "photo_caption"
  | "photo_path"
  | "photo_url"
>>;

const RECORD_COLUMNS = "id,user_id,date,qt_mode,reflection_type,bible_ref,bible_version,meditation,photo_caption,photo_path,photo_url,visibility,is_draft";
const RETRY_DELAYS_MS = [0, 450, 1100] as const;
const DATABASE_REQUEST_TIMEOUT_MS = 20_000;

function wait(ms: number) {
  if (ms <= 0) return Promise.resolve();
  return new Promise<void>(resolve => window.setTimeout(resolve, ms));
}

function withTimeout<T>(operation: PromiseLike<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error(`${label} timed out`)),
      DATABASE_REQUEST_TIMEOUT_MS,
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

function createClientUuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, character => {
    const random = Math.floor(Math.random() * 16);
    return (character === "x" ? random : (random & 0x3) | 0x8).toString(16);
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
  return String((error as { code?: unknown }).code ?? "");
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
  return /network|fetch|timeout|timed out|connection|offline|load failed|failed to fetch|abort/i.test(readMessage(error));
}

function isAuthError(error: unknown) {
  const status = readStatus(error);
  if (status === 401 || status === 403) return true;
  return /jwt|token|not authenticated|auth session missing|refresh_token/i.test(`${readCode(error)} ${readMessage(error)}`);
}

async function refreshSessionBestEffort(supabase: SupabaseBrowserClient) {
  try {
    const { data, error } = await withTimeout(
      supabase.auth.refreshSession() as unknown as PromiseLike<SupabaseResult<SessionRefreshData>>,
      "photo session refresh",
    );
    if (!error && data.session?.user) return data.session.user;
  } catch {
    // Fallback handled by getUser below.
  }
  return null;
}

/** Uses the locally persisted session first, then refreshes/falls back to a server check. */
export async function getQTPhotoAuthenticatedUser(supabase: SupabaseBrowserClient): Promise<User> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (session?.user) {
      const expiryMs = Number(session.expires_at ?? 0) * 1000;
      if (!expiryMs || expiryMs > Date.now() + 60_000) return session.user;
      const refreshed = await refreshSessionBestEffort(supabase);
      if (refreshed) return refreshed;
      // The old access token may still be accepted briefly; getUser gives the
      // authoritative result before we reject the user's save attempt.
    } else if (sessionError) {
      const refreshed = await refreshSessionBestEffort(supabase);
      if (refreshed) return refreshed;
    }

    const { data, error } = await withTimeout(
      supabase.auth.getUser() as unknown as PromiseLike<SupabaseResult<AuthUserData>>,
      "photo user verification",
    );
    if (error || !data.user) {
      throw new QTPhotoRecordError("auth_failed", readMessage(error) || "not authenticated", error);
    }
    return data.user;
  } catch (error) {
    if (error instanceof QTPhotoRecordError) throw error;
    throw new QTPhotoRecordError("auth_failed", readMessage(error) || "not authenticated", error);
  }
}

async function readOwnedRecord(
  supabase: SupabaseBrowserClient,
  recordId: string,
  userId: string,
): Promise<QTPhotoRecordRow | null> {
  const { data, error } = await withTimeout(
    supabase
      .from("qt_records")
      .select(RECORD_COLUMNS)
      .eq("id", recordId)
      .eq("user_id", userId)
      .maybeSingle() as unknown as PromiseLike<SupabaseResult<QTPhotoRecordRow | null>>,
    "photo record verification",
  );
  if (error) throw error;
  return data as QTPhotoRecordRow | null;
}

async function readCompletedRecordForDate(
  supabase: SupabaseBrowserClient,
  userId: string,
  date: string,
): Promise<QTPhotoRecordRow | null> {
  const { data, error } = await withTimeout(
    supabase
      .from("qt_records")
      .select(RECORD_COLUMNS)
      .eq("user_id", userId)
      .eq("date", date)
      .eq("is_draft", false)
      .limit(1)
      .maybeSingle() as unknown as PromiseLike<SupabaseResult<QTPhotoRecordRow | null>>,
    "completed photo record lookup",
  );
  if (error) throw error;
  return data as QTPhotoRecordRow | null;
}


export async function findCompletedQTRecordForDate(
  supabase: SupabaseBrowserClient,
  userId: string,
  date: string,
) {
  try {
    return await readCompletedRecordForDate(supabase, userId, date);
  } catch (error) {
    throw new QTPhotoRecordError("load_failed", readMessage(error) || "completed record lookup failed", error);
  }
}

function isOwnedPhotoRecord(record: QTPhotoRecordRow | null, userId: string) {
  return Boolean(
    record &&
    record.user_id === userId &&
    record.is_draft === false &&
    (record.reflection_type === "photo" || record.qt_mode === "photo"),
  );
}

export async function loadOwnedQTPhotoRecord(
  supabase: SupabaseBrowserClient,
  recordId: string,
  userId: string,
) {
  try {
    const record = await readOwnedRecord(supabase, recordId, userId);
    if (!isOwnedPhotoRecord(record, userId)) {
      throw new QTPhotoRecordError("not_owned_photo_record", "not an owned photo record");
    }
    return record!;
  } catch (error) {
    if (error instanceof QTPhotoRecordError) throw error;
    throw new QTPhotoRecordError("load_failed", readMessage(error) || "record load failed", error);
  }
}

function insertedRecordMatches(record: QTPhotoRecordRow | null, expected: NewQTPhotoRecord & { id: string }) {
  return Boolean(
    record &&
    record.id === expected.id &&
    record.user_id === expected.user_id &&
    record.date === expected.date &&
    record.is_draft === false &&
    record.reflection_type === "photo" &&
    record.qt_mode === "photo" &&
    record.photo_path === expected.photo_path,
  );
}

export async function insertQTPhotoRecordDurably(
  supabase: SupabaseBrowserClient,
  input: NewQTPhotoRecord,
) {
  const values: NewQTPhotoRecord & { id: string } = {
    ...input,
    id: input.id ?? createClientUuid(),
  };
  let lastError: unknown = null;
  let verificationFailed = false;

  for (let index = 0; index < RETRY_DELAYS_MS.length; index += 1) {
    await wait(RETRY_DELAYS_MS[index]);

    try {
      const alreadyCommitted = await readOwnedRecord(supabase, values.id, values.user_id);
      if (insertedRecordMatches(alreadyCommitted, values)) return alreadyCommitted!;
    } catch (readError) {
      lastError = readError;
      if (isAuthError(readError)) await refreshSessionBestEffort(supabase);
    }

    let data: unknown = null;
    let error: unknown = null;
    try {
      const result = await withTimeout(
        supabase
          .from("qt_records")
          .insert(values)
          .select(RECORD_COLUMNS)
          .maybeSingle() as unknown as PromiseLike<SupabaseResult<QTPhotoRecordRow | null>>,
        "photo record insert",
      );
      data = result.data;
      error = result.error;
    } catch (requestError) {
      error = requestError;
    }

    if (!error && insertedRecordMatches(data as QTPhotoRecordRow | null, values)) {
      return data as QTPhotoRecordRow;
    }

    lastError = error ?? new Error("photo record insert response did not match");
    verificationFailed = !error;
    if (isAuthError(error)) await refreshSessionBestEffort(supabase);

    // The database may have committed while the mobile response was lost.
    try {
      const recoveredById = await readOwnedRecord(supabase, values.id, values.user_id);
      if (insertedRecordMatches(recoveredById, values)) return recoveredById!;

      const recoveredByDate = await readCompletedRecordForDate(supabase, values.user_id, values.date);
      if (recoveredByDate?.photo_path === values.photo_path && isOwnedPhotoRecord(recoveredByDate, values.user_id)) {
        return recoveredByDate;
      }
      if (readCode(error) === "23505" || recoveredByDate) {
        throw new QTPhotoRecordError("duplicate_completed", "completed reflection already exists", error);
      }
    } catch (verificationError) {
      if (verificationError instanceof QTPhotoRecordError) throw verificationError;
      lastError = verificationError;
      verificationFailed = true;
      if (isAuthError(verificationError)) await refreshSessionBestEffort(supabase);
    }

    const shouldRetry = isTransientError(lastError) || isAuthError(lastError) || isAuthError(error);
    if (index === RETRY_DELAYS_MS.length - 1 || !shouldRetry) break;
  }

  const code: QTPhotoRecordErrorCode = verificationFailed
    ? "insert_verification_failed"
    : "insert_failed";
  throw new QTPhotoRecordError(code, readMessage(lastError) || code, lastError);
}

function normalizeComparable(value: unknown) {
  return value === undefined ? undefined : value === null ? null : String(value);
}

function recordMatchesPatch(record: QTPhotoRecordRow | null, patch: QTPhotoRecordPatch) {
  if (!record) return false;
  return Object.entries(patch).every(([key, expected]) => {
    if (expected === undefined) return true;
    const actual = (record as unknown as Record<string, unknown>)[key];
    return normalizeComparable(actual) === normalizeComparable(expected);
  });
}

export async function updateQTPhotoRecordDurably(
  supabase: SupabaseBrowserClient,
  recordId: string,
  userId: string,
  patch: QTPhotoRecordPatch,
) {
  let lastError: unknown = null;
  let verificationFailed = false;

  for (let index = 0; index < RETRY_DELAYS_MS.length; index += 1) {
    await wait(RETRY_DELAYS_MS[index]);

    let data: unknown = null;
    let error: unknown = null;
    try {
      const result = await withTimeout(
        supabase
          .from("qt_records")
          .update(patch)
          .eq("id", recordId)
          .eq("user_id", userId)
          .eq("is_draft", false)
          .select(RECORD_COLUMNS)
          .maybeSingle() as unknown as PromiseLike<SupabaseResult<QTPhotoRecordRow | null>>,
        "photo record update",
      );
      data = result.data;
      error = result.error;
    } catch (requestError) {
      error = requestError;
    }

    if (!error && isOwnedPhotoRecord(data as QTPhotoRecordRow | null, userId) && recordMatchesPatch(data as QTPhotoRecordRow, patch)) {
      return data as QTPhotoRecordRow;
    }

    lastError = error ?? new Error("photo record update response did not match");
    verificationFailed = !error;
    if (isAuthError(error)) await refreshSessionBestEffort(supabase);

    try {
      const recovered = await readOwnedRecord(supabase, recordId, userId);
      if (isOwnedPhotoRecord(recovered, userId) && recordMatchesPatch(recovered, patch)) return recovered!;
    } catch (verificationError) {
      lastError = verificationError;
      verificationFailed = true;
      if (isAuthError(verificationError)) await refreshSessionBestEffort(supabase);
    }

    const shouldRetry = isTransientError(lastError) || isAuthError(lastError) || isAuthError(error);
    if (index === RETRY_DELAYS_MS.length - 1 || !shouldRetry) break;
  }

  const code: QTPhotoRecordErrorCode = verificationFailed
    ? "update_verification_failed"
    : "update_failed";
  throw new QTPhotoRecordError(code, readMessage(lastError) || code, lastError);
}

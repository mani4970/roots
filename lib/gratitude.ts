import { createClient } from "@/lib/supabase";

export const MAX_GRATITUDE_ITEMS = 50;
export const MAX_GRATITUDE_ITEM_LENGTH = 2000;
export const GRATITUDE_PAGE_SIZE = 20;

export type GratitudeEntry = {
  id: string;
  user_id: string;
  entry_date: string;
  items: string[];
  revision: number;
  created_at: string;
  updated_at: string;
};

export type GratitudeErrorCode = "load" | "save" | "conflict" | "auth" | "invalid" | "delete";

export class GratitudeError extends Error {
  readonly code: GratitudeErrorCode;

  constructor(code: GratitudeErrorCode) {
    // Never include a gratitude item or a database error payload in diagnostics.
    super(`Gratitude ${code}`);
    this.name = "GratitudeError";
    this.code = code;
  }
}

const COLUMNS = "id,user_id,entry_date,items,revision,created_at,updated_at";
const REQUEST_TIMEOUT_MS = 12_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

function validateKey(userId: string, date: string) {
  if (!UUID.test(userId) || !validDate(date)) throw new GratitudeError("invalid");
}

function normalizedItems(items: string[]): string[] {
  if (!Array.isArray(items) || items.length > MAX_GRATITUDE_ITEMS || items.some(item => typeof item !== "string")) {
    throw new GratitudeError("invalid");
  }
  const result = items.map(item => item.trim()).filter(Boolean);
  if (!result.length || result.some(item => item.length > MAX_GRATITUDE_ITEM_LENGTH)) {
    throw new GratitudeError("invalid");
  }
  return result;
}

function readEntry(value: unknown, userId: string): GratitudeEntry {
  const entry = value as GratitudeEntry | null;
  if (!entry || !UUID.test(entry.id) || entry.user_id !== userId || !validDate(entry.entry_date)
    || !Array.isArray(entry.items) || !entry.items.length || entry.items.length > MAX_GRATITUDE_ITEMS
    || entry.items.some(item => typeof item !== "string" || !item.trim() || item.length > MAX_GRATITUDE_ITEM_LENGTH)
    || !Number.isSafeInteger(entry.revision) || entry.revision < 1
    || typeof entry.created_at !== "string" || !Number.isFinite(Date.parse(entry.created_at))
    || typeof entry.updated_at !== "string" || !Number.isFinite(Date.parse(entry.updated_at))) {
    throw new GratitudeError("load");
  }
  return { ...entry, items: [...entry.items] };
}

function failure(error: unknown, operation: "load" | "save" | "delete"): GratitudeError {
  if (error instanceof GratitudeError) return error;
  const code = (error as { code?: unknown } | null)?.code;
  if (code === "23505") return new GratitudeError("conflict");
  if (code === "PGRST301" || code === "PGRST302" || code === "PGRST303") return new GratitudeError("auth");
  return new GratitudeError(operation);
}

async function withOwner<T>(
  userId: string,
  operation: "load" | "save" | "delete",
  action: (client: ReturnType<typeof createClient>, signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new GratitudeError(operation));
    }, REQUEST_TIMEOUT_MS);
  });
  try {
    const client = createClient();
    const work = async () => {
      // This is an account-switch guard, not an authorization decision. The
      // authenticated request and owner-only database RLS authorize every row.
      const { data, error } = await client.auth.getSession();
      if (controller.signal.aborted) throw new GratitudeError(operation);
      if (error || data.session?.user.id !== userId) throw new GratitudeError("auth");
      return action(client, controller.signal);
    };
    return await Promise.race([work(), deadline]);
  } catch (error) {
    throw failure(error, operation);
  } finally {
    clearTimeout(timer);
  }
}

export async function getGratitudeEntry(userId: string, entryDate: string): Promise<GratitudeEntry | null> {
  validateKey(userId, entryDate);
  return withOwner(userId, "load", async (client, signal) => {
    const { data, error } = await client.from("gratitude_entries").select(COLUMNS)
      .eq("user_id", userId).eq("entry_date", entryDate).abortSignal(signal).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const entry = readEntry(data, userId);
    if (entry.entry_date !== entryDate) throw new GratitudeError("load");
    return entry;
  });
}

export async function listGratitudeEntries(
  userId: string, beforeDate: string, pageSize = GRATITUDE_PAGE_SIZE,
): Promise<GratitudeEntry[]> {
  validateKey(userId, beforeDate);
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) throw new GratitudeError("invalid");
  return withOwner(userId, "load", async (client, signal) => {
    const { data, error } = await client.from("gratitude_entries").select(COLUMNS)
      .eq("user_id", userId).lt("entry_date", beforeDate)
      .order("entry_date", { ascending: false }).limit(pageSize).abortSignal(signal);
    if (error) throw error;
    if (!Array.isArray(data)) throw new GratitudeError("load");
    const entries = data.map(row => readEntry(row, userId));
    if (entries.some((entry, index) => entry.entry_date >= beforeDate
      || (index > 0 && entries[index - 1].entry_date <= entry.entry_date))) throw new GratitudeError("load");
    return entries;
  });
}

export async function saveGratitudeEntry(
  userId: string, entryDate: string, items: string[], previous: GratitudeEntry | null,
): Promise<GratitudeEntry> {
  validateKey(userId, entryDate);
  const normalized = normalizedItems(items);
  if (previous && (previous.user_id !== userId || previous.entry_date !== entryDate
    || !UUID.test(previous.id) || !Number.isSafeInteger(previous.revision) || previous.revision < 1)) {
    throw new GratitudeError("invalid");
  }
  return withOwner(userId, "save", async (client, signal) => {
    // Do not upsert: stale tabs/devices must never silently replace a newer day.
    const query = previous
      ? client.from("gratitude_entries").update({ items: normalized })
        .eq("user_id", userId).eq("id", previous.id).eq("entry_date", entryDate).eq("revision", previous.revision)
      : client.from("gratitude_entries").insert({ user_id: userId, entry_date: entryDate, items: normalized });
    const { data, error } = await query.select(COLUMNS).abortSignal(signal).maybeSingle();
    if (error) throw error;
    if (!data) throw new GratitudeError("conflict");
    const entry = readEntry(data, userId);
    if (entry.entry_date !== entryDate) throw new GratitudeError("save");
    return entry;
  });
}

export async function deleteGratitudeEntry(userId: string, entry: GratitudeEntry): Promise<void> {
  validateKey(userId, entry.entry_date);
  if (entry.user_id !== userId || !UUID.test(entry.id)
    || !Number.isSafeInteger(entry.revision) || entry.revision < 1) throw new GratitudeError("invalid");
  return withOwner(userId, "delete", async (client, signal) => {
    const { data, error } = await client.from("gratitude_entries").delete()
      .eq("user_id", userId).eq("id", entry.id).eq("revision", entry.revision)
      .select("id").abortSignal(signal).maybeSingle();
    if (error) throw error;
    if (!data || data.id !== entry.id) throw new GratitudeError("conflict");
  });
}

import type { SupabaseClient } from "@supabase/supabase-js";

const SYNC_TIMEOUT_MS = 20_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RecipientRow = { id: string; recipient_id: string };

function normalizedUuid(value: unknown): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new Error("Invalid Bible Reflection sharing identifier");
  }
  return value.toLowerCase();
}

/**
 * Reconcile a saved reflection with one frozen completion-sharing intent.
 * Retrying that same intent never removes its desired recipients. This does
 * not serialize different sharing choices made from other tabs or devices.
 */
export async function syncQtCompletionRecipients(
  supabase: SupabaseClient,
  recordId: string,
  ownerId: string,
  recipientIds: string[],
): Promise<void> {
  const record = normalizedUuid(recordId);
  const owner = normalizedUuid(ownerId);
  const desired = new Set(recipientIds.map(normalizedUuid));
  const controller = new AbortController();
  const timeoutError = new Error("Bible Reflection sharing confirmation timed out");

  const checkActive = () => {
    // Some transports may deliver a response after abort. Never start another
    // write from an expired attempt, even when that transport ignores abort.
    if (controller.signal.aborted) throw timeoutError;
  };

  const readRecipients = async (): Promise<RecipientRow[]> => {
    checkActive();
    const { data, error, count } = await supabase
      .from("qt_record_recipients")
      .select("id,recipient_id", { count: "exact" })
      .eq("qt_record_id", record)
      .eq("owner_id", owner)
      .abortSignal(controller.signal);
    checkActive();
    if (error) throw error;
    if (!Array.isArray(data) || (typeof count === "number" && count !== data.length)) {
      throw new Error("Could not confirm the complete Bible Reflection recipient list");
    }
    return data.map(row => ({
      id: normalizedUuid(row.id),
      recipient_id: normalizedUuid(row.recipient_id),
    }));
  };

  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(timeoutError);
    }, SYNC_TIMEOUT_MS);
  });

  const operation = async () => {
    const existing = await readRecipients();
    const unwantedRowIds = existing
      .filter(row => !desired.has(row.recipient_id))
      .map(row => row.id);
    const present = new Set(existing.map(row => row.recipient_id));
    const missing = Array.from(desired).filter(id => !present.has(id));
    if (unwantedRowIds.length === 0 && missing.length === 0) return;

    if (unwantedRowIds.length > 0) {
      checkActive();
      const { error } = await supabase
        .from("qt_record_recipients")
        .delete()
        .eq("qt_record_id", record)
        .eq("owner_id", owner)
        .in("id", unwantedRowIds)
        .abortSignal(controller.signal);
      checkActive();
      if (error) throw error;
    }

    if (missing.length > 0) {
      checkActive();
      const { error } = await supabase
        .from("qt_record_recipients")
        .upsert(missing.map(recipientId => ({
          qt_record_id: record,
          owner_id: owner,
          recipient_id: recipientId,
        })), { onConflict: "qt_record_id,recipient_id", ignoreDuplicates: true })
        .abortSignal(controller.signal);
      checkActive();
      if (error) throw error;
    }

    const confirmed = await readRecipients();
    const actual = new Set(confirmed.map(row => row.recipient_id));
    if (actual.size !== desired.size || Array.from(desired).some(id => !actual.has(id))) {
      throw new Error("Bible Reflection recipients are not yet confirmed");
    }
  };

  try {
    await Promise.race([operation(), deadline]);
  } finally {
    clearTimeout(timer!);
  }
}

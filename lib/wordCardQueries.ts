import type { createClient } from "@/lib/supabase";
import type { Lang } from "@/lib/i18n";
import { buildHeldWordBlocks, canShowRecallWord, getRecallMode, getVerseCandidates, parseRecallPassage, type HeldWordBlock, type RecallRecord, type VerifiedVerse } from "@/lib/wordCardRecord";

type RecallClient = Pick<ReturnType<typeof createClient>, "from">;

/** Read-only, owner- and date-scoped. No SQL/schema or completion/reward writes. */
export async function readRecallRecord(client: RecallClient, userId: string, date: string, signal: AbortSignal): Promise<RecallRecord | null> {
  if (!userId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid recall scope");
  const { data, error } = await client.from("qt_records")
    .select("id,user_id,date,is_draft,key_verse,decision,bible_ref,bible_version,qt_mode,reflection_type,photo_path")
    .eq("user_id", userId).eq("date", date)
    .or("is_draft.eq.false,is_draft.is.null")
    .order("created_at", { ascending: false }).limit(1).abortSignal(signal).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  // Defense in depth against stale/mis-scoped responses, including account changes.
  if (data.user_id !== userId || data.date !== date || data.is_draft === true) throw new Error("Unexpected recall scope");
  return data as RecallRecord;
}

export type ResolvedHeldWord = { blocks: HeldWordBlock[]; sourceFailed: boolean; hasUnverifiedCandidates: boolean };

export async function resolveHeldWord(record: RecallRecord, lang: Lang, signal: AbortSignal): Promise<ResolvedHeldWord> {
  if (!canShowRecallWord(record)) return { blocks: [], sourceFailed: false, hasUnverifiedCandidates: false };
  const candidates = getVerseCandidates(record);
  const passage = parseRecallPassage(record.bible_ref);
  const translation = Number(record.bible_version);
  const fallback = buildHeldWordBlocks(record, [], lang);
  if (!candidates.length || !passage) return { blocks: fallback, sourceFailed: false, hasUnverifiedCandidates: false };
  if (!Number.isInteger(translation) || translation <= 0) {
    return { blocks: fallback, sourceFailed: true, hasUnverifiedCandidates: true };
  }
  // Group selected verses per chapter. Never re-download the Bible corpus.
  const ranges = new Map<number, { start: number; end: number }>();
  for (const candidate of candidates) {
    const range = ranges.get(candidate.chapter);
    ranges.set(candidate.chapter, { start: Math.min(range?.start ?? candidate.start, candidate.start), end: Math.max(range?.end ?? candidate.end, candidate.end) });
  }
  const verified: VerifiedVerse[] = [];
  let sourceFailed = false;
  await Promise.all([...ranges].map(async ([chapter, range]) => {
    try {
      const query = new URLSearchParams({ translation: String(translation), book: passage.book,
        chapter: String(chapter), startVerse: String(range.start), endVerse: String(range.end) });
      const response = await fetch(`/api/bible?${query}`, { signal, cache: "no-store" });
      if (!response.ok) throw new Error(`Verse reference lookup ${response.status}`);
      const body = await response.json();
      if (!Array.isArray(body.verses)) throw new Error("Missing verse data");
      for (const verse of body.verses) {
        if (typeof verse.text === "string" && (typeof verse.num === "number" || typeof verse.num === "string")) {
          verified.push({ chapter, num: verse.num, text: verse.text });
        }
      }
    } catch (error) {
      if (signal.aborted) throw error;
      // Keep the saved text readable even if reference verification is offline.
      sourceFailed = true;
    }
  }));
  const blocks = buildHeldWordBlocks(record, verified, lang);
  const referenced = blocks.filter(block => block.reference).length;
  return { blocks, sourceFailed, hasUnverifiedCandidates: referenced < candidates.length };
}

/** Reuse the existing private qt-photos bucket and SELECT permissions. The URL
 * stays in mounted component state, never in storage, logs, or analytics. */
export async function readRecallPhotoUrl(
  client: Pick<ReturnType<typeof createClient>, "storage">,
  record: RecallRecord, userId: string, signal: AbortSignal,
): Promise<string> {
  const path = record.photo_path?.trim();
  if (!userId || record.user_id !== userId || record.is_draft === true || getRecallMode(record) !== "photo") {
    throw new Error("Unexpected recall photo scope");
  }
  if (!path || !path.startsWith(`${userId}/`) || path.split("/").some(part => part === ".." || part === ".") || /[\\\u0000-\u001f]/u.test(path)) {
    throw new Error("Invalid recall photo path");
  }
  // Storage signing has no per-call AbortSignal. Stop waiting on timeout/unmount
  // and ignore the late result; this does not cancel the underlying request.
  return new Promise<string>((resolve, reject) => {
    const onAbort = () => reject(new Error("Recall photo request aborted"));
    if (signal.aborted) { onAbort(); return; }
    signal.addEventListener("abort", onAbort, { once: true });
    Promise.resolve().then(() => {
      if (signal.aborted) throw new Error("Recall photo request aborted");
      return client.storage.from("qt-photos").createSignedUrl(path, 60 * 60);
    }).then(({ data, error }) => {
      if (signal.aborted) return;
      if (error) { reject(error); return; }
      if (!data?.signedUrl || !/^https?:\/\//i.test(data.signedUrl)) {
        reject(new Error("Recall photo URL unavailable")); return;
      }
      resolve(data.signedUrl);
    }).catch(reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

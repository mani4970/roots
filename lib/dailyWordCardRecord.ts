import type { createClient } from "@/lib/supabase";

/** Only the metadata/text already stored by Today's Word. No persistent cache. */
export type DailyWordRecord = {
  user_id: string; date: string;
  verse?: string | null; verse_text?: string | null;
  reference?: string | null; verse_reference?: string | null;
  verse_lang?: string | null; verse_translation_id?: number | string | null;
  verse_ref_id?: string | null; verse_book?: string | null;
  verse_start_chapter?: number | null; verse_start_verse?: number | null;
  verse_end_chapter?: number | null; verse_end_verse?: number | null;
};
export type DailyWordContent = { verse: string; reference: string; translationId: number | null };
type DailyWordClient = Pick<ReturnType<typeof createClient>, "from">;

export const DAILY_WORD_COLUMNS = "user_id,date,verse,reference,verse_text,verse_reference,verse_lang,verse_translation_id,verse_ref_id,verse_book,verse_start_chapter,verse_start_verse,verse_end_chapter,verse_end_verse";

export function savedDailyWordText(row: DailyWordRecord | null | undefined): string {
  return [row?.verse_text, row?.verse].find(value => typeof value === "string" && value.trim()) ?? "";
}

export function hasReceivedDailyWord(row: DailyWordRecord | null | undefined): boolean {
  if (!row) return false;
  // A decisions-only daily_checkins row is NOT a received Word. ESV, however,
  // intentionally stores reference metadata without storing its verse text.
  return Boolean(savedDailyWordText(row) || row.verse_ref_id || row.verse_reference?.trim() || row.reference?.trim());
}

export function isDailyWordInScope(row: DailyWordRecord | null | undefined, userId: string, date: string): row is DailyWordRecord {
  return Boolean(row && row.user_id === userId && row.date === date && hasReceivedDailyWord(row));
}

/** Home navigation only, NOT permission to draw/write. While the Home lookup is
 * pending, enter the emotion UI without an intermediate received-card loader.
 * CheckinPage verifies in the background; ResultContent verifies again before
 * any draw/write. Confirmed existing records still open the read-only popup. */
export function dailyWordEntry(status: "loading" | "ready" | "empty" | "error"): "receive" | "view" {
  return status === "empty" || status === "loading" ? "receive" : "view";
}

export async function readDailyWordRecord(client: DailyWordClient, userId: string, date: string, signal: AbortSignal): Promise<DailyWordRecord | null> {
  if (!userId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid daily Word scope");
  const { data, error } = await client.from("daily_checkins").select(DAILY_WORD_COLUMNS)
    .eq("user_id", userId).eq("date", date).abortSignal(signal).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (data.user_id !== userId || data.date !== date) throw new Error("Unexpected daily Word scope");
  return hasReceivedDailyWord(data) ? data as DailyWordRecord : null;
}

/** Reopen the SAME saved passage, including ESV. Never call the emotion picker,
 * change the saved language/translation, or write re-fetched text to the DB. */
export async function resolveDailyWordContent(row: DailyWordRecord, signal: AbortSignal): Promise<DailyWordContent> {
  const id = Number(row.verse_translation_id);
  const translationId = Number.isInteger(id) && id > 0 ? id : null;
  const reference = row.verse_reference?.trim() || row.reference?.trim() || "";
  const stored = savedDailyWordText(row);
  if (stored) return { verse: stored, reference, translationId };
  const book = row.verse_book?.trim();
  const startChapter = Number(row.verse_start_chapter), startVerse = Number(row.verse_start_verse);
  const endChapter = Number(row.verse_end_chapter ?? startChapter), endVerse = Number(row.verse_end_verse ?? startVerse);
  if (!translationId || !book || ![startChapter, startVerse, endChapter, endVerse].every(n => Number.isInteger(n) && n > 0)
    || endChapter < startChapter || endChapter - startChapter > 5 || (endChapter === startChapter && endVerse < startVerse)) {
    throw new Error("Saved daily Word passage unavailable");
  }
  const parts = await Promise.all(Array.from({ length: endChapter - startChapter + 1 }, async (_, offset) => {
    const chapter = startChapter + offset;
    const query = new URLSearchParams({ translation: String(translationId), book, chapter: String(chapter),
      startVerse: String(chapter === startChapter ? startVerse : 1), endVerse: String(chapter === endChapter ? endVerse : 176) });
    const response = await fetch(`/api/bible?${query}`, { signal, cache: "no-store" });
    if (!response.ok) throw new Error("Saved daily Word text unavailable");
    const body = await response.json();
    if (!Array.isArray(body?.verses)) throw new Error("Invalid daily Word response");
    const texts = body.verses.map((verse: { text?: unknown }) => typeof verse.text === "string" ? verse.text.trim() : "").filter(Boolean);
    if (!texts.length) throw new Error("Empty saved daily Word passage");
    return texts.join("\n");
  }));
  return { verse: parts.join("\n"), reference, translationId };
}
